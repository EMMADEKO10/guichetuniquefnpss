/**
 * @fileoverview Client Blockchain EVM réel (ethers v6) pour le Smart Contract `FNPSSRegistry.sol`
 * déployé sur Polygon Amoy Testnet (Chain ID 80002) et Polygon PoS Mainnet (Chain ID 137).
 * - Lectures publiques sans clé privée (`verifyDocumentOnChain`, `getHashByCertificateNumberOnChain`, `getPolygonNetworkStatus`)
 * - Écritures Relayer (`registerDocumentOnChain`, `coSignDocumentOnChain`, `revokeDocumentOnChain`) lorsque `RELAYER_PRIVATE_KEY` est configuré.
 */

import { ethers } from 'ethers';

export const FNPSS_REGISTRY_ABI = [
  'function admin() view returns (address)',
  'function paused() view returns (bool)',
  'function totalRegistered() view returns (uint256)',
  'function totalRevoked() view returns (uint256)',
  'function isRegistrar(address) view returns (bool)',
  'function isRevoker(address) view returns (bool)',
  'function isMinistrySigner(address) view returns (bool)',
  'function registerDocument(bytes32 docHash, string certificateNumber, uint8 serviceCode, uint64 expiresAt) external',
  'function coSignDocument(bytes32 docHash) external',
  'function revokeDocument(bytes32 docHash, string reason) external',
  'function getHashByCertificateNumber(string certificateNumber) external view returns (bytes32)',
  'function verifyDocument(bytes32 docHash) external view returns (bool isValid, bool isExpired, uint8 status, tuple(string certificateNumber, uint8 serviceCode, uint64 issuedAt, uint64 expiresAt, uint8 status, address issuer, address ministryCoSigner, uint64 revokedAt, string revocationReason) record)'
];

const ZERO_BYTES32 = '0x' + '00'.repeat(32);

export function resolvePolygonConfig(env = process.env) {
  const networkKey = (env.BLOCKCHAIN_NETWORK || 'polygon-amoy').trim().toLowerCase();
  const isMainnet = networkKey === 'polygon-mainnet' || networkKey === '137';
  const rpcUrl = (
    isMainnet
      ? env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com'
      : env.POLYGON_AMOY_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com'
  ).trim();
  const contractAddress = (env.FNPSS_REGISTRY_CONTRACT_ADDRESS || '').trim();
  const relayerPrivateKey = (env.RELAYER_PRIVATE_KEY || '').trim();
  const chainId = isMainnet ? 137 : 80002;
  const explorerUrl = isMainnet ? 'https://polygonscan.com' : 'https://amoy.polygonscan.com';

  const hasValidContract =
    /^0x[a-fA-F0-9]{40}$/.test(contractAddress) &&
    contractAddress !== '0x0000000000000000000000000000000000000000';

  const hasValidRelayerKey = /^(0x)?[a-fA-F0-9]{64}$/.test(relayerPrivateKey);

  return {
    networkKey: isMainnet ? 'polygon-mainnet' : 'polygon-amoy',
    chainId,
    rpcUrl,
    explorerUrl,
    contractAddress,
    hasValidContract,
    hasValidRelayerKey,
    relayerPrivateKey: hasValidRelayerKey
      ? (relayerPrivateKey.startsWith('0x') ? relayerPrivateKey : `0x${relayerPrivateKey}`)
      : ''
  };
}

export function isPolygonRuntimeEnabled(env = process.env) {
  if (env.NODE_TEST_CONTEXT || env.FNPSS_DISABLE_RPC === 'true') return false;
  return resolvePolygonConfig(env).hasValidContract;
}

function createProvider(rpcUrl, chainId) {
  return new ethers.JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
}

/**
 * Calcule des frais EIP-1559 compatibles avec le plancher minimum Polygon Amoy (>= 25-30 Gwei priority fee).
 */
