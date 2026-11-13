import { authService } from '../../../../auth/auth-service.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';

export async function POST(request) {
  try {
    await hydrateFromNeon();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: 'Email et mot de passe requis.' },
        { status: 400 }
      );
    }

    const session = await authService.login(email, password);
    await persistToNeon();
    if (!session || !session.success) {
      return Response.json(
        { error: session?.message || 'Identifiants invalides.' },
        { status: 401 }
      );
    }

    const isSecure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const cookieVal = `fnpss_session_token=${encodeURIComponent(session.sessionToken)}; Path=/; Max-Age=28800; SameSite=Lax${isSecure}`;

    return new Response(JSON.stringify({
      success: true,
      sessionToken: session.sessionToken,
      user: session.user
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieVal
      }
    });
  } catch (err) {
    return Response.json(
      { error: 'Erreur interne du serveur lors de la connexion.' },
      { status: 500 }
    );
  }
}

