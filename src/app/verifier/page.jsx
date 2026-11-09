'use client';

import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function VerifierPage() {
  const [hashInput, setHashInput] = useState('');
  const [partnerApiKey, setPartnerApiKey] = useState('');
  const [pdfFileInfo, setPdfFileInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const buildHeaders = (extra = {}) => ({
    ...(partnerApiKey.trim() ? { 'X-API-Key': partnerApiKey.trim() } : {}),
    ...extra
  });

  const captureRateLimit = (res) => {
    const limit = res.headers.get('x-ratelimit-limit');
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (limit !== null && remaining !== null) {
      setRateLimitInfo({ limit, remaining });
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!hashInput.trim()) return;
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/verify?hash=${encodeURIComponent(hashInput.trim())}`, {
        headers: buildHeaders()
      });
      captureRateLimit(res);
      const data = await res.json();
      if (res.status === 404 && data.verdict) {
        setResult(data);
      } else if (!res.ok) {
        setError(data.error || 'Erreur lors de la vérification.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Erreur de connexion au registre blockchain.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfUploadVerify = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const arrayBuf = await file.arrayBuffer();
      const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
      const clientSha256 = '0x' + Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      setPdfFileInfo({ name: file.name, sizeBytes: file.size, clientSha256 });

      const bytes = new Uint8Array(arrayBuf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Pdf = btoa(binary);

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          fileName: file.name,
          pdfContent: `data:application/pdf;base64,${base64Pdf}`
        })
      });
      captureRateLimit(res);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fichier PDF rejeté par le contrôle de sécurité.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Impossible d\'inspecter le fichier PDF sélectionné.');
    } finally {
      setIsLoading(false);
    }
  };

  const isGreen = result && (result.verdict === 'PASTILLE_VERTE_VALIDE' || result.statusLabel === 'VALID' || result.isValid === true);
  const isRevoked = result && (result.verdict === 'PASTILLE_ROUGE_REVOQUE' || result.statusLabel === 'REVOKED' || result.status === 2);
  const isExpired = result && (result.verdict === 'PASTILLE_GRISE_EXPIRE' || result.statusLabel === 'EXPIRED' || result.isExpired === true);

  return (
    <div style={{ maxWidth: '820px', margin: '20px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Badge status="valide" style={{ marginBottom: '8px' }}>
          DGDA &bull; Contrôle Douanier Souverain
        </Badge>
        <h2>Portail Public de Vérification d'Authenticité</h2>
        <p className="text-muted" style={{ fontSize: '13px', maxWidth: '640px', margin: '0 auto' }}>
          Vérification d'intégrité cryptographique des attestations FNPSS en temps réel via l'ancrage Blockchain Polygon (Scan QR Code, Numéro d'Acte ou Téléversement PDF sans scan).
        </p>
      </div>

      <Card title="1. Vérification par QR Code, Empreinte SHA-256 ou Numéro d'Acte (VER-02, VER-03)">
        <form onSubmit={handleVerify} style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label htmlFor="hash-input">
              Empreinte SHA-256 du Document ou Numéro d'Attestation (ex: FNPSS-EXO-2026-00001)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                id="hash-input"
                type="text"
                className="form-control mono"
                style={{ flex: 1, minWidth: '240px' }}
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Ex: 0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
                required
              />
              <Button type="submit" variant="primary" isLoading={isLoading}>
                Vérifier l'Acte
              </Button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="partner-key-input" style={{ fontSize: '12px' }}>
              Clé d'Interopérabilité Régie Financière — DGDA / DGRAD / DGI (Optionnel — VER-05)
            </label>
            <input
              id="partner-key-input"
              type="text"
              className="form-control mono"
              style={{ fontSize: '12px' }}
              value={partnerApiKey}
              onChange={(e) => setPartnerApiKey(e.target.value)}
              placeholder="Public (60 req/min) ou clé partenaire ex: dgda-live-key-2026 (600 req/min)"
            />
          </div>
        </form>

        {rateLimitInfo && (
          <div className="text-muted" style={{ fontSize: '11.5px', marginBottom: '10px' }}>
            Passerelle API Partenaire (`VER-05`) : Quota restant <strong>{rateLimitInfo.remaining}/{rateLimitInfo.limit}</strong> requêtes/min.
          </div>
        )}
      </Card>

      <Card title="2. Vérification Directe d'un Fichier PDF sans Scan QR Code (VER-04)">
        <div className="form-group" style={{ marginBottom: '8px' }}>
          <label htmlFor="pdf-verify-upload">
            Sélectionnez un fichier PDF officiel reçu par email pour recalculer son empreinte SHA-256 et la comparer au registre Polygon
          </label>
          <input
            id="pdf-verify-upload"
            type="file"
            accept="application/pdf,.pdf"
            className="form-control"
            onChange={handlePdfUploadVerify}
          />
        </div>
        {pdfFileInfo && (
          <div className="mono" style={{ fontSize: '11.5px', color: 'var(--fnpss-navy)', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            Fichier : <strong>{pdfFileInfo.name}</strong> ({pdfFileInfo.sizeBytes} octets) &bull; SHA-256 client : <code>{pdfFileInfo.clientSha256}</code>
          </div>
        )}
      </Card>

      {error && (
        <div role="alert" style={{ background: '#fce8e6', borderLeft: '4px solid var(--fnpss-red)', padding: '12px 14px', borderRadius: '4px', color: '#b31412', fontSize: '13px', marginBottom: '18px' }}>
          {error}
        </div>
      )}

      {result && (
        <Card title="Verdict du Registre Blockchain FNPSSRegistry.sol (UX-06)">
          <div
            role="region"
            aria-label="Verdict de contrôle douanier"
            style={{
              borderRadius: '8px',
              border: `2px solid ${isGreen ? 'var(--fnpss-green)' : isExpired ? '#64748b' : 'var(--fnpss-red)'}`,
              background: isGreen ? '#f0fdf4' : isExpired ? '#f8fafc' : '#fef2f2',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '32px' }}>
                {isGreen ? '🟢' : isExpired ? '⚪' : '🔴'}
              </span>
              <div>
                <h3 style={{ margin: 0, color: isGreen ? '#166534' : isExpired ? '#334155' : '#991b1b' }}>
                  {isGreen
                    ? 'PASTILLE VERTE — ATTESTATION OFFICIELLE VALIDE'
                    : isRevoked
                      ? 'PASTILLE ROUGE — ATTESTATION FORMELLEMENT RÉVOQUÉE'
                      : isExpired
                        ? 'PASTILLE GRISE — DOCUMENT EXPIRÉ'
                        : 'PASTILLE ROUGE — DOCUMENT FALSIFIÉ OU INCONNU'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Verdict : <code>{result.verdict || 'N/A'}</code> &bull; Canal : <code>{result.partnerId || 'PUBLIC_QR_SCANNER'}</code>
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
              <div>
                <strong className="text-muted">N° Officiel d'Acte :</strong>
                <div className="mono">{result.certificateNumber || result.record?.certificateNumber || 'Non répertorié'}</div>
              </div>
              <div>
                <strong className="text-muted">Bénéficiaire :</strong>
                <div>{result.beneficiary || 'Non spécifié'}</div>
              </div>
              <div>
                <strong className="text-muted">Type d'acte :</strong>
                <div>{result.certType || 'Certificat d\'exonération (S4)'}</div>
              </div>
              <div>
                <strong className="text-muted">Date d'effet :</strong>
                <div>{result.issuedAt || 'N/A'}</div>
              </div>
              <div>
                <strong className="text-muted">Date d'échéance :</strong>
                <div>{result.validUntil || 'N/A'}</div>
              </div>
              {result.computedSha256 && (
                <div>
                  <strong className="text-muted">Empreinte PDF recalculée :</strong>
                  <div className="mono" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{result.computedSha256}</div>
                </div>
              )}
            </div>

            {isRevoked && (result.revocationReason || result.record?.revocationReason) && (
              <div style={{ marginTop: '14px', background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '12.5px', color: '#991b1b' }}>
                <strong>Motif de la révocation DG :</strong> {result.revocationReason || result.record?.revocationReason}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
