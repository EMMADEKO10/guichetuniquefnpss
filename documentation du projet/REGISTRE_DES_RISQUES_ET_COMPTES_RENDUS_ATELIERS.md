# Comptes Rendus des Ateliers Métier (A1–A4), Gabarits Officiels (S1–S6) et Registre des Risques

> **Références Backlog :** `GOV-03` (Ateliers de co-création avec les directions du FNPSS) · `GOV-06` (Registre des risques et plan de mitigation) · `VER-01` (Gabarits normés des 6 actes officiels)
> **Date :** Mardi 03 novembre 2026 (Semaine 1 — Jour 2) · **Sprint :** Sprint 0 · **Jalon associé :** `G1` (20/11/2026)

---

## 1. Comptes Rendus des Ateliers de Co-Création Métier (`GOV-03`)

### 1.1 Atelier A1 — Direction des Études, de la Planification et des Partenariats
* **Périmètre :** Services **S1** (Attestation d'enrôlement), **S2** (Convention de partenariat avec le Gouvernement), **S5** (Certificat de philanthropie).
* **Besoins exprimés et décisions validées (MoSCoW) :**
  1. **`[Must]` Unicité du Numéro d'Enrôlement (`S1`) :** Chaque ONG/ASBL/Fondation reçoit un identifiant permanent (`FNPSS-ENR-AAAA-NNNNN`). Dès que son attestation `S1` est active, le portail pré-remplit automatiquement la pièce `P2_ENROLEMENT` lors des demandes `S2` à `S6` (*principe Once-Only*).
  2. **`[Must]` Distinction des signataires (`S1`/`S5` vs `S2`) :** Les actes `S1` et `S5` sont signés par la Direction Générale du FNPSS. La Convention `S2` comporte le visa technique du DG FNPSS suivi du contre-seing du Ministre des Affaires Sociales, Actions Humanitaires et Solidarité Nationale (`D1`).
  3. **`[Should]` Alertes d'échéance :** Notification automatique par email et in-app 30 jours avant l'expiration d'une attestation d'enrôlement ou d'une convention.

### 1.2 Atelier A2 — Direction des Opérations Sociales & Exonérations Humanitaires
* **Périmètre :** Services **S3** (Attestation des biens à exonérer), **S4** (Certificat d'exonérations), **S6** (Arrêté ministériel portant avis favorable pour l'exonération).
* **Besoins exprimés et décisions validées (MoSCoW) :**
  1. **`[Must]` Traçabilité de la liste de colisage (`P5_PROJET`) :** L'acte officiel (`S3`, `S4`, `S6`) et la page de vérification douanière DGDA doivent afficher explicitement le **descriptif synthétique et quantitatif des biens exonérés** (ex. nombre de véhicules, groupes électrogènes, kits médicaux et valeur CIF en USD) afin d'empêcher toute substitution de marchandise au poste frontière.
  2. **`[Must]` Gestion des demandes de complément (`SC-02`) :** Les 3 motifs les plus fréquents de renvoi sont : (a) absence de signature sur la requête `P1`, (b) liste des biens `P5` non valorisée ou sans numéro de châssis/BL, (c) rapport annuel `P4` incomplet. Lorsqu'un agent place le dossier en `COMPLEMENT_REQUIS`, le compteur SLA de **10 jours ouvrables** est automatiquement mis en pause jusqu'au dépôt de la pièce corrigée par l'ONG.

### 1.3 Atelier A3 — Direction Administrative et Financière (DAF FNPSS)
* **Périmètre :** Collecte et contrôle des frais réglementaires (`20 USD` frais de dépôt + `300 USD` frais d'enquête de conformité = `320 USD` payables en équivalent CDF).
* **Besoins exprimés et décisions validées (MoSCoW) :**
  1. **`[Must]` Déclenchement opposable du SLA (`D2` / `REQ-10`) :** Le délai légal de **10 jours ouvrables** ne démarre pas au simple téléversement du bordereau par l'ONG, mais à l'horodatage exact de l'action `VALIDATE_PAYMENT` par l'agent habilité après vérification de la référence bancaire/Mobile Money (`P6_QUITTANCE`).
  2. **`[Should]` Affichage bi-monétaire USD / CDF :** Le portail affiche systématiquement le détail `20 USD + 300 USD = 320 USD` ainsi que sa contre-valeur indicative en Francs Congolais (CDF) selon le taux directeur paramétré.

### 1.4 Atelier A4 — Cellule Juridique FNPSS, Cabinet du Ministère de Tutelle & DGDA
* **Périmètre :** Valeur juridique probante, mentions obligatoires sur le PDF scellé (`VER-01`, `VER-02`) et protocole de contrôle douanier (`VER-03`, `VER-05`).
* **Besoins exprimés et décisions validées (MoSCoW) :**
  1. **`[Must]` Souveraineté et confidentialité absolue on-chain :** Aucune donnée nominative ni document PDF n'est stocké sur la blockchain publique Polygon ; seul le condensat cryptographique `SHA-256` (`bytes32`), le numéro d'acte, le code service (`1` à `6`), les timestamps d'émission/expiration et le statut (`ACTIVE` / `REVOKED`) figurent dans `FNPSSRegistry.sol`.
  2. **`[Must]` Verdict visuel immédiat pour les inspecteurs DGDA (< 3 secondes) :**
     - **Pastille Verte (`GREEN_VALID`) :** Acte authentique, actif et dans sa période de validité — *Franchise douanière autorisée*.
     - **Pastille Rouge (`RED_FALSIFIED_OR_UNKNOWN` / `RED_REVOKED`) :** Document falsifié (hash absent) ou acte révoqué par le FNPSS — *Bloquer immédiatement le dédouanement*.
     - **Pastille Grise (`GRAY_EXPIRED`) :** Acte authentique mais dont la date de validité est échue.

---

## 2. Spécification des Gabarits Officiels des 6 Actes (`VER-01`)

Chaque acte généré par le moteur PDF ([src/pdf/certificate-generator.mjs](../src/pdf/certificate-generator.mjs)) respecte un gabarit normé propre au service :

| Code | Préfixe Numéro | Titre Officiel sur l'Acte PDF | Visa Juridique & Mentions Spécifiques | Signataire(s) | Durée de Validité Standard |
|---|---|---|---|---|---|
| **S1** | `FNPSS-ENR-AAAA-NNNNN` | **ATTESTATION D'ENRÔLEMENT AU FNPSS** | Vu le Décret portant création, organisation et fonctionnement du FNPSS ; Atteste que l'organisme est régulièrement inscrit au répertoire national des acteurs sociaux et humanitaires. | Direction Générale du FNPSS | 24 mois (730 jours) |
| **S2** | `FNPSS-CNV-AAAA-NNNNN` | **CONVENTION DE PARTENARIAT AVEC LE GOUVERNEMENT DE LA RDC** | Accord-cadre définissant les engagements réciproques d'intervention sociale et humanitaire sur le territoire national. | DG FNPSS + Ministre de Tutelle (`D1`) | 36 mois (1095 jours) |
| **S3** | `FNPSS-BIE-AAAA-NNNNN` | **ATTESTATION DES BIENS À EXONÉRER** | Certifie que la liste qualitative et quantitative des équipements, véhicules, intrants médicaux ou vivres est exclusivement affectée au projet social approuvé. | Direction Générale du FNPSS | 12 mois (365 jours) |
| **S4** | `FNPSS-CEX-AAAA-NNNNN` | **CERTIFICAT D'EXONÉRATIONS** | Confère le bénéfice du régime d'exonération conformément aux textes en vigueur, opposable après contrôle du QR Code par la DGDA / DGRAD. | Direction Générale du FNPSS | 12 mois (365 jours) |
| **S5** | `FNPSS-PHI-AAAA-NNNNN` | **CERTIFICAT DE PHILANTHROPIE** | Reconnaît la qualité d'acteur philanthropique d'intérêt général contribuant au Fonds et aux œuvres de promotion sociale en RDC. | Direction Générale du FNPSS | 12 mois (365 jours) |
| **S6** | `FNPSS-EXO-AAAA-NNNNN` | **ARRÊTÉ MINISTÉRIEL PORTANT AVIS FAVORABLE POUR L'EXONÉRATION** | Vu l'avis technique favorable émis par la Direction Générale du FNPSS après enquête de conformité ; Émet un avis favorable pour l'octroi des facilités douanières et fiscales. | Ministre de Tutelle sur proposition du DG FNPSS (`D1`) | 12 mois (365 jours) |

---

## 3. Registre Opérationnel des Risques et Plan de Mitigation (`GOV-06`)

*Échelle de cotation : Probabilité ($P \in [1..5]$) × Impact ($I \in [1..5]$) = Criticité ($C \in [1..25]$). Critique $\ge 15$, Majeur $9..14$, Modéré $\le 8$.*

| ID | Catégorie | Description du Risque | Prob. (1-5) | Impact (1-5) | Score ($P \times I$) | Propriétaire | Plan de Mitigation (Prévention) & Contingence | Statut au 03/11/2026 |
|---|---|---|---|---|---|---|---|---|
| **R01** | Métier / Gouvernance | **Retard de signature dans les cabinets ministériels** pour les actes conjoints (`S2`, `S6`), bloquant le délai de 10 jours ouvrables. | 4 | 4 | **16 (Critique)** | Sponsor (DG FNPSS) & PO | **Mitigation :** Adoption de l'`ADR-001` (Option C hybride) distinguant le SLA d'instruction FNPSS (10j ouvrés) du délai de contre-seing ministériel, avec notification automatique au point focal du Ministère. | **Mitigé** (`ADR-001` validé) |
| **R02** | Terrain / Réseau RDC | **Coupures Internet ou faible débit 2G/3G** en province (Goma, Kananga, Bukavu, postes frontières DGDA) empêchant le dépôt ou le scan QR. | 5 | 3 | **15 (Critique)** | Tech Lead & Architecte | **Mitigation :** Sauvegarde locale automatique des brouillons en mode PWA (`REQ-11`), file d'attente d'ancrage résiliente `ResilientAnchorQueue` (`BLK-10`) et page de vérification DGDA ultra-légère (< 15 Ko, sans framework lourd). | **Mitigé** (Implémenté & testé `SC-05`) |
| **R03** | Sécurité / Fraude | **Tentative de présentation d'un PDF falsifié** (quantités de biens modifiées ou faux tampon) à un poste frontière DGDA. | 4 | 4 | **16 (Critique)** | Architecte Blockchain & DGDA | **Mitigation :** Ancrage systématique du hash `SHA-256` sur `FNPSSRegistry.sol` + vérification par QR Code ou recalcul d'empreinte du fichier PDF affichant une **Pastille Rouge** immédiate en cas d'écart d'un seul octet. | **Mitigé** (Implémenté & testé `SC-03`) |
| **R04** | Juridique / Souveraineté | **Fuite ou exposition de données sensibles d'ONG** sur un registre blockchain public. | 2 | 5 | **10 (Majeur)** | Tech Lead & Cellule Juridique | **Mitigation :** Architecture *Privacy-by-Design* : `0 octet` de donnée personnelle on-chain (uniquement `bytes32 docHash`) et chiffrement au repos `AES-256-GCM` (`OPS-05`) pour les fichiers stockés sur MinIO/S3 souverain. | **Mitigé** (Vérifié par CI & tests) |
| **R05** | Blockchain / Exploitation | **Épuisement du solde de gaz (POL/MATIC) du Relayer FNPSS** ou congestion RPC Polygon bloquant l'ancrage des nouveaux certificats. | 3 | 4 | **12 (Majeur)** | Ingénieur DevOps / Blockchain | **Mitigation :** Provision initiale couvrant > 150 000 actes (< 0,005 USD/acte), alerte automatique dès que le solde du Relayer passe sous le seuil de sécurité, bascule RPC multi-fournisseurs (Alchemy/Infura) et mise en file d'attente sans perte (`BLK-10`). | **Sous contrôle** |
| **R06** | Financier / Délais | **Délais d'homologation bancaire / Mobile Money** retardant l'ouverture du tunnel de soumission. | 4 | 3 | **12 (Majeur)** | DAF FNPSS & PO | **Mitigation :** Application de l'`ADR-002` : démarrage dès le Sprint 2 avec le téléversement et la validation numérique de la quittance (`20 USD + 300 USD`), prêt à brancher les webhooks Mobile Money sans bloquer le pilote. | **Mitigé** (`ADR-002` validé) |
| **R07** | Adoption / Conduite du changement | **Difficulté de prise en main** par des ONG peu familières avec le Web3 ou par les agents sur le terrain. | 3 | 3 | **9 (Majeur)** | Chef de Projet & UX Designer | **Mitigation :** Abstraction totale de la blockchain via **Web3Auth** (connexion Email / Google OAuth sans seed phrase ni crypto-monnaie), interfaces contrastées et sessions de formation dédiées (`DEP-03` à `DEP-05`). | **Sous contrôle** |
| **R08** | Sécurité Applicative | **Compromission d'un compte agent/signataire** ou tentative d'accès par force brute. | 2 | 5 | **10 (Majeur)** | Responsable Sécurité (QA/SEC) | **Mitigation :** Hachage `scrypt` salé, verrouillage anti-brute-force après 5 échecs (`REQ-01`), contrôle RBAC strict sur chaque action (`ADM-01`), coupe-circuit d'urgence `setPaused(true)` sur le Smart Contract (`BLK-07`) et révocation d'acte immédiate (`VER-06`). | **Mitigé** |
