'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import AlertBanner from '../../components/ui/AlertBanner.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';

const HISTORY_STORAGE_KEY = 'fnpss_verify_history_v1';

export default function VerifierPage() {
  const toast = useToast();
  const [hashInput, setHashInput] = useState('');
  const [partnerApiKey, setPartnerApiKey] = useState('');
  const [pdfFileInfo, setPdfFileInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraInfo, setCameraInfo] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

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

  const pushHistory = (query, data) => {
    try {
      const entry = {
        query,
        certificateNumber: data?.certificateNumber || data?.record?.certificateNumber || query,
        verdict: data?.verdict || 'INCONNU',
        beneficiary: data?.beneficiary || 'Non spécifié',
        checkedAt: new Date().toISOString()
      };
      setHistory((prev) => {
        const next = [entry, ...prev.filter((item) => item.query !== query)].slice(0, 5);
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    } catch {
      // Ignore storage errors
    }
  };

  const runVerification = async (targetQuery) => {
    const cleaned = String(targetQuery || '').trim();
    if (!cleaned) return;
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/verify?hash=${encodeURIComponent(cleaned)}`, {
        headers: buildHeaders()
      });
      captureRateLimit(res);
      const data = await res.json();
      if (res.status === 404 && data.verdict) {
        setResult(data);
        pushHistory(cleaned, data);
        toast.warning('Acte introuvable ou non répertorié dans le registre.');
      } else if (!res.ok) {
        const msg = data.error || 'Erreur lors de la vérification.';
        setError(msg);
        toast.error(msg);
      } else {
        setResult(data);
        pushHistory(cleaned, data);
        if (data.verdict === 'PASTILLE_VERTE_VALIDE' || data.isValid === true) {
          toast.success('Attestation authentique validée sur le registre FNPSS.');
        } else if (data.verdict === 'PASTILLE_ROUGE_REVOQUE' || data.status === 2) {
          toast.error('ALERTE : Attestation formellement révoquée !');
        } else {
          toast.warning(`Résultat du contrôle : ${data.verdict || 'Vérification terminée'}`);
        }
      }
    } catch {
      setError('Erreur de connexion au registre blockchain.');
      toast.error('Impossible de joindre le registre de vérification.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 5));
      }
    } catch {
      // Ignore storage read error
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const qHash = params.get('hash') || params.get('cert') || params.get('code');
      if (qHash && qHash.trim()) {
        setHashInput(qHash.trim());
        runVerification(qHash.trim());
      }
    } catch {
      // Ignore URL parse error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e) => {
    e?.preventDefault();
    await runVerification(hashInput);
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
      const clientSha256 = '0x' + Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
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
        const msg = data.error || 'Fichier PDF rejeté par le contrôle de sécurité.';
        setError(msg);
        toast.error(msg);
      } else {
        setResult(data);
        pushHistory(data.certificateNumber || file.name, data);
        toast.info(`Empreinte PDF comparée : ${data.verdict || 'Analysé'}`);
      }
    } catch {
      setError('Impossible d\'inspecter le fichier PDF sélectionné.');
      toast.error('Lecture du fichier PDF impossible.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore
    }
    toast.info('Historique local des contrôles effacé.');
  };

  const stopCameraScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => stopCameraScan, [stopCameraScan]);

  const extractScannedTarget = (rawValue) => {
    const trimmed = String(rawValue || '').trim();
    if (!trimmed) return '';
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const u = new URL(trimmed);
        return (u.searchParams.get('hash') || u.searchParams.get('cert') || u.searchParams.get('code') || trimmed).trim();
      }
    } catch {
      // Valeur brute non-URL
    }
    return trimmed;
  };

  const startCameraScan = async () => {
    setCameraInfo('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraInfo(
        'Votre navigateur ne permet pas l\'accès direct à la caméra. Utilisez la saisie du numéro d\'acte ci-dessus ou déposez le fichier PDF ci-dessous.'
      );
      return;
    }
    if (typeof window === 'undefined' || typeof window.BarcodeDetector !== 'function') {
      setCameraInfo(
        'La détection QR native (BarcodeDetector) n\'est pas prise en charge par ce navigateur. Utilisez la saisie directe ou le contrôle par fichier PDF.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 60);

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scanTimerRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            const target = extractScannedTarget(codes[0].rawValue);
            stopCameraScan();
            if (target) {
              setHashInput(target);
              toast.info('QR Code détecté — vérification en cours...');
              runVerification(target);
            }
          }
        } catch {
          // Ignorer une frame illisible
        }
      }, 450);
    } catch {
      stopCameraScan();
      setCameraInfo(
        'Accès caméra refusé ou indisponible sur cet appareil. Saisissez le numéro d\'attestation ou importez le fichier PDF officiel.'
      );
    }
  };

  const isGreen = result && (result.verdict === 'PASTILLE_VERTE_VALIDE' || result.statusLabel === 'VALID' || result.isValid === true);
  const isRevoked = result && (result.verdict === 'PASTILLE_ROUGE_REVOQUE' || result.statusLabel === 'REVOKED' || result.status === 2);
  const isExpired = result && (result.verdict === 'PASTILLE_GRISE_EXPIRE' || result.statusLabel === 'EXPIRED' || result.isExpired === true);

  return (
    <div style={{ maxWidth: '860px', margin: '20px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Badge status="valide" style={{ marginBottom: '8px' }}>
          DGDA &bull; DGI &bull; DGRAD &bull; Contrôle Douanier Souverain
        </Badge>
        <h2>Portail Public de Vérification d'Authenticité</h2>
        <p className="text-muted" style={{ fontSize: '13.5px', maxWidth: '660px', margin: '0 auto' }}>
          Vérification d&apos;intégrité cryptographique des attestations FNPSS en temps réel via l&apos;ancrage Blockchain Polygon
          (Scan QR Code, Numéro d&apos;Acte ou Téléversement PDF sans scan).
        </p>
      </div>

      {error && (
        <AlertBanner
          variant="error"
          title="Erreur de vérification"
          message={error}
          onClose={() => setError('')}
          style={{ marginBottom: '18px' }}
        />
      )}

      <Card title="1. Vérification par QR Code, Empreinte SHA-256 ou Numéro d'Acte (VER-02, VER-03)">
        <form onSubmit={handleVerify} style={{ marginBottom: '14px' }}>
          <div className="form-group">
            <label htmlFor="hash-input">
              Empreinte SHA-256 du Document ou Numéro d&apos;Attestation (ex: FNPSS-EXO-2026-00001)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                id="hash-input"
                type="text"
                className="form-control mono"
                style={{ flex: 1, minWidth: '240px' }}
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Ex: FNPSS-EXO-2026-00001 ou 0x9f86d081884c7d659a2feaa0c55ad015..."
                required
              />
              <Button type="submit" variant="brand" isLoading={isLoading} loadingText="Contrôle...">
                Vérifier l&apos;Acte
              </Button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="partner-key-input" style={{ fontSize: '12px' }}>
              Clé d&apos;Interopérabilité Régie Financière — DGDA / DGRAD / DGI (Optionnel — VER-05)
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
          <div
            style={{
              fontSize: '12px',
              background: 'var(--surface-subtle)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span>
              Passerelle API Partenaire (<code>VER-05</code>) : Quota restant{' '}
              <strong>{rateLimitInfo.remaining}/{rateLimitInfo.limit}</strong> requêtes/min.
            </span>
            <Badge status={Number(rateLimitInfo.remaining) > 10 ? 'valide' : 'warning'}>
              {Number(rateLimitInfo.limit) >= 600 ? 'Canal Régie Authentifié' : 'Canal Public'}
            </Badge>
          </div>
        )}
      </Card>

      <Card title="📷 Scanner un QR Code (Caméra Mobile — Inspection Douanière Express)">
        <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap', marginBottom: cameraActive || cameraInfo ? '12px' : 0 }}>
          {!cameraActive ? (
            <Button type="button" variant="primary" size="sm" onClick={startCameraScan}>
              📷 Activer la caméra QR Code
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={stopCameraScan}>
              ⏹ Arrêter le scanner caméra
            </Button>
          )}
          <span className="text-muted" style={{ fontSize: '12px' }}>
            Visez le QR Code imprimé en haut à droite de l&apos;attestation FNPSS (poste frontalier mobile).
          </span>
        </div>

        {cameraInfo && (
          <AlertBanner variant="info" title="Scanner caméra indisponible" message={cameraInfo} style={{ marginBottom: 0 }} />
        )}

        {cameraActive && (
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: '100%',
                maxWidth: '380px',
                borderRadius: '10px',
                border: '2px solid var(--fnpss-blue)',
                background: '#0a2540'
              }}
            />
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

      {result && (
        <Card title="Verdict du Registre Blockchain FNPSSRegistry.sol (UX-06)">
          <div
            role="region"
            aria-label="Verdict de contrôle douanier"
            style={{
              borderRadius: '10px',
              border: `2px solid ${isGreen ? 'var(--fnpss-green)' : isExpired ? '#64748b' : 'var(--fnpss-red)'}`,
              background: isGreen ? '#f0fdf4' : isExpired ? '#f8fafc' : '#fef2f2',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '34px' }} aria-hidden="true">
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
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Verdict : <code>{result.verdict || 'N/A'}</code> &bull; Canal : <code>{result.partnerId || 'PUBLIC_QR_SCANNER'}</code>
                  </p>
                </div>
              </div>

              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <Badge status={result.onChainVerified ? 'valide' : 'neutral'}>
                  {result.onChainVerified ? '⛓️ Preuve Polygon Confirmée' : 'Registre FNPSS Local'}
                </Badge>
                {result.ministryCoSigned && (
                  <Badge status="info">🏛️ Co-signé Ministère</Badge>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
              <div>
                <strong className="text-muted">N° Officiel d&apos;Acte :</strong>
                <div className="mono">{result.certificateNumber || result.record?.certificateNumber || 'Non répertorié'}</div>
              </div>
              <div>
                <strong className="text-muted">Bénéficiaire :</strong>
                <div>{result.beneficiary || 'Non spécifié'}</div>
              </div>
              <div>
                <strong className="text-muted">Type d&apos;acte :</strong>
                <div>{result.certType || 'Certificat d\'exonération (S4)'}</div>
              </div>
              <div>
                <strong className="text-muted">Date d&apos;effet :</strong>
                <div>{result.issuedAt || 'N/A'}</div>
              </div>
              <div>
                <strong className="text-muted">Date d&apos;échéance :</strong>
                <div>{result.validUntil || 'N/A'}</div>
              </div>
              {result.computedSha256 && (
                <div>
                  <strong className="text-muted">Empreinte PDF recalculée :</strong>
                  <div className="mono" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{result.computedSha256}</div>
                </div>
              )}
            </div>

            {isRevoked && (
              <AlertBanner
                variant="danger"
                title="Révocation formelle notifiée aux régies DGDA / DGI / DGRAD"
                message={
                  result.revocationReason ||
                  result.record?.revocationReason ||
                  'Cet acte a été retiré par décision de la Direction Générale du FNPSS et ne confère plus aucun avantage douanier ou fiscal.'
                }
                style={{ marginTop: '14px', marginBottom: 0 }}
              />
            )}
          </div>
        </Card>
      )}

      {history.length > 0 && (
        <Card
          title="Dernières Vérifications sur ce Poste (Historique local)"
          subtitle="Rappel rapide des 5 derniers contrôles effectués depuis ce navigateur"
          actions={
            <Button size="sm" variant="ghost" onClick={clearHistory}>
              Effacer l&apos;historique
            </Button>
          }
        >
          <div style={{ display: 'grid', gap: '8px' }}>
            {history.map((item) => {
              const ok = item.verdict === 'PASTILLE_VERTE_VALIDE';
              return (
                <div
                  key={`${item.query}-${item.checkedAt}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--fnpss-navy)' }}>
                      {item.certificateNumber}
                    </div>
                    <div className="text-muted" style={{ fontSize: '11.5px' }}>
                      {item.beneficiary} &bull; {new Date(item.checkedAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge status={ok ? 'valide' : item.verdict === 'PASTILLE_GRISE_EXPIRE' ? 'neutral' : 'revoque'}>
                      {item.verdict}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setHashInput(item.query);
                        runVerification(item.query);
                      }}
                    >
                      Re-contrôler
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
