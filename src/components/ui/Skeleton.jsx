import React from 'react';

export function SkeletonKpiGrid({ count = 4 }) {
  return (
    <div className="kpi-grid" aria-busy="true" aria-label="Chargement des indicateurs">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi-box">
          <div className="skeleton" style={{ height: '12px', width: '55%', marginBottom: '10px' }} />
          <div className="skeleton" style={{ height: '26px', width: '40%', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '10px', width: '70%' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card" aria-busy="true" aria-label="Chargement du contenu">
      <div className="skeleton" style={{ height: '18px', width: '38%', marginBottom: '16px' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '14px', width: `${88 - i * 12}%`, marginBottom: '10px' }} />
      ))}
    </div>
  );
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr aria-busy="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div className="skeleton" style={{ height: '14px', width: '80%' }} />
        </td>
      ))}
    </tr>
  );
}
