# Plan d'Exécution Responsive Page par Page — Guichet Unique Dématérialisé FNPSS

> **Objectif :** Rendre l'ensemble des pages et composants du Guichet Unique FNPSS 100 % fluides, lisibles et utilisables au doigt sur smartphone, tablette et ordinateur, sans débordement horizontal ni perte d'accessibilité.

---

## 1. Breakpoints Cibles & Critères de Qualité

| Profil d'écran | Largeur de référence | Exigences clés |
| :--- | :--- | :--- |
| **Smartphone compact (RDC 3G)** | `360 px` | Zéro scroll horizontal global, police champs `≥ 16 px` (anti-zoom iOS), cibles tactiles `≥ 40 px`, header compact |
| **Grand smartphone** | `430 px` | Grilles KPI 2×2 lisibles, boutons d'action pleine largeur ou empilés proprement |
| **Tablette** | `768 px` | Passage fluide en 1 ou 2 colonnes, visionneuse documentaire adaptée |
| **Desktop / Grand écran** | `1280 px+` | Mise en page actuelle préservée sans régression |

### Règles de non-régression obligatoires
- **Tests existants :** Préserver à 100 % les assertions des Tests 1 à 36 (dont Test 23 sur `src/app/globals.css`, Test 31 zéro `fnpss.cd` dans `src/`, Test 32 `auditNextAppAccessibility` WCAG 2.1 AA).
- **Sticky Header :** Utiliser `overflow-x: clip` (et non `hidden`) sur `html, body` pour ne jamais casser `.site-header-sticky`.
- **Aucune donnée cachée :** Chaque action disponible sur desktop reste accessible sur mobile.

---

## 2. Tableau de Suivi Global

| Phase | Périmètre | Fichiers clés | Statut |
| :---: | :--- | :--- | :---: |
| **R0** | Socle CSS & Composants partagés | `src/app/globals.css`, `Header.jsx`, `Footer.jsx`, `Modal.jsx`, `NotificationBell.jsx`, `DossierThread.jsx`, `DocumentViewer.jsx`, `QrCodeDisplay.jsx` | Fait |
| **R1** | Page d'Accueil (`/`) | `src/app/page.jsx` | Fait |
| **R2** | Authentification (`/auth/*`) | `src/app/auth/login/page.jsx`, `register/page.jsx`, `forgot-password/page.jsx`, `reset-password/page.jsx` | Fait |
| **R3** | Tableau de Bord Requérant (`/dashboard`) | `src/app/dashboard/page.jsx` | Fait |
| **R4** | Assistant de Dépôt S1–S6 (`/applications/new`) | `src/app/applications/new/page.jsx` | Fait |
| **R5** | Console Back-Office Multi-Rôles (`/admin`) | `src/app/admin/page.jsx` | Fait |
| **R6** | Vérification Douanière DGDA (`/verifier`) | `src/app/verifier/page.jsx` | Fait |
| **R7** | Profil, Guide & Design System | `src/app/profile/page.jsx`, `guide/page.jsx`, `design-system/page.jsx` | Fait |
| **R8** | Validation & Audit Automatisé | `tests/guichet-unique.test.mjs`, `npm test`, `npx next build` | Fait |

---

## 3. Détail Tâche par Tâche (Checklist de Suivi)

### Phase R0 — Socle CSS & Composants Partagés *(impacte 100 % des pages)*

- [x] **`src/app/globals.css`** :
  - Ajouter `overflow-x: clip` sur `html, body`.
  - Ajouter des classes utilitaires responsive réutilisables : `.page-header-row`, `.form-grid-2`, `.action-row-responsive`, `.stack-mobile`, `.badge-wrap`.
  - Sur `@media (max-width: 640px)` : réduire le padding `.card` (`20px → 14px`), ajuster la taille de `h1`/`h2`/`h3`, passer `.form-control` à `font-size: 16px` (évite le zoom iOS au focus), garantir `min-height: 40px` sur `.btn:not(.btn-sm)`, optimiser `.kpi-grid` (`minmax(145px, 1fr)`).
  - Convertir `.services-grid` en `repeat(auto-fit, minmax(min(100%, 300px), 1fr))` pour éliminer tout débordement à `360 px`.
