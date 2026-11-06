import { applicationEngine, Roles } from '../../../workflow/application-engine.mjs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceCode = searchParams.get('service');
    const status = searchParams.get('status');

    let applications = applicationEngine.listApplications({ serviceCode, status });

    return Response.json({
      success: true,
      total: applications.length,
      applications
    });
  } catch (err) {
    return Response.json(
      { error: 'Erreur lors de la récupération des demandes.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const actor = { id: body.ownerId || 'ong-requerant-default', role: Roles.REQUERANT };

    const application = applicationEngine.createApplication({
      actor,
      serviceCode: body.serviceCode || 'S1',
      organizationName: body.organizationName || 'ONG Partenaire RDC',
      projectTitle: body.projectTitle || 'Projet Déposé en Ligne',
      goodsSummary: body.goodsSummary || 'Consommables humanitaires',
      paymentReference: body.paymentReference || 'DEP-RAWBANK-001',
      uploadedDocTypes: body.uploadedDocTypes,
      attachedDocuments: body.attachedDocuments,
      idempotencyKey: body.idempotencyKey
    });

    return Response.json({
      success: true,
      application
    }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Erreur lors de la création de la demande.' },
      { status: 400 }
    );
  }
}
