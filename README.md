# guichetuniquefnpss
Ce guichet unique (portail web) est un point d’accès qui permet aux différents requérants et autres acteurs de soumettre une demande au Fonds National de Promotion et de Service Social (FNPSS.) partout où ils se trouvent et suivre l’évolution de leurs demandes à distance et en temps réel.

## Documentation et Spécifications
- **Spécifications Fonctionnelles et Cas d'Utilisation :** [SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md](documentation%20du%20projet/SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md)
- **Présentation Métier & Écrans :** [GUICHET UNIQUE FNPSS.pdf](documentation%20du%20projet/GUICHET%20UNIQUE%20FNPSS.pdf)
- **Note Technique Blockchain (V3) :** [Note_Technique_FNPSS_Blockchain_V3.pdf](documentation%20du%20projet/Note_Technique_FNPSS_Blockchain_V3.pdf)
- **Planification globale (16 semaines, jalons, risques, budget) :** [PLANIFICATION_GLOBALE.md](documentation%20du%20projet/PLANIFICATION_GLOBALE.md)

## Livrables du Sprint 0 — Phase 1 : Cadrage, Architecture & UX/UI (Jalon G1)
- **Charte Projet & Gouvernance (`GOV-01`, `GOV-02`) :** [CHARTE_PROJET_ET_GOUVERNANCE.md](documentation%20du%20projet/CHARTE_PROJET_ET_GOUVERNANCE.md)
- **Cartographie des Flux S1–S6 & Ateliers (`GOV-03`, `GOV-04`) :** [CARTOGRAPHIE_DES_FLUX_ET_ATELIERS_S1_S6.md](documentation%20du%20projet/CARTOGRAPHIE_DES_FLUX_ET_ATELIERS_S1_S6.md)
- **Décisions d'Architecture & Cadrage ADR (`GOV-05`, `GOV-11`, `BLK-01`) :** [ADR_DECISIONS_CADRAGE.md](documentation%20du%20projet/ADR_DECISIONS_CADRAGE.md)
- **Personas & Parcours Utilisateurs (`UX-01`) :** [PERSONAS_ET_PARCOURS_UTILISATEURS.md](documentation%20du%20projet/PERSONAS_ET_PARCOURS_UTILISATEURS.md)
- **Architecture Technique, Schéma PostgreSQL & Smart Contract (`GOV-08`, `OPS-03`, `BLK-04`) :** [ARCHITECTURE_TECHNIQUE_ET_MODELE_DONNEES.md](documentation%20du%20projet/ARCHITECTURE_TECHNIQUE_ET_MODELE_DONNEES.md)
- **Wireframes UI (Requérant, Back-Office, DGDA) & Plan Qualité (`UX-02`, `UX-03`, `UX-06`, `SEC-01`) :** [WIREFRAMES_UI_ET_STRATEGIE_QUALITE.md](documentation%20du%20projet/WIREFRAMES_UI_ET_STRATEGIE_QUALITE.md)

## Socle Technique & Prototype Interactif (Sprint 0 / Sprint 1)
- **Prototype Interactif UI Haute Fidélité (`UX-04`) :** [prototype/index.html](prototype/index.html) *(Portail Requérant `S1`–`S6`, Back-Office d'instruction & scellement SHA-256, Contrôle Douanier QR DGDA, Registre Polygon & Audit)*
- **Smart Contract Solidity (`BLK-05`, `BLK-06`, `BLK-07`) :** [contracts/FNPSSRegistry.sol](contracts/FNPSSRegistry.sol)
- **Schéma Base de Données PostgreSQL & Référentiel S1–S6 (`OPS-03`) :** [database/schema.sql](database/schema.sql) · [database/seed.sql](database/seed.sql)
- **Intégration Continue GitHub Actions (`OPS-01`) :** [.github/workflows/ci.yml](.github/workflows/ci.yml)

## Pilotage du projet
- **Mise en route GitHub Projects, jalons et issues :** [.github/planning/README.md](.github/planning/README.md)
- **Conventions de contribution (branches, commits, PR, DoD) :** [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)
