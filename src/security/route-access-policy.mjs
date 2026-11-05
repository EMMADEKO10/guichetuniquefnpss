/**
 * @fileoverview Matrice d'accès rôle/route de l'API REST (ADM-01, SEC-04).
 *
 * Principe : toute route `/api/*` doit figurer dans la matrice. Une route absente est refusée (fail-closed).
 * Les trois niveaux d'accès sont :
 * - `PUBLIC` : aucune authentification (consultation publique, connexion, vérification douanière) ;
 * - `AUTHENTICATED` : tout compte connecté ;
 * - un tableau de rôles : seuls ces rôles sont autorisés.
 */

import { Roles } from '../workflow/application-engine.mjs';

export const AccessLevel = Object.freeze({
  PUBLIC: 'PUBLIC',
  AUTHENTICATED: 'AUTHENTICATED'
});

const STAFF = [Roles.AGENT, Roles.CHEF_DIVISION, Roles.DG, Roles.MINISTERE, Roles.ADMIN];

export const ROUTE_POLICY = Object.freeze([
  // Public
  { method: 'GET', path: '/api/health', access: AccessLevel.PUBLIC },
  { method: 'GET', path: '/api/services', access: AccessLevel.PUBLIC },
  { method: 'GET', path: '/api/services/config', access: AccessLevel.PUBLIC },
  { method: 'GET', path: '/api/news', access: AccessLevel.PUBLIC },
  { method: 'GET', path: '/api/verify', access: AccessLevel.PUBLIC },
  { method: 'POST', path: '/api/verify-pdf', access: AccessLevel.PUBLIC },
  { method: 'POST', path: '/api/auth/register', access: AccessLevel.PUBLIC },
  { method: 'POST', path: '/api/auth/login', access: AccessLevel.PUBLIC },
  { method: 'POST', path: '/api/auth/google', access: AccessLevel.PUBLIC },

  // Compte connecté
  { method: 'PUT', path: '/api/auth/profile', access: AccessLevel.AUTHENTICATED },
  { method: 'POST', path: '/api/auth/logout', access: AccessLevel.AUTHENTICATED },
  { method: 'GET', path: '/api/notifications', access: AccessLevel.AUTHENTICATED },
  { method: 'POST', path: '/api/documents/inspect', access: AccessLevel.AUTHENTICATED },
  { method: 'GET', path: '/api/applications', access: AccessLevel.AUTHENTICATED },
  { method: 'GET', path: '/api/applications/certificate.pdf', access: AccessLevel.AUTHENTICATED },

  // Requérant
  { method: 'POST', path: '/api/applications', access: [Roles.REQUERANT] },
  { method: 'PUT', path: '/api/applications', access: [Roles.REQUERANT] },
  { method: 'DELETE', path: '/api/applications', access: [Roles.REQUERANT] },
  { method: 'POST', path: '/api/applications/provide-complement', access: [Roles.REQUERANT] },
  { method: 'POST', path: '/api/pwa/sync', access: [Roles.REQUERANT] },

  // Instruction
  { method: 'POST', path: '/api/applications/validate-payment', access: [Roles.AGENT, Roles.CHEF_DIVISION] },
  { method: 'POST', path: '/api/applications/request-complement', access: [Roles.AGENT, Roles.CHEF_DIVISION] },
  { method: 'POST', path: '/api/applications/division-opinion', access: [Roles.CHEF_DIVISION] },
  { method: 'POST', path: '/api/applications/approve-seal', access: [Roles.DG] },
  { method: 'POST', path: '/api/applications/revoke', access: [Roles.DG] },
  { method: 'POST', path: '/api/applications/cosign-ministry', access: [Roles.MINISTERE] },

  // Finance
  { method: 'GET', path: '/api/finance/ledger', access: [Roles.AGENT, Roles.CHEF_DIVISION, Roles.DG, Roles.ADMIN] },
  { method: 'POST', path: '/api/finance/reconcile', access: [Roles.AGENT, Roles.CHEF_DIVISION] },

  // Administration
  { method: 'GET', path: '/api/applicants', access: [Roles.ADMIN] },
  { method: 'POST', path: '/api/applicants/status', access: [Roles.ADMIN] },
  { method: 'POST', path: '/api/news', access: [Roles.ADMIN] },
  { method: 'POST', path: '/api/notifications/broadcast', access: [Roles.ADMIN] },
  { method: 'GET', path: '/api/stats', access: [Roles.ADMIN, Roles.DG] },
  { method: 'GET', path: '/api/audit-logs', access: [Roles.ADMIN, Roles.DG] },
  { method: 'GET', path: '/api/audit-logs/export', access: [Roles.ADMIN, Roles.DG] },

  // Exploitation
  { method: 'GET', path: '/api/ops/supervision', access: [Roles.ADMIN] },
  { method: 'GET', path: '/api/ops/migrations', access: [Roles.ADMIN] },
  { method: 'GET', path: '/api/ops/go-nogo', access: [Roles.ADMIN, Roles.DG] },
  { method: 'GET', path: '/api/ops/g1-gate', access: [Roles.ADMIN, Roles.DG] },
  { method: 'POST', path: '/api/ops/backup', access: [Roles.ADMIN] },
  { method: 'POST', path: '/api/ops/restore', access: [Roles.ADMIN] },
  { method: 'POST', path: '/api/blockchain/deploy', access: [Roles.ADMIN] }
]);

export function findRoutePolicy(method, pathname) {
  return ROUTE_POLICY.find(r => r.method === method && r.path === pathname) || null;
}

/**
 * Décide de l'accès à une route. Retourne `{ allowed, status, reason }`.
 * - 404 si la route n'est pas dans la matrice (fail-closed) ;
 * - 401 si une authentification est requise et que l'acteur est absent ;
 * - 403 si l'acteur est connecté mais que son rôle n'est pas autorisé.
 */
export function authorizeRoute(policy, actor) {
  if (!policy) {
    return { allowed: false, status: 404, reason: 'Route non trouvée' };
  }
  if (policy.access === AccessLevel.PUBLIC) {
    return { allowed: true, status: 200, reason: null };
  }
  if (!actor) {
    return { allowed: false, status: 401, reason: 'Authentification requise' };
  }
  if (policy.access === AccessLevel.AUTHENTICATED) {
    return { allowed: true, status: 200, reason: null };
  }
  if (policy.access.includes(actor.role)) {
    return { allowed: true, status: 200, reason: null };
  }
  return { allowed: false, status: 403, reason: `Accès refusé : le rôle ${actor.role} n'est pas autorisé sur cette route` };
}

export function isStaffRole(role) {
  return STAFF.includes(role);
}

export function extractBearerToken(headers = {}) {
  const raw = headers.authorization || headers.Authorization || '';
  const match = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec(String(raw).trim());
  return match ? match[1] : null;
}

