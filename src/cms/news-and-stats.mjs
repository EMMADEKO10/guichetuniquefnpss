/**
 * @fileoverview Gestionnaire de Contenu (CMS) des Actualités FNPSS (REQ-13, ADM-10)
 * et Moteur de Statistiques Exécutives de Pilotage pour la Direction Générale (ADM-09).
 */

import { FNPSS_SERVICES, calculateServiceFees } from '../domain/services-catalog.mjs';
import { assertPermission } from '../workflow/application-engine.mjs';

export class NewsAndStatsService {
  constructor() {
    this.articles = new Map();
    this.seq = 1;
    this._seedDefaultNews();
  }

  _seedDefaultNews() {
    const initialArticles = [
      {
        title: 'Lancement officiel du Guichet Unique Dématérialisé du FNPSS avec ancrage Blockchain Polygon',
        category: 'COMMUNIQUE_OFFICIEL',
        summary: 'Tous les certificats et arrêtés ministériels d\'exonération (S1 à S6) comportent désormais un QR Code infalsifiable vérifiable en temps réel par la DGDA.',
        content: 'La Direction Générale du FNPSS informe les ONG nationales et internationales que la délivrance des actes administratifs S1 à S6 est désormais sécurisée par empreinte SHA-256 ancrée sur la Blockchain.',
        author: 'Direction Générale du FNPSS',
        published: true,
        publishedAt: '2026-11-02T08:30:00.000Z'
      },
      {
        title: 'Rappel réglementaire : Dépôt des rapports annuels d\'activités 2025 (Pièce P4)',
        category: 'INSTRUCTION_ADMINISTRATIVE',
        summary: 'Les organisations humanitaires et sociales disposent jusqu\'au 30 novembre 2026 pour téléverser leur rapport annuel d\'activités certifié.',
        content: 'Conformément au Décret régissant le FNPSS, toute demande d\'exonération S3, S4 ou S6 requiert la présentation du rapport d\'activités validé et du plan d\'action en cours.',
        author: 'Direction des Études et Partenariats',
        published: true,
        publishedAt: '2026-11-03T10:15:00.000Z'
      },
      {
        title: 'Protocole d\'interopérabilité FNPSS – DGDA – DGRAD aux postes frontaliers (Matadi, Kasumbalesa, Goma, N\'djili)',
        category: 'INTEROPERABILITE_DOUANE',
        summary: 'Les inspecteurs douaniers vérifient désormais l\'authenticité des arrêtés ministériels en moins de 2 secondes par scan QR ou téléversement PDF.',
        content: 'L\'API publique de vérification cryptographique élimine définitivement les délais de vérification papier par courrier physique entre Kinshasa et les postes frontaliers.',
        author: 'Cellule Numérique & Ministère des Affaires Sociales',
        published: true,
        publishedAt: '2026-11-04T09:00:00.000Z'
      }
    ];

    for (const item of initialArticles) {
      const id = `NEWS-2026-${String(this.seq++).padStart(3, '0')}`;
      this.articles.set(id, { id, ...item });
    }
  }

  /**
   * Liste les actualités publiées visibles par les ONG et le public (REQ-13).
   */
  listPublishedNews({ category = null } = {}) {
    return Array.from(this.articles.values())
      .filter(a => a.published && (!category || a.category === category))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(a => ({ ...a }));
  }

  /**
   * Liste toutes les actualités (y compris les brouillons non publiés) pour l'administrateur (ADM-10).
   */
  listAllNews(actor) {
    assertPermission(actor, 'MANAGE_USERS');
    return Array.from(this.articles.values())
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(a => ({ ...a }));
  }

  /**
   * Crée une nouvelle actualité institutionnelle (ADM-10).
   */
  createNewsArticle(actor, {
    title,
    summary,
    content = '',
    category = 'COMMUNIQUE_OFFICIEL',
    published = true,
    publishedAt = new Date().toISOString()
  }) {
    assertPermission(actor, 'MANAGE_USERS');
    if (!title || !title.trim() || !summary || !summary.trim()) {
      throw new Error('ADM-10: Le titre et le résumé de l\'actualité sont obligatoires');
    }

    const id = `NEWS-2026-${String(this.seq++).padStart(3, '0')}`;
    const article = {
      id,
      title: title.trim(),
      summary: summary.trim(),
      content: (content || summary).trim(),
      category,
      author: `Admin FNPSS (${actor.id})`,
      published: Boolean(published),
      publishedAt
    };

    this.articles.set(id, article);
    return { ...article };
  }