async function buildPolygonGasOverrides(provider) {
  const feeData = await provider.getFeeData();
  const minPriority = ethers.parseUnits('30', 'gwei');
  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minPriority
      ? feeData.maxPriorityFeePerGas
      : minPriority;
  const baseMax = feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei');
  const maxFeePerGas = baseMax > maxPriorityFeePerGas ? baseMax : maxPriorityFeePerGas + ethers.parseUnits('20', 'gwei');
  return { maxPriorityFeePerGas, maxFeePerGas };
}

/**
 * Lit les statistiques en direct du Smart Contract sur Polygon Amoy/Mainnet.
 */
export async function getPolygonNetworkStatus(env = process.env) {
  const cfg = resolvePolygonConfig(env);
  if (!cfg.hasValidContract || env.NODE_TEST_CONTEXT || env.FNPSS_DISABLE_RPC === 'true') {
    return { enabled: false, mode: 'SIMULATED', networkKey: cfg.networkKey, chainId: cfg.chainId };
  }

  try {
    const provider = createProvider(cfg.rpcUrl, cfg.chainId);
    const contract = new ethers.Contract(cfg.contractAddress, FNPSS_REGISTRY_ABI, provider);
    const [blockNumber, paused, totalRegistered, totalRevoked] = await Promise.all([
      provider.getBlockNumber(),
      contract.paused(),
      contract.totalRegistered(),
      contract.totalRevoked()
    ]);

    let relayerAddress = null;
    let relayerBalancePol = null;
    if (cfg.hasValidRelayerKey) {
      const wallet = new ethers.Wallet(cfg.relayerPrivateKey, provider);
      relayerAddress = wallet.address;
      const bal = await provider.getBalance(wallet.address);
      relayerBalancePol = Number(ethers.formatEther(bal));
    }

    return {
      enabled: true,
      mode: cfg.hasValidRelayerKey ? 'LIVE_READ_WRITE' : 'LIVE_READ_ONLY',
      networkKey: cfg.networkKey,
      chainId: cfg.chainId,
      rpcUrl: cfg.rpcUrl,
      contractAddress: cfg.contractAddress,
      explorerContractUrl: `${cfg.explorerUrl}/address/${cfg.contractAddress}`,
      blockNumber,
      paused,
      totalRegistered: Number(totalRegistered),
      totalRevoked: Number(totalRevoked),
      relayerAddress,
      relayerBalancePol
    };
  } catch (err) {
    return {
      enabled: false,
      mode: 'RPC_UNREACHABLE',
      networkKey: cfg.networkKey,
      chainId: cfg.chainId,
      error: err.message
    };
  }
}

/**
 * Vérifie directement un document sur le Smart Contract FNPSSRegistry déployé (0 gaz).
 * Accepte soit un hash `0x...` (bytes32) soit un numéro d'acte officiel (ex: `FNPSS-CEX-2026-00001`).
 */
export async function verifyDocumentOnChain(hashOrCertNumber, env = process.env) {
  if (!isPolygonRuntimeEnabled(env)) return null;
  const cfg = resolvePolygonConfig(env);
  const input = String(hashOrCertNumber || '').trim();
  if (!input) return null;

  try {
    const provider = createProvider(cfg.rpcUrl, cfg.chainId);
    const contract = new ethers.Contract(cfg.contractAddress, FNPSS_REGISTRY_ABI, provider);

    let docHash = input;
    if (!/^0x[a-fA-F0-9]{64}$/.test(input)) {
      docHash = await contract.getHashByCertificateNumber(input);
      if (!docHash || docHash === ZERO_BYTES32) {
        return { foundOnChain: false, docHash: null };
      }
    }

    const [isValid, isExpired, statusRaw, rec] = await contract.verifyDocument(docHash);
    const status = Number(statusRaw);
    if (status === 0) {
      return { foundOnChain: false, docHash };
    }

    const verdict = status === 2
      ? 'PASTILLE_ROUGE_REVOQUE'
      : isExpired
        ? 'PASTILLE_GRISE_EXPIRE'
        : 'PASTILLE_VERTE_VALIDE';

    return {
      foundOnChain: true,
      docHash,
      isValid: Boolean(isValid),
      isExpired: Boolean(isExpired),
      status,
      verdict,
      contractAddress: cfg.contractAddress,
      explorerUrl: `${cfg.explorerUrl}/address/${cfg.contractAddress}`,
      record: {
        certificateNumber: rec.certificateNumber,
        serviceCode: Number(rec.serviceCode),
        issuedAt: Number(rec.issuedAt),
        expiresAt: Number(rec.expiresAt),
        status,
        issuer: rec.issuer,
        ministryCoSigner: rec.ministryCoSigner,
        revokedAt: Number(rec.revokedAt),
        revocationReason: rec.revocationReason || ''
      }
    };
  } catch {
    return null;
  }
}

