/**
 * @fileoverview Couche de persistance Serverless PostgreSQL (Neon HTTPS SQL) pour Vercel.
 * Synchronise l'état complet des services applicatifs via `fnpss_runtime_snapshot`
 * et maintient à jour les tables relationnelles normalisées de `database/schema.sql`.
 */

import crypto from 'node:crypto';
import { authService, DEV_STAFF_ACCOUNTS } from '../auth/auth-service.mjs';
import { applicationEngine, Roles } from '../workflow/application-engine.mjs';
import { registrySimulator, resilientAnchorQueue } from '../blockchain/registry-simulator.mjs';
import { newsAndStatsService } from '../cms/news-and-stats.mjs';
import { offlinePwaSyncQueue } from '../pwa/offline-sync-queue.mjs';
import { paymentReconciliationLedger } from '../finance/payment-reconciliation.mjs';
import { resolvePolygonConfig } from './polygon-client.mjs';

let schemaReadyPromise = null;
let localSyncedVersion = 0;

function toDeterministicUuid(seed) {
  const hex = crypto.createHash('sha256').update(String(seed)).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    '8' + hex.slice(17, 20),
    hex.slice(20, 32)
  ].join('-');
}

function toHex64(value, fallbackSeed = '') {
  const clean = String(value || '').replace(/^0x/i, '').toLowerCase();
  if (/^[0-9a-f]{64}$/.test(clean)) return clean;
  return crypto.createHash('sha256').update(String(value || fallbackSeed)).digest('hex');
}

