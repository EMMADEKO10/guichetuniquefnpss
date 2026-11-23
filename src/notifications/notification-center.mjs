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
  }),
  APPLICATION_REJECTED: d => ({
    subject: `[FNPSS Guichet Unique] Décision défavorable sur le dossier ${d.referenceNumber}`,
    body: `Bonjour ${d.organizationName || 'Partenaire'},\nAprès instruction, la Direction Générale du FNPSS a rendu une décision défavorable sur le dossier ${d.referenceNumber}. Motif : ${d.reason}. Vous pouvez déposer une nouvelle demande après correction.`
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
   * Génère une notification in-app ciblée par rôles (AGENT, CHEF_DIVISION, DG, MINISTERE, ADMIN).
   */
  notifyRoleEvent({
    targetRoles = [],
    eventType = 'WORKFLOW_ROLE_ALERT',
    title,
    message,
    referenceNumber = null,
    link = '/admin',
    severity = 'info'
  }) {
    if (!Array.isArray(targetRoles) || targetRoles.length === 0 || !title || !message) {
      return null;
    }
    const id = `notif-role-${String(this.seq++).padStart(5, '0')}`;
    const timestamp = new Date().toISOString();
    const entry = {
      id,
      userId: null,
      targetRoles: [...targetRoles],
      eventType,
      title,
      message,
      referenceNumber,
      link,
      severity,
      read: false,
      readBy: [],
      createdAt: timestamp
    };
    this.inAppNotifications.unshift(entry);
    return { ...entry };
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

  _isNotificationVisibleFor(n, userId, userRole) {
    if (!userId) return true;
    if (n.userId === userId || n.userId === 'ALL') return true;
    if (userRole && userRole !== 'REQUERANT' && Array.isArray(n.targetRoles) && n.targetRoles.includes(userRole)) {
      return true;
    }
    return false;
  }

  _isNotificationReadFor(n, userId) {
    if (Array.isArray(n.targetRoles) && n.targetRoles.length > 0 && userId) {
      return Boolean(n.read || (Array.isArray(n.readBy) && n.readBy.includes(userId)));
    }
    return Boolean(n.read);
  }

  /**
   * Récupère les notifications in-app d'un utilisateur (et de son rôle staff éventuel) + compteur de non-lus (NOT-02).
   */
  getUserNotifications(userId, userRole = null) {
    const list = userId
      ? this.inAppNotifications.filter(n => this._isNotificationVisibleFor(n, userId, userRole))
      : this.inAppNotifications;
    const mapped = list.map(n => ({
      ...n,
      read: this._isNotificationReadFor(n, userId)
    }));
    const unreadCount = mapped.filter(n => !n.read).length;
    return {
      unreadCount,
      notifications: mapped
    };
  }

  /**
   * Marque une notification comme lue ou non-lue (NOT-02).
   * Refuse de modifier la notification d'un autre utilisateur ou d'un rôle non détenu (anti-IDOR).
   */
  markNotificationRead(notificationId, isRead = true, ownerUserId = null, ownerRole = null) {
    const found = this.inAppNotifications.find(n => n.id === notificationId);
    if (!found) {
      throw new Error(`Notification introuvable : ${notificationId}`);
    }
    const isRoleTargeted = Array.isArray(found.targetRoles) && found.targetRoles.length > 0;
    if (isRoleTargeted) {
      if (ownerRole && !found.targetRoles.includes(ownerRole)) {
        throw new Error(`Notification introuvable : ${notificationId}`);
      }
      if (!ownerRole && ownerUserId) {
        throw new Error(`Notification introuvable : ${notificationId}`);
      }
      if (ownerUserId) {
        if (!Array.isArray(found.readBy)) found.readBy = [];
        if (isRead) {
          if (!found.readBy.includes(ownerUserId)) found.readBy.push(ownerUserId);
        } else {
          found.readBy = found.readBy.filter(id => id !== ownerUserId);
        }
        return { ...found, read: this._isNotificationReadFor(found, ownerUserId) };
      }
      found.read = Boolean(isRead);
      return { ...found };
    }

    if (ownerUserId && found.userId !== ownerUserId && found.userId !== 'ALL') {
      // Même message que « introuvable » : ne révèle pas l'existence de la notification d'autrui.
      throw new Error(`Notification introuvable : ${notificationId}`);
    }
    found.read = Boolean(isRead);
    return { ...found };
  }

  /**
   * Marque toutes les notifications visibles pour cet acteur comme lues.
   */
  markAllNotificationsRead(userId, userRole = null) {
    let updated = 0;
    for (const n of this.inAppNotifications) {
      if (!this._isNotificationVisibleFor(n, userId, userRole)) continue;
      if (this._isNotificationReadFor(n, userId)) continue;
      if (Array.isArray(n.targetRoles) && n.targetRoles.length > 0 && userId) {
        if (!Array.isArray(n.readBy)) n.readBy = [];
        if (!n.readBy.includes(userId)) n.readBy.push(userId);
      } else {
        n.read = true;
      }
      updated += 1;
    }
    return updated;
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

