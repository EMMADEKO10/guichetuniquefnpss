# Charte Projet et Gouvernance — Guichet Unique Dématérialisé du FNPSS

> **Références Backlog :** `GOV-01` (Atelier de lancement & Charte projet) · `GOV-02` (Constitution du COPIL & Gouvernance)
> **Sprint :** Sprint 0 (Semaine 1 — Lundi 02/11/2026) · **Jalon associé :** `G1` (20/11/2026)
> **Statut :** Prêt pour signature du Sponsor (DG FNPSS)

---

## 1. Identification du Projet

| Élément | Détail |
|---|---|
| **Intitulé officiel** | Plateforme de Guichet Unique Dématérialisé du FNPSS avec couche de certification Blockchain |
| **Institution porteuse** | Fonds National de Promotion et de Service Social (**FNPSS**), République Démocratique du Congo |
| **Ministère de tutelle** | Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale |
| **Partenaires institutionnels** | Ministère des Finances, Ministère du Plan, Ministère du Budget, Régies financières (**DGDA**, DGRAD, DGI) |
| **Date de démarrage (S1)** | **Lundi 02 novembre 2026** |
| **Date de fin cible (S16 / G4)** | **Vendredi 19 février 2027** (16 semaines — 8 sprints) |
| **Budget de réalisation** | **11 000 USD HT** (référence Note Technique V3) · Coûts récurrents : **4 700 USD/an** |

---

## 2. Vision et Objectifs Stratégiques (SMART)

### 2.1 Problématique adressée
Les procédures actuelles de délivrance des attestations, conventions et certificats d'exonération aux ONG et partenaires sociaux reposent sur des dépôts physiques et des documents PDF statiques. Cette situation entraîne :
1. Des risques élevés de **falsification documentaire** lors des contrôles douaniers aux frontières (DGDA).
2. Un **manque de visibilité** et des coûts de déplacement importants pour les requérants opérant en province.
3. Une **difficulté d'auditabilité** en temps réel pour l'État congolais et les bailleurs humanitaires.

### 2.2 Objectifs mesurables du projet

| Code | Objectif | Indicateur de succès (KPI) | Cible au lancement pilote (G4) |
|---|---|---|---|
| **OBJ-01** | Dématérialiser la soumission et le suivi des **6 services du FNPSS** | Part des dossiers de la cohorte pilote déposés de bout en bout via le portail | **100 %** des dossiers pilotes |
| **OBJ-02** | Éradiquer la fraude sur les actes délivrés par le FNPSS | Taux d'actes émis disposant d'une empreinte **SHA-256** ancrée on-chain et d'un **QR Code dynamique** | **100 %** des actes délivrés |
| **OBJ-03** | Permettre un contrôle douanier instantané sur le terrain (DGDA) | Temps de vérification d'un QR Code sur smartphone (réseau 3G) | **< 3 secondes** |
| **OBJ-04** | Maîtriser les délais de traitement administratif | Respect du délai réglementaire affiché à compter de la validation des frais | **≤ 10 jours ouvrables** (sur ≥ 90 % des dossiers) |
| **OBJ-05** | Garantir la souveraineté et la confidentialité des données | Données personnelles ou pièces écrites en clair sur la blockchain publique | **0 octet** (condensat SHA-256 uniquement) |

---

## 3. Périmètre du Projet

### 3.1 Périmètre inclus (In-Scope — Phase Pilote S1 à S16)
* **Portail Requérant (Web2 Mobile-First / PWA) :** création de compte (Email + Google OAuth + abstraction de compte Web3Auth transparente), gestion du profil ONG, soumission guidée pour les **6 services (`S1` à `S6`)**, téléversement sécurisé des pièces justificatives et preuves de paiement (`20 USD` dépôt + `300 USD` enquête), suivi en temps réel et téléchargement des actes officiels scellés.
* **Back-Office d'Administration FNPSS :** gestion des rôles (RBAC), tableau de bord par service, contrôle de recevabilité avec visionneuse PDF intégrée, demande de compléments, publication de la décision et du document officiel, révocation d'acte en cas d'irrégularité, journal d'audit immuable.
* **Moteur Blockchain & Vérification Douanière (Web3) :** génération du PDF normé, calcul du hash **SHA-256**, ancrage via *Gas Relayer* sur **Polygon (Amoy Testnet puis Mainnet)** ou Celo, incrustation du QR Code dynamique, et **page publique de vérification instantanée** (Pastille Verte / Rouge / Grise) pour la DGDA.
* **Déploiement, Formation & Pilote :** mise en production sur infrastructure souveraine, guides illustrés, formation des administrateurs FNPSS, des points focaux ministériels et des inspecteurs DGDA, lancement pilote (*soft launch*) avec une cohorte restreinte d'ONG.

