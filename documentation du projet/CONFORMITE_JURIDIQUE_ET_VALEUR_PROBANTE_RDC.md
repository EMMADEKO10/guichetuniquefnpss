# Conformité Juridique, Valeur Probante & Protection des Données en RDC (SEC-06)

**Projet :** Guichet Unique Dématérialisé du FNPSS — Certification Cryptographique & Ancrage Blockchain  
**Autorité de Tutelle :** Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale — République Démocratique du Congo  
**Établissement Public :** Fonds National de Promotion et de Service Social (FNPSS)  
**Références Backlog :** `SEC-06`, `OPS-05`, `BLK-09`, `VER-01` à `VER-05`  
**Date de validation :** 04 Novembre 2026  

---

## 1. Fondements Légaux et Réglementaires en République Démocratique du Congo

Le déploiement du **Guichet Unique Dématérialisé du FNPSS** et l'ancrage cryptographique des actes officiels (`S1` à `S6`) sur le Smart Contract `FNPSSRegistry.sol` s'inscrivent dans le cadre juridique national de la République Démocratique du Congo :

| Texte Juridique / Réglementaire (RDC) | Portée et Application directe au Guichet Unique FNPSS |
| :--- | :--- |
| **Ordonnance-Loi n° 23/010 du 13 mars 2023 portant Code du Numérique en RDC** | Reconnaît la validité juridique et la force probante des écrits électroniques, des signatures électroniques qualifiées, des cachets électroniques et de l'horodatage cryptographique produits par l'Administration publique. |
| **Décret n° 13/007 du 23 janvier 2013** fixant les statuts d'un Établissement Public dénommé FNPSS | Confère au FNPSS la mission d'enrôlement des acteurs sociaux/humanitaires (`S1`), d'instruction technique des demandes de facilités et d'exonérations (`S3`, `S4`, `S6`) et de promotion de la philanthropie (`S5`). |
| **Loi n° 004/2001 du 20 juillet 2001** portant dispositions générales applicables aux ASBL et Établissements d'utilité publique | Encadre les obligations déclaratives des ONG nationales et internationales (Plan d'action `P3`, Rapport annuel d'activités `P4`, Convention de partenariat `S2`). |
| **Ordonnance-Loi n° 10/002 du 20 août 2010 portant Code des Douanes (DGDA)** | Impose le contrôle d'authenticité et de conformité de tout titre d'exonération présenté aux postes frontaliers avant mainlevée douanière. |

---

## 2. Valeur Probante du Scellement Cryptographique SHA-256 + QR Code + Blockchain

Conformément au **Livre II et au Livre III du Code du Numérique de la RDC (Ordonnance-Loi n° 23/010)**, l'écrit sous forme électronique est admis en preuve au même titre que l'écrit sur support papier, sous réserve que puisse être dûment identifiée la personne ou l'autorité dont il émane et qu'il soit établi et conservé dans des conditions de nature à en garantir l'intégrité.

Le Guichet Unique FNPSS satisfait ces quatre exigences légales cumulatives :

| Exigence du Code du Numérique (RDC) | Mécanisme Technique Implémenté dans le Guichet Unique FNPSS | Garantie Opérationnelle pour la DGDA et les Juridictions |
| :--- | :--- | :--- |
| **1. Identification certaine de l'autorité émettrice** | Contrôle d'accès RBAC strict (`src/workflow/application-engine.mjs`), authentification forte de la Direction Générale (`Roles.DG`) et du Point Focal Ministériel (`Roles.MINISTERE`), et signature transactionnelle par le Relayer institutionnel FNPSS. | Seuls les comptes habilités de la Direction Générale du FNPSS et du Ministère de Tutelle peuvent déclencher l'émission d'un acte `S1`–`S6`. |
| **2. Garantie d'intégrité absolue du document** | Calcul déterministe du condensat cryptographique `SHA-256` (`bytes32`) sur le document canonique et sur le binaire PDF 1.4 (`src/crypto/document-sealer.mjs` & `src/storage/document-upload-guard.mjs`). | La modification d'un seul caractère ou d'un seul octet du PDF produit une empreinte `SHA-256` différente et déclenche immédiatement la **Pastille Rouge (Document Falsifié)** lors du contrôle douanier. |
| **3. Horodatage infalsifiable et non-répudiation** | Ancrage sur le Smart Contract `FNPSSRegistry.sol` (Polygon PoS) enregistrant de manière immuable `issuedAt`, `expiresAt`, `issuer`, `ministryCoSigner` et le hash de transaction `txHash`. | Impossibilité d'antidater un certificat d'exonération ou de contester la date exacte d'émission ou de révocation administrative. |
| **4. Opposabilité et vérification publique instantanée** | Génération d'un QR Code dynamique (`VER-02`) et d'un vérificateur de fichier PDF sans scan (`VER-04` — `POST /api/verify-pdf`) accessibles aux inspecteurs de la DGDA, de la DGRAD et de la DGI. | Suppression totale des faux arrêtés ministériels papier et vérification en moins de 2 secondes aux frontières. |

