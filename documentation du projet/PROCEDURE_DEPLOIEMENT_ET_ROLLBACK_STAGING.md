# Procédure Opérationnelle de Déploiement Continu et de Rollback Staging (OPS-04)

**Projet :** Guichet Unique Dématérialisé du Fonds National de Promotion et de Service Social (FNPSS - RDC)  
**Référence Exigence :** OPS-04 (Staging CI/CD & Procédure de Rollback Automatisée)  
**Date d'entrée en vigueur :** Novembre 2026  
**Environnement Cible :** Staging / Pré-Production Souveraine  
**Version applicative :** 0.2.0  

---

## 1. Objectifs & Cadre Opérationnel

Le présent document consigne le protocole officiel de déploiement continu et de restauration d'urgence (rollback) sur l'environnement de Staging du Guichet Unique FNPSS, conformément aux règles de gouvernance étatique et de sécurité numérique :

1. **Disponibilité Maximale (Zero-Downtime) :** Tout déploiement doit s'exécuter sans interruption de service pour les requérants (ONG/ASBL) et les agents instructeurs.
2. **Validation Automatisée Stricte (Quality Gates) :** Aucun artefact n'est déployé en staging si l'intégralité des suites de tests automatisés (25 suites / 100% pass) n'est pas validée.
3. **Rollback Automatique Instantané (< 30 secondes) :** En cas d'échec de la sonde de santé `/api/health` ou de détection d'erreurs critiques, le système rétablit instantanément la version stable précédente sans intervention humaine manuelle.
4. **Traçabilité & Immuabilité :** Tout déploiement ou retour arrière génère un enregistrement horodaté dans les journaux d'audit d'exploitation.

---

## 2. Architecture de l'Environnement de Staging

L'infrastructure de staging reproduit fidèlement la typologie de la production :

| Composant | Technologie | Rôle & Configuration Staging |
| :--- | :--- | :--- |
| **Passerelle Web & Proxy** | Nginx / Traefik | Routage Blue/Green, terminaison TLS 1.3, certificats Let's Encrypt |
| **Application Web & API** | Next.js 14+ App Router (Node 20 Alpine) | Conteneurs légers isolés exécutant le portail requérant et le back-office |
| **Base de Données Relationnelle** | PostgreSQL 16 Alpine | Schéma relationnel `database/schema.sql`, migrations `OPS-03` |
| **Coffre-fort Documentaire** | MinIO S3 Object Storage | Stockage chiffré AES-256-GCM des pièces jointes P1-P6 |
| **Registre Souverain Blockchain** | Polygon Amoy Testnet (EVM) | Smart contract `FNPSSRegistry` (0x742d...44e) scellant les attestations |
| **Identité Décentralisée** | Web3Auth MPC Node RDC | Dérivation déterministe d'adresses EVM sans manipulation de clé privée |

---

## 3. Stratégie de Déploiement Blue / Green

Pour garantir un déploiement continu sans interruption et un rollback immédiat, le cluster de staging utilise deux slots de conteneurs alternés :

```
                  ┌───────────────────────────────┐
                  │    Reverse Proxy Nginx        │
                  │   (Routage Port 443 / 80)     │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
       ┌───────────────────┐           ┌───────────────────┐
       │   Slot BLUE       │           │   Slot GREEN      │
       │  (Version Active  │           │ (Nouvelle Version │
       │   Stable v0.1.9)  │           │   Candidate v0.2.0)│
       └───────────────────┘           └───────────────────┘
```

### Déroulement de la séquence :
1. **Étape 1 (Déploiement Inactif) :** Le nouveau build est déployé sur le slot passif (ex: `Green`). Le slot `Blue` continue de servir 100% du trafic usagers.
2. **Étape 2 (Vérification par Sonde de Santé) :** La sonde de santé interne interroge `http://127.0.0.1:3000/api/health` :
   - Vérification de la connectivité Next.js.
   - Vérification de la disponibilité du coffre-fort AES-256.
   - Vérification de l'interconnexion au RPC Polygon Amoy.
   - Seuil de tolérance : 3 requêtes consécutives avec statut HTTP 200 en moins de 15 secondes.
