/**
 * @fileoverview Centre de Notifications Transactionnelles (Email & In-App), Communication Ciblée
 * et Fil d'Échanges par Dossier.
 * Références Backlog :
 * - NOT-01 : Notifications email transactionnelles en français + file d'envoi avec reprise sur échec
 * - NOT-02 : Centre de notifications in-app (non-lus, marquage lu/non-lu, lien direct)
 * - NOT-03 : Communication générale ou ciblée aux requérants
 * - NOT-04 : Demandes de compléments et messagerie rattachée au dossier
 */

const EMAIL_TEMPLATES_FR = Object.freeze({
  APPLICATION_SUBMITTED: d => ({
    subject: `[FNPSS Guichet Unique] Accusé de réception du dossier ${d.referenceNumber}`,
    body: `Bonjour ${d.organizationName || 'Partenaire'},\nVotre demande (${d.serviceCode}) a bien été enregistrée sous la référence ${d.referenceNumber}. Le délai réglementaire de 10 jours ouvrables démarrera dès validation de votre quittance de frais (20 USD + 300 USD).`
  }),
  PAYMENT_VALIDATED: d => ({
    subject: `[FNPSS Guichet Unique] Quittance validée — Démarrage du délai de 10 jours ouvrés (${d.referenceNumber})`,
    body: `Bonjour ${d.organizationName || 'Partenaire'},\nVotre preuve de paiement a été validée par le FNPSS. Votre dossier ${d.referenceNumber} est désormais en cours d'instruction (Échéance SLA : ${d.slaDueAt || '10 jours ouvrables'}).`
  }),
  COMPLEMENT_REQUESTED: d => ({
    subject: `[FNPSS Guichet Unique] Action requise : Complément demandé sur le dossier ${d.referenceNumber}`,
    body: `Bonjour ${d.organizationName || 'Partenaire'},\nUn agent instructeur du FNPSS a sollicité un complément sur le dossier ${d.referenceNumber} : "${d.reason}". Le compteur SLA est temporairement suspendu jusqu'au dépôt de la pièce.`
  }),
  CERTIFICATE_ISSUED: d => ({
    subject: `[FNPSS Guichet Unique] Acte officiel délivré et scellé sur Blockchain (${d.certificateNumber})`,
    body: `Bonjour ${d.organizationName || 'Partenaire'},\nVotre acte officiel ${d.certificateNumber} (Dossier ${d.referenceNumber}) a été signé, scellé par empreinte SHA-256 (${d.docHash}) sur Polygon et muni de son QR Code DGDA. Vous pouvez télécharger le PDF officiel depuis votre espace.`
  }),
  CERTIFICATE_REVOKED: d => ({
    subject: `[FNPSS Guichet Unique] ALERTE : Révocation administrative de l'acte ${d.certificateNumber}`,
    body: `Notification officielle : L'acte ${d.certificateNumber} (Dossier ${d.referenceNumber}) a été révoqué sur le registre Blockchain FNPSS/DGDA. Motif : ${d.reason}.`
  })
});

export class NotificationCenter {
  constructor() {
    this.inAppNotifications = [];
    this.emailOutbox = [];
    this.broadcastHistory = [];
    this.dossierThreads = new Map();
    this.seq = 1;
  }

  /**
   * Génère simultanément une notification in-app (NOT-02) et un email transactionnel en français (NOT-01).
   */
  notifyTransactionalEvent({
    userId,
    email = 'contact@ong-rdc.org',
    eventType,
    referenceNumber,
    details = {},
    smtpAvailable = true
  }) {
    const builder = EMAIL_TEMPLATES_FR[eventType];
    if (!builder) {
      throw new Error(`Type d'événement de notification inconnu : ${eventType}`);
    }
    const rendered = builder({ referenceNumber, ...details });
    const id = `notif-${String(this.seq++).padStart(5, '0')}`;
    const timestamp = new Date().toISOString();

    const inApp = {
      id,
      userId,
      eventType,
      title: rendered.subject,
      message: rendered.body,
      referenceNumber,
      link: `/applications/${encodeURIComponent(referenceNumber)}`,
      read: false,
      createdAt: timestamp
    };
    this.inAppNotifications.unshift(inApp);

    const emailEntry = {
      id: `mail-${id}`,
      to: email,
      userId,
      eventType,
      subject: rendered.subject,
      body: rendered.body,
      referenceNumber,
      status: smtpAvailable ? 'SENT' : 'RETRY_QUEUED',
      attempts: 1,
      updatedAt: timestamp
    };
    this.emailOutbox.unshift(emailEntry);

    return { inApp, emailEntry };
  }

