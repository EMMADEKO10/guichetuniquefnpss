/**
 * @fileoverview Serveur HTTP & API REST complète du Guichet Unique FNPSS :
 * - Sert le prototype interactif haute fidélité (`prototype/index.html`) sur `/`
 * - Expose l'API REST du moteur de workflow (`GuichetUniqueEngine`) et d'interopérabilité DGDA (`VER-05`)
 */

import http from 'node:http';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FNPSS_SERVICES, calculateServiceFees, getServiceSubmissionConfig } from './domain/services-catalog.mjs';
import { FNPSSRegistryContract } from './blockchain/registry-simulator.mjs';
import { GuichetUniqueEngine, Roles } from './workflow/application-engine.mjs';
import { AuthService } from './auth/auth-service.mjs';
import { validateAndInspectPdfUpload, verifyUploadedPdfAgainstRegistry } from './storage/document-upload-guard.mjs';
import { NewsAndStatsService } from './cms/news-and-stats.mjs';
import { PartnerApiGateway, OWASP_SECURITY_HEADERS } from './security/partner-api-gateway.mjs';
import { OfflinePwaSyncQueue } from './pwa/offline-sync-queue.mjs';
import { deployAndVerifyRegistryContract } from './blockchain/polygon-deployer.mjs';
import {
  createEncryptedSystemBackup,
  restoreEncryptedSystemBackup,
  evaluateGoNoGoGates,
  PilotAndHypercareTracker
} from './ops/backup-and-pilot-manager.mjs';
import { PaymentReconciliationLedger } from './finance/payment-reconciliation.mjs';
import { verifyAndPlanSqlMigrations } from './database/migration-runner.mjs';
import { evaluateG1Gate } from './ops/g1-gate-reviewer.mjs';
import { findRoutePolicy, authorizeRoute, extractBearerToken } from './security/route-access-policy.mjs';

/**
 * Modes d'accès de l'API :
 * - `ENFORCED` (défaut) : jeton de session obligatoire et matrice rôle/route appliquée (ADM-01) ;
 * - `DEMO_OPEN` : aucune authentification, les routes agissent au nom d'acteurs prédéfinis.
 *   Réservé à la démonstration locale du prototype, ne jamais exposer ce mode sur un réseau.
 */
export const AccessMode = Object.freeze({
  ENFORCED: 'ENFORCED',
  DEMO_OPEN: 'DEMO_OPEN'
});