export function isNeonEnabled() {
  if (process.env.NODE_TEST_CONTEXT || process.env.FNPSS_DISABLE_DB === 'true') {
    return false;
  }
  const rawDbUrl = String(process.env.DATABASE_URL || '').trim();
  if (!rawDbUrl || rawDbUrl.includes('utilisateur:motdepasse')) {
    return false;
  }
  try {
    const parsed = new URL(rawDbUrl);
    if (!parsed.hostname || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return false;
    }
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

export async function neonSql(query, params = []) {
  const rawDbUrl = String(process.env.DATABASE_URL || '').trim();
  const dbHost = new URL(rawDbUrl).hostname;
  const res = await fetch(`https://${dbHost}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': rawDbUrl
    },
    body: JSON.stringify({ query, params })
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`Neon SQL HTTP ${res.status}: ${bodyText.slice(0, 240)}`);
  }
  return res.json();
}

export async function ensureNeonReady() {
  if (!isNeonEnabled()) return false;
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    await neonSql(`
      CREATE TABLE IF NOT EXISTS fnpss_runtime_snapshot (
        id INTEGER PRIMARY KEY,
        state JSONB NOT NULL,
        version BIGINT NOT NULL DEFAULT 1,
        last_synced_audit_id INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // S'assure que le statut REVOQUE existe dans l'ENUM PostgreSQL s'il a déjà été créé.
    try {
      await neonSql(`ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'REVOQUE'`);
    } catch {
      // Ignore si l'ENUM n'existe pas encore dans une base vierge
    }
    return true;
  })().catch((err) => {
    schemaReadyPromise = null;
    throw err;
  });

  return schemaReadyPromise;
}

function serializeRuntimeState() {
  const notifications = applicationEngine.notifications;

  const serializedApps = Array.from(applicationEngine.applications.entries()).map(([ref, app]) => {
    const clone = { ...app };
    if (clone.certificate) {
      const { pdfBuffer, ...certMeta } = clone.certificate;
      clone.certificate = certMeta;
    }
    return [ref, clone];
  });

  return {
    auth: {
      users: Array.from(authService.usersById.values()),
      revokedTokens: Array.from(authService.revokedTokens || []),
      resetTokens: Array.from(authService.resetTokens.entries()),
      authLogs: authService.authLogs,
      seq: authService.seq
    },
    engine: {
      applications: serializedApps,
      auditLogs: applicationEngine.auditLogs.map(entry => ({ ...entry, metadata: { ...(entry.metadata || {}) } })),
      seqCounter: applicationEngine.seqCounter
    },
    notifications: {
      inAppNotifications: notifications.inAppNotifications,
      emailOutbox: notifications.emailOutbox,
      broadcastHistory: notifications.broadcastHistory,
      dossierThreads: Array.from(notifications.dossierThreads.entries()),
      seq: notifications.seq
    },
    registry: {
      records: Array.from(registrySimulator.records.entries()),
      numberToHash: Array.from(registrySimulator.numberToHash.entries()),
      pdfHashToDocHash: Array.from(registrySimulator.pdfHashToDocHash.entries()),
      events: registrySimulator.events,
      paused: registrySimulator.paused
    },
    anchorQueue: {
      queue: Array.from(resilientAnchorQueue.queue.entries())
    },
    cms: {
      articles: Array.from(newsAndStatsService.articles.entries()),
      seq: newsAndStatsService.seq
    },
    pwa: {
      draftsByUser: Array.from(offlinePwaSyncQueue.draftsByUser.entries()),
      submissionsByKey: Array.from(offlinePwaSyncQueue.submissionsByKey.entries())
    },
    finance: {
      exchangeRateCdfPerUsd: paymentReconciliationLedger.exchangeRateCdfPerUsd,
      receiptsByPaymentRef: Array.from(paymentReconciliationLedger.receiptsByPaymentRef.entries()),
      receiptsByDossierRef: Array.from(paymentReconciliationLedger.receiptsByDossierRef.entries()),
      voucherSeq: paymentReconciliationLedger.voucherSeq
    }
  };
}

function applyRuntimeState(state) {
  if (!state || typeof state !== 'object') return;

  if (state.auth) {
    authService.usersById.clear();
    authService.usersByEmail.clear();
    for (const user of state.auth.users || []) {
      authService.usersById.set(user.id, user);
      authService.usersByEmail.set(String(user.email).toLowerCase(), user);
    }
    authService.revokedTokens = new Set(state.auth.revokedTokens || []);
    authService.resetTokens = new Map(state.auth.resetTokens || []);
    authService.authLogs = Array.isArray(state.auth.authLogs) ? state.auth.authLogs : [];
    authService.seq = Number.isFinite(state.auth.seq) ? state.auth.seq : authService.usersById.size + 1;

    authService.ensureBootstrapAdmin();

    if (process.env.FNPSS_ENABLE_DEMO_STAFF === 'true') {
      const staffPassword = process.env.FNPSS_DEV_STAFF_PASSWORD || 'StaffFNPSS#2026';
      for (const acc of DEV_STAFF_ACCOUNTS) {
        if (!authService.usersByEmail.has(acc.email)) {
          authService.registerUser({
            ...acc,
            password: staffPassword,
            organizationName: 'FNPSS - Direction Générale'
          });
        }
      }
    }
  }

  if (state.engine) {
    applicationEngine.applications = new Map(state.engine.applications || []);
    applicationEngine.auditLogs = (state.engine.auditLogs || []).map(entry =>
      Object.freeze({
        ...entry,
        metadata: Object.freeze({ ...(entry.metadata || {}) })
      })
    );
    applicationEngine.seqCounter = Number.isFinite(state.engine.seqCounter) ? state.engine.seqCounter : 1;
  }

  if (state.notifications && applicationEngine.notifications) {
    const nc = applicationEngine.notifications;
    nc.inAppNotifications = state.notifications.inAppNotifications || [];
    nc.emailOutbox = state.notifications.emailOutbox || [];
    nc.broadcastHistory = state.notifications.broadcastHistory || [];
    nc.dossierThreads = new Map(state.notifications.dossierThreads || []);
    nc.seq = Number.isFinite(state.notifications.seq) ? state.notifications.seq : 1;
  }

  if (state.registry) {
    registrySimulator.records = new Map(state.registry.records || []);
    registrySimulator.numberToHash = new Map(state.registry.numberToHash || []);
    registrySimulator.pdfHashToDocHash = new Map(state.registry.pdfHashToDocHash || []);
    registrySimulator.events = state.registry.events || [];
    registrySimulator.paused = Boolean(state.registry.paused);
  }

  if (state.anchorQueue) {
    resilientAnchorQueue.queue = new Map(
      Array.isArray(state.anchorQueue.queue) ? state.anchorQueue.queue : []
    );
  }

  if (state.cms) {
    newsAndStatsService.articles = new Map(state.cms.articles || []);
    newsAndStatsService.seq = Number.isFinite(state.cms.seq) ? state.cms.seq : 1;
  }

  if (state.pwa) {
    offlinePwaSyncQueue.draftsByUser = new Map(state.pwa.draftsByUser || []);
    offlinePwaSyncQueue.submissionsByKey = new Map(state.pwa.submissionsByKey || []);
  }

  if (state.finance) {
    paymentReconciliationLedger.exchangeRateCdfPerUsd = Number(state.finance.exchangeRateCdfPerUsd) || 2800;
    paymentReconciliationLedger.receiptsByPaymentRef = new Map(state.finance.receiptsByPaymentRef || []);
    paymentReconciliationLedger.receiptsByDossierRef = new Map(state.finance.receiptsByDossierRef || []);
    paymentReconciliationLedger.voucherSeq = Number.isFinite(state.finance.voucherSeq) ? state.finance.voucherSeq : 1;
  }
}

/**
 * Recharge l'état depuis Neon si la base contient une version plus récente que le worker courant.
 * Initialisation automatique du snapshot si la base est encore vierge.
 */
export async function hydrateFromNeon({ force = false } = {}) {
  if (!isNeonEnabled()) return { enabled: false, hydrated: false };

  await ensureNeonReady();
  const res = await neonSql(
    'SELECT state, version FROM fnpss_runtime_snapshot WHERE id = 1'
  );
  const row = res?.rows?.[0];

  if (!row) {
    const initialState = serializeRuntimeState();
    await neonSql(
      `INSERT INTO fnpss_runtime_snapshot (id, state, version, last_synced_audit_id)
       VALUES (1, $1::jsonb, 1, 0)
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(initialState)]
    );
    localSyncedVersion = 1;
    await syncNormalizedTablesToNeon();
    return { enabled: true, hydrated: false, seeded: true, version: localSyncedVersion };
  }

  const remoteVersion = Number(row.version) || 1;
  if (force || remoteVersion !== localSyncedVersion) {
    const parsedState = typeof row.state === 'string' ? JSON.parse(row.state) : row.state;
    applyRuntimeState(parsedState);
    localSyncedVersion = remoteVersion;
    return { enabled: true, hydrated: true, version: localSyncedVersion };
  }

  return { enabled: true, hydrated: false, upToDate: true, version: localSyncedVersion };
}

/**
 * Sauvegarde l'état courant dans Neon (snapshot + tables relationnelles normalisées).
 */
export async function persistToNeon() {
  if (!isNeonEnabled()) return { enabled: false, persisted: false };

  await ensureNeonReady();
  const snapshot = serializeRuntimeState();
  const res = await neonSql(
    `INSERT INTO fnpss_runtime_snapshot (id, state, version, updated_at)
     VALUES (1, $1::jsonb, 1, NOW())
     ON CONFLICT (id) DO UPDATE
       SET state = EXCLUDED.state,
           version = fnpss_runtime_snapshot.version + 1,
           updated_at = NOW()
     RETURNING version, last_synced_audit_id`,
    [JSON.stringify(snapshot)]
  );
  const row = res?.rows?.[0];
  localSyncedVersion = Number(row?.version) || (localSyncedVersion + 1);
  const lastSyncedAuditId = Number(row?.last_synced_audit_id) || 0;

  try {
    await syncNormalizedTablesToNeon(lastSyncedAuditId);
  } catch (err) {
    console.warn('[Neon Normalized Sync Warning]', err?.message || err);
  }

  return { enabled: true, persisted: true, version: localSyncedVersion };
}

async function syncNormalizedTablesToNeon(lastSyncedAuditId = 0) {
  const tblCheck = await neonSql(`SELECT to_regclass('public.users') AS tbl`);
  if (!tblCheck?.rows?.[0]?.tbl) {
    return;
  }

  const dbUserIdByRuntimeId = new Map();
  const dbOrgIdByOwnerRuntimeId = new Map();
  let fallbackStaffUuid = null;

  for (const user of authService.usersById.values()) {
    const candidateUuid = toDeterministicUuid(`user:${user.email}`);
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const upsertUser = await neonSql(
      `INSERT INTO users (id, email, password_hash, google_id, wallet_address, full_name, phone, role, is_active)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::user_role, $9)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             google_id = COALESCE(EXCLUDED.google_id, users.google_id),
             wallet_address = COALESCE(EXCLUDED.wallet_address, users.wallet_address),
             full_name = EXCLUDED.full_name,
             phone = COALESCE(EXCLUDED.phone, users.phone),
             role = EXCLUDED.role,
             is_active = EXCLUDED.is_active,
             updated_at = NOW()
       RETURNING id`,
      [
        candidateUuid,
        user.email,
        user.passwordHash || null,
        user.googleSub || null,
        user.walletAddress || null,
        fullName,
        user.phone || null,
        user.role || Roles.REQUERANT,
        user.status !== 'SUSPENDED'
      ]
    );
    const dbUserId = upsertUser?.rows?.[0]?.id || candidateUuid;
    dbUserIdByRuntimeId.set(user.id, dbUserId);
    if ([Roles.DG, Roles.ADMIN, Roles.CHEF_DIVISION, Roles.AGENT].includes(user.role)) {
      fallbackStaffUuid = dbUserId;
    }

    const orgUuid = toDeterministicUuid(`org:${user.id}:${user.organizationName || user.email}`);
    await neonSql(
      `INSERT INTO organizations (id, owner_user_id, legal_name, org_type, province, address, legal_representative)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE
         SET legal_name = EXCLUDED.legal_name,
             province = EXCLUDED.province,
             address = EXCLUDED.address,
             legal_representative = EXCLUDED.legal_representative`,
      [
        orgUuid,
        dbUserId,
        user.organizationName || 'Organisation Requérante',
        'ONG / ASBL',
        user.province || 'Kinshasa',
        user.address || 'Kinshasa, RDC',
        fullName
      ]
    );
    dbOrgIdByOwnerRuntimeId.set(user.id, orgUuid);
  }

  const polygonCfg = resolvePolygonConfig();

  for (const app of applicationEngine.applications.values()) {
    const ownerUuid = dbUserIdByRuntimeId.get(app.ownerId) || fallbackStaffUuid;
    const orgUuid = dbOrgIdByOwnerRuntimeId.get(app.ownerId);
    if (!ownerUuid || !orgUuid) continue;

    const appUuid = toDeterministicUuid(`app:${app.referenceNumber}`);
    const reason = app.rejectionReason || app.complementReason || null;
    await neonSql(
      `INSERT INTO applications (
         id, reference_number, organization_id, service_code, submitted_by,
         project_title, project_summary, goods_metadata, status, rejection_or_complement_reason,
         submitted_at, sla_started_at, sla_due_at, updated_at
       )
       VALUES (
         $1::uuid, $2, $3::uuid, $4, $5::uuid,
         $6, $7, $8::jsonb, $9::application_status, $10,
         $11::timestamptz, $12::timestamptz, $13::timestamptz, NOW()
       )
       ON CONFLICT (reference_number) DO UPDATE
         SET project_title = EXCLUDED.project_title,
             project_summary = EXCLUDED.project_summary,
             goods_metadata = EXCLUDED.goods_metadata,
             status = EXCLUDED.status,
             rejection_or_complement_reason = EXCLUDED.rejection_or_complement_reason,
             sla_started_at = EXCLUDED.sla_started_at,
             sla_due_at = EXCLUDED.sla_due_at,
             updated_at = NOW()`,
      [
        appUuid,
        app.referenceNumber,
        orgUuid,
        app.serviceCode,
        ownerUuid,
        app.projectTitle || 'Demande FNPSS',
        app.goodsSummary || app.projectTitle || 'Demande Guichet Unique FNPSS',
        JSON.stringify({ uploadedDocTypes: app.uploadedDocTypes || [], attachedCount: (app.attachedDocuments || []).length }),
        app.status || 'SOUMIS',
        reason,
        app.approvalSteps?.[0]?.timestamp || new Date().toISOString(),
        app.slaStartedAt || null,
        app.slaDueAt || null
      ]
    );

    if (app.paymentReference) {
      const payUuid = toDeterministicUuid(`pay:${app.referenceNumber}`);
      const payStatus = app.paymentValidated ? 'VALIDE' : 'PREUVE_DEPOSEE';
      await neonSql(
        `INSERT INTO payments (id, application_id, payment_channel, transaction_reference, status, validated_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5::payment_status, $6::timestamptz)
         ON CONFLICT (application_id) DO UPDATE
           SET transaction_reference = EXCLUDED.transaction_reference,
               status = EXCLUDED.status,
               validated_at = COALESCE(EXCLUDED.validated_at, payments.validated_at)`,
        [
          payUuid,
          appUuid,
          'QUITTANCE_BANCAIRE',
          app.paymentReference,
          payStatus,
          app.paymentValidated ? new Date().toISOString() : null
        ]
      );
    }

    if (app.certificate && app.certificate.certificateNumber) {
      const certUuid = toDeterministicUuid(`cert:${app.certificate.certificateNumber}`);
      const issuedByUuid = fallbackStaffUuid || ownerUuid;
      const pdfShaHex = toHex64(app.certificate.pdfSha256 || app.certificate.docHash, app.certificate.certificateNumber);
      const certStatus = app.certificate.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE';

      await neonSql(
        `INSERT INTO certificates (
           id, application_id, certificate_number, service_code, pdf_storage_key,
           pdf_sha256_hash, qr_verification_url, issued_by, issued_at, expires_at, status, revocation_reason
         )
         VALUES (
           $1::uuid, $2::uuid, $3, $4, $5,
           $6, $7, $8::uuid, $9::timestamptz, $10::timestamptz, $11::certificate_status, $12
         )
         ON CONFLICT (application_id) DO UPDATE
           SET pdf_storage_key = EXCLUDED.pdf_storage_key,
               pdf_sha256_hash = EXCLUDED.pdf_sha256_hash,
               status = EXCLUDED.status,
               revocation_reason = EXCLUDED.revocation_reason`,
        [
          certUuid,
          appUuid,
          app.certificate.certificateNumber,
          app.serviceCode,
          app.certificate.storageKey || app.certificate.certificateNumber,
          pdfShaHex,
          app.certificate.verificationUrl || `https://guichetuniquefnpss.vercel.app/verifier?cert=${encodeURIComponent(app.certificate.certificateNumber)}`,
          issuedByUuid,
          app.certificate.issuedAtIso || new Date().toISOString(),
          app.certificate.expiresAtIso || null,
          certStatus,
          app.certificate.revocationReason || null
        ]
      );

      const anchorUuid = toDeterministicUuid(`anchor:${app.certificate.certificateNumber}`);
      const txStatus = app.certificate.onChainMode === 'POLYGON_AMOY_LIVE' || app.certificate.txHash ? 'CONFIRMED' : 'QUEUED';
      await neonSql(
        `INSERT INTO blockchain_anchors (
           id, certificate_id, network, contract_address, tx_hash, block_number, tx_status, confirmed_at
         )
         VALUES (
           $1::uuid, $2::uuid, $3, $4, $5, $6, $7::anchor_tx_status, $8::timestamptz
         )
         ON CONFLICT (certificate_id) DO UPDATE
           SET tx_hash = COALESCE(EXCLUDED.tx_hash, blockchain_anchors.tx_hash),
               block_number = COALESCE(EXCLUDED.block_number, blockchain_anchors.block_number),
               tx_status = EXCLUDED.tx_status,
               confirmed_at = COALESCE(EXCLUDED.confirmed_at, blockchain_anchors.confirmed_at)`,
        [
          anchorUuid,
          certUuid,
          polygonCfg.network,
          polygonCfg.contractAddress,
          app.certificate.txHash || null,
          app.certificate.blockNumber || null,
          txStatus,
          txStatus === 'CONFIRMED' ? new Date().toISOString() : null
        ]
      );
    }
  }

  // Synchronise uniquement les nouvelles entrées d'audit vers PostgreSQL
  const newAuditEntries = applicationEngine.auditLogs.filter(entry => entry.id > lastSyncedAuditId);
  if (newAuditEntries.length > 0) {
    let maxId = lastSyncedAuditId;
    for (const entry of newAuditEntries) {
      const actorUuid = dbUserIdByRuntimeId.get(entry.actorId) || null;
      await neonSql(
        `INSERT INTO audit_logs (actor_user_id, actor_role, action, target_type, target_id, metadata, created_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)`,
        [
          actorUuid,
          entry.actorRole || null,
          entry.action,
          'DOSSIER',
          entry.targetId || 'SYSTEM',
          JSON.stringify(entry.metadata || {}),
          entry.timestamp || new Date().toISOString()
        ]
      );
      if (entry.id > maxId) maxId = entry.id;
    }
    await neonSql(
      'UPDATE fnpss_runtime_snapshot SET last_synced_audit_id = $1 WHERE id = 1',
      [maxId]
    );
  }
}
