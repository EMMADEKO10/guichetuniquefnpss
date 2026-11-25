# Plan d'Exécution : Suppression des Emojis IA & Intégration MUI Icons (`Outlined`)

> **Objectif :** Remplacer tous les emojis pictographiques hérités de l'IA dans l'interface utilisateur par une iconographie vectorielle souveraine **MUI Icons (`@mui/icons-material`, style `Outlined`)** via un composant unique centralisé `AppIcon.jsx`, sans alourdir le bundle 3G (`< 3,0 s`) ni dégrader l'accessibilité WCAG 2.1 AA.

---

## 1. Tableau de Suivi Global

| Phase | Périmètre | Fichiers clés | Statut |
| :---: | :--- | :--- | :---: |
| **I0** | Socle MUI Icons & CSS | `package.json`, `next.config.mjs`, `src/components/ui/AppIcon.jsx`, `src/app/globals.css` | Fait |
| **I1** | Composants UI Partagés (11 fichiers) | `Header.jsx`, `NotificationBell.jsx`, `AlertBanner.jsx`, `ToastProvider.jsx`, `StatusStepper.jsx`, `SlaIndicator.jsx`, `BlockchainSignal.jsx`, `DocumentViewer.jsx`, `QrCodeDisplay.jsx`, `EmptyState.jsx`, `PwaManager.jsx` | Fait |
| **I2** | Portail Public (`/`, `/verifier`, `/guide`, `/design-system`) | `src/app/page.jsx`, `verifier/page.jsx`, `guide/page.jsx`, `design-system/page.jsx` | Fait |
| **I3** | Espace Requérant (`/dashboard`, `/applications/new`, `/profile`, `/auth/*`) | `dashboard/page.jsx`, `applications/new/page.jsx`, `profile/page.jsx`, `auth/forgot-password/page.jsx` | Fait |
| **I4** | Console Back-Office Multi-Rôles (`/admin`) | `src/app/admin/page.jsx` | Fait |
| **I6** | Garde-fou `Test 38` & Vérification Build | `tests/guichet-unique.test.mjs`, `npm test`, `npx next build` | Fait |

---

## 2. Checklist Détaillée

### Phase I0 — Socle Iconographique Centralisé
- [x] Installer `@mui/icons-material`, `@mui/material`, `@emotion/react`, `@emotion/styled`.
- [x] Configurer `experimental.optimizePackageImports: ['@mui/icons-material']` dans `next.config.mjs`.
- [x] Créer `src/components/ui/AppIcon.jsx` (`'use client'`) avec import direct par icône et export `APP_ICON_NAMES`.
- [x] Ajouter `.fnpss-icon`, `.status-dot`, `.empty-state-icon-wrap`, `.verdict-seal-icon` et `.nav-link-icon` dans `src/app/globals.css`.

### Phase I1 — Composants Socle & Signaux (`src/components/ui/`)
- [x] `Header.jsx` : remplacer les emojis de navigation, menu mobile, profil et réseau (`.status-dot`).
- [x] `NotificationBell.jsx` : `bell`, `warning`, `refresh`.
- [x] `AlertBanner.jsx` & `ToastProvider.jsx` : `success`, `error`, `warning`, `info`, `close`.
- [x] `StatusStepper.jsx`, `SlaIndicator.jsx` & `BlockchainSignal.jsx` : icônes vectorielles compactes et micro-pastilles `.status-dot`.
- [x] `DocumentViewer.jsx`, `QrCodeDisplay.jsx`, `EmptyState.jsx` & `PwaManager.jsx` : icônes PDF, chiffrement, QR Code, téléchargement, copie et synchronisation PWA.

### Phase I2 — Portail Public
- [x] `src/app/page.jsx` : `clock` et `payment` sur les cartes S1–S6.
- [x] `src/app/verifier/page.jsx` : scanner QR caméra/image et médaillons haute lisibilité DGDA (`.verdict-seal-icon`).
- [x] `src/app/guide/page.jsx` : onglets, boutons et état vide `search`.
- [x] `src/app/design-system/page.jsx` : `EmptyState` + vitrine **Bibliothèque d'Icônes Officielles FNPSS (MUI Outlined)**.

### Phase I3 — Espace Requérant
- [x] `src/app/dashboard/page.jsx` : actions dossiers, filtres, cartes, échanges, PDF scellé & accusé, QR Code.
- [x] `src/app/applications/new/page.jsx` : brouillon auto, pièces P1–P6, chiffrement SHA-256/AES-256, soumission.
- [x] `src/app/profile/page.jsx` & `src/app/auth/forgot-password/page.jsx` : `security`, `check`, `arrowForward`.

### Phase I4 — Console Back-Office (`/admin`)
- [x] `src/app/admin/page.jsx` : actions RBAC (`Agent`, `Chef Division`, `DG`, `Ministère`, `Admin`), fil d'instruction et panneaux système sans aucun emoji.

### Phase I6 — Vérification & Garde-Fou
- [x] Ajouter le **`Test 38`** dans `tests/guichet-unique.test.mjs` (0 emoji dans `src/app` + `src/components`, contrôle `AppIcon.jsx`, WCAG 2.1 AA).
- [x] Exécuter `npm test` (**38/38**) et `npx next build` (0 erreur).
