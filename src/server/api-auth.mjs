/**
 * @fileoverview Helpers serveur partagés par les routes API Next.js.
 * - Résolution de la session (jeton Bearer) en acteur authentifié (ADM-01, SEC-04)
 * - Traduction des erreurs métier en statuts HTTP cohérents (401 / 403 / 404 / 400)
 *
 * Le rôle de l'acteur provient TOUJOURS du compte côté serveur, jamais du client.
 */

import { authService } from '../auth/auth-service.mjs';
import { Roles } from '../workflow/application-engine.mjs';

/** Rôles internes FNPSS habilités à consulter l'ensemble des dossiers. */
export const STAFF_ROLES = Object.freeze([
  Roles.AGENT,
  Roles.CHEF_DIVISION,
  Roles.DG,
  Roles.MINISTERE,
  Roles.ADMIN
]);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function extractBearerToken(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/**
 * Exige une session valide et retourne l'acteur { id, role, email }.
 * @throws {HttpError} 401 si le jeton est absent, inconnu, expiré ou si le compte est suspendu.
 */
export function requireActor(request) {
  const token = extractBearerToken(request);
  if (!token) {
    throw new HttpError(401, 'Authentification requise (jeton Bearer manquant).');
  }
  try {
    return authService.authenticateSession(token);
  } catch {
    throw new HttpError(401, 'Session invalide ou expirée.');
  }
}

export function isStaff(actor) {
  return STAFF_ROLES.includes(actor?.role);
}

/**
 * Convertit une erreur (métier ou HTTP) en réponse JSON avec le bon statut.
 */
export function errorResponse(err) {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err?.message || 'Erreur interne.';
  let status = 400;
  if (message.startsWith('RBAC')) status = 403;
  else if (/introuvable/i.test(message)) status = 404;
  return Response.json({ error: message }, { status });
}

/** Lit le corps JSON, ou lève une 400 explicite si le corps est invalide. */
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Corps de requête JSON invalide.');
  }
}

/** Supprime les champs binaires volumineux (PDF) avant sérialisation JSON. */
export function serializeApplication(app) {
  if (!app) return app;
  const clone = { ...app };
  if (clone.certificate) {
    const { pdfBuffer, ...certMeta } = clone.certificate;
    clone.certificate = certMeta;
  }
  return clone;
}

