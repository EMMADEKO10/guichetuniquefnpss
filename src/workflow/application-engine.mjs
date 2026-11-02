/**
 * @fileoverview Moteur de workflow des demandes FNPSS, contrôle d'accès RBAC (ADM-01)
 * et journal d'audit immuable (ADM-07).
 */

import { FNPSS_SERVICES, validateRequiredDocuments, computeSlaDueDate } from '../domain/services-catalog.mjs';
import { sealOfficialAct } from '../crypto/document-sealer.mjs';

export const Roles = Object.freeze({
  REQUERANT: 'REQUERANT',
  AGENT: 'AGENT',
  CHEF_DIVISION: 'CHEF_DIVISION',
  DG: 'DG',
  MINISTERE: 'MINISTERE',
  DOUANE: 'DOUANE',
  ADMIN: 'ADMIN'
});

const ROLE_PERMISSIONS = Object.freeze({
  [Roles.REQUERANT]: new Set(['SUBMIT_APPLICATION', 'UPLOAD_COMPLEMENT', 'DOWNLOAD_OWN_CERTIFICATE']),
  [Roles.AGENT]: new Set(['VALIDATE_PAYMENT', 'INSPECT_APPLICATION', 'REQUEST_COMPLEMENT']),
  [Roles.CHEF_DIVISION]: new Set(['VALIDATE_PAYMENT', 'INSPECT_APPLICATION', 'REQUEST_COMPLEMENT', 'EMIT_FAVORABLE_OPINION']),
  [Roles.DG]: new Set(['APPROVE_AND_SEAL_CERTIFICATE', 'REVOKE_CERTIFICATE', 'REJECT_APPLICATION']),
  [Roles.MINISTERE]: new Set(['COSIGN_MINISTRY_ACT']),
  [Roles.DOUANE]: new Set(['VERIFY_QR_CERTIFICATE']),
  [Roles.ADMIN]: new Set(['MANAGE_USERS', 'VIEW_AUDIT_LOGS'])
});

export function assertPermission(actor, permission) {
  if (!actor || !actor.role) {
    throw new Error('RBAC: Acteur non authentifié');
  }
  const allowed = ROLE_PERMISSIONS[actor.role];
  if (!allowed || !allowed.has(permission)) {
    throw new Error(`RBAC: Le rôle ${actor.role} n'est pas autorisé pour l'action ${permission}`);
  }
}

export class GuichetUniqueEngine {
  constructor(registryContract, relayerAddress) {
    this.registry = registryContract;
    this.relayerAddress = relayerAddress;
    this.applications = new Map();
    this.auditLogs = [];
    this.seqCounter = 1;
  }

  _logAudit(actor, action, targetId, metadata = {}) {
    const entry = Object.freeze({
      id: this.auditLogs.length + 1,
      actorId: actor.id,
      actorRole: actor.role,
      action,
      targetId,
      metadata: Object.freeze({ ...metadata }),
      timestamp: new Date().toISOString()
    });
    this.auditLogs.push(entry);
    return entry;
  }

  /**
   * Soumission d'une demande par une ONG (CU02 / REQ-06).
   */
  submitApplication(actor, {
    organizationName,
    serviceCode,
    projectTitle,
    goodsSummary,
    uploadedDocTypes,
    paymentReference,
    hasActiveS1Enrollment = false
  }) {
    assertPermission(actor, 'SUBMIT_APPLICATION');
    const docCheck = validateRequiredDocuments(serviceCode, uploadedDocTypes, hasActiveS1Enrollment);
    if (!docCheck.isValid) {
      throw new Error(`Pièces justificatives manquantes : ${docCheck.missingDocs.join(', ')}`);
    }
    if (!paymentReference) {
      throw new Error('La référence de preuve de paiement (20 USD + 300 USD) est obligatoire');
    }

    const num = String(this.seqCounter++).padStart(5, '0');
    const referenceNumber = `FNPSS/DEM/2026/${num}`;
    const app = {
      referenceNumber,
      ownerId: actor.id,
      organizationName,
      serviceCode,
      projectTitle,
      goodsSummary: goodsSummary || '',
      uploadedDocTypes: [...uploadedDocTypes],
      paymentReference,
      paymentValidated: false,
      status: 'SOUMIS',
      slaStartedAt: null,
      slaDueAt: null,
      slaPaused: false,
      complementReason: null,
      certificate: null
    };

    this.applications.set(referenceNumber, app);
    this._logAudit(actor, 'APPLICATION_SUBMITTED', referenceNumber, { serviceCode, paymentReference });
    return { ...app };
  }