---

## 3. Protection des Données à Caractère Personnel et Confidentialité des Dossiers ONG

En application des dispositions du **Code du Numérique de la RDC relatives à la protection des données personnelles** et du principe de minimisation des données (`BLK-09`, `OPS-05`) :

### 3.1 Séparation stricte On-Chain / Off-Chain (Privacy by Design)
1. **Zéro donnée personnelle sur la Blockchain publique (`BLK-09`) :**
   - Aucun nom de représentant légal, aucune adresse email, aucun numéro de téléphone, ni aucun fichier PDF n'est stocké sur la Blockchain Polygon.
   - Seuls l'empreinte cryptographique irréversible `SHA-256` (`bytes32`), le numéro administratif de l'acte (`FNPSS-EXO-2026-xxxxx`), le code de service (`1` à `6`) et les horodatages (`issuedAt`, `expiresAt`, `status`) figurent dans `FNPSSRegistry.sol`.
2. **Chiffrement au repos `AES-256-GCM` (`OPS-05`) :**
   - Les pièces justificatives téléversées par les ONG (`P1` à `P6`) ainsi que les actes PDF générés sont chiffrés au repos via l'algorithme authentifié `AES-256-GCM` avec vecteur d'initialisation (`IV` de 96 bits) unique et tag d'authentification (`authTag` de 128 bits).
3. **Inspection de sécurité à l'entrée (`REQ-07`) :**
   - Tout fichier téléversé est soumis au garde-fou `validateAndInspectPdfUpload` (`src/storage/document-upload-guard.mjs`) qui vérifie l'en-tête magique `%PDF-`, impose la limite stricte de `10 Mo` et rejette tout objet actif potentiellement malveillant (`/JS`, `/JavaScript`, `/Launch`, `/EmbeddedFiles`, `/OpenAction`).

### 3.2 Registre des Traitements de Données (FNPSS)

| Catégorie de Données | Finalité Légale du Traitement | Base Légale (RDC) | Durée de Conservation | Mesures de Sécurité |
| :--- | :--- | :--- | :--- | :--- |
| **Identité des représentants d'ONG** (Nom, Post-nom, Email professionnel, Téléphone) | Gestion des comptes requérants, notifications transactionnelles (`NOT-01`), dérivation transparente Web3Auth (`BLK-03`). | Mission de service public (Décret FNPSS & Code du Numérique). | Durée d'activité de l'ONG + 5 ans après désactivation. | Hachage `scrypt` des mots de passe, verrouillage anti-brute-force (5 essais), TLS 1.3. |
| **Pièces justificatives annuelles et projets** (`P1` à `P5` : Statuts, Plan d'action, Rapport annuel, Colisage) | Instruction des demandes `S1` à `S6` et application du principe « Once-Only » (`REQ-08`). | Obligation légale et réglementaire (Loi n° 004/2001 & Décret FNPSS). | **10 ans** (Archivage légal probatoire). | Chiffrement au repos `AES-256-GCM`, contrôle d'accès RBAC strict. |
| **Preuves de paiement** (`P6` : Quittances `20 USD` dépôt + `300 USD` enquête) | Validation financière et déclenchement du délai réglementaire de 10 jours ouvrables (`REQ-10`). | Règlement financier du FNPSS et contrôle de gestion. | **10 ans** (Prescription comptable et fiscale en RDC). | Journalisation immuable dans `audit_logs` (`ADM-07`). |
| **Actes officiels scellés & Empreintes SHA-256** (`S1` à `S6`) | Contrôle douanier et fiscal par la DGDA, la DGRAD et la DGI (`VER-01` à `VER-05`). | Code des Douanes & Code du Numérique de la RDC. | **Permanente** (Empreinte `SHA-256` on-chain) / **10 ans** (PDF archivé). | Ancrage Smart Contract `FNPSSRegistry.sol` + sauvegarde S3 chiffrée. |

---

## 4. Clauses Mentions Légales Intégrées aux Actes Officiels générés (S1 à S6)

Chaque document PDF généré par `src/pdf/certificate-generator.mjs` comporte de plein droit :
1. L'en-tête officiel de la **République Démocratique du Congo**, du **Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale** et du **FNPSS**.
2. Le visa réglementaire propre au service (`S1` à `S6`) ainsi que la mention de co-signature ministérielle pour les services `S2` (Convention de partenariat) et `S6` (Arrêté ministériel portant avis favorable pour l'exonération).
3. Le bloc de **Sceau Cryptographique Blockchain Polygon** mentionnant :
   - L'empreinte `SHA-256 (docHash)` en 66 caractères hexadécimaux ;
   - Le hash de transaction `TxHash Polygon` ;
   - L'URL publique de vérification QR Code (`https://guichet.fnpss.cd/verifier?hash=...`) opposable lors des contrôles de la DGDA.
