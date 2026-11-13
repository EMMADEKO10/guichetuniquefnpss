/**
 * @fileoverview Route API Next.js — Déploiement et Vérification du Smart Contract `FNPSSRegistry.sol`
 * sur Polygon Amoy Testnet (`BLK-11`, Chain ID 80002) et Polygon PoS Mainnet (`BLK-12`, Chain ID 137).
 * - GET  /api/blockchain/deploy : réseaux configurés et dernier rapport de déploiement / smoke test
 * - POST /api/blockchain/deploy : déploie et vérifie le contrat (réservé à ADMIN / DG)
 */

import { POLYGON_NETWORKS, deployAndVerifyRegistryContract } from '../../../../blockchain/polygon-deployer.mjs';
import { productionTrainingManager } from '../../../../ops/production-training-manager.mjs';
import { Roles } from '../../../../workflow/application-engine.mjs';
import { requireActor, isStaff, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon } from '../../../../infra/neon-persistence.mjs';
import { getPolygonNetworkStatus } from '../../../../infra/polygon-client.mjs';

export const dynamic = 'force-dynamic';

let latestDeploymentReport = deployAndVerifyRegistryContract({
  networkKey: 'polygon-amoy',
  initialRelayerBalancePol: 25.0
});

export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    if (!isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès réservé au personnel habilité FNPSS.');
    }

    const liveContractStatus = await getPolygonNetworkStatus().catch(() => null);
    return Response.json({
      success: true,
      networks: POLYGON_NETWORKS,
      latestDeployment: latestDeploymentReport,
      liveContractStatus
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    if (![Roles.ADMIN, Roles.DG].includes(actor.role)) {
      throw new HttpError(403, 'RBAC: Seuls l\'Administrateur Système ou la Direction Générale peuvent déployer le Smart Contract.');
    }

    const body = await readJson(request);
    const networkKey = body.networkKey || 'polygon-amoy';
    // La validation de l'audit de sécurité Mainnet provient exclusivement de la configuration ou certification serveur
    const serverAuditPassed =
      process.env.FNPSS_MAINNET_AUDIT_PASSED === 'true' ||
      productionTrainingManager.isMainnetAuditCertified();

    const report = deployAndVerifyRegistryContract({
      networkKey,
      initialRelayerBalancePol: body.initialRelayerBalancePol !== undefined ? Number(body.initialRelayerBalancePol) : 25.0,
      auditPassed: serverAuditPassed
    });

    if (report.network?.isMainnet) {
      productionTrainingManager.recordMainnetDeployment(report);
    }
    latestDeploymentReport = report;
    return Response.json({
      success: true,
      deployment: report
    }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

