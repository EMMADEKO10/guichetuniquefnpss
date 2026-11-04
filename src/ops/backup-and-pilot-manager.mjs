/**
 * @fileoverview Sauvegarde et restauration chiffrée AES-256-GCM (OPS-05, DEP-01),
 * évaluation des jalons Go/No-Go G1 à G4 (GOV-09..13, DEP-02) et pilotage de la cohorte
 * pilote ONG & du support Hypercare (DEP-06, DEP-07).
 */

import {
  computeSha256Bytes32,
  encryptDocumentAtRest,
  decryptDocumentAtRest
} from '../crypto/document-sealer.mjs';

export const DEFAULT_BACKUP_KEY_HEX = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

/**
 * Crée une sauvegarde complète chiffrée au repos (AES-256-GCM) avec empreinte d'intégrité SHA-256 (OPS-05, DEP-01).
 */
export function createEncryptedSystemBackup({
  engine,
  auth,
  cms,
  encryptionKeyHex = DEFAULT_BACKUP_KEY_HEX,
  backupTimeIso = new Date().toISOString()
} = {}) {
  const applications = engine ? engine.listApplications() : [];
  const auditLogs = engine ? engine.getAuditLogs() : [];
  const applicants = auth ? auth.listApplicants() : [];
  const publishedNews = cms ? cms.listPublishedNews() : [];

  const snapshot = {
    version: '1.0.0',
    backupTimeIso,
    counts: {
      applications: applications.length,
      auditLogs: auditLogs.length,
      applicants: applicants.length,
      publishedNews: publishedNews.length
    },
    data: {
      applications,
      auditLogs,
      applicants,
      publishedNews
    }
  };

  const rawJson = JSON.stringify(snapshot);
  const snapshotSha256 = computeSha256Bytes32(rawJson);
  const encryptedPayload = encryptDocumentAtRest(rawJson, encryptionKeyHex);

  return {
    backupId: `BKP-FNPSS-${backupTimeIso.slice(0, 10).replace(/-/g, '')}`,
    backupTimeIso,
    cipherAlgorithm: 'AES-256-GCM',
    snapshotSha256,
    counts: snapshot.counts,
    encryptedPayload
  };
}

/**
 * Restaure et vérifie l'intégrité cryptographique d'une sauvegarde système (OPS-05, DEP-01).
 */
export function restoreEncryptedSystemBackup(backupBundle, encryptionKeyHex = DEFAULT_BACKUP_KEY_HEX) {
  if (!backupBundle || !backupBundle.encryptedPayload || !backupBundle.snapshotSha256) {
    throw new Error('OPS-05: Archive de sauvegarde incomplète ou invalide');
  }

  const decryptedBuffer = decryptDocumentAtRest(backupBundle.encryptedPayload, encryptionKeyHex);
  const computedSha256 = computeSha256Bytes32(decryptedBuffer);
  if (computedSha256 !== backupBundle.snapshotSha256) {
    throw new Error('OPS-05: Échec du contrôle d\'intégrité SHA-256 après déchiffrement de la sauvegarde');
  }

  const restoredSnapshot = JSON.parse(decryptedBuffer.toString('utf8'));
  return {
    restored: true,
    integrityVerified: true,
    backupId: backupBundle.backupId,
    snapshotSha256: computedSha256,
    counts: restoredSnapshot.counts,
    snapshot: restoredSnapshot
  };
}

/**
 * Évalue les critères de passage des jalons G1, G2, G3 et la décision Go/No-Go G4 (GOV-09..13, DEP-02).
 */
export function evaluateGoNoGoGates({
  decisionsD1ToD6Closed = true,
  specsAndPrototypeApprovedG1 = true,
  alphaWorkflowAndLocalContractG2 = true,
  smartContractAuditPassedG3 = true,
  owaspPentestPassedG3 = true,
  uatSignedByFnpssAndMinistryG3 = true,
  encryptedBackupRestoreVerifiedG4 = true,
  agentsAndDgdaTrainedG4 = true
} = {}) {
  const checks = [
    { id: 'G1_DECISIONS', gate: 'G1', label: 'Décisions D1 à D6 tranchées en COPIL', ok: Boolean(decisionsD1ToD6Closed) },
    { id: 'G1_SPECS_UX', gate: 'G1', label: 'Cahier des charges et maquettes interactives approuvés', ok: Boolean(specsAndPrototypeApprovedG1) },
    { id: 'G2_ALPHA', gate: 'G2', label: 'Parcours Requérant/Admin et Smart Contract démontrés', ok: Boolean(alphaWorkflowAndLocalContractG2) },
    { id: 'G3_AUDIT_SC', gate: 'G3', label: 'Audit de sécurité Smart Contract FNPSSRegistry.sol sans faille critique (SEC-03)', ok: Boolean(smartContractAuditPassedG3) },
    { id: 'G3_PENTEST', gate: 'G3', label: 'Pen-test OWASP Top 10 et remédiations validés (SEC-04, SEC-05)', ok: Boolean(owaspPentestPassedG3) },
    { id: 'G3_UAT', gate: 'G3', label: 'Procès-verbal de recette UAT signé (SC-01 à SC-05 — SEC-07)', ok: Boolean(uatSignedByFnpssAndMinistryG3) },
    { id: 'G4_BACKUP_PRA', gate: 'G4', label: 'Sauvegarde chiffrée AES-256-GCM et test de restauration validés (OPS-05, DEP-01)', ok: Boolean(encryptedBackupRestoreVerifiedG4) },
    { id: 'G4_TRAINING', gate: 'G4', label: 'Formation des agents FNPSS, ministères et inspecteurs DGDA réalisée (DEP-04, DEP-05)', ok: Boolean(agentsAndDgdaTrainedG4) }
  ];

  const blockingItems = checks.filter(c => !c.ok);
  return {
    decision: blockingItems.length === 0 ? 'GO_PRODUCTION' : 'NO_GO_BLOCKED',
    allGatesGreen: blockingItems.length === 0,
    blockingItems,
    checks
  };
}

