/**
 * @fileoverview Adaptateur de Stockage Cloud Chiffré AES-256-GCM sur Cloudinary (OPS-05, REQ-07).
 * Permet de chiffrer les pièces justificatives PDF (P1–P6) et les attestations scellées FNPSS
 * avant leur envoi sur Cloudinary (`resource_type: raw`), et de les déchiffrer à la lecture.
 */

import crypto from 'node:crypto';
import { encryptDocumentAtRest, decryptDocumentAtRest } from '../crypto/document-sealer.mjs';
import { validateAndInspectPdfUpload } from './document-upload-guard.mjs';

/**
 * Extrait la configuration Cloudinary depuis `CLOUDINARY_URL` (`cloudinary://api_key:api_secret@cloud_name`)
 * ou depuis les variables `STORAGE_*` de `.env`.
 */
export function resolveCloudinaryConfig(env = process.env) {
  const cloudinaryUrl = (env.CLOUDINARY_URL || '').trim().replace(/^["']|["']$/g, '');
  if (cloudinaryUrl.startsWith('cloudinary://')) {
    const parsed = new URL(cloudinaryUrl);
    return {
      cloudName: parsed.hostname,
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
      folder: env.STORAGE_BUCKET || 'fnpss-documents-scelles',
      encryptionKeyHex: env.DOCUMENT_ENCRYPTION_KEY_HEX || null
    };
  }

  let cloudName = (env.CLOUDINARY_CLOUD_NAME || '').trim();
  if (!cloudName && env.STORAGE_ENDPOINT && !env.STORAGE_ENDPOINT.includes('localhost:9000')) {
    const ep = env.STORAGE_ENDPOINT.trim().replace(/\/+$/, '');
    const match = ep.match(/\/v1_1\/([^/]+)$/);
    cloudName = match ? match[1] : ep.replace(/^https?:\/\//, '');
  }

  return {
    cloudName,
    apiKey: (env.CLOUDINARY_API_KEY || env.STORAGE_ACCESS_KEY || '').trim(),
    apiSecret: (env.CLOUDINARY_API_SECRET || env.STORAGE_SECRET_KEY || '').trim(),
    folder: (env.STORAGE_BUCKET || 'fnpss-documents-scelles').trim(),
    encryptionKeyHex: (env.DOCUMENT_ENCRYPTION_KEY_HEX || '').trim() || null
  };
}

/**
 * Calcule la signature SHA-1 requise par l'API REST d'upload signé de Cloudinary.
 */
export function signCloudinaryParams(params, apiSecret) {
  const sortedEntries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(sortedEntries + apiSecret, 'utf8')
    .digest('hex');
}

/**
 * Valide un PDF (REQ-07), le chiffre en AES-256-GCM (OPS-05) et l'envoie sur Cloudinary (`raw/upload`).
 */
export async function uploadEncryptedPdfToCloudinary(pdfContent, {
  fileName = 'document.pdf',
  publicId = `fnpss_${Date.now()}`,
  env = process.env,
  fetchImpl = fetch
} = {}) {
  const config = resolveCloudinaryConfig(env);
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error('OPS-05: Identifiants Cloudinary incomplets (CLOUDINARY_URL manquant dans .env)');
  }
  if (!config.encryptionKeyHex || config.encryptionKeyHex.length !== 64) {
    throw new Error('OPS-05: Clé DOCUMENT_ENCRYPTION_KEY_HEX (64 hex) requise pour le chiffrement au repos');
  }

  const inspection = validateAndInspectPdfUpload(pdfContent, {
    fileName,
    encryptionKeyHex: config.encryptionKeyHex
  });

  const envelopeJson = JSON.stringify({
    version: '1.0',
    fileName: inspection.fileName,
    byteSize: inspection.byteSize,
    sha256Hash: inspection.sha256Hash,
    encryptedAtRest: inspection.encryptedAtRest
  });

  const base64DataUri = `data:application/json;base64,${Buffer.from(envelopeJson, 'utf8').toString('base64')}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const cleanPublicId = `${publicId.replace(/[^a-zA-Z0-9_-]/g, '_')}.enc.json`;

  const paramsToSign = {
    folder: config.folder,
    overwrite: 'true',
    public_id: cleanPublicId,
    timestamp: String(timestamp)
  };
  const signature = signCloudinaryParams(paramsToSign, config.apiSecret);

  const formBody = new URLSearchParams({
    file: base64DataUri,
    api_key: config.apiKey,
    timestamp: String(timestamp),
    folder: config.folder,
    public_id: cleanPublicId,
    overwrite: 'true',
    signature
  });

  const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/raw/upload`;
  const res = await fetchImpl(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OPS-05: Échec d'envoi Cloudinary (${res.status}) : ${errText}`);
  }

  const cloudData = await res.json();
  return {
    provider: 'cloudinary',
    storageKey: cloudData.public_id,
    secureUrl: cloudData.secure_url,
    bytesStored: cloudData.bytes,
    originalFileName: inspection.fileName,
    originalByteSize: inspection.byteSize,
    sha256Hash: inspection.sha256Hash,
    cipherAlgorithm: 'AES-256-GCM'
  };
}

/**
 * Télécharge une enveloppe chiffrée depuis Cloudinary et restitue le PDF original déchiffré après contrôle GCM.
 */
export async function downloadAndDecryptPdfFromCloudinary(secureUrl, {
  env = process.env,
  fetchImpl = fetch
} = {}) {
  const config = resolveCloudinaryConfig(env);
  const res = await fetchImpl(secureUrl);
  if (!res.ok) {
    throw new Error(`OPS-05: Impossible de récupérer l'objet chiffré Cloudinary (${res.status})`);
  }
  const envelope = await res.json();
  const decryptedBuffer = decryptDocumentAtRest(envelope.encryptedAtRest, config.encryptionKeyHex);
  return {
    fileName: envelope.fileName,
    sha256Hash: envelope.sha256Hash,
    pdfBuffer: decryptedBuffer
  };
}

