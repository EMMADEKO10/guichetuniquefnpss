import { authService } from '../../../../auth/auth-service.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';
import { sendSmtpEmail } from '../../../../infra/smtp-mailer.mjs';

/**
 * Route API Demande de Réinitialisation de Mot de Passe (REQ-03)
 * Répond toujours avec un message neutre ne révélant pas si l'email existe.
 */
export async function POST(request) {
  try {
    await hydrateFromNeon();
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Response.json(
        { error: 'Adresse email requise.' },
        { status: 400 }
      );
    }

    const result = authService.requestPasswordReset(email);
    await persistToNeon();

    if (result._devResetToken) {
      await sendSmtpEmail({
        to: email,
        subject: '[Guichet Unique FNPSS] Réinitialisation de votre mot de passe',
        text: `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe sur le Guichet Unique FNPSS.\nCode/Jeton de réinitialisation (valide 30 min) : ${result._devResetToken}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`
      }).catch(() => null);
    }

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

