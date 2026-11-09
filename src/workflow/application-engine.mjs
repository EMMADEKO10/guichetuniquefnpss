/**
 * @fileoverview Moteur de workflow des demandes FNPSS, contrôle d'accès RBAC (ADM-01),
 * circuit d'approbation multi-niveaux (ADM-08), modification/retrait avant instruction (REQ-08),
 * double confirmation de révocation (VER-06) et journal d'audit immuable (ADM-07).
 */

import { FNPSS_SERVICES, validateRequiredDocuments, computeSlaDueDate } from '../domain/services-catalog.mjs';
import { computeSha256Bytes32, sealOfficialAct } from '../crypto/document-sealer.mjs';
import { generateOfficialPdfBuffer } from '../pdf/certificate-generator.mjs';
import { NotificationCenter } from '../notifications/notification-center.mjs';
import { registrySimulator } from '../blockchain/registry-simulator.mjs';

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
  [Roles.REQUERANT]: new Set([
    'SUBMIT_APPLICATION',
    'UPDATE_OWN_DRAFT_APPLICATION',
    'WITHDRAW_OWN_DRAFT_APPLICATION',
    'UPLOAD_COMPLEMENT',
    'DOWNLOAD_OWN_CERTIFICATE'
  ]),
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
  constructor(registryContract, relayerAddress, notificationCenter = new NotificationCenter()) {
    this.registry = registryContract;
    this.relayerAddress = relayerAddress;
    this.notifications = notificationCenter;
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
    uploadedDocTypes = [],
    attachedDocuments = [],
    paymentReference,
    hasActiveS1Enrollment = false
  }) {
    assertPermission(actor, 'SUBMIT_APPLICATION');
    const effectiveDocTypes = Array.from(new Set([
      ...(uploadedDocTypes || []),
      ...(attachedDocuments || []).map(d => d.docCode)
    ]));
    const docCheck = validateRequiredDocuments(serviceCode, effectiveDocTypes, hasActiveS1Enrollment);
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
      uploadedDocTypes: effectiveDocTypes,
      attachedDocuments: [...attachedDocuments],
      paymentReference,
      paymentValidated: false,
      status: 'SOUMIS',
      slaStartedAt: null,
      slaDueAt: null,
      slaPaused: false,
      complementReason: null,
      divisionOpinion: null,
      approvalSteps: [
        {
          step: 'DEPOT_REQUERANT',
          actorId: actor.id,
          actorRole: actor.role,
          timestamp: new Date().toISOString()
        }
      ],
      ministryCoSigned: false,
      ministryReference: null,
      certificate: null
    };

    this.applications.set(referenceNumber, app);
    this._logAudit(actor, 'APPLICATION_SUBMITTED', referenceNumber, { serviceCode, paymentReference });
    this.notifications?.notifyTransactionalEvent({
      userId: actor.id,
      eventType: 'APPLICATION_SUBMITTED',
      referenceNumber,
      details: { organizationName, serviceCode }
    });
    return { ...app };
  }

  /**
   * Modification d'une demande par le requérant uniquement tant que le traitement n'a pas démarré (REQ-08).
   */
  updateApplicationBeforeInstruction(actor, referenceNumber, updates = {}) {
    assertPermission(actor, 'UPDATE_OWN_DRAFT_APPLICATION');
    const app = this._getApp(referenceNumber);
    if (app.ownerId !== actor.id) {
      throw new Error('RBAC: Seul le propriétaire du dossier peut le modifier');
    }
    if (app.status !== 'SOUMIS' || app.paymentValidated) {
      throw new Error('REQ-08: Modification impossible une fois l\'instruction du dossier démarrée');
    }

    if (updates.projectTitle) app.projectTitle = updates.projectTitle.trim();
    if (updates.goodsSummary !== undefined) app.goodsSummary = String(updates.goodsSummary).trim();
    if (updates.paymentReference) app.paymentReference = updates.paymentReference.trim();
    if (Array.isArray(updates.uploadedDocTypes)) {
      app.uploadedDocTypes = [...updates.uploadedDocTypes];
    }
    if (Array.isArray(updates.attachedDocuments)) {
      app.attachedDocuments = [...updates.attachedDocuments];
      app.uploadedDocTypes = Array.from(new Set([
        ...app.uploadedDocTypes,
        ...updates.attachedDocuments.map(d => d.docCode)
      ]));
    }

    this._logAudit(actor, 'APPLICATION_UPDATED_BEFORE_INSTRUCTION', referenceNumber, {
      projectTitle: app.projectTitle,
      paymentReference: app.paymentReference
    });
    return { ...app };
  }

  /**
   * Suppression / retrait d'une demande par le requérant uniquement avant le démarrage de l'instruction (REQ-08).
   */
  withdrawApplicationBeforeInstruction(actor, referenceNumber) {
    assertPermission(actor, 'WITHDRAW_OWN_DRAFT_APPLICATION');
    const app = this._getApp(referenceNumber);
    if (app.ownerId !== actor.id) {
      throw new Error('RBAC: Seul le propriétaire du dossier peut le retirer');
    }
    if (app.status !== 'SOUMIS' || app.paymentValidated) {
      throw new Error('REQ-08: Suppression impossible une fois l\'instruction du dossier démarrée');
    }

    this.applications.delete(referenceNumber);
    this._logAudit(actor, 'APPLICATION_WITHDRAWN_BEFORE_INSTRUCTION', referenceNumber, {
      serviceCode: app.serviceCode
    });
    return { withdrawn: true, referenceNumber };
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
    app.approvalSteps.push({
      step: 'VALIDATION_PAIEMENT_AGENT',
      actorId: actor.id,
      actorRole: actor.role,
      timestamp: app.slaStartedAt.toISOString()
    });

    this._logAudit(actor, 'PAYMENT_VALIDATED_SLA_STARTED', referenceNumber, {
      slaDueAt: app.slaDueAt.toISOString()
    });
    this.notifications?.notifyTransactionalEvent({
      userId: app.ownerId,
      eventType: 'PAYMENT_VALIDATED',
      referenceNumber,
      details: { organizationName: app.organizationName, slaDueAt: app.slaDueAt.toISOString().slice(0, 10) }
    });
    return { ...app };
  }

  /**
   * Avis technique intermédiaire du Chef de Division avant signature finale DG (Circuit multi-niveaux ADM-08).
   */
  emitDivisionChiefOpinion(actor, referenceNumber, {
    favorable = true,
    opinionNote = 'Avis technique favorable après contrôle de conformité des pièces P1 à P6'
  } = {}) {
    assertPermission(actor, 'EMIT_FAVORABLE_OPINION');
    const app = this._getApp(referenceNumber);
    if (!app.paymentValidated) {
      throw new Error('ADM-08: La quittance des frais doit être validée par un agent avant l\'avis du Chef de Division');
    }

    const signedAt = new Date().toISOString();
    app.divisionOpinion = {
      favorable: Boolean(favorable),
      opinionNote: opinionNote.trim(),
      reviewerId: actor.id,
      reviewerRole: actor.role,
      signedAt
    };
    app.approvalSteps.push({
      step: favorable ? 'AVIS_FAVORABLE_CHEF_DIVISION' : 'AVIS_RESERVE_CHEF_DIVISION',
      actorId: actor.id,
      actorRole: actor.role,
      note: app.divisionOpinion.opinionNote,
      timestamp: signedAt
    });

    this._logAudit(actor, 'DIVISION_CHIEF_OPINION_EMITTED', referenceNumber, {
      favorable: app.divisionOpinion.favorable,
      opinionNote: app.divisionOpinion.opinionNote
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
    this.notifications?.notifyTransactionalEvent({
      userId: app.ownerId,
      eventType: 'COMPLEMENT_REQUESTED',
      referenceNumber,
      details: { organizationName: app.organizationName, reason: app.complementReason }
    });
    this.notifications?.addDossierMessage({
      referenceNumber,
      authorId: actor.id,
      authorRole: actor.role,
      message: `Demande de complément : ${app.complementReason}`
    });
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
    this.notifications?.addDossierMessage({
      referenceNumber,
      authorId: actor.id,
      authorRole: actor.role,
      message: `Pièce complémentaire déposée : ${additionalDocType}`,
      attachmentDocType: additionalDocType
    });
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

    const issuedAtIso = new Date(issuedAtTimestamp * 1000).toISOString();
    const expiresAtIso = expiresAtTimestamp ? new Date(expiresAtTimestamp * 1000).toISOString() : null;

    const sealed = sealOfficialAct({
      certificateNumber,
      serviceCode: app.serviceCode,
      organizationName: app.organizationName,
      projectTitle: app.projectTitle,
      goodsSummary: app.goodsSummary,
      issuedAtIso,
      expiresAtIso
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

    const certDetails = {
      ...sealed,
      serviceCode: app.serviceCode,
      organizationName: app.organizationName,
      projectTitle: app.projectTitle,
      goodsSummary: app.goodsSummary,
      issuedAtIso,
      expiresAtIso,
      txHash: onChainResult.txHash,
      issuedAtTimestamp,
      expiresAtTimestamp,
      status: 'ACTIVE',
      revocationReason: ''
    };
    certDetails.pdfBuffer = generateOfficialPdfBuffer(certDetails);
    certDetails.pdfSha256 = computeSha256Bytes32(certDetails.pdfBuffer);
    this.registry.bindRenderedPdfHash?.(sealed.docHash, certDetails.pdfSha256);

    app.status = 'VALIDE_DELIVRE';
    app.certificate = certDetails;
    app.approvalSteps.push({
      step: 'APPROBATION_DG_ET_ANCRAGE_BLOCKCHAIN',
      actorId: actor.id,
      actorRole: actor.role,
      certificateNumber,
      docHash: sealed.docHash,
      timestamp: issuedAtIso
    });

    this._logAudit(actor, 'CERTIFICATE_ISSUED_AND_ANCHORED', referenceNumber, {
      certificateNumber,
      docHash: sealed.docHash,
      txHash: onChainResult.txHash
    });
    this.notifications?.notifyTransactionalEvent({
      userId: app.ownerId,
      eventType: 'CERTIFICATE_ISSUED',
      referenceNumber,
      details: {
        organizationName: app.organizationName,
        certificateNumber,
        docHash: sealed.docHash
      }
    });

    return { ...app };
  }

  /**
   * Co-signature / Contre-seing par le Point Focal du Ministère de Tutelle (D1 / ADM-06).
   */
  recordMinistryCoSignature(actor, referenceNumber, { ministryReference = 'CAB/MIN-AS/2026/001' } = {}) {
    assertPermission(actor, 'COSIGN_MINISTRY_ACT');
    const app = this._getApp(referenceNumber);
    if (!app.certificate || !app.certificate.docHash) {
      throw new Error('Le dossier doit d\'abord disposer d\'un acte scellé pour recevoir la co-signature ministérielle');
    }
    const tx = this.registry.coSignDocument({
      caller: this.relayerAddress,
      docHash: app.certificate.docHash
    });
    app.ministryCoSigned = true;
    app.ministryReference = ministryReference;
    app.approvalSteps.push({
      step: 'COSIGNATURE_MINISTERE_TUTELLE',
      actorId: actor.id,
      actorRole: actor.role,
      ministryReference,
      timestamp: new Date().toISOString()
    });
    this._logAudit(actor, 'MINISTRY_COSIGNED_ONCHAIN', referenceNumber, {
      docHash: app.certificate.docHash,
      ministryReference,
      txHash: tx.txHash
    });
    return { ...app };
  }

  /**
   * Révocation administrative d'un certificat par la Direction Générale avec double confirmation et alerte régies (CU06 / VER-06).
   */
  revokeCertificate(actor, referenceNumber, reason, { doubleConfirmed = true } = {}) {
    assertPermission(actor, 'REVOKE_CERTIFICATE');
    if (!doubleConfirmed) {
      throw new Error('VER-06: La double confirmation explicite de la Direction Générale est requise pour révoquer un acte');
    }
    const app = this._getApp(referenceNumber);
    if (!app.certificate || !app.certificate.docHash) {
      throw new Error('Aucun certificat scellé à révoquer sur ce dossier');
    }
    const tx = this.registry.revokeDocument({
      caller: this.relayerAddress,
      docHash: app.certificate.docHash,
      reason
    });
    app.status = 'REVOQUE';
    app.certificate.status = 'REVOKED';
    app.certificate.revocationReason = reason;
    app.certificate.regiesNotified = ['DGDA', 'DGRAD', 'DGI'];
    app.approvalSteps.push({
      step: 'REVOCATION_DG_ONCHAIN',
      actorId: actor.id,
      actorRole: actor.role,
      note: reason,
      timestamp: new Date().toISOString()
    });
    this._logAudit(actor, 'CERTIFICATE_REVOKED_ONCHAIN', referenceNumber, {
      certificateNumber: app.certificate.certificateNumber,
      docHash: app.certificate.docHash,
      reason,
      regiesNotified: app.certificate.regiesNotified,
      txHash: tx.txHash
    });
    this.notifications?.notifyTransactionalEvent({
      userId: app.ownerId,
      eventType: 'CERTIFICATE_REVOKED',
      referenceNumber,
      details: {
        organizationName: app.organizationName,
        certificateNumber: app.certificate.certificateNumber,
        reason
      }
    });
    return { ...app };
  }

  /**
   * Rejet motivé d'une demande par la Direction Générale (ADM-06 : décision « rejeté »).
   * Un dossier déjà délivré, révoqué ou rejeté ne peut plus être rejeté.
   */
  rejectApplication(actor, referenceNumber, reason) {
    assertPermission(actor, 'REJECT_APPLICATION');
    if (!reason || !String(reason).trim()) {
      throw new Error('ADM-06: Le motif de rejet est obligatoire');
    }
    const app = this._getApp(referenceNumber);
    if (['VALIDE_DELIVRE', 'REVOQUE', 'REJETE'].includes(app.status)) {
      throw new Error(`ADM-06: Rejet impossible pour un dossier au statut ${app.status}`);
    }
    const rejectedAt = new Date().toISOString();
    app.status = 'REJETE';
    app.slaPaused = true;
    app.rejectionReason = String(reason).trim();
    app.approvalSteps.push({
      step: 'REJET_DG',
      actorId: actor.id,
      actorRole: actor.role,
      note: app.rejectionReason,
      timestamp: rejectedAt
    });
    this._logAudit(actor, 'APPLICATION_REJECTED', referenceNumber, { reason: app.rejectionReason });
    this.notifications?.notifyTransactionalEvent({
      userId: app.ownerId,
      eventType: 'APPLICATION_REJECTED',
      referenceNumber,
      details: { organizationName: app.organizationName, reason: app.rejectionReason }
    });
    return { ...app };
  }

  /**
   * Retourne le PDF officiel d'un dossier et trace le téléchargement (REQ-09).
   * Accès réservé au propriétaire du dossier ou au personnel FNPSS habilité.
   */
  downloadCertificate(actor, referenceNumber) {
    const app = this._getApp(referenceNumber);
    const isOwner = app.ownerId === actor?.id;
    const isStaffReader = [Roles.AGENT, Roles.CHEF_DIVISION, Roles.DG, Roles.MINISTERE, Roles.ADMIN].includes(actor?.role);
    if (isOwner) {
      assertPermission(actor, 'DOWNLOAD_OWN_CERTIFICATE');
    } else if (!isStaffReader) {
      throw new Error('RBAC: Accès au document réservé au propriétaire du dossier');
    }
    if (!app.certificate?.pdfBuffer) {
      throw new Error('Aucun document officiel disponible pour ce dossier');
    }
    this._logAudit(actor, 'CERTIFICATE_DOWNLOADED', referenceNumber, {
      certificateNumber: app.certificate.certificateNumber,
      certificateStatus: app.certificate.status
    });
    return {
      fileName: `${app.certificate.certificateNumber}.pdf`,
      pdfBuffer: app.certificate.pdfBuffer,
      certificateStatus: app.certificate.status
    };
  }

  listApplications({ serviceCode = null, status = null, ownerId = null } = {}) {
    return Array.from(this.applications.values())
      .filter(app => {
        if (ownerId && app.ownerId !== ownerId) return false;
        if (serviceCode && app.serviceCode !== serviceCode) return false;
        if (status && app.status !== status) return false;
        return true;
      })
      .map(app => {
        const clone = { ...app };
        if (clone.certificate) {
          const { pdfBuffer, ...certMeta } = clone.certificate;
          clone.certificate = certMeta;
        }
        return clone;
      });
  }

  getApplication(referenceNumber) {
    return this._getApp(referenceNumber);
  }

  getAuditLogs() {
    return [...this.auditLogs].reverse();
  }

  /**
   * Recherche multicritère dans le journal d'audit immuable (ADM-07).
   */
  queryAuditLogs({ actorId = null, actorRole = null, action = null, targetId = null } = {}) {
    return this.getAuditLogs().filter(entry => {
      if (actorId && entry.actorId !== actorId) return false;
      if (actorRole && entry.actorRole !== actorRole) return false;
      if (action && entry.action !== action) return false;
      if (targetId && entry.targetId !== targetId) return false;
      return true;
    });
  }

  /**
   * Exporte le journal d'audit filtré au format CSV pour inspection ou archivage (ADM-07).
   */
  exportAuditLogsCsv(filters = {}) {
    const entries = this.queryAuditLogs(filters);
    const headers = ['ID', 'Timestamp_ISO', 'Acteur_ID', 'Role', 'Action', 'Cible_Dossier', 'Metadata_JSON'];
    const rows = entries.map(e => [
      e.id,
      e.timestamp,
      e.actorId,
      e.actorRole,
      e.action,
      e.targetId,
      `"${JSON.stringify(e.metadata || {}).replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  _getApp(referenceNumber) {
    const app = this.applications.get(referenceNumber);
    if (!app) {
      throw new Error(`Dossier introuvable : ${referenceNumber}`);
    }
    return app;
  }
}

export const applicationEngine = new GuichetUniqueEngine(
  registrySimulator,
  '0x2222222222222222222222222222222222222222'
);

