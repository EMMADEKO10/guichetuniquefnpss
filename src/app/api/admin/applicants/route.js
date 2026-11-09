import { authService } from '../../../../auth/auth-service.mjs';
import { applicationEngine, assertPermission } from '../../../../workflow/application-engine.mjs';
import { requireActor, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/applicants (ADM-03)
 * Liste filtrable des comptes requérants avec le nombre de dossiers déposés.
 * Accès réservé au rôle ADMIN (MANAGE_USERS).
 */
export async function GET(request) {
  try {
    const actor = requireActor(request);
    assertPermission(actor, 'MANAGE_USERS');

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const search = (searchParams.get('q') || '').trim().toLowerCase();

    const applicants = authService
      .listApplicants()
      .filter(u => {
        if (statusFilter && u.status !== statusFilter) return false;
        if (search) {
          const hay = `${u.organizationName} ${u.email} ${u.firstName} ${u.lastName}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      })
      .map(u => {
        const apps = applicationEngine.listApplications({ ownerId: u.id });
        return { ...u, applicationsCount: apps.length };
      });

    return Response.json({ success: true, total: applicants.length, applicants });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * PUT /api/admin/applicants (ADM-03)
 * Activation ou suspension motivée d'un compte requérant par l'administrateur.
 */
export async function PUT(request) {
  try {
    const actor = requireActor(request);
    const body = await readJson(request);
    if (!body.userId || !body.status) {
      throw new HttpError(400, 'userId et status (ACTIVE | SUSPENDED) requis.');
    }
    const updated = authService.setApplicantAccountStatus(
      actor,
      body.userId,
      body.status,
      body.reason || ''
    );
    return Response.json({ success: true, user: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

