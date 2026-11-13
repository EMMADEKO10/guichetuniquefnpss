import { authService } from '../../../../auth/auth-service.mjs';
import { requireActor, errorResponse, readJson } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/staff — liste du personnel FNPSS (ADMIN uniquement). */
export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    return Response.json({ success: true, staff: authService.listStaff(actor) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/admin/staff — création d'un compte du personnel (ADMIN uniquement). */
export async function POST(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const body = await readJson(request);
    const user = authService.createStaffAccount(actor, {
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role
    });
    await persistToNeon();
    return Response.json({ success: true, user }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

