import { registrySimulator } from '../../../blockchain/registry-simulator.mjs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash') || searchParams.get('ref');

    if (!hash) {
      return Response.json(
        { error: 'Paramètre hash ou ref manquant.' },
        { status: 400 }
      );
    }

    const verification = registrySimulator.verifyDocument(hash);
    if (!verification || !verification.record) {
      return Response.json({
        found: false,
        status: 'UNKNOWN',
        message: 'Aucun enregistrement blockchain trouvé pour cette empreinte.'
      }, { status: 404 });
    }

    return Response.json({
      found: true,
      status: verification.status,
      verdict: verification.verdict,
      record: verification.record,
      isValid: verification.isValid
    });
  } catch (err) {
    return Response.json(
      { error: 'Erreur lors de l\'interrogation de la blockchain Polygon.' },
      { status: 500 }
    );
  }
}
