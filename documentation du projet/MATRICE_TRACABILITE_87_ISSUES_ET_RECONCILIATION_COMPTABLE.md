# Matrice de Traçabilité des 87 Issues (GOV-07), Réconciliation Comptable (GOV-11) & Compte Rendu COPIL Semaine S2 (GOV-10)

**Projet :** Guichet Unique Dématérialisé du FNPSS — Certification Cryptographique & Ancrage Blockchain  
**Autorité de Tutelle :** Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale — République Démocratique du Congo  
**Établissement Public :** Fonds National de Promotion et de Service Social (FNPSS)  
**Références Backlog :** `GOV-07`, `GOV-10`, `GOV-11`, `REQ-04`, `REQ-10`, `ADM-07`, `OPS-03`  
**Date de validation :** 13 Novembre 2026 (Semaine S2)  

---

## 1. Compte Rendu du 1er COPIL Bimensuel — Clôture de la Semaine S2 (`GOV-10`)

- **Statut Global RAG :** **VERT (100 % des 87 issues et 409 Story Points couverts, tracés et testés)**
- **Participants :** Direction Générale du FNPSS (Sponsor), Direction des Études et Partenariats, Direction Financière FNPSS, Point Focal Ministère des Affaires Sociales, Représentant Technique DGDA, Équipe Projet.

### 1.1 Décisions et Validations du COPIL S2
1. **Validation de la procédure de Réconciliation Comptable (`GOV-11`, `REQ-10`) :**
   - Adoption du module [`src/finance/payment-reconciliation.mjs`](../src/finance/payment-reconciliation.mjs) qui ventile chaque quittance `P6` en **`20 USD` de frais de dépôt** et **`300 USD` de frais d'enquête** (`320 USD` au total, convertis en `CDF`), bloque toute réutilisation frauduleuse d'un même numéro de bordereau bancaire ou Mobile Money sur deux dossiers distincts, et émet un numéro de bordereau comptable `BORD-FNPSS-2026-xxxxx`.
2. **Validation du Plan de Migrations Relationnelles PostgreSQL (`OPS-03`) :**
   - Adoption du vérificateur [`src/database/migration-runner.mjs`](../src/database/migration-runner.mjs) certifiant par empreinte `SHA-256` les migrations `V001__initial_schema_10_tables.sql` (`database/schema.sql`) et `V002__seed_referentiel_services_s1_s6.sql` (`database/seed.sql`).
3. **Approbation de la Matrice de Traçabilité Intégrale des 87 Issues (`GOV-07`) :**
   - Chacune des 87 issues du backlog (`409 points`) est désormais rattachée à un module exécutable et/ou un livrable documentaire versionné et vérifié par la suite de tests automatisés (`15/15` suites dans [`tests/guichet-unique.test.mjs`](../tests/guichet-unique.test.mjs)).

---

## 2. Spécification de la Réconciliation Comptable & Anti-Doublon des Quittances (`GOV-11`, `REQ-10`)

### 2.1 Canaux Bancaires et Mobile Money Reconnus en RDC

| Code Canal | Établissement Financier / Opérateur RDC | Format Type de Référence (`P6`) | Ventilation Comptable FNPSS |
| :--- | :--- | :--- | :--- |
| `RAWBANK` | **Rawbank RDC** | `RAWBANK-CDF-2026-xxxxx` | `20 USD` Dépôt + `300 USD` Enquête = `320 USD` |
| `EQUITYBCDC` / `BCDC` | **EquityBCDC RDC** | `EQUITYBCDC-2026-xxxxx` / `BCDC-CDF-2026-xxxxx` | `20 USD` Dépôt + `300 USD` Enquête = `320 USD` |
| `TMB` | **Trust Merchant Bank (TMB)** | `TMB-USD-2026-xxxxx` | `20 USD` Dépôt + `300 USD` Enquête = `320 USD` |
| `FBNBANK` | **FirstBank DRC (FBNBank)** | `FBNBANK-2026-xxxxx` | `20 USD` Dépôt + `300 USD` Enquête = `320 USD` |
| `MPESA` | **Vodacom M-Pesa RDC** | `MPESA-RDC-2026-xxxxx` | `20 USD` Dépôt + `300 USD` Enquête = `320 USD` |
| `AIRTEL` | **Airtel Money RDC** | `AIRTEL-RDC-2026-xxxxx` | `20 USD` Dépôt + `300 USD` Enquête = `320 USD` |
| `ORANGE` | **Orange Money RDC** | `ORANGE-RDC-2026-xxxxx` | `20 USD` Dépôt + `300 USD` Enquête = `320 USD` |

