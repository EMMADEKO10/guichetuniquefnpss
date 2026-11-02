# Registre des Décisions d'Architecture et de Cadrage (ADR)

> **Références Backlog :** `GOV-05` (Décision D1 : Workflow manuel vs numérique) · `GOV-11` (Décision D2 : Canal de paiement des frais) · `BLK-01` (Choix du réseau Blockchain Layer 2)
> **Sprint :** Sprint 0 (Semaines 1–2 : 02/11 → 13/11/2026) · **Jalon associé :** `G1` (20/11/2026)

---

## ADR-001 : Niveau de numérisation du circuit de traitement et de validation (`GOV-05` / Décision D1)

* **Statut :** Proposé pour validation au COPIL de lancement (Semaine 1–2)
* **Décideurs :** Sponsor (DG FNPSS), Product Owner FNPSS, Tech Lead
* **Issues impactées :** `GOV-05`, `GOV-07`, `ADM-06`, `ADM-08`, `BLK-06`

### 1. Contexte et Problème
Une divergence existe entre les deux documents sources du projet :
1. La présentation métier ([GUICHET UNIQUE FNPSS.pdf](GUICHET%20UNIQUE%20FNPSS.pdf)) indique : *« Toutes les procédures de traitement de dossiers resteront manuelles »* et précise que le FNPSS publie la réponse finale sur le portail à l'issue du traitement.
2. La [Note Technique Blockchain V3](Note_Technique_FNPSS_Blockchain_V3.pdf) prévoit des validations numériques, des rôles RBAC et un ancrage cryptographique sur la blockchain, dans une enveloppe budgétaire contrainte de **11 000 USD HT** et un délai fixe de **16 semaines**.

### 2. Options envisagées
* **Option A — Guichet « Boîte aux lettres » (100 % manuel en back-office) :** Le portail ne sert qu'à déposer la demande et à téléverser le PDF final signé manuellement. *Inconvénient :* aucune traçabilité interne des délais (10 jours ouvrables), pas de gestion structurée des demandes de compléments, faible valeur ajoutée pour les agents du FNPSS.
* **Option B — Workflow numérique intégral avec co-signature multisig on-chain multi-ministères dès le jour 1 :** Chaque étape interne (Agent → Chef de Division → DG → Cabinets de 3 Ministères) exige une signature cryptographique on-chain bloquante. *Inconvénient :* risque très élevé (`R02`, `R04`) de blocage opérationnel si un cabinet ministériel tarde à signer numériquement, et dépassement assuré du budget de 11 000 USD.
* **Option C (Recommandée) — Workflow hybride pragmatique en 2 paliers :**
  1. **Palier 1 (Lancement Pilote — Must) :** Suivi numérique des statuts dans le back-office FNPSS (`Soumis` → `En cours d'instruction` → `Complément requis` → `Validé / Rejeté`), visionneuse PDF intégrée (`ADM-05`), publication de l'acte officiel approuvé (`ADM-06`) avec **génération automatique du hash SHA-256, ancrage on-chain via le Relayer FNPSS (`BLK-09`) et incrustation du QR Code dynamique (`VER-02`)**. Les actes nécessitant un contre-seing ministériel (`S2`, `S6`) peuvent être signés selon la procédure administrative en vigueur puis scellés numériquement sur le portail avant délivrance.
  2. **Palier 2 (Option *Could* `ADM-08` / `BLK-06` ou Année 2) :** Activation progressive du circuit de co-signature multi-niveaux et *Multisig* interministériel directement dans l'interface dès que les cabinets ministériels sont équipés et formés.

### 3. Décision retenue (Proposition au COPIL)
Retenir l'**Option C** : elle garantit à 100 % la sécurité anti-fraude au poste frontière (DGDA), la transparence des délais pour les ONG et la conformité au droit administratif congolais (`R03`), tout en respectant strictement le budget de 11 000 USD et l'échéance du 19/02/2027.

---

## ADR-002 : Canal de collecte et de validation des frais administratifs (`GOV-11` / Décision D2)

* **Statut :** Proposé pour validation au COPIL (Semaine 1–2)
* **Décideurs :** Sponsor (DG FNPSS), DAF FNPSS, Product Owner
* **Issues impactées :** `GOV-11`, `REQ-06`, `REQ-10`, `ADM-04`

