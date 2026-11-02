# Wireframes UX/UI (Requérant, Back-Office, Douane DGDA) et Stratégie Qualité

> **Références Backlog :** `UX-02` (Wireframes Portail Requérant) · `UX-03` (Wireframes Back-Office) · `UX-06` (Écran Douanier QR Code) · `SEC-01` (Stratégie de test et Plan Qualité)
> **Sprint :** Sprint 0 (Semaines 2–3) · **Jalon associé :** `G1` (20/11/2026)

---

## 1. Charte Ergonomique et Design System (`UX-04`, `UX-05`)

| Élément | Spécification Design System FNPSS |
|---|---|
| **Palette institutionnelle** | Bleu Souverain FNPSS (`#065A82`) · Bleu Action (`#1A73E8`) · Vert Validation DGDA (`#137333`) · Orange Instruction (`#E65100`) · Rouge Alerte/Fraude (`#D93025`) |
| **Typographie** | `Inter` ou `Roboto` (sans-serif système à haute lisibilité sur mobile Android et PC) |
| **Accessibilité & Contraste** | Conformité **WCAG 2.1 AA** sur portail/back-office et **WCAG AAA (> 7:1)** sur l'écran de contrôle douanier en plein soleil |
| **Performance Réseau (3G RDC)** | Poids initial < 150 Ko gzippé, indicateur d'état réseau (`En ligne` / `Mode hors-ligne : brouillon sauvegardé`) toujours visible |

---

## 2. Wireframes du Portail Requérant (`UX-02`)

### 2.1 Écran R1 — Tableau de Bord Requérant (Catalogue des 6 Services & Suivi)

```text
+--------------------------------------------------------------------------------------------------+
| [Logo FNPSS]  GUICHET UNIQUE DU FNPSS                      [🟢 Réseau OK] [🔔 2] [ONG Espoir ▾] |
+--------------------------------------------------------------------------------------------------+
| MENU                  |  BIENVENUE, ONG ESPOIR DU NORD-KIVU (N° Enrôlement : FNPSS/ENR/2025/112) |
|                       |                                                                          |
| ▸ Tableau de bord     |  [ Mes demandes soumises : 4 ]  [ Validées : 3 ]  [ En instruction : 1 ] |
| ▸ Mes demandes (4)    |                                                                          |
| ▸ Documents & Actes   |  CHOISISSEZ UN SERVICE POUR DÉPOSER UNE DEMANDE :                        |
| ▸ Profil de l'ONG     |  +-------------------------------+  +-------------------------------+    |
| ▸ Aide & Guide ONG    |  | S1 · Attestation d'enrôlement |  | S2 · Convention partenariat   |    |
|                       |  | Reconnaissance officielle ONG |  | Accord-cadre Gouvernement RDC |    |
|                       |  | Délai: 10j | Frais: 20$+300$  |  | Délai: 10j | Frais: 20$+300$  |    |
|                       |  |     [ Commencer par ici → ]   |  |     [ Commencer par ici → ]   |    |
|                       |  +-------------------------------+  +-------------------------------+    |
|                       |  +-------------------------------+  +-------------------------------+    |
|                       |  | S3 · Biens à exonérer         |  | S4 · Certificat d'exonérations|    |
|                       |  | Liste matériels & intrants    |  | Franchise douanière & fiscale |    |
|                       |  | Délai: 10j | Frais: 20$+300$  |  | Délai: 10j | Frais: 20$+300$  |    |
|                       |  |     [ Commencer par ici → ]   |  |     [ Commencer par ici → ]   |    |
|                       |  +-------------------------------+  +-------------------------------+    |
|                       |  +-------------------------------+  +-------------------------------+    |
|                       |  | S5 · Certificat philanthropie |  | S6 · Arrêté ministériel exon. |    |
|                       |  | Attestation utilité publique  |  | Avis favorable interminist.   |    |
|                       |  | Délai: 10j | Frais: 20$+300$  |  | Délai: 10j | Frais: 20$+300$  |    |
|                       |  |     [ Commencer par ici → ]   |  |     [ Commencer par ici → ]   |    |
|                       |  +-------------------------------+  +-------------------------------+    |
+--------------------------------------------------------------------------------------------------+
```

### 2.2 Écran R2 — Formulaire de Soumission Guidé (*Wizard* S1 à S6 — `REQ-06`)

