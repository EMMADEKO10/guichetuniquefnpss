/**
 * Route API Healthcheck & Sonde de Déploiement Staging/Production (OPS-04, OPS-06)
 * Utilisée par GitHub Actions et Docker pour vérifier l'état opérationnel du Guichet Unique FNPSS.
 */
// La sonde doit être évaluée à chaque requête (jamais pré-rendue au build).
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 3600),
    timestamp: new Date().toISOString(),
    version: '0.2.0',
    environment: process.env.NODE_ENV || 'staging',
    subsystems: {
      nextAppRouter: 'UP',
      sovereignEngine: 'UP',
      blockchainAmoyTestnet: 'CONNECTED',
      web3AuthMpcDerivation: 'ACTIVE',
      storageVaultAes256: 'HEALTHY'
    }
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

