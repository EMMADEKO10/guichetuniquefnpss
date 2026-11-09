import { applicationEngine, Roles } from '../../../workflow/application-engine.mjs';
import { authService } from '../../../auth/auth-service.mjs';
import {
  requireActor,
  isStaff,
  errorResponse,
  readJson,
  serializeApplication,
  HttpError
} from '../../../server/api-auth.mjs';

/**
 * GET /api/applications — liste des dossiers (REQ-05, ADM-04).
 * - Requérant : uniquement ses propres dossiers (anti-IDOR).
 * - Personnel FNPSS : tous les dossiers, filtrables par service et statut.
 */
export async function GET(request) {
  try {
    const actor = requireActor(request);
    const { searchParams } = new URL(request.url);
    const serviceCode = searchParams.get('service') || null;
    const status = searchParams.get('status') || null;

    let ownerId;
    if (actor.role === Roles.REQUERANT) {
      ownerId = actor.id;
    } else if (isStaff(actor)) {
      ownerId = null;
    } else {
      throw new HttpError(403, `RBAC: Le rôle ${actor.role} n'a pas accès à la liste des dossiers`);
    }

    const applications = applicationEngine.listApplications({ serviceCode, status, ownerId });
    return Response.json({ success: true, total: applications.length, applications });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/applications — dépôt d'une demande par le requérant connecté (REQ-06).
 * L'exemption Once-Only de la pièce P2 est déterminée côté serveur : elle n'est accordée
 * que si le requérant possède déjà un dossier S1 délivré et non révoqué.
 */
export async function POST(request) {
  try {
    const actor = requireActor(request);
    const body = await readJson(request);

    const hasActiveS1Enrollment = applicationEngine
      .listApplications({ ownerId: actor.id, serviceCode: 'S1', status: 'VALIDE_DELIVRE' })
      .length > 0;

    // Les pièces « exemptées » déclarées par le client ne sont jamais prises en compte.
    const attachedDocuments = (Array.isArray(body.attachedDocuments) ? body.attachedDocuments : [])
      .filter(d => d && d.docCode && !d.isExemptedOnceOnly);

    const user = authService.usersById.get(actor.id);
    const application = applicationEngine.submitApplication(actor, {
      serviceCode: body.serviceCode,
      organizationName: user?.organizationName || body.organizationName,
      projectTitle: body.projectTitle,
      goodsSummary: body.goodsSummary,
      paymentReference: body.paymentReference,
      attachedDocuments,
      hasActiveS1Enrollment
    });

    return Response.json(
      { success: true, application: serializeApplication(application), onceOnlyApplied: hasActiveS1Enrollment },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * PUT /api/applications — modification par le propriétaire avant instruction (REQ-08).
 */
export async function PUT(request) {
  try {
    const actor = requireActor(request);
    const body = await readJson(request);
    if (!body.referenceNumber) {
      throw new HttpError(400, 'Référence du dossier requise.');
    }
    const application = applicationEngine.updateApplicationBeforeInstruction(actor, body.referenceNumber, {
      projectTitle: body.projectTitle,
      goodsSummary: body.goodsSummary,
      paymentReference: body.paymentReference
    });
    return Response.json({ success: true, application: serializeApplication(application) });
  } catch (err) {
    return errorResponse(err);
  }
}