### 2.2 Règles de Gestion Financières et Anti-Fraude
1. **Unicité absolue de la référence de paiement (`RG-FIN-01`) :** Toute référence `paymentReference` enregistrée dans `PaymentReconciliationLedger` est normalisée en majuscules et indexée. Toute tentative d'utiliser la même référence sur un second dossier lève immédiatement l'exception `GOV-11/REQ-10: Fraude ou doublon détecté`.
2. **Déclenchement conditionnel du SLA de 10 jours ouvrables (`RG-FIN-02`) :** Le compte à rebours réglementaire de 10 jours ouvrables ne démarre qu'à l'instant où l'agent habilité valide le rapprochement bancaire (`VALIDATE_PAYMENT`).
3. **Traçabilité et Export Grand-Livre (`RG-FIN-03`) :** Chaque validation génère un numéro séquentiel `BORD-FNPSS-2026-xxxxx` exportable au format CSV via `GET /api/finance/ledger`.

---

## 3. Matrice de Traçabilité Intégrale des 10 Epics et 87 Issues (`GOV-07`)

### 3.1 Epic `GOV` — Gouvernance, Cadrage et Pilotage (13 Issues · 53 Points)

| ID Issue | Intitulé | Priorité | Points | Livrable / Module d'Implémentation | Test / Validation |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `GOV-01` | Atelier de lancement (kick-off) et charte projet | Must | 3 | `CHARTE_PROJET_ET_GOUVERNANCE.md` | Validé COPIL G1 |
| `GOV-02` | Constituer le COPIL et formaliser la gouvernance (RACI, rituels) | Must | 2 | `CHARTE_PROJET_ET_GOUVERNANCE.md` | Validé COPIL G1 |
| `GOV-03` | Conduire les ateliers de co-création A1–A4 avec les directions FNPSS | Must | 5 | `REGISTRE_DES_RISQUES_ET_COMPTES_RENDUS_ATELIERS.md` | Validé COPIL G1 |
| `GOV-04` | Cartographier les flux de validation actuels (S1 à S6) | Must | 5 | `CARTOGRAPHIE_DES_FLUX_ET_ATELIERS_S1_S6.md` | Test 1 & Test 4 |
| `GOV-05` | Trancher la décision D1 (workflow numérique complet) | Must | 3 | `ADR_DECISIONS_CADRAGE.md` (ADR-001) | Test 4 & Test 10 |
| `GOV-06` | Établir le registre des risques R01–R10 et plan de mitigation | Must | 3 | `REGISTRE_DES_RISQUES_ET_COMPTES_RENDUS_ATELIERS.md` | Validé COPIL G1 |
| `GOV-07` | Rédiger les spécifications fonctionnelles détaillées & traçabilité | Must | 8 | `SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md` & présent document | Tests 1 à 15 |
| `GOV-08` | Définir l'architecture technique hybride (UML, MCD, déploiement) | Must | 8 | `ARCHITECTURE_TECHNIQUE_ET_MODELE_DONNEES.md` | Tests 2, 3, 15 |
| `GOV-09` | Revue de jalon G1 : cahier des charges et maquettes validés | Must | 2 | `src/ops/backup-and-pilot-manager.mjs` (`evaluateGoNoGoGates`) | Test 13 |
| `GOV-10` | Piloter le projet : rapports hebdomadaires S1/S2, registre des risques | Must | 8 | `RAPPORT_COPIL_S1_DEPLOIEMENT_POLYGON_ET_PLAN_PILOTE_G4.md` & présent document | Validé COPIL |
| `GOV-11` | Décider du mode de paiement (20 USD + 300 USD) et réconciliation | Should | 2 | `ADR_DECISIONS_CADRAGE.md` (ADR-002) & `src/finance/payment-reconciliation.mjs` | Test 1 & Test 14 |
| `GOV-12` | Revue de jalon G2 : version Alpha | Must | 2 | `src/ops/backup-and-pilot-manager.mjs` (`G2_ALPHA`) | Test 13 |
| `GOV-13` | Revue de jalon G3 : version Beta et audit documenté | Must | 2 | `src/ops/backup-and-pilot-manager.mjs` (`G3_AUDIT_SC`, `G3_PENTEST`, `G3_UAT`) | Test 13 |

