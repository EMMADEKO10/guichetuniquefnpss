/**
 * @fileoverview Script de synchronisation `.env` et d'initialisation de la base PostgreSQL Neon (OPS-02, OPS-03).
 * - Synchronise POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB et POSTGRES_PORT depuis DATABASE_URL sans jamais afficher de secret.
 * - Génère des clés aléatoires fortes (256 bits) pour DOCUMENT_ENCRYPTION_KEY_HEX et JWT_SECRET si les valeurs par défaut sont présentes.
 * - Exécute `database/schema.sql` (10 tables) et `database/seed.sql` (6 services S1–S6) sur Neon via l'endpoint SQL HTTPS de Neon.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
  console.error('Fichier .env introuvable.');
  process.exit(1);
}

let envText = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envText.match(/^DATABASE_URL=(.+)$/m);
if (!dbUrlMatch) {
  console.error('Variable DATABASE_URL introuvable dans .env.');
  process.exit(1);
}

const rawDbUrl = dbUrlMatch[1].trim().replace(/^["']|["']$/g, '');
let parsedUrl;
try {
  parsedUrl = new URL(rawDbUrl);
} catch {
  console.error('Format DATABASE_URL invalide.');
  process.exit(1);
}

const dbUser = decodeURIComponent(parsedUrl.username || 'neondb_owner');
const dbPass = decodeURIComponent(parsedUrl.password || '');
const dbName = (parsedUrl.pathname || '/neondb').replace(/^\//, '') || 'neondb';
const dbPort = parsedUrl.port || '5432';
const dbHost = parsedUrl.hostname;

// 1. Synchronisation des variables POSTGRES_* et génération des clés cryptographiques si par défaut
envText = envText
  .replace(/^POSTGRES_USER=.*$/m, `POSTGRES_USER=${dbUser}`)
  .replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${dbPass}`)
  .replace(/^POSTGRES_DB=.*$/m, `POSTGRES_DB=${dbName}`)
  .replace(/^POSTGRES_PORT=.*$/m, `POSTGRES_PORT=${dbPort}`);

let generatedEncKey = false;
if (envText.includes('DOCUMENT_ENCRYPTION_KEY_HEX=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')) {
  envText = envText.replace(
    /^DOCUMENT_ENCRYPTION_KEY_HEX=.*$/m,
    `DOCUMENT_ENCRYPTION_KEY_HEX=${crypto.randomBytes(32).toString('hex')}`
  );
  generatedEncKey = true;
}

let generatedJwtSecret = false;
if (envText.includes('JWT_SECRET=replace_with_64_char_random_secret_in_production')) {
  envText = envText.replace(
    /^JWT_SECRET=.*$/m,
    `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`
  );
  generatedJwtSecret = true;
}

fs.writeFileSync(envPath, envText, 'utf8');
console.log(`✓ Fichier .env synchronisé (Hôte: ${dbHost}, Base: ${dbName}, Utilisateur: ${dbUser}, Mot de passe: [MASQUÉ])`);
if (generatedEncKey) console.log('✓ Clé AES-256-GCM (DOCUMENT_ENCRYPTION_KEY_HEX) générée aléatoirement (64 hex).');
if (generatedJwtSecret) console.log('✓ Secret de session (JWT_SECRET) généré aléatoirement (64 hex).');

/**
 * Découpe un script SQL PostgreSQL en instructions individuelles en respectant les blocs `DO $$ ... END $$;`.
 */
function splitSqlStatements(sql) {
  const cleaned = sql
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = [];
  let current = '';
  let inDollarBlock = false;

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned.slice(i, i + 2) === '$$') {
      inDollarBlock = !inDollarBlock;
      current += '$$';
      i++;
      continue;
    }
    const ch = cleaned[i];
    if (ch === ';' && !inDollarBlock) {
      if (current.trim()) statements.push(current.trim() + ';');
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function execNeonSql(query, params = []) {
  const endpoint = `https://${dbHost}/sql`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': rawDbUrl
    },
    body: JSON.stringify({ query, params })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur HTTP Neon (${res.status}): ${errText}`);
  }
  return res.json();
}

async function main() {
  console.log(`\nConnexion à Neon PostgreSQL (${dbHost} / ${dbName})...`);
  const versionRes = await execNeonSql('SELECT version() AS v, current_database() AS db;');
  const row = versionRes.rows?.[0] || {};
  console.log(`✓ Connecté à Neon : ${row.db} — ${(row.v || '').split(',')[0]}`);

  const schemaSql = fs.readFileSync(path.resolve('database/schema.sql'), 'utf8');
  const seedSql = fs.readFileSync(path.resolve('database/seed.sql'), 'utf8');

  const schemaStmts = splitSqlStatements(schemaSql);
  console.log(`Exécution de database/schema.sql (${schemaStmts.length} instructions DDL)...`);
  for (const stmt of schemaStmts) {
    await execNeonSql(stmt);
  }
  console.log('✓ Schéma PostgreSQL (10 tables, types ENUM et index) appliqué avec succès.');

  const seedStmts = splitSqlStatements(seedSql);
  console.log(`Exécution de database/seed.sql (${seedStmts.length} instruction d'amorçage S1–S6)...`);
  for (const stmt of seedStmts) {
    await execNeonSql(stmt);
  }
  console.log('✓ Référentiel des 6 services FNPSS (S1 à S6) inséré avec succès.');

  const tablesCheck = await execNeonSql(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  );
  const servicesCheck = await execNeonSql(
    'SELECT code, title, deposit_fee_usd, inquiry_fee_usd, sla_business_days FROM services ORDER BY code;'
  );

  console.log(`\nTables actives dans Neon (${tablesCheck.rows.length}) :`, tablesCheck.rows.map(r => r.table_name).join(', '));
  console.log(`Services FNPSS actifs dans Neon (${servicesCheck.rows.length}) :`, servicesCheck.rows.map(r => r.code).join(', '));
}

main().catch(err => {
  console.error('Échec de l\'initialisation Neon :', err.message);
  process.exit(1);
});

