import { authService } from '../../../../auth/auth-service.mjs';

function extractToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const url = new URL(request.url);
  return url.searchParams.get('token') || '';
}

/**
 * Route API Profil de l'Organisation & Représentant Légal (REQ-04, BLK-03)
 */
export async function GET(request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return Response.json(
        { error: 'Session non authentifiée. Jeton Bearer requis.' },
        { status: 401 }
      );
    }

    const session = authService.authenticateSession(token);
    const user = authService.usersById.get(session.id);
    if (!user) {
      return Response.json(
        { error: 'Utilisateur introuvable.' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      user: authService._sanitizeUser(user)
    });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Session invalide ou expirée.' },
      { status: 401 }
    );
  }
}

export async function PUT(request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return Response.json(
        { error: 'Session non authentifiée. Jeton Bearer requis.' },
        { status: 401 }
      );
    }

    const session = authService.authenticateSession(token);
    const body = await request.json();

    const updatedUser = authService.updateOrganizationProfile(session.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      organizationName: body.organizationName,
      province: body.province,
      enrollmentNumber: body.enrollmentNumber
    });

    return Response.json({
      success: true,
      message: 'Profil de l\'organisation mis à jour avec succès.',
      user: updatedUser
    });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Erreur lors de la mise à jour du profil.' },
      { status: 400 }
    );
  }
}

