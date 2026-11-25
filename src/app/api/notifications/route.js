import { applicationEngine } from '../../../workflow/application-engine.mjs';
import {
  requireActor,
  isStaff,
  errorResponse,
  readJson,
  HttpError
} from '../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../infra/neon-persistence.mjs';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * GET /api/notifications (NOT-01, NOT-02, NOT-04)
 * - Sans ?ref : centre de notifications in-app de l'utilisateur connecté (et de son rôle staff) + compteur de non-lus.
 * - Avec ?ref=FNPSS/DEM/... : fil de discussion rattaché au dossier (propriétaire ou agent FNPSS).
 */
export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');

    if (ref) {
      const app = applicationEngine.getApplication(ref);
      if (app.ownerId !== actor.id && !isStaff(actor)) {
        throw new HttpError(403, 'RBAC: Accès au fil de discussion refusé');
      }
      const messages = applicationEngine.notifications.getDossierMessages(ref);
      return Response.json({ success: true, referenceNumber: ref, messages });
    }

    const { unreadCount, notifications } = applicationEngine.notifications.getUserNotifications(actor.id, actor.role);
    const payload = { success: true, unreadCount, notifications };
    if (isStaff(actor)) {
      payload.emailOutboxTotal = applicationEngine.notifications.emailOutbox.length;
      payload.emailRetryQueued = applicationEngine.notifications.emailOutbox.filter(
        m => m.status === 'RETRY_QUEUED'
      ).length;
    }
    return Response.json(payload);
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * PUT /api/notifications (NOT-02)
 * Marque une notification comme lue/non-lue ou tout comme lu (anti-IDOR : uniquement les siennes ou celles de son rôle).
 */
export async function PUT(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const body = await readJson(request);
    if (body.markAllRead === true) {
      const updatedCount = applicationEngine.notifications.markAllNotificationsRead(actor.id, actor.role);
      await persistToNeon();
      return Response.json({ success: true, markAllRead: true, updatedCount });
    }
    if (!body.notificationId) {
      throw new HttpError(400, 'Identifiant de notification requis.');
    }
    const notification = applicationEngine.notifications.markNotificationRead(
      body.notificationId,
      body.read !== false,
      actor.id,
      actor.role
    );
    await persistToNeon();
    return Response.json({ success: true, notification });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/notifications (NOT-01, NOT-03, NOT-04)
 * - action="dossier-message" : message sur le fil d'un dossier (propriétaire ou agent FNPSS)
 * - action="broadcast" : communication générale ou ciblée aux requérants (personnel FNPSS)
 * - action="flush-outbox" : reprise sur échec de la file d'envoi d'emails (personnel FNPSS)
 */
export async function POST(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const body = await readJson(request);
    const action = body.action || 'dossier-message';

    if (action === 'dossier-message') {
      if (!body.referenceNumber || !body.message) {
        throw new HttpError(400, 'Référence du dossier et message requis.');
      }
      const app = applicationEngine.getApplication(body.referenceNumber);
      if (app.ownerId !== actor.id && !isStaff(actor)) {
        throw new HttpError(403, 'RBAC: Seul le propriétaire ou un instructeur peut écrire sur ce dossier');
      }
      const entry = applicationEngine.notifications.addDossierMessage({
        referenceNumber: body.referenceNumber,
        authorId: actor.id,
        authorRole: actor.role,
        message: body.message,
        attachmentDocType: body.attachmentDocType || null
      });
      await persistToNeon();
      return Response.json({ success: true, entry }, { status: 201 });
    }

    if (action === 'broadcast') {
      if (!isStaff(actor)) {
        throw new HttpError(403, 'RBAC: Diffusion réservée au personnel FNPSS');
      }
      const record = applicationEngine.notifications.sendBroadcastCommunication({
        senderId: actor.id,
        targetSegment: body.targetSegment || 'ALL_APPLICANTS',
        recipientUserId: body.recipientUserId || null,
        subject: body.subject,
        message: body.message
      });
      await persistToNeon();
      return Response.json({ success: true, broadcast: record }, { status: 201 });
    }

    if (action === 'flush-outbox') {
      if (!isStaff(actor)) {
        throw new HttpError(403, 'RBAC: Reprise de la file SMTP réservée au personnel FNPSS');
      }
      const sentCount = applicationEngine.notifications.flushEmailRetryQueue(true);
      await persistToNeon();
      return Response.json({ success: true, sentCount });
    }

    throw new HttpError(400, `Action de notification inconnue : ${action}`);
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * DELETE /api/notifications (NOT-02)
 * Supprime une notification individuelle, une sélection (`notificationIds`) ou toutes (`deleteAll: true`).
 */
export async function DELETE(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    let body = {};
    try {
      body = await readJson(request);
    } catch {
      body = {};
    }
    const { searchParams } = new URL(request.url);

    if (body.deleteAll === true || searchParams.get('all') === 'true') {
      const result = applicationEngine.notifications.deleteAllNotifications(actor.id, actor.role);
      await persistToNeon();
      return Response.json({ success: true, deleteAll: true, deletedCount: result.deletedCount });
    }

    if (Array.isArray(body.notificationIds)) {
      if (body.notificationIds.length === 0) {
        throw new HttpError(400, 'Aucune notification sélectionnée pour suppression.');
      }
      const result = applicationEngine.notifications.deleteNotifications(body.notificationIds, actor.id, actor.role);
      await persistToNeon();
      return Response.json({ success: true, deletedCount: result.deletedCount, deletedIds: result.deletedIds });
    }

    const notificationId = body.notificationId || searchParams.get('id');
    if (!notificationId) {
      throw new HttpError(400, 'Identifiant de notification, liste notificationIds ou deleteAll=true requis.');
    }

    const result = applicationEngine.notifications.deleteNotification(notificationId, actor.id, actor.role);
    await persistToNeon();
    return Response.json({ success: true, deletedCount: result.deletedCount, notificationId: result.notificationId });
  } catch (err) {
    return errorResponse(err);
  }
}