  /**
   * Reprise sur échec de la file d'envoi d'emails transactionnels (NOT-01).
   */
  flushEmailRetryQueue(smtpAvailable = true) {
    if (!smtpAvailable) return 0;
    let sentCount = 0;
    for (const item of this.emailOutbox) {
      if (item.status === 'RETRY_QUEUED') {
        item.status = 'SENT';
        item.attempts += 1;
        item.updatedAt = new Date().toISOString();
        sentCount += 1;
      }
    }
    return sentCount;
  }

  /**
   * Récupère les notifications in-app d'un utilisateur et le compteur de non-lus (NOT-02).
   */
  getUserNotifications(userId) {
    const list = userId
      ? this.inAppNotifications.filter(n => n.userId === userId || n.userId === 'ALL')
      : this.inAppNotifications;
    const unreadCount = list.filter(n => !n.read).length;
    return {
      unreadCount,
      notifications: list.map(n => ({ ...n }))
    };
  }

  /**
   * Marque une notification comme lue ou non-lue (NOT-02).
   */
  markNotificationRead(notificationId, isRead = true) {
    const found = this.inAppNotifications.find(n => n.id === notificationId);
    if (!found) {
      throw new Error(`Notification introuvable : ${notificationId}`);
    }
    found.read = Boolean(isRead);
    return { ...found };
  }

  /**
   * Envoie une communication générale ou ciblée aux requérants (NOT-03).
   */
  sendBroadcastCommunication({ senderId, targetSegment = 'ALL_APPLICANTS', recipientUserId = null, subject, message }) {
    if (!subject || !message) {
      throw new Error('Le sujet et le message de la communication sont obligatoires');
    }
    const id = `comm-${String(this.seq++).padStart(5, '0')}`;
    const createdAt = new Date().toISOString();
    const record = {
      id,
      senderId,
      targetSegment,
      recipientUserId: recipientUserId || 'ALL',
      subject,
      message,
      channels: ['IN_APP', 'EMAIL'],
      createdAt
    };
    this.broadcastHistory.unshift(record);

    this.inAppNotifications.unshift({
      id: `notif-${id}`,
      userId: recipientUserId || 'ALL',
      eventType: 'ADMIN_BROADCAST',
      title: subject,
      message,
      referenceNumber: null,
      link: '/communications',
      read: false,
      createdAt
    });

    return { ...record };
  }

  /**
   * Ajoute un message ou une pièce complémentaire au fil de discussion d'un dossier (NOT-04).
   */
  addDossierMessage({ referenceNumber, authorId, authorRole, message, attachmentDocType = null }) {
    if (!referenceNumber || !message) {
      throw new Error('La référence du dossier et le message sont obligatoires');
    }
    if (!this.dossierThreads.has(referenceNumber)) {
      this.dossierThreads.set(referenceNumber, []);
    }
    const thread = this.dossierThreads.get(referenceNumber);
    const entry = {
      id: `msg-${referenceNumber}-${thread.length + 1}`,
      referenceNumber,
      authorId,
      authorRole,
      message: String(message).trim(),
      attachmentDocType,
      timestamp: new Date().toISOString()
    };
    thread.push(entry);
    return { ...entry };
  }

  getDossierMessages(referenceNumber) {
    return [...(this.dossierThreads.get(referenceNumber) || [])];
  }
}
