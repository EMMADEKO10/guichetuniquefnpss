/**
 * @fileoverview Générateur souverain d'actes officiels PDF 1.4 (`VER-01`, `VER-02`)
 * pour le Guichet Unique Dématérialisé du FNPSS (RDC).
 *
 * Prend en charge les 6 gabarits officiels normés (`S1` à `S6`), la charte graphique
 * FNPSS, les tableaux structurés, le cachet électronique et le QR Code vectoriel ISO-18004.
 */

import {
  wrapPdfText,
  pushPdfText,
  drawSovereignHeaderAndFrame,
  drawOfficialTableRow,
  drawOfficialStamp,
  drawVectorQrCode,
  drawSovereignFooter,
  compileMultiFontPdfBuffer
} from './pdf-primitives.mjs';

export const OFFICIAL_ACT_TEMPLATES = Object.freeze({
  S1: {
    code: 'S1',
    officialTitle: "ATTESTATION D'ENROLEMENT AU FNPSS",
    legalVisa: 'Vu le Decret portant creation, organisation et fonctionnement du FNPSS ;',
    bodyClause: 'Atteste que l\'organisation susmentionnee est regulierement inscrite au repertoire national des acteurs sociaux et humanitaires.',
    signatoryAuthority: 'Pour le FNPSS : La Direction Generale (DG FNPSS)'
  },
  S2: {
    code: 'S2',
    officialTitle: 'CONVENTION DE PARTENARIAT AVEC LE GOUVERNEMENT DE LA RDC',
    legalVisa: 'Vu le cadre reglementaire de l\'action sociale et humanitaire en Republique Democratique du Congo ;',
    bodyClause: 'Consacre l\'accord-cadre de partenariat entre le Gouvernement de la RDC et l\'organisation partenaire pour la realisation de son programme.',
    signatoryAuthority: 'Co-signature : Ministre des Affaires Sociales & Direction Generale du FNPSS'
  },
  S3: {
    code: 'S3',
    officialTitle: 'ATTESTATION DES BIENS A EXONERER',
    legalVisa: 'Vu le rapport d\'enquete de conformite du FNPSS sur la liste de colisage presentee ;',
    bodyClause: 'Certifie que les biens, equipements et intrants decrits ci-dessous sont exclusivement affectes au programme humanitaire ou social approuve.',
    signatoryAuthority: 'Pour le FNPSS : La Direction Generale (DG FNPSS)'
  },
  S4: {
    code: 'S4',
    officialTitle: "CERTIFICAT D'EXONERATIONS",
    legalVisa: 'Vu les dispositions legales relatives aux exonerations accordees aux organismes sociaux et humanitaires ;',
    bodyClause: 'Confere le benefice du regime d\'exoneration sur les biens designes ci-dessous, opposable apres controle du QR Code par la DGDA / DGRAD.',
    signatoryAuthority: 'Pour le FNPSS : La Direction Generale (DG FNPSS)'
  },
  S5: {
    code: 'S5',
    officialTitle: 'CERTIFICAT DE PHILANTHROPIE',
    legalVisa: 'Vu les dispositions relatives a la promotion de la philanthropie et du mecenat social en RDC ;',
    bodyClause: 'Reconnait la qualite d\'acteur philanthropique d\'interet general contribuant aux oeuvres de promotion et de service social.',
    signatoryAuthority: 'Pour le FNPSS : La Direction Generale (DG FNPSS)'
  },
  S6: {
    code: 'S6',
    officialTitle: "ARRETE MINISTERIEL PORTANT AVIS FAVORABLE POUR L'EXONERATION",
    legalVisa: 'Vu l\'avis technique favorable emis par la Direction Generale du FNPSS apres enquete de conformite ;',
    bodyClause: 'Emet un avis favorable officiel pour l\'octroi des facilites douanieres et fiscales sur les biens humanitaires ou sociaux listes ci-dessous.',
    signatoryAuthority: 'Le Ministre des Affaires Sociales, Actions Humanitaires et Solidarite Nationale (Visa DG FNPSS)'
  }
});

/**
 * Construit un Buffer PDF 1.4 officiel charté prêt à être téléchargé ou vérifié par hachage SHA-256.
 * @param {object} cert
 * @returns {Buffer}
 */
