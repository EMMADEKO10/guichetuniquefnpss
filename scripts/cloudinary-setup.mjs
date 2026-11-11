/**
 * @fileoverview Script de synchronisation `.env` et de test de stockage PDF chiffré AES-256-GCM sur Cloudinary (OPS-05).
 * - Lit `CLOUDINARY_URL` dans `.env` (format `cloudinary://api_key:api_secret@cloud_name`).
 * - Synchronise automatiquement `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY` et `STORAGE_SECRET_KEY` dans `.env` sans afficher les secrets.
 * - Effectue un test réel d'envoi d'une attestation PDF chiffrée AES-256-GCM sur Cloudinary et vérifie son déchiffrement.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  resolveCloudinaryConfig,
  uploadEncryptedPdfToCloudinary,
  downloadAndDecryptPdfFromCloudinary
} from '../src/storage/cloudinary-storage.mjs';

const envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
  console.error('Fichier .env introuvable.');
  process.exit(1);
}

let envText = fs.readFileSync(envPath, 'utf8');
const envMap = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    envMap[k] = v;
  }
}

const config = resolveCloudinaryConfig(envMap);
if (!config.cloudName || !config.apiKey || !config.apiSecret || config.apiSecret.includes('change_me')) {
  console.error('Variable CLOUDINARY_URL absente ou incomplète dans .env.');
  process.exit(1);
}

// Synchronisation des variables STORAGE_* dans .env à partir de CLOUDINARY_URL
envText = envText
  .replace(/^STORAGE_ENDPOINT=.*$/m, `STORAGE_ENDPOINT=https://api.cloudinary.com/v1_1/${config.cloudName}`)
  .replace(/^STORAGE_ACCESS_KEY=.*$/m, `STORAGE_ACCESS_KEY=${config.apiKey}`)
  .replace(/^STORAGE_SECRET_KEY=.*$/m, `STORAGE_SECRET_KEY=${config.apiSecret}`);

fs.writeFileSync(envPath, envText, 'utf8');
console.log(`✓ Fichier .env synchronisé avec Cloudinary (Cloud Name: ${config.cloudName}, Dossier: ${config.folder}, Secret: [MASQUÉ])`);

async function main() {
  const samplePdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n% Attestation Test Chiffree FNPSS RDC\n%%EOF\n',
    'utf8'
  );

  console.log(`Envoi d'un PDF test chiffré AES-256-GCM vers Cloudinary (${config.cloudName}/${config.folder})...`);
  const uploaded = await uploadEncryptedPdfToCloudinary(samplePdf, {
    fileName: 'attestation_test_fnpss.pdf',
    publicId: 'smoke_test_fnpss_aes256gcm',
    env: envMap
  });

  console.log(`✓ Envoi Cloudinary réussi : ${uploaded.storageKey} (${uploaded.bytesStored} octets chiffrés)`);
  console.log(`  Empreinte SHA-256 originale : ${uploaded.sha256Hash}`);

  const restored = await downloadAndDecryptPdfFromCloudinary(uploaded.secureUrl, { env: envMap });
  if (restored.pdfBuffer.equals(samplePdf)) {
    console.log('✓ Lecture et déchiffrement AES-256-GCM depuis Cloudinary vérifiés à 100 % !');
  } else {
    throw new Error('Échec de vérification binaire après déchiffrement depuis Cloudinary.');
  }
}

main().catch(err => {
  console.error('Échec du test Cloudinary :', err.message);
  process.exit(1);
});

