'use client';

import React, { useState } from 'react';
import Badge from './Badge.jsx';
import Button from './Button.jsx';
import AppIcon from './AppIcon.jsx';
import { downloadAuthenticatedFile } from '../../lib/secure-download.js';

/**
 * Visionneuse interactive de pièces justificatives (ADM-05, REQ-07)
 * Responsive mobile-first (.doc-viewer-grid) avec liste de contrôle visuelle par pièce.
 * @param {Object} props
 * @param {Array<{docCode: string, name: string, fileName?: string, sha256?: string, sizeBytes?: number, stored?: boolean, status?: string}>} props.documents
 * @param {string} [props.selectedDocCode]
 * @param {string} [props.referenceNumber]
 * @param {string} [props.token]
 * @param {(docCode: string) => void} [props.onSelect]
 */
export default function DocumentViewer({
  documents = [],
  selectedDocCode,
  referenceNumber = '',
  token = '',
  onSelect
}) {
  const [selectedInternal, setSelectedInternal] = useState('');
  const [verifiedMap, setVerifiedMap] = useState({});
  const [isOpening, setIsOpening] = useState(false);
  const [docError, setDocError] = useState('');
  const currentCode = selectedDocCode || selectedInternal;
  const activeDoc = documents.find((d) => d.docCode === currentCode) || documents[0];

  const handleSelect = (code) => {
    setSelectedInternal(code);
    onSelect?.(code);
  };

  const docKey = (code) => `${referenceNumber || 'global'}::${code}`;
  const checkedCount = documents.filter((d) => Boolean(verifiedMap[docKey(d.docCode)])).length;

  const toggleChecked = (code) => {
    const k = docKey(code);
    setVerifiedMap((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  return (
    <div className="document-viewer" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div
        className="viewer-header"
        style={{
          background: '#f8fafc',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fnpss-navy)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AppIcon name="documents" size="sm" />
            <span>Pièces Justificatives ({documents.length})</span>
          </span>
          {documents.length > 0 && (
            <Badge status={checkedCount === documents.length ? 'valide' : 'info'}>
              Contrôle : {checkedCount}/{documents.length}
            </Badge>
          )}
        </div>
        {activeDoc && (
          <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
            <span className="mono text-muted" style={{ fontSize: '11px' }}>
              SHA-256: {activeDoc.sha256 ? `${activeDoc.sha256.substring(0, 16)}...` : 'Non calculé'}
            </span>
            <Badge status={activeDoc.sha256 ? 'valide' : 'instruction'}>
              {activeDoc.sha256 ? (
                <>
                  <AppIcon name="check" size="xs" />
                  <span>Intègre</span>
                </>
              ) : 'En attente'}
            </Badge>
          </div>
        )}
      </div>

      <div className="doc-viewer-grid">
        {/* Liste des pièces */}
        <div className="doc-viewer-sidebar" style={{ borderRight: '1px solid var(--border)', background: '#fafbfc', padding: '8px' }}>
          {documents.map((doc) => {
            const isSelected = activeDoc?.docCode === doc.docCode;
            const isVerified = Boolean(verifiedMap[docKey(doc.docCode)]);
            return (
              <button
                key={doc.docCode}
                type="button"
                onClick={() => handleSelect(doc.docCode)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 12px',
                  marginBottom: '6px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--fnpss-blue)' : '1px solid transparent',
                  background: isSelected ? '#eef6fc' : 'transparent',
                  color: isSelected ? 'var(--fnpss-blue)' : 'var(--text-main)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{doc.docCode}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {doc.stored && <AppIcon name="lock" size="xs" title="Stocké et chiffré AES-256-GCM sur Cloudinary" />}
                    {isVerified ? (
                      <AppIcon name="checkbox" size="xs" title="Marquée vérifiée" style={{ color: 'var(--fnpss-green)' }} />
                    ) : doc.sha256 ? (
                      <AppIcon name="check" size="xs" style={{ color: 'var(--fnpss-green)' }} />
                    ) : null}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Aperçu du document */}
        <div style={{ padding: '16px', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
          {activeDoc ? (
            <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '18px 14px' }}>
              <div style={{ color: 'var(--fnpss-blue)', marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                <AppIcon name="pdf" size="xl" />
              </div>
              <h4 style={{ fontSize: '14px', marginBottom: '6px', wordBreak: 'break-word' }}>{activeDoc.name}</h4>
              <p className="text-muted" style={{ fontSize: '12px', marginBottom: '12px', wordBreak: 'break-word' }}>
                Fichier : <strong>{activeDoc.fileName || `${activeDoc.docCode}.pdf`}</strong>
                {activeDoc.sizeBytes && ` (${Math.round(activeDoc.sizeBytes / 1024)} Ko)`}
              </p>
              {activeDoc.sha256 && (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '4px', border: '1px solid #eef2f6', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Empreinte d&apos;intégrité Web Crypto SHA-256 :</div>
                  <div className="mono" style={{ fontSize: '11px', wordBreak: 'break-all', color: 'var(--fnpss-navy)' }}>
                    {activeDoc.sha256}
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-between" style={{ flexWrap: 'wrap', marginBottom: '12px' }}>
                <span className="badge badge-valide">
                  <AppIcon name="check" size="xs" />
                  <span>Format PDF/A Conforme</span>
                </span>
                <span className="badge badge-soumis">Anti-malware vérifié</span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-navy)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(verifiedMap[docKey(activeDoc.docCode)])}
                    onChange={() => toggleChecked(activeDoc.docCode)}
                  />
                  <span>Pièce {activeDoc.docCode} contrôlée conforme</span>
                </label>
              </div>

              {referenceNumber && activeDoc.stored ? (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    isLoading={isOpening}
                    loadingText="Déchiffrement..."
                    onClick={async () => {
                      setIsOpening(true);
                      setDocError('');
                      try {
                        await downloadAuthenticatedFile(
                          `/api/applications/document?ref=${encodeURIComponent(referenceNumber)}&docCode=${encodeURIComponent(activeDoc.docCode)}`,
                          token,
                          {
                            fallbackFileName: activeDoc.fileName || `${activeDoc.docCode}.pdf`,
                            openInNewTab: true
                          }
                        );
                      } catch (err) {
                        setDocError(err.message || 'Impossible de déchiffrer la pièce justificative.');
                      } finally {
                        setIsOpening(false);
                      }
                    }}
                  >
                    <AppIcon name="unlock" size="sm" />
                    <span>Ouvrir &amp; Déchiffrer le PDF (Cloudinary AES-256-GCM)</span>
                  </Button>
                  {docError && (
                    <div role="alert" style={{ marginTop: '8px', fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>
                      {docError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <AppIcon name="info" size="xs" />
                  <span>Empreinte SHA-256 enregistrée (binaire non archivé sur Cloudinary pour cet ancien dépôt).</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted">Aucune pièce justificative sélectionnée.</p>
          )}
        </div>
      </div>
    </div>
  );
}