```text
+--------------------------------------------------------------------------------------------------+
| NOUVELLE DEMANDE : S6 — Arrêté ministériel portant avis favorable pour l'exonération             |
| Étape [1. Projet & Biens]  ===>  [2. Pièces exigées (P1-P5)]  ===>  [3. Frais (P6) & Envoi]     |
+--------------------------------------------------------------------------------------------------+
| ℹ️ RAPPEL RÉGLEMENTAIRE :                                                                        |
| • Frais de dépôt : 20 USD (éq. CDF)  |  Frais d'enquête de conformité : 300 USD (éq. CDF)        |
| • Délai de traitement : 10 jours ouvrables à compter de la validation de la preuve de paiement.  |
+--------------------------------------------------------------------------------------------------+
| PIÈCES JUSTIFICATIVES EXIGÉES (Format PDF, max 10 Mo par fichier — Hachage SHA-256 automatique) :|
|                                                                                                  |
| [✅] P1. Requête adressée au Ministre (copie DG FNPSS)      requete_signee.pdf (420 Ko) [Changer]|
| [✅] P2. Copie de l'attestation d'enrôlement FNPSS          Pré-rempli depuis votre profil S1    |
| [✅] P3. Copie du plan d'action pour l'année en cours       plan_action_2026.pdf (1,8 Mo)        |
| [✅] P4. Copie du rapport annuel d'activités écoulé         rapport_2025.pdf (3,1 Mo)            |
| [📤] P5. Projet détaillé & liste valorisée des biens        [ Glisser un PDF ou Parcourir... ]   |
| [📤] P6. Bordereau / Quittance de paiement (20$ + 300$)     [ Glisser un PDF ou Parcourir... ]   |
|          Référence bancaire / Mobile Money : [ ____________________________ ]                    |
+--------------------------------------------------------------------------------------------------+
| 💾 Brouillon sauvegardé localement à 13:42   [ Enregistrer brouillon ]   [ Soumettre le dossier ]|
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Wireframes du Back-Office d'Administration FNPSS (`UX-03`)

### 3.1 Écran A1 — Poste d'Instruction Côte-à-Côte avec Visionneuse PDF (`ADM-04`, `ADM-05`, `ADM-06`)

```text
+--------------------------------------------------------------------------------------------------+
| BACK-OFFICE FNPSS | Dossier : FNPSS/DEM/2026/00048 | Service : S6 | SLA : ⏳ J+3 / 10j ouvrables  |
+------------------------------------------------+-------------------------------------------------+
| COLONNE GAUCHE : CONTRÔLE & DÉCISION           | COLONNE DROITE : VISIONNEUSE PDF INTÉGRÉE       |
|                                                |                                                 |
| Organisation : ONG Espoir du Nord-Kivu         | [Onglet actif : P1_requete_signee.pdf] [🔍 100%]|
| N° Enrôlement : FNPSS/ENR/2025/112 (Vérifié ✓) | +---------------------------------------------+ |
|                                                | | RÉPUBLIQUE DÉMOCRATIQUE DU CONGO            | |
| 1. VALIDATION DES FRAIS (20$ + 300$) :         | | Objet : Demande d'arrêté ministériel        | |
|    Réf : BCDC-2026-994812                      | | portant avis favorable d'exonération...     | |
|    Statut : [✅ Paiement Validé (Chrono actif)]| |                                             | |
|                                                | | Liste des biens humanitaires :              | |
| 2. CHECK-LIST DE RECEVABILITÉ DES PIÈCES :     | | - 2 Véhicules ambulance 4x4                 | |
|    [☑] P1. Requête au Ministre / DG   [Voir 👁]| | - 500 Kits médicaux d'urgence               | |
|    [☑] P2. Attestation d'enrôlement   [Voir 👁]| |                                             | |
|    [☑] P3. Plan d'action 2026         [Voir 👁]| | Hash SHA-256 vérifié : 9f86d081884c7d65...  | |
|    [☑] P4. Rapport annuel 2025        [Voir 👁]| +---------------------------------------------+ |
|    [☑] P5. Descriptif projet & biens  [Voir 👁]|                                                 |
|                                                | JOURNAL D'AUDIT DU DOSSIER :                    |
| 3. DÉCISION & PUBLICATION :                    | • 02/11 09:15 : Dossier soumis par l'ONG        |
|    (•) Valider & Publier l'acte scellé         | • 02/11 11:20 : Quittance validée par Agent P.K.|
|    ( ) Demander un complément (suspend SLA)    | • 04/11 14:10 : Enquête de conformité validée   |
|    ( ) Rejeter la demande (motif obligatoire)  |                                                 |
|                                                | [ Demander Complément ]  [ 🔏 Sceller & Publier ]|
+------------------------------------------------+-------------------------------------------------+
```

---

## 4. Wireframe de l'Écran Public de Contrôle Douanier DGDA (`UX-06`, `VER-03`)

Optimisé pour smartphone en extérieur (plein soleil, réseau 2G/3G, temps de réponse < 3 secondes, zéro mot de passe requis pour vérifier un QR Code) :

```text
      ÉTAT 1 : VALIDE (ACTIVE)                  ÉTAT 2 : FALSIFIÉ OU RÉVOQUÉ
