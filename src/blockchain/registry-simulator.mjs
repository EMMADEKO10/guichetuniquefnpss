/**
 * @fileoverview Moteur de registre Blockchain & File d'attente résiliente (BLK-05, BLK-06, BLK-07, BLK-10, VER-03).
 * Implémente fidèlement la machine à états et les règles d'accès du Smart Contract `contracts/FNPSSRegistry.sol`.
 */

import crypto from 'node:crypto';

export const DocStatus = Object.freeze({
  NONE: 0,
  ACTIVE: 1,
  REVOKED: 2
});

export const CustomsBadgeVerdict = Object.freeze({
  GREEN_VALID: 'PASTILLE_VERTE_VALIDE',
  RED_FALSIFIED_OR_UNKNOWN: 'PASTILLE_ROUGE_FALSIFIE',
  RED_REVOKED: 'PASTILLE_ROUGE_REVOQUE',
  GRAY_EXPIRED: 'PASTILLE_GRISE_EXPIRE'
});

export class FNPSSRegistryContract {
  constructor(initialAdmin, initialRelayer = null) {
    if (!initialAdmin) {
      throw new Error('FNPSSRegistry: zero admin address');
    }
    this.admin = initialAdmin;
    this.paused = false;
    this.registrars = new Set([initialAdmin]);
    this.revokers = new Set([initialAdmin]);
    this.ministrySigners = new Set([initialAdmin]);

    if (initialRelayer) {
      this.registrars.add(initialRelayer);
      this.revokers.add(initialRelayer);
    }

    this.records = new Map();
    this.numberToHash = new Map();
    this.pdfHashToDocHash = new Map();
    this.events = [];
  }

  /**
   * Associe l'empreinte SHA-256 binaire du fichier PDF généré à l'empreinte canonique scellée (VER-04).
   */
  bindRenderedPdfHash(docHash, pdfSha256) {
    if (this.records.has(docHash) && pdfSha256) {
      this.pdfHashToDocHash.set(pdfSha256, docHash);
    }
  }

  _requireAdmin(caller) {
    if (caller !== this.admin) {
      throw new Error('FNPSSRegistry: caller is not admin');
    }
  }

  _requireNotPaused() {
    if (this.paused) {
      throw new Error('FNPSSRegistry: registry is paused');
    }
  }

  setRegistrar(caller, account, enabled) {
    this._requireAdmin(caller);
    if (enabled) this.registrars.add(account);
    else this.registrars.delete(account);
  }

  setRevoker(caller, account, enabled) {
    this._requireAdmin(caller);
    if (enabled) this.revokers.add(account);
    else this.revokers.delete(account);
  }

  setMinistrySigner(caller, account, enabled) {
    this._requireAdmin(caller);
    if (enabled) this.ministrySigners.add(account);
    else this.ministrySigners.delete(account);
  }

  setPaused(caller, pausedState) {
    this._requireAdmin(caller);
    this.paused = Boolean(pausedState);
  }

  /**
   * Ancre l'empreinte SHA-256 d'un acte officiel sur la blockchain (BLK-05).
   */
  registerDocument({
    caller,
    docHash,
    certificateNumber,
    serviceCode,
    expiresAt = 0,
    nowTimestamp = Math.floor(Date.now() / 1000)
  }) {
    this._requireNotPaused();
    if (!this.registrars.has(caller)) {
      throw new Error('FNPSSRegistry: caller is not registrar');
    }
    if (!docHash || !/^0x[0-9a-fA-F]{64}$/.test(docHash) || /^0x0{64}$/.test(docHash)) {
      throw new Error('FNPSSRegistry: invalid empty hash');
    }
    if (this.records.has(docHash)) {
      throw new Error('FNPSSRegistry: hash already registered');
    }
    if (!certificateNumber || typeof certificateNumber !== 'string') {
      throw new Error('FNPSSRegistry: empty certificate number');
    }
    if (!Number.isInteger(serviceCode) || serviceCode < 1 || serviceCode > 6) {
      throw new Error('FNPSSRegistry: serviceCode must be 1..6');
    }
    if (expiresAt !== 0 && expiresAt <= nowTimestamp) {
      throw new Error('FNPSSRegistry: expiration in the past');
    }

    const record = {
      certificateNumber,
      serviceCode,
      issuedAt: nowTimestamp,
      expiresAt,
      status: DocStatus.ACTIVE,
      issuer: caller,
      ministryCoSigner: null,
      revokedAt: 0,
      revocationReason: ''
    };

    this.records.set(docHash, record);
    this.numberToHash.set(certificateNumber, docHash);

    const txHash = '0x' + crypto.createHash('sha256')
      .update(`REGISTER|${docHash}|${certificateNumber}|${nowTimestamp}`)
      .digest('hex');

    this.events.push({
      event: 'DocumentRegistered',
      txHash,
      docHash,
      certificateNumber,
      serviceCode,
      issuedAt: nowTimestamp,
      expiresAt,
      issuer: caller
    });

    return { txHash, record: { ...record } };
  }

