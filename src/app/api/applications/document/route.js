/**
 * Pièces justificatives P1–P6 sur Cloudinary (REQ-07, ADM-05, OPS-05).
 * - POST /api/applications/document : le requérant téléverse UNE pièce PDF (<= 3 Mo) ; elle est validée
 *   (signature %PDF-, anti-contenu actif), chiffrée AES-256-GCM puis stockée sur Cloudinary.
 * - GET  /api/applications/document?ref=...&docCode=... : propriétaire du dossier ou personnel FNPSS ;
 *   la pièce est récupérée, déchiffrée côté serveur et restituée en PDF (lecture tracée).
 */
import { applicationEngine } from '../../../../workflow/application-engine.mjs';
import { requireActor, isStaff, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';
import {
  resolveCloudinaryConfig,
  uploadEncryptedPdfToCloudinary,
  downloadAndDecryptPdfFromCloudinary
} from '../../../../storage/cloudinary-storage.mjs';
import { REQUIRED_DOCUMENTS_METADATA } from '../../../../domain/services-catalog.mjs';

export const dynamic = 'force-dynamic';

const MAX_RAW_BYTES = 3 * 1024 * 1024;

function isStorageActive() {
  if (process.env.NODE_TEST_CONTEXT || process.env.FNPSS_DISABLE_STORAGE === 'true') return false;
  const c = resolveCloudinaryConfig();
  return Boolean(c.cloudName && c.apiKey && c.apiSecret && c.encryptionKeyHex);
}

export async function POST(request) {
  try {
    const actor = requireActor(request);
    if (actor.role !== 'REQUERANT') {
      throw new HttpError(403, 'RBAC: Seul un requérant peut téléverser une pièce justificative.');
    }
    const body = await readJson(request);
    const docCode = String(body.docCode || '');
    if (!REQUIRED_DOCUMENTS_METADATA[docCode]) {
      throw new HttpError(400, `Code de pièce inconnu : ${docCode}`);
    }
    if (typeof body.fileBase64 !== 'string' || !body.fileBase64) {
      throw new HttpError(400, 'Contenu du fichier (fileBase64) requis.');
    }
    if (!isStorageActive()) {
      return Response.json({ success: true, stored: false, reason: 'STORAGE_NOT_CONFIGURED' });
    }

    const cleanB64 = body.fileBase64.includes(',') ? body.fileBase64.split(',').pop() : body.fileBase64;
    const pdfBuffer = Buffer.from(cleanB64, 'base64');
    if (pdfBuffer.length > MAX_RAW_BYTES) {
      throw new HttpError(413, 'Pièce trop volumineuse (3 Mo maximum par fichier).');
    }

    const uploaded = await uploadEncryptedPdfToCloudinary(pdfBuffer, {
      fileName: String(body.fileName || `${docCode}.pdf`),
      publicId: `${actor.id}_${docCode}_${Date.now()}`
    });

    return Response.json({
      success: true,
      stored: true,
      docCode,
      storageKey: uploaded.storageKey,
      cloudinaryUrl: uploaded.secureUrl,
      sha256Hash: uploaded.sha256Hash,
      sizeBytes: uploaded.originalByteSize,
      cipherAlgorithm: uploaded.cipherAlgorithm
    }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');
    const docCode = searchParams.get('docCode');
    if (!ref || !docCode) {
      throw new HttpError(400, 'Paramètres ref et docCode requis.');
    }

    const app = applicationEngine.getApplication(ref);
    if (app.ownerId !== actor.id && !isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès à la pièce réservé au propriétaire ou au personnel FNPSS.');
    }
    const doc = (app.attachedDocuments || []).find(d => d.docCode === docCode);
    if (!doc || !doc.cloudinaryUrl) {
      throw new HttpError(404, 'Pièce introuvable ou non stockée sur Cloudinary.');
    }

    const { pdfBuffer, fileName } = await downloadAndDecryptPdfFromCloudinary(doc.cloudinaryUrl);
    applicationEngine._logAudit(actor, 'DOCUMENT_VIEWED', ref, { docCode, storageKey: doc.storageKey });
    await persistToNeon();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName || `${docCode}.pdf`}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return errorResponse(err);
  }
}

