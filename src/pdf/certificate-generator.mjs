/**
 * @fileoverview Générateur sans dépendance externe d'actes officiels PDF 1.4 (`VER-01`, `VER-02`)
 * pour le Guichet Unique Dématérialisé du FNPSS (RDC).
 *
 * Prend en charge les 6 gabarits officiels normés (`S1` à `S6`) validés lors des ateliers A1–A4 (`GOV-03`).
 */

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

function escapePdfText(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Normalisation ASCII pour la police standard Helvetica Type1
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Construit un Buffer PDF 1.4 officiel prêt à être téléchargé ou vérifié par hachage SHA-256.
 * @param {object} cert
 * @returns {Buffer}
 */
export function generateOfficialPdfBuffer(cert) {
  const svcCode = cert.serviceCode || 'S6';
  const tpl = OFFICIAL_ACT_TEMPLATES[svcCode] || OFFICIAL_ACT_TEMPLATES.S6;

  const lines = [
    { size: 13, x: 50, y: 785, text: 'REPUBLIQUE DEMOCRATIQUE DU CONGO' },
    { size: 10, x: 50, y: 769, text: 'Ministere des Affaires Sociales, Actions Humanitaires et Solidarite Nationale' },
    { size: 11, x: 50, y: 753, text: 'FONDS NATIONAL DE PROMOTION ET DE SERVICE SOCIAL (FNPSS)' },
    { size: 10, x: 50, y: 736, text: '----------------------------------------------------------------------------------------' },
    { size: 13, x: 50, y: 712, text: `${tpl.officialTitle} (${svcCode})` },
    { size: 11, x: 50, y: 693, text: `Numero Officiel d'Acte : ${cert.certificateNumber || 'FNPSS-ACT-2026'}` },
    { size: 9,  x: 50, y: 672, text: tpl.legalVisa },
    { size: 9,  x: 50, y: 656, text: tpl.bodyClause },
    { size: 10, x: 50, y: 632, text: `Organisation Beneficiaire : ${cert.organizationName || ''}` },
    { size: 10, x: 50, y: 614, text: `Intitule du Projet        : ${cert.projectTitle || ''}` },
    { size: 10, x: 50, y: 596, text: `Biens / Perimetre         : ${(cert.goodsSummary || 'N/A').slice(0, 90)}` },
    { size: 10, x: 50, y: 574, text: `Date d'emission (ISO)     : ${cert.issuedAtIso || ''}` },
    { size: 10, x: 50, y: 556, text: `Date d'expiration (ISO)   : ${cert.expiresAtIso || 'Illimitee'}` },
    { size: 10, x: 50, y: 534, text: `Autorite Signataire       : ${tpl.signatoryAuthority}` },
    { size: 10, x: 50, y: 514, text: '----------------------------------------------------------------------------------------' },
    { size: 11, x: 50, y: 494, text: 'SCEAU CRYPTOGRAPHIQUE BLOCKCHAIN POLYGON (FNPSSRegistry.sol)' },
    { size: 9,  x: 50, y: 474, text: `SHA-256 (docHash) : ${cert.docHash || ''}` },
    { size: 9,  x: 50, y: 458, text: `TxHash Polygon    : ${cert.txHash || ''}` },
    { size: 9,  x: 50, y: 442, text: `Verification QR   : ${cert.verificationUrl || ''}` },
    { size: 8,  x: 50, y: 412, text: 'Controle Douanier DGDA : Scannez le QR Code ou verifiez le hash SHA-256 sur le portail FNPSS.' }
  ];

  const streamOps = ['BT'];
  for (const l of lines) {
    streamOps.push(`/F1 ${l.size} Tf`);
    streamOps.push(`1 0 0 1 ${l.x} ${l.y} Tm`);
    streamOps.push(`(${escapePdfText(l.text)}) Tj`);
  }
  streamOps.push('ET');
  const streamContent = streamOps.join('\n') + '\n';
  const streamByteLength = Buffer.byteLength(streamContent, 'ascii');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamByteLength} >>\nstream\n${streamContent}endstream\nendobj\n`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'ascii');
}
