/**
 * @fileoverview Route API Next.js — Sprint 7 (S16) : Cohorte Pilote d'ONG (DEP-06),
 * Support Intensif Hypercare (DEP-07), Bilan & Contrat de TMA (DEP-08),
 * Retours d'Expérience & Backlog d'Évolutions Année 2 (DEP-09) et Clôture COPIL (GOV-10).
 */

import { pilotAndHypercareTracker } from '../../../../ops/backup-and-pilot-manager.mjs';
import { Roles } from '../../../../workflow/application-engine.mjs';
import { requireActor, isStaff, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const actor = requireActor(request);
    if (!isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès réservé au personnel habilité FNPSS.');
    }

    return Response.json({
      success: true,
      ...pilotAndHypercareTracker.getPilotStatusSummary()
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    const actor = requireActor(request);
    const body = await readJson(request);
    const action = body.action || '';

    if (action === 'log-incident') {
      const ticket = pilotAndHypercareTracker.logHypercareIncident({
        reporterOrg: body.reporterOrg || actor.organizationName || 'ONG Pilote',
        severity: body.severity || 'STANDARD',
        summary: body.summary,
        openedAtMs: body.openedAtMs
      });
      return Response.json({
        success: true,
        action: 'log-incident',
        ticket,
        summary: pilotAndHypercareTracker.getPilotStatusSummary()
      }, { status: 201 });
    }

    if (action === 'resolve-incident') {
      if (!isStaff(actor)) {
        throw new HttpError(403, 'RBAC: Seul le personnel habilité FNPSS peut clôturer un ticket Hypercare (DEP-07).');
      }
      const ticket = pilotAndHypercareTracker.resolveHypercareIncident(body.ticketId, {
        resolutionNote: body.resolutionNote,
        resolvedAtMs: body.resolvedAtMs
      });
      return Response.json({
        success: true,
        action: 'resolve-incident',
        ticket,
        summary: pilotAndHypercareTracker.getPilotStatusSummary()
      });
    }

    if (action === 'submit-feedback') {
      const feedback = pilotAndHypercareTracker.recordPilotFeedback({
        pilotId: body.pilotId,
        organizationName: body.organizationName || actor.organizationName,
        ratingOn5: body.ratingOn5,
        comment: body.comment,
        suggestedEvolution: body.suggestedEvolution
      });
      return Response.json({
        success: true,
        action: 'submit-feedback',
        feedback,
        summary: pilotAndHypercareTracker.getPilotStatusSummary()
      }, { status: 201 });
    }

    if (action === 'onboard-pilot') {
      if (actor.role !== Roles.ADMIN && actor.role !== Roles.DG) {
        throw new HttpError(403, 'RBAC: Seuls la Direction Générale (DG) ou l\'Administrateur Système peuvent enrôler une ONG dans la cohorte pilote (DEP-06).');
      }
      const organization = pilotAndHypercareTracker.onboardPilotOrganization({
        organizationName: body.organizationName,
        province: body.province,
        focusService: body.focusService
      });
      return Response.json({
        success: true,
        action: 'onboard-pilot',
        organization,
        summary: pilotAndHypercareTracker.getPilotStatusSummary()
      }, { status: 201 });
    }

    throw new HttpError(400, `Action pilote/hypercare inconnue : ${action}`);
  } catch (err) {
    return errorResponse(err);
  }
}