  /**
   * Publie ou dépublie une actualité existante (ADM-10).
   */
  setNewsPublishedState(actor, articleId, published) {
    assertPermission(actor, 'MANAGE_USERS');
    const article = this.articles.get(articleId);
    if (!article) {
      throw new Error(`Actualité introuvable : ${articleId}`);
    }
    article.published = Boolean(published);
    return { ...article };
  }

  /**
   * Calcule les indicateurs statistiques de pilotage pour la Direction Générale et le Ministère (ADM-09).
   */
  computeExecutiveStats(applications = [], applicants = [], exchangeRateCdfPerUsd = 2800) {
    const byService = Object.fromEntries(
      Object.keys(FNPSS_SERVICES).map(code => [code, {
        code,
        title: FNPSS_SERVICES[code].title,
        total: 0,
        validated: 0,
        revoked: 0
      }])
    );

    const byStatus = {
      SOUMIS: 0,
      EN_COURS_INSTRUCTION: 0,
      COMPLEMENT_REQUIS: 0,
      VALIDE_DELIVRE: 0,
      REVOQUE: 0
    };

    const byProvince = {};
    let validatedPaymentsCount = 0;
    let totalExpectedFeesUsd = 0;
    let totalCollectedFeesUsd = 0;
    let totalCollectedFeesCdf = 0;
    let activeCertificatesCount = 0;
    let ministryCoSignedCount = 0;
    let slaPausedCount = 0;

    for (const applicant of applicants) {
      const prov = applicant.province || 'Kinshasa';
      if (!byProvince[prov]) {
        byProvince[prov] = { organizations: 0, applications: 0 };
      }
      byProvince[prov].organizations += 1;
    }

    const orgToProvince = new Map(
      applicants.map(a => [a.organizationName, a.province || 'Kinshasa'])
    );

    for (const app of applications) {
      const svcCode = app.serviceCode || 'S6';
      const fees = calculateServiceFees(svcCode, exchangeRateCdfPerUsd);
      totalExpectedFeesUsd += fees.totalUsd;

      if (byService[svcCode]) {
        byService[svcCode].total += 1;
        if (app.status === 'VALIDE_DELIVRE') byService[svcCode].validated += 1;
        if (app.status === 'REVOQUE') byService[svcCode].revoked += 1;
      }

      if (byStatus[app.status] !== undefined) {
        byStatus[app.status] += 1;
      } else {
        byStatus[app.status] = 1;
      }

      if (app.paymentValidated) {
        validatedPaymentsCount += 1;
        totalCollectedFeesUsd += fees.totalUsd;
        totalCollectedFeesCdf += fees.totalCdf;
      }

      if (app.status === 'VALIDE_DELIVRE' && app.certificate?.status === 'ACTIVE') {
        activeCertificatesCount += 1;
      }

      if (app.ministryCoSigned) {
        ministryCoSignedCount += 1;
      }

      if (app.slaPaused) {
        slaPausedCount += 1;
      }

      const province = app.province || orgToProvince.get(app.organizationName) || 'Kinshasa (Siège)';
      if (!byProvince[province]) {
        byProvince[province] = { organizations: 1, applications: 0 };
      }
      byProvince[province].applications += 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        totalApplications: applications.length,
        registeredOrganizations: applicants.length,
        activeCertificatesCount,
        ministryCoSignedCount,
        slaTargetBusinessDays: 10,
        slaPausedCount
      },
      financials: {
        unitFeeBreakdownUsd: { depositFeeUsd: 20, inquiryFeeUsd: 300, totalPerDossierUsd: 320 },
        validatedPaymentsCount,
        totalExpectedFeesUsd,
        totalCollectedFeesUsd,
        totalCollectedFeesCdf,
        exchangeRateCdfPerUsd
      },
      byService,
      byStatus,
      byProvince
    };
  }
}

