/**
 * @fileoverview Revue du jalon G1 (Cadrage) du 20/11/2026 (GOV-09) :
 * - Registre des décisions D1 à D4 (GOV-05, GOV-11) : le code n'en tranche aucune, seul le COPIL le fait.
 * - Audit statique d'accessibilité du prototype (UX-04, UX-05) : lang, viewport, alt, contrastes WCAG AA.
 * - Contrôle des preuves documentaires (cahier des charges, architecture, maquettes, registre des risques).
 *
 * Le verdict final « G1_PASSED » n'est possible qu'avec un compte rendu COPIL signé (acte humain).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.join(__dirname, '..', '..');

export const DecisionStatus = Object.freeze({
  PROPOSED: 'PROPOSED',
  DECIDED: 'DECIDED'
});

/**
 * Registre initial : toutes les décisions sont PROPOSÉES au COPIL, aucune n'est présumée tranchée.
 */
export function createDecisionRegister() {
  return [
    {
      id: 'D1',
      issue: 'GOV-05',
      title: 'Traitement manuel conservé ou workflow numérique complet',
      proposal: 'Palier 1 numérique (suivi des statuts, scellement) au lancement ; circuit multi-niveaux ADM-08 en palier 2',
      evidence: 'documentation du projet/ADR_DECISIONS_CADRAGE.md (ADR-001)',
      status: DecisionStatus.PROPOSED,
      decidedBy: null,
      decidedAtIso: null
    },
    {
      id: 'D2',
      issue: 'GOV-11',
      title: 'Canal de paiement des frais (20 USD dépôt, 300 USD enquête)',
      proposal: 'Dépôt de la preuve de paiement P6 avec réconciliation comptable par le FNPSS ; paiement en ligne différé',
      evidence: 'documentation du projet/ADR_DECISIONS_CADRAGE.md (ADR-002) ; src/finance/payment-reconciliation.mjs',
      status: DecisionStatus.PROPOSED,
      decidedBy: null,
      decidedAtIso: null
    },
    {
      id: 'D3',
      issue: 'GOV-01',
      title: 'Budget retenu (V3 à 11 000 USD ou V2 à 46 500 USD) et périmètre couvert',
      proposal: 'À arbitrer par le Sponsor : aucune proposition technique, décision budgétaire',
      evidence: 'documentation du projet/PLANIFICATION_GLOBALE.md (section 7)',
      status: DecisionStatus.PROPOSED,
      decidedBy: null,
      decidedAtIso: null
    },
    {
      id: 'D4',
      issue: 'UX-04',
      title: 'Réutiliser le prototype existant ou reconstruire en Next.js',
      proposal: 'Réutiliser le prototype HTML comme référence UX validée ; reconstruction Next.js en phase 2',
      evidence: 'prototype/index.html',
      status: DecisionStatus.PROPOSED,
      decidedBy: null,
      decidedAtIso: null
    }
  ];
}

/**
 * Enregistre une décision prise par le COPIL. Exige l'identité du décideur : pas de décision anonyme.
 */
export function recordCopilDecision(register, decisionId, { decidedBy, decidedAtIso = new Date().toISOString(), outcome } = {}) {
  const decision = register.find(d => d.id === decisionId);
  if (!decision) {
    throw new Error(`GOV-09: Décision inconnue : ${decisionId}`);
  }
  if (!decidedBy || !String(decidedBy).trim()) {
    throw new Error('GOV-09: Une décision COPIL doit nommer son décideur (decidedBy)');
  }
  if (!outcome || !String(outcome).trim()) {
    throw new Error('GOV-09: Le contenu de la décision (outcome) est obligatoire');
  }
  decision.status = DecisionStatus.DECIDED;
  decision.decidedBy = String(decidedBy).trim();
  decision.decidedAtIso = decidedAtIso;
  decision.outcome = String(outcome).trim();
  return { ...decision };
}

