import { applicationEngine } from '../../../../workflow/application-engine.mjs';
import {
  requireActor,
  errorResponse,
  readJson,
  serializeApplication,
  HttpError
} from '../../../../server/api-auth.mjs';

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

export async function POST(request, { params }) {
  try {
    const handler = ACTIONS[params?.action];
    if (!handler) {
      throw new HttpError(404, `Action inconnue : ${params?.action}`);
    }
    const actor = requireActor(request);
    const body = await readJson(request);
    if (!body.referenceNumber) {
      throw new HttpError(400, 'Référence du dossier requise.');
    }
    const result = handler(actor, body.referenceNumber, body);
    return Response.json({
      success: true,
      action: params.action,
      application: result?.referenceNumber && !('withdrawn' in result) ? serializeApplication(result) : undefined,
      result: result && 'withdrawn' in result ? result : undefined
    });
  } catch (err) {
    return errorResponse(err);
  }
}
