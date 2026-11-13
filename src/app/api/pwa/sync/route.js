/**
 * @fileoverview Route API Next.js — Mode Hors-Ligne PWA & Synchronisation Idempotente (REQ-11).
 * - GET  /api/pwa/sync : récupère le brouillon hors-ligne et l'état des soumissions en file pour le requérant connecté
 * - POST /api/pwa/sync : sauvegarde un brouillon (`action: 'save-draft'`), place une soumission en file hors-ligne
 *                        avec clé d'idempotence (`action: 'enqueue'`), ou synchronise les demandes dès le retour 3G (`action: 'sync'`)
 */

import { offlinePwaSyncQueue } from '../../../../pwa/offline-sync-queue.mjs';
import { applicationEngine, Roles } from '../../../../workflow/application-engine.mjs';
import { authService } from '../../../../auth/auth-service.mjs';
import { requireActor, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const draft = offlinePwaSyncQueue.getOfflineDraft(actor.id);
    const userQueuedItems = Array.from(offlinePwaSyncQueue.submissionsByKey.values()).filter(
      item => item.actor?.id === actor.id
    );

    return Response.json({
      success: true,
      draft,
      queuedSubmissions: userQueuedItems
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    if (actor.role !== Roles.REQUERANT) {
      throw new HttpError(403, 'RBAC: Seul un requérant ONG/ASBL peut utiliser la file de synchronisation hors-ligne.');
    }

    const body = await readJson(request);
    const action = body.action || 'enqueue';

    if (action === 'save-draft') {
      const draft = offlinePwaSyncQueue.saveOfflineDraft(actor.id, body.draft || body);
      await persistToNeon();
      return Response.json({
        success: true,
        action: 'save-draft',
        draft
      });
    }

    const profile = authService.usersById.get(actor.id);
    const hasValidatedS1 = applicationEngine
      .listApplications({ serviceCode: 'S1', status: 'VALIDE_DELIVRE', ownerId: actor.id })
      .length > 0;

    if (action === 'enqueue') {
      const rawPayload = body.payload || body;
      const sanitizedPayload = {
        organizationName: rawPayload.organizationName || profile?.organizationName || 'Organisation Requérante',
        serviceCode: rawPayload.serviceCode || 'S1',
        projectTitle: rawPayload.projectTitle,
        goodsSummary: rawPayload.goodsSummary || '',
        paymentReference: rawPayload.paymentReference,
        hasActiveS1Enrollment: hasValidatedS1,
        uploadedDocTypes: Array.isArray(rawPayload.uploadedDocTypes) ? rawPayload.uploadedDocTypes : undefined,
        attachedDocuments: Array.isArray(rawPayload.attachedDocuments)
          ? rawPayload.attachedDocuments.map(d => ({
              docCode: d.docCode,
              fileName: d.fileName,
              sizeBytes: d.sizeBytes,
              sha256Hash: d.sha256Hash
            }))
          : undefined
      };

      const item = offlinePwaSyncQueue.enqueueOfflineSubmission(actor, sanitizedPayload, {
        idempotencyKey: body.idempotencyKey || rawPayload.idempotencyKey || null
      });

      await persistToNeon();
      return Response.json({
        success: true,
        action: 'enqueue',
        submission: item
      }, { status: item.deduplicated ? 200 : 201 });
    }

    if (action === 'sync') {
      const isOnline = body.isOnline !== false;
      const allResults = offlinePwaSyncQueue.syncQueuedSubmissions(applicationEngine, { isOnline });
      const userResults = allResults.filter(item => item.actor?.id === actor.id);
      await persistToNeon();
      return Response.json({
        success: true,
        action: 'sync',
        isOnline,
        results: userResults
      });
    }

    throw new HttpError(400, `Action PWA inconnue : ${action}`);
  } catch (err) {
    return errorResponse(err);
  }
}
