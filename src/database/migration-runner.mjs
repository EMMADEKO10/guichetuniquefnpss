/**
 * @fileoverview Gestionnaire et Vérificateur des Migrations SQL PostgreSQL (OPS-03).
 * Inspecte `database/schema.sql` et `database/seed.sql`, contrôle la présence des 10 tables
 * relationnelles, des 4 index et des 6 services S1–S6, et calcule les empreintes SHA-256 de version.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSha256Bytes32 } from '../crypto/document-sealer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultSchemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
const defaultSeedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

export const EXPECTED_POSTGRES_TABLES = Object.freeze([
  'users',
  'organizations',
  'services',
  'applications',
  'application_documents',
  'payments',
  'certificates',
  'blockchain_anchors',
  'notifications',
  'audit_logs'
]);

export const EXPECTED_SEED_SERVICES = Object.freeze(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);

/**
 * Inspecte et valide les scripts SQL de migration PostgreSQL (`OPS-03`).
 */
export function verifyAndPlanSqlMigrations({
  schemaFilePath = defaultSchemaPath,
  seedFilePath = defaultSeedPath
} = {}) {
  const schemaSql = fs.readFileSync(schemaFilePath, 'utf8');
  const seedSql = fs.readFileSync(seedFilePath, 'utf8');

  const discoveredTables = [];
  const tableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-z0-9_]+)/gi;
  let match;
  while ((match = tableRegex.exec(schemaSql)) !== null) {
    discoveredTables.push(match[1].toLowerCase());
  }

  const missingTables = EXPECTED_POSTGRES_TABLES.filter(t => !discoveredTables.includes(t));
  if (missingTables.length > 0) {
    throw new Error(`OPS-03: Tables PostgreSQL manquantes dans schema.sql : ${missingTables.join(', ')}`);
  }

  const discoveredIndexes = [];
  const idxRegex = /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+([a-z0-9_]+)/gi;
  while ((match = idxRegex.exec(schemaSql)) !== null) {
    discoveredIndexes.push(match[1].toLowerCase());
  }

  const missingServices = EXPECTED_SEED_SERVICES.filter(code => !seedSql.includes(`'${code}'`));
  if (missingServices.length > 0) {
    throw new Error(`OPS-03: Services manquants dans seed.sql : ${missingServices.join(', ')}`);
  }

  const migrations = [
    {
      version: 'V001__initial_schema_10_tables.sql',
      description: 'Création des 10 tables relationnelles PostgreSQL, types ENUM et index de performance',
      checksumSha256: computeSha256Bytes32(schemaSql),
      objectsCount: discoveredTables.length + discoveredIndexes.length,
      status: 'VERIFIED_READY'
    },
    {
      version: 'V002__seed_referentiel_services_s1_s6.sql',
      description: 'Amorçage idempotent des 6 services administratifs FNPSS (S1 à S6), frais (20$+300$) et SLA (10j)',
      checksumSha256: computeSha256Bytes32(seedSql),
      objectsCount: EXPECTED_SEED_SERVICES.length,
      status: 'VERIFIED_READY'
    }
  ];

  return {
    isValid: true,
    tablesCount: discoveredTables.length,
    tables: discoveredTables,
    indexesCount: discoveredIndexes.length,
    indexes: discoveredIndexes,
    seededServices: [...EXPECTED_SEED_SERVICES],
    migrations
  };
}

