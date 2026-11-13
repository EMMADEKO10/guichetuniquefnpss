import { applicationEngine } from '../../../../workflow/application-engine.mjs';
import { authService } from '../../../../auth/auth-service.mjs';
import { registrySimulator, resilientAnchorQueue } from '../../../../blockchain/registry-simulator.mjs';
import {
  requireActor,
  errorResponse,
  readJson,
  serializeApplication,
  HttpError
} from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';
import {
  isPolygonRuntimeEnabled,
  registerDocumentOnChain,
  coSignDocumentOnChain,
  revokeDocumentOnChain
} from '../../../../infra/polygon-client.mjs';
import { resolveCloudinaryConfig, uploadEncryptedPdfToCloudinary } from '../../../../storage/cloudinary-storage.mjs';
import { sendTransactionalWorkflowEmail } from '../../../../infra/smtp-mailer.mjs';

/**
 * POST /api/applications/{action} — actions du circuit d'instruction (ADM-04..08, REQ-08, VER-06).
 *
 * Le rôle provient de la session serveur ; le contrôle d'autorisation est fait par le moteur
 * (assertPermission). Un refus RBAC est renvoyé en 403, un dossier inconnu en 404.
 */
const ACTIONS = Object.freeze({
  // Requérant (REQ-08)
  withdraw: (actor, ref) => applicationEngine.withdrawApplicationBeforeInstruction(actor, ref),
  'provide-complement': (actor, ref, body) => {
    if (!body.docCode) throw new HttpError(400, 'Code de la pièce complémentaire requis.');
    return applicationEngine.provideComplement(actor, ref, body.docCode);
  },

  // Agent / Chef de division (ADM-04, REQ-10)
  'validate-payment': (actor, ref) => applicationEngine.validatePaymentAndStartSla(actor, ref),
  'request-complement': (actor, ref, body) => applicationEngine.requestComplement(actor, ref, body.reason || ''),
  'division-opinion': (actor, ref, body) =>
    applicationEngine.emitDivisionChiefOpinion(actor, ref, {
      favorable: body.favorable !== false,
      opinionNote: body.opinionNote || undefined
    }),

  // Direction générale (ADM-06 : décision validé / rejeté, VER-06 : révocation)
  'approve-seal': (actor, ref) => applicationEngine.approveAndSealCertificate(actor, ref),
  reject: (actor, ref, body) => applicationEngine.rejectApplication(actor, ref, body.reason || ''),
  revoke: (actor, ref, body) => {
    if (!body.reason || !String(body.reason).trim()) {
      throw new HttpError(400, 'Le motif de révocation est obligatoire.');
    }
    return applicationEngine.revokeCertificate(actor, ref, String(body.reason).trim(), {
      doubleConfirmed: body.doubleConfirmed === true
    });
  },

  // Ministère de tutelle (ADM-06)
  'cosign-ministry': (actor, ref, body) =>
    applicationEngine.recordMinistryCoSignature(actor, ref, {
      ministryReference: body.ministryReference || undefined
    })
});

const ACTION_TO_EMAIL_EVENT = {
  'validate-payment': 'PAYMENT_VALIDATED',
  'request-complement': 'COMPLEMENT_REQUESTED',
  'approve-seal': 'CERTIFICATE_ISSUED',
  revoke: 'CERTIFICATE_REVOKED',
  reject: 'APPLICATION_REJECTED'
};

