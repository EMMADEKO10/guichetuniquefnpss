# guichetuniquefnpss
Ce guichet unique (portail web) est un point d’accès qui permet aux différents requérants et autres acteurs de soumettre une demande au Fonds National de Promotion et de Service Social (FNPSS.) partout où ils se trouvent et suivre l’évolution de leurs demandes à distance et en temps réel.

## Documentation et Spécifications
- **Spécifications Fonctionnelles et Cas d'Utilisation :** [SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md](documentation%20du%20projet/SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md)
- **Présentation Métier & Écrans :** [GUICHET UNIQUE FNPSS.pdf](documentation%20du%20projet/GUICHET%20UNIQUE%20FNPSS.pdf)
- **Note Technique Blockchain (V3) :** [Note_Technique_FNPSS_Blockchain_V3.pdf](documentation%20du%20projet/Note_Technique_FNPSS_Blockchain_V3.pdf)
- **Planification globale (16 semaines, jalons, risques, budget) :** [PLANIFICATION_GLOBALE.md](documentation%20du%20projet/PLANIFICATION_GLOBALE.md)

## Livrables du Sprint 0 — Phase 1 : Cadrage, Architecture & UX/UI (Jalon G1)
- **Charte Projet & Gouvernance (`GOV-01`, `GOV-02`) :** [CHARTE_PROJET_ET_GOUVERNANCE.md](documentation%20du%20projet/CHARTE_PROJET_ET_GOUVERNANCE.md) · [Version Google Docs](https://docs.google.com/document/d/1GF5jsMygKOqODq4fQ5YADeuw8GhBLdK2etXbiCpekec/edit)
- **Cartographie des Flux S1–S6 & Ateliers (`GOV-03`, `GOV-04`) :** [CARTOGRAPHIE_DES_FLUX_ET_ATELIERS_S1_S6.md](documentation%20du%20projet/CARTOGRAPHIE_DES_FLUX_ET_ATELIERS_S1_S6.md) · [Version Google Docs](https://docs.google.com/document/d/1MJNGhH_Nqtsakrx4SEpWBZneavGksX1nr3khSzUi_Rs/edit)
- **Ateliers A1–A4, Gabarits Officiels S1–S6 & Registre des Risques (`GOV-03`, `GOV-06`, `VER-01`) :** [REGISTRE_DES_RISQUES_ET_COMPTES_RENDUS_ATELIERS.md](documentation%20du%20projet/REGISTRE_DES_RISQUES_ET_COMPTES_RENDUS_ATELIERS.md) · [Version Google Docs](https://docs.google.com/document/d/1xnKoGWX33F91zq4R58UkYW7ePs68GyOxy79bqrdPI5E/edit)
- **Décisions d'Architecture & Cadrage ADR (`GOV-05`, `GOV-11`, `BLK-01`) :** [ADR_DECISIONS_CADRAGE.md](documentation%20du%20projet/ADR_DECISIONS_CADRAGE.md) · [Version Google Docs](https://docs.google.com/document/d/1WhIl_BoZzsOKS2p70RwlewL1GTPT-aYM5e9yGAXC4VY/edit)
- **Diagramme de Séquence (ONG -> FNPSS -> Polygon -> DGDA, A4 Paysage) :** [Version Google Docs](https://docs.google.com/document/d/1hPtFXqaWz70FdJj2zqxHlbYO3TuBlRdnJETGPDugJtw/edit)
- **Personas & Parcours Utilisateurs (`UX-01`) :** [PERSONAS_ET_PARCOURS_UTILISATEURS.md](documentation%20du%20projet/PERSONAS_ET_PARCOURS_UTILISATEURS.md) · [Version Google Docs](https://docs.google.com/document/d/1-FnsQIfRAQIwC50cufHhEjRm_x9cw7TDOcAn_Rlt0E0/edit)
- **Architecture Technique, Schéma PostgreSQL & Smart Contract (`GOV-08`, `OPS-03`, `BLK-04`) :** [ARCHITECTURE_TECHNIQUE_ET_MODELE_DONNEES.md](documentation%20du%20projet/ARCHITECTURE_TECHNIQUE_ET_MODELE_DONNEES.md) · [Version Google Docs](https://docs.google.com/document/d/1Ee0le054i1keJI6VXZQizJ4UP54czqBHMTdGsnDTwPk/edit)
- **Wireframes UI (Requérant, Back-Office, DGDA) & Plan Qualité (`UX-02`, `UX-03`, `UX-06`, `SEC-01`) :** [WIREFRAMES_UI_ET_STRATEGIE_QUALITE.md](documentation%20du%20projet/WIREFRAMES_UI_ET_STRATEGIE_QUALITE.md) · [Version Google Docs](https://docs.google.com/document/d/10zLGEgYxIU9nDXG1L4Lo6Usi1vQ67e_t6hlAgaYGQPQ/edit)
- **Conformité Juridique RDC, Valeur Probante SHA-256 & Protection des Données (`SEC-06`) :** [CONFORMITE_JURIDIQUE_ET_VALEUR_PROBANTE_RDC.md](documentation%20du%20projet/CONFORMITE_JURIDIQUE_ET_VALEUR_PROBANTE_RDC.md) · [Version Google Docs](https://docs.google.com/document/d/1CMMC2k_NBfkidQzGD0y6a-0ECuOTSYEizOWCNJS9ydw/edit)

## Socle Technique, Moteur Métier & Prototype Interactif (Sprint 0 / Sprint 1)
- **Prototype Interactif UI Haute Fidélité (`UX-04`) :** [prototype/index.html](prototype/index.html) *(Portail Requérant `S1`–`S6`, Back-Office d'instruction & scellement SHA-256, Contrôle Douanier QR & PDF DGDA, Registre Polygon & Audit)*
- **Smart Contract Solidity (`BLK-05`, `BLK-06`, `BLK-07`) :** [contracts/FNPSSRegistry.sol](contracts/FNPSSRegistry.sol)
- **Spécification OpenAPI 3.1 d'Interopérabilité DGDA / DGRAD / DGI (`VER-05`) :** [openapi/fnpss-dgda-api.yaml](openapi/fnpss-dgda-api.yaml)
- **Schéma Base de Données PostgreSQL & Référentiel S1–S6 (`OPS-03`) :** [database/schema.sql](database/schema.sql) · [database/seed.sql](database/seed.sql)
- **Moteur Métier, Authentification, Notifications, CMS, Cryptographie & Registre On-Chain (`REQ`, `ADM`, `NOT`, `BLK`, `VER`) :**
  - Catalogue des 6 services, calcul des frais (`20$ + 300$`) et SLA 10 jours ouvrables : [src/domain/services-catalog.mjs](src/domain/services-catalog.mjs)
  - Authentification Hybride Web2/Web3Auth, Google OAuth 2.0 & Gestion Profils ONG (`REQ-01`..`04`, `BLK-02`/`03`, `ADM-03`) : [src/auth/auth-service.mjs](src/auth/auth-service.mjs)
  - Centre de Notifications Transactionnelles (Email & In-App) & Messagerie Dossier (`NOT-01`..`04`) : [src/notifications/notification-center.mjs](src/notifications/notification-center.mjs)
  - Garde-fou Téléversement PDF Anti-Malware (`REQ-07`) & Vérificateur d'Intégrité PDF sans scan QR (`VER-04`) : [src/storage/document-upload-guard.mjs](src/storage/document-upload-guard.mjs)
  - CMS des Actualités FNPSS (`REQ-13`, `ADM-10`) & Tableau de Bord Statistique Exécutif (`ADM-09`) : [src/cms/news-and-stats.mjs](src/cms/news-and-stats.mjs)
  - Scellement SHA-256, chiffrement AES-256-GCM (`OPS-05`) et QR Code : [src/crypto/document-sealer.mjs](src/crypto/document-sealer.mjs)
  - Générateur des 6 gabarits officiels PDF 1.4 (`VER-01`, `VER-02`) : [src/pdf/certificate-generator.mjs](src/pdf/certificate-generator.mjs)
  - Simulateur Smart Contract & File d'ancrage résiliente hors-ligne (`BLK-10`) : [src/blockchain/registry-simulator.mjs](src/blockchain/registry-simulator.mjs)
  - Machine à états des dossiers, RBAC (`ADM-01`) et Journal d'Audit (`ADM-07`) : [src/workflow/application-engine.mjs](src/workflow/application-engine.mjs)
  - Serveur HTTP, API REST du moteur & API d'interopérabilité DGDA (`VER-05`) : [src/server.mjs](src/server.mjs)
- **Suite de Tests Automatisés (`BLK-08`, `SEC-01`, `SEC-02`) :** [tests/guichet-unique.test.mjs](tests/guichet-unique.test.mjs) (`npm test`)
- **Environnements Docker & Configuration (`OPS-02`, `OPS-05`) :** [docker-compose.yml](docker-compose.yml) · [.env.example](.env.example)
- **Intégration Continue & Déploiement Backlog GitHub Actions (`OPS-01`) :** [.github/workflows/ci.yml](.github/workflows/ci.yml) · [.github/workflows/bootstrap-backlog.yml](.github/workflows/bootstrap-backlog.yml)

## Démarrage rapide en local
```bash
# Exécuter la suite de tests automatisés (Services S1-S6, Cryptographie, Smart Contract, Scénarios SC-01 à SC-05)
npm test

# Lancer le serveur local (Prototype interactif + API DGDA sur http://localhost:3000)
npm run serve:prototype
```

## Pilotage du projet
- **Mise en route GitHub Projects, jalons et issues :** [.github/planning/README.md](.github/planning/README.md)
- **Conventions de contribution (branches, commits, PR, DoD) :** [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)