function relativeLuminance(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const channels = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Ratio de contraste WCAG 2.x entre deux couleurs hexadécimales.
 */
export function computeContrastRatio(foregroundHex, backgroundHex) {
  const l1 = relativeLuminance(foregroundHex);
  const l2 = relativeLuminance(backgroundHex);
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

const CONTRAST_PAIRS = Object.freeze([
  { fg: '--text-main', bg: '--bg-page', usage: 'Texte courant sur fond de page' },
  { fg: '--text-main', bg: '--bg-card', usage: 'Texte courant sur carte' },
  { fg: '--text-muted', bg: '--bg-card', usage: 'Texte secondaire sur carte' },
  { fg: '--text-muted', bg: '--bg-page', usage: 'Texte secondaire sur fond de page' },
  { fg: '#ffffff', bg: '--fnpss-navy', usage: 'Texte blanc sur bleu marine' },
  { fg: '#ffffff', bg: '--fnpss-blue', usage: 'Texte blanc sur bleu FNPSS' },
  { fg: '#ffffff', bg: '--fnpss-accent', usage: 'Bouton principal' },
  { fg: '#ffffff', bg: '--fnpss-green', usage: 'Bouton succès (.btn-success)' },
  { fg: '#ffffff', bg: '--purple-web3', usage: 'Bouton Web3 (.btn-purple)' },
  { fg: '#ffffff', bg: '--fnpss-red', usage: 'Bouton danger (.btn-danger)' }
]);

/**
 * Audit statique d'accessibilité du prototype HTML (UX-05, WCAG 2.1 AA, seuil 4,5:1 pour le texte).
 * Contrôle automatisable uniquement : il ne remplace ni un test au lecteur d'écran ni une revue manuelle.
 */
export function auditPrototypeAccessibility(html) {
  const source = String(html || '');
  const cssVars = {};
  for (const m of source.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
    cssVars[m[1]] = m[2];
  }
  const resolve = token => (token.startsWith('--') ? cssVars[token] : token);

  const findings = [];
  const addCheck = (id, label, ok, detail = '') => findings.push({ id, label, ok, detail });

  addCheck('A11Y_LANG', 'Langue du document déclarée (lang="fr")', /<html[^>]*\blang="fr"/i.test(source));
  addCheck('A11Y_VIEWPORT', 'Balise viewport mobile-first', /<meta[^>]+name="viewport"/i.test(source));
  addCheck('A11Y_TITLE', 'Titre de page renseigné', /<title>[^<]+<\/title>/i.test(source));

  const imgTags = source.match(/<img\b[^>]*>/gi) || [];
  const imgsWithoutAlt = imgTags.filter(tag => !/\balt=/i.test(tag));
  addCheck('A11Y_IMG_ALT', 'Toutes les images ont un attribut alt', imgsWithoutAlt.length === 0, `${imgTags.length} image(s), ${imgsWithoutAlt.length} sans alt`);

  const mediaQueries = (source.match(/@media\s*\(/g) || []).length;
  addCheck('A11Y_RESPONSIVE', 'Adaptation aux petits écrans (media queries)', mediaQueries > 0, `${mediaQueries} media query(ies)`);

  const contrastResults = CONTRAST_PAIRS.map(pair => {
    const fgHex = resolve(pair.fg);
    const bgHex = resolve(pair.bg);
    if (!fgHex || !bgHex) {
      return { ...pair, ratio: null, passesAA: false, detail: 'Variable CSS introuvable' };
    }
    const ratio = computeContrastRatio(fgHex, bgHex);
    return { ...pair, fgHex, bgHex, ratio, passesAA: ratio >= 4.5 };
  });

  const failingContrasts = contrastResults.filter(c => !c.passesAA);
  addCheck(
    'A11Y_CONTRAST_AA',
    'Contrastes texte/fond ≥ 4,5:1 (WCAG AA)',
    failingContrasts.length === 0,
    failingContrasts.length ? failingContrasts.map(c => `${c.usage} = ${c.ratio}`).join(' ; ') : `${contrastResults.length} couples conformes`
  );

  return {
    standard: 'WCAG 2.1 AA (contrôles automatisables uniquement)',
    passed: findings.every(f => f.ok),
    findings,
    contrastResults
  };
}

const REQUIRED_G1_EVIDENCE = Object.freeze([
  { id: 'SPECS', label: 'Cahier des charges fonctionnel', file: 'documentation du projet/SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md', issue: 'GOV-07' },
  { id: 'ARCHI', label: 'Architecture technique et modèle de données', file: 'documentation du projet/ARCHITECTURE_TECHNIQUE_ET_MODELE_DONNEES.md', issue: 'GOV-08' },
  { id: 'WIREFRAMES', label: 'Wireframes et stratégie qualité', file: 'documentation du projet/WIREFRAMES_UI_ET_STRATEGIE_QUALITE.md', issue: 'UX-02/03' },
  { id: 'PROTOTYPE', label: 'Prototype interactif haute fidélité', file: 'prototype/index.html', issue: 'UX-04' },
  { id: 'RISKS', label: 'Registre des risques', file: 'documentation du projet/REGISTRE_DES_RISQUES_ET_COMPTES_RENDUS_ATELIERS.md', issue: 'GOV-06' },
  { id: 'ADR', label: 'Registre des décisions (ADR)', file: 'documentation du projet/ADR_DECISIONS_CADRAGE.md', issue: 'GOV-05' }
]);

/**
 * Évalue le jalon G1 à partir de preuves vérifiables (fichiers présents, audit du prototype, décisions enregistrées).
 *
 * Verdicts possibles :
 * - `BLOCKED_MISSING_EVIDENCE` : une preuve documentaire manque ou l'audit d'accessibilité échoue ;
 * - `PENDING_COPIL_DECISIONS` : preuves complètes, mais D1 à D4 ne sont pas toutes tranchées ;
 * - `READY_FOR_COPIL_SIGNATURE` : tout est prêt, il manque le compte rendu COPIL signé ;
 * - `G1_PASSED` : uniquement si `copilMinutesSigned` est vrai, ce qui est un acte humain.
 */
export function evaluateG1Gate({
  rootDir = defaultRootDir,
  decisions = createDecisionRegister(),
  copilMinutesSigned = false
} = {}) {
  const evidence = REQUIRED_G1_EVIDENCE.map(item => ({
    ...item,
    present: fs.existsSync(path.join(rootDir, item.file))
  }));

  const prototypePath = path.join(rootDir, 'prototype', 'index.html');
  const accessibility = fs.existsSync(prototypePath)
    ? auditPrototypeAccessibility(fs.readFileSync(prototypePath, 'utf8'))
    : { standard: 'WCAG 2.1 AA', passed: false, findings: [], contrastResults: [] };

  const missingEvidence = evidence.filter(e => !e.present);
  const openDecisions = decisions.filter(d => d.status !== DecisionStatus.DECIDED);

  let verdict;
  if (missingEvidence.length > 0 || !accessibility.passed) {
    verdict = 'BLOCKED_MISSING_EVIDENCE';
  } else if (openDecisions.length > 0) {
    verdict = 'PENDING_COPIL_DECISIONS';
  } else if (!copilMinutesSigned) {
    verdict = 'READY_FOR_COPIL_SIGNATURE';
  } else {
    verdict = 'G1_PASSED';
  }

  return {
    gate: 'G1',
    dueDate: '2026-11-20',
    verdict,
    evidence,
    accessibility,
    decisions: decisions.map(d => ({ ...d })),
    blocking: {
      missingEvidence: missingEvidence.map(e => e.id),
      failedAccessibilityChecks: accessibility.findings.filter(f => !f.ok).map(f => f.id),
      openDecisions: openDecisions.map(d => d.id),
      copilMinutesSigned: Boolean(copilMinutesSigned)
    }
  };
}
