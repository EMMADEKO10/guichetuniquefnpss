# Dossier de Revue du Jalon G1 (Cadrage), Fiches de Décision D1 à D4 & Projet de Compte Rendu COPIL (`GOV-09`, `GOV-05`, `GOV-11`, `UX-04`, `UX-05`)

**Projet :** Guichet Unique Dématérialisé du FNPSS (RDC)
**Semaine :** S3, du 16/11 au 20/11/2026
**Jalon :** G1 Cadrage, le 20/11/2026, décideur : COPIL
**Références Backlog :** `GOV-09`, `GOV-05`, `GOV-11`, `GOV-01`, `UX-04`, `UX-05`

> [!IMPORTANT]
> Ce dossier **prépare** la décision, il ne la prend pas. Les décisions D1 à D4 et le compte rendu du COPIL sont des actes humains du FNPSS. Toutes les fiches ci-dessous sont au statut **PROPOSÉ** et les signatures sont vides.

---

## 1. Verdict automatisé de préparation

Le verdict est calculé par [`evaluateG1Gate()`](../src/ops/g1-gate-reviewer.mjs) et exposé sur `GET /api/ops/g1-gate`. Il s'appuie sur des preuves vérifiables, pas sur des indicateurs saisis à la main.

| Verdict possible | Signification |
|---|---|
| `BLOCKED_MISSING_EVIDENCE` | Une preuve documentaire manque ou l'audit d'accessibilité échoue |
| `PENDING_COPIL_DECISIONS` | Preuves complètes, mais D1 à D4 ne sont pas toutes tranchées |
| `READY_FOR_COPIL_SIGNATURE` | Tout est prêt, il manque le compte rendu COPIL signé |
| `G1_PASSED` | Uniquement si le compte rendu COPIL signé est déclaré |

**Verdict à la date de rédaction : `PENDING_COPIL_DECISIONS`.**

### 1.1 Preuves documentaires contrôlées

| Preuve | Fichier | Issue | Présente |
|---|---|---|---|
| Cahier des charges fonctionnel | `SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md` | `GOV-07` | Oui |
| Architecture et modèle de données | `ARCHITECTURE_TECHNIQUE_ET_MODELE_DONNEES.md` | `GOV-08` | Oui |
| Wireframes et stratégie qualité | `WIREFRAMES_UI_ET_STRATEGIE_QUALITE.md` | `UX-02`, `UX-03` | Oui |
| Prototype interactif | `prototype/index.html` | `UX-04` | Oui |
| Registre des risques | `REGISTRE_DES_RISQUES_ET_COMPTES_RENDUS_ATELIERS.md` | `GOV-06` | Oui |
| Registre des décisions (ADR) | `ADR_DECISIONS_CADRAGE.md` | `GOV-05` | Oui |

> [!NOTE]
> « Présente » signifie que le fichier existe. L'**approbation** du cahier des charges et des maquettes par le COPIL reste à obtenir, c'est l'objet de la séance du 20/11.

---

## 2. Audit d'accessibilité du prototype (`UX-04`, `UX-05`)

Audit **statique et automatisable** de `prototype/index.html`, référentiel WCAG 2.1 AA.

| Contrôle | Résultat |
|---|---|
| Langue du document (`lang="fr"`) | Conforme |
| Balise `viewport` mobile-first | Conforme |
| Titre de page | Conforme |
| Images avec attribut `alt` | Conforme (aucune image) |
| Media queries (petits écrans) | Conforme (2) |
| Contrastes texte/fond ≥ 4,5:1 | Conforme (10 couples) |

### 2.1 Ratios de contraste mesurés

| Usage | Ratio |
|---|---|
| Texte courant sur fond de page | 13,56 |
| Texte courant sur carte | 14,68 |
| Texte secondaire sur carte | 6,05 |
| Texte secondaire sur fond de page | 5,59 |
| Blanc sur bleu marine | 15,54 |
| Blanc sur bleu FNPSS | 7,52 |
| Bouton principal (blanc sur `#1a73e8`) | **4,51** |
| Bouton succès | 5,95 |
| Bouton Web3 | 8,02 |
| Bouton danger | 4,77 |

> [!WARNING]
> Le bouton principal est à 4,51 pour un seuil de 4,5 : la marge est quasi nulle. Toute retouche de la couleur `--fnpss-accent` doit être recontrôlée.
> La couleur or (`#f59e0b`) n'est utilisée qu'en bordure décorative et n'est donc pas évaluée comme texte.

### 2.2 Ce que cet audit ne couvre pas

- Test avec un lecteur d'écran (NVDA, TalkBack).
- Navigation complète au clavier et ordre du focus.
- Taille des cibles tactiles et lisibilité sur écran réel en 3G.
- Revue manuelle par des personnes utilisatrices.