### 3.2 Hors périmètre (Out-of-Scope — Reporté en Année 2)
* Traçabilité des flux financiers humanitaires par *stablecoins*.
* Décaissements conditionnels automatisés par smart contracts financiers.
* Intégration comptable ERP interne complète du FNPSS.

---

## 4. Gouvernance et Instances de Pilotage (`GOV-02`)

### 4.1 Composition du Comité de Pilotage (COPIL)

| Instance / Rôle | Entité représentée | Responsabilités clés au COPIL |
|---|---|---|
| **Sponsor Exécutif (Président du COPIL)** | Direction Générale du **FNPSS** | Signe la charte, arbitre le budget et les décisions structurantes (D1 à D6), valide le Go/No-Go de mise en production (`G4`). |
| **Product Owner (PO) Métier** | Direction des Opérations / Études **FNPSS** | Porte la vision métier, valide les spécifications (`GOV-07`), priorise le backlog, accepte les livrables de chaque sprint et pilote la recette (`SEC-07`). |
| **Représentant Tutelle** | **Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale** | Valide la conformité réglementaire des actes (notamment `S2` Convention et `S6` Arrêté ministériel). |
| **Représentant Régies / Contrôle** | Direction Générale des Douanes et Accises (**DGDA**) | Valide l'ergonomie et le protocole opérationnel de contrôle par QR Code aux postes frontières (`VER-03`, `DEP-05`). |
| **Chef de Projet / Scrum Master** | Équipe Projet | Anime les rituels, tient à jour le GitHub Project et le registre des risques, publie le rapport hebdomadaire chaque vendredi. |
| **Tech Lead & Architecte Blockchain** | Équipe Technique | Garantit la cohérence de l'architecture Web2/Web3 (`GOV-08`), la sécurité des smart contracts (`SEC-03`) et la souveraineté de l'hébergement (`OPS-07`). |

### 4.2 Matrice RACI des Livrables Clés

*Légende : **R** = Réalise (Responsible) · **A** = Approuve en dernier ressort (Accountable) · **C** = Consulté (Consulted) · **I** = Informé (Informed)*

| Livrable / Décision | Sponsor (DG FNPSS) | COPIL (Tutelle / DGDA) | Product Owner FNPSS | Chef de Projet | Tech Lead / Équipe |
|---|---|---|---|---|---|
| Charte projet & Gouvernance (`GOV-01`, `GOV-02`) | **A** | C | C | **R** | I |
| Cartographie des 6 services & Décision D1 (`GOV-04`, `GOV-05`) | **A** | C | **R** | **R** | C |
| Spécifications fonctionnelles (`GOV-07`) | I | C | **A** | **R** | C |
| Architecture technique & Choix réseau (`GOV-08`, `BLK-01`) | I | I | C | C | **A / R** |
| Personas, Wireframes & Maquettes UI (`UX-01` à `UX-04`) | I | C | **A** | C | **R** |
| **Passage du Jalon G1 (Fin Cadrage — 20/11/2026)** | **A** | **C** | **R** | **R** | C |
| Développement Portail, API & Smart Contracts (`REQ`, `ADM`, `BLK`) | I | I | C | I | **A / R** |
| **Passage du Jalon G2 (Version Alpha — 08/01/2027)** | **A** | C | **R** | **R** | **R** |
| Audit sécurité, Pen-test & Recette UAT (`SEC-03` à `SEC-07`) | I | C | **A** | C | **R** |
| **Passage du Jalon G3 (Version Beta — 29/01/2027)** | **A** | C | **R** | **R** | **R** |
| Déploiement Mainnet, Formation & Pilote (`DEP-01` à `DEP-06`) | **A** | C | **A** | **R** | **R** |

### 4.3 Calendrier des Rituels et Canaux de Communication

