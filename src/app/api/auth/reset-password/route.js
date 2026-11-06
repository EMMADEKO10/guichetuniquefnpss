import { authService } from '../../../../auth/auth-service.mjs';

/**
 * Route API Confirmation de Réinitialisation de Mot de Passe (REQ-03)
 * Valide le jeton à usage unique et enregistre le nouveau mot de passe haché par scrypt.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token) {
      return Response.json(
        { error: 'Jeton de réinitialisation requis.' },
        { status: 400 }
      );
    }

    if (!newPassword || String(newPassword).length < 8) {
      return Response.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      );
    }

    const updatedUser = authService.confirmPasswordReset(token, newPassword);

    return Response.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
      user: updatedUser
    });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Lien de réinitialisation invalide ou expiré.' },
      { status: 400 }
    );
  }
}
