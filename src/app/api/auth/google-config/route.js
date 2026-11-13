import { isSimulatedGoogleAllowed, resolveGoogleClientId } from '../../../../infra/google-auth.mjs';

export const dynamic = 'force-dynamic';

/** Configuration publique de la connexion Google (l'identifiant client OAuth n'est pas un secret). */
export async function GET() {
  return Response.json({
    clientId: resolveGoogleClientId(),
    simulated: isSimulatedGoogleAllowed()
  });
}