Ces vérifications restent à planifier avec le QA (`SEC-01`) avant le jalon G3.

---

## 3. Fiches de décision D1 à D4

Chaque fiche contient une **proposition** de l'équipe projet. Le champ « Décision COPIL » est à remplir en séance.

### D1 : Traitement manuel conservé ou workflow numérique complet (`GOV-05`)

| Champ | Contenu |
|---|---|
| Contexte | La présentation du guichet indique un traitement manuel avec notification en fin de traitement. La note blockchain prévoit des validations multi-acteurs. |
| Proposition | **Palier 1** au lancement : suivi numérique des statuts et scellement. Le circuit multi-niveaux (`ADM-08`) est un **palier 2**. |
| Impact | `ADM-08` reste en priorité *Could* ; aucun surcoût au palier 1. |
| Référence | ADR-001 dans `ADR_DECISIONS_CADRAGE.md` |
| Décision COPIL | ☐ Proposition retenue ☐ Modifiée ☐ Rejetée |
| Décideur / Date | |

### D2 : Canal de paiement des frais, 20 USD de dépôt et 300 USD d'enquête (`GOV-11`)

| Champ | Contenu |
|---|---|
| Contexte | Les montants et le délai de 10 jours ouvrables sont fixés, pas le canal. |
| Proposition | **Dépôt de la preuve de paiement P6** avec réconciliation par le FNPSS ; paiement en ligne reporté. |
| Impact | Moteur de réconciliation et anti-doublon déjà réalisé (`src/finance/payment-reconciliation.mjs`, tests 14). |
| Point à confirmer | Le FNPSS doit fournir les comptes bancaires et le format réel des relevés. |
| Décision COPIL | ☐ Proposition retenue ☐ Modifiée ☐ Rejetée |
| Décideur / Date | |

### D3 : Budget retenu et périmètre couvert (`GOV-01`)

| Champ | Contenu |
|---|---|
| Contexte | Version V3 à 11 000 USD ou V2 à 46 500 USD, pour un périmètre identique. |
| Proposition | **Aucune.** Il s'agit d'un arbitrage budgétaire du Sponsor. |
| Information utile | Le risque `R01` est noté 9 dans le registre ; voir `PLANIFICATION_GLOBALE.md`, section 7. |
| Décision COPIL | ☐ V3 ☐ V2 ☐ Autre : |
| Décideur / Date | |

### D4 : Réutiliser le prototype existant ou reconstruire en Next.js (`UX-04`)

| Champ | Contenu |
|---|---|
| Contexte | Le prototype existant sert de référence visuelle ; la cible technique est Next.js. |
| Proposition | **Réutiliser** le prototype HTML comme référence UX validée, et **reconstruire** en Next.js en phase 2. |
| Impact | Change les estimations des epics `REQ` et `ADM`. |
| Décision COPIL | ☐ Proposition retenue ☐ Modifiée ☐ Rejetée |
| Décideur / Date | |

---

## 4. Points d'attention pour le COPIL

1. **Cohérence des décisions.** Le garde-fou du module de pilotage Go/No-Go (`evaluateGoNoGoGates`) parle de décisions « D1 à D6 », alors que le plan de référence en compte quatre (D1 à D4). À aligner.
2. **Indicateurs par défaut.** `evaluateGoNoGoGates` positionne ses indicateurs G1 à `true` par défaut. Pour G1, la source de vérité est désormais `evaluateG1Gate`.
3. **Approbation formelle.** Aucun document n'est « approuvé » tant que le COPIL ne l'a pas signé.

---

## 5. Projet de Compte Rendu du COPIL de revue G1 (à compléter en séance)

| Champ | Contenu |
|---|---|
| Date de la séance | 20/11/2026 |
| Participants | |
| Ordre du jour | Revue des preuves G1 ; décisions D1 à D4 ; approbation du cahier des charges et des maquettes ; registre des risques |
| Décisions prises | |
| Réserves éventuelles | |
| Verdict du jalon G1 | ☐ Franchi ☐ Franchi avec réserves ☐ Non franchi |

**Signatures :**

| Rôle | Nom | Signature | Date |
|---|---|---|---|
| Sponsor (DG FNPSS) | | | |
| Représentant du Ministère | | | |
| Chef de projet | | | |

> [!CAUTION]
> Tant que ce compte rendu n'est pas signé, le jalon G1 ne doit pas être considéré comme franchi. Le module [`g1-gate-reviewer.mjs`](../src/ops/g1-gate-reviewer.mjs) ne retourne `G1_PASSED` que sur déclaration explicite de cette signature.
