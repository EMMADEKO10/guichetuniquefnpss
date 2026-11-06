import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function VerifierPage() {
  const [hashInput, setHashInput] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!hashInput.trim()) return;
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/verify?hash=${encodeURIComponent(hashInput.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la vérification.');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Erreur de connexion au registre blockchain.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '20px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Badge status="valide" style={{ marginBottom: '8px' }}>
          DGDA &bull; Contrôle Douanier Souverain
        </Badge>
        <h2>Portail Public de Vérification d'Authenticité</h2>
        <p className="text-muted" style={{ fontSize: '13px', maxWidth: '600px', margin: '0 auto' }}>
          Vérification d'intégrité cryptographique des attestations FNPSS en temps réel via l'ancrage Blockchain Polygon.
        </p>
      </div>

      <Card>
        <form onSubmit={handleVerify} style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label htmlFor="hash-input">
              Empreinte SHA-256 du Document ou Numéro d'Attestation (ex: FNPSS-2026-XXXXX)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="hash-input"
                type="text"
                className="form-control mono"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Ex: 0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
                required
              />
              <Button type="submit" variant="primary" isLoading={isLoading}>
                Vérifier
              </Button>
            </div>
          </div>
        </form>

        {error && (
          <div style={{ background: '#fce8e6', borderLeft: '4px solid var(--fnpss-red)', padding: '12px 14px', borderRadius: '4px', color: '#b31412', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {result && (
          <div
            style={{
              borderRadius: '8px',
              border: `2px solid ${result.status === 'VALID' ? 'var(--fnpss-green)' : result.status === 'REVOKED' ? 'var(--fnpss-red)' : '#f59e0b'}`,
              background: result.status === 'VALID' ? '#f0fdf4' : result.status === 'REVOKED' ? '#fef2f2' : '#fffbeb',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span style={{ fontSize: '32px' }}>
                {result.status === 'VALID' ? '✅' : result.status === 'REVOKED' ? '❌' : '⚠️'}
              </span>
              <div>
                <h3 style={{ margin: 0, color: result.status === 'VALID' ? '#166534' : result.status === 'REVOKED' ? '#991b1b' : '#92400e' }}>
                  {result.status === 'VALID' ? 'ATTESTATION OFFICIELLE VALIDE' : result.status === 'REVOKED' ? 'ATTESTATION FORMELLEMENT RÉVOQUÉE' : 'DOCUMENT EXPIRÉ OU INCONNU'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Statut certifié par le smart contract <code>FNPSSRegistry.sol</code> sur Polygon
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
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
            </div>

            {result.status === 'REVOKED' && result.revocationReason && (
              <div style={{ marginTop: '14px', background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '12.5px', color: '#991b1b' }}>
                <strong>Motif de la révocation DG :</strong> {result.revocationReason}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

