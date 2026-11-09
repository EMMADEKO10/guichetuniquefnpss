/**
 * @fileoverview Route API Next.js — Service Backend d'Ancrage Blockchain & File d'Attente Résiliente (BLK-09, BLK-10).
 * - GET  /api/blockchain/anchor-queue : état du Relayer FNPSS (sponsorisation gaz Paymaster) et des jobs d'ancrage
 * - POST /api/blockchain/anchor-queue : mise en file idempotente (`action: 'enqueue'`) ou traitement résilient (`action: 'flush'`)
 */

import { registrySimulator, resilientAnchorQueue } from '../../../../blockchain/registry-simulator.mjs';
import { Roles } from '../../../../workflow/application-engine.mjs';
import { requireActor, isStaff, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';

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
    const actor = requireActor(request);
    if (!isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès réservé au personnel habilité FNPSS.');
    }

    const summary = buildQueueSummary();
    return Response.json({
      success: true,
      relayer: {
        address: resilientAnchorQueue.relayerAddress,
        gasSponsorshipModel: 'BACKEND_PAYMASTER_RELAYER',
        zeroCryptoForApplicant: true,
        estimatedCostPerTxUsd: 0.01,
        registryPaused: registrySimulator.paused,
        anchoredDocumentsCount: registrySimulator.records.size
      },
      queue: summary
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
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
      return Response.json({
        success: true,
        action: 'enqueue',
        job: entry,
        queue: buildQueueSummary()
      }, { status: 201 });
    }

    if (action === 'flush') {
      const isNetworkOnline = body.isNetworkOnline !== false;
      const results = resilientAnchorQueue.flush(isNetworkOnline);
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