/**
 * Ancre réellement un document sur Polygon via le compte Relayer (`RELAYER_PRIVATE_KEY`).
 */
export async function registerDocumentOnChain({ docHash, certificateNumber, serviceCode, expiresAt = 0 }, env = process.env) {
  const cfg = resolvePolygonConfig(env);
  if (!isPolygonRuntimeEnabled(env) || !cfg.hasValidRelayerKey) {
    return { executedOnChain: false, reason: cfg.hasValidRelayerKey ? 'RPC_DISABLED' : 'RELAYER_PRIVATE_KEY_MISSING' };
  }

  const provider = createProvider(cfg.rpcUrl, cfg.chainId);
  const wallet = new ethers.Wallet(cfg.relayerPrivateKey, provider);
  const contract = new ethers.Contract(cfg.contractAddress, FNPSS_REGISTRY_ABI, wallet);
  const gasOverrides = await buildPolygonGasOverrides(provider);

  const tx = await contract.registerDocument(docHash, certificateNumber, Number(serviceCode), BigInt(expiresAt || 0), gasOverrides);
  const receipt = await tx.wait(1);
  return {
    executedOnChain: true,
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
    relayerAddress: wallet.address,
    explorerTxUrl: `${cfg.explorerUrl}/tx/${receipt.hash}`
  };
}

/**
 * Enregistre la co-signature ministérielle sur Polygon si le Relayer/signataire est configuré.
 */
export async function coSignDocumentOnChain({ docHash }, env = process.env) {
  const cfg = resolvePolygonConfig(env);
  if (!isPolygonRuntimeEnabled(env) || !cfg.hasValidRelayerKey) {
    return { executedOnChain: false, reason: 'RELAYER_PRIVATE_KEY_MISSING' };
  }

  const provider = createProvider(cfg.rpcUrl, cfg.chainId);
  const wallet = new ethers.Wallet(cfg.relayerPrivateKey, provider);
  const contract = new ethers.Contract(cfg.contractAddress, FNPSS_REGISTRY_ABI, wallet);
  const gasOverrides = await buildPolygonGasOverrides(provider);

  const tx = await contract.coSignDocument(docHash, gasOverrides);
  const receipt = await tx.wait(1);
  return {
    executedOnChain: true,
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
    explorerTxUrl: `${cfg.explorerUrl}/tx/${receipt.hash}`
  };
}

/**
 * Révoque réellement un certificat sur Polygon via le Relayer/Revoker configuré.
 */
export async function revokeDocumentOnChain({ docHash, reason }, env = process.env) {
  const cfg = resolvePolygonConfig(env);
  if (!isPolygonRuntimeEnabled(env) || !cfg.hasValidRelayerKey) {
    return { executedOnChain: false, reason: 'RELAYER_PRIVATE_KEY_MISSING' };
  }

  const provider = createProvider(cfg.rpcUrl, cfg.chainId);
  const wallet = new ethers.Wallet(cfg.relayerPrivateKey, provider);
  const contract = new ethers.Contract(cfg.contractAddress, FNPSS_REGISTRY_ABI, wallet);
  const gasOverrides = await buildPolygonGasOverrides(provider);

  const tx = await contract.revokeDocument(docHash, reason, gasOverrides);
  const receipt = await tx.wait(1);
  return {
    executedOnChain: true,
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
    explorerTxUrl: `${cfg.explorerUrl}/tx/${receipt.hash}`
  };
}