  /**
   * Contre-seing ministériel pour un acte conjoint S2 ou S6 (BLK-06).
   */
  coSignDocument({ caller, docHash, nowTimestamp = Math.floor(Date.now() / 1000) }) {
    this._requireNotPaused();
    if (!this.ministrySigners.has(caller)) {
      throw new Error('FNPSSRegistry: caller is not ministry signer');
    }
    const rec = this.records.get(docHash);
    if (!rec || rec.status !== DocStatus.ACTIVE) {
      throw new Error('FNPSSRegistry: document is not active');
    }
    if (rec.ministryCoSigner) {
      throw new Error('FNPSSRegistry: already co-signed');
    }
    rec.ministryCoSigner = caller;
    const txHash = '0x' + crypto.createHash('sha256')
      .update(`COSIGN|${docHash}|${caller}|${nowTimestamp}`)
      .digest('hex');

    this.events.push({
      event: 'DocumentCoSigned',
      txHash,
      docHash,
      certificateNumber: rec.certificateNumber,
      ministrySigner: caller,
      signedAt: nowTimestamp
    });
    return { txHash, record: { ...rec } };
  }

  /**
   * Révocation administrative immédiate d'un acte (BLK-07 / CU06).
   */
  revokeDocument({ caller, docHash, reason, nowTimestamp = Math.floor(Date.now() / 1000) }) {
    this._requireNotPaused();
    if (!this.revokers.has(caller)) {
      throw new Error('FNPSSRegistry: caller is not revoker');
    }
    const rec = this.records.get(docHash);
    if (!rec || rec.status !== DocStatus.ACTIVE) {
      throw new Error('FNPSSRegistry: document is not active');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('FNPSSRegistry: revocation reason required');
    }

    rec.status = DocStatus.REVOKED;
    rec.revokedAt = nowTimestamp;
    rec.revocationReason = reason.trim();

    const txHash = '0x' + crypto.createHash('sha256')
      .update(`REVOKE|${docHash}|${reason}|${nowTimestamp}`)
      .digest('hex');

    this.events.push({
      event: 'DocumentRevoked',
      txHash,
      docHash,
      certificateNumber: rec.certificateNumber,
      revokedAt: nowTimestamp,
      reason: rec.revocationReason,
      revokedBy: caller
    });

    return { txHash, record: { ...rec } };
  }

  /**
   * Vérification publique instantanée d'un QR Code ou d'un PDF en douane (VER-03, VER-04).
   */
  verifyDocument(docHash, nowTimestamp = Math.floor(Date.now() / 1000)) {
    const resolvedHash = this.records.has(docHash)
      ? docHash
      : (this.pdfHashToDocHash.get(docHash) || this.numberToHash.get(docHash) || docHash);
    const rec = this.records.get(resolvedHash);
    if (!rec) {
      return {
        isValid: false,
        isExpired: false,
        status: DocStatus.NONE,
        verdict: CustomsBadgeVerdict.RED_FALSIFIED_OR_UNKNOWN,
        record: null
      };
    }

    if (rec.status === DocStatus.REVOKED) {
      return {
        isValid: false,
        isExpired: false,
        status: DocStatus.REVOKED,
        verdict: CustomsBadgeVerdict.RED_REVOKED,
        record: { ...rec }
      };
    }

    const isExpired = rec.expiresAt !== 0 && nowTimestamp > rec.expiresAt;
    if (isExpired) {
      return {
        isValid: false,
        isExpired: true,
        status: DocStatus.ACTIVE,
        verdict: CustomsBadgeVerdict.GRAY_EXPIRED,
        record: { ...rec }
      };
    }

    return {
      isValid: true,
      isExpired: false,
      status: DocStatus.ACTIVE,
      verdict: CustomsBadgeVerdict.GREEN_VALID,
      record: { ...rec }
    };
  }
}

/**
 * File d'attente asynchrone et idempotente pour les transactions d'ancrage en cas de coupure réseau (BLK-10 / SC-04).
 */
export class ResilientAnchorQueue {
  constructor(registryContract, relayerAddress) {
    this.registry = registryContract;
    this.relayerAddress = relayerAddress;
    this.queue = new Map();
  }

  enqueue(job) {
    if (!job || !job.docHash) {
      throw new Error('Job docHash requis');
    }
    if (this.queue.has(job.docHash)) {
      return this.queue.get(job.docHash);
    }
    const entry = {
      ...job,
      status: 'QUEUED',
      attempts: 0,
      txHash: null,
      lastError: null
    };
    this.queue.set(job.docHash, entry);
    return entry;
  }

  flush(isNetworkOnline = true, nowTimestamp = Math.floor(Date.now() / 1000)) {
    const results = [];
    for (const entry of this.queue.values()) {
      if (entry.status === 'CONFIRMED') continue;
      entry.attempts += 1;

      if (!isNetworkOnline) {
        entry.lastError = 'NETWORK_OFFLINE_QUEUED';
        results.push({ ...entry });
        continue;
      }

      try {
        const res = this.registry.registerDocument({
          caller: this.relayerAddress,
          docHash: entry.docHash,
          certificateNumber: entry.certificateNumber,
          serviceCode: entry.serviceCode,
          expiresAt: entry.expiresAt || 0,
          nowTimestamp
        });
        entry.status = 'CONFIRMED';
        entry.txHash = res.txHash;
        entry.lastError = null;
      } catch (err) {
        entry.status = 'FAILED';
        entry.lastError = err.message;
      }
      results.push({ ...entry });
    }
    return results;
  }
}

export const registrySimulator = new FNPSSRegistryContract(
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222'
);
registrySimulator.setMinistrySigner(
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  true
);

export const resilientAnchorQueue = new ResilientAnchorQueue(
  registrySimulator,
  '0x2222222222222222222222222222222222222222'
);




