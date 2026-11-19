import { applicationEngine } from '../../../../workflow/application-engine.mjs';
import { requireActor, errorResponse, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * GET /api/applications/certificate.pdf?ref=FNPSS/DEM/2026/00001 (REQ-09)
 * Téléchargement sécurisé et tracé de l'attestation PDF officielle (%PDF-1.4).
 * Accès réservé au propriétaire du dossier ou au personnel FNPSS habilité.
 */
export async function GET(request) {
  try {
    await hydrateFromNeon({ force: true });
    const actor = requireActor(request);
    const { searchParams } = new URL(request.url);
    let ref = (searchParams.get('ref') || searchParams.get('cert') || '').trim();
    if (!ref) {
      throw new HttpError(400, 'Référence du dossier (?ref=...) requise.');
    }

    if (!applicationEngine.applications.has(ref)) {
      for (const [appRef, app] of applicationEngine.applications.entries()) {
        if (app?.certificate?.certificateNumber === ref) {
          ref = appRef;
          break;
        }
      }
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