export function generateOfficialPdfBuffer(cert) {
  const svcCode = cert.serviceCode || 'S6';
  const tpl = OFFICIAL_ACT_TEMPLATES[svcCode] || OFFICIAL_ACT_TEMPLATES.S6;
  const qrUrl =
    cert.qrVerificationUrl ||
    cert.verificationUrl ||
    (cert.certificateNumber
      ? `https://guichetuniquefnpss.vercel.app/verifier?cert=${encodeURIComponent(cert.certificateNumber)}`
      : '');
  const isRevoked = cert.status === 'REVOKED' || cert.status === 'REVOQUE';

  const ops = [];
  drawSovereignHeaderAndFrame(ops, {
    subtitle: 'Guichet Unique Dematerialise — Acte Officiel Scelle & Verifiable'
  });

  // Cartouche Titre + Badge statut + Numero officiel
  ops.push('0.933 0.965 0.988 rg 32 664 531 50 re f');
  ops.push('0.749 0.859 0.996 RG 0.8 w 32 664 531 50 re S');
  ops.push('0.875 0.325 0.067 rg 32 664 4 50 re f');

  pushPdfText(ops, {
    font: '/F2',
    size: 10.5,
    x: 44,
    y: 695,
    text: `${tpl.officialTitle} (${svcCode})`,
    rgb: '0.039 0.145 0.251'
  });
  pushPdfText(ops, {
    font: '/F3',
    size: 9.5,
    x: 44,
    y: 675,
    text: `Numero Officiel d'Acte : ${cert.certificateNumber || 'FNPSS-ACT-2026'}`,
    rgb: '0.024 0.353 0.510'
  });

  // Pastille statut en haut a droite du cartouche
  const badgeBg = isRevoked ? '0.988 0.910 0.902' : '0.902 0.957 0.918';
  const badgeBorder = isRevoked ? '0.851 0.188 0.145' : '0.075 0.451 0.200';
  ops.push(`${badgeBg} rg 435 671 118 17 re f`);
  ops.push(`${badgeBorder} RG 0.8 w 435 671 118 17 re S`);
  pushPdfText(ops, {
    font: '/F2',
    size: 7.5,
    x: isRevoked ? 470 : 453,
    y: 676,
    text: isRevoked ? 'REVOQUE' : 'ACTE AUTHENTIQUE',
    rgb: badgeBorder
  });

  // Visas et dispositif legal
  let cursorY = 648;
  for (const line of [...wrapPdfText(tpl.legalVisa, 98), ...wrapPdfText(tpl.bodyClause, 98)].slice(0, 4)) {
    pushPdfText(ops, { font: '/F1', size: 8.5, x: 34, y: cursorY, text: line, rgb: '0.180 0.220 0.280' });
    cursorY -= 13;
  }

  // Tableau des metadonnees officielles
  const signatoryText = cert.ministryReference
    ? `${tpl.signatoryAuthority} — Co-signe (${cert.ministryReference})`
    : tpl.signatoryAuthority;

  const rows = [
    { label: 'Organisation Beneficiaire', value: cert.organizationName || 'N/A' },
    { label: 'Intitule du Projet', value: cert.projectTitle || 'Programme humanitaire approuve' },
    { label: 'Biens / Perimetre', value: cert.goodsSummary || 'Conforme a la liste validee' },
    { label: 'Date d\'emission (ISO)', value: cert.issuedAtIso || 'N/A', monoValue: true },
    { label: 'Date d\'expiration (ISO)', value: cert.expiresAtIso || 'Illimitee', monoValue: true },
    { label: 'Autorite Signataire', value: signatoryText }
  ];

  let rowY = 562;
  rows.forEach((row, idx) => {
    drawOfficialTableRow(ops, { x: 32, y: rowY, width: 531, height: 22, index: idx, ...row });
    rowY -= 22;
  });

  // Encadre Sceau Blockchain (gauche) + QR Code Vectoriel (droite)
  ops.push('0.973 0.980 0.988 rg 32 232 396 206 re f');
  ops.push('0.859 0.886 0.918 RG 0.8 w 32 232 396 206 re S');
  ops.push('0.024 0.353 0.510 rg 32 434 396 4 re f');

  pushPdfText(ops, {
    font: '/F2',
    size: 9.5,
    x: 42,
    y: 416,
    text: 'SCEAU CRYPTOGRAPHIQUE BLOCKCHAIN POLYGON (FNPSSRegistry.sol)',
    rgb: '0.039 0.145 0.251'
  });
  pushPdfText(ops, {
    font: '/F3',
    size: 7.2,
    x: 42,
    y: 396,
    text: `SHA-256 (docHash) : ${cert.docHash || 'En attente d\'empreinte'}`,
    rgb: '0.122 0.161 0.216'
  });
  pushPdfText(ops, {
    font: '/F3',
    size: 7.2,
    x: 42,
    y: 381,
    text: `TxHash Polygon    : ${cert.txHash || 'En attente de confirmation'}`,
    rgb: '0.122 0.161 0.216'
  });
  pushPdfText(ops, {
    font: '/F1',
    size: 6.4,
    x: 42,
    y: 365,
    text: `Verification QR   : ${qrUrl}`,
    rgb: '0.024 0.353 0.510'
  });

  // Cachet electronique officiel + bloc signature (dans l'encadre bas gauche)
  drawOfficialStamp(ops, {
    cx: 92,
    cy: 292,
    statusLabel: isRevoked ? 'REVOQUE' : 'SCELLE',
    authorityLine: cert.ministryCoSigned ? 'DG + MIN' : 'DG FNPSS'
  });
  pushPdfText(ops, { font: '/F2', size: 8.5, x: 146, y: 312, text: 'Signature Electronique Qualifiee', rgb: '0.039 0.145 0.251' });
  pushPdfText(ops, { font: '/F1', size: 8, x: 146, y: 298, text: 'Direction Generale du FNPSS (Kinshasa, RDC)', rgb: '0.294 0.333 0.388' });
  pushPdfText(ops, { font: '/F1', size: 7.5, x: 146, y: 282, text: 'Controle Douanier DGDA / DGI / DGRAD sans gaz.', rgb: '0.294 0.333 0.388' });
  if (isRevoked && cert.revocationReason) {
    pushPdfText(ops, {
      font: '/F2',
      size: 7.5,
      x: 42,
      y: 243,
      text: `MOTIF REVOCATION : ${String(cert.revocationReason).slice(0, 62)}`,
      rgb: '0.851 0.188 0.145'
    });
  }

  // Encadre QR Code DGDA (droite)
  ops.push('1 1 1 rg 438 232 125 206 re f');
  ops.push('0.859 0.886 0.918 RG 0.8 w 438 232 125 206 re S');
  drawVectorQrCode(ops, {
    url: qrUrl,
    originX: 444,
    originY: 294,
    boxPt: 112,
    caption: 'SCAN QR CODE DGDA'
  });
  pushPdfText(ops, {
    font: '/F1',
    size: 7,
    x: 454,
    y: 256,
    text: 'Verification instantanee',
    rgb: '0.294 0.333 0.388'
  });

  drawSovereignFooter(ops);
  return compileMultiFontPdfBuffer(ops);
}
