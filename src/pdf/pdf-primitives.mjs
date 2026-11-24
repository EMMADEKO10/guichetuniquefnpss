/**
 * @fileoverview Primitives graphiques PDF 1.4 souveraines (charte FNPSS : #0a2540, #df5311, ruban RDC)
 * partagées entre le générateur d'actes officiels S1-S6 et l'Accusé de Réception PDF.
 */

import QRCode from 'qrcode';

export function escapePdfText(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function wrapPdfText(input, maxChars = 90) {
  const words = String(input || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function pushPdfText(ops, { font = '/F1', size = 10, x, y, text, rgb = '0.122 0.161 0.216' }) {
  ops.push('BT');
  ops.push(`${font} ${size} Tf`);
  ops.push(`${rgb} rg`);
  ops.push(`1 0 0 1 ${x} ${y} Tm`);
  ops.push(`(${escapePdfText(text)}) Tj`);
  ops.push('ET');
}

function pushCirclePath(ops, cx, cy, r) {
  const k = 0.55228475 * r;
  ops.push(`${(cx + r).toFixed(2)} ${cy.toFixed(2)} m`);
  ops.push(`${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c`);
  ops.push(`${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c`);
  ops.push(`${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c`);
  ops.push(`${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c`);
}

export function drawSovereignHeaderAndFrame(ops, { subtitle = 'Guichet Unique Dematerialise — "Le social dans la solidarite"' } = {}) {
  // Double cadre de securite A4 (595 x 842 pt)
  ops.push('0.039 0.145 0.251 RG 1.2 w');
  ops.push('16 16 563 810 re S');
  ops.push('0.875 0.325 0.067 RG 0.6 w');
  ops.push('20 20 555 802 re S');

  // Ruban tricolore RDC en haut du document
  ops.push('0 0.498 1 rg 22 815 385 5 re f');
  ops.push('0.969 0.839 0.094 rg 407 815 66 5 re f');
  ops.push('0.808 0.063 0.129 rg 473 815 100 5 re f');

  // Bandeau institutionnel bleu marine + filet orange FNPSS
  ops.push('0.039 0.145 0.251 rg 22 728 551 87 re f');
  ops.push('0.875 0.325 0.067 rg 22 725 551 3 re f');

  // Medaillon vectoriel officiel FNPSS
  ops.push('1 1 1 rg 0.875 0.325 0.067 RG 1.6 w');
  pushCirclePath(ops, 62, 771, 25);
  ops.push('B');
  ops.push('0.039 0.145 0.251 RG 0.8 w');
  pushCirclePath(ops, 62, 771, 20.5);
  ops.push('S');
  // Losange or RDC + monogramme FNPSS
  ops.push('0.969 0.839 0.094 rg 62 786 m 67 781 l 62 776 l 57 781 l h f');
  pushPdfText(ops, { font: '/F2', size: 9, x: 46, y: 765, text: 'FNPSS', rgb: '0.039 0.145 0.251' });
  pushPdfText(ops, { font: '/F2', size: 6.5, x: 54, y: 756, text: 'RDC', rgb: '0.875 0.325 0.067' });

  // Textes institutionnels blancs dans l'en-tete
  pushPdfText(ops, { font: '/F2', size: 11, x: 102, y: 793, text: 'REPUBLIQUE DEMOCRATIQUE DU CONGO', rgb: '1 1 1' });
  pushPdfText(ops, { font: '/F1', size: 8.5, x: 102, y: 778, text: 'Ministere des Affaires Sociales, Actions Humanitaires et Solidarite Nationale', rgb: '0.886 0.910 0.941' });
  pushPdfText(ops, { font: '/F2', size: 10.5, x: 102, y: 762, text: 'FONDS NATIONAL DE PROMOTION ET DE SERVICE SOCIAL (FNPSS)', rgb: '1 1 1' });
  pushPdfText(ops, { font: '/F1', size: 8.5, x: 102, y: 745, text: subtitle, rgb: '0.992 0.729 0.455' });
}

export function drawOfficialTableRow(ops, { x = 32, y, width = 531, height = 23, index = 0, label, value, monoValue = false }) {
  const fillRgb = index % 2 === 0 ? '0.973 0.980 0.988' : '1 1 1';
  ops.push(`${fillRgb} rg ${x} ${y} ${width} ${height} re f`);
  ops.push(`0.859 0.886 0.918 RG 0.6 w ${x} ${y} ${width} ${height} re S`);
  ops.push(`0.859 0.886 0.918 RG 0.6 w ${x + 166} ${y} m ${x + 166} ${y + height} l S`);

  const textY = y + Math.round((height - 7) / 2);
  pushPdfText(ops, { font: '/F2', size: 8.5, x: x + 10, y: textY, text: label, rgb: '0.294 0.333 0.388' });
  pushPdfText(ops, {
    font: monoValue ? '/F3' : '/F1',
    size: monoValue ? 8.5 : 9,
    x: x + 174,
    y: textY,
    text: String(value || 'N/A').slice(0, 68),
    rgb: '0.039 0.145 0.251'
  });
}

export function drawOfficialStamp(ops, { cx = 100, cy = 288, statusLabel = 'SCELLE', authorityLine = 'DG FNPSS' }) {
  const color = statusLabel === 'REVOQUE' ? '0.851 0.188 0.145' : '0.075 0.451 0.200';
  ops.push(`${color} RG 1.4 w`);
  pushCirclePath(ops, cx, cy, 34);
  ops.push('S');
  ops.push(`${color} RG 0.6 w`);
  pushCirclePath(ops, cx, cy, 29);
  ops.push('S');
  pushPdfText(ops, { font: '/F2', size: 7, x: cx - 20, y: cy + 12, text: 'FNPSS - RDC', rgb: color });
  pushPdfText(ops, { font: '/F2', size: 7.5, x: cx - 22, y: cy - 2, text: statusLabel, rgb: color });
  pushPdfText(ops, { font: '/F1', size: 6.5, x: cx - 18, y: cy - 15, text: authorityLine.slice(0, 12), rgb: color });
}

export function drawVectorQrCode(ops, { url, originX = 442, originY = 286, boxPt = 112, caption = 'SCAN QR CODE DGDA' }) {
  if (!url) return;
  const qrMatrix = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const count = qrMatrix.modules.size;
  const data = qrMatrix.modules.data;
  const quietModules = 2;
  const cellPt = boxPt / (count + quietModules * 2);

  ops.push('q');
  ops.push('1 1 1 rg');
  ops.push(`${originX} ${originY} ${boxPt} ${boxPt} re f`);
  ops.push('0.039 0.145 0.251 RG 0.9 w');
  ops.push(`${originX} ${originY} ${boxPt} ${boxPt} re S`);
  ops.push('0.039 0.145 0.251 rg');

  const cellStr = cellPt.toFixed(2);
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (data[row * count + col]) {
        const mx = (originX + (col + quietModules) * cellPt).toFixed(2);
        const my = (originY + boxPt - (row + quietModules + 1) * cellPt).toFixed(2);
        ops.push(`${mx} ${my} ${cellStr} ${cellStr} re f`);
      }
    }
  }
  pushPdfText(ops, {
    font: '/F2',
    size: 7.5,
    x: originX + 10,
    y: originY - 12,
    text: caption,
    rgb: '0.039 0.145 0.251'
  });
  ops.push('Q');
}

export function drawSovereignFooter(ops, verifyUrl = 'https://guichetuniquefnpss.vercel.app/verifier') {
  ops.push('0.859 0.886 0.918 RG 0.8 w 32 54 m 563 54 l S');
  pushPdfText(ops, {
    font: '/F1',
    size: 7.5,
    x: 32,
    y: 41,
    text: 'Document electronique officiel — Valeur probante reconnue par le Code du Numerique (Ordonnance-Loi n° 23/010 RDC).',
    rgb: '0.294 0.333 0.388'
  });
  pushPdfText(ops, {
    font: '/F2',
    size: 7.5,
    x: 32,
    y: 29,
    text: `Portail public de verification et controle douanier (DGDA / DGI / DGRAD) : ${verifyUrl}`,
    rgb: '0.024 0.353 0.510'
  });
}

export function compileMultiFontPdfBuffer(streamOps) {
  const streamContent = streamOps.join('\n') + '\n';
  const streamByteLength = Buffer.byteLength(streamContent, 'ascii');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamByteLength} >>\nstream\n${streamContent}endstream\nendobj\n`,
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    '7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n'
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
