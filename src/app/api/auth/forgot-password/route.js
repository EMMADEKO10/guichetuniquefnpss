import { authService } from '../../../../auth/auth-service.mjs';

/**
 * Route API Demande de Réinitialisation de Mot de Passe (REQ-03)
 * Répond toujours avec un message neutre ne révélant pas si l'email existe.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Response.json(
        { error: 'Adresse email requise.' },
        { status: 400 }
      );
    }

    const result = authService.requestPasswordReset(email);

    return Response.json({
      success: true,
      message: result.message,
      // En mode développement uniquement
      ...(process.env.NODE_ENV !== 'production' && result._devResetToken ? { devToken: result._devResetToken } : {})
    });
  } catch (err) {
    return Response.json(
      { error: 'Erreur lors du traitement de la demande de réinitialisation.' },
      { status: 500 }
    );
  }
}