- [x] **`src/components/ui/Header.jsx`** *(point critique)* :
  - Sous `768 px`, afficher une barre haute compacte (~58 px) : Logo FNPSS + Cloche de notifications + bouton Menu (`aria-expanded`, fermeture `Escape` et clic extérieur).
  - Déplacer la navigation (`Tableau de bord`, `Déposer un dossier`, `Guide ONG`, `Contrôle Douane DGDA`, pastille réseau, profil et déconnexion) dans un panneau déroulant mobile propre.
- [x] **`src/components/ui/Footer.jsx`** :
  - Remplacer `textAlign: 'right'` et `justifyContent: 'flex-end'` inline par des classes CSS alignées à gauche et empilées proprement sous `768 px`.
- [x] **`src/components/ui/Modal.jsx`** *(point critique)* :
  - Appliquer `maxHeight: '90dvh'`, `display: 'flex'`, `flexDirection: 'column'` sur `.modal-card`.
  - Appliquer `overflowY: 'auto'` sur `.modal-body` et `flexWrap: 'wrap'` sur `.modal-footer` pour garder les boutons visibles même avec clavier mobile ouvert.
- [x] **`src/components/ui/NotificationBell.jsx`** :
  - Sous `640 px`, passer `.notif-dropdown` en `position: fixed; left: 12px; right: 12px; top: 66px; width: auto; max-height: 75dvh`.
- [x] **`src/components/DossierThread.jsx`** :
  - Mettre `minWidth: 0` et `flexWrap: 'wrap'` sur le formulaire d'envoi ; autoriser le retour à la ligne sur la ligne auteur/horodatage.
- [x] **`src/components/ui/DocumentViewer.jsx`** :
  - Borner la hauteur de `.doc-viewer-sidebar` sous `768 px` (`max-height: 200px; overflow-y: auto`) et réduire le padding d'aperçu sur mobile.
- [x] **`src/components/ui/QrCodeDisplay.jsx`** :
  - Rendre l'image QR fluide (`maxWidth: '100%', height: 'auto'`) et centrer/empiler les boutons d'action sur petit écran.

---

### Phase R1 — Page d'Accueil (`/`)

- [x] **`src/app/page.jsx`** :
  - Hero institutionnel : padding réduit sur mobile (`32px 28px → 20px 16px`), titre fluide (`28px → 22px`).
  - Boutons CTA du Hero en pleine largeur (`width: 100%`) sous `480 px`.
  - Vérifier le rendu sans débordement des grilles Signaux de confiance, Catalogue S1–S6 et Régies financières (`DGDA / DGI / DGRAD`) à `360 px`.

---

### Phase R2 — Pages d'Authentification (`/auth/*`)

- [x] **`src/app/auth/login/page.jsx`** *(bug détecté)* :
  - Corriger le bouton Google figé à `width: 360` (ligne 117) : calculer `Math.min(340, containerWidth)` selon la largeur réelle du conteneur.
  - Autoriser le retour à la ligne sur le `<Badge>` Web3Auth (`white-space: normal; text-align: center`).
  - Réduire la marge verticale extérieure (`40px → 16px`) sur mobile et rendre la ligne « Mot de passe / Mot de passe oublié ? » wrappable.
- [x] **`src/app/auth/register/page.jsx`** :
  - Passer les grilles à 2 colonnes en `minmax(min(100%, 210px), 1fr)` et réduire la marge verticale sur mobile.
- [x] **`src/app/auth/forgot-password/page.jsx` & `src/app/auth/reset-password/page.jsx`** :
  - Uniformiser les espacements mobiles et `word-break: break-all` sur les jetons affichés en mode dev.

---

### Phase R3 — Tableau de Bord Requérant (`/dashboard`)

- [x] **`src/app/dashboard/page.jsx`** :
  - En-tête (`Mon Profil ONG` + `Déposer une Nouvelle Demande`) : pleine largeur empilée sous `640 px`.
  - Barre de filtres (`Cartes / Tableau` + 2 `<select>`) : `<select>` en `flex: 1 1 140px` puis pleine largeur sur mobile.
  - Cartes dossiers : `word-break: break-word` sur références/titres longs, boutons d'action (`Éditer`, `Retirer`, `Échanges`, `Accusé PDF`, `PDF Scellé`, `QR Code`) organisés proprement sur mobile.
  - **Correctif ligne 829** *(bug détecté)* : ajouter `flexWrap: 'wrap'` sur les lignes de notifications In-App pour éviter que `Marquer lu` n'écrase le texte.

---

### Phase R4 — Assistant de Dépôt S1–S6 (`/applications/new`)

