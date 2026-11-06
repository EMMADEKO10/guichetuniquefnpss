import { authService } from '../../../../auth/auth-service.mjs';

/**
 * Route API Google OAuth 2.0 avec Web3Auth Account Abstraction (REQ-02, BLK-02, BLK-03)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { googleEmail, givenName, familyName, organizationName, province } = body;

    if (!googleEmail) {
      return Response.json(
        { error: 'Email Google OAuth requis.' },
        { status: 400 }
      );
    }

    const session = authService.loginWithGoogleOAuth({
      googleEmail,
      givenName,
      familyName,
      organizationName,
      province
    });

    return Response.json({
      success: true,
      sessionToken: session.sessionToken,
      user: session.user,
      walletAddress: session.user.walletAddress
    });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Erreur lors de la connexion Google OAuth.' },
      { status: 400 }
    );
  }
}