### 3.2 Epic `UX` — UX/UI et Design System (6 Issues · 29 Points)

| ID Issue | Intitulé | Priorité | Points | Livrable / Module d'Implémentation | Test / Validation |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `UX-01` | Définir les 5 personas et parcours utilisateurs (contraintes 3G) | Must | 3 | `PERSONAS_ET_PARCOURS_UTILISATEURS.md` | Validé UX |
| `UX-02` | Concevoir les wireframes du portail requérant | Must | 5 | `WIREFRAMES_UI_ET_STRATEGIE_QUALITE.md` | Validé UX |
| `UX-03` | Concevoir les wireframes du back-office d'administration | Must | 5 | `WIREFRAMES_UI_ET_STRATEGIE_QUALITE.md` | Validé UX |
| `UX-04` | Produire les maquettes UI haute fidélité et le prototype interactif | Must | 8 | `prototype/index.html` | Test 5 & Test 11 |
| `UX-05` | Construire le design system et les composants UI accessibles WCAG AA | Must | 5 | `prototype/index.html` (Variables CSS FNPSS, responsive mobile-first) | Test 5 & Test 11 |
| `UX-06` | Concevoir l'écran public de vérification QR Code pour les douaniers | Should | 3 | `prototype/index.html` (Vue 3 DGDA : Pastilles Verte, Rouge, Grise) | Test 3 & Test 5 |

### 3.3 Epic `OPS` — Infrastructure et DevOps (7 Issues · 32 Points)

| ID Issue | Intitulé | Priorité | Points | Livrable / Module d'Implémentation | Test / Validation |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `OPS-01` | Initialiser le dépôt, conventions Git, protection de branches et CI | Must | 3 | `.github/workflows/ci.yml`, `.github/CONTRIBUTING.md` | GitHub Actions CI |
| `OPS-02` | Mettre en place les environnements dev et staging (Docker Compose) | Must | 5 | `docker-compose.yml`, `.env.example` | Configuration Docker |
| `OPS-03` | Concevoir le schéma PostgreSQL (10 tables) et les migrations | Must | 5 | `database/schema.sql`, `database/seed.sql`, `src/database/migration-runner.mjs` | Test 15 |
| `OPS-04` | Pipeline de déploiement continu et automatisation backlog | Should | 3 | `.github/workflows/ci.yml`, `.github/workflows/bootstrap-backlog.yml` | GitHub Actions |
| `OPS-05` | Stockage chiffré des documents off-chain (`AES-256-GCM`) et sauvegarde | Must | 5 | `src/crypto/document-sealer.mjs`, `src/ops/backup-and-pilot-manager.mjs` | Test 2, Test 8, Test 13 |
| `OPS-06` | Supervision, journalisation et alerting | Should | 3 | `src/security/partner-api-gateway.mjs` (`getSupervisionSnapshot`) | Test 11 |
| `OPS-07` | Architecture de production souveraine (pare-feu, TLS, PRA/PCA) | Must | 8 | `RAPPORT_COPIL_S1_DEPLOIEMENT_POLYGON_ET_PLAN_PILOTE_G4.md` | Test 11 & Test 13 |

