/**
 * @fileoverview Référentiel métier des 6 services du FNPSS (S1 à S6),
 * règles de calcul des frais (20 USD dépôt + 300 USD enquête) et du délai SLA de 10 jours ouvrables.
 * Références Backlog : REQ-05, REQ-06, REQ-10, GOV-04, GOV-11.
 */

export const REQUIRED_DOCUMENTS_METADATA = Object.freeze({
  P1_REQUETE: {
    code: 'P1_REQUETE',
    name: 'Lettre de requête officielle au Ministre',
    description: 'Requête motivée adressée à Son Excellence Madame/Monsieur le Ministre des Affaires Sociales, Actions Humanitaires & Solidarité Nationale.',
    acceptedFormats: ['application/pdf'],
    isOnceOnlyEligible: false,
    maxSizeBytes: 10 * 1024 * 1024
  },
  P2_ENROLEMENT: {
    code: 'P2_ENROLEMENT',
    name: "Attestation d'enrôlement FNPSS (Service S1)",
    description: "Attestation officielle délivrée par le FNPSS en cours de validité. Éligible au principe « Once-Only ».",
    acceptedFormats: ['application/pdf'],
    isOnceOnlyEligible: true,
    maxSizeBytes: 10 * 1024 * 1024
  },
  P3_PLAN_ACTION: {
    code: 'P3_PLAN_ACTION',
    name: "Plan d'action annuel ou triennal",
    description: "Document opérationnel précisant les objectifs, zones géographiques d'intervention et budget d'exécution.",
    acceptedFormats: ['application/pdf'],
    isOnceOnlyEligible: false,
    maxSizeBytes: 10 * 1024 * 1024
  },
  P4_RAPPORT: {
    code: 'P4_RAPPORT',
    name: "Rapport annuel d'activités certifié",
    description: "Bilan des réalisations techniques et financières de l'exercice précédent signé par les instances dirigeantes.",
    acceptedFormats: ['application/pdf'],
    isOnceOnlyEligible: false,
    maxSizeBytes: 10 * 1024 * 1024
  },
  P5_PROJET: {
    code: 'P5_PROJET',
    name: "Descriptif du projet & Liste des biens / Facture proforma",
    description: "Détail des matériels, intrants humanitaires, véhicules ou équipements avec devis estimatif ou proforma.",
    acceptedFormats: ['application/pdf'],
    isOnceOnlyEligible: false,
    maxSizeBytes: 10 * 1024 * 1024
  },
  P6_QUITTANCE: {
    code: 'P6_QUITTANCE',
    name: 'Bordereau ou quittance bancaire des frais',
    description: 'Preuve de versement des 320 USD (20 USD frais de dépôt + 300 USD frais d\'enquête) sur les comptes agréés FNPSS.',
    acceptedFormats: ['application/pdf'],
    isOnceOnlyEligible: false,
    maxSizeBytes: 10 * 1024 * 1024
  }
});

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

/**
 * Génère la configuration dynamique d'un formulaire de soumission par service (REQ-06).
 */
export function getServiceSubmissionConfig(serviceCode, {
  hasActiveS1Enrollment = false,
  exchangeRateCdfPerUsd = 2850
} = {}) {
  const service = FNPSS_SERVICES[serviceCode];
  if (!service) {
    throw new Error(`Service FNPSS inconnu : ${serviceCode}`);
  }

  const fees = calculateServiceFees(serviceCode, exchangeRateCdfPerUsd);
  const checklist = service.requiredDocs.map(docCode => {
    const meta = REQUIRED_DOCUMENTS_METADATA[docCode];
    const isExemptedByOnceOnly = docCode === 'P2_ENROLEMENT' && hasActiveS1Enrollment;
    return {
      docCode,
      name: meta ? meta.name : docCode,
      description: meta ? meta.description : '',
      isMandatory: !isExemptedByOnceOnly,
      isExemptedByOnceOnly,
      onceOnlyNotice: isExemptedByOnceOnly ? 'Pièce attachée automatiquement depuis votre dossier S1 actif (Once-Only)' : null,
      acceptedFormats: meta ? meta.acceptedFormats : ['application/pdf']
    };
  });

  return {
    serviceCode: service.code,
    prefix: service.prefix,
    title: service.title,
    requiresMinistrySignoff: service.requiresMinistrySignoff,
    slaBusinessDays: service.slaBusinessDays,
    slaNotice: `Délai réglementaire de traitement : ${service.slaBusinessDays} jours ouvrables après validation de la quittance.`,
    fees,
    documentsChecklist: checklist,
    mandatoryDocsCount: checklist.filter(d => d.isMandatory).length,
    exemptedDocsCount: checklist.filter(d => d.isExemptedByOnceOnly).length
  };
}
