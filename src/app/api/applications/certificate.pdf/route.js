import { applicationEngine } from '../../../../workflow/application-engine.mjs';
import { requireActor, errorResponse, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/applications/certificate.pdf?ref=FNPSS/DEM/2026/00001 (REQ-09)
 * Téléchargement sécurisé et tracé de l'attestation PDF officielle (%PDF-1.4).
 * Accès réservé au propriétaire du dossier ou au personnel FNPSS habilité.
 */
export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');
    if (!ref) {
      throw new HttpError(400, 'Référence du dossier (?ref=...) requise.');
    }

    const { fileName, pdfBuffer, certificateStatus } = applicationEngine.downloadCertificate(actor, ref);
    await persistToNeon();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Certificate-Status': certificateStatus,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return errorResponse(err);
  }
}

