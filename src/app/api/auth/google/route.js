import { authService } from '../../../../auth/auth-service.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';
import {
  isSimulatedGoogleAllowed,
  resolveGoogleClientId,
  verifyGoogleIdToken
} from '../../../../infra/google-auth.mjs';
import { buildSessionCookie } from '../../../../server/api-auth.mjs';

/**
 * Route API Google OAuth 2.0 avec Web3Auth Account Abstraction (REQ-02, BLK-02, BLK-03)
 * - `credential` : jeton d'identité Google vérifié côté serveur (mode réel).
 * - `googleEmail` : mode simulé (développement / tests uniquement, jamais en production par défaut).
 */
export async function POST(request) {
  try {
    await hydrateFromNeon();
    const body = await request.json();
    let { googleEmail, givenName, familyName } = body;
    const { organizationName, province } = body;

    if (body.credential) {
      const verified = await verifyGoogleIdToken(body.credential);
      googleEmail = verified.email;
      givenName = verified.givenName || givenName;
      familyName = verified.familyName || familyName;
    } else {
      if (!googleEmail) {
        return Response.json({ error: 'Email Google OAuth requis.' }, { status: 400 });
      }
      if (!isSimulatedGoogleAllowed()) {
        return Response.json(
          {
            error: resolveGoogleClientId()
              ? 'Connexion Google : un jeton Google vérifié est requis (mode simulé désactivé).'
              : 'Connexion Google non configurée sur ce serveur.'
          },
          { status: 403 }
        );
      }
    }

    const session = authService.loginWithGoogleOAuth({
      googleEmail,
      givenName,
      familyName,
      organizationName,
      province
    });

    await persistToNeon();
    return new Response(
      JSON.stringify({
        success: true,
        sessionToken: session.sessionToken,
        user: session.user,
        walletAddress: session.user.walletAddress
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSessionCookie(session.sessionToken)
        }
      }
    );
  } catch (err) {
    return Response.json(
      { error: err.message || 'Erreur lors de la connexion Google OAuth.' },
      { status: 400 }
    );
  }
}
