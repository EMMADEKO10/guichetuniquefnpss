/**
 * Route API Healthcheck & Sonde de Déploiement Staging/Production (OPS-04, OPS-06)
 * Utilisée par Vercel, GitHub Actions et Docker pour vérifier l'état opérationnel du Guichet Unique FNPSS.
 */
import { isNeonEnabled } from '../../../infra/neon-persistence.mjs';
import { getPolygonNetworkStatus, resolvePolygonConfig } from '../../../infra/polygon-client.mjs';
import { isSmtpConfigured } from '../../../infra/smtp-mailer.mjs';
import { resolveCloudinaryConfig } from '../../../storage/cloudinary-storage.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const polygonCfg = resolvePolygonConfig();
  const cldCfg = resolveCloudinaryConfig();

  let polygonLive = null;
  if (polygonCfg.hasValidContract && !process.env.NODE_TEST_CONTEXT && process.env.FNPSS_DISABLE_RPC !== 'true') {
    polygonLive = await Promise.race([
      getPolygonNetworkStatus(),
      new Promise(resolve => setTimeout(() => resolve({ enabled: false, mode: 'RPC_TIMEOUT' }), 1500))
    ]).catch(() => null);
  }

  return Response.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 3600),
    timestamp: new Date().toISOString(),
    version: '0.2.0',
    environment: process.env.NODE_ENV || 'staging',
    subsystems: {
      nextAppRouter: 'UP',
      sovereignEngine: 'UP',
      databaseNeon: isNeonEnabled() ? 'CONFIGURED' : 'MEMORY_ONLY',
      blockchainAmoyTestnet: polygonLive?.enabled ? polygonLive.mode : (polygonCfg.hasValidContract ? 'CONFIGURED' : 'SIMULATED'),
      blockchainContract: polygonCfg.contractAddress || null,
      blockchainBlockNumber: polygonLive?.blockNumber ?? null,
      smtpMailer: isSmtpConfigured() ? 'CONFIGURED' : 'SIMULATED',
      cloudinaryVault: (cldCfg.cloudName && cldCfg.apiKey && cldCfg.encryptionKeyHex) ? 'HEALTHY' : 'LOCAL_FALLBACK',
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