| Rituel | Fréquence & Créneau | Durée | Participants | Outil / Support |
|---|---|---|---|---|
| **Daily Stand-up** | Quotidien (Lundi–Vendredi à 09h30) | 15 min | Équipe projet, PO | Visioconférence + Vue *Sprint Board* GitHub |
| **Sprint Planning** | 1er lundi du sprint à 10h00 | 2 h | PO, Chef de projet, Équipe | GitHub Project (`Sprint Board`) |
| **Affinage Backlog (Refinement)** | Chaque mercredi à 15h00 | 1 h | PO, Tech Lead, Chef de projet | Issues GitHub (`status: needs-info` → `Ready`) |
| **Sprint Review & Démo** | Dernier vendredi du sprint à 14h00 | 1 h | PO, Équipe, invités métiers | Environnement de démonstration / Staging |
| **Rétrospective de Sprint** | Dernier vendredi du sprint à 15h15 | 45 min | Équipe projet | Actions d'amélioration continue |
| **Rapport Hebdomadaire RAG** | Chaque vendredi avant 17h00 | — | Chef de projet → Sponsor & COPIL | Email officiel + synthèse GitHub |
| **Comité de Pilotage (COPIL)** | Bimensuel (vendredis des semaines paires + Gates G1 à G4) | 1 h | Sponsor, COPIL, PO, Chef de projet | Ordre du jour, registre des risques et décisions ADR |

---

## 5. Calendrier Directeur des Jalons (Gates G1 à G4)

| Jalon (Gate) | Échéance | Semaine | Critères impératifs de validation (Definition of Done du jalon) |
|---|---|---|---|
| **G1 — Cadrage & UX/UI** | **Vendredi 20/11/2026** | Fin S3 (Sprint 0) | Charte signée · Décisions D1 à D4 tranchées · Spécifications et architecture approuvées · Prototype UI cliquable validé · Registre des risques actif. |
| **G2 — Version Alpha** | **Vendredi 08/01/2027** | Fin S10 (Sprint 4) | Parcours requérant (`S1`–`S6`) et back-office démontrés de bout en bout · Smart contracts `Registry` et révocation testés (couverture ≥ 90 %) et déployés en local. |
| **G3 — Version Beta & Audit** | **Vendredi 29/01/2027** | Fin S13 (Sprint 5) | Contrats sur Testnet Polygon Amoy · Rapports d'audit smart contracts et pen-test OWASP remis · 0 faille critique/haute ouverte · QR Code vérifié sur smartphone · PV de recette signé. |
| **G4 — Production & Pilote** | **Vendredi 19/02/2027** | Fin S16 (Sprint 7) | Contrats sur Mainnet · Serveurs de production souverains actifs · Agents FNPSS, ministères et douaniers DGDA formés · Cohorte d'ONG pilotes en exploitation sous *hypercare*. |

---

## 6. Ordre du Jour & Relevé de Décisions de l'Atelier Kick-off (Lundi 02/11/2026)

1. **Ouverture par le Sponsor (DG FNPSS) :** rappel de la vision stratégique et des enjeux de transparence vis-à-vis du Gouvernement et des partenaires humanitaires.
2. **Validation du périmètre et du calendrier (16 semaines) :** confirmation de la date de démarrage au **02/11/2026** et de la cible de mise en production au **19/02/2027**.
3. **Présentation des 4 arbitrages prioritaires de la Semaine 1–2 :**
   * **D1 (`GOV-05`) :** Niveau de numérisation du circuit d'instruction interne (voir [ADR_DECISIONS_CADRAGE.md](ADR_DECISIONS_CADRAGE.md)).
   * **D2 (`GOV-11`) :** Modalité de collecte et validation des frais (`20 USD` dépôt, `300 USD` enquête).
   * **D3 :** Confirmation de l'enveloppe budgétaire (Note V3 à `11 000 USD`) et prise en charge interne des activités métiers/recette.
   * **D4 :** Décision de reconstruction propre en **Next.js / Node.js / PostgreSQL** plutôt que la reprise du prototype statique de 2023.
4. **Lancement des ateliers métiers de la Semaine 1 (`GOV-03`, `GOV-04`, `UX-01`) :** planification des entretiens avec les directions métiers dès mardi 03/11/2026.

---

### Signatures d'approbation de la Charte (`GOV-01`)

| Rôle | Nom / Fonction | Date | Signature / Mention |
|---|---|---|---|
| **Sponsor du Projet** | Direction Générale du FNPSS | ___ / 11 / 2026 | *Bon pour accord* |
| **Product Owner** | Direction Métier FNPSS | ___ / 11 / 2026 | *Bon pour accord* |
| **Chef de Projet** | Équipe Projet Guichet Unique | 02 / 11 / 2026 | *Établi au lancement S1* |