export async function POST(request, { params }) {
  try {
    await hydrateFromNeon();
    const resolvedParams = await Promise.resolve(params);
    const actionName = resolvedParams?.action;
    const handler = ACTIONS[actionName];
    if (!handler) {
      throw new HttpError(404, `Action inconnue : ${actionName}`);
    }
    const actor = requireActor(request);
    const body = await readJson(request);
    if (!body.referenceNumber) {
      throw new HttpError(400, 'Référence du dossier requise.');
    }
    const result = handler(actor, body.referenceNumber, body);
    const storedApp = result?.referenceNumber && !('withdrawn' in result)
      ? applicationEngine.applications.get(body.referenceNumber)
      : null;

    // Ancrage réel Polygon Amoy/Mainnet si contrat + clé relayer configurés
    if (storedApp?.certificate && isPolygonRuntimeEnabled()) {
      const cert = storedApp.certificate;
      if (actionName === 'approve-seal') {
        try {
          const onChainRes = await registerDocumentOnChain({
            docHash: cert.docHash,
            certificateNumber: cert.certificateNumber,
            serviceCode: Number(String(storedApp.serviceCode).replace('S', '')),
            expiresAt: cert.expiresAtTimestamp || 0
          });
          if (onChainRes.executedOnChain) {
            cert.txHash = onChainRes.txHash;
            cert.blockNumber = onChainRes.blockNumber;
            cert.explorerTxUrl = onChainRes.explorerTxUrl;
            cert.onChainMode = 'POLYGON_LIVE';
            const simRec = registrySimulator.records.get(cert.docHash);
            if (simRec) simRec.txHash = onChainRes.txHash;
          } else {
            cert.onChainMode = 'PENDING_RELAYER_KEY';
            resilientAnchorQueue.enqueue({
              docHash: cert.docHash,
              certificateNumber: cert.certificateNumber,
              serviceCode: Number(String(storedApp.serviceCode).replace('S', '')),
              expiresAt: cert.expiresAtTimestamp || 0
            });
          }
        } catch (chainErr) {
          cert.onChainMode = 'QUEUED_RETRY';
          cert.onChainError = chainErr.message;
          resilientAnchorQueue.enqueue({
            docHash: cert.docHash,
            certificateNumber: cert.certificateNumber,
            serviceCode: Number(String(storedApp.serviceCode).replace('S', '')),
            expiresAt: cert.expiresAtTimestamp || 0
          });
        }

        // Sauvegarde chiffrée de l'attestation PDF sur Cloudinary si configuré
        const cldCfg = resolveCloudinaryConfig();
        if (
          !process.env.NODE_TEST_CONTEXT &&
          process.env.FNPSS_DISABLE_STORAGE !== 'true' &&
          cldCfg.cloudName &&
          cldCfg.apiKey &&
          cldCfg.apiSecret &&
          cldCfg.encryptionKeyHex &&
          cert.pdfBuffer
        ) {
          const uploadedCert = await uploadEncryptedPdfToCloudinary(cert.pdfBuffer, {
            fileName: `${cert.certificateNumber}.pdf`,
            publicId: `cert_${cert.certificateNumber}`
          }).catch(() => null);
          if (uploadedCert) {
            cert.storageKey = uploadedCert.storageKey;
            cert.cloudinaryUrl = uploadedCert.secureUrl;
          }
        }
      } else if (actionName === 'cosign-ministry') {
        const cosignRes = await coSignDocumentOnChain({ docHash: cert.docHash }).catch(err => ({
          executedOnChain: false,
          error: err.message
        }));
        if (cosignRes.executedOnChain) {
          storedApp.ministryTxHash = cosignRes.txHash;
          storedApp.ministryExplorerTxUrl = cosignRes.explorerTxUrl;
        }
      } else if (actionName === 'revoke') {
        const revRes = await revokeDocumentOnChain({
          docHash: cert.docHash,
          reason: String(body.reason).trim()
        }).catch(err => ({ executedOnChain: false, error: err.message }));
        if (revRes.executedOnChain) {
          cert.revocationTxHash = revRes.txHash;
          cert.revocationExplorerTxUrl = revRes.explorerTxUrl;
        }
      }
    }

    await persistToNeon();

    const emailEvent = ACTION_TO_EMAIL_EVENT[actionName];
    if (emailEvent && storedApp) {
      const owner = authService.usersById.get(storedApp.ownerId);
      if (owner?.email) {
        await sendTransactionalWorkflowEmail({
          to: owner.email,
          eventType: emailEvent,
          referenceNumber: storedApp.referenceNumber,
          details: {
            organizationName: storedApp.organizationName,
            slaDueAt: storedApp.slaDueAt,
            reason: storedApp.rejectionReason || storedApp.complementReason || body.reason,
            certificateNumber: storedApp.certificate?.certificateNumber,
            docHash: storedApp.certificate?.docHash,
            explorerTxUrl: storedApp.certificate?.explorerTxUrl
          }
        }).catch(() => null);
      }
    }

    const finalApp = storedApp || result;
    return Response.json({
      success: true,
      action: actionName,
      application: finalApp?.referenceNumber && !('withdrawn' in finalApp) ? serializeApplication(finalApp) : undefined,
      result: finalApp && 'withdrawn' in finalApp ? finalApp : undefined
    });
  } catch (err) {
    return errorResponse(err);
  }
}
