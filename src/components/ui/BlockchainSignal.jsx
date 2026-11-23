import React from 'react';

/**
 * Signal visuel permanent d'état d'ancrage sur la Blockchain Polygon Amoy.
 */
export default function BlockchainSignal({ application, showLink = false }) {
  if (!application) return null;

  const cert = application.certificate;
  if (!cert) {
    return (
      <span className="chain-pill" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}>
        ⛓️ Non encore ancré
      </span>
    );
  }

  const isRevoked = application.status === 'REVOQUE' || cert.status === 'REVOKED';
  const blockText = cert.blockNumber ? ` • Bloc #${cert.blockNumber}` : '';
  const txUrl = cert.explorerTxUrl || (cert.txHash ? `https://amoy.polygonscan.com/tx/${cert.txHash}` : '');

  const pill = isRevoked ? (
    <span className="chain-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}>
      ⛓️ Révoqué on-chain{blockText}
    </span>
  ) : application.ministryCoSigned ? (
    <span className="chain-pill" style={{ background: '#e6f4ea', color: '#137333', borderColor: '#bbf7d0' }}>
      ⛓️ Scellé &amp; Co-signé{blockText}
    </span>
  ) : (
    <span className="chain-pill" style={{ background: '#eef6fc', color: '#065a82', borderColor: '#bfdbfe' }}>
      ⛓️ Confirmé Polygon{blockText}
    </span>
  );

  if (!showLink || !txUrl) return pill;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {pill}
      <a
        href={txUrl}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fnpss-blue)', textDecoration: 'underline' }}
      >
        PolygonScan ↗
      </a>
    </span>
  );
}