### 1. Contexte et Problème
Les frais réglementaires sont fixés à l'équivalent en Francs Congolais (CDF) de **20 USD** (frais de dépôt) et **300 USD** (frais d'enquête de conformité), avec un délai de traitement de **10 jours ouvrables** après paiement. Le canal technique d'encaissement n'était pas arrêté dans les documents initiaux.

### 2. Options envisagées
* **Option A — Téléversement de la preuve de paiement (Bordereau bancaire / Reçu Mobile Money) avec validation par la DAF/Agent FNPSS :** Le requérant règle sur le compte officiel du FNPSS, saisit la référence de transaction et joint le justificatif lors de la soumission (`REQ-06`, `REQ-10`). L'agent vérifie la pièce et clique sur « Valider le paiement », ce qui déclenche automatiquement le compte à rebours de 10 jours ouvrables.
* **Option B — Intégration directe d'un agrégateur de paiement en ligne (Mobile Money / Carte bancaire avec webhooks) :** Paiement instantané intégré au tunnel de soumission. *Contrainte :* nécessite la contractualisation financière FNPSS ↔ Agrégateur (M-Pesa, Airtel Money, Orange Money), des frais de commission à arbitrer et un délai d'homologation marchande souvent supérieur à 6 semaines.

### 3. Décision retenue (Proposition au COPIL)
Déployer l'**Option A en priorité `Must` dès le Sprint 2** pour ne jamais bloquer le calendrier technique par des délais contractuels bancaires, tout en concevant le module `REQ-10` avec une interface de paiement modulaire prête à brancher un agrégateur Mobile Money (Option B) dès l'obtention des accès marchands du FNPSS.

---

## ADR-003 : Choix du Réseau Blockchain Layer 2 et Environnement de Test (`BLK-01`)

* **Statut :** Validé techniquement
* **Décideurs :** Tech Lead, Développeur Blockchain
* **Issues impactées :** `BLK-01`, `BLK-05`, `BLK-09`, `BLK-11`, `BLK-12`

### 1. Contexte et Problème
La [Note Technique Blockchain V3](Note_Technique_FNPSS_Blockchain_V3.pdf) recommande une blockchain Layer 2 compatible EVM (**Polygon** ou **Celo**) et mentionne le réseau de test *Polygon Mumbai*. Or, le testnet *Polygon Mumbai* a été officiellement déprécié et arrêté en avril 2024 au profit de **Polygon Amoy**.

### 2. Comparaison Multicritère : Polygon PoS vs Celo

| Critère | Polygon PoS (Mainnet) + Amoy (Testnet) | Celo (Mainnet) + Alfajores (Testnet) |
|---|---|---|
| **Compatibilité EVM & Solidity** | 100 % standard (OpenZeppelin, Hardhat, Foundry, Viem/Ethers) | 100 % compatible EVM |
| **Temps de confirmation d'un bloc** | **~2,1 secondes** (objectif < 3 s respecté) | ~5 secondes (en transition L2 OP Stack) |
| **Coût moyen d'ancrage (`registerDocument`)** | **< 0,005 USD** par acte scellé | < 0,005 USD par acte scellé |
| **Coût de vérification (`verifyDocument` en douane)** | **0,00 USD** (appel RPC `eth_call` en lecture seule, sans gaz) | **0,00 USD** (lecture seule) |
| **Support Web3Auth & Relayers (ERC-4337)** | Support natif de premier rang (Alchemy, Infura, Biconomy, Pimlico) | Support disponible mais écosystème de relayers plus restreint |
| **Capacité avec la provision de gaz de 1 000 USD** | **> 150 000 actes officiels** ancrables | > 150 000 actes officiels ancrables |

### 3. Décision retenue
1. **Réseau de production (Mainnet — `BLK-12`) :** **Polygon PoS Mainnet** (`chainId: 137`), en raison de sa finalité quasi instantanée (~2 s, idéale pour l'expérience utilisateur et le contrôle douanier) et de la maturité de ses infrastructures RPC et de parrainage de gaz (*Gas Relayer*).
2. **Réseau de test (Phase 3 — `BLK-11`) :** **Polygon Amoy Testnet** (`chainId: 80002`), en remplacement de Polygon Mumbai déprécié.
3. **Portabilité garantie :** Les smart contracts Solidity (`FNPSSRegistry.sol`) sont 100 % agnostiques de la chaîne EVM et peuvent être redéployés sur Celo sans modifier une seule ligne de code applicatif (seule l'URL RPC et le `chainId` en variable d'environnement changent).