3. **Étape 3 (Basculement de Trafic) :** Si la sonde répond favorablement, la configuration de Nginx est rechargée à chaud (`nginx -s reload`). Le trafic est basculé instantanément sur `Green`.
4. **Étape 4 (Veille Active) :** Le slot `Blue` reste en veille pendant une période de grâce de 30 minutes, prêt à reprendre le trafic en cas d'anomalie post-déploiement.

---

## 4. Sonde de Santé Intégrée (`/api/health`)

Le Guichet Unique dispose d'un endpoint standardisé de télémétrie accessible en GET :

```http
GET /api/health HTTP/1.1
Host: staging.fnpss.gouv.cd
```

### Réponse attendue (HTTP 200) :
```json
{
  "status": "healthy",
  "uptimeSeconds": 1420,
  "timestamp": "2026-11-06T17:10:00.000Z",
  "version": "0.2.0",
  "environment": "staging",
  "subsystems": {
    "nextAppRouter": "UP",
    "sovereignEngine": "UP",
    "blockchainAmoyTestnet": "CONNECTED",
    "web3AuthMpcDerivation": "ACTIVE",
    "storageVaultAes256": "HEALTHY"
  }
}
```

---

## 5. Procédure de Rollback

### 5.1 Déclenchement Automatique par CI/CD
Si l'une des conditions suivantes est vérifiée lors de l'exécution du workflow GitHub Actions `.github/workflows/deploy-staging.yml` :
- Échec d'au moins un test unitaire ou d'intégration (`npm test` != 0).
- Échec du build de production Next.js (`npm run build` != 0).
- La sonde `/api/health` renvoie un code HTTP >= 400 ou ne répond pas sous 15 secondes.

**Action Automatique :**
1. Le job GitHub Actions annule le basculement Nginx.
2. Le trafic reste ou revient immédiatement sur le conteneur stable (Slot Blue).
3. Le conteneur candidat (Slot Green) est arrêté et archivé pour diagnostic.
4. Une notification d'alerte critique est émise aux administrateurs FNPSS.

### 5.2 Déclenchement Manuel d'Urgence

En cas de constat d'anomalie fonctionnelle en pré-production après la bascule :

#### Option A : Via l'interface GitHub Actions (Recommandé)
1. Aller dans l'onglet **Actions** du dépôt GitHub `EMMADEKO10/guichetuniquefnpss`.
2. Sélectionner le workflow **CI/CD Staging - Déploiement Continu & Rollback Automatique (OPS-04)**.
3. Cliquer sur **Run workflow**.
4. Définir le paramètre `force_rollback` sur `true`.
5. Valider : le script réactive instantanément la version précédente.

#### Option B : Ligne de commande sur le serveur de Staging (Procédure d'Exploitation)
```bash
# 1. Connexion SSH sécurisée
ssh deploy@staging.fnpss.gouv.cd

# 2. Accéder au répertoire du projet
cd /var/www/fnpss-staging

# 3. Réactiver la configuration précédente dans Nginx
sudo ln -sf /etc/nginx/sites-available/fnpss-blue.conf /etc/nginx/sites-enabled/fnpss-active.conf
sudo nginx -t && sudo systemctl reload nginx

# 4. Vérifier la reprise du service
curl -I https://staging.fnpss.gouv.cd/api/health
```

---

## 6. Checklist de Validation OPS-04

Avant toute validation de jalon ou mise en service, vérifier la conformité :
- [x] Fichier `.github/workflows/deploy-staging.yml` présent et syntaxiquement valide.
- [x] Dockerfile multi-stage avec utilisateur non-root (`nextjs:1001`) et healthcheck natif.
- [x] Endpoint `/api/health` actif et testé avec statut HTTP 200.
- [x] Tests automatisés intégrés dans le pipeline bloquant tout déploiement en cas d'échec.
- [x] Procédure de rollback documentée et testable manuellement ou automatiquement.
