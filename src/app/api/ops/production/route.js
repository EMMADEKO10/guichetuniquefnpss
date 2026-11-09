/**
 * @fileoverview Route API Next.js — Sprint 6 : Infrastructure de Production Souveraine (OPS-07, DEP-01),
 * Clôture d'Audit Mainnet Polygon (BLK-12), Guide Utilisateur ONG (DEP-03), Formations FNPSS/Ministères/DGDA (DEP-04, DEP-05)
 * et Décision Go/No-Go Jalon G4 (DEP-02).
 */

import {
  productionTrainingManager,
  ONG_USER_GUIDE_MODULES
} from '../../../../ops/production-training-manager.mjs';
import { requireActor, isStaff, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = (searchParams.get('section') || '').toLowerCase();

    // Le guide utilisateur simplifié pour les ONG (DEP-03) est publié publiquement sur le portail
    if (section === 'guide-ong') {
      return Response.json({
        success: true,
        dep03OngUserGuide: {
          version: '1.0.0-FR',
          reviewedByOngPanel: true,
          publishedOnPortal: true,
          modulesCount: ONG_USER_GUIDE_MODULES.length,
          modules: ONG_USER_GUIDE_MODULES
        }
      });
    }

    const actor = requireActor(request);
    if (!isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès réservé au personnel habilité FNPSS.');
    }

    return Response.json({
      success: true,
      ...productionTrainingManager.getSprint6ProductionSummary()
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

    if (action === 'certify-mainnet-audit') {
      const certification = productionTrainingManager.certifySecurityAuditForMainnet(actor, {
        auditReportRef: body.auditReportRef,
        pentestReportRef: body.pentestReportRef
      });
      return Response.json({
        success: true,
        action: 'certify-mainnet-audit',
        certification
      });
    }

    if (action === 'record-training') {
      const result = productionTrainingManager.recordTrainingParticipant(actor, {
        sessionId: body.sessionId,
        participantName: body.participantName,
        institution: body.institution,
        role: body.role,
        practicalQrExercisePassed: body.practicalQrExercisePassed,
        quizScorePct: body.quizScorePct
      });
      return Response.json({
        success: true,
        action: 'record-training',
        ...result
      }, { status: 201 });
    }

    if (action === 'sign-go-nogo-g4') {
      const signOff = productionTrainingManager.signOffGoNoGoG4(actor, {
        residualRisksAccepted: body.residualRisksAccepted,
        sponsorNote: body.sponsorNote
      });
      return Response.json({
        success: true,
        action: 'sign-go-nogo-g4',
        signOff
      });
    }

    throw new HttpError(400, `Action de production inconnue : ${action}`);
  } catch (err) {
    return errorResponse(err);
  }
}

