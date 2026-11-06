import { authService } from '../../../../auth/auth-service.mjs';

function extractToken(request, bodyToken) {
  if (bodyToken) return bodyToken;
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const url = new URL(request.url);
  return url.searchParams.get('token') || '';
}

/**
 * Route API Déconnexion (REQ-04)
 * Invalide la session active côté serveur.
 */
export async function POST(request) {
  try {
    let bodyToken = null;
    try {
      const body = await request.json();
      bodyToken = body?.sessionToken;
    } catch {
      // Ignorer si le corps est vide
    }

    const token = extractToken(request, bodyToken);
    if (!token) {
      return Response.json(
        { error: 'Jeton de session manquant.' },
        { status: 400 }
      );
    }

    const result = authService.logout(token);
    return Response.json({
      success: true,
      message: 'Déconnexion réussie.',
      ...result
    });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Erreur lors de la déconnexion.' },
      { status: 500 }
    );
  }
}