+----------------------------------+      +----------------------------------+
| 🇨🇩 RÉPUBLIQUE DÉM. DU CONGO      |      | 🇨🇩 RÉPUBLIQUE DÉM. DU CONGO      |
|    CONTRÔLE DOUANIER FNPSS/DGDA  |      |    CONTRÔLE DOUANIER FNPSS/DGDA  |
+----------------------------------+      +----------------------------------+
|  ##############################  |      |  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  |
|  #     🟢 PASTILLE VERTE      #  |      |  x     🔴 PASTILLE ROUGE      x  |
|  #   CERTIFICAT AUTHENTIQUE   #  |      |  x   ALERTE : ACTE INVALIDE   x  |
|  #       ET EN VIGUEUR        #  |      |  x    FALSIFIÉ OU RÉVOQUÉ     x  |
|  ##############################  |      |  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  |
|                                  |      |                                  |
| N° Acte : FNPSS-EXO-2026-00124   |      | Motif :                          |
| Service : S6 - Arrêté Exonération|      | L'empreinte numérique ne         |
| Bénéficiaire :                   |      | correspond à aucun acte actif    |
|   ONG ESPOIR DU NORD-KIVU        |      | sur la Blockchain du FNPSS       |
|                                  |      | (ou l'acte a été révoqué).       |
| Validité : 05/11/2026 → 05/11/27 |      |                                  |
| Biens autorisés :                |      | CONSIGNE DGDA :                  |
| • 2 Ambulances 4x4 Toyota        |      | Retenir immédiatement la         |
| • 500 Kits médicaux d'urgence    |      | marchandise et saisir l'unité    |
|                                  |      | de lutte contre la fraude.       |
| Preuve Blockchain (Polygon) :    |      |                                  |
| Hash : 0x7f83b165...902a (Vérifié)|     | [ 📷 Scanner un autre QR Code ]  |
| [ 📷 Scanner un autre QR Code ]  |      | [ 📄 Vérifier un fichier PDF ]   |
+----------------------------------+      +----------------------------------+
```

---

## 5. Stratégie de Test et Plan Qualité (`SEC-01`)

### 5.1 Pyramide des Tests Automatisés et Manuels

| Niveau de test | Outil retenu | Périmètre vérifié | Seuil / Critère d'acceptation | Exécution |
|---|---|---|---|---|
| **1. Tests Unitaires Smart Contracts** | **Hardhat / Foundry** | `registerDocument`, `revokeDocument`, `verifyDocument`, `AccessControl`, `Pausable`, doublons de hash, expiration | **Couverture ≥ 90 %** des branches Solidity (`BLK-08`) | À chaque commit / PR (CI GitHub Actions) |
| **2. Tests Unitaires & Intégration API** | **Vitest + Supertest** | Calcul SHA-256, validation des 6 pièces, calcul du SLA de 10 jours ouvrables, contrôle RBAC par rôle | **100 % des routes critiques** testées avec rôles autorisés et non autorisés (`ADM-01`) | À chaque PR |
| **3. Tests End-to-End (E2E)** | **Playwright** | Les 5 scénarios opérationnels de bout en bout (`SC-01` à `SC-05`) sur profils Desktop et Mobile | **0 échec** sur les 5 parcours critiques (`SEC-02`) | Avant chaque fin de sprint et jalons `G2`, `G3`, `G4` |
| **4. Sécurité & Audit** | **Slither + OWASP ZAP + Audit Tiers** | Vulnérabilités Smart Contracts (réentrance, contrôle d'accès) et Top 10 OWASP Web/API | **0 vulnérabilité critique ou haute ouverte** (`SEC-03`, `SEC-04`, `SEC-05`) | S12–S13 (avant Jalon `G3`) |
| **5. Performance 3G & Offline** | **Lighthouse CI / Playwright Throttling** | Temps de réponse de la page de scan QR Code DGDA sous profil réseau 3G lent | **Verdict affiché en < 3 secondes** (`REQ-12`, `VER-03`) | S12–S13 |

### 5.2 Matrice des Jeux de Données de Recette Utilisateur (`UAT — SEC-07`)

| Code Scénario | Cas de test de recette avec le FNPSS et la DGDA | Résultat attendu |
|---|---|---|
| **UAT-SC01** | Dépôt complet d'une demande `S6` par une ONG pilote, validation de la quittance (`20$` + `300$`), approbation DG, ancrage Polygon Amoy et scan du QR Code par un smartphone DGDA. | Passage à `VALIDE_DELIVRE`, email reçu, PDF avec QR Code téléchargé, **Pastille Verte** en < 3 s au scan. |
| **UAT-SC02** | Dépôt d'une demande `S3` avec un rapport annuel non signé (`P4`), demande de complément par l'agent, puis re-téléversement par l'ONG. | Suspension du compteur de 10 jours ouvrables pendant l'attente, reprise du compteur dès réception de la pièce corrigée. |
| **UAT-SC03** | Altération volontaire d'un chiffre dans le PDF d'exonération émis, puis scan ou upload sur le portail de vérification DGDA (`VER-03`, `VER-04`). | Détection immédiate de la divergence de hash SHA-256 : affichage de la **Pastille Rouge (Document Falsifié)**. |
| **UAT-SC04** | Révocation administrative d'un certificat actif par la Direction Générale (`VER-06`) suivie d'un nouveau scan douanier. | État on-chain passé à `REVOKED`, affichage immédiat de la **Pastille Rouge (Document Révoqué)** avec le motif et la date. |
| **UAT-SC05** | Coupure de la connexion internet au milieu du remplissage du formulaire `S4`, fermeture puis réouverture au retour du réseau. | Brouillon restauré intégralement depuis `IndexedDB` sans aucune perte de saisie (`REQ-11`). |

