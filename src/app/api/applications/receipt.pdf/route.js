import { applicationEngine } from '../../../../workflow/application-engine.mjs';
import { requireActor, isStaff, errorResponse, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon } from '../../../../infra/neon-persistence.mjs';
import { generateReceiptPdfBuffer } from '../../../../pdf/receipt-pdf-generator.mjs';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * GET /api/applications/receipt.pdf?ref=FNPSS/DEM/2026/00001
 * Téléchargement de l'Accusé de Réception PDF charté (propriétaire du dossier ou personnel FNPSS uniquement).
 */
export async function GET(request) {
  try {
    await hydrateFromNeon({ force: true });
    const actor = requireActor(request);
    const { searchParams } = new URL(request.url);
    const ref = (searchParams.get('ref') || '').trim();
    if (!ref) {
      throw new HttpError(400, 'Référence du dossier (?ref=...) requise.');
    }

    const app = applicationEngine.getApplication(ref);
    if (app.ownerId !== actor.id && !isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès refusé à l\'accusé de réception d\'autrui.');
    }

    const pdfBuffer = generateReceiptPdfBuffer(app, {
      baseUrl: process.env.PUBLIC_APP_BASE_URL || 'https://guichetuniquefnpss.vercel.app'
    });
    const safeRef = ref.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Accuse-${safeRef}.pdf"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return errorResponse(err);
  }
}
