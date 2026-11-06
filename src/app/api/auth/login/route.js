import { authService } from '../../../../auth/auth-service.mjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: 'Email et mot de passe requis.' },
        { status: 400 }
      );
    }

    const session = await authService.login(email, password);
    if (!session || !session.success) {
      return Response.json(
        { error: session?.message || 'Identifiants invalides.' },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      sessionToken: session.sessionToken,
      user: session.user
    });
  } catch (err) {
    return Response.json(
      { error: 'Erreur interne du serveur lors de la connexion.' },
      { status: 500 }
    );
  }
}