/**
 * Suivi de la cohorte pilote restreinte d'ONG (DEP-06) et du support intensif Hypercare (DEP-07).
 */
export class PilotAndHypercareTracker {
  constructor() {
    this.pilotCohort = [
      { id: 'PILOT-01', organizationName: 'ONG Espoir du Nord-Kivu', province: 'Nord-Kivu (Goma)', focusService: 'S6', status: 'ACTIVE_ONBOARDED' },
      { id: 'PILOT-02', organizationName: 'Fondation Solidarité Kasaï', province: 'Kasaï-Central (Kananga)', focusService: 'S4', status: 'ACTIVE_ONBOARDED' },
      { id: 'PILOT-03', organizationName: 'Action Sociale Bukavu', province: 'Sud-Kivu (Bukavu)', focusService: 'S1', status: 'ACTIVE_ONBOARDED' },
      { id: 'PILOT-04', organizationName: 'Caritas Développement Kinshasa', province: 'Kinshasa', focusService: 'S2', status: 'ACTIVE_ONBOARDED' },
      { id: 'PILOT-05', organizationName: 'Fondation Katanga Santé', province: 'Haut-Katanga (Lubumbashi)', focusService: 'S3', status: 'ACTIVE_ONBOARDED' }
    ];
    this.incidents = [];
  }

  logHypercareIncident({
    reporterOrg,
    severity = 'STANDARD',
    summary,
    openedAtMs = Date.now()
  }) {
    if (!summary || !summary.trim()) {
      throw new Error('DEP-07: Le résumé de l\'incident Hypercare est obligatoire');
    }
    const slaTargetMinutes = severity === 'CRITICAL' ? 120 : 480;
    const ticket = {
      ticketId: `HYP-2026-${String(this.incidents.length + 1).padStart(3, '0')}`,
      reporterOrg: reporterOrg || 'ONG Pilote',
      severity,
      summary: summary.trim(),
      status: 'OPEN',
      slaTargetMinutes,
      openedAtMs,
      resolvedAtMs: null,
      resolutionMinutes: null,
      slaMet: null,
      resolutionNote: null
    };
    this.incidents.push(ticket);
    return { ...ticket };
  }

  resolveHypercareIncident(ticketId, { resolutionNote, resolvedAtMs = Date.now() } = {}) {
    const ticket = this.incidents.find(t => t.ticketId === ticketId);
    if (!ticket) {
      throw new Error(`Ticket Hypercare introuvable : ${ticketId}`);
    }
    ticket.status = 'RESOLVED';
    ticket.resolvedAtMs = resolvedAtMs;
    ticket.resolutionMinutes = Math.max(1, Math.round((resolvedAtMs - ticket.openedAtMs) / 60000));
    ticket.slaMet = ticket.resolutionMinutes <= ticket.slaTargetMinutes;
    ticket.resolutionNote = resolutionNote || 'Résolu par l\'équipe Hypercare FNPSS';
    return { ...ticket };
  }

  getPilotStatusSummary() {
    const resolved = this.incidents.filter(i => i.status === 'RESOLVED');
    const slaMetCount = resolved.filter(i => i.slaMet).length;
    return {
      pilotCohortSize: this.pilotCohort.length,
      pilotCohort: [...this.pilotCohort],
      hypercareIncidentsTotal: this.incidents.length,
      hypercareResolvedCount: resolved.length,
      hypercareSlaCompliancePct: resolved.length ? Math.round((slaMetCount / resolved.length) * 100) : 100,
      incidents: [...this.incidents]
    };
  }
}