const HEX_KEY_64 = /^[0-9a-fA-F]{64}$/;
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypeHtmlPath = path.join(__dirname, '..', 'prototype', 'index.html');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    req.on('data', chunk => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        reject(new Error('Corps de requête trop volumineux'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error('Corps JSON invalide'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...OWASP_SECURITY_HEADERS,
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

export function createGuichetServer({
  accessMode = AccessMode.ENFORCED,
  demoPassword = null,
  securityAuditPassed = false,
  sessionTtlMs
} = {}) {
  if (!Object.values(AccessMode).includes(accessMode)) {
    throw new Error(`Mode d'accès inconnu : ${accessMode}`);
  }
  const demoOpen = accessMode === AccessMode.DEMO_OPEN;
  const adminAddr = '0x1111111111111111111111111111111111111111';
  const relayerAddr = '0x2222222222222222222222222222222222222222';
  const registry = new FNPSSRegistryContract(adminAddr, relayerAddr);
  registry.setMinistrySigner(adminAddr, relayerAddr, true);
  const engine = new GuichetUniqueEngine(registry, relayerAddr);
  const auth = new AuthService(sessionTtlMs ? { sessionTtlMs } : {});
  const cms = new NewsAndStatsService();
  const partnerGateway = new PartnerApiGateway();
  const pwaQueue = new OfflinePwaSyncQueue();
  const pilotTracker = new PilotAndHypercareTracker();
  const paymentLedger = new PaymentReconciliationLedger();

  // Aucun mot de passe de compte privilégié n'est écrit dans le code : à défaut de mot de passe fourni, il est généré.
  const seedPassword = demoPassword || `${crypto.randomBytes(12).toString('base64url')}#aA1`;
  const generatedDemoPassword = demoPassword ? null : seedPassword;

  // Pré-amorçage des comptes ONG avec dérivation Web3Auth
  const espoirUser = auth.registerUser({
    email: 'contact@espoir-kivu.org',
    password: seedPassword,
    firstName: 'Amina',
    lastName: 'Kahindo',
    organizationName: 'ONG Espoir du Nord-Kivu',
    province: 'Nord-Kivu (Goma)',
    enrollmentNumber: 'FNPSS/ENR/2025/0112'
  });
  auth.registerUser({
    email: 'direction@solidarite-kasai.org',
    password: seedPassword,
    firstName: 'Dieudonné',
    lastName: 'Tshibangu',
    organizationName: 'Fondation Solidarité Kasaï',
    province: 'Kasaï-Central (Kananga)'
  });

  // Comptes du personnel FNPSS, ministère et douane (ADM-01) : créés uniquement ici, jamais via l'inscription publique.
  const staffSeeds = [
    { email: 'agent@fnpss.cd', role: Roles.AGENT, firstName: 'Patrick', lastName: 'K.' },
    { email: 'chef.division@fnpss.cd', role: Roles.CHEF_DIVISION, firstName: 'Marie', lastName: 'M.' },
    { email: 'dg@fnpss.cd', role: Roles.DG, firstName: 'Jean-Pierre', lastName: 'L.' },
    { email: 'ministere@tutelle.cd', role: Roles.MINISTERE, firstName: 'Point', lastName: 'Focal' },
    { email: 'douane@dgda.cd', role: Roles.DOUANE, firstName: 'Inspecteur', lastName: 'DGDA' },
    { email: 'admin@fnpss.cd', role: Roles.ADMIN, firstName: 'Administrateur', lastName: 'FNPSS' }
  ];
  for (const seed of staffSeeds) {
    auth.registerUser({ ...seed, password: seedPassword, organizationName: 'FNPSS / Administration partenaire' });
  }

  // Acteurs utilisés pour l'amorçage des dossiers et, en mode DEMO_OPEN uniquement, par les routes.
  const defaultActors = {
    requerant: { id: demoOpen ? 'ong-espoir-goma' : espoirUser.id, role: Roles.REQUERANT },
    agent: { id: 'agent-patrick-k', role: Roles.AGENT },
    chefDivision: { id: 'div-chief-marie-m', role: Roles.CHEF_DIVISION },
    dg: { id: 'dg-jean-pierre-l', role: Roles.DG },
    ministere: { id: 'min-tutelle-focal', role: Roles.MINISTERE },
    admin: { id: 'admin-fnpss-1', role: Roles.ADMIN }
  };


  // Acte de démonstration historique pré-ancré pour l'API d'interopérabilité DGDA
  const demoHash = '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';
  registry.registerDocument({
    caller: relayerAddr,
    docHash: demoHash,
    certificateNumber: 'FNPSS-EXO-2026-00124',
    serviceCode: 6,
    expiresAt: Math.floor(Date.now() / 1000) + 365 * 86400
  });

  // Pré-amorçage de 3 dossiers réalistes dans le moteur métier
  const allDocs = ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'];
  const makeDemoDocs = (docTypes, orgSlug) => docTypes.map(docCode => ({
    docCode,
    fileName: `${orgSlug}_${docCode.toLowerCase()}.pdf`,
    sha256Hash: `0x${Buffer.from(`${orgSlug}:${docCode}`).toString('hex').padEnd(64, '0')}`,
    sizeBytes: 184500,
    uploadedAt: '2026-10-28T09:15:00.000Z'
  }));

  const app1 = engine.submitApplication(defaultActors.requerant, {
    organizationName: 'ONG Espoir du Nord-Kivu',
    serviceCode: 'S1',
    projectTitle: 'Enrôlement institutionnel biennal 2026-2028',
    goodsSummary: 'Sans objet (Enrôlement structurel)',
    uploadedDocTypes: ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'],
    attachedDocuments: makeDemoDocs(['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'], 'espoir_goma'),
    paymentReference: 'RAWBANK-CDF-2026-11204'
  });
  engine.validatePaymentAndStartSla(defaultActors.agent, app1.referenceNumber);
  engine.approveAndSealCertificate(defaultActors.dg, app1.referenceNumber, { validityDays: 730 });

  const app2 = engine.submitApplication(defaultActors.requerant, {
    organizationName: 'ONG Espoir du Nord-Kivu',
    serviceCode: 'S6',
    projectTitle: 'Importation de 2 ambulances 4x4 et 500 kits médicaux — Goma',
    goodsSummary: '2 Véhicules Ambulance 4x4 Toyota Land Cruiser, 500 Kits médicaux d\'urgence, 12 Générateurs solaires (148 000 USD)',
    uploadedDocTypes: ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'],
    attachedDocuments: makeDemoDocs(['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'], 'espoir_goma'),
    paymentReference: 'BCDC-CDF-2026-99481',
    hasActiveS1Enrollment: true
  });
  engine.validatePaymentAndStartSla(defaultActors.agent, app2.referenceNumber);
  engine.approveAndSealCertificate(defaultActors.dg, app2.referenceNumber, { validityDays: 365 });
  engine.recordMinistryCoSignature(defaultActors.ministere, app2.referenceNumber, { ministryReference: 'CAB/MIN-AS/2026/0089' });

  engine.submitApplication(defaultActors.requerant, {
    organizationName: 'Fondation Solidarité Kasaï',
    serviceCode: 'S4',
    projectTitle: 'Équipements de forage d\'eau potable — Kananga (10 puits)',
    goodsSummary: '2 Camions foreuses hydrauliques, 40 Pompes solaires immergées, tuyauterie PVC (92 500 USD)',
    uploadedDocTypes: allDocs,
    attachedDocuments: makeDemoDocs(allDocs, 'solidarite_kasai'),
    paymentReference: 'EQUITYBCDC-2026-77319'
  });

  // Enregistrement initial des 3 quittances dans le grand-livre de réconciliation comptable (GOV-11)
  for (const app of engine.applications.values()) {
    paymentLedger.registerPaymentReceipt({
      referenceNumber: app.referenceNumber,
      organizationName: app.organizationName,
      serviceCode: app.serviceCode,
      paymentReference: app.paymentReference
    });
    if (app.paymentValidated) {
      paymentLedger.reconcileAndValidateReceipt(defaultActors.agent, app.referenceNumber);
    }
  }

  const requestListener = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);

    // Acteur authentifié de la requête (mode ENFORCED) ; en DEMO_OPEN, les acteurs prédéfinis sont utilisés.
    let requestActor = null;
    const actorFor = key => (demoOpen ? defaultActors[key] : requestActor);

    try {
      if (!demoOpen && url.pathname.startsWith('/api/')) {
        const policy = findRoutePolicy(req.method, url.pathname);
        const token = extractBearerToken(req.headers || {});
        let tokenRejected = false;
        if (token) {
          try {
            requestActor = auth.authenticateSession(token);
          } catch (_) {
            tokenRejected = true;
          }
        }
        if (policy && policy.access !== 'PUBLIC' && tokenRejected) {
          return sendJson(res, 401, { error: 'Session invalide ou expirée' });
        }
        const decision = authorizeRoute(policy, requestActor);
        if (!decision.allowed) {
          return sendJson(res, decision.status, { error: decision.reason });
        }
      }

      if (req.method === 'GET' && url.pathname === '/api/health') {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'fnpss-guichet-unique',
          network: 'polygon-amoy',
          totalApplications: engine.applications.size
        });
      }

      if (req.method === 'GET' && url.pathname === '/api/services') {
        return sendJson(res, 200, {
          services: Object.values(FNPSS_SERVICES).map(s => ({
            ...s,
            fees: calculateServiceFees(s.code)
          }))
        });
      }

      if (req.method === 'GET' && url.pathname === '/api/services/config') {
        const code = (url.searchParams.get('code') || 'S6').toUpperCase();
        const hasEnrollment = url.searchParams.get('hasActiveS1Enrollment') === 'true';
        const config = getServiceSubmissionConfig(code, { hasActiveS1Enrollment: hasEnrollment });
        return sendJson(res, 200, { config });
      }

      if (req.method === 'GET' && url.pathname === '/api/applications') {
        const refParam = url.searchParams.get('ref');
        if (refParam) {
          const app = engine.getApplication(refParam);
          if (!demoOpen && requestActor.role === Roles.REQUERANT && app.ownerId !== requestActor.id) {
            return sendJson(res, 403, { error: 'Accès refusé' });
          }
          return sendJson(res, 200, { application: app });
        }
        const serviceCode = url.searchParams.get('service') || null;
        const statusFilter = url.searchParams.get('status') || null;
        const isApplicantView = !demoOpen && requestActor.role === Roles.REQUERANT;
        // Un requérant ne voit que ses propres dossiers et jamais le journal d'audit global (ADM-01).
        const applications = engine.listApplications({ serviceCode, status: statusFilter })
          .filter(a => !isApplicantView || a.ownerId === requestActor.id)
          .reverse();
        const auditLogs = isApplicantView ? [] : engine.getAuditLogs();
        return sendJson(res, 200, { applications, auditLogs });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications') {
        const body = await readJsonBody(req);
        const created = engine.submitApplication(actorFor('requerant'), {
          organizationName: body.organizationName || 'ONG Espoir du Nord-Kivu',
          serviceCode: body.serviceCode || 'S6',
          projectTitle: body.projectTitle,
          goodsSummary: body.goodsSummary || '',
          uploadedDocTypes: body.uploadedDocTypes || (body.attachedDocuments?.length ? [] : allDocs),
          attachedDocuments: body.attachedDocuments || [],
          paymentReference: body.paymentReference,
          hasActiveS1Enrollment: Boolean(body.hasActiveS1Enrollment)
        });
        paymentLedger.registerPaymentReceipt({
          referenceNumber: created.referenceNumber,
          organizationName: created.organizationName,
          serviceCode: created.serviceCode,
          paymentReference: created.paymentReference
        });
        return sendJson(res, 201, { application: created });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/validate-payment') {
        const body = await readJsonBody(req);
        const updated = engine.validatePaymentAndStartSla(actorFor('agent'), body.referenceNumber);
        return sendJson(res, 200, { application: updated });
      }

      if (req.method === 'PUT' && url.pathname === '/api/applications') {
        const body = await readJsonBody(req);
        const updated = engine.updateApplicationBeforeInstruction(
          actorFor('requerant'),
          body.referenceNumber,
          body
        );
        return sendJson(res, 200, { application: updated });
      }

      if ((req.method === 'DELETE' && url.pathname === '/api/applications') ||
          (req.method === 'POST' && url.pathname === '/api/applications/withdraw')) {
        const body = await readJsonBody(req);
        const ref = body.referenceNumber || url.searchParams.get('ref') || '';
        const resWithdraw = engine.withdrawApplicationBeforeInstruction(actorFor('requerant'), ref);
        return sendJson(res, 200, resWithdraw);
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/division-opinion') {
        const body = await readJsonBody(req);
        const updated = engine.emitDivisionChiefOpinion(actorFor('chefDivision'), body.referenceNumber, {
          favorable: body.favorable !== false,
          opinionNote: body.opinionNote
        });
        return sendJson(res, 200, { application: updated });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/request-complement') {
        const body = await readJsonBody(req);
        const updated = engine.requestComplement(actorFor('agent'), body.referenceNumber, body.reason || 'Pièce justificative à clarifier');
        return sendJson(res, 200, { application: updated });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/provide-complement') {
        const body = await readJsonBody(req);
        const updated = engine.provideComplement(actorFor('requerant'), body.referenceNumber, body.additionalDocType || 'P5_PROJET_BIENS');
        return sendJson(res, 200, { application: updated });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/approve-seal') {
        const body = await readJsonBody(req);
        const app = engine.getApplication(body.referenceNumber);
        // Raccourci de démonstration : validation du paiement et co-signature au nom d'autres rôles.
        // En mode ENFORCED, chaque étape doit être réalisée par son propre rôle authentifié.
        if (demoOpen && !app.paymentValidated) {
          engine.validatePaymentAndStartSla(actorFor('agent'), body.referenceNumber);
        }
        const sealedApp = engine.approveAndSealCertificate(actorFor('dg'), body.referenceNumber);
        if (demoOpen && FNPSS_SERVICES[sealedApp.serviceCode]?.requiresMinistrySignoff) {
          engine.recordMinistryCoSignature(actorFor('ministere'), body.referenceNumber);
        }
        const { pdfBuffer, ...certMeta } = engine.getApplication(body.referenceNumber).certificate;
        return sendJson(res, 200, {
          application: {
            ...engine.getApplication(body.referenceNumber),
            certificate: certMeta
          }
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/cosign-ministry') {
        const body = await readJsonBody(req);
        const updated = engine.recordMinistryCoSignature(actorFor('ministere'), body.referenceNumber, {
          ministryReference: body.ministryReference
        });
        const { pdfBuffer, ...certMeta } = updated.certificate || {};
        return sendJson(res, 200, { application: { ...updated, certificate: updated.certificate ? certMeta : updated.certificate } });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/revoke') {
        const body = await readJsonBody(req);
        const updated = engine.revokeCertificate(
          actorFor('dg'),
          body.referenceNumber,
          body.reason || 'Suspension administrative suite à contrôle de conformité terrain (CU06)'
        );
        const { pdfBuffer, ...certMeta } = updated.certificate;
        return sendJson(res, 200, { application: { ...updated, certificate: certMeta } });
      }

      if (req.method === 'GET' && url.pathname === '/api/applications/certificate.pdf') {
        const ref = url.searchParams.get('ref') || '';
        const app = engine.getApplication(ref);
        if (!demoOpen && requestActor.role === Roles.REQUERANT && app.ownerId !== requestActor.id) {
          return sendJson(res, 403, { error: 'Accès refusé : ce dossier ne vous appartient pas' });
        }
        if (!app.certificate || !app.certificate.pdfBuffer) {
          return sendJson(res, 404, { error: 'Aucun PDF scellé disponible pour ce dossier' });
        }
        const filename = `${app.certificate.certificateNumber}.pdf`;
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': app.certificate.pdfBuffer.length
        });
        res.end(app.certificate.pdfBuffer);
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/verify') {
        const query = (url.searchParams.get('hash') || '').trim();
        const apiKey = req.headers?.['x-api-key'] || null;
        const rateInfo = partnerGateway.authenticateAndRateLimitPartner({
          apiKey,
          endpoint: '/api/verify',
          queryTarget: query
        });
        let targetHash = query;
        if (!query.startsWith('0x')) {
          for (const app of engine.applications.values()) {
            if (app.certificate && app.certificate.certificateNumber.toLowerCase() === query.toLowerCase()) {
              targetHash = app.certificate.docHash;
              break;
            }
          }
        }
        const verification = registry.verifyDocument(targetHash);
        return sendJson(res, 200, { ...verification, partnerId: rateInfo.partnerId }, rateInfo.headers);
      }

      if (req.method === 'GET' && url.pathname === '/api/audit-logs') {
        return sendJson(res, 200, { auditLogs: engine.getAuditLogs() });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/register') {
        const body = await readJsonBody(req);
        // Le rôle n'est jamais choisi par l'appelant : l'inscription publique crée uniquement des requérants.
        const user = auth.registerUser({ ...body, role: Roles.REQUERANT });
        return sendJson(res, 201, { user });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await readJsonBody(req);
        const session = auth.loginWithEmail(body);
        return sendJson(res, 200, session);
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/google') {
        const body = await readJsonBody(req);
        const session = auth.loginWithGoogleOAuth(body);
        return sendJson(res, 200, session);
      }

      if (req.method === 'GET' && url.pathname === '/api/applicants') {
        return sendJson(res, 200, { applicants: auth.listApplicants() });
      }

      if (req.method === 'POST' && url.pathname === '/api/applicants/status') {
        const body = await readJsonBody(req);
        const updated = auth.setApplicantAccountStatus(actorFor('admin'), body.userId, body.status, body.reason);
        return sendJson(res, 200, { applicant: updated });
      }

      if (req.method === 'GET' && url.pathname === '/api/notifications') {
        // Un utilisateur connecté ne consulte que ses propres notifications (ADM-01).
        const userId = demoOpen ? (url.searchParams.get('userId') || '') : requestActor.id;
        return sendJson(res, 200, {
          ...engine.notifications.getUserNotifications(userId),
          emailOutboxCount: engine.notifications.emailOutbox.length
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/notifications/broadcast') {
        const body = await readJsonBody(req);
        const comm = engine.notifications.sendBroadcastCommunication({
          senderId: actorFor('admin').id,
          targetSegment: body.targetSegment || 'ALL_APPLICANTS',
          recipientUserId: body.recipientUserId || null,
          subject: body.subject,
          message: body.message
        });
        return sendJson(res, 201, { communication: comm });
      }

      if (req.method === 'POST' && url.pathname === '/api/documents/inspect') {
        const body = await readJsonBody(req);
        const inspection = validateAndInspectPdfUpload(body.content || '', {
          fileName: body.fileName || 'piece-justificative.pdf',
          encryptionKeyHex: body.encryptionKeyHex || null
        });
        return sendJson(res, 200, { inspection });
      }

      if (req.method === 'POST' && url.pathname === '/api/verify-pdf') {
        const body = await readJsonBody(req);
        let pdfContent = body.content;
        let fileName = body.fileName || 'acte-fnpss.pdf';
        if (!pdfContent && body.referenceNumber) {
          const app = engine.getApplication(body.referenceNumber);
          if (!app.certificate || !app.certificate.pdfBuffer) {
            return sendJson(res, 404, { error: 'Aucun PDF scellé disponible pour ce dossier' });
          }
          pdfContent = body.tamperByte
            ? Buffer.concat([app.certificate.pdfBuffer, Buffer.from('\n%TAMPERED', 'ascii')])
            : app.certificate.pdfBuffer;
          fileName = `${app.certificate.certificateNumber}.pdf`;
        }
        const result = verifyUploadedPdfAgainstRegistry(pdfContent || '', registry, Math.floor(Date.now() / 1000), { fileName });
        return sendJson(res, 200, result);
      }

      if (req.method === 'GET' && url.pathname === '/api/news') {
        const category = url.searchParams.get('category') || null;
        return sendJson(res, 200, { articles: cms.listPublishedNews({ category }) });
      }

      if (req.method === 'POST' && url.pathname === '/api/news') {
        const body = await readJsonBody(req);
        const article = cms.createNewsArticle(actorFor('admin'), body);
        return sendJson(res, 201, { article });
      }

      if (req.method === 'GET' && url.pathname === '/api/stats') {
        const stats = cms.computeExecutiveStats(engine.listApplications(), auth.listApplicants());
        return sendJson(res, 200, { stats });
      }

      if (req.method === 'POST' && url.pathname === '/api/pwa/sync') {
        const body = await readJsonBody(req);
        const queued = pwaQueue.enqueueOfflineSubmission(actorFor('requerant'), {
          organizationName: body.organizationName || 'ONG Espoir du Nord-Kivu',
          serviceCode: body.serviceCode || 'S6',
          projectTitle: body.projectTitle,
          goodsSummary: body.goodsSummary || '',
          uploadedDocTypes: body.uploadedDocTypes || (body.attachedDocuments?.length ? [] : allDocs),
          attachedDocuments: body.attachedDocuments || [],
          paymentReference: body.paymentReference,
          hasActiveS1Enrollment: Boolean(body.hasActiveS1Enrollment)
        }, { idempotencyKey: body.idempotencyKey || null });
        const syncedList = pwaQueue.syncQueuedSubmissions(engine, {
          isOnline: body.isOnline !== false
        });
        const match = syncedList.find(item => item.idempotencyKey === queued.idempotencyKey) || queued;
        return sendJson(res, 200, { syncResult: match, deduplicated: queued.deduplicated });
      }

      if (req.method === 'GET' && url.pathname === '/api/ops/supervision') {
        let htmlBytes = 65000;
        try {
          htmlBytes = fs.statSync(prototypeHtmlPath).size;
        } catch (_) {}
        const snapshot = partnerGateway.getSupervisionSnapshot({
          totalApplications: engine.applications.size,
          auditLogsCount: engine.auditLogs.length,
          prototypeHtmlBytes: htmlBytes
        });
        return sendJson(res, 200, snapshot);
      }

      if (req.method === 'POST' && url.pathname === '/api/blockchain/deploy') {
        const body = await readJsonBody(req);
        const receipt = deployAndVerifyRegistryContract({
          networkKey: body.networkKey || 'polygon-amoy',
          adminAddress: adminAddr,
          relayerAddress: relayerAddr,
          // L'audit de sécurité (BLK-12) ne peut pas être déclaré par le client en mode ENFORCED.
          auditPassed: demoOpen ? Boolean(body.auditPassed) : securityAuditPassed
        });
        return sendJson(res, 200, { deployment: receipt });
      }

      if (req.method === 'POST' && url.pathname === '/api/ops/backup') {
        const body = await readJsonBody(req);
        if (!demoOpen && !HEX_KEY_64.test(body.encryptionKeyHex || '')) {
          return sendJson(res, 400, { error: 'OPS-05: encryptionKeyHex (64 caractères hexadécimaux) est obligatoire hors mode démonstration' });
        }
        const backup = createEncryptedSystemBackup({
          engine,
          auth,
          cms,
          encryptionKeyHex: body.encryptionKeyHex || undefined
        });
        return sendJson(res, 200, { backup });
      }

      if (req.method === 'POST' && url.pathname === '/api/ops/restore') {
        const body = await readJsonBody(req);
        if (!demoOpen && !HEX_KEY_64.test(body.encryptionKeyHex || '')) {
          return sendJson(res, 400, { error: 'OPS-05: encryptionKeyHex (64 caractères hexadécimaux) est obligatoire hors mode démonstration' });
        }
        const restored = restoreEncryptedSystemBackup(body.backup, body.encryptionKeyHex || undefined);
        return sendJson(res, 200, restored);
      }

      if (req.method === 'GET' && url.pathname === '/api/ops/go-nogo') {
        const gates = evaluateGoNoGoGates();
        const pilot = pilotTracker.getPilotStatusSummary();
        return sendJson(res, 200, { gates, pilot });
      }

      if (req.method === 'GET' && url.pathname === '/api/finance/ledger') {
        return sendJson(res, 200, {
          summary: paymentLedger.getReconciliationSummary(),
          csv: paymentLedger.exportLedgerCsv()
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/finance/reconcile') {
        const body = await readJsonBody(req);
        const receipt = paymentLedger.reconcileAndValidateReceipt(
          actorFor('agent'),
          body.referenceNumber || body.paymentReference,
          {
            bankStatementMatch: body.bankStatementMatch !== false,
            bankNote: body.bankNote
          }
        );
        return sendJson(res, 200, { receipt });
      }

      if (req.method === 'PUT' && url.pathname === '/api/auth/profile') {
        const body = await readJsonBody(req);
        // Le profil modifié est toujours celui de la session, jamais un identifiant fourni par l'appelant.
        const profileUserId = demoOpen ? (body.userId || 'usr-0001') : requestActor.id;
        const updatedUser = auth.updateOrganizationProfile(profileUserId, body);
        return sendJson(res, 200, { user: updatedUser });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
        const body = await readJsonBody(req);
        const resLogout = auth.logout(extractBearerToken(req.headers || {}) || body.sessionToken);
        return sendJson(res, 200, resLogout);
      }

      if (req.method === 'GET' && url.pathname === '/api/audit-logs/export') {
        const filters = {
          actorId: url.searchParams.get('actorId') || null,
          actorRole: url.searchParams.get('actorRole') || null,
          action: url.searchParams.get('action') || null,
          targetId: url.searchParams.get('targetId') || null
        };
        return sendJson(res, 200, {
          entries: engine.queryAuditLogs(filters),
          csv: engine.exportAuditLogsCsv(filters)
        });
      }

      if (req.method === 'GET' && url.pathname === '/api/ops/g1-gate') {
        return sendJson(res, 200, evaluateG1Gate());
      }

      if (req.method === 'GET' && url.pathname === '/api/ops/migrations') {
        const plan = verifyAndPlanSqlMigrations();
        return sendJson(res, 200, plan);
      }

      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        const html = fs.readFileSync(prototypeHtmlPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      return sendJson(res, 404, { error: 'Route non trouvée' });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  };

  const server = http.createServer(requestListener);
  server.engine = engine;
  server.registry = registry;
  server.auth = auth;
  server.cms = cms;
  server.partnerGateway = partnerGateway;
  server.pwaQueue = pwaQueue;
  server.pilotTracker = pilotTracker;
  server.paymentLedger = paymentLedger;
  server.accessMode = accessMode;
  server.generatedDemoPassword = generatedDemoPassword;

  /**
   * Exécute une requête REST en mémoire (sans socket TCP) pour les tests unitaires/E2E en bac à sable.
   */
  server.dispatch = async ({ method = 'GET', url = '/', body = null, headers: reqHeaders = {} } = {}) => {
    const payloadBuf = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8') : Buffer.alloc(0);
    const req = Readable.from(payloadBuf.length ? [payloadBuf] : []);
    req.method = method;
    req.url = url;
    const normalizedReqHeaders = Object.fromEntries(
      Object.entries(reqHeaders).map(([k, v]) => [k.toLowerCase(), v])
    );
    req.headers = { host: 'localhost', 'content-type': 'application/json', ...normalizedReqHeaders };

    return new Promise((resolve) => {
      let statusCode = 200;
      let headers = {};
      const chunks = [];
      const res = {
        writeHead(code, hdrs = {}) {
          statusCode = code;
          headers = Object.fromEntries(Object.entries(hdrs).map(([k, v]) => [k.toLowerCase(), v]));
        },
        end(data) {
          if (data) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8'));
          const rawBuffer = Buffer.concat(chunks);
          resolve({
            status: statusCode,
            headers,
            rawBuffer,
            json: () => JSON.parse(rawBuffer.toString('utf8')),
            text: () => rawBuffer.toString('utf8')
          });
        }
      };
      requestListener(req, res);
    });
  };

  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const demoOpenRequested = process.argv.includes('--demo-open');
  const server = createGuichetServer({
    accessMode: demoOpenRequested ? AccessMode.DEMO_OPEN : AccessMode.ENFORCED,
    demoPassword: process.env.FNPSS_DEMO_PASSWORD || null
  });
  // Le mode DEMO_OPEN n'est jamais exposé au réseau : écoute locale uniquement.
  const host = demoOpenRequested ? '127.0.0.1' : (process.env.HOST || '0.0.0.0');
  server.listen(port, host, () => {
    console.log(`Guichet Unique FNPSS actif sur http://localhost:${port} (mode ${server.accessMode}, hôte ${host})`);
    if (demoOpenRequested) {
      console.warn('ATTENTION : mode DEMO_OPEN, aucune authentification. Réservé à la démonstration locale du prototype.');
    } else if (server.generatedDemoPassword) {
      console.log(`Mot de passe de démonstration généré pour les comptes amorcés (affiché une seule fois) : ${server.generatedDemoPassword}`);
      console.log('Comptes : agent@fnpss.cd, chef.division@fnpss.cd, dg@fnpss.cd, ministere@tutelle.cd, douane@dgda.cd, admin@fnpss.cd, contact@espoir-kivu.org');
    }
  });
}