- [x] **`src/app/applications/new/page.jsx`** :
  - Barre de progression des 4 étapes : grille `2×2` sous `540 px` (`4×1` sur desktop) avec padding compact.
  - **Correctif lignes 461 & 576** *(bug détecté)* : ajouter `flexWrap: 'wrap'; gap: '10px'` sur les barres `Retour` / `Continuer`, et boutons pleine largeur sous `480 px`.
  - Étape 3 (Pièces P1–P6) : `word-break: break-word` sur noms de fichiers et empreintes SHA-256 ; bouton `Téléverser PDF` pleine largeur sur mobile.

---

### Phase R5 — Console Back-Office Multi-Rôles (`/admin`)

- [x] **`src/app/admin/page.jsx`** :
  - Rendre le bandeau technique Relayer Polygon / Jalons G2–G3 (ligne 688) repliable sur mobile afin d'accéder rapidement à la file de dossiers.
  - **Correctif ligne 975** *(bug détecté)* : passer la grille métadonnées (`gridTemplateColumns: '1fr 1fr'`) en `1fr` sous `480 px`.
  - Sous `1024 px` (panneau empilé) : au clic sur un dossier dans la file, défiler doucement vers la fiche d'instruction avec un raccourci `↑ Retour à la file`.
  - Panneau Administration Système (`Agents`, `Requérants ONG`, `Journal d'Audit`) : inputs recherche `width: 100%` sur mobile et défilement fluide dans `.table-responsive`.

---

### Phase R6 — Portail Public de Vérification Douanière DGDA (`/verifier`)

- [x] **`src/app/verifier/page.jsx`** *(usage terrain mobile prioritaire)* :
  - Remplacer `minWidth: '240px'` sur le champ `#hash-input` (ligne 378) par `minWidth: 0; flex: '1 1 220px'` + bouton `Vérifier l'Acte` pleine largeur sous `480 px`.
  - **Correctif ligne 502** *(bug détecté)* : ajouter `wordBreak: 'break-all'` sur le bloc `pdfFileInfo` pour contenir l'empreinte SHA-256 (66 caractères).
  - Carte Verdict (Pastille Verte / Rouge / Grise) : padding et titres ajustés sur mobile, grille `minmax(min(100%, 170px), 1fr)` et historique récent empilable sans débordement.

---

### Phase R7 — Profil ONG (`/profile`), Guide (`/guide`) & Design System (`/design-system`)

- [x] **`src/app/profile/page.jsx`** *(bugs détectés)* :
  - Ajouter `flexWrap: 'wrap'; gap: '12px'` sur l'en-tête (ligne 176), le bloc titre Web3Auth + badge `Non-Custodial` (ligne 204) et le pied de formulaire `Retour` / `Enregistrer` (ligne 405).
  - Supprimer le double padding latéral sur mobile (le conteneur `<main className="container">` gère déjà le padding).
- [x] **`src/app/guide/page.jsx`** :
  - Adapter les onglets (`Guide ONG` / `Formations` / `Charte`) et les badges `REQ-xx` dans les en-têtes de cartes sur mobile.
- [x] **`src/app/design-system/page.jsx`** :
  - Passer la grille de tokens en `minmax(min(100%, 180px), 1fr)` et adapter la hauteur de l'`<iframe>` d'aperçu email (`420 px` mobile, `520 px` desktop).

---

### Phase R8 — Validation Finale & Non-Régression

- [x] Ajouter le **Test 37 (Audit Responsive)** dans `tests/guichet-unique.test.mjs` vérifiant :
  - Présence de `overflow-x: clip` et des breakpoints responsive dans `src/app/globals.css`.
  - Menu mobile accessible dans `Header.jsx`.
  - Défilement interne et hauteur bornée dans `Modal.jsx`.
  - Largeur adaptative du bouton Google dans `auth/login/page.jsx`.
  - `wordBreak: 'break-all'` sur `pdfFileInfo` dans `verifier/page.jsx` et `flexWrap` sur les zones critiques (`dashboard`, `applications/new`, `profile`).
  - Passage de `auditNextAppAccessibility(process.cwd())` (WCAG 2.1 AA).
- [x] Exécuter `npm test` (**37/37** attendus, 0 échec).
- [x] Exécuter `npx next build` (0 erreur).
- [ ] Effectuer une revue visuelle sur `360 px`, `430 px`, `768 px` et `1280 px` en navigation réelle.
