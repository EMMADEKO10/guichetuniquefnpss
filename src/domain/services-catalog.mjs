/**
 * @fileoverview Référentiel métier des 6 services du FNPSS (S1 à S6),
 * règles de calcul des frais (20 USD dépôt + 300 USD enquête) et du délai SLA de 10 jours ouvrables.
 * Références Backlog : REQ-05, REQ-06, REQ-10, GOV-04, GOV-11.
 */

export const FNPSS_SERVICES = Object.freeze({
  S1: {
    code: 'S1',
    prefix: 'ENR',
    title: "Attestation d'enrôlement au FNPSS",
    depositFeeUsd: 20,
    inquiryFeeUsd: 300,
    slaBusinessDays: 10,
    requiresMinistrySignoff: false,
    requiredDocs: ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE']
  },
  S2: {
    code: 'S2',
    prefix: 'CNV',
    title: 'Convention de partenariat avec le Gouvernement de la RDC',
    depositFeeUsd: 20,
    inquiryFeeUsd: 300,
    slaBusinessDays: 10,
    requiresMinistrySignoff: true,
    requiredDocs: ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE']
  },
  S3: {
    code: 'S3',
    prefix: 'BIE',
    title: 'Attestation des biens à exonérer',
    depositFeeUsd: 20,
    inquiryFeeUsd: 300,
    slaBusinessDays: 10,
    requiresMinistrySignoff: false,
    requiredDocs: ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE']
  },
  S4: {
    code: 'S4',
    prefix: 'CEX',
    title: "Certificat d'exonérations",
    depositFeeUsd: 20,
    inquiryFeeUsd: 300,
    slaBusinessDays: 10,
    requiresMinistrySignoff: false,
    requiredDocs: ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE']
  },
  S5: {
    code: 'S5',
    prefix: 'PHI',
    title: 'Certificat de philanthropie',
    depositFeeUsd: 20,
    inquiryFeeUsd: 300,
    slaBusinessDays: 10,
    requiresMinistrySignoff: false,
    requiredDocs: ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE']
  },
  S6: {
    code: 'S6',
    prefix: 'EXO',
    title: "Arrêté ministériel portant avis favorable pour l'exonération",
    depositFeeUsd: 20,
    inquiryFeeUsd: 300,
    slaBusinessDays: 10,
    requiresMinistrySignoff: true,
    requiredDocs: ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE']
  }
});

/**
 * Calcule le montant total des frais réglementaires (20 USD dépôt + 300 USD enquête = 320 USD)
 * et sa contre-valeur en Francs Congolais (CDF).
 */
export function calculateServiceFees(serviceCode, exchangeRateCdfPerUsd = 2850) {
  const service = FNPSS_SERVICES[serviceCode];
  if (!service) {
    throw new Error(`Service FNPSS inconnu : ${serviceCode}`);
  }
  if (exchangeRateCdfPerUsd <= 0) {
    throw new Error('Le taux de change CDF/USD doit être strictement positif');
  }
  const totalUsd = service.depositFeeUsd + service.inquiryFeeUsd;
  const totalCdf = Math.round(totalUsd * exchangeRateCdfPerUsd);
  return {
    serviceCode,
    depositFeeUsd: service.depositFeeUsd,
    inquiryFeeUsd: service.inquiryFeeUsd,
    totalUsd,
    exchangeRateCdfPerUsd,
    totalCdf
  };
}

/**
 * Vérifie que toutes les pièces justificatives exigées pour un service sont présentes.
 * Applique le principe "Once-Only" (F02) : si l'ONG possède déjà une attestation S1 active,
 * la pièce P2_ENROLEMENT est automatiquement satisfaite.
 */
export function validateRequiredDocuments(serviceCode, uploadedDocTypes = [], hasActiveS1Enrollment = false) {
  const service = FNPSS_SERVICES[serviceCode];
  if (!service) {
    throw new Error(`Service FNPSS inconnu : ${serviceCode}`);
  }
  const providedSet = new Set(uploadedDocTypes);
  if (hasActiveS1Enrollment) {
    providedSet.add('P2_ENROLEMENT');
  }
  const missingDocs = service.requiredDocs.filter(doc => !providedSet.has(doc));
  return {
    isValid: missingDocs.length === 0,
    requiredDocs: service.requiredDocs,
    missingDocs
  };
}

/**
 * Calcule la date d'échéance réglementaire de 10 jours ouvrables à compter de la validation du paiement,
 * en excluant les samedis, dimanches et les jours fériés passés en paramètre (format YYYY-MM-DD).
 */
export function computeSlaDueDate(paymentValidatedDate, businessDays = 10, holidaysIsoList = []) {
  const holidays = new Set(holidaysIsoList);
  const current = new Date(paymentValidatedDate.getTime());
  let remaining = businessDays;

  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay(); // 0 = Dimanche, 6 = Samedi
    const isoDay = current.toISOString().slice(0, 10);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidays.has(isoDay);
    if (!isWeekend && !isHoliday) {
      remaining -= 1;
    }
  }
  return current;
}

