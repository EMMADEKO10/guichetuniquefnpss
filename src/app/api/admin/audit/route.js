import { applicationEngine, assertPermission } from '../../../../workflow/application-engine.mjs';
import { requireActor, errorResponse } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon } from '../../../../infra/neon-persistence.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit (ADM-07)
 * Consultation filtrée ou export CSV (?format=csv) du journal d'audit immuable.
 * Accès réservé au rôle ADMIN (VIEW_AUDIT_LOGS).
 */
export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    assertPermission(actor, 'VIEW_AUDIT_LOGS');

    const { searchParams } = new URL(request.url);
    const filters = {
      actorId: searchParams.get('actorId') || null,
      actorRole: searchParams.get('actorRole') || null,
      action: searchParams.get('action') || null,
      targetId: searchParams.get('targetId') || null
    };

    if (searchParams.get('format') === 'csv') {
      const csv = applicationEngine.exportAuditLogsCsv(filters);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fnpss-audit-logs.csv"',
          'Cache-Control': 'no-store'
        }
      });
    }

    const logs = applicationEngine.queryAuditLogs(filters);
    return Response.json({ success: true, total: logs.length, logs });
  } catch (err) {
    return errorResponse(err);
  }
}

