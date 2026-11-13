/**
 * @fileoverview Moteur cryptographique Off-Chain :
 * - Calcul d'empreinte SHA-256 (0x + 64 hex) pour l'ancrage Blockchain (BLK-09)
 * - Chiffrement authentifié AES-256-GCM des documents au repos (OPS-05)
 * - Génération de l'URL et du payload de vérification QR Code pour la DGDA (VER-01, VER-02)
 */

import crypto from 'node:crypto';

/**
 * Calcule le condensat SHA-256 au format hexadécimal préfixé `0x` (32 octets / bytes32 Solidity).
 * @param {Buffer|string} content Contenu binaire du PDF final ou chaîne canonique
 * @returns {string} Hash SHA-256 au format `0x...` (66 caractères)
 */
export function computeSha256Bytes32(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
  if (buffer.length === 0) {
    throw new Error('Impossible de hacher un document vide');
  }
  const digest = crypto.createHash('sha256').update(buffer).digest('hex');
  return `0x${digest}`;
}

/**
 * Chiffre un document sensible au repos avec AES-256-GCM (OPS-05).
 * @param {Buffer|string} plainContent Contenu du fichier PDF
 * @param {string} keyHex Clé secrète de 32 octets encodée en hexadécimal (64 caractères)
 */
export function encryptDocumentAtRest(plainContent, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('La clé AES-256 doit faire exactement 32 octets (64 caractères hex)');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const input = Buffer.isBuffer(plainContent) ? plainContent : Buffer.from(String(plainContent), 'utf8');
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
    ciphertextBase64: encrypted.toString('base64')
  };
}

/**
 * Déchiffre et vérifie l'intégrité d'un document chiffré avec AES-256-GCM (OPS-05).
 */
export function decryptDocumentAtRest(encryptedBundle, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('La clé AES-256 doit faire exactement 32 octets (64 caractères hex)');
  }
  const iv = Buffer.from(encryptedBundle.ivHex, 'hex');
  const authTag = Buffer.from(encryptedBundle.authTagHex, 'hex');
  const ciphertext = Buffer.from(encryptedBundle.ciphertextBase64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Construit le payload déterministe d'un acte officiel FNPSS et son URL publique de vérification QR Code (VER-01, VER-02).
 */
export function sealOfficialAct({
  certificateNumber,
  serviceCode,
  organizationName,
  projectTitle,
  goodsSummary,
  issuedAtIso,
  expiresAtIso,
  baseUrl = process.env.PUBLIC_VERIFY_BASE_URL || 'https://guichetuniquefnpss.vercel.app/verifier'
}) {
  if (!certificateNumber || !serviceCode || !organizationName) {
    throw new Error('Métadonnées obligatoires manquantes pour le scellement de l\'acte');
  }

  const canonicalDocument = JSON.stringify({
    republic: 'REPUBLIQUE DEMOCRATIQUE DU CONGO',
    institution: 'FONDS NATIONAL DE PROMOTION ET DE SERVICE SOCIAL (FNPSS)',
    certificateNumber,
    serviceCode,
    organizationName,
    projectTitle,
    goodsSummary,
    issuedAtIso,
    expiresAtIso
  });

  const docHash = computeSha256Bytes32(canonicalDocument);
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const qrVerificationUrl = `${cleanBase}?hash=${docHash}&cert=${encodeURIComponent(certificateNumber)}`;

  return {
    certificateNumber,
    serviceCode,
    docHash,
    qrVerificationUrl,
    canonicalDocument
  };
}