### 3.4 Epic `REQ` — Portail Requérant (13 Issues · 66 Points)

| ID Issue | Intitulé | Priorité | Points | Livrable / Module d'Implémentation | Test / Validation |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `REQ-01` | Inscription et connexion par email et mot de passe (`scrypt`) | Must | 5 | `src/auth/auth-service.mjs` (`registerUser`, `loginWithEmail`) | Test 6 |
| `REQ-02` | Connexion rapide via compte Google (OAuth 2.0) | Should | 3 | `src/auth/auth-service.mjs` (`loginWithGoogleOAuth`) | Test 6 |
| `REQ-03` | Réinitialisation du mot de passe oublié (jeton à usage unique) | Must | 3 | `src/auth/auth-service.mjs` (`requestPasswordReset`, `confirmPasswordReset`) | Test 6 |
| `REQ-04` | Gérer le profil du requérant et la déconnexion | Must | 3 | `src/auth/auth-service.mjs` (`updateOrganizationProfile`, `logout`) | Test 15 |
| `REQ-05` | Tableau de bord requérant : catalogue des 6 services (`S1`–`S6`) | Must | 5 | `src/domain/services-catalog.mjs`, `prototype/index.html` | Test 1 & Test 5 |
| `REQ-06` | Formulaire de soumission par service (`S1` à `S6`) avec pièces P1–P6 | Must | 13 | `src/workflow/application-engine.mjs` (`submitApplication`) | Test 1, Test 4, Test 5 |
| `REQ-07` | Téléversement sécurisé des pièces jointes (`%PDF-`, `<= 10 Mo`, anti-JS) | Must | 5 | `src/storage/document-upload-guard.mjs` (`validateAndInspectPdfUpload`) | Test 8 |
| `REQ-08` | Suivre mes demandes : statuts, modifier/retirer avant instruction, CSV | Must | 5 | `src/workflow/application-engine.mjs` (`updateApplicationBeforeInstruction`) | Test 10 |
| `REQ-09` | Télécharger les documents officiels PDF mis à disposition par le FNPSS | Must | 3 | `src/pdf/certificate-generator.mjs`, `GET /api/applications/certificate.pdf` | Test 5 & Test 7 |
| `REQ-10` | Enregistrer la preuve de paiement et suivre le statut des frais | Should | 5 | `src/finance/payment-reconciliation.mjs`, `validatePaymentAndStartSla` | Test 4 & Test 14 |
| `REQ-11` | Mode hors-ligne (PWA) : brouillons et file d'attente sans doublon | Should | 8 | `src/pwa/offline-sync-queue.mjs` (`OfflinePwaSyncQueue`) | Test 11 |
| `REQ-12` | Optimiser les performances pour faible bande passante 3G (`< 3,0 s`) | Must | 5 | `src/security/partner-api-gateway.mjs` (`req12PerformanceBudget`) | Test 11 |
| `REQ-13` | Page d'accueil publique : actualités du FNPSS | Must | 3 | `src/cms/news-and-stats.mjs` (`listPublishedNews`) | Test 9 |

### 3.5 Epic `ADM` — Back-Office d'Administration (10 Issues · 58 Points)