  /**
   * Validation de la preuve de paiement (20 USD + 300 USD) par un agent FNPSS -> Démarre le SLA de 10 jours ouvrables (CU03 / REQ-10).
   */
  validatePaymentAndStartSla(actor, referenceNumber, nowDate = new Date(), holidaysIsoList = []) {
    assertPermission(actor, 'VALIDATE_PAYMENT');
    const app = this._getApp(referenceNumber);
    app.paymentValidated = true;
    app.status = 'EN_COURS_INSTRUCTION';
    app.slaStartedAt = new Date(nowDate.getTime());
    app.slaDueAt = computeSlaDueDate(app.slaStartedAt, FNPSS_SERVICES[app.serviceCode].slaBusinessDays, holidaysIsoList);
    app.slaPaused = false;

    this._logAudit(actor, 'PAYMENT_VALIDATED_SLA_STARTED', referenceNumber, {
      slaDueAt: app.slaDueAt.toISOString()
    });
    return { ...app };
  }

  /**
   * Demande de complément documentaire par l'agent -> Suspend temporairement le SLA (SC-02 / F09).
   */
  requestComplement(actor, referenceNumber, reason) {
    assertPermission(actor, 'REQUEST_COMPLEMENT');
    if (!reason || !reason.trim()) {
      throw new Error('Le motif de demande de complément est obligatoire');
    }
    const app = this._getApp(referenceNumber);
    app.status = 'COMPLEMENT_REQUIS';
    app.slaPaused = true;
    app.complementReason = reason.trim();

    this._logAudit(actor, 'COMPLEMENT_REQUESTED', referenceNumber, { reason: app.complementReason });
    return { ...app };
  }

  /**
   * Fourniture de la pièce complémentaire par le requérant -> Reprend l'instruction (SC-02).
   */
  provideComplement(actor, referenceNumber, additionalDocType) {
    assertPermission(actor, 'UPLOAD_COMPLEMENT');
    const app = this._getApp(referenceNumber);
    if (app.ownerId !== actor.id) {
      throw new Error('RBAC: Seul le propriétaire du dossier peut déposer un complément');
    }
    if (!app.uploadedDocTypes.includes(additionalDocType)) {
      app.uploadedDocTypes.push(additionalDocType);
    }
    app.status = 'EN_COURS_INSTRUCTION';
    app.slaPaused = false;
    app.complementReason = null;

    this._logAudit(actor, 'COMPLEMENT_PROVIDED', referenceNumber, { additionalDocType });
    return { ...app };
  }

  /**
   * Approbation finale par la Direction Générale, génération du PDF scellé, calcul SHA-256 et ancrage Blockchain (CU04).
   */
  approveAndSealCertificate(actor, referenceNumber, {
    issuedAtTimestamp = Math.floor(Date.now() / 1000),
    validityDays = 365
  } = {}) {
    assertPermission(actor, 'APPROVE_AND_SEAL_CERTIFICATE');
    const app = this._getApp(referenceNumber);
    if (!app.paymentValidated) {
      throw new Error('Impossible de délivrer un acte avant validation de la quittance de frais');
    }

    const svc = FNPSS_SERVICES[app.serviceCode];
    const seq = referenceNumber.split('/').pop();
    const certificateNumber = `FNPSS-${svc.prefix}-2026-${seq}`;
    const expiresAtTimestamp = validityDays > 0 ? issuedAtTimestamp + validityDays * 86400 : 0;

    const sealed = sealOfficialAct({
      certificateNumber,
      serviceCode: app.serviceCode,
      organizationName: app.organizationName,
      projectTitle: app.projectTitle,
      goodsSummary: app.goodsSummary,
      issuedAtIso: new Date(issuedAtTimestamp * 1000).toISOString(),
      expiresAtIso: expiresAtTimestamp ? new Date(expiresAtTimestamp * 1000).toISOString() : null
    });

    const serviceNumericCode = Number(app.serviceCode.replace('S', ''));
    const onChainResult = this.registry.registerDocument({
      caller: this.relayerAddress,
      docHash: sealed.docHash,
      certificateNumber,
      serviceCode: serviceNumericCode,
      expiresAt: expiresAtTimestamp,
      nowTimestamp: issuedAtTimestamp
    });

    app.status = 'VALIDE_DELIVRE';
    app.certificate = {
      ...sealed,
      txHash: onChainResult.txHash,
      issuedAtTimestamp,
      expiresAtTimestamp
    };

    this._logAudit(actor, 'CERTIFICATE_ISSUED_AND_ANCHORED', referenceNumber, {
      certificateNumber,
      docHash: sealed.docHash,
      txHash: onChainResult.txHash
    });

    return { ...app };
  }

  _getApp(referenceNumber) {
    const app = this.applications.get(referenceNumber);
    if (!app) {
      throw new Error(`Dossier introuvable : ${referenceNumber}`);
    }
    return app;
  }
}
