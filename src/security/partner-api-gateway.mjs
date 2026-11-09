/**
 * @fileoverview Passerelle de sécurité d'interopérabilité DGDA / DGRAD / DGI (VER-05),
 * durcissement HTTP OWASP Top 10 (SEC-04), supervision opérationnelle (OPS-06)
 * et contrôle du budget de performance 3G (REQ-12).
 */

export const OWASP_SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
});

export class PartnerApiGateway {
  constructor() {
    this.partners = new Map([
      ['dgda-live-key-2026', {
        partnerId: 'DGDA_SYDONIA_WORLD',
        institution: 'Direction Générale des Douanes et Accises (DGDA)',
        quotaPerMinute: 600,
        active: true
      }],
      ['dgrad-live-key-2026', {
        partnerId: 'DGRAD_PORTAIL',
        institution: 'Direction Générale des Recettes Administratives (DGRAD)',
        quotaPerMinute: 300,
        active: true
      }],
      ['dgi-live-key-2026', {
        partnerId: 'DGI_FISCALITE',
        institution: 'Direction Générale des Impôts (DGI)',
        quotaPerMinute: 300,
        active: true
      }]
    ]);

    this.publicAnonymousQuotaPerMinute = 60;
    this.windowCounters = new Map();
    this.partnerAccessLogs = [];
    this.alerts = [];
  }

  /**
   * Enregistre ou met à jour une clé d'API partenaire (VER-05).
   */
  registerPartnerKey(apiKey, { partnerId, institution, quotaPerMinute = 300, active = true }) {
    this.partners.set(apiKey, { partnerId, institution, quotaPerMinute, active });
  }

  /**
   * Vérifie la clé d'API (`X-API-Key`), applique le quota par minute (Rate Limiting)
   * et journalise l'accès d'interopérabilité (VER-05).
   */
  authenticateAndRateLimitPartner({
    apiKey = null,
    endpoint = '/api/verify',
    queryTarget = '',
    nowMs = Date.now()
  } = {}) {
    let partnerProfile = {
      partnerId: 'PUBLIC_QR_SCANNER',
      institution: 'Scan QR Public / Poste Frontalier Mobile',
      quotaPerMinute: this.publicAnonymousQuotaPerMinute
    };

    if (apiKey) {
      const found = this.partners.get(apiKey);
      if (!found || !found.active) {
        this._recordAlert('UNAUTHORIZED_PARTNER_API_KEY', `Tentative d'accès avec clé API invalide sur ${endpoint}`, nowMs);
        throw new Error('VER-05: Clé d\'API partenaire invalide ou révoquée');
      }
      partnerProfile = found;
    }

    const minuteBucket = Math.floor(nowMs / 60000);
    const bucketKey = `${partnerProfile.partnerId}:${minuteBucket}`;
    const usedCount = (this.windowCounters.get(bucketKey) || 0) + 1;
    this.windowCounters.set(bucketKey, usedCount);

    if (usedCount > partnerProfile.quotaPerMinute) {
      this._recordAlert(
        'RATE_LIMIT_EXCEEDED',
        `Quota dépassé pour ${partnerProfile.partnerId} (${usedCount}/${partnerProfile.quotaPerMinute} req/min)`,
        nowMs
      );
      throw new Error(`VER-05: Quota de requêtes dépassé (Rate Limit 429) pour ${partnerProfile.partnerId}`);
    }

    const remaining = Math.max(0, partnerProfile.quotaPerMinute - usedCount);
    const accessEntry = Object.freeze({
      id: this.partnerAccessLogs.length + 1,
      partnerId: partnerProfile.partnerId,
      institution: partnerProfile.institution,
      endpoint,
      queryTarget,
      rateLimitLimit: partnerProfile.quotaPerMinute,
      rateLimitRemaining: remaining,
      timestamp: new Date(nowMs).toISOString()
    });
    this.partnerAccessLogs.push(accessEntry);

    return {
      partnerId: partnerProfile.partnerId,
      institution: partnerProfile.institution,
      headers: {
        'X-RateLimit-Limit': String(partnerProfile.quotaPerMinute),
        'X-RateLimit-Remaining': String(remaining)
      },
      accessEntry
    };
  }

  _recordAlert(code, message, nowMs = Date.now()) {
    this.alerts.push({
      id: this.alerts.length + 1,
      code,
      severity: 'HIGH',
      message,
      timestamp: new Date(nowMs).toISOString()
    });
  }

  /**
   * Évalue le budget de performance pour réseau 3G en province (REQ-12)
   * et compile l'état de supervision (OPS-06).
   */
  getSupervisionSnapshot({
    totalApplications = 0,
    auditLogsCount = 0,
    prototypeHtmlBytes = 65000,
    maxPageBudgetBytes = 150 * 1024 // Budget strict 150 Ko (REQ-12)
  } = {}) {
    // Sur une connexion 3G rurale en RDC (~400 kbps effectifs = 50 Ko/s + 300ms RTT)
    const estimated3gLoadSeconds = Number((0.3 + prototypeHtmlBytes / (50 * 1024)).toFixed(2));
    const withinBudget = prototypeHtmlBytes <= maxPageBudgetBytes && estimated3gLoadSeconds < 3.0;

    return {
      status: this.alerts.length === 0 ? 'HEALTHY' : 'DEGRADED_ALERTS',
      ops06Supervision: {
        uptimeStatus: 'ONLINE_99_95_PCT',
        totalApplications,
        auditLogsCount,
        partnerApiCallsTotal: this.partnerAccessLogs.length,
        activeAlertsCount: this.alerts.length,
        recentAlerts: this.alerts.slice(-10)
      },
      req12PerformanceBudget: {
        prototypeHtmlBytes,
        maxPageBudgetBytes,
        estimated3gLoadSeconds,
        targetMax3gSeconds: 3.0,
        withinBudget
      },
      recentPartnerAccessLogs: this.partnerAccessLogs.slice(-15).reverse()
    };
  }
}

export const partnerApiGateway = new PartnerApiGateway();


