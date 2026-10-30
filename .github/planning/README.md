# Pilotage GitHub du projet : mise en route

Ce dossier contient la source unique du planning et le script qui l'installe dans GitHub.

| Fichier | Rôle |
|---|---|
| [backlog.json](backlog.json) | Jalons, sprints, 10 epics, 87 issues (dates exprimées en semaines S1 à S16) |
| [bootstrap-github.ps1](bootstrap-github.ps1) | Crée labels, jalons, GitHub Project (champs) et issues, de façon idempotente |
| `.bootstrap-state.json` | Généré à l'exécution (ignoré par Git) : évite les doublons en cas de relance |

Le planning narratif est dans [PLANIFICATION_GLOBALE.md](../../documentation%20du%20projet/PLANIFICATION_GLOBALE.md).

## 1. Prérequis (une seule fois)

```powershell
winget install --id GitHub.cli
gh auth login                  # GitHub.com > HTTPS > navigateur
gh auth refresh -s project     # autorise la gestion des GitHub Projects
```

## 2. Vérifier avant d'écrire quoi que ce soit

```powershell
.github\planning\bootstrap-github.ps1 -DryRun
```

Affiche la synthèse (points par sprint, par jalon, par epic) sans appeler GitHub.
Le démarrage par défaut est le lundi 02/11/2026 (fin le 19/02/2027). Si la date change, passez `-StartDate 2026-11-09` (un lundi) : toutes les dates sont recalculées.

## 3. Test de fumée, puis exécution complète

```powershell
.github\planning\bootstrap-github.ps1 -Limit 3   # 10 epics + 3 issues : contrôlez les accents et les champs
.github\planning\bootstrap-github.ps1            # reprend et complète sans doublon
```

Durée : environ 10 à 15 minutes (environ 700 appels API, avec temporisation anti-limitation).

> [!NOTE]
> Le projet est créé sous le compte propriétaire du dépôt. Pour un projet d'organisation, passez `-Owner <organisation>`.

## 4. Étapes manuelles (non automatisables avec `gh`)

### Vues du projet

| Vue | Disposition | Réglages |
|---|---|---|
| **Roadmap** | Roadmap | Champs de dates : *Start date* → *Target date* ; regrouper par *Track* ; zoom Mois ; afficher les jalons |
| **Sprint Board** | Board | Colonnes par *Status* ; filtre `sprint:"Sprint 1"` à faire évoluer à chaque sprint ; swimlanes par *Track* |
| **Backlog** | Table | Regrouper par *Parent issue* ; trier par *Priority* ; colonnes Estimate, Sprint, Milestone, Assignees |
| **Par jalon** | Table | Regrouper par *Milestone* ; somme d'*Estimate* en pied de groupe |
| **Risques et décisions** | Table | Filtre `label:"type: risk","type: decision"` |
| **Charge par track** | Table | Regrouper par *Track* ; somme d'*Estimate* |

### Statuts du tableau

Dans *Settings → Status*, remplacer `Todo / In Progress / Done` par : **Backlog, Ready, In progress, In review, Done**.
Ordre conseillé : lancer d'abord `-Limit 3` (le projet est alors créé), renommer les statuts, puis lancer l'import complet.
Le script affecte `Backlog` à l'import s'il existe, sinon `Todo` (les 3 issues du test de fumée restent à déplacer à la main).

### Automatisations natives (Settings → Workflows)

- *Auto-add to project* : filtre `is:issue,pr is:open` sur ce dépôt
- *Item closed* → Status = Done
- *Pull request merged* → Status = Done
- *Item reopened* → Status = In progress
- *Auto-archive items* : issues closes depuis plus de 14 jours

### Protection de la branche `main` (Settings → Branches)

- Pull request obligatoire, 1 approbation minimum
- Contrôles de statut requis (workflow de CI lorsque OPS-01 sera livrée)
- Historique linéaire, interdiction du force-push

### Facultatif : champ Iteration

Pour des graphiques de vélocité natifs, ajoutez un champ **Iteration** (durée 2 semaines, démarrage au lundi de S1)
en complément du champ *Sprint* créé par le script. Le Sprint 0 dure 3 semaines et le Sprint 7 une semaine : ajustez manuellement ces deux itérations.

## 5. Rituels hebdomadaires de mise à jour

1. Lundi : planification du sprint, déplacement des issues *Ready* dans le sprint.
2. Quotidien : le statut de chaque issue est à jour avant le point de 15 minutes.
3. Vendredi : rapport d'avancement (trame dans le planning global), revue du registre des risques.
4. Fin de sprint : revue, rétrospective, mise à jour de la vélocité.
