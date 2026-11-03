/**
 * @fileoverview Suite de tests automatisés du Guichet Unique FNPSS (BLK-08, SEC-01, SEC-02) :
 * - Tests unitaires du catalogue des 6 services, des frais (20$ + 300$) et du SLA de 10 jours ouvrables
 * - Tests cryptographiques SHA-256, chiffrement AES-256-GCM (OPS-05) et QR Code dynamique
 * - Tests exhaustifs du Smart Contract Registry (registerDocument, coSignDocument, revokeDocument, verifyDocument, RBAC, Pause)
 * - Tests de bout en bout des 5 scénarios opérationnels (SC-01 à SC-05)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FNPSS_SERVICES,
  calculateServiceFees,
  validateRequiredDocuments,
  computeSlaDueDate
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
  const server = createGuichetServer();

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
  const server = createGuichetServer();

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




