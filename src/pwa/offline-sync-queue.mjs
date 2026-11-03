/**
 * @fileoverview Gestionnaire du Mode Hors-Ligne PWA (REQ-11) :
 * - Conservation des brouillons de demande hors-ligne par requérant
 * - File d'attente de soumission avec clé d'idempotence (`idempotencyKey`)
 *   garantissant zéro doublon d'envoi lors de la reconnexion 3G en province.
 */

import crypto from 'node:crypto';

export class OfflinePwaSyncQueue {
  constructor() {
    this.draftsByUser = new Map();
    this.submissionsByKey = new Map();
  }

  /**
   * Sauvegarde ou met à jour un brouillon de formulaire hors-ligne (REQ-11).
   */
  saveOfflineDraft(userId, draftPayload = {}) {
    if (!userId) {
      throw new Error('REQ-11: Identifiant utilisateur requis pour sauvegarder un brouillon PWA');
    }
    const entry = {
      userId,
      serviceCode: draftPayload.serviceCode || 'S6',
      organizationName: draftPayload.organizationName || '',
      projectTitle: draftPayload.projectTitle || '',
      goodsSummary: draftPayload.goodsSummary || '',
      paymentReference: draftPayload.paymentReference || '',
      uploadedDocTypes: Array.isArray(draftPayload.uploadedDocTypes) ? [...draftPayload.uploadedDocTypes] : [],
      updatedAt: new Date().toISOString()
    };
    this.draftsByUser.set(userId, entry);
    return { ...entry };
  }

  getOfflineDraft(userId) {
    const draft = this.draftsByUser.get(userId);
    return draft ? { ...draft } : null;
  }

  /**
   * Calcule une clé d'idempotence déterministe pour éviter tout doublon d'envoi en cas de rebond réseau 3G.
   */
  computeIdempotencyKey(actorId, payload = {}) {
    const canonical = `${actorId}|${payload.serviceCode || ''}|${payload.projectTitle || ''}|${payload.paymentReference || ''}`;
    return 'idem_' + crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 24);
  }

  /**
   * Place une demande dans la file d'attente hors-ligne avec déduplication stricte (REQ-11).
   */
  enqueueOfflineSubmission(actor, payload, { idempotencyKey = null } = {}) {
    if (!actor || !actor.id) {
      throw new Error('REQ-11: Acteur requis pour mettre une demande en file hors-ligne');
    }
    const key = idempotencyKey || this.computeIdempotencyKey(actor.id, payload);

    if (this.submissionsByKey.has(key)) {
      const existing = this.submissionsByKey.get(key);
      return { ...existing, deduplicated: true };
    }

    const queuedItem = {
      idempotencyKey: key,
      actor: { ...actor },
      payload: { ...payload },
      status: 'OFFLINE_QUEUED',
      attempts: 0,
      referenceNumber: null,
      lastError: null,
      queuedAt: new Date().toISOString(),
      syncedAt: null
    };

    this.submissionsByKey.set(key, queuedItem);
    return { ...queuedItem, deduplicated: false };
  }

  /**
   * Synchronise automatiquement les demandes en attente dès le retour du réseau (REQ-11).
   */
  syncQueuedSubmissions(engine, { isOnline = true } = {}) {
    const results = [];
    for (const item of this.submissionsByKey.values()) {
      if (item.status === 'SYNCED') {
        results.push({ ...item, deduplicated: true });
        continue;
      }

      item.attempts += 1;
      if (!isOnline) {
        item.lastError = 'NETWORK_OFFLINE_WAITING';
        results.push({ ...item, deduplicated: false });
        continue;
      }

      try {
        const createdApp = engine.submitApplication(item.actor, item.payload);
        item.status = 'SYNCED';
        item.referenceNumber = createdApp.referenceNumber;
        item.lastError = null;
        item.syncedAt = new Date().toISOString();
        this.draftsByUser.delete(item.actor.id);
        results.push({ ...item, deduplicated: false });
      } catch (err) {
        item.status = 'SYNC_FAILED';
        item.lastError = err.message;
        results.push({ ...item, deduplicated: false });
      }
    }
    return results;
  }
}
