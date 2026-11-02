/**
 * @fileoverview Serveur HTTP & API REST complète du Guichet Unique FNPSS :
 * - Sert le prototype interactif haute fidélité (`prototype/index.html`) sur `/`
 * - Expose l'API REST du moteur de workflow (`GuichetUniqueEngine`) et d'interopérabilité DGDA (`VER-05`)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FNPSS_SERVICES, calculateServiceFees } from './domain/services-catalog.mjs';
import { FNPSSRegistryContract } from './blockchain/registry-simulator.mjs';
import { GuichetUniqueEngine, Roles } from './workflow/application-engine.mjs';

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
  const engine = new GuichetUniqueEngine(registry, relayerAddr);

  const defaultActors = {
    requerant: { id: 'ong-espoir-goma', role: Roles.REQUERANT },
    agent: { id: 'agent-patrick-k', role: Roles.AGENT },
    dg: { id: 'dg-jean-pierre-l', role: Roles.DG },
    ministere: { id: 'min-tutelle-focal', role: Roles.MINISTERE }
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
  const allDocs = ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT_ANNUEL', 'P5_PROJET_BIENS', 'P6_PREUVE_PAIEMENT'];

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
    uploadedDocTypes: ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT_ANNUEL', 'P5_PROJET_BIENS', 'P6_PREUVE_PAIEMENT'],
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

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

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
        if (FNPSS_SERVICES[sealedApp.serviceCode]?.requiresMinistryCoSignature) {
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
  });

  server.engine = engine;
  server.registry = registry;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const server = createGuichetServer();
  server.listen(port, () => {
    console.log(`Guichet Unique FNPSS actif sur http://localhost:${port}`);
  });
}
