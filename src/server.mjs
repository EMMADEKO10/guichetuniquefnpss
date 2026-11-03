/**
 * @fileoverview Serveur HTTP & API REST complète du Guichet Unique FNPSS :
 * - Sert le prototype interactif haute fidélité (`prototype/index.html`) sur `/`
 * - Expose l'API REST du moteur de workflow (`GuichetUniqueEngine`) et d'interopérabilité DGDA (`VER-05`)
 */

import http from 'node:http';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FNPSS_SERVICES, calculateServiceFees } from './domain/services-catalog.mjs';
import { FNPSSRegistryContract } from './blockchain/registry-simulator.mjs';
import { GuichetUniqueEngine, Roles } from './workflow/application-engine.mjs';
import { AuthService } from './auth/auth-service.mjs';
import { validateAndInspectPdfUpload, verifyUploadedPdfAgainstRegistry } from './storage/document-upload-guard.mjs';
import { NewsAndStatsService } from './cms/news-and-stats.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypeHtmlPath = path.join(__dirname, '..', 'prototype', 'index.html');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

export function createGuichetServer() {
  const adminAddr = '0x1111111111111111111111111111111111111111';
  const relayerAddr = '0x2222222222222222222222222222222222222222';
  const registry = new FNPSSRegistryContract(adminAddr, relayerAddr);
  registry.setMinistrySigner(adminAddr, relayerAddr, true);
  const engine = new GuichetUniqueEngine(registry, relayerAddr);
  const auth = new AuthService();
  const cms = new NewsAndStatsService();

  const defaultActors = {
    requerant: { id: 'ong-espoir-goma', role: Roles.REQUERANT },
    agent: { id: 'agent-patrick-k', role: Roles.AGENT },
    dg: { id: 'dg-jean-pierre-l', role: Roles.DG },
    ministere: { id: 'min-tutelle-focal', role: Roles.MINISTERE },
    admin: { id: 'admin-fnpss-1', role: Roles.ADMIN }
  };

  // Pré-amorçage des comptes ONG avec dérivation Web3Auth
  auth.registerUser({
    email: 'contact@espoir-kivu.org',
    password: 'PasswordRDC#2026',
    firstName: 'Amina',
    lastName: 'Kahindo',
    organizationName: 'ONG Espoir du Nord-Kivu',
    province: 'Nord-Kivu (Goma)',
    enrollmentNumber: 'FNPSS/ENR/2025/0112'
  });
  auth.registerUser({
    email: 'direction@solidarite-kasai.org',
    password: 'PasswordRDC#2026',
    firstName: 'Dieudonné',
    lastName: 'Tshibangu',
    organizationName: 'Fondation Solidarité Kasaï',
    province: 'Kasaï-Central (Kananga)'
  });

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

  const app1 = engine.submitApplication(defaultActors.requerant, {
    organizationName: 'ONG Espoir du Nord-Kivu',
    serviceCode: 'S1',
    projectTitle: 'Enrôlement institutionnel biennal 2026-2028',
    goodsSummary: 'Sans objet (Enrôlement structurel)',
    uploadedDocTypes: allDocs,
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
    paymentReference: 'EQUITYBCDC-2026-77319'
  });

  const requestListener = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);

    try {
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

      if (req.method === 'GET' && url.pathname === '/api/applications') {
        const applications = engine.listApplications().reverse();
        const auditLogs = engine.getAuditLogs();
        return sendJson(res, 200, { applications, auditLogs });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications') {
        const body = await readJsonBody(req);
        const created = engine.submitApplication(defaultActors.requerant, {
          organizationName: body.organizationName || 'ONG Espoir du Nord-Kivu',
          serviceCode: body.serviceCode || 'S6',
          projectTitle: body.projectTitle,
          goodsSummary: body.goodsSummary || '',
          uploadedDocTypes: body.uploadedDocTypes || allDocs,
          paymentReference: body.paymentReference,
          hasActiveS1Enrollment: Boolean(body.hasActiveS1Enrollment)
        });
        return sendJson(res, 201, { application: created });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/validate-payment') {
        const body = await readJsonBody(req);
        const updated = engine.validatePaymentAndStartSla(defaultActors.agent, body.referenceNumber);
        return sendJson(res, 200, { application: updated });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/request-complement') {
        const body = await readJsonBody(req);
        const updated = engine.requestComplement(defaultActors.agent, body.referenceNumber, body.reason || 'Pièce justificative à clarifier');
        return sendJson(res, 200, { application: updated });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/provide-complement') {
        const body = await readJsonBody(req);
        const updated = engine.provideComplement(defaultActors.requerant, body.referenceNumber, body.additionalDocType || 'P5_PROJET_BIENS');
        return sendJson(res, 200, { application: updated });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/approve-seal') {
        const body = await readJsonBody(req);
        const app = engine.getApplication(body.referenceNumber);
        if (!app.paymentValidated) {
          engine.validatePaymentAndStartSla(defaultActors.agent, body.referenceNumber);
        }
        const sealedApp = engine.approveAndSealCertificate(defaultActors.dg, body.referenceNumber);
        if (FNPSS_SERVICES[sealedApp.serviceCode]?.requiresMinistrySignoff) {
          engine.recordMinistryCoSignature(defaultActors.ministere, body.referenceNumber);
        }
        const { pdfBuffer, ...certMeta } = engine.getApplication(body.referenceNumber).certificate;
        return sendJson(res, 200, {
          application: {
            ...engine.getApplication(body.referenceNumber),
            certificate: certMeta
          }
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/applications/revoke') {
        const body = await readJsonBody(req);
        const updated = engine.revokeCertificate(
          defaultActors.dg,
          body.referenceNumber,
          body.reason || 'Suspension administrative suite à contrôle de conformité terrain (CU06)'
        );
        const { pdfBuffer, ...certMeta } = updated.certificate;
        return sendJson(res, 200, { application: { ...updated, certificate: certMeta } });
      }

      if (req.method === 'GET' && url.pathname === '/api/applications/certificate.pdf') {
        const ref = url.searchParams.get('ref') || '';
        const app = engine.getApplication(ref);
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
        return sendJson(res, 200, verification);
      }

      if (req.method === 'GET' && url.pathname === '/api/audit-logs') {
        return sendJson(res, 200, { auditLogs: engine.getAuditLogs() });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/register') {
        const body = await readJsonBody(req);
        const user = auth.registerUser(body);
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
        const updated = auth.setApplicantAccountStatus(defaultActors.admin, body.userId, body.status, body.reason);
        return sendJson(res, 200, { applicant: updated });
      }

      if (req.method === 'GET' && url.pathname === '/api/notifications') {
        const userId = url.searchParams.get('userId') || '';
        return sendJson(res, 200, {
          ...engine.notifications.getUserNotifications(userId),
          emailOutboxCount: engine.notifications.emailOutbox.length
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/notifications/broadcast') {
        const body = await readJsonBody(req);
        const comm = engine.notifications.sendBroadcastCommunication({
          senderId: defaultActors.admin.id,
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
        const article = cms.createNewsArticle(defaultActors.admin, body);
        return sendJson(res, 201, { article });
      }

      if (req.method === 'GET' && url.pathname === '/api/stats') {
        const stats = cms.computeExecutiveStats(engine.listApplications(), auth.listApplicants());
        return sendJson(res, 200, { stats });
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

  /**
   * Exécute une requête REST en mémoire (sans socket TCP) pour les tests unitaires/E2E en bac à sable.
   */
  server.dispatch = async ({ method = 'GET', url = '/', body = null } = {}) => {
    const payloadBuf = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8') : Buffer.alloc(0);
    const req = Readable.from(payloadBuf.length ? [payloadBuf] : []);
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost', 'content-type': 'application/json' };

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
  const server = createGuichetServer();
  server.listen(port, () => {
    console.log(`Guichet Unique FNPSS actif sur http://localhost:${port}`);
  });
}