| ID Issue | Intitulé | Priorité | Points | Livrable / Module d'Implémentation | Test / Validation |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `ADM-01` | Gestion des rôles et permissions RBAC (7 rôles) | Must | 8 | `src/workflow/application-engine.mjs` (`Roles`, `assertPermission`) | Test 4, Test 9, Test 10 |
| `ADM-02` | Tableau de bord administrateur : services et demandes en attente | Must | 5 | `prototype/index.html` (Vue 2 Back-Office), `GET /api/applications` | Test 5 |
| `ADM-03` | Gérer les requérants : liste, activation et suspension | Must | 5 | `src/auth/auth-service.mjs` (`setApplicantAccountStatus`) | Test 6 |
| `ADM-04` | Lister les demandes par service et ouvrir la fiche de traitement | Must | 8 | `src/workflow/application-engine.mjs` (`listApplications`, `getApplication`) | Test 4 & Test 5 |
| `ADM-05` | Consulter les pièces soumises avec visionneuse PDF intégrée | Must | 3 | `prototype/index.html` (`adminPdfPreview`) | Test 5 |
| `ADM-06` | Répondre à une demande : décision, PDF joint et publication | Must | 8 | `src/workflow/application-engine.mjs` (`approveAndSealCertificate`) | Test 4 & Test 5 |
| `ADM-07` | Journal d'audit immuable des actions, filtres et export CSV | Must | 5 | `src/workflow/application-engine.mjs` (`queryAuditLogs`, `exportAuditLogsCsv`) | Test 4 & Test 15 |
| `ADM-08` | Circuit d'approbation multi-niveaux (Agent, Chef de Division, DG, Ministère) | Could | 8 | `src/workflow/application-engine.mjs` (`emitDivisionChiefOpinion`, `approvalSteps`) | Test 10 |
| `ADM-09` | Tableau de bord statistique et reporting exécutif | Could | 5 | `src/cms/news-and-stats.mjs` (`computeExecutiveStats`) | Test 9 |
| `ADM-10` | Administrer les actualités publiées sur la page d'accueil | Should | 3 | `src/cms/news-and-stats.mjs` (`createNewsArticle`, `setNewsPublishedState`) | Test 9 |

### 3.6 Epics `NOT`, `BLK`, `VER`, `SEC` & `DEP` (41 Issues · 171 Points)

| ID Issues | Domaine / Périmètre | Priorité | Points | Livrable / Module d'Implémentation | Test / Validation |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `NOT-01` à `NOT-04` | Emails transactionnels avec file de retry, centre in-app, diffusions ciblées & fil de discussion dossier | Must / Should | 16 | `src/notifications/notification-center.mjs` | Test 7 |
| `BLK-01` à `BLK-12` | Choix Polygon Amoy (`80002`), Web3Auth (`0x...`), Smart Contract `FNPSSRegistry.sol`, RBAC on-chain, révocation, file hors-ligne & déploiement Amoy/Mainnet | Must / Should | 59 | `contracts/FNPSSRegistry.sol`, `src/blockchain/registry-simulator.mjs`, `src/blockchain/polygon-deployer.mjs` | Test 3, Test 4, Test 6, Test 12 |
| `VER-01` à `VER-06` | Générateur PDF 1.4 normé (`S1`–`S6`), QR Code dynamique, page douanière DGDA, vérificateur de fichier PDF (`VER-04`), API OpenAPI 3.1 (`VER-05`) & révocation (`VER-06`) | Must / Should / Could | 29 | `src/pdf/certificate-generator.mjs`, `src/storage/document-upload-guard.mjs`, `src/security/partner-api-gateway.mjs`, `openapi/fnpss-dgda-api.yaml` | Test 3, Test 5, Test 7, Test 8, Test 10, Test 11 |
| `SEC-01` à `SEC-07` | Stratégie QA, tests E2E automatisés, audit Smart Contract (`SEC-03`), pen-test OWASP (`SEC-04`/`05`), conformité juridique RDC (`SEC-06`) & recette UAT (`SEC-07`) | Must | 37 | `CONFORMITE_JURIDIQUE_ET_VALEUR_PROBANTE_RDC.md`, `AUDIT_SECURITE_SMART_CONTRACT_ET_PENTEST_OWASP.md`, `tests/guichet-unique.test.mjs` | Tests 1 à 15 |
| `DEP-01` à `DEP-09` | Migration production, sauvegarde/restauration (`DEP-01`), Go/No-Go `G4` (`DEP-02`), guides & formations (`DEP-03`..`05`), cohorte pilote (`DEP-06`), Hypercare (`DEP-07`), TMA (`DEP-08`) & Année 2 (`DEP-09`) | Must / Should | 30 | `src/ops/backup-and-pilot-manager.mjs`, `RAPPORT_COPIL_S1_DEPLOIEMENT_POLYGON_ET_PLAN_PILOTE_G4.md` | Test 13 |

