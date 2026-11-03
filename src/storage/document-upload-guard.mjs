/**
 * @fileoverview Garde-fou de sécurité pour le téléversement de pièces justificatives PDF (REQ-07),
 * chiffrement au repos AES-256-GCM (OPS-05) et vérification directe d'intégrité d'un fichier PDF
 * contre le registre Blockchain FNPSS sans scan QR Code (VER-04).
 */

import { computeSha256Bytes32, encryptDocumentAtRest } from '../crypto/document-sealer.mjs';

export const DEFAULT_MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 Mo (REQ-07)

const DANGEROUS_PDF_TOKENS = Object.freeze([
  '/JS',
  '/JavaScript',
  '/Launch',
  '/EmbeddedFiles',
  '/OpenAction',
  '/AA',
  '/RichMedia'
]);

/**
 * Normalise une entrée (Buffer, chaîne brute `%PDF-...` ou Base64) en Buffer binaire.
 * @param {Buffer|string|Uint8Array} content
 * @returns {Buffer}
 */
export function normalizePdfBuffer(content) {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  if (content instanceof Uint8Array) {
    return Buffer.from(content);
  }
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('%PDF-')) {
      return Buffer.from(content, 'utf8');
    }
    const base64Clean = trimmed.replace(/^data:application\/pdf;base64,/i, '');
    return Buffer.from(base64Clean, 'base64');
  }
  throw new Error('Format de fichier PDF non supporté');
}

/**
 * Inspecte et valide un fichier PDF téléversé (REQ-07, OPS-05) :
 * - Vérifie la signature magique `%PDF-`
 * - Vérifie la taille maximale (10 Mo par défaut)
 * - Bloque les objets actifs malveillants (`/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFiles`, etc.)
 * - Calcule l'empreinte SHA-256 (`0x...`) et chiffre optionnellement en AES-256-GCM.
 */
export function validateAndInspectPdfUpload(content, {
  fileName = 'document.pdf',
  maxBytes = DEFAULT_MAX_PDF_BYTES,
  encryptionKeyHex = null
} = {}) {
  const buffer = normalizePdfBuffer(content);

  if (buffer.length === 0) {
    throw new Error('REQ-07: Le fichier PDF téléversé est vide');
  }

  if (buffer.length > maxBytes) {
    throw new Error(`REQ-07: La taille du fichier (${buffer.length} octets) dépasse la limite autorisée de ${maxBytes} octets (10 Mo)`);
  }

  const magicHeader = buffer.subarray(0, 5).toString('ascii');
  if (magicHeader !== '%PDF-') {
    throw new Error('REQ-07: Signature binaire invalide — seuls les fichiers PDF authentiques (%PDF-) sont acceptés');
  }

  const asciiPreview = buffer.toString('latin1');
  for (const token of DANGEROUS_PDF_TOKENS) {
    const tokenRegex = new RegExp(`\\${token}(?![A-Za-z])`, 'i');
    if (tokenRegex.test(asciiPreview)) {
      throw new Error(`REQ-07: Contenu actif potentiellement malveillant détecté dans le PDF (${token})`);
    }
  }

  const sha256Hash = computeSha256Bytes32(buffer);
  const encryptedAtRest = encryptionKeyHex
    ? encryptDocumentAtRest(buffer, encryptionKeyHex)
    : null;

  return {
    isSafePdf: true,
    fileName,
    byteSize: buffer.length,
    pdfVersion: buffer.subarray(0, 8).toString('ascii').replace(/[\r\n]/g, ''),
    sha256Hash,
    encryptedAtRest
  };
}

/**
 * Vérifie directement l'intégrité d'un fichier PDF téléversé par un agent des douanes (DGDA)
 * ou un partenaire en recalculant son empreinte SHA-256 à la volée et en interrogeant la Blockchain (VER-04).
 */
export function verifyUploadedPdfAgainstRegistry(
  content,
  registryContract,
  nowTimestamp = Math.floor(Date.now() / 1000),
  options = {}
) {
  if (!registryContract || typeof registryContract.verifyDocument !== 'function') {
    throw new Error('Contrat de registre Blockchain invalide pour la vérification PDF');
  }

  const inspection = validateAndInspectPdfUpload(content, options);
  const verification = registryContract.verifyDocument(inspection.sha256Hash, nowTimestamp);

  return {
    fileName: inspection.fileName,
    byteSize: inspection.byteSize,
    pdfVersion: inspection.pdfVersion,
    computedSha256: inspection.sha256Hash,
    ...verification
  };
}
