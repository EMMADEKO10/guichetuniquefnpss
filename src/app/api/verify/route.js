/**
 * @fileoverview Route API Next.js — Portail Public & Passerelle Partenaire DGDA / DGRAD / DGI (VER-03, VER-04, VER-05).
 * - GET  /api/verify?hash=... : vérification instantanée par empreinte SHA-256 ou numéro d'acte (QR Code)
 * - POST /api/verify          : vérification directe d'un fichier PDF téléversé sans scan QR Code (VER-04)
 * Intègre le contrôle de clé API partenaire (`X-API-Key`) et le Rate Limiting par minute (`VER-05`).
 */

import { registrySimulator, DocStatus } from '../../../blockchain/registry-simulator.mjs';
import { verifyUploadedPdfAgainstRegistry } from '../../../storage/document-upload-guard.mjs';
import { partnerApiGateway } from '../../../security/partner-api-gateway.mjs';
import { applicationEngine } from '../../../workflow/application-engine.mjs';
import { OFFICIAL_ACT_TEMPLATES } from '../../../pdf/certificate-generator.mjs';

export const dynamic = 'force-dynamic';

function enrichVerificationPayload(verification) {
  const rec = verification?.record;
  if (!rec) {
    return {
      found: false,
      status: 'UNKNOWN',
      statusLabel: 'UNKNOWN',
      verdict: verification?.verdict || 'PASTILLE_ROUGE_FALSIFIE',
      isValid: false,
      isExpired: false,
      record: null
    };
  }

  const svcKey = `S${rec.serviceCode || 4}`;
  const tpl = OFFICIAL_ACT_TEMPLATES[svcKey] || OFFICIAL_ACT_TEMPLATES.S4;
  const matchingApp = applicationEngine
    .listApplications()
    .find(a => a.certificate?.certificateNumber === rec.certificateNumber);

  const statusLabel = verification.isValid
    ? 'VALID'
    : rec.status === DocStatus.REVOKED
      ? 'REVOKED'
      : 'EXPIRED';

  return {
    found: true,
    status: verification.status,
    statusLabel,
    verdict: verification.verdict,
    isValid: verification.isValid,
    isExpired: verification.isExpired,
    record: rec,
    certificateNumber: rec.certificateNumber,
    beneficiary: matchingApp?.organizationName || 'Organisation Bénéficiaire Enregistrée',
    certType: `${tpl.officialTitle} (${svcKey})`,
    issuedAt: rec.issuedAt ? new Date(rec.issuedAt * 1000).toISOString().slice(0, 10) : 'N/A',
    validUntil: rec.expiresAt ? new Date(rec.expiresAt * 1000).toISOString().slice(0, 10) : 'Illimitée',
    revocationReason: rec.revocationReason || ''
  };
}

function runPartnerGateway(request, endpoint, queryTarget) {
  const apiKey = request.headers.get('x-api-key') || null;
  return partnerApiGateway.authenticateAndRateLimitPartner({
    apiKey,
    endpoint,
    queryTarget
  });
}

function handleGatewayOrDomainError(err) {
  const msg = err?.message || 'Erreur lors de la vérification.';
  if (msg.includes('Clé d\'API partenaire invalide')) {
    return Response.json({ error: msg }, { status: 401 });
  }
  if (msg.includes('Rate Limit 429')) {
    return Response.json({ error: msg }, { status: 429 });
  }
  return Response.json({ error: msg }, { status: 400 });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = (searchParams.get('hash') || searchParams.get('ref') || '').trim();

    if (!hash) {
      return Response.json(
        { error: 'Paramètre hash ou ref manquant.' },
        { status: 400 }
      );
    }

    const gatewayInfo = runPartnerGateway(request, '/api/verify', hash);
    const verification = registrySimulator.verifyDocument(hash);

    if (!verification || !verification.record) {
      return Response.json({
        found: false,
        status: 'UNKNOWN',
        statusLabel: 'UNKNOWN',
        verdict: verification?.verdict || 'PASTILLE_ROUGE_FALSIFIE',
        isValid: false,
        partnerId: gatewayInfo.partnerId,
        message: 'Aucun enregistrement blockchain trouvé pour cette empreinte.'
      }, { status: 404, headers: gatewayInfo.headers });
    }

    return Response.json({
      ...enrichVerificationPayload(verification),
      partnerId: gatewayInfo.partnerId
    }, { status: 200, headers: gatewayInfo.headers });
  } catch (err) {
    return handleGatewayOrDomainError(err);
  }
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Corps JSON invalide.' }, { status: 400 });
    }

    const fileName = body.fileName || 'acte-fnpss.pdf';
    const gatewayInfo = runPartnerGateway(request, 'POST /api/verify', fileName);

    if (!body.pdfContent) {
      return Response.json({ error: 'VER-04: Contenu du fichier PDF (pdfContent) requis.' }, { status: 400 });
    }

    const pdfVerification = verifyUploadedPdfAgainstRegistry(
      body.pdfContent,
      registrySimulator,
      Math.floor(Date.now() / 1000),
      { fileName }
    );

    const enriched = enrichVerificationPayload(pdfVerification);
    return Response.json({
      ...enriched,
      fileName: pdfVerification.fileName,
      byteSize: pdfVerification.byteSize,
      pdfVersion: pdfVerification.pdfVersion,
      computedSha256: pdfVerification.computedSha256,
      partnerId: gatewayInfo.partnerId
    }, { status: 200, headers: gatewayInfo.headers });
  } catch (err) {
    return handleGatewayOrDomainError(err);
  }
}
