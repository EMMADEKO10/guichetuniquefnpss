/**
 * @fileoverview Route API Next.js — Service Backend d'Ancrage Blockchain & File d'Attente Résiliente (BLK-09, BLK-10).
 * - GET  /api/blockchain/anchor-queue : état du Relayer FNPSS (sponsorisation gaz Paymaster) et des jobs d'ancrage
 * - POST /api/blockchain/anchor-queue : mise en file idempotente (`action: 'enqueue'`) ou traitement résilient (`action: 'flush'`)
 */

import { registrySimulator, resilientAnchorQueue } from '../../../../blockchain/registry-simulator.mjs';
import { applicationEngine, Roles } from '../../../../workflow/application-engine.mjs';
import { requireActor, isStaff, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';
import {
  getPolygonNetworkStatus,
  isPolygonRuntimeEnabled,
  registerDocumentOnChain,
  resolvePolygonConfig
} from '../../../../infra/polygon-client.mjs';

export const dynamic = 'force-dynamic';

function buildQueueSummary() {
  const jobs = Array.from(resilientAnchorQueue.queue.values());
  return {
    totalJobs: jobs.length,
    queuedCount: jobs.filter(j => j.status === 'QUEUED').length,
    confirmedCount: jobs.filter(j => j.status === 'CONFIRMED').length,
    failedCount: jobs.filter(j => j.status === 'FAILED').length,
    jobs
  };
}

export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    if (!isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès réservé au personnel habilité FNPSS.');
    }

    const summary = buildQueueSummary();
    const polygonStatus = await getPolygonNetworkStatus().catch(() => null);
    return Response.json({
      success: true,
      relayer: {
        address: polygonStatus?.relayerAddress || resilientAnchorQueue.relayerAddress,
        gasSponsorshipModel: 'BACKEND_PAYMASTER_RELAYER',
        zeroCryptoForApplicant: true,
        estimatedCostPerTxUsd: 0.01,
        registryPaused: polygonStatus?.paused ?? registrySimulator.paused,
        anchoredDocumentsCount: polygonStatus?.totalRegistered ?? registrySimulator.records.size,
        polygonStatus
      },
      queue: summary
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    if (![Roles.DG, Roles.ADMIN, Roles.AGENT].includes(actor.role)) {
      throw new HttpError(403, 'RBAC: Seuls la DG, l\'Administrateur ou un Agent habilité peuvent piloter la file d\'ancrage.');
    }

    const body = await readJson(request);
    const action = body.action || 'flush';

    if (action === 'enqueue') {
      const entry = resilientAnchorQueue.enqueue({
        docHash: body.docHash,
        certificateNumber: body.certificateNumber,
        serviceCode: Number(body.serviceCode || 1),
        expiresAt: Number(body.expiresAt || 0)
      });
      await persistToNeon();
      return Response.json({
        success: true,
        action: 'enqueue',
        job: entry,
        queue: buildQueueSummary()
      }, { status: 201 });
    }

    if (action === 'flush') {
      const isNetworkOnline = body.isNetworkOnline !== false;
      const cfg = resolvePolygonConfig();
      let results;

      if (isNetworkOnline && isPolygonRuntimeEnabled() && cfg.hasValidRelayerKey) {
        results = [];
        for (const entry of resilientAnchorQueue.queue.values()) {
          if (entry.status === 'CONFIRMED') continue;
          entry.attempts += 1;
          try {
            const chainRes = await registerDocumentOnChain({
              docHash: entry.docHash,
              certificateNumber: entry.certificateNumber,
              serviceCode: entry.serviceCode,
              expiresAt: entry.expiresAt || 0
            });
            entry.status = 'CONFIRMED';
            entry.txHash = chainRes.txHash;
            entry.lastError = null;
            for (const app of applicationEngine.applications.values()) {
              if (app.certificate?.docHash === entry.docHash) {
                app.certificate.txHash = chainRes.txHash;
                app.certificate.blockNumber = chainRes.blockNumber;
                app.certificate.explorerTxUrl = chainRes.explorerTxUrl;
                app.certificate.onChainMode = 'POLYGON_LIVE';
              }
            }
          } catch (err) {
            entry.status = 'FAILED';
            entry.lastError = err.message;
          }
          results.push({ ...entry });
        }
      } else {
        results = resilientAnchorQueue.flush(isNetworkOnline);
      }

      await persistToNeon();
      return Response.json({
        success: true,
        action: 'flush',
        isNetworkOnline,
        processed: results,
        queue: buildQueueSummary()
      });
    }

    throw new HttpError(400, `Action d'ancrage inconnue : ${action}`);
  } catch (err) {
    return errorResponse(err);
  }
}

