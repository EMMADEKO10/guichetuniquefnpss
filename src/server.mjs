/**
 * @fileoverview Serveur HTTP léger du Guichet Unique FNPSS :
 * - Sert le prototype interactif haute fidélité (`prototype/index.html`) sur `/`
 * - Expose l'API d'interopérabilité DGDA & Régies Financières (`VER-05`) sur `/api/services`, `/api/verify`, `/api/health`
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FNPSS_SERVICES, calculateServiceFees } from './domain/services-catalog.mjs';
import { FNPSSRegistryContract } from './blockchain/registry-simulator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypeHtmlPath = path.join(__dirname, '..', 'prototype', 'index.html');

export function createGuichetServer() {
  const adminAddr = '0x1111111111111111111111111111111111111111';
  const relayerAddr = '0x2222222222222222222222222222222222222222';
  const registry = new FNPSSRegistryContract(adminAddr, relayerAddr);

  // Acte de démonstration pré-ancré pour l'API d'interopérabilité DGDA
  const demoHash = '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';
  registry.registerDocument({
    caller: relayerAddr,
    docHash: demoHash,
    certificateNumber: 'FNPSS-EXO-2026-00124',
    serviceCode: 6,
    expiresAt: Math.floor(Date.now() / 1000) + 365 * 86400
  });

  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', service: 'fnpss-guichet-unique', network: 'polygon-amoy' }));
      return;
    }

    if (url.pathname === '/api/services') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        services: Object.values(FNPSS_SERVICES).map(s => ({
          ...s,
          fees: calculateServiceFees(s.code)
        }))
      }));
      return;
    }

    if (url.pathname === '/api/verify') {
      const hash = url.searchParams.get('hash') || '';
      const verification = registry.verifyDocument(hash);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(verification));
      return;
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = fs.readFileSync(prototypeHtmlPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Route non trouvée' }));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const server = createGuichetServer();
  server.listen(port, () => {
    console.log(`Guichet Unique FNPSS actif sur http://localhost:${port}`);
  });
}

