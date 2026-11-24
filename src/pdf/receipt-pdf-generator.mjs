/**
 * @fileoverview Générateur souverain d'Accusé de Réception PDF 1.4 (`REQ-06`, `CU02`)
 * téléchargeable immédiatement après soumission d'un dossier sur le Guichet Unique FNPSS.
 */

import {
  wrapPdfText,
  pushPdfText,
  drawSovereignHeaderAndFrame,
  drawOfficialTableRow,
  drawVectorQrCode,
  drawSovereignFooter,
  compileMultiFontPdfBuffer
} from './pdf-primitives.mjs';

export function generateReceiptPdfBuffer(application, { baseUrl = 'https://guichetuniquefnpss.vercel.app' } = {}) {
  const cleanBase = String(baseUrl).replace(/\/+$/, '');
  const ref = application?.referenceNumber || 'FNPSS/DEM/2026/00000';
  const dashboardUrl = `${cleanBase}/dashboard`;

  const ops = [];
  drawSovereignHeaderAndFrame(ops, {
    subtitle: 'Accuse de Reception Numerique — Preuve Horodatee de Depot'
  });

  // Cartouche Titre
  ops.push('0.933 0.965 0.988 rg 32 664 531 50 re f');
  ops.push('0.749 0.859 0.996 RG 0.8 w 32 664 531 50 re S');
  ops.push('0.875 0.325 0.067 rg 32 664 4 50 re f');

  pushPdfText(ops, {
    font: '/F2',
    size: 12,
    x: 44,
    y: 695,
    text: 'ACCUSE DE RECEPTION DE DOSSIER ELECTRONIQUE',
    rgb: '0.039 0.145 0.251'
  });
  pushPdfText(ops, {
    font: '/F3',
    size: 9.5,
    x: 44,
    y: 675,
    text: `Reference Dossier : ${ref}`,
    rgb: '0.024 0.353 0.510'
  });

  // Badge Statut
  ops.push('0.996 0.969 0.878 rg 435 671 118 17 re f');
  ops.push('0.875 0.325 0.067 RG 0.8 w 435 671 118 17 re S');
  pushPdfText(ops, {
    font: '/F2',
    size: 7.5,
    x: 452,
    y: 676,
    text: String(application?.status || 'SOUMIS').slice(0, 18),
    rgb: '0.722 0.239 0.031'
  });

  // Tableau synthetique du dossier
  const rows = [
    { label: 'Organisation Requerante', value: application?.organizationName || 'Organisation' },
    { label: 'Service FNPSS', value: `${application?.serviceCode || 'S4'} (Frais: 20 USD depot + 300 USD enquete)` },
    { label: 'Intitule du Projet', value: application?.projectTitle || 'Non renseigne' },
    { label: 'Quittance Bancaire (P6)', value: application?.paymentReference || 'En attente de controle', monoValue: true },
    { label: 'Date de Soumission (ISO)', value: application?.createdAt || new Date().toISOString(), monoValue: true },
    { label: 'Regle Delai Legal (SLA)', value: '10 jours ouvrables a compter de la validation de quittance' }
  ];

  let rowY = 628;
  rows.forEach((row, idx) => {
    drawOfficialTableRow(ops, { x: 32, y: rowY, width: 531, height: 22, index: idx, ...row });
    rowY -= 22;
  });

  // Liste des pieces jointes deposees (P1-P6)
  pushPdfText(ops, {
    font: '/F2',
    size: 10,
    x: 32,
    y: 486,
    text: 'PIECES JUSTIFICATIVES ENREGISTREES & EMPREINTES SHA-256',
    rgb: '0.039 0.145 0.251'
  });
  ops.push('0.859 0.886 0.918 RG 0.8 w 32 480 m 563 480 l S');

  const docs = Array.isArray(application?.attachedDocuments) ? application.attachedDocuments : [];
  let docY = 462;
  if (docs.length === 0) {
    pushPdfText(ops, { font: '/F1', size: 8.5, x: 36, y: docY, text: 'Aucune piece attachee lors du depot initial.', rgb: '0.294 0.333 0.388' });
  } else {
    for (const d of docs.slice(0, 8)) {
      const code = d.docCode || 'PIECE';
      const name = d.isExemptedOnceOnly ? 'Dispense Once-Only (S1 actif)' : (d.fileName || 'document.pdf');
      const sha = d.sha256Hash ? String(d.sha256Hash).slice(0, 22) + '...' : 'N/A';
      pushPdfText(ops, {
        font: '/F2',
        size: 8.5,
        x: 34,
        y: docY,
        text: `- ${code}`,
        rgb: '0.039 0.145 0.251'
      });
      pushPdfText(ops, {
        font: '/F1',
        size: 8.5,
        x: 138,
        y: docY,
        text: name.slice(0, 34),
        rgb: '0.122 0.161 0.216'
      });
      pushPdfText(ops, {
        font: '/F3',
        size: 7.5,
        x: 355,
        y: docY,
        text: `SHA-256: ${sha}`,
        rgb: '0.294 0.333 0.388'
      });
      docY -= 16;
    }
  }

  // Note SLA + QR vers le suivi tableau de bord
  ops.push('0.973 0.980 0.988 rg 32 232 396 108 re f');
  ops.push('0.859 0.886 0.918 RG 0.8 w 32 232 396 108 re S');
  pushPdfText(ops, { font: '/F2', size: 9, x: 42, y: 320, text: 'PROCHAINES ETAPES D\'INSTRUCTION', rgb: '0.039 0.145 0.251' });
  const noteLines = [
    ...wrapPdfText('1. Controle de votre quittance P6 par un Agent FNPSS (declenchement du chrono SLA 10 jours ouvrables).', 68),
    ...wrapPdfText('2. Examen technique par la Division puis decision et scellement Blockchain par la DG FNPSS.', 68)
  ];
  let ny = 302;
  for (const nl of noteLines.slice(0, 4)) {
    pushPdfText(ops, { font: '/F1', size: 8, x: 42, y: ny, text: nl, rgb: '0.294 0.333 0.388' });
    ny -= 13;
  }

  ops.push('1 1 1 rg 438 232 125 140 re f');
  ops.push('0.859 0.886 0.918 RG 0.8 w 438 232 125 140 re S');
  drawVectorQrCode(ops, {
    url: dashboardUrl,
    originX: 448,
    originY: 256,
    boxPt: 104,
    caption: 'SUIVI TABLEAU DE BORD'
  });

  drawSovereignFooter(ops);
  return compileMultiFontPdfBuffer(ops);
}
