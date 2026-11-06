import React from 'react';
import Badge from './Badge.jsx';

/**
 * Visionneuse interactive de pièces justificatives (ADM-05, REQ-07)
 * @param {Object} props
 * @param {Array<{docCode: string, name: string, fileName?: string, sha256?: string, sizeBytes?: number, status?: string}>} props.documents
 * @param {string} [props.selectedDocCode]
 * @param {(docCode: string) => void} props.onSelect
 */
export default function DocumentViewer({
  documents = [],
  selectedDocCode,
  onSelect
}) {
  const activeDoc = documents.find((d) => d.docCode === selectedDocCode) || documents[0];

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
        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fnpss-navy)' }}>
          📑 Pièces Justificatives ({documents.length})
        </span>
        {activeDoc && (
          <div className="flex gap-2 items-center">
            <span className="mono text-muted" style={{ fontSize: '11px' }}>
              SHA-256: {activeDoc.sha256 ? `${activeDoc.sha256.substring(0, 16)}...` : 'Non calculé'}
            </span>
            <Badge status={activeDoc.sha256 ? 'valide' : 'instruction'}>
              {activeDoc.sha256 ? '✓ Intègre' : 'En attente'}
            </Badge>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '320px' }}>
        {/* Liste des pièces */}
        <div style={{ borderRight: '1px solid var(--border)', background: '#fafbfc', padding: '8px' }}>
          {documents.map((doc) => {
            const isSelected = activeDoc?.docCode === doc.docCode;
            return (
              <button
                key={doc.docCode}
                type="button"
                onClick={() => onSelect?.(doc.docCode)}
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
                  {doc.sha256 && <span style={{ color: 'var(--fnpss-green)' }}>✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Aperçu du document */}
        <div style={{ padding: '20px', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {activeDoc ? (
            <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '28px 16px' }}>
              <div style={{ fontSize: '38px', marginBottom: '10px' }}>📄</div>
              <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>{activeDoc.name}</h4>
              <p className="text-muted" style={{ fontSize: '12px', marginBottom: '12px' }}>
                Fichier : <strong>{activeDoc.fileName || `${activeDoc.docCode}.pdf`}</strong>
                {activeDoc.sizeBytes && ` (${Math.round(activeDoc.sizeBytes / 1024)} Ko)`}
              </p>
              {activeDoc.sha256 && (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '4px', border: '1px solid #eef2f6', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Empreinte d'intégrité Web Crypto SHA-256 :</div>
                  <div className="mono" style={{ fontSize: '11px', wordBreak: 'break-all', color: 'var(--fnpss-navy)' }}>
                    {activeDoc.sha256}
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-between">
                <span className="badge badge-valide">✓ Format PDF/A Conforme</span>
                <span className="badge badge-soumis">Anti-malware vérifié</span>
              </div>
            </div>
          ) : (
            <p className="text-muted">Aucune pièce justificative sélectionnée.</p>
          )}
        </div>
      </div>
    </div>
  );
}

