/**
 * @fileoverview Générateur sans dépendance externe d'actes officiels PDF 1.4 (`VER-01`, `VER-02`)
 * pour le Guichet Unique Dématérialisé du FNPSS (RDC).
 *
 * Génère un fichier binaire `%PDF-1.4` valide et auto-portant contenant :
 * - Les mentions officielles de la République Démocratique du Congo, du Ministère de Tutelle et du FNPSS
 * - Le numéro d'acte (`certificateNumber`), le code service (`S1`..`S6`), le bénéficiaire et la liste des biens
 * - L'empreinte cryptographique `SHA-256` (`docHash`), la transaction Polygon (`txHash`) et l'URL QR Code DGDA
 */

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
  const lines = [
    { size: 13, x: 50, y: 780, text: 'REPUBLIQUE DEMOCRATIQUE DU CONGO' },
    { size: 10, x: 50, y: 764, text: 'Ministere des Affaires Sociales, Actions Humanitaires et Solidarite Nationale' },
    { size: 11, x: 50, y: 748, text: 'FONDS NATIONAL DE PROMOTION ET DE SERVICE SOCIAL (FNPSS)' },
    { size: 10, x: 50, y: 730, text: '----------------------------------------------------------------------------------------' },
    { size: 14, x: 50, y: 705, text: `ACTE OFFICIEL SCELLÉ - SERVICE ${cert.serviceCode || 'S6'}` },
    { size: 12, x: 50, y: 685, text: `Numero d'Acte : ${cert.certificateNumber || 'FNPSS-ACT-2026'}` },
    { size: 10, x: 50, y: 655, text: `Organisation Beneficiaire : ${cert.organizationName || ''}` },
    { size: 10, x: 50, y: 637, text: `Intitule du Projet        : ${cert.projectTitle || ''}` },
    { size: 10, x: 50, y: 619, text: `Biens / Perimetre         : ${(cert.goodsSummary || 'N/A').slice(0, 90)}` },
    { size: 10, x: 50, y: 595, text: `Date d'emission (ISO)     : ${cert.issuedAtIso || ''}` },
    { size: 10, x: 50, y: 577, text: `Date d'expiration (ISO)   : ${cert.expiresAtIso || 'Illimitee'}` },
    { size: 10, x: 50, y: 550, text: '----------------------------------------------------------------------------------------' },
    { size: 11, x: 50, y: 530, text: 'SCEAU CRYPTOGRAPHIQUE BLOCKCHAIN POLYGON (FNPSSRegistry.sol)' },
    { size: 9,  x: 50, y: 510, text: `SHA-256 (docHash) : ${cert.docHash || ''}` },
    { size: 9,  x: 50, y: 494, text: `TxHash Polygon    : ${cert.txHash || ''}` },
    { size: 9,  x: 50, y: 478, text: `Verification QR   : ${cert.verificationUrl || ''}` },
    { size: 8,  x: 50, y: 445, text: 'Controle Douanier DGDA : Scannez le QR Code ou verifiez le hash SHA-256 sur le portail FNPSS.' }
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

