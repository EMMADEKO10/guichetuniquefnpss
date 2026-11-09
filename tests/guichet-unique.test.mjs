/**
 * @fileoverview Suite de tests automatisés du Guichet Unique FNPSS (BLK-08, SEC-01, SEC-02) :
 * - Tests unitaires du catalogue des 6 services, des frais (20$ + 300$) et du SLA de 10 jours ouvrables
 * - Tests cryptographiques SHA-256, chiffrement AES-256-GCM (OPS-05) et QR Code dynamique
 * - Tests exhaustifs du Smart Contract Registry (registerDocument, coSignDocument, revokeDocument, verifyDocument, RBAC, Pause)
 * - Tests de bout en bout des 5 scénarios opérationnels (SC-01 à SC-05)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  FNPSS_SERVICES,
  calculateServiceFees,
  validateRequiredDocuments,
  computeSlaDueDate,
  REQUIRED_DOCUMENTS_METADATA,
  getServiceSubmissionConfig
} from '../src/domain/services-catalog.mjs';

import {
  computeSha256Bytes32,
  encryptDocumentAtRest,
  decryptDocumentAtRest,
  sealOfficialAct
} from '../src/crypto/document-sealer.mjs';

import {
  DocStatus,
  CustomsBadgeVerdict,
  FNPSSRegistryContract,
  ResilientAnchorQueue
} from '../src/blockchain/registry-simulator.mjs';

import {
  Roles,
  GuichetUniqueEngine
} from '../src/workflow/application-engine.mjs';

import { generateOfficialPdfBuffer, OFFICIAL_ACT_TEMPLATES } from '../src/pdf/certificate-generator.mjs';
import { createGuichetServer } from '../src/server.mjs';
import { AuthService } from '../src/auth/auth-service.mjs';
import { NotificationCenter } from '../src/notifications/notification-center.mjs';
import { validateAndInspectPdfUpload, verifyUploadedPdfAgainstRegistry } from '../src/storage/document-upload-guard.mjs';
import { NewsAndStatsService } from '../src/cms/news-and-stats.mjs';
import { PartnerApiGateway } from '../src/security/partner-api-gateway.mjs';
import { OfflinePwaSyncQueue } from '../src/pwa/offline-sync-queue.mjs';
import { deployAndVerifyRegistryContract } from '../src/blockchain/polygon-deployer.mjs';
import {
  createEncryptedSystemBackup,
  restoreEncryptedSystemBackup,
  evaluateGoNoGoGates,
  PilotAndHypercareTracker
} from '../src/ops/backup-and-pilot-manager.mjs';
import {
  PaymentReconciliationLedger,
  detectPaymentChannel
} from '../src/finance/payment-reconciliation.mjs';
import { verifyAndPlanSqlMigrations } from '../src/database/migration-runner.mjs';
import { ROUTE_POLICY, AccessLevel, findRoutePolicy, authorizeRoute } from '../src/security/route-access-policy.mjs';
import {
  DecisionStatus,
  createDecisionRegister,
  recordCopilDecision,
  computeContrastRatio,
  auditPrototypeAccessibility,
  evaluateG1Gate
} from '../src/ops/g1-gate-reviewer.mjs';

const ADMIN_ADDR = '0x1000000000000000000000000000000000000001';
const RELAYER_ADDR = '0x2000000000000000000000000000000000000002';
const MINISTRY_ADDR = '0x3000000000000000000000000000000000000003';
const ATTACKER_ADDR = '0x9999999999999999999999999999999999999999';

test('1. Référentiel des 6 services (S1 à S6), frais (20$ + 300$) et SLA de 10 jours ouvrables', () => {
  assert.equal(Object.keys(FNPSS_SERVICES).length, 6);

  const feesS6 = calculateServiceFees('S6', 2800);
  assert.equal(feesS6.depositFeeUsd, 20);
  assert.equal(feesS6.inquiryFeeUsd, 300);
  assert.equal(feesS6.totalUsd, 320);
  assert.equal(feesS6.totalCdf, 896000);

  // Principe Once-Only : P2_ENROLEMENT auto-satisfait si l'ONG a déjà une attestation S1 active
  const checkWithoutOnceOnly = validateRequiredDocuments(
    'S6',
    ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'],
    false
  );
  assert.equal(checkWithoutOnceOnly.isValid, false);
  assert.deepEqual(checkWithoutOnceOnly.missingDocs, ['P2_ENROLEMENT']);

  const checkWithOnceOnly = validateRequiredDocuments(
    'S6',
    ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'],
    true
  );
  assert.equal(checkWithOnceOnly.isValid, true);

  // Calcul SLA : départ lundi 02/11/2026 + 10 jours ouvrables = lundi 16/11/2026 (saute 2 week-ends)
  const startMonday = new Date('2026-11-02T09:00:00Z');
  const dueDate = computeSlaDueDate(startMonday, 10, []);
  assert.equal(dueDate.toISOString().slice(0, 10), '2026-11-16');

  // Avec 1 jour férié (ex: 2026-11-11) -> décale au mardi 17/11/2026
  const dueDateWithHoliday = computeSlaDueDate(startMonday, 10, ['2026-11-11']);
  assert.equal(dueDateWithHoliday.toISOString().slice(0, 10), '2026-11-17');
});

test('2. Cryptographie Off-Chain : Hachage SHA-256 et Chiffrement au repos AES-256-GCM (OPS-05)', () => {
  const hash1 = computeSha256Bytes32('Contenu Officiel FNPSS');
  const hash2 = computeSha256Bytes32('Contenu Officiel FNPSS');
  const hashAltered = computeSha256Bytes32('Contenu Officiel FNPSS ');

  assert.match(hash1, /^0x[0-9a-f]{64}$/);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hashAltered);

  const keyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const secretPdfContent = Buffer.from('%PDF-1.7 Acte Officiel Exoneration ONG Espoir Nord-Kivu', 'utf8');
  const encrypted = encryptDocumentAtRest(secretPdfContent, keyHex);
  const decrypted = decryptDocumentAtRest(encrypted, keyHex);

  assert.deepEqual(decrypted, secretPdfContent);

  // Toute altération du ciphertext doit être rejetée par le tag d'authentification GCM
  const tamperedBundle = { ...encrypted, authTagHex: '00'.repeat(16) };
  assert.throws(() => decryptDocumentAtRest(tamperedBundle, keyHex));
});

test('3. Smart Contract FNPSSRegistry : Enregistrement, Co-signature, Révocation, Sécurité RBAC & Pause (BLK-05 à BLK-08)', () => {
  const registry = new FNPSSRegistryContract(ADMIN_ADDR, RELAYER_ADDR);
  registry.setMinistrySigner(ADMIN_ADDR, MINISTRY_ADDR, true);

  const sealed = sealOfficialAct({
    certificateNumber: 'FNPSS-EXO-2026-00124',
    serviceCode: 'S6',
    organizationName: 'ONG Espoir du Nord-Kivu',
    projectTitle: 'Cliniques mobiles Goma',
    goodsSummary: '2 Ambulances 4x4',
    issuedAtIso: '2026-11-02T10:00:00Z',
    expiresAtIso: '2027-11-02T10:00:00Z'
  });

  const nowTs = 1793613600;
  const expTs = nowTs + 365 * 86400;

  // Un compte non autorisé ne peut pas enregistrer un acte
  assert.throws(() => {
    registry.registerDocument({
      caller: ATTACKER_ADDR,
      docHash: sealed.docHash,
      certificateNumber: sealed.certificateNumber,
      serviceCode: 6,
      expiresAt: expTs,
      nowTimestamp: nowTs
    });
  }, /caller is not registrar/);

  // Enregistrement nominal par le Relayer FNPSS
  const regTx = registry.registerDocument({
    caller: RELAYER_ADDR,
    docHash: sealed.docHash,
    certificateNumber: sealed.certificateNumber,
    serviceCode: 6,
    expiresAt: expTs,
    nowTimestamp: nowTs
  });
  assert.match(regTx.txHash, /^0x[0-9a-f]{64}$/);

  // Interdiction des doublons de hash
  assert.throws(() => {
    registry.registerDocument({
      caller: RELAYER_ADDR,
      docHash: sealed.docHash,
      certificateNumber: 'FNPSS-EXO-2026-99999',
      serviceCode: 6,
      expiresAt: expTs,
      nowTimestamp: nowTs
    });
  }, /hash already registered/);

  // Contre-seing ministériel (BLK-06)
  registry.coSignDocument({ caller: MINISTRY_ADDR, docHash: sealed.docHash, nowTimestamp: nowTs + 60 });

  // Vérification en douane DGDA -> PASTILLE VERTE
  const checkValid = registry.verifyDocument(sealed.docHash, nowTs + 120);
  assert.equal(checkValid.isValid, true);
  assert.equal(checkValid.verdict, CustomsBadgeVerdict.GREEN_VALID);
  assert.equal(checkValid.record.ministryCoSigner, MINISTRY_ADDR);

  // Vérification après la date d'expiration -> PASTILLE GRISE
  const checkExpired = registry.verifyDocument(sealed.docHash, expTs + 10);
  assert.equal(checkExpired.isValid, false);
  assert.equal(checkExpired.isExpired, true);
  assert.equal(checkExpired.verdict, CustomsBadgeVerdict.GRAY_EXPIRED);

  // Coupe-circuit d'urgence (Pause) bloque les écritures
  registry.setPaused(ADMIN_ADDR, true);
  assert.throws(() => {
    registry.revokeDocument({ caller: ADMIN_ADDR, docHash: sealed.docHash, reason: 'Test pause' });
  }, /registry is paused/);
  registry.setPaused(ADMIN_ADDR, false);

  // Révocation administrative (CU06 / BLK-07) -> PASTILLE ROUGE
  registry.revokeDocument({
    caller: ADMIN_ADDR,
    docHash: sealed.docHash,
    reason: 'Usage détourné constaté par mission d\'inspection',
    nowTimestamp: nowTs + 300
  });
  const checkRevoked = registry.verifyDocument(sealed.docHash, nowTs + 400);
  assert.equal(checkRevoked.isValid, false);
  assert.equal(checkRevoked.status, DocStatus.REVOKED);
  assert.equal(checkRevoked.verdict, CustomsBadgeVerdict.RED_REVOKED);
});

test('4. Scénarios Opérationnels de bout en bout (SC-01 Nominal, SC-02 Complément, SC-03 Fraude, SC-04 Hors-ligne)', () => {
  const registry = new FNPSSRegistryContract(ADMIN_ADDR, RELAYER_ADDR);
  const engine = new GuichetUniqueEngine(registry, RELAYER_ADDR);

  const ongActor = { id: 'user-ong-1', role: Roles.REQUERANT };
  const agentActor = { id: 'user-agent-1', role: Roles.AGENT };
  const dgActor = { id: 'user-dg-1', role: Roles.DG };

  // SC-01 & SC-02 : Dépôt -> Validation frais -> Demande de complément -> Régularisation -> Approbation DG & Ancrage
  const submitted = engine.submitApplication(ongActor, {
    organizationName: 'ONG Espoir du Nord-Kivu',
    serviceCode: 'S4',
    projectTitle: 'Approvisionnement médical Kivu',
    goodsSummary: '500 Kits médicaux',
    uploadedDocTypes: ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'],
    paymentReference: 'RAWBANK-2026-0091',
    hasActiveS1Enrollment: true
  });
  assert.equal(submitted.status, 'SOUMIS');

  // Contrôle RBAC : l'ONG ne peut pas valider son propre paiement
  assert.throws(() => {
    engine.validatePaymentAndStartSla(ongActor, submitted.referenceNumber);
  }, /RBAC/);

  // Validation du paiement par l'agent
  const inInstruction = engine.validatePaymentAndStartSla(agentActor, submitted.referenceNumber);
  assert.equal(inInstruction.status, 'EN_COURS_INSTRUCTION');
  assert.equal(inInstruction.paymentValidated, true);

  // SC-02 : Demande de complément puis régularisation
  const pausedApp = engine.requestComplement(agentActor, submitted.referenceNumber, 'Signature manquante sur le rapport 2025');
  assert.equal(pausedApp.status, 'COMPLEMENT_REQUIS');
  assert.equal(pausedApp.slaPaused, true);

  const resumedApp = engine.provideComplement(ongActor, submitted.referenceNumber, 'P4_RAPPORT_SIGNE');
  assert.equal(resumedApp.status, 'EN_COURS_INSTRUCTION');
  assert.equal(resumedApp.slaPaused, false);

  // Approbation DG + Ancrage Blockchain
  const approvedApp = engine.approveAndSealCertificate(dgActor, submitted.referenceNumber, {
    issuedAtTimestamp: 1793613600,
    validityDays: 365
  });
  assert.equal(approvedApp.status, 'VALIDE_DELIVRE');
  assert.ok(approvedApp.certificate.docHash);

  // Contrôle Douanier DGDA nominal (SC-01) -> PASTILLE VERTE
  const dgdaNominal = registry.verifyDocument(approvedApp.certificate.docHash, 1793614000);
  assert.equal(dgdaNominal.verdict, CustomsBadgeVerdict.GREEN_VALID);

  // SC-03 : Tentative de falsification douanière (altération d'un caractère du PDF) -> PASTILLE ROUGE
  const fakeHash = computeSha256Bytes32(approvedApp.certificate.canonicalDocument + 'TAMPERED');
  const dgdaFraud = registry.verifyDocument(fakeHash, 1793614000);
  assert.equal(dgdaFraud.verdict, CustomsBadgeVerdict.RED_FALSIFIED_OR_UNKNOWN);

  // SC-04 : File d'attente résiliente hors-ligne puis synchronisation au retour du réseau (BLK-10)
  const queue = new ResilientAnchorQueue(registry, RELAYER_ADDR);
  const offlineDocHash = computeSha256Bytes32('Acte S3 émis pendant micro-coupure réseau');
  queue.enqueue({
    docHash: offlineDocHash,
    certificateNumber: 'FNPSS-BIE-2026-00777',
    serviceCode: 3,
    expiresAt: 0
  });

  // Tant que le réseau est coupé, la transaction reste en file sans perte
  const offlineAttempt = queue.flush(false);
  assert.equal(offlineAttempt[0].status, 'QUEUED');
  assert.equal(offlineAttempt[0].lastError, 'NETWORK_OFFLINE_QUEUED');

  // Dès le retour de la connexion, la transaction est ancrée sur Polygon
  const onlineAttempt = queue.flush(true, 1793615000);
  assert.equal(onlineAttempt[0].status, 'CONFIRMED');
  assert.equal(registry.verifyDocument(offlineDocHash, 1793615100).verdict, CustomsBadgeVerdict.GREEN_VALID);

  // Vérification du journal d'audit immuable (ADM-07)
  assert.equal(engine.auditLogs.length, 5);
});

test('5. Générateur PDF Officiel (%PDF-1.4) et API REST complète (VER-01, VER-02, VER-05)', async () => {
  const samplePdf = generateOfficialPdfBuffer({
    certificateNumber: 'FNPSS-EXO-2026-00999',
    serviceCode: 'S6',
    organizationName: 'ONG Espoir du Nord-Kivu',
    projectTitle: 'Cliniques mobiles Goma',
    goodsSummary: '2 Ambulances 4x4',
    issuedAtIso: '2026-11-02T10:00:00Z',
    expiresAtIso: '2027-11-02T10:00:00Z',
    docHash: '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    txHash: '0x3c7e92b14f08a6d5e219c847b3a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3',
    verificationUrl: 'https://guichet.fnpss.cd/verify?hash=0x7f83...'
  });

  const pdfText = samplePdf.toString('ascii');
  assert.ok(pdfText.startsWith('%PDF-1.4\n'));
  assert.ok(pdfText.endsWith('%%EOF\n'));
  assert.ok(pdfText.includes('FNPSS-EXO-2026-00999'));

  // Test du serveur HTTP et des routes REST E2E (via server.dispatch sans socket réseau)
  const server = createGuichetServer({ accessMode: 'DEMO_OPEN' });

  const healthRes = await server.dispatch({ method: 'GET', url: '/api/health' });
  assert.equal(healthRes.status, 200);
  const health = healthRes.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.totalApplications, 3);

  // Création d'un nouveau dossier via POST /api/applications
  const createRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications',
    body: {
      organizationName: 'Médecins d\'Afrique Kivu',
      serviceCode: 'S6',
      projectTitle: 'Hôpital de campagne Masisi',
      goodsSummary: '1 Unité chirurgicale mobile',
      paymentReference: 'RAWBANK-2026-55511',
      hasActiveS1Enrollment: true
    }
  });
  assert.equal(createRes.status, 201);
  const { application: createdApp } = createRes.json();
  assert.equal(createdApp.status, 'SOUMIS');

  // Validation des frais + Scellement Blockchain + Co-signature ministérielle D1
  const sealRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications/approve-seal',
    body: { referenceNumber: createdApp.referenceNumber }
  });
  assert.equal(sealRes.status, 200);
  const { application: sealedApp } = sealRes.json();
  assert.equal(sealedApp.status, 'VALIDE_DELIVRE');
  assert.equal(sealedApp.ministryCoSigned, true);
  assert.match(sealedApp.certificate.docHash, /^0x[0-9a-f]{64}$/);

  // Téléchargement du PDF officiel scellé
  const pdfRes = await server.dispatch({
    method: 'GET',
    url: `/api/applications/certificate.pdf?ref=${encodeURIComponent(createdApp.referenceNumber)}`
  });
  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers['content-type'], 'application/pdf');
  assert.ok(pdfRes.text().startsWith('%PDF-1.4'));

  // Vérification douanière DGDA par numéro de certificat
  const verifyRes = await server.dispatch({
    method: 'GET',
    url: `/api/verify?hash=${encodeURIComponent(sealedApp.certificate.certificateNumber)}`
  });
  const verifyJson = verifyRes.json();
  assert.equal(verifyJson.isValid, true);
  assert.equal(verifyJson.verdict, CustomsBadgeVerdict.GREEN_VALID);

  // Révocation administrative et re-vérification DGDA
  const revokeRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications/revoke',
    body: { referenceNumber: createdApp.referenceNumber, reason: 'Fraude documentaire avérée' }
  });
  assert.equal(revokeRes.status, 200);

  const verifyAfterRevoke = (await server.dispatch({
    method: 'GET',
    url: `/api/verify?hash=${sealedApp.certificate.docHash}`
  })).json();
  assert.equal(verifyAfterRevoke.isValid, false);
  assert.equal(verifyAfterRevoke.verdict, CustomsBadgeVerdict.RED_REVOKED);
});

test('6. Authentification Hybride Web2/Web3Auth, Google OAuth 2.0, Reset Mot de Passe & Administration ONG (REQ-01..04, BLK-02/03, ADM-03)', () => {
  const auth = new AuthService();

  // Inscription nominale (REQ-01) + dérivation automatique de portefeuille Web3Auth (BLK-03)
  const registered = auth.registerUser({
    email: 'secretariat@action-bukavu.cd',
    password: 'StrongPassword#2026',
    firstName: 'Chantal',
    lastName: 'Mirindi',
    organizationName: 'Action Sociale Bukavu',
    province: 'Sud-Kivu'
  });
  assert.match(registered.walletAddress, /^0x[0-9a-f]{40}$/);
  assert.equal(registered.status, 'ACTIVE');

  // Connexion réussie
  const loginOk = auth.loginWithEmail({ email: 'secretariat@action-bukavu.cd', password: 'StrongPassword#2026' });
  assert.ok(loginOk.sessionToken);

  // Verrouillage anti-brute-force au bout de 5 tentatives erronées
  for (let i = 0; i < 4; i++) {
    assert.throws(() => {
      auth.loginWithEmail({ email: 'secretariat@action-bukavu.cd', password: 'WrongPassword' });
    }, /Identifiants invalides/);
  }
  assert.throws(() => {
    auth.loginWithEmail({ email: 'secretariat@action-bukavu.cd', password: 'WrongPassword' });
  }, /verrouillé/);

  // Réinitialisation du mot de passe à usage unique (REQ-03)
  const resetReq = auth.requestPasswordReset('secretariat@action-bukavu.cd', 1000);
  assert.ok(resetReq._devResetToken);
  auth.confirmPasswordReset(resetReq._devResetToken, 'NewSecurePass#2027', 2000);

  // Le jeton à usage unique ne peut pas être réutilisé
  assert.throws(() => {
    auth.confirmPasswordReset(resetReq._devResetToken, 'AnotherPass#2027', 3000);
  }, /invalide ou expiré/);

  // Connexion Google OAuth 2.0 avec pré-remplissage nom/post-nom (REQ-02)
  const oauthSession = auth.loginWithGoogleOAuth({
    googleEmail: 'coord.ituri@gmail.com',
    givenName: 'Jean-Paul',
    familyName: 'Mbuyi',
    organizationName: 'Solidarité Ituri'
  });
  assert.equal(oauthSession.user.firstName, 'Jean-Paul');
  assert.equal(oauthSession.user.lastName, 'Mbuyi');
  assert.match(oauthSession.user.walletAddress, /^0x[0-9a-f]{40}$/);

  // Suspension d'un compte par l'administrateur FNPSS (ADM-03)
  const adminActor = { id: 'admin-1', role: Roles.ADMIN };
  const suspended = auth.setApplicantAccountStatus(adminActor, registered.id, 'SUSPENDED', 'Dossier frauduleux signalé');
  assert.equal(suspended.status, 'SUSPENDED');
  assert.throws(() => {
    auth.loginWithEmail({ email: 'secretariat@action-bukavu.cd', password: 'NewSecurePass#2027' });
  }, /suspendu/);
});

test('7. Centre de Notifications (Email & In-App), Messagerie de Dossier et 6 Gabarits PDF S1-S6 (NOT-01..04, VER-01)', () => {
  // Vérification des 6 gabarits normés S1 à S6
  for (const code of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']) {
    assert.ok(OFFICIAL_ACT_TEMPLATES[code]);
    const buf = generateOfficialPdfBuffer({
      serviceCode: code,
      certificateNumber: `FNPSS-${code}-2026-00001`,
      organizationName: 'ONG Test RDC'
    });
    assert.ok(buf.toString('ascii').includes(OFFICIAL_ACT_TEMPLATES[code].officialTitle));
  }

  const nc = new NotificationCenter();
  // Envoi avec serveur SMTP indisponible -> mis en file RETRY_QUEUED puis relancé (NOT-01)
  const evt = nc.notifyTransactionalEvent({
    userId: 'usr-0001',
    email: 'contact@espoir-kivu.org',
    eventType: 'APPLICATION_SUBMITTED',
    referenceNumber: 'FNPSS/DEM/2026/00100',
    details: { organizationName: 'ONG Espoir', serviceCode: 'S4' },
    smtpAvailable: false
  });
  assert.equal(evt.emailEntry.status, 'RETRY_QUEUED');
  assert.equal(nc.flushEmailRetryQueue(true), 1);
  assert.equal(nc.emailOutbox[0].status, 'SENT');

  // Marquage lu/non-lu dans le centre in-app (NOT-02)
  assert.equal(nc.getUserNotifications('usr-0001').unreadCount, 1);
  nc.markNotificationRead(evt.inApp.id, true);
  assert.equal(nc.getUserNotifications('usr-0001').unreadCount, 0);

  // Communication générale de l'administration (NOT-03)
  nc.sendBroadcastCommunication({
    senderId: 'admin-fnpss',
    subject: 'Clôture du dépôt des rapports annuels 2025',
    message: 'Toutes les ONG sont invitées à mettre à jour leur pièce P4 avant le 30 novembre.'
  });
  assert.equal(nc.getUserNotifications('usr-0001').unreadCount, 1);

  // Fil de discussion sur un dossier (NOT-04)
  nc.addDossierMessage({
    referenceNumber: 'FNPSS/DEM/2026/00100',
    authorId: 'agent-1',
    authorRole: Roles.AGENT,
    message: 'Merci de joindre la facture proforma signée.'
  });
  assert.equal(nc.getDossierMessages('FNPSS/DEM/2026/00100').length, 1);
});

test('8. Garde-fou Téléversement PDF Anti-Malware (REQ-07, OPS-05) & Vérification de Fichier PDF en Douane sans Scan QR (VER-04)', () => {
  const keyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const cleanPdf = generateOfficialPdfBuffer({
    serviceCode: 'S6',
    certificateNumber: 'FNPSS-EXO-2026-00500',
    organizationName: 'ONG Santé Kivu'
  });

  // Inspection nominale + chiffrement AES-256-GCM au repos
  const inspected = validateAndInspectPdfUpload(cleanPdf, {
    fileName: 'quittance_320usd.pdf',
    encryptionKeyHex: keyHex
  });
  assert.equal(inspected.isSafePdf, true);
  assert.equal(inspected.pdfVersion, '%PDF-1.4');
  assert.match(inspected.sha256Hash, /^0x[0-9a-f]{64}$/);
  assert.ok(inspected.encryptedAtRest.ciphertextBase64);

  // Rejet d'un fichier qui n'est pas un vrai PDF (%PDF- absent)
  assert.throws(() => {
    validateAndInspectPdfUpload(Buffer.from('MZ_executable_windows_renomme.pdf', 'utf8'));
  }, /Signature binaire invalide/);

  // Rejet d'un fichier dépassant la taille maximale autorisée
  assert.throws(() => {
    validateAndInspectPdfUpload(cleanPdf, { maxBytes: 100 });
  }, /dépasse la limite autorisée/);

  // Rejet d'un PDF contenant un script actif malveillant (/JavaScript ou /Launch)
  const maliciousPdf = Buffer.from('%PDF-1.4\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj\n%%EOF', 'utf8');
  assert.throws(() => {
    validateAndInspectPdfUpload(maliciousPdf);
  }, /Contenu actif potentiellement malveillant/);

  // Vérification d'un fichier PDF officiel téléversé contre le registre Blockchain (VER-04)
  const registry = new FNPSSRegistryContract(ADMIN_ADDR, RELAYER_ADDR);
  const engine = new GuichetUniqueEngine(registry, RELAYER_ADDR);
  const app = engine.submitApplication({ id: 'ong-1', role: Roles.REQUERANT }, {
    organizationName: 'ONG Santé Kivu',
    serviceCode: 'S4',
    projectTitle: 'Clinique mobile Rutshuru',
    goodsSummary: '1 Ambulance 4x4',
    uploadedDocTypes: ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'],
    paymentReference: 'RAWBANK-2026-777'
  });
  engine.validatePaymentAndStartSla({ id: 'ag-1', role: Roles.AGENT }, app.referenceNumber);
  engine.approveAndSealCertificate({ id: 'dg-1', role: Roles.DG }, app.referenceNumber, {
    issuedAtTimestamp: 1793613600,
    validityDays: 365
  });

  const storedApp = engine.getApplication(app.referenceNumber);
  const checkIntactPdf = verifyUploadedPdfAgainstRegistry(
    storedApp.certificate.pdfBuffer,
    registry,
    1793614000,
    { fileName: 'FNPSS-EXO.pdf' }
  );
  assert.equal(checkIntactPdf.isValid, true);
  assert.equal(checkIntactPdf.verdict, CustomsBadgeVerdict.GREEN_VALID);

  // Altération d'un seul octet dans le fichier PDF -> rejet immédiat PASTILLE_ROUGE_FALSIFIE
  const tamperedPdf = Buffer.concat([storedApp.certificate.pdfBuffer, Buffer.from(' ', 'ascii')]);
  const checkTamperedPdf = verifyUploadedPdfAgainstRegistry(tamperedPdf, registry, 1793614000);
  assert.equal(checkTamperedPdf.isValid, false);
  assert.equal(checkTamperedPdf.verdict, CustomsBadgeVerdict.RED_FALSIFIED_OR_UNKNOWN);
});

test('9. CMS des Actualités FNPSS (REQ-13, ADM-10), Tableau de Bord Statistique (ADM-09) & Routes REST Jour 3', async () => {
  const cms = new NewsAndStatsService();
  assert.equal(cms.listPublishedNews().length, 3);

  // Contrôle RBAC : un requérant ne peut pas publier une actualité officielle
  assert.throws(() => {
    cms.createNewsArticle({ id: 'ong-1', role: Roles.REQUERANT }, {
      title: 'Fausse annonce',
      summary: 'Non autorisé'
    });
  }, /RBAC/);

  const adminActor = { id: 'admin-1', role: Roles.ADMIN };
  const createdNews = cms.createNewsArticle(adminActor, {
    title: 'Ouverture du guichet provincial de Lubumbashi',
    summary: 'accompagnement de proximité pour les ONG du Haut-Katanga et du Lualaba.'
  });
  assert.equal(cms.listPublishedNews().length, 4);

  cms.setNewsPublishedState(adminActor, createdNews.id, false);
  assert.equal(cms.listPublishedNews().length, 3);
  assert.equal(cms.listAllNews(adminActor).length, 4);

  // Tests E2E des nouvelles routes REST dans src/server.mjs via server.dispatch
  const server = createGuichetServer({ accessMode: 'DEMO_OPEN' });

  const statsRes = await server.dispatch({ method: 'GET', url: '/api/stats' });
  assert.equal(statsRes.status, 200);
  const { stats } = statsRes.json();
  assert.equal(stats.totals.totalApplications, 3);
  assert.equal(stats.financials.validatedPaymentsCount, 2);
  assert.equal(stats.financials.totalCollectedFeesUsd, 640); // 2 dossiers validés * (20$ + 300$)

  const newsGetRes = await server.dispatch({ method: 'GET', url: '/api/news' });
  assert.equal(newsGetRes.status, 200);
  assert.equal(newsGetRes.json().articles.length, 3);

  const newsPostRes = await server.dispatch({
    method: 'POST',
    url: '/api/news',
    body: {
      title: 'Campagne de contrôle de conformité 2026',
      summary: 'Vérification conjointe FNPSS - Ministère des Affaires Sociales.'
    }
  });
  assert.equal(newsPostRes.status, 201);

  // Route POST /api/verify-pdf (VER-04) : PDF intact vs PDF altéré d'1 octet
  const verifyPdfValidRes = await server.dispatch({
    method: 'POST',
    url: '/api/verify-pdf',
    body: { referenceNumber: 'FNPSS/DEM/2026/00002', tamperByte: false }
  });
  assert.equal(verifyPdfValidRes.status, 200);
  assert.equal(verifyPdfValidRes.json().verdict, CustomsBadgeVerdict.GREEN_VALID);

  const verifyPdfTamperedRes = await server.dispatch({
    method: 'POST',
    url: '/api/verify-pdf',
    body: { referenceNumber: 'FNPSS/DEM/2026/00002', tamperByte: true }
  });
  assert.equal(verifyPdfTamperedRes.status, 200);
  assert.equal(verifyPdfTamperedRes.json().verdict, CustomsBadgeVerdict.RED_FALSIFIED_OR_UNKNOWN);
});

test('10. Modification/Retrait avant instruction (REQ-08), Approbation Multi-Niveaux Chef de Division (ADM-08) & Double Confirmation Révocation (VER-06)', () => {
  const registry = new FNPSSRegistryContract(ADMIN_ADDR, RELAYER_ADDR);
  const engine = new GuichetUniqueEngine(registry, RELAYER_ADDR);
  const allDocs = ['P1_REQUETE', 'P2_ENROLEMENT', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'];

  const ongActor = { id: 'ong-1', role: Roles.REQUERANT };
  const agentActor = { id: 'agent-1', role: Roles.AGENT };
  const divChiefActor = { id: 'div-chief-1', role: Roles.CHEF_DIVISION };
  const dgActor = { id: 'dg-1', role: Roles.DG };

  // Création d'un dossier brouillon/soumis puis retrait avant instruction (REQ-08)
  const draftToWithdraw = engine.submitApplication(ongActor, {
    organizationName: 'ONG Action Kasaï',
    serviceCode: 'S3',
    projectTitle: 'Projet initial à retirer',
    uploadedDocTypes: allDocs,
    paymentReference: 'RAWBANK-001'
  });
  const withdrawn = engine.withdrawApplicationBeforeInstruction(ongActor, draftToWithdraw.referenceNumber);
  assert.equal(withdrawn.withdrawn, true);

  // Création d'un second dossier, modification avant instruction (REQ-08)
  const app = engine.submitApplication(ongActor, {
    organizationName: 'ONG Action Kasaï',
    serviceCode: 'S4',
    projectTitle: 'Forage solaire v1',
    goodsSummary: '5 pompes solaires',
    uploadedDocTypes: allDocs,
    paymentReference: 'RAWBANK-002'
  });
  const updated = engine.updateApplicationBeforeInstruction(ongActor, app.referenceNumber, {
    projectTitle: 'Forage solaire v2 (10 puits)',
    goodsSummary: '10 pompes solaires immergées'
  });
  assert.equal(updated.projectTitle, 'Forage solaire v2 (10 puits)');

  // Dès que le paiement est validé et l'instruction démarrée, toute modification ou suppression par l'ONG est bloquée (REQ-08)
  engine.validatePaymentAndStartSla(agentActor, app.referenceNumber);
  assert.throws(() => {
    engine.updateApplicationBeforeInstruction(ongActor, app.referenceNumber, { projectTitle: 'Interdit' });
  }, /Modification impossible/);
  assert.throws(() => {
    engine.withdrawApplicationBeforeInstruction(ongActor, app.referenceNumber);
  }, /Suppression impossible/);

  // Circuit d'approbation multi-niveaux (ADM-08) : avis favorable du Chef de Division avant signature DG
  const withOpinion = engine.emitDivisionChiefOpinion(divChiefActor, app.referenceNumber, {
    favorable: true,
    opinionNote: 'Dossier complet et conforme au plan d\'action annuel 2026'
  });
  assert.equal(withOpinion.divisionOpinion.favorable, true);

  engine.approveAndSealCertificate(dgActor, app.referenceNumber, { issuedAtTimestamp: 1793613600 });

  // VER-06 : la révocation échoue si doubleConfirmed est false
  assert.throws(() => {
    engine.revokeCertificate(dgActor, app.referenceNumber, 'Motif', { doubleConfirmed: false });
  }, /double confirmation/);

  const revoked = engine.revokeCertificate(dgActor, app.referenceNumber, 'Irrégularité douanière constatée', {
    doubleConfirmed: true
  });
  assert.deepEqual(revoked.certificate.regiesNotified, ['DGDA', 'DGRAD', 'DGI']);
  assert.equal(revoked.approvalSteps.length, 5); // Dépôt -> Paiement Agent -> Avis Chef Division -> Scellement DG -> Révocation DG
});

test('11. Passerelle API Partenaires DGDA/DGRAD/DGI (VER-05, SEC-04), File Hors-Ligne PWA Anti-Doublon (REQ-11) & Supervision 3G (OPS-06, REQ-12)', async () => {
  const gateway = new PartnerApiGateway();
  gateway.registerPartnerKey('test-low-quota-key', {
    partnerId: 'TEST_POSTE_FRONTIERE',
    institution: 'Poste Frontière Test',
    quotaPerMinute: 2
  });

  // 2 appels autorisés dans la même minute
  const call1 = gateway.authenticateAndRateLimitPartner({ apiKey: 'test-low-quota-key', nowMs: 60000 });
  assert.equal(call1.headers['X-RateLimit-Remaining'], '1');
  const call2 = gateway.authenticateAndRateLimitPartner({ apiKey: 'test-low-quota-key', nowMs: 60010 });
  assert.equal(call2.headers['X-RateLimit-Remaining'], '0');

  // 3e appel dans la même minute -> bloqué par Rate Limit 429
  assert.throws(() => {
    gateway.authenticateAndRateLimitPartner({ apiKey: 'test-low-quota-key', nowMs: 60020 });
  }, /Rate Limit 429/);

  // Clé API inconnue -> rejetée + alerte sécurité enregistrée
  assert.throws(() => {
    gateway.authenticateAndRateLimitPartner({ apiKey: 'invalid-hacker-key', nowMs: 60030 });
  }, /invalide ou révoquée/);

  // File d'attente hors-ligne PWA avec déduplication stricte (REQ-11)
  const server = createGuichetServer({ accessMode: 'DEMO_OPEN' });
  const payloadPwa = {
    organizationName: 'ONG Solidarité Ituri',
    serviceCode: 'S5',
    projectTitle: 'Programme philanthropique Bunia 2026',
    goodsSummary: 'Dotation scolaire',
    paymentReference: 'EQUITY-2026-ITURI-01',
    idempotencyKey: 'idem_ituri_bunia_2026_001'
  };

  // Premier envoi lors du retour de la 3G
  const sync1 = await server.dispatch({
    method: 'POST',
    url: '/api/pwa/sync',
    body: payloadPwa
  });
  assert.equal(sync1.status, 200);
  assert.equal(sync1.json().deduplicated, false);
  const createdRef = sync1.json().syncResult.referenceNumber;
  assert.ok(createdRef);

  // Second envoi identique (rebond réseau 3G) -> dédupliqué, aucun doublon créé !
  const sync2 = await server.dispatch({
    method: 'POST',
    url: '/api/pwa/sync',
    body: payloadPwa
  });
  assert.equal(sync2.status, 200);
  assert.equal(sync2.json().deduplicated, true);
  assert.equal(sync2.json().syncResult.referenceNumber, createdRef);

  // Vérification des en-têtes OWASP (SEC-04) et de la clé API DGDA (VER-05) sur GET /api/verify
  const dgdaVerifyRes = await server.dispatch({
    method: 'GET',
    url: '/api/verify?hash=FNPSS-EXO-2026-00124',
    headers: { 'X-API-Key': 'dgda-live-key-2026' }
  });
  assert.equal(dgdaVerifyRes.status, 200);
  assert.equal(dgdaVerifyRes.headers['x-content-type-options'], 'nosniff');
  assert.equal(dgdaVerifyRes.headers['x-frame-options'], 'DENY');
  assert.equal(dgdaVerifyRes.headers['x-ratelimit-limit'], '600');
  assert.equal(dgdaVerifyRes.json().partnerId, 'DGDA_SYDONIA_WORLD');

  // Supervision OPS-06 & Budget de performance 3G REQ-12
  const supRes = await server.dispatch({ method: 'GET', url: '/api/ops/supervision' });
  assert.equal(supRes.status, 200);
  const sup = supRes.json();
  assert.equal(sup.req12PerformanceBudget.withinBudget, true);
  assert.ok(sup.req12PerformanceBudget.estimated3gLoadSeconds < 3.0);
});

test('12. Déploiement & Vérification Smart Contract sur Polygon Amoy Testnet (BLK-11) et Garde Mainnet (BLK-12)', () => {
  // Rejet strict du testnet déprécié Polygon Mumbai (80001)
  assert.throws(() => {
    deployAndVerifyRegistryContract({ networkKey: 'polygon-mumbai' });
  }, /Mumbai \(80001\) est déprécié/);

  // Déploiement nominal et smoke test sur Polygon Amoy Testnet (Chain ID 80002 — BLK-11)
  const amoyReceipt = deployAndVerifyRegistryContract({
    networkKey: 'polygon-amoy',
    adminAddress: ADMIN_ADDR,
    relayerAddress: RELAYER_ADDR,
    ministrySignerAddress: MINISTRY_ADDR
  });
  assert.equal(amoyReceipt.network.chainId, 80002);
  assert.equal(amoyReceipt.sourceCodeVerified, true);
  assert.equal(amoyReceipt.smokeTest.passed, true);
  assert.equal(amoyReceipt.smokeTest.verdict, CustomsBadgeVerdict.GREEN_VALID);

  // Déploiement sur Polygon Mainnet (Chain ID 137) refusé si l'audit SEC-03 n'est pas validé (BLK-12)
  assert.throws(() => {
    deployAndVerifyRegistryContract({ networkKey: 'polygon-mainnet', auditPassed: false });
  }, /audit de sécurité/);

  // Déploiement sur Polygon Mainnet autorisé dès que auditPassed = true (BLK-12)
  const mainnetReceipt = deployAndVerifyRegistryContract({
    networkKey: 'polygon-mainnet',
    auditPassed: true,
    initialRelayerBalancePol: 250
  });
  assert.equal(mainnetReceipt.network.chainId, 137);
  assert.equal(mainnetReceipt.smokeTest.passed, true);
});

test('13. Sauvegarde/Restauration Chiffrée AES-256-GCM (OPS-05, DEP-01), Jalons Go/No-Go G1-G4 (DEP-02) & Cohorte Pilote Hypercare (DEP-06, DEP-07)', async () => {
  const server = createGuichetServer({ accessMode: 'DEMO_OPEN' });

  // Sauvegarde chiffrée AES-256-GCM via POST /api/ops/backup
  const backupRes = await server.dispatch({ method: 'POST', url: '/api/ops/backup', body: {} });
  assert.equal(backupRes.status, 200);
  const { backup } = backupRes.json();
  assert.equal(backup.cipherAlgorithm, 'AES-256-GCM');
  assert.equal(backup.counts.applications, 3);

  // Restauration avec vérification d'intégrité SHA-256 via POST /api/ops/restore
  const restoreRes = await server.dispatch({
    method: 'POST',
    url: '/api/ops/restore',
    body: { backup }
  });
  assert.equal(restoreRes.status, 200);
  const restored = restoreRes.json();
  assert.equal(restored.restored, true);
  assert.equal(restored.integrityVerified, true);
  assert.equal(restored.counts.applications, 3);

  // Évaluation Go/No-Go (DEP-02) et suivi Pilote/Hypercare (DEP-06, DEP-07)
  const goNoGoBlocked = evaluateGoNoGoGates({ smartContractAuditPassedG3: false });
  assert.equal(goNoGoBlocked.decision, 'NO_GO_BLOCKED');

  const goNoGoGreen = evaluateGoNoGoGates();
  assert.equal(goNoGoGreen.decision, 'GO_PRODUCTION');

  const tracker = new PilotAndHypercareTracker();
  const ticket = tracker.logHypercareIncident({
    reporterOrg: 'ONG Espoir du Nord-Kivu',
    severity: 'CRITICAL',
    summary: 'Question sur la lecture du QR Code au poste de Goma',
    openedAtMs: 100000
  });
  const resolvedTicket = tracker.resolveHypercareIncident(ticket.ticketId, {
    resolutionNote: 'Connectivité 3G vérifiée et scan validé en 1,1 seconde',
    resolvedAtMs: 100000 + 25 * 60000 // 25 minutes <= 120 minutes SLA
  });
  assert.equal(resolvedTicket.slaMet, true);
  assert.equal(tracker.getPilotStatusSummary().hypercareSlaCompliancePct, 100);

  const goNoGoApiRes = await server.dispatch({ method: 'GET', url: '/api/ops/go-nogo' });
  assert.equal(goNoGoApiRes.status, 200);
  assert.equal(goNoGoApiRes.json().gates.decision, 'GO_PRODUCTION');
  assert.equal(goNoGoApiRes.json().pilot.pilotCohortSize, 5);
});

test('14. Moteur de Réconciliation Comptable & Anti-Doublon des Quittances Bancaires / Mobile Money (GOV-11, REQ-10)', async () => {
  assert.equal(detectPaymentChannel('RAWBANK-CDF-2026-11204').code, 'RAWBANK');
  assert.equal(detectPaymentChannel('MPESA-24381-99001').code, 'MPESA');

  const ledger = new PaymentReconciliationLedger(2800);
  const r1 = ledger.registerPaymentReceipt({
    referenceNumber: 'FNPSS/DEM/2026/00901',
    organizationName: 'ONG Solidarité Kasaï',
    serviceCode: 'S4',
    paymentReference: 'RAWBANK-CDF-2026-88811'
  });
  assert.equal(r1.status, 'PENDING_VERIFICATION');
  assert.equal(r1.totalUsd, 320);
  assert.equal(r1.totalCdf, 896000);

  // Fraude ou doublon : tentative d'utiliser le même bordereau RAWBANK sur un autre dossier
  assert.throws(() => {
    ledger.registerPaymentReceipt({
      referenceNumber: 'FNPSS/DEM/2026/00902',
      organizationName: 'ONG Fraude Test',
      serviceCode: 'S6',
      paymentReference: 'rawbank-cdf-2026-88811'
    });
  }, /Fraude ou doublon détecté/);

  // Rapprochement par un agent comptable habilité
  const reconciled = ledger.reconcileAndValidateReceipt(
    { id: 'agent-compta-1', role: Roles.AGENT },
    'FNPSS/DEM/2026/00901',
    { bankStatementMatch: true, bankNote: 'Relevé Rawbank certifié' }
  );
  assert.equal(reconciled.status, 'RECONCILED_VALIDATED');
  assert.equal(reconciled.voucherNumber, 'BORD-FNPSS-2026-00001');

  const csv = ledger.exportLedgerCsv();
  assert.ok(csv.includes('BORD-FNPSS-2026-00001'));
  assert.ok(csv.includes('FNPSS/DEM/2026/00901'));

  // Test des routes REST GET /api/finance/ledger et POST /api/finance/reconcile
  const server = createGuichetServer({ accessMode: 'DEMO_OPEN' });
  const ledgerRes = await server.dispatch({ method: 'GET', url: '/api/finance/ledger' });
  assert.equal(ledgerRes.status, 200);
  assert.equal(ledgerRes.json().summary.validatedCount, 2);
  assert.equal(ledgerRes.json().summary.pendingCount, 1);

  const recRes = await server.dispatch({
    method: 'POST',
    url: '/api/finance/reconcile',
    body: {
      referenceNumber: 'FNPSS/DEM/2026/00003',
      bankStatementMatch: true,
      bankNote: 'Vérifié sur relevé EquityBCDC'
    }
  });
  assert.equal(recRes.status, 200);
  assert.equal(recRes.json().receipt.status, 'RECONCILED_VALIDATED');
  assert.equal(recRes.json().receipt.voucherNumber, 'BORD-FNPSS-2026-00003');
});

test('15. Profil Requérant & Déconnexion (REQ-04), Export CSV d\'Audit Filtré (ADM-07) & Vérificateur de Migrations SQL (OPS-03)', async () => {
  const server = createGuichetServer({ accessMode: 'DEMO_OPEN' });

  // Mise à jour du profil de l'ONG requérante (REQ-04)
  const profileRes = await server.dispatch({
    method: 'PUT',
    url: '/api/auth/profile',
    body: {
      userId: 'usr-0001',
      firstName: 'Marie-Claire',
      lastName: 'Kavira',
      phone: '+243 99 00 11 222'
    }
  });
  assert.equal(profileRes.status, 200);
  assert.equal(profileRes.json().user.firstName, 'Marie-Claire');
  assert.equal(profileRes.json().user.lastName, 'Kavira');

  // Déconnexion explicite d'une session JWT (REQ-04)
  const loginSession = server.auth.loginWithGoogleOAuth({
    googleEmail: 'coord.kasai@gmail.com',
    givenName: 'Paul',
    familyName: 'Tshisekedi',
    organizationName: 'ONG Action Kasaï'
  });
  const logoutRes = await server.dispatch({
    method: 'POST',
    url: '/api/auth/logout',
    body: { sessionToken: loginSession.sessionToken }
  });
  assert.equal(logoutRes.status, 200);
  assert.equal(logoutRes.json().loggedOut, true);

  // Filtre et export CSV du journal d'audit (ADM-07)
  const auditExportRes = await server.dispatch({
    method: 'GET',
    url: '/api/audit-logs/export?action=APPLICATION_SUBMITTED'
  });
  assert.equal(auditExportRes.status, 200);
  assert.equal(auditExportRes.json().entries.length, 3);
  assert.ok(auditExportRes.json().csv.includes('APPLICATION_SUBMITTED'));

  // Vérification des migrations SQL PostgreSQL 16 (OPS-03)
  const migReport = verifyAndPlanSqlMigrations();
  assert.equal(migReport.isValid, true);
  assert.equal(migReport.tablesCount, 10);
  assert.equal(migReport.seededServices.length, 6);
  assert.equal(migReport.migrations.length, 2);

  const migApiRes = await server.dispatch({ method: 'GET', url: '/api/ops/migrations' });
  assert.equal(migApiRes.status, 200);
  assert.equal(migApiRes.json().isValid, true);
  assert.equal(migApiRes.json().tablesCount, 10);
});








test('16. Revue du Jalon G1 : Registre des Décisions D1-D4, Audit d\'Accessibilité WCAG AA du Prototype & Verdict Sans Auto-Validation (GOV-09, UX-04, UX-05)', async () => {
  // Contraste WCAG : noir sur blanc = 21:1, gris clair sur blanc insuffisant
  assert.equal(computeContrastRatio('#000000', '#ffffff'), 21);
  assert.ok(computeContrastRatio('#cccccc', '#ffffff') < 4.5);

  // L'audit détecte un HTML inaccessible (pas de lang, pas de viewport, image sans alt)
  const badAudit = auditPrototypeAccessibility('<html><head><title>x</title></head><body><img src="a.png"></body></html>');
  assert.equal(badAudit.passed, false);
  const failedIds = badAudit.findings.filter(f => !f.ok).map(f => f.id);
  assert.ok(failedIds.includes('A11Y_LANG'));
  assert.ok(failedIds.includes('A11Y_VIEWPORT'));
  assert.ok(failedIds.includes('A11Y_IMG_ALT'));

  // Le prototype réel du projet passe l'audit automatisable
  const realGate = evaluateG1Gate();
  assert.equal(realGate.accessibility.passed, true);
  assert.deepEqual(realGate.blocking.missingEvidence, []);

  // Aucune décision n'est présumée tranchée : le code ne décide jamais à la place du COPIL
  assert.equal(realGate.verdict, 'PENDING_COPIL_DECISIONS');
  assert.deepEqual(realGate.blocking.openDecisions, ['D1', 'D2', 'D3', 'D4']);

  // Une décision exige un décideur nommé et un contenu
  const register = createDecisionRegister();
  assert.throws(() => recordCopilDecision(register, 'D1', { outcome: 'Palier 1' }), /décideur/);
  assert.throws(() => recordCopilDecision(register, 'D1', { decidedBy: 'DG FNPSS' }), /outcome/);
  assert.throws(() => recordCopilDecision(register, 'D9', { decidedBy: 'DG FNPSS', outcome: 'x' }), /inconnue/);

  for (const id of ['D1', 'D2', 'D3', 'D4']) {
    const d = recordCopilDecision(register, id, { decidedBy: 'COPIL FNPSS', outcome: `Décision ${id} validée` });
    assert.equal(d.status, DecisionStatus.DECIDED);
  }

  // Décisions closes mais PV non signé : prêt pour signature, pas validé
  const readyGate = evaluateG1Gate({ decisions: register, copilMinutesSigned: false });
  assert.equal(readyGate.verdict, 'READY_FOR_COPIL_SIGNATURE');

  // G1_PASSED uniquement avec le compte rendu signé
  const passedGate = evaluateG1Gate({ decisions: register, copilMinutesSigned: true });
  assert.equal(passedGate.verdict, 'G1_PASSED');

  // Preuve manquante : verdict bloqué même si les décisions sont closes
  const blockedGate = evaluateG1Gate({ rootDir: 'C:/dossier-inexistant-fnpss', decisions: register, copilMinutesSigned: true });
  assert.equal(blockedGate.verdict, 'BLOCKED_MISSING_EVIDENCE');

  // Route REST
  const server = createGuichetServer({ accessMode: 'DEMO_OPEN' });
  const res = await server.dispatch({ method: 'GET', url: '/api/ops/g1-gate' });
  assert.equal(res.status, 200);
  assert.equal(res.json().gate, 'G1');
  assert.equal(res.json().verdict, 'PENDING_COPIL_DECISIONS');
});


test('17. Contrôle d\'accès serveur par rôle et par route, anti-escalade, anti-IDOR, expiration de session (ADM-01, REQ-01, SEC-04)', async () => {
  const PW = 'Test#Passw0rd-2026';
  const server = createGuichetServer({ demoPassword: PW });
  assert.equal(server.accessMode, 'ENFORCED');
  assert.equal(server.generatedDemoPassword, null);

  const headersFor = (srv, email) => {
    const session = srv.auth.loginWithEmail({ email, password: PW });
    return { authorization: `Bearer ${session.sessionToken}` };
  };
  const agentH = headersFor(server, 'agent@fnpss.cd');
  const dgH = headersFor(server, 'dg@fnpss.cd');
  const ministryH = headersFor(server, 'ministere@tutelle.cd');
  const adminH = headersFor(server, 'admin@fnpss.cd');
  const customsH = headersFor(server, 'douane@dgda.cd');
  const espoirH = headersFor(server, 'contact@espoir-kivu.org');
  const kasaiH = headersFor(server, 'direction@solidarite-kasai.org');

  // Routes publiques accessibles sans jeton
  for (const url of ['/api/health', '/api/services', '/api/news']) {
    assert.equal((await server.dispatch({ method: 'GET', url })).status, 200);
  }

  // Routes protégées : 401 sans jeton
  for (const [method, url] of [
    ['GET', '/api/applications'],
    ['POST', '/api/applications/approve-seal'],
    ['GET', '/api/applicants'],
    ['POST', '/api/ops/backup'],
    ['GET', '/api/audit-logs']
  ]) {
    assert.equal((await server.dispatch({ method, url, body: method === 'POST' ? {} : null })).status, 401, `${method} ${url}`);
  }

  // Jeton falsifié : 401
  const forged = await server.dispatch({ method: 'GET', url: '/api/applications', headers: { authorization: 'Bearer abcdef0123456789' } });
  assert.equal(forged.status, 401);

  // Route inconnue : refusée (fail-closed)
  assert.equal((await server.dispatch({ method: 'GET', url: '/api/route-non-declaree' })).status, 404);

  // Anti-escalade : l'inscription publique ne permet jamais de choisir un rôle privilégié
  const registerRes = await server.dispatch({
    method: 'POST',
    url: '/api/auth/register',
    body: {
      email: 'pirate@example.org',
      password: 'MotDePasse#2026',
      firstName: 'Pirate',
      lastName: 'Test',
      organizationName: 'ONG Fictive',
      role: 'DG'
    }
  });
  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.json().user.role, 'REQUERANT');

  // Contrôle par rôle : 403 pour un rôle non autorisé
  const post = (url, headers, body = {}) => server.dispatch({ method: 'POST', url, headers, body });
  assert.equal((await post('/api/applications/approve-seal', espoirH)).status, 403);
  assert.equal((await post('/api/applications/approve-seal', agentH)).status, 403);
  assert.equal((await server.dispatch({ method: 'GET', url: '/api/applicants', headers: espoirH })).status, 403);
  assert.equal((await server.dispatch({ method: 'GET', url: '/api/applicants', headers: dgH })).status, 403);
  assert.equal((await post('/api/ops/backup', dgH)).status, 403);
  assert.equal((await post('/api/applications/validate-payment', espoirH)).status, 403);
  assert.equal((await post('/api/applications/cosign-ministry', dgH)).status, 403);
  assert.equal((await server.dispatch({ method: 'GET', url: '/api/applicants', headers: adminH })).status, 200);

  // Cloisonnement des dossiers : un requérant ne voit que les siens, jamais le journal d'audit global
  const kasaiList = (await server.dispatch({ method: 'GET', url: '/api/applications', headers: kasaiH })).json();
  assert.equal(kasaiList.applications.length, 0);
  assert.deepEqual(kasaiList.auditLogs, []);
  const espoirList = (await server.dispatch({ method: 'GET', url: '/api/applications', headers: espoirH })).json();
  assert.equal(espoirList.applications.length, 3);
  const agentList = (await server.dispatch({ method: 'GET', url: '/api/applications', headers: agentH })).json();
  assert.equal(agentList.applications.length, 3);
  assert.ok(agentList.auditLogs.length > 0);

  // Anti-IDOR : le PDF d'un dossier d'autrui est refusé, celui du propriétaire est servi
  const pdfUrl = '/api/applications/certificate.pdf?ref=FNPSS/DEM/2026/00001';
  assert.equal((await server.dispatch({ method: 'GET', url: pdfUrl, headers: kasaiH })).status, 403);
  const ownPdf = await server.dispatch({ method: 'GET', url: pdfUrl, headers: espoirH });
  assert.equal(ownPdf.status, 200);
  assert.ok(ownPdf.rawBuffer.toString('ascii', 0, 5) === '%PDF-');

  // Anti-IDOR : le profil modifié est toujours celui de la session, pas un userId fourni
  const espoirId = server.auth.usersByEmail.get('contact@espoir-kivu.org').id;
  const kasaiId = server.auth.usersByEmail.get('direction@solidarite-kasai.org').id;
  const profileRes = await server.dispatch({
    method: 'PUT',
    url: '/api/auth/profile',
    headers: kasaiH,
    body: { userId: espoirId, firstName: 'Usurpateur' }
  });
  assert.equal(profileRes.status, 200);
  assert.equal(profileRes.json().user.id, kasaiId);
  assert.equal(server.auth.usersById.get(espoirId).firstName, 'Amina');

  // Notifications : toujours celles de la session, le paramètre userId est ignoré
  const espoirNotifs = (await server.dispatch({ method: 'GET', url: '/api/notifications', headers: espoirH })).json();
  const spyNotifs = (await server.dispatch({ method: 'GET', url: `/api/notifications?userId=${espoirId}`, headers: kasaiH })).json();
  assert.ok(espoirNotifs.unreadCount > 0);
  assert.equal(spyNotifs.unreadCount, 0);

  // Parcours complet avec de vrais rôles : requérant -> agent -> DG -> ministère -> téléchargement
  const submitRes = await post('/api/applications', espoirH, {
    organizationName: 'ONG Espoir du Nord-Kivu',
    serviceCode: 'S6',
    projectTitle: 'Importation de 3 ambulances (parcours sécurisé)',
    goodsSummary: '3 ambulances 4x4',
    paymentReference: 'RAWBANK-ENF-2026-0001',
    hasActiveS1Enrollment: true
  });
  assert.equal(submitRes.status, 201);
  const newRef = submitRes.json().application.referenceNumber;
  assert.equal(submitRes.json().application.ownerId, espoirId);

  // Le DG ne peut pas sceller avant la validation du paiement par un agent (aucune étape n'est exécutée à sa place)
  assert.equal((await post('/api/applications/approve-seal', dgH, { referenceNumber: newRef })).status, 400);

  assert.equal((await post('/api/applications/validate-payment', agentH, { referenceNumber: newRef })).status, 200);
  assert.equal((await post('/api/applications/approve-seal', dgH, { referenceNumber: newRef })).status, 200);
  assert.equal((await post('/api/applications/cosign-ministry', ministryH, { referenceNumber: newRef, ministryReference: 'CAB/MIN-AS/2026/0150' })).status, 200);
  const downloadRes = await server.dispatch({ method: 'GET', url: `/api/applications/certificate.pdf?ref=${newRef}`, headers: espoirH });
  assert.equal(downloadRes.status, 200);

  // Un autre requérant ne peut ni modifier ni retirer ce dossier
  const intruderUpdate = await server.dispatch({
    method: 'PUT',
    url: '/api/applications',
    headers: kasaiH,
    body: { referenceNumber: newRef, projectTitle: 'Détourné' }
  });
  assert.equal(intruderUpdate.status, 400);

  // Sauvegarde : clé explicite obligatoire (aucune clé par défaut en dehors du mode démonstration)
  assert.equal((await post('/api/ops/backup', adminH)).status, 400);
  const backupKey = 'ab'.repeat(32);
  const backupRes = await post('/api/ops/backup', adminH, { encryptionKeyHex: backupKey });
  assert.equal(backupRes.status, 200);
  assert.equal((await post('/api/ops/restore', adminH, { backup: backupRes.json().backup })).status, 400);
  const restoreRes = await post('/api/ops/restore', adminH, { backup: backupRes.json().backup, encryptionKeyHex: backupKey });
  assert.equal(restoreRes.status, 200);
  assert.equal(restoreRes.json().integrityVerified, true);

  // Déploiement Mainnet : l'audit de sécurité ne peut pas être déclaré par le client
  const mainnetRes = await post('/api/blockchain/deploy', adminH, { networkKey: 'polygon-mainnet', auditPassed: true });
  assert.equal(mainnetRes.status, 400);
  assert.match(mainnetRes.json().error, /audit/);

  // Déconnexion : le jeton ne fonctionne plus ensuite
  const tempH = headersFor(server, 'agent@fnpss.cd');
  assert.equal((await server.dispatch({ method: 'GET', url: '/api/applications', headers: tempH })).status, 200);
  assert.equal((await post('/api/auth/logout', tempH)).status, 200);
  assert.equal((await server.dispatch({ method: 'GET', url: '/api/applications', headers: tempH })).status, 401);

  // Compte suspendu : ses sessions existantes sont invalidées
  assert.equal((await post('/api/applicants/status', adminH, { userId: kasaiId, status: 'SUSPENDED', reason: 'Test' })).status, 200);
  assert.equal((await server.dispatch({ method: 'GET', url: '/api/applications', headers: kasaiH })).status, 401);

  // Balayage de la matrice : chaque route protégée refuse l'anonyme (401) et le rôle DOUANE si non autorisé (403)
  for (const policy of ROUTE_POLICY.filter(p => p.access !== AccessLevel.PUBLIC)) {
    const anon = await server.dispatch({ method: policy.method, url: policy.path, body: policy.method === 'GET' ? null : {} });
    assert.equal(anon.status, 401, `anonyme sur ${policy.method} ${policy.path}`);
    if (Array.isArray(policy.access)) {
      const customs = await server.dispatch({ method: policy.method, url: policy.path, headers: customsH, body: policy.method === 'GET' ? null : {} });
      assert.equal(customs.status, 403, `DOUANE sur ${policy.method} ${policy.path}`);
    }
  }

  // Unités de la matrice
  assert.equal(authorizeRoute(findRoutePolicy('GET', '/api/health'), null).allowed, true);
  assert.equal(authorizeRoute(findRoutePolicy('GET', '/api/inconnue'), null).status, 404);
  assert.equal(authorizeRoute(findRoutePolicy('POST', '/api/applications/revoke'), { role: 'DG' }).allowed, true);

  // Expiration des sessions
  const shortServer = createGuichetServer({ demoPassword: PW, sessionTtlMs: 5 });
  const shortH = headersFor(shortServer, 'agent@fnpss.cd');
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal((await shortServer.dispatch({ method: 'GET', url: '/api/applications', headers: shortH })).status, 401);

  // Un mode d'accès inconnu est refusé au démarrage
  assert.throws(() => createGuichetServer({ accessMode: 'OUVERT' }), /Mode d'accès inconnu/);

  // Mot de passe généré quand aucun n'est fourni : jamais de mot de passe privilégié écrit en dur
  const autoServer = createGuichetServer();
  assert.ok(autoServer.generatedDemoPassword.length >= 16);
  assert.doesNotThrow(() => autoServer.auth.loginWithEmail({ email: 'dg@fnpss.cd', password: autoServer.generatedDemoPassword }));
  assert.throws(() => autoServer.auth.loginWithEmail({ email: 'dg@fnpss.cd', password: 'PasswordRDC#2026' }), /Identifiants invalides/);
});

test('18. Raccordement Front-End au Moteur Sécurisé, Modal d\'Authentification & Compteurs Dynamiques S1-S6 (REQ-01, REQ-04, REQ-05)', () => {
  const html = fs.readFileSync('prototype/index.html', 'utf8');

  // Vérification de la présence des composants HTML du modal d'authentification (REQ-01, REQ-04)
  assert.ok(html.includes('id="authModalBackdrop"'));
  assert.ok(html.includes('id="quickAccountsList"'));
  assert.ok(html.includes('id="tabQuickBtn"'));
  assert.ok(html.includes('id="tabLoginBtn"'));
  assert.ok(html.includes('id="tabRegisterBtn"'));
  assert.ok(html.includes('performLogout()'));

  // Vérification des 7 profils pré-configurés pour la démo
  for (const role of ['REQUERANT', 'AGENT', 'CHEF_DIVISION', 'DG', 'MINISTERE', 'DOUANE', 'ADMIN']) {
    assert.ok(html.includes(`role: '${role}'`), `Rôle ${role} présent dans la liste démo`);
  }

  // Vérification du calcul des compteurs par service dans le catalogue (REQ-05)
  assert.ok(html.includes('Mes démarches (REQ-05) :'));
  assert.ok(html.includes('serviceApps.length'));
  assert.ok(html.includes('validCount'));

  // Vérification que les appels fetch utilisent le jeton Authorization Bearer
  assert.ok(html.includes('authFetch('));
  assert.ok(html.includes("headers['Authorization'] = `Bearer ${currentAuthToken}`;"));

  // Audit d'accessibilité du prototype enrichi (WCAG AA)
  const audit = auditPrototypeAccessibility(html);
  assert.equal(audit.passed, true);
});

test('19. Formulaire de Soumission Dynamique S1 à S6, Métadonnées des Pièces P1-P6 & Once-Only (REQ-06)', async () => {
  // 1. Référentiel des pièces P1 à P6
  assert.equal(Object.keys(REQUIRED_DOCUMENTS_METADATA).length, 6);
  assert.equal(REQUIRED_DOCUMENTS_METADATA.P1_REQUETE.code, 'P1_REQUETE');
  assert.equal(REQUIRED_DOCUMENTS_METADATA.P2_ENROLEMENT.isOnceOnlyEligible, true);
  assert.equal(REQUIRED_DOCUMENTS_METADATA.P6_QUITTANCE.isOnceOnlyEligible, false);

  // 2. Configuration dynamique pour S6 sans enrôlement préalable S1 (les 6 pièces obligatoires)
  const configS6Standard = getServiceSubmissionConfig('S6', { hasActiveS1Enrollment: false });
  assert.equal(configS6Standard.serviceCode, 'S6');
  assert.equal(configS6Standard.requiresMinistrySignoff, true);
  assert.equal(configS6Standard.slaBusinessDays, 10);
  assert.equal(configS6Standard.fees.totalUsd, 320);
  assert.equal(configS6Standard.documentsChecklist.length, 6);
  assert.equal(configS6Standard.mandatoryDocsCount, 6);
  assert.equal(configS6Standard.exemptedDocsCount, 0);

  // 3. Configuration dynamique pour S6 avec principe Once-Only (P2_ENROLEMENT pré-attaché)
  const configS6OnceOnly = getServiceSubmissionConfig('S6', { hasActiveS1Enrollment: true });
  assert.equal(configS6OnceOnly.mandatoryDocsCount, 5);
  assert.equal(configS6OnceOnly.exemptedDocsCount, 1);
  const p2Item = configS6OnceOnly.documentsChecklist.find(d => d.docCode === 'P2_ENROLEMENT');
  assert.equal(p2Item.isMandatory, false);
  assert.equal(p2Item.isExemptedByOnceOnly, true);
  assert.ok(p2Item.onceOnlyNotice.includes('Once-Only'));

  // 4. Service S1 : ne demande pas P2 (c'est l'enrôlement initial)
  const configS1 = getServiceSubmissionConfig('S1');
  assert.equal(configS1.serviceCode, 'S1');
  assert.equal(configS1.requiresMinistrySignoff, false);
  assert.equal(configS1.documentsChecklist.length, 5);
  assert.equal(configS1.documentsChecklist.some(d => d.docCode === 'P2_ENROLEMENT'), false);

  // 5. Route REST GET /api/services/config (Public)
  const server = createGuichetServer({ accessMode: 'ENFORCED' });
  const resS6 = await server.dispatch({ method: 'GET', url: '/api/services/config?code=S6&hasActiveS1Enrollment=true' });
  assert.equal(resS6.status, 200);
  assert.equal(resS6.json().config.serviceCode, 'S6');
  assert.equal(resS6.json().config.mandatoryDocsCount, 5);
  assert.equal(resS6.json().config.fees.totalUsd, 320);

  const resS4 = await server.dispatch({ method: 'GET', url: '/api/services/config?code=S4' });
  assert.equal(resS4.status, 200);
  assert.equal(resS4.json().config.serviceCode, 'S4');
  assert.equal(resS4.json().config.mandatoryDocsCount, 6);

  // 6. Intégration Front-End du formulaire dynamique dans prototype/index.html
  const html = fs.readFileSync('prototype/index.html', 'utf8');
  assert.ok(html.includes('DOCS_METADATA'));
  assert.ok(html.includes('SERVICE_DOCS'));
  assert.ok(html.includes('/api/services/config'));
  assert.ok(html.includes('P2_ENROLEMENT'));
  assert.ok(html.includes('isExemptedByOnceOnly'));

  // Audit d'accessibilité WCAG AA
  const audit = auditPrototypeAccessibility(html);
  assert.equal(audit.passed, true);
});

test('20. Téléversement Sécurisé des Pièces avec Métadonnées SHA-256 (REQ-07), Modification & Retrait avant Instruction (REQ-08)', async () => {
  const PW = 'PasswordRDC#2026';
  const server = createGuichetServer({ accessMode: 'ENFORCED', demoPassword: PW });

  const headersFor = email => {
    const session = server.auth.loginWithEmail({ email, password: PW });
    return {
      authorization: `Bearer ${session.sessionToken}`,
      'content-type': 'application/json'
    };
  };

  const espoirH = headersFor('contact@espoir-kivu.org');
  const agentH = headersFor('agent@fnpss.cd');
  const kasaiH = headersFor('direction@solidarite-kasai.org');

  // 1. Dépôt initial avec pièces jointes attachées (attachedDocuments avec empreinte SHA-256 et nom de fichier)
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj << /Title (Requete FNPSS) >> endobj\n%%EOF', 'utf8');
  const inspected = validateAndInspectPdfUpload(dummyPdf, { fileName: 'requete_ministre.pdf' });

  const submitRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications',
    headers: espoirH,
    body: {
      organizationName: 'ONG Espoir du Nord-Kivu',
      serviceCode: 'S3',
      projectTitle: 'Kits humanitaires initiaux',
      goodsSummary: '100 Kits chirurgicaux',
      paymentReference: 'RAWBANK-DEP-2026-001',
      attachedDocuments: [
        {
          docCode: 'P1_REQUETE',
          fileName: inspected.fileName,
          sha256Hash: inspected.sha256Hash,
          sizeBytes: inspected.byteSize
        },
        { docCode: 'P2_ENROLEMENT', fileName: 'enrolement.pdf', sha256Hash: '0x2222', sizeBytes: 1000 },
        { docCode: 'P3_PLAN_ACTION', fileName: 'plan.pdf', sha256Hash: '0x3333', sizeBytes: 1000 },
        { docCode: 'P4_RAPPORT', fileName: 'rapport.pdf', sha256Hash: '0x4444', sizeBytes: 1000 },
        { docCode: 'P5_PROJET', fileName: 'projet.pdf', sha256Hash: '0x5555', sizeBytes: 1000 },
        { docCode: 'P6_QUITTANCE', fileName: 'quittance.pdf', sha256Hash: '0x6666', sizeBytes: 1000 }
      ]
    }
  });

  assert.equal(submitRes.status, 201);
  const createdApp = submitRes.json().application;
  const ref = createdApp.referenceNumber;
  assert.equal(createdApp.status, 'SOUMIS');
  assert.equal(createdApp.paymentValidated, false);
  assert.equal(createdApp.attachedDocuments.length, 6);
  assert.equal(createdApp.attachedDocuments[0].fileName, 'requete_ministre.pdf');

  // 2. Consultation unitaire du dossier via GET /api/applications?ref=...
  const getSingle = await server.dispatch({
    method: 'GET',
    url: `/api/applications?ref=${ref}`,
    headers: espoirH
  });
  assert.equal(getSingle.status, 200);
  assert.equal(getSingle.json().application.referenceNumber, ref);

  // 3. Modification avant instruction (REQ-08) : mise à jour du projet et colisage
  const updateRes = await server.dispatch({
    method: 'PUT',
    url: '/api/applications',
    headers: espoirH,
    body: {
      referenceNumber: ref,
      projectTitle: 'Kits humanitaires complétés — Rutshuru',
      goodsSummary: '200 Kits chirurgicaux + 5 générateurs',
      paymentReference: 'RAWBANK-DEP-2026-001-REV1'
    }
  });
  assert.equal(updateRes.status, 200);
  const updatedApp = updateRes.json().application;
  assert.equal(updatedApp.projectTitle, 'Kits humanitaires complétés — Rutshuru');
  assert.equal(updatedApp.goodsSummary, '200 Kits chirurgicaux + 5 générateurs');
  assert.equal(updatedApp.paymentReference, 'RAWBANK-DEP-2026-001-REV1');

  // 4. Anti-IDOR : un autre requérant (contact@kasai.cd) ne peut ni modifier ni retirer ce dossier
  const intruderUpdate = await server.dispatch({
    method: 'PUT',
    url: '/api/applications',
    headers: kasaiH,
    body: { referenceNumber: ref, projectTitle: 'Piraté' }
  });
  assert.equal(intruderUpdate.status, 400);
  assert.match(intruderUpdate.json().error, /propriétaire/);

  const intruderWithdraw = await server.dispatch({
    method: 'POST',
    url: '/api/applications/withdraw',
    headers: kasaiH,
    body: { referenceNumber: ref }
  });
  assert.equal(intruderWithdraw.status, 400);
  assert.match(intruderWithdraw.json().error, /propriétaire/);

  // 5. Retrait avant instruction (REQ-08) via POST /api/applications/withdraw
  const withdrawRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications/withdraw',
    headers: espoirH,
    body: { referenceNumber: ref }
  });
  assert.equal(withdrawRes.status, 200);
  assert.equal(withdrawRes.json().withdrawn, true);

  // Le dossier retiré n'existe plus
  const getAfterWithdraw = await server.dispatch({
    method: 'GET',
    url: `/api/applications?ref=${ref}`,
    headers: espoirH
  });
  assert.equal(getAfterWithdraw.status, 400);

  // 6. Anti-altération après démarrage de l'instruction (REQ-08)
  // Soumission d'un nouveau dossier puis validation par l'agent
  const app2Res = await server.dispatch({
    method: 'POST',
    url: '/api/applications',
    headers: espoirH,
    body: {
      organizationName: 'ONG Espoir du Nord-Kivu',
      serviceCode: 'S1',
      projectTitle: 'Dossier instruction active',
      paymentReference: 'RAWBANK-2026-SLA-TEST',
      uploadedDocTypes: ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE']
    }
  });
  const ref2 = app2Res.json().application.referenceNumber;
  const valRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications/validate-payment',
    headers: agentH,
    body: { referenceNumber: ref2 }
  });
  assert.equal(valRes.status, 200);

  // Tentative de modification après démarrage de l'instruction -> REFUSÉE
  const lateUpdate = await server.dispatch({
    method: 'PUT',
    url: '/api/applications',
    headers: espoirH,
    body: { referenceNumber: ref2, projectTitle: 'Changement tardif' }
  });
  assert.equal(lateUpdate.status, 400);
  assert.match(lateUpdate.json().error, /REQ-08: Modification impossible/);

  // Tentative de retrait après démarrage de l'instruction -> REFUSÉE
  const lateWithdraw = await server.dispatch({
    method: 'POST',
    url: '/api/applications/withdraw',
    headers: espoirH,
    body: { referenceNumber: ref2 }
  });
  assert.equal(lateWithdraw.status, 400);
  assert.match(lateWithdraw.json().error, /REQ-08: Suppression impossible/);

  // 7. Intégration Front-End dans prototype/index.html (REQ-07 & REQ-08)
  const html = fs.readFileSync('prototype/index.html', 'utf8');
  assert.ok(html.includes('handlePieceUpload('));
  assert.ok(html.includes('wizardAttachedDocs'));
  assert.ok(html.includes('openEditApplicationModal('));
  assert.ok(html.includes('withdrawApplicationPrompt('));
  assert.ok(html.includes('id="editModalBackdrop"'));

  // Audit d'accessibilité WCAG AA
  const audit = auditPrototypeAccessibility(html);
  assert.equal(audit.passed, true);
});

test('21. Fiche d\'Instruction Instructeur & Filtrage des Demandes (ADM-04) & Visionneuse Intégrée des Pièces Justificatives P1-P6 (ADM-05)', async () => {
  const PW = 'PasswordRDC#2026';
  const server = createGuichetServer({ accessMode: 'ENFORCED', demoPassword: PW });

  const headersFor = email => {
    const session = server.auth.loginWithEmail({ email, password: PW });
    return {
      authorization: `Bearer ${session.sessionToken}`,
      'content-type': 'application/json'
    };
  };

  const agentH = headersFor('agent@fnpss.cd');
  const dgH = headersFor('dg@fnpss.cd');
  const adminH = headersFor('admin@fnpss.cd');

  // 1. Filtrage multicritère des demandes par service (ADM-04)
  const resAll = await server.dispatch({ method: 'GET', url: '/api/applications', headers: agentH });
  assert.equal(resAll.status, 200);
  assert.equal(resAll.json().applications.length, 3);

  const resS6 = await server.dispatch({ method: 'GET', url: '/api/applications?service=S6', headers: agentH });
  assert.equal(resS6.status, 200);
  assert.equal(resS6.json().applications.length, 1);
  assert.equal(resS6.json().applications[0].serviceCode, 'S6');

  const resS4 = await server.dispatch({ method: 'GET', url: '/api/applications?service=S4', headers: agentH });
  assert.equal(resS4.status, 200);
  assert.equal(resS4.json().applications.length, 1);
  assert.equal(resS4.json().applications[0].serviceCode, 'S4');

  // Filtrage par statut
  const resSoumis = await server.dispatch({ method: 'GET', url: '/api/applications?status=SOUMIS', headers: agentH });
  assert.equal(resSoumis.status, 200);
  assert.equal(resSoumis.json().applications.length, 1);
  assert.equal(resSoumis.json().applications[0].status, 'SOUMIS');

  // 2. Consultation d'une fiche de traitement détaillée (ADM-04)
  const s4Ref = resS4.json().applications[0].referenceNumber;
  const singleAppRes = await server.dispatch({ method: 'GET', url: `/api/applications?ref=${s4Ref}`, headers: agentH });
  assert.equal(singleAppRes.status, 200);
  const detailedApp = singleAppRes.json().application;
  assert.equal(detailedApp.referenceNumber, s4Ref);
  assert.equal(detailedApp.organizationName, 'Fondation Solidarité Kasaï');
  assert.equal(detailedApp.serviceCode, 'S4');
  assert.ok(Array.isArray(detailedApp.attachedDocuments));
  assert.equal(detailedApp.attachedDocuments.length, 6);

  // 3. Inspection des pièces justificatives rattachées P1 à P6 (ADM-05)
  const p6Doc = detailedApp.attachedDocuments.find(d => d.docCode === 'P6_QUITTANCE');
  assert.ok(p6Doc);
  assert.match(p6Doc.fileName, /p6_quittance\.pdf$/);
  assert.match(p6Doc.sha256Hash, /^0x[0-9a-f]{64}$/);
  assert.ok(p6Doc.sizeBytes > 0);

  // 4. Intégration Front-End dans prototype/index.html (ADM-04, ADM-05 & REQ-11 PWA)
  const html = fs.readFileSync('prototype/index.html', 'utf8');
  assert.ok(html.includes('id="adminFilterService"'));
  assert.ok(html.includes('id="adminFilterStatus"'));
  assert.ok(html.includes('previewSubmittedDocument('));
  assert.ok(html.includes('INSPECTION DOCUMENTAIRE &bull; CONTROLE DE RECEVABILITE (ADM-05)'));
  assert.ok(html.includes('adminPreviewDoc'));
  assert.ok(html.includes('flushOfflinePwaQueue('));
  assert.ok(html.includes('fnpss_offline_queue'));
  assert.ok(html.includes('idempotencyKey'));

  // Audit d'accessibilité WCAG AA
  const audit = auditPrototypeAccessibility(html);
  assert.equal(audit.passed, true);
});

test('22. Circuit d\'Approbation Multi-Niveaux Chef de Division & Ministère (ADM-08, ADM-06), Double Confirmation de Révocation (VER-06) & Publication CMS (REQ-13, ADM-10)', async () => {
  const PW = 'PasswordRDC#2026';
  const server = createGuichetServer({ accessMode: 'ENFORCED', demoPassword: PW });

  // 1. Authentification des acteurs par rôle
  const loginAs = async (email, password = PW) => {
    const res = await server.dispatch({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, password }
    });
    assert.equal(res.status, 200);
    return {
      authorization: `Bearer ${res.json().sessionToken}`,
      'content-type': 'application/json'
    };
  };

  const requerantH = await loginAs('contact@espoir-kivu.org');
  const agentH = await loginAs('agent@fnpss.cd');
  const divChiefH = await loginAs('chef.division@fnpss.cd');
  const dgH = await loginAs('dg@fnpss.cd');
  const minH = await loginAs('ministere@tutelle.cd');
  const adminH = await loginAs('admin@fnpss.cd');

  // 2. Dépôt d'un dossier S6 par le requérant
  const submitRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications',
    headers: requerantH,
    body: {
      serviceCode: 'S6',
      projectTitle: 'Cliniques mobiles Bukavu 2026',
      goodsSummary: '2 Ambulances tout-terrain et consommables médicaux',
      paymentReference: 'RAWBANK-BUKAVU-2026-004',
      attachedDocuments: [
        { docCode: 'P1_REQUETE', fileName: 'p1_requete.pdf', sha256Hash: '0x' + '11'.repeat(32), sizeBytes: 15400 },
        { docCode: 'P2_ENROLEMENT', fileName: 'p2_enrolement.pdf', sha256Hash: '0x' + '22'.repeat(32), sizeBytes: 25400 },
        { docCode: 'P3_PLAN_ACTION', fileName: 'p3_plan.pdf', sha256Hash: '0x' + '33'.repeat(32), sizeBytes: 35400 },
        { docCode: 'P4_RAPPORT', fileName: 'p4_rapport.pdf', sha256Hash: '0x' + '44'.repeat(32), sizeBytes: 45400 },
        { docCode: 'P5_PROJET', fileName: 'p5_projet.pdf', sha256Hash: '0x' + '55'.repeat(32), sizeBytes: 55400 },
        { docCode: 'P6_QUITTANCE', fileName: 'p6_quittance.pdf', sha256Hash: '0x' + '66'.repeat(32), sizeBytes: 65400 }
      ]
    }
  });
  assert.equal(submitRes.status, 201);
  const ref = submitRes.json().application.referenceNumber;

  // 3. Validation de la quittance par l'Agent FNPSS (démarrage du SLA 10 jours)
  const valPayRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications/validate-payment',
    headers: agentH,
    body: { referenceNumber: ref }
  });
  assert.equal(valPayRes.status, 200);
  assert.equal(valPayRes.json().application.paymentValidated, true);
  assert.equal(valPayRes.json().application.status, 'EN_COURS_INSTRUCTION');

  // 4. Circuit multi-niveaux : Émission de l'avis technique favorable par le Chef de Division (ADM-08)
  const divOpinionRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications/division-opinion',
    headers: divChiefH,
    body: {
      referenceNumber: ref,
      favorable: true,
      opinionNote: 'Conformité totale aux exigences d\'exonération humanitaire 2026'
    }
  });
  assert.equal(divOpinionRes.status, 200);
  assert.equal(divOpinionRes.json().application.divisionOpinion.favorable, true);
  assert.equal(divOpinionRes.json().application.divisionOpinion.opinionNote, 'Conformité totale aux exigences d\'exonération humanitaire 2026');

  // 5. Approbation finale et scellement Blockchain par la Direction Générale (DG)
  const sealRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications/approve-seal',
    headers: dgH,
    body: { referenceNumber: ref }
  });
  assert.equal(sealRes.status, 200);
  assert.equal(sealRes.json().application.status, 'VALIDE_DELIVRE');
  assert.ok(sealRes.json().application.certificate.docHash);

  // 6. Contre-seing / Co-signature par le Ministère de Tutelle (ADM-06 / D1)
  const cosignRes = await server.dispatch({
    method: 'POST',
    url: '/api/applications/cosign-ministry',
    headers: minH,
    body: {
      referenceNumber: ref,
      ministryReference: 'CAB/MIN-AS/2026/089'
    }
  });
  assert.equal(cosignRes.status, 200);
  const cosignedApp = cosignRes.json().application;
  assert.equal(cosignedApp.ministryCoSigned, true);
  assert.equal(cosignedApp.ministryReference, 'CAB/MIN-AS/2026/089');
  assert.equal(cosignedApp.approvalSteps.length, 5); // Dépôt -> Paiement -> Chef Division -> DG -> Ministère

  // 7. Double confirmation de révocation (VER-06)
  // Rejet si doubleConfirmed est false
  const unconfirmedRevoke = await server.dispatch({
    method: 'POST',
    url: '/api/applications/revoke',
    headers: dgH,
    body: {
      referenceNumber: ref,
      reason: 'Suspension administrative',
      doubleConfirmed: false
    }
  });
  assert.equal(unconfirmedRevoke.status, 400);
  assert.match(unconfirmedRevoke.json().error, /double confirmation/i);

  // Révocation effective avec doubleConfirmed = true
  const confirmedRevoke = await server.dispatch({
    method: 'POST',
    url: '/api/applications/revoke',
    headers: dgH,
    body: {
      referenceNumber: ref,
      reason: 'Irrégularité documentaire constatée sur le terrain par la commission conjointe',
      doubleConfirmed: true
    }
  });
  assert.equal(confirmedRevoke.status, 200);
  const revokedApp = confirmedRevoke.json().application;
  assert.equal(revokedApp.status, 'REVOQUE');
  assert.equal(revokedApp.certificate.status, 'REVOKED');
  assert.deepEqual(revokedApp.certificate.regiesNotified, ['DGDA', 'DGRAD', 'DGI']);

  // 8. Gestion et diffusion des communiqués officiels CMS (REQ-13, ADM-10)
  const createNewsRes = await server.dispatch({
    method: 'POST',
    url: '/api/news',
    headers: adminH,
    body: {
      title: 'Permanence numérique frontière de Kasumbalesa activée',
      category: 'INTEROPERABILITE_DOUANE',
      summary: 'Les inspecteurs douaniers disposent du contrôle cryptographique instantané 24h/24.'
    }
  });
  assert.equal(createNewsRes.status, 201);
  assert.equal(createNewsRes.json().article.category, 'INTEROPERABILITE_DOUANE');

  // Consultation publique des actualités (accessible sans authentification)
  const publicNewsRes = await server.dispatch({ method: 'GET', url: '/api/news' });
  assert.equal(publicNewsRes.status, 200);
  const articles = publicNewsRes.json().articles;
  assert.ok(articles.some(a => a.title.includes('Kasumbalesa')));

  // 9. Supervision et Budget 3G (< 3.0s, bundle optimisé) (REQ-12, OPS-06)
  const supervisionRes = await server.dispatch({
    method: 'GET',
    url: '/api/ops/supervision',
    headers: adminH
  });
  assert.equal(supervisionRes.status, 200);
  const supervision = supervisionRes.json();
  assert.equal(supervision.req12PerformanceBudget.withinBudget, true);
  assert.ok(supervision.req12PerformanceBudget.estimated3gLoadSeconds < 3.0);

  // 10. Intégration Front-End dans prototype/index.html (ADM-08, ADM-06, VER-06, REQ-13, REQ-12)
  const html = fs.readFileSync('prototype/index.html', 'utf8');
  assert.ok(html.includes('id="opinionModalBackdrop"'));
  assert.ok(html.includes('id="opinionFavorableSelect"'));
  assert.ok(html.includes('submitDivisionOpinion('));
  assert.ok(html.includes('id="cosignModalBackdrop"'));
  assert.ok(html.includes('id="cosignMinistryRef"'));
  assert.ok(html.includes('submitMinistryCoSign('));
  assert.ok(html.includes('id="revokeModalBackdrop"'));
  assert.ok(html.includes('id="revokeReasonInput"'));
  assert.ok(html.includes('id="revokeDoubleConfirmCheck"'));
  assert.ok(html.includes('submitRevokeApplication('));
  assert.ok(html.includes('id="newsModalBackdrop"'));
  assert.ok(html.includes('id="newsTitleInput"'));
  assert.ok(html.includes('submitNewsArticle('));
  assert.ok(html.includes('3G Optimisé'));

  // Audit d'accessibilité WCAG AA
  const audit = auditPrototypeAccessibility(html);
  assert.equal(audit.passed, true);
});

test('23. Initialisation Next.js App Router, Design System UX-05, Authentification REQ-01 & Routes API Hybrides (Phase 2)', async () => {
  // 1. Configuration Next.js (next.config.mjs)
  const nextConfigModule = await import('../next.config.mjs');
  const nextConfig = nextConfigModule.default;
  assert.ok(nextConfig, 'next.config.mjs doit exporter une configuration valide');
  assert.equal(nextConfig.reactStrictMode, true);
  assert.equal(nextConfig.poweredByHeader, false);
  assert.ok(nextConfig.env.APP_NAME.includes('FNPSS'));
  const headers = await nextConfig.headers();
  assert.ok(headers.some(h => h.headers.some(header => header.key === 'X-Content-Type-Options' && header.value === 'nosniff')));

  // 2. Package.json configuré pour Next.js (Phase 2, version 0.2.0)
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.version, '0.2.0');
  assert.ok(pkg.scripts.dev.includes('next dev'));
  assert.ok(pkg.scripts.build.includes('next build'));
  assert.ok(pkg.scripts.start.includes('next start'));
  assert.ok(pkg.dependencies.next);
  assert.ok(pkg.dependencies.react);
  assert.ok(pkg.dependencies['react-dom']);

  // 3. Design System CSS Tokens (UX-05, src/app/globals.css)
  const css = fs.readFileSync('src/app/globals.css', 'utf8');
  assert.ok(css.includes('--fnpss-navy: #0a2540;'));
  assert.ok(css.includes('--fnpss-blue: #065a82;'));
  assert.ok(css.includes('--fnpss-accent: #1a73e8;'));
  assert.ok(css.includes('--fnpss-green: #137333;'));
  assert.ok(css.includes('--fnpss-red: #d93025;'));
  assert.ok(css.includes('.drc-ribbon'));
  assert.ok(css.includes('.btn-primary'));
  assert.ok(css.includes('.badge-valide'));

  // 4. Composants UI Réutilisables du Design System (UX-05)
  const buttonSource = fs.readFileSync('src/components/ui/Button.jsx', 'utf8');
  assert.ok(buttonSource.includes('btn-') && buttonSource.includes('aria-busy'));
  const badgeSource = fs.readFileSync('src/components/ui/Badge.jsx', 'utf8');
  assert.ok(badgeSource.includes('role="status"') && badgeSource.includes('badge-valide'));
  const cardSource = fs.readFileSync('src/components/ui/Card.jsx', 'utf8');
  assert.ok(cardSource.includes('card-header') && cardSource.includes('card-body'));
  const modalSource = fs.readFileSync('src/components/ui/Modal.jsx', 'utf8');
  assert.ok(modalSource.includes('role="dialog"') && modalSource.includes('aria-modal="true"'));
  const docViewerSource = fs.readFileSync('src/components/ui/DocumentViewer.jsx', 'utf8');
  assert.ok(docViewerSource.includes('document-viewer') && docViewerSource.includes('SHA-256'));
  const headerSource = fs.readFileSync('src/components/ui/Header.jsx', 'utf8');
  assert.ok(headerSource.includes('drc-ribbon') && headerSource.includes('Guichet Unique Dématérialisé'));
  const footerSource = fs.readFileSync('src/components/ui/Footer.jsx', 'utf8');
  assert.ok(footerSource.includes('Fonds National de Promotion et de Service Social') && footerSource.includes('SLA légal : 10 jours ouvrables'));

  // 5. Pages de l'App Router Next.js (Accessibilité et conformité fonctionnelle)
  const layoutSource = fs.readFileSync('src/app/layout.jsx', 'utf8');
  assert.ok(layoutSource.includes('RootLayout') && layoutSource.includes('globals.css'));
  const homeSource = fs.readFileSync('src/app/page.jsx', 'utf8');
  assert.ok(homeSource.includes('Catalogue des Services Dématérialisés') && homeSource.includes('kpi-grid'));
  const loginSource = fs.readFileSync('src/app/auth/login/page.jsx', 'utf8');
  assert.ok(loginSource.includes('Connexion au Guichet Unique') && loginSource.includes('/api/auth/login'));
  const registerSource = fs.readFileSync('src/app/auth/register/page.jsx', 'utf8');
  assert.ok(registerSource.includes('Création de Compte ONG / ASBL') && registerSource.includes('/api/auth/register'));
  const verifierSource = fs.readFileSync('src/app/verifier/page.jsx', 'utf8');
  assert.ok(verifierSource.includes('Portail Public de Vérification d\'Authenticité') && verifierSource.includes('/api/verify'));

  // 6. Test fonctionnel des Routes API Next.js (Bridge vers les moteurs souverains)
  const authLoginRoute = await import('../src/app/api/auth/login/route.js');
  const authRegisterRoute = await import('../src/app/api/auth/register/route.js');
  const verifyRoute = await import('../src/app/api/verify/route.js');
  const applicationsRoute = await import('../src/app/api/applications/route.js');

  // API Login : Échec identifiants manquants
  const emptyLoginReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const emptyLoginRes = await authLoginRoute.POST(emptyLoginReq);
  assert.equal(emptyLoginRes.status, 400);

  // API Login : Succès avec compte seed
  const validLoginReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'contact@espoir-kivu.org', password: 'PasswordRDC#2026' })
  });
  const validLoginRes = await authLoginRoute.POST(validLoginReq);
  assert.equal(validLoginRes.status, 200);
  const validLoginData = await validLoginRes.json();
  assert.equal(validLoginData.success, true);
  assert.ok(validLoginData.sessionToken);

  // API Register : Échec champs obligatoires manquants
  const badRegReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nouveau@ong.cd' })
  });
  const badRegRes = await authRegisterRoute.POST(badRegReq);
  assert.equal(badRegRes.status, 400);

  // API Register : Création réussie
  const goodRegReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationName: 'ONG Nouvelle Espérance Goma',
      representativeName: 'Dr. Sarah Mwamba',
      email: `contact.goma.${Date.now()}@esperance.cd`,
      password: 'SecurePasswordRDC#2026'
    })
  });
  const goodRegRes = await authRegisterRoute.POST(goodRegReq);
  assert.equal(goodRegRes.status, 201);
  const goodRegData = await goodRegRes.json();
  assert.equal(goodRegData.success, true);
  assert.ok(goodRegData.userId);

  // API Applications : rejet sans jeton (401) puis liste authentifiée (200)
  const unauthListRes = await applicationsRoute.GET(new Request('http://localhost:3000/api/applications'));
  assert.equal(unauthListRes.status, 401);

  const listReq = new Request('http://localhost:3000/api/applications', {
    headers: { Authorization: `Bearer ${validLoginData.sessionToken}` }
  });
  const listRes = await applicationsRoute.GET(listReq);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.success, true);
  assert.ok(Array.isArray(listData.applications));

  // API Verify : Erreur sans hash
  const noHashReq = new Request('http://localhost:3000/api/verify');
  const noHashRes = await verifyRoute.GET(noHashReq);
  assert.equal(noHashRes.status, 400);

  // API Verify : Recherche d'une attestation scellée
  const { registrySimulator } = await import('../src/blockchain/registry-simulator.mjs');
  const testHash = '0x' + '99'.repeat(32);
  registrySimulator.registerDocument({
    caller: '0x2222222222222222222222222222222222222222',
    docHash: testHash,
    certificateNumber: 'FNPSS-TEST-2026-001',
    serviceCode: 4,
    expiresAt: Math.floor(Date.now() / 1000) + 86400
  });

  const checkReq = new Request(`http://localhost:3000/api/verify?hash=${testHash}`);
  const checkRes = await verifyRoute.GET(checkReq);
  assert.equal(checkRes.status, 200);
  const checkData = await checkRes.json();
  assert.equal(checkData.found, true);
  assert.equal(checkData.status, 1);
  assert.equal(checkData.isValid, true);
});

test('24. Parcours Interactifs Next.js : Tableau de Bord Requérant (REQ-05), Assistant S1-S6 (REQ-06) & Console Back-Office Multi-Niveaux (ADM-01, ADM-04, ADM-08)', () => {
  // 1. Tableau de bord requérant (REQ-05, REQ-08)
  const dashboardSource = fs.readFileSync('src/app/dashboard/page.jsx', 'utf8');
  assert.ok(dashboardSource.includes('Tableau de Bord Requérant'));
  assert.ok(dashboardSource.includes('Dossiers Déposés'));
  assert.ok(dashboardSource.includes('Attestations Délivrées'));
  assert.ok(dashboardSource.includes('handleOpenEdit') && dashboardSource.includes('handleWithdraw'));
  assert.ok(dashboardSource.includes('certificate.pdf'));

  // 2. Assistant de soumission multi-étapes S1-S6 avec Once-Only (REQ-06, REQ-07, REQ-11)
  const newAppSource = fs.readFileSync('src/app/applications/new/page.jsx', 'utf8');
  assert.ok(newAppSource.includes('Nouvelle Demande de Démarche FNPSS'));
  assert.ok(newAppSource.includes('Étape 1') && newAppSource.includes('Étape 2') && newAppSource.includes('Étape 3') && newAppSource.includes('Étape 4'));
  assert.ok(newAppSource.includes('Once-Only') && newAppSource.includes('isExempted'));
  assert.ok(newAppSource.includes('crypto.subtle.digest'));
  assert.ok(newAppSource.includes('idempotencyKey'));

  // 3. Console d\'administration back-office et circuit 5 niveaux (ADM-01, ADM-04, ADM-05, ADM-08, ADM-06, VER-06)
  const adminSource = fs.readFileSync('src/app/admin/page.jsx', 'utf8');
  assert.ok(adminSource.includes('Console d\'Instruction Back-Office FNPSS'));
  assert.ok(adminSource.includes('AGENT') && adminSource.includes('CHEF_DIVISION') && adminSource.includes('DG') && adminSource.includes('MINISTERE'));
  assert.ok(adminSource.includes('DocumentViewer') && adminSource.includes('Inspection Documentaire'));
  assert.ok(adminSource.includes('handleDivisionOpinion') && adminSource.includes('isOpinionModalOpen'));
  assert.ok(adminSource.includes('handleCosignMinistry') && adminSource.includes('isCosignModalOpen'));
  assert.ok(adminSource.includes('handleRevoke') && adminSource.includes('doubleConfirmed'));

  // 4. Intégrité des 5 routes d\'écrans clés de l\'application Next.js
  const routes = [
    'src/app/page.jsx',
    'src/app/auth/login/page.jsx',
    'src/app/auth/register/page.jsx',
    'src/app/dashboard/page.jsx',
    'src/app/applications/new/page.jsx',
    'src/app/admin/page.jsx',
    'src/app/verifier/page.jsx'
  ];
  for (const r of routes) {
    assert.ok(fs.existsSync(r), `La route Next.js ${r} doit exister`);
    assert.ok(fs.statSync(r).size > 500, `La route Next.js ${r} doit avoir du contenu substantiel`);
  }
});

test('25. Authentification Google OAuth 2.0 (REQ-02, BLK-02), Réinitialisation Neutre Mot de Passe (REQ-03), Profil & Déconnexion (REQ-04) et CI/CD Staging OPS-04', async () => {
  // 1. Google OAuth 2.0 & Dérivation Web3Auth MPC
  const googleRoute = await import('../src/app/api/auth/google/route.js');
  
  // Échec sans email
  const badGoogleReq = new Request('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const badGoogleRes = await googleRoute.POST(badGoogleReq);
  assert.equal(badGoogleRes.status, 400);

  // Succès Google OAuth
  const googleEmail = `mandataire.ong.${Date.now()}@gmail.com`;
  const goodGoogleReq = new Request('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleEmail,
      givenName: 'Jean-Luc',
      familyName: 'Mukendi',
      organizationName: 'Solidarité Grand Bandundu',
      province: 'Kwilu'
    })
  });
  const goodGoogleRes = await googleRoute.POST(goodGoogleReq);
  assert.equal(goodGoogleRes.status, 200);
  const goodGoogleData = await goodGoogleRes.json();
  assert.equal(goodGoogleData.success, true);
  assert.ok(goodGoogleData.sessionToken);
  assert.match(goodGoogleData.walletAddress, /^0x[0-9a-f]{40}$/i);

  // 2. Demande de Réinitialisation de Mot de Passe (REQ-03)
  const forgotRoute = await import('../src/app/api/auth/forgot-password/route.js');
  
  // Erreur sans email
  const emptyForgotReq = new Request('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const emptyForgotRes = await forgotRoute.POST(emptyForgotReq);
  assert.equal(emptyForgotRes.status, 400);

  // Email existant (seed user)
  const knownForgotReq = new Request('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'contact@espoir-kivu.org' })
  });
  const knownForgotRes = await forgotRoute.POST(knownForgotReq);
  assert.equal(knownForgotRes.status, 200);
  const knownForgotData = await knownForgotRes.json();
  assert.equal(knownForgotData.success, true);
  assert.ok(knownForgotData.message);
  assert.ok(knownForgotData.devToken);

  // Email inconnu : message neutre identique sans fuite d'information
  const unknownForgotReq = new Request('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'inconnu.absent@gouv.cd' })
  });
  const unknownForgotRes = await forgotRoute.POST(unknownForgotReq);
  assert.equal(unknownForgotRes.status, 200);
  const unknownForgotData = await unknownForgotRes.json();
  assert.equal(unknownForgotData.message, knownForgotData.message);

  // 3. Confirmation de Réinitialisation de Mot de Passe (REQ-03)
  const resetRoute = await import('../src/app/api/auth/reset-password/route.js');
  
  // Échec mauvais jeton
  const badTokenReq = new Request('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'mauvais-jeton-invalide', newPassword: 'NewPassword2026#' })
  });
  const badTokenRes = await resetRoute.POST(badTokenReq);
  assert.equal(badTokenRes.status, 400);

  // Succès avec devToken
  const resetToken = knownForgotData.devToken;
  const goodResetReq = new Request('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword: 'NewPasswordRDC#2026' })
  });
  const goodResetRes = await resetRoute.POST(goodResetReq);
  assert.equal(goodResetRes.status, 200);
  const goodResetData = await goodResetRes.json();
  assert.equal(goodResetData.success, true);

  // 4. Profil de l'Organisation & Représentant Légal (REQ-04, BLK-03)
  const profileRoute = await import('../src/app/api/auth/profile/route.js');
  const authLoginRoute = await import('../src/app/api/auth/login/route.js');

  // Connexion avec le nouveau mot de passe
  const newLoginReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'contact@espoir-kivu.org', password: 'NewPasswordRDC#2026' })
  });
  const newLoginRes = await authLoginRoute.POST(newLoginReq);
  assert.equal(newLoginRes.status, 200);
  const { sessionToken } = await newLoginRes.json();

  // Consultation du profil avec sessionToken
  const getProfReq = new Request('http://localhost:3000/api/auth/profile', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });
  const getProfRes = await profileRoute.GET(getProfReq);
  assert.equal(getProfRes.status, 200);
  const getProfData = await getProfRes.json();
  assert.equal(getProfData.success, true);
  assert.equal(getProfData.user.email, 'contact@espoir-kivu.org');
  assert.match(getProfData.user.walletAddress, /^0x[0-9a-f]{40}$/i);

  // Mise à jour du profil
  const updateProfReq = new Request('http://localhost:3000/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({
      organizationName: 'ONG Espoir Kivu & Maniema Mis à Jour',
      province: 'Maniema',
      enrollmentNumber: 'FNPSS-ONG-2026-MAN-0099'
    })
  });
  const updateProfRes = await profileRoute.PUT(updateProfReq);
  assert.equal(updateProfRes.status, 200);
  const updateProfData = await updateProfRes.json();
  assert.equal(updateProfData.user.organizationName, 'ONG Espoir Kivu & Maniema Mis à Jour');
  assert.equal(updateProfData.user.province, 'Maniema');

  // 5. Déconnexion (REQ-04)
  const logoutRoute = await import('../src/app/api/auth/logout/route.js');
  const logoutReq = new Request('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken })
  });
  const logoutRes = await logoutRoute.POST(logoutReq);
  assert.equal(logoutRes.status, 200);

  // La session invalidée doit être rejetée
  const deadProfReq = new Request('http://localhost:3000/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });
  const deadProfRes = await profileRoute.GET(deadProfReq);
  assert.equal(deadProfRes.status, 401);

  // 6. Sonde de Santé Staging / Production (OPS-04)
  const healthRoute = await import('../src/app/api/health/route.js');
  const healthRes = await healthRoute.GET();
  assert.equal(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'healthy');
  assert.equal(healthData.subsystems.nextAppRouter, 'UP');
  assert.equal(healthData.subsystems.storageVaultAes256, 'HEALTHY');

  // 7. Vérification des Nouveaux Écrans & Procédures d'Exploitation
  const pages = [
    'src/app/auth/forgot-password/page.jsx',
    'src/app/auth/reset-password/page.jsx',
    'src/app/profile/page.jsx'
  ];
  for (const p of pages) {
    assert.ok(fs.existsSync(p), `La page ${p} doit exister`);
    assert.ok(fs.statSync(p).size > 600, `La page ${p} doit avoir du contenu substantiel`);
  }

  // Vérification CI/CD et Rollback OPS-04
  const cicdWorkflow = fs.readFileSync('.github/workflows/deploy-staging.yml', 'utf8');
  assert.ok(cicdWorkflow.includes('CI/CD Staging'));
  assert.ok(cicdWorkflow.includes('DÉCLENCHEMENT DE LA PROCÉDURE DE ROLLBACK STAGING'));
  assert.ok(cicdWorkflow.includes('npm test'));

  const rollbackDoc = fs.readFileSync('documentation du projet/PROCEDURE_DEPLOIEMENT_ET_ROLLBACK_STAGING.md', 'utf8');
  assert.ok(rollbackDoc.includes('OPS-04'));
  assert.ok(rollbackDoc.includes('Blue / Green'));
  assert.ok(rollbackDoc.includes('/api/health'));

  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  assert.ok(dockerfile.includes('HEALTHCHECK'));
  assert.ok(dockerfile.includes('nextjs'));
});

test('26. Sprint 3 API Next.js : Instruction Back-Office (ADM-03..08, ADM-10), Exemption P2 Serveur (REQ-06), Téléchargement PDF Tracé (REQ-09) & Notifications Anti-IDOR (NOT-01..04)', async () => {
  const loginRoute = await import('../src/app/api/auth/login/route.js');
  const registerRoute = await import('../src/app/api/auth/register/route.js');
  const appsRoute = await import('../src/app/api/applications/route.js');
  const actionRoute = await import('../src/app/api/applications/[action]/route.js');
  const certPdfRoute = await import('../src/app/api/applications/certificate.pdf/route.js');
  const notifRoute = await import('../src/app/api/notifications/route.js');
  const cmsRoute = await import('../src/app/api/cms/news/route.js');
  const adminApplicantsRoute = await import('../src/app/api/admin/applicants/route.js');
  const adminAuditRoute = await import('../src/app/api/admin/audit/route.js');

  const jsonReq = (url, method, body, token = '') =>
    new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

  const loginAs = async (email, password) => {
    const res = await loginRoute.POST(jsonReq('http://localhost:3000/api/auth/login', 'POST', { email, password }));
    assert.equal(res.status, 200, `Login échoué pour ${email}`);
    const data = await res.json();
    return data;
  };

  // Création de deux requérants distincts pour vérifier l'isolation anti-IDOR
  const emailA = `ong.alpha.${Date.now()}@rdc.org`;
  const emailB = `ong.beta.${Date.now()}@rdc.org`;
  await registerRoute.POST(jsonReq('http://localhost:3000/api/auth/register', 'POST', {
    organizationName: 'ONG Alpha Kivu',
    representativeName: 'Marie Lukusa',
    email: emailA,
    password: 'PasswordRDC#2026'
  }));
  await registerRoute.POST(jsonReq('http://localhost:3000/api/auth/register', 'POST', {
    organizationName: 'ONG Beta Katanga',
    representativeName: 'Paul Ilunga',
    email: emailB,
    password: 'PasswordRDC#2026'
  }));

  const { sessionToken: tokenA, user: userA } = await loginAs(emailA, 'PasswordRDC#2026');
  const { sessionToken: tokenB } = await loginAs(emailB, 'PasswordRDC#2026');
  const { sessionToken: tokenAgent } = await loginAs('agent@fnpss.cd', 'StaffFNPSS#2026');
  const { sessionToken: tokenChef } = await loginAs('chef.division@fnpss.cd', 'StaffFNPSS#2026');
  const { sessionToken: tokenDg } = await loginAs('dg@fnpss.cd', 'StaffFNPSS#2026');
  const { sessionToken: tokenMin } = await loginAs('ministere@fnpss.cd', 'StaffFNPSS#2026');
  const { sessionToken: tokenAdmin } = await loginAs('admin@fnpss.cd', 'StaffFNPSS#2026');

  // 1. Exemption Once-Only P2 vérifiée côté serveur (REQ-06)
  // Sans dossier S1 validé, soumettre S4 sans P2 échoue même si le client injecte isExemptedOnceOnly: true
  const baseDocsWithoutP2 = ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE'].map((code, i) => ({
    docCode: code,
    fileName: `${code.toLowerCase()}.pdf`,
    sizeBytes: 2048,
    sha256Hash: '0x' + String(i + 1).repeat(64)
  }));

  const spoofedS4Res = await appsRoute.POST(
    jsonReq('http://localhost:3000/api/applications', 'POST', {
      serviceCode: 'S4',
      projectTitle: 'Tentative contournement P2',
      goodsSummary: 'Groupes électrogènes',
      paymentReference: 'RAWBANK-SPOOF-001',
      attachedDocuments: [
        ...baseDocsWithoutP2,
        { docCode: 'P2_ENROLEMENT', fileName: 'fake.pdf', sizeBytes: 100, sha256Hash: '0x' + '2'.repeat(64), isExemptedOnceOnly: true }
      ]
    }, tokenA)
  );
  assert.equal(spoofedS4Res.status, 400, 'Le serveur doit refuser une exemption P2 auto-déclarée sans S1 actif');

  // Dépôt légitime d'un dossier S1 par l'ONG Alpha
  const s1Res = await appsRoute.POST(
    jsonReq('http://localhost:3000/api/applications', 'POST', {
      serviceCode: 'S1',
      projectTitle: 'Enrôlement national ONG Alpha',
      goodsSummary: 'Dossier statutaire complet',
      paymentReference: 'RAWBANK-S1-001',
      attachedDocuments: baseDocsWithoutP2
    }, tokenA)
  );
  assert.equal(s1Res.status, 201);
  const s1Data = await s1Res.json();
  const s1Ref = s1Data.application.referenceNumber;
  assert.equal(s1Data.onceOnlyApplied, false);

  // 2. Anti-escalade RBAC : un requérant ne peut pas valider son propre paiement (403)
  const selfValRes = await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/validate-payment', 'POST', { referenceNumber: s1Ref }, tokenA),
    { params: { action: 'validate-payment' } }
  );
  assert.equal(selfValRes.status, 403);

  // 3. Circuit d'instruction complet sur S1 : Agent -> Chef de Division -> DG
  const valS1Res = await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/validate-payment', 'POST', { referenceNumber: s1Ref }, tokenAgent),
    { params: { action: 'validate-payment' } }
  );
  assert.equal(valS1Res.status, 200);

  const opS1Res = await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/division-opinion', 'POST', {
      referenceNumber: s1Ref,
      favorable: true,
      opinionNote: 'Statuts conformes à la Loi n°004/2001'
    }, tokenChef),
    { params: { action: 'division-opinion' } }
  );
  assert.equal(opS1Res.status, 200);

  const sealS1Res = await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/approve-seal', 'POST', { referenceNumber: s1Ref }, tokenDg),
    { params: { action: 'approve-seal' } }
  );
  assert.equal(sealS1Res.status, 200);

  // Maintenant que S1 est VALIDE_DELIVRE, le dépôt S4 sans P2 bénéficie de l'exemption Once-Only côté serveur
  const validS4Res = await appsRoute.POST(
    jsonReq('http://localhost:3000/api/applications', 'POST', {
      serviceCode: 'S4',
      projectTitle: 'Importation convoi médical Kivu',
      goodsSummary: '200 kits chirurgicaux',
      paymentReference: 'RAWBANK-S4-002',
      attachedDocuments: baseDocsWithoutP2
    }, tokenA)
  );
  assert.equal(validS4Res.status, 201);
  const validS4Data = await validS4Res.json();
  assert.equal(validS4Data.onceOnlyApplied, true);
  const s4Ref = validS4Data.application.referenceNumber;

  // 4. Isolation anti-IDOR sur GET /api/applications
  const listBRes = await appsRoute.GET(new Request('http://localhost:3000/api/applications', {
    headers: { Authorization: `Bearer ${tokenB}` }
  }));
  const listBData = await listBRes.json();
  assert.equal(listBData.applications.length, 0, 'ONG Beta ne doit voir aucun dossier d\'ONG Alpha');

  // 5. Complément documentaire (request-complement -> provide-complement), scellement & co-signature ministérielle sur S4
  await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/validate-payment', 'POST', { referenceNumber: s4Ref }, tokenAgent),
    { params: { action: 'validate-payment' } }
  );
  const reqCompRes = await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/request-complement', 'POST', {
      referenceNumber: s4Ref,
      reason: 'Préciser les codes SH douaniers sur la liste de colisage P5'
    }, tokenAgent),
    { params: { action: 'request-complement' } }
  );
  assert.equal(reqCompRes.status, 200);
  assert.equal((await reqCompRes.json()).application.status, 'COMPLEMENT_REQUIS');

  const provCompRes = await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/provide-complement', 'POST', {
      referenceNumber: s4Ref,
      docCode: 'P5_PROJET'
    }, tokenA),
    { params: { action: 'provide-complement' } }
  );
  assert.equal(provCompRes.status, 200);
  assert.equal((await provCompRes.json()).application.status, 'EN_COURS_INSTRUCTION');

  await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/approve-seal', 'POST', { referenceNumber: s4Ref }, tokenDg),
    { params: { action: 'approve-seal' } }
  );
  const cosignRes = await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/cosign-ministry', 'POST', {
      referenceNumber: s4Ref,
      ministryReference: 'CAB/MIN-AS/2026/0888'
    }, tokenMin),
    { params: { action: 'cosign-ministry' } }
  );
  assert.equal(cosignRes.status, 200);
  assert.equal((await cosignRes.json()).application.ministryCoSigned, true);

  // 6. Téléchargement PDF officiel réservé au propriétaire et tracé (REQ-09)
  const forbiddenPdfRes = await certPdfRoute.GET(
    new Request(`http://localhost:3000/api/applications/certificate.pdf?ref=${encodeURIComponent(s4Ref)}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    })
  );
  assert.equal(forbiddenPdfRes.status, 403, 'Un autre requérant ne peut pas télécharger le PDF');

  const ownerPdfRes = await certPdfRoute.GET(
    new Request(`http://localhost:3000/api/applications/certificate.pdf?ref=${encodeURIComponent(s4Ref)}&token=${tokenA}`)
  );
  assert.equal(ownerPdfRes.status, 200);
  assert.equal(ownerPdfRes.headers.get('content-type'), 'application/pdf');
  const pdfBytes = Buffer.from(await ownerPdfRes.arrayBuffer());
  assert.ok(pdfBytes.subarray(0, 8).toString('ascii').startsWith('%PDF-1.4'));

  // 7. Décision de rejet motivé par la DG (ADM-06) sur un nouveau dossier
  const s2Res = await appsRoute.POST(
    jsonReq('http://localhost:3000/api/applications', 'POST', {
      serviceCode: 'S2',
      projectTitle: 'Demande incomplète à rejeter',
      goodsSummary: 'Divers',
      paymentReference: 'RAWBANK-S2-003',
      attachedDocuments: baseDocsWithoutP2
    }, tokenA)
  );
  const s2Ref = (await s2Res.json()).application.referenceNumber;
  const rejectRes = await actionRoute.POST(
    jsonReq('http://localhost:3000/api/applications/reject', 'POST', {
      referenceNumber: s2Ref,
      reason: 'Objet non éligible au partenariat humanitaire'
    }, tokenDg),
    { params: { action: 'reject' } }
  );
  assert.equal(rejectRes.status, 200);
  assert.equal((await rejectRes.json()).application.status, 'REJETE');

  // 8. Centre de notifications & protection anti-IDOR sur le marquage lu (NOT-01..04)
  const notifARes = await notifRoute.GET(
    new Request('http://localhost:3000/api/notifications', { headers: { Authorization: `Bearer ${tokenA}` } })
  );
  assert.equal(notifARes.status, 200);
  const notifAData = await notifARes.json();
  assert.ok(notifAData.unreadCount >= 4, 'ONG Alpha doit avoir reçu les notifications du cycle de vie');
  const targetNotifId = notifAData.notifications[0].id;

  // ONG Beta tente de marquer comme lue la notification d'ONG Alpha -> 404
  const idorMarkRes = await notifRoute.PUT(
    jsonReq('http://localhost:3000/api/notifications', 'PUT', { notificationId: targetNotifId, read: true }, tokenB)
  );
  assert.equal(idorMarkRes.status, 404);

  // ONG Alpha marque sa propre notification comme lue -> 200
  const okMarkRes = await notifRoute.PUT(
    jsonReq('http://localhost:3000/api/notifications', 'PUT', { notificationId: targetNotifId, read: true }, tokenA)
  );
  assert.equal(okMarkRes.status, 200);
  assert.equal((await okMarkRes.json()).notification.read, true);

  // 9. Administration des requérants (ADM-03), export CSV d'audit (ADM-07) et CMS (ADM-10)
  const appListAdminRes = await adminApplicantsRoute.GET(
    new Request('http://localhost:3000/api/admin/applicants?q=Alpha', { headers: { Authorization: `Bearer ${tokenAdmin}` } })
  );
  assert.equal(appListAdminRes.status, 200);
  const appListAdminData = await appListAdminRes.json();
  assert.ok(appListAdminData.applicants.some(u => u.id === userA.id && u.applicationsCount >= 3));

  const auditCsvRes = await adminAuditRoute.GET(
    new Request(`http://localhost:3000/api/admin/audit?targetId=${encodeURIComponent(s4Ref)}&format=csv`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    })
  );
  assert.equal(auditCsvRes.status, 200);
  const csvText = await auditCsvRes.text();
  assert.ok(csvText.includes('CERTIFICATE_DOWNLOADED'));

  const createNewsRes = await cmsRoute.POST(
    jsonReq('http://localhost:3000/api/cms/news', 'POST', {
      title: 'Communiqué Sprint 3 : Mise en service du centre de notifications',
      summary: 'Suivi temps réel des décisions d\'instruction et téléchargement PDF sécurisé.'
    }, tokenAdmin)
  );
  assert.equal(createNewsRes.status, 201);
});

test('27. Sprint 4 API Next.js : Relayer & File Résiliente d\'Ancrage (BLK-09, BLK-10), Déploiement Polygon Amoy (BLK-11), File Hors-Ligne PWA (REQ-11) & Jalon G2 Alpha / Sauvegarde Chiffrée (GOV-12, OPS-05)', async () => {
  const loginRoute = await import('../src/app/api/auth/login/route.js');
  const registerRoute = await import('../src/app/api/auth/register/route.js');
  const anchorQueueRoute = await import('../src/app/api/blockchain/anchor-queue/route.js');
  const deployRoute = await import('../src/app/api/blockchain/deploy/route.js');
  const pwaSyncRoute = await import('../src/app/api/pwa/sync/route.js');
  const opsGatesRoute = await import('../src/app/api/ops/gates/route.js');
  const verifyRoute = await import('../src/app/api/verify/route.js');

  const jsonReq = (url, method, body, token = '') =>
    new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

  const loginAs = async (email, password) => {
    const res = await loginRoute.POST(jsonReq('http://localhost:3000/api/auth/login', 'POST', { email, password }));
    assert.equal(res.status, 200);
    return res.json();
  };

  const pwaEmail = `ong.pwa.${Date.now()}@kivu.cd`;
  await registerRoute.POST(jsonReq('http://localhost:3000/api/auth/register', 'POST', {
    organizationName: 'ONG Résilience 3G Nord-Kivu',
    representativeName: 'Chantal Kahindo',
    email: pwaEmail,
    password: 'PasswordRDC#2026'
  }));

  const { sessionToken: tokenReq } = await loginAs(pwaEmail, 'PasswordRDC#2026');
  const { sessionToken: tokenAgent } = await loginAs('agent@fnpss.cd', 'StaffFNPSS#2026');
  const { sessionToken: tokenDg } = await loginAs('dg@fnpss.cd', 'StaffFNPSS#2026');
  const { sessionToken: tokenAdmin } = await loginAs('admin@fnpss.cd', 'StaffFNPSS#2026');

  // 1. Contrôle RBAC sur le Relayer & File Résiliente d'Ancrage (BLK-09, BLK-10)
  const unauthQueueRes = await anchorQueueRoute.GET(new Request('http://localhost:3000/api/blockchain/anchor-queue'));
  assert.equal(unauthQueueRes.status, 401);

  const reqForbiddenQueue = await anchorQueueRoute.GET(
    new Request('http://localhost:3000/api/blockchain/anchor-queue', {
      headers: { Authorization: `Bearer ${tokenReq}` }
    })
  );
  assert.equal(reqForbiddenQueue.status, 403);

  const statusQueueRes = await anchorQueueRoute.GET(
    new Request('http://localhost:3000/api/blockchain/anchor-queue', {
      headers: { Authorization: `Bearer ${tokenDg}` }
    })
  );
  assert.equal(statusQueueRes.status, 200);
  const statusQueueData = await statusQueueRes.json();
  assert.equal(statusQueueData.relayer.zeroCryptoForApplicant, true);
  assert.equal(statusQueueData.relayer.gasSponsorshipModel, 'BACKEND_PAYMASTER_RELAYER');

  // Mise en file d'attente d'un acte pendant une coupure RPC (isNetworkOnline: false) puis reprise (isNetworkOnline: true)
  const queuedHash = '0x' + 'c4'.repeat(32);
  const queuedCert = `FNPSS-QUEUE-2026-${Date.now()}`;
  const enqueueRes = await anchorQueueRoute.POST(
    jsonReq('http://localhost:3000/api/blockchain/anchor-queue', 'POST', {
      action: 'enqueue',
      docHash: queuedHash,
      certificateNumber: queuedCert,
      serviceCode: 6,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 365
    }, tokenDg)
  );
  assert.equal(enqueueRes.status, 201);
  assert.equal((await enqueueRes.json()).job.status, 'QUEUED');

  // Coupure réseau simulée : le job reste en attente avec NETWORK_OFFLINE_QUEUED
  const offlineFlushRes = await anchorQueueRoute.POST(
    jsonReq('http://localhost:3000/api/blockchain/anchor-queue', 'POST', {
      action: 'flush',
      isNetworkOnline: false
    }, tokenDg)
  );
  assert.equal(offlineFlushRes.status, 200);
  const offlineFlushData = await offlineFlushRes.json();
  const offlineJob = offlineFlushData.processed.find(j => j.docHash === queuedHash);
  assert.equal(offlineJob.lastError, 'NETWORK_OFFLINE_QUEUED');

  // Reprise réseau : le job est confirmé et ancré sur le registre
  const onlineFlushRes = await anchorQueueRoute.POST(
    jsonReq('http://localhost:3000/api/blockchain/anchor-queue', 'POST', {
      action: 'flush',
      isNetworkOnline: true
    }, tokenDg)
  );
  assert.equal(onlineFlushRes.status, 200);
  const onlineFlushData = await onlineFlushRes.json();
  const confirmedJob = onlineFlushData.processed.find(j => j.docHash === queuedHash);
  assert.equal(confirmedJob.status, 'CONFIRMED');
  assert.match(confirmedJob.txHash, /^0x[0-9a-f]{64}$/);

  // Vérification publique immédiate de l'acte ancré via la file résiliente
  const checkAnchored = await verifyRoute.GET(new Request(`http://localhost:3000/api/verify?hash=${queuedHash}`));
  assert.equal(checkAnchored.status, 200);
  assert.equal((await checkAnchored.json()).verdict, 'PASTILLE_VERTE_VALIDE');

  // 2. Déploiement & Qualification du Smart Contract sur Polygon Amoy Testnet (BLK-11, BLK-12)
  const getDeployRes = await deployRoute.GET(
    new Request('http://localhost:3000/api/blockchain/deploy', {
      headers: { Authorization: `Bearer ${tokenAgent}` }
    })
  );
  assert.equal(getDeployRes.status, 200);
  const getDeployData = await getDeployRes.json();
  assert.equal(getDeployData.networks.AMOY_TESTNET.chainId, 80002);

  // Rejet du réseau déprécié Mumbai (80001)
  const mumbaiRes = await deployRoute.POST(
    jsonReq('http://localhost:3000/api/blockchain/deploy', 'POST', { networkKey: 'polygon-mumbai' }, tokenAdmin)
  );
  assert.equal(mumbaiRes.status, 400);

  // Rejet de Mainnet (137) tant que l'audit serveur n'est pas activé, même si le client passe auditPassed: true
  const mainnetBlockedRes = await deployRoute.POST(
    jsonReq('http://localhost:3000/api/blockchain/deploy', 'POST', { networkKey: 'polygon-mainnet', auditPassed: true }, tokenAdmin)
  );
  assert.equal(mainnetBlockedRes.status, 400);

  // Déploiement et smoke test sur Polygon Amoy Testnet (80002)
  const amoyDeployRes = await deployRoute.POST(
    jsonReq('http://localhost:3000/api/blockchain/deploy', 'POST', {
      networkKey: 'polygon-amoy',
      initialRelayerBalancePol: 30
    }, tokenAdmin)
  );
  assert.equal(amoyDeployRes.status, 201);
  const amoyDeployData = await amoyDeployRes.json();
  assert.equal(amoyDeployData.deployment.network.chainId, 80002);
  assert.equal(amoyDeployData.deployment.sourceCodeVerified, true);
  assert.equal(amoyDeployData.deployment.smokeTest.passed, true);

  // 3. File Hors-Ligne PWA & Synchronisation Idempotente anti-doublon (REQ-11)
  const draftRes = await pwaSyncRoute.POST(
    jsonReq('http://localhost:3000/api/pwa/sync', 'POST', {
      action: 'save-draft',
      draft: {
        serviceCode: 'S1',
        projectTitle: 'Brouillon hors-ligne Masisi',
        goodsSummary: 'Tentes médicales',
        paymentReference: 'RAWBANK-PWA-DRAFT-01'
      }
    }, tokenReq)
  );
  assert.equal(draftRes.status, 200);
  assert.equal((await draftRes.json()).draft.projectTitle, 'Brouillon hors-ligne Masisi');

  const pwaPayload = {
    serviceCode: 'S1',
    projectTitle: 'Enrôlement hors-ligne 3G Masisi',
    goodsSummary: 'Équipements cliniques',
    paymentReference: 'RAWBANK-PWA-SYNC-001',
    uploadedDocTypes: ['P1_REQUETE', 'P3_PLAN_ACTION', 'P4_RAPPORT', 'P5_PROJET', 'P6_QUITTANCE']
  };

  // Premier envoi en file hors-ligne -> 201 (deduplicated: false)
  const pwaEnq1 = await pwaSyncRoute.POST(
    jsonReq('http://localhost:3000/api/pwa/sync', 'POST', { action: 'enqueue', payload: pwaPayload }, tokenReq)
  );
  assert.equal(pwaEnq1.status, 201);
  const pwaEnq1Data = await pwaEnq1.json();
  assert.equal(pwaEnq1Data.submission.deduplicated, false);

  // Rebond réseau 3G (même demande soumise une seconde fois) -> 200 (deduplicated: true, zéro doublon)
  const pwaEnq2 = await pwaSyncRoute.POST(
    jsonReq('http://localhost:3000/api/pwa/sync', 'POST', { action: 'enqueue', payload: pwaPayload }, tokenReq)
  );
  assert.equal(pwaEnq2.status, 200);
  assert.equal((await pwaEnq2.json()).submission.deduplicated, true);

  // Synchronisation automatique au retour de la connexion
  const pwaSyncRes = await pwaSyncRoute.POST(
    jsonReq('http://localhost:3000/api/pwa/sync', 'POST', { action: 'sync', isOnline: true }, tokenReq)
  );
  assert.equal(pwaSyncRes.status, 200);
  const pwaSyncData = await pwaSyncRes.json();
  assert.equal(pwaSyncData.results.length, 1);
  assert.equal(pwaSyncData.results[0].status, 'SYNCED');
  assert.match(pwaSyncData.results[0].referenceNumber, /^FNPSS\/DEM\//);

  // 4. Évaluation du Jalon G2 Alpha (GOV-12) et Sauvegarde Chiffrée AES-256-GCM (OPS-05)
  const gatesRes = await opsGatesRoute.GET(
    new Request('http://localhost:3000/api/ops/gates', {
      headers: { Authorization: `Bearer ${tokenDg}` }
    })
  );
  assert.equal(gatesRes.status, 200);
  const gatesData = await gatesRes.json();
  assert.equal(gatesData.milestoneG2Alpha.gate, 'G2');
  assert.equal(gatesData.milestoneG2Alpha.status, 'VALIDATED');
  assert.equal(gatesData.evaluation.allGatesGreen, true);

  // Sauvegarde chiffrée : refusée sans clé explicite 64 hex
  const noKeyBackup = await opsGatesRoute.POST(
    jsonReq('http://localhost:3000/api/ops/gates', 'POST', { action: 'backup' }, tokenAdmin)
  );
  assert.equal(noKeyBackup.status, 400);

  const explicitKey = 'e5'.repeat(32);
  const backupRes = await opsGatesRoute.POST(
    jsonReq('http://localhost:3000/api/ops/gates', 'POST', {
      action: 'backup',
      encryptionKeyHex: explicitKey
    }, tokenAdmin)
  );
  assert.equal(backupRes.status, 200);
  const backupBundle = (await backupRes.json()).backup;
  assert.equal(backupBundle.cipherAlgorithm, 'AES-256-GCM');

  const restoreRes = await opsGatesRoute.POST(
    jsonReq('http://localhost:3000/api/ops/gates', 'POST', {
      action: 'restore',
      backup: backupBundle,
      encryptionKeyHex: explicitKey
    }, tokenAdmin)
  );
  assert.equal(restoreRes.status, 200);
  assert.equal((await restoreRes.json()).integrityVerified, true);
});

