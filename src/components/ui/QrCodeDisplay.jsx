'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Button from './Button.jsx';
import { useToast } from './ToastProvider.jsx';

/**
 * Générateur visuel de QR Code officiel FNPSS (ISO/IEC 18004) avec téléchargement PNG et copie de lien.
 */
export default function QrCodeDisplay({
  value,
  certificateNumber = '',
  label = 'QR Code Officiel FNPSS',
  size = 180
}) {
  const toast = useToast();
  const [dataUrl, setDataUrl] = useState('');
  const [genError, setGenError] = useState('');

  useEffect(() => {
    let active = true;
    if (!value) {
      setDataUrl('');
      return () => {
        active = false;
      };
    }

    QRCode.toDataURL(String(value), {
      width: size * 2,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0a2540',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (active) {
          setDataUrl(url);
          setGenError('');
        }
      })
      .catch(() => {
        if (active) setGenError('Impossible de générer le QR Code.');
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!value) return null;

  const safeSlug = (certificateNumber || 'FNPSS').replace(/[^a-zA-Z0-9_-]/g, '_');

  const handleDownloadPng = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR-${safeSlug}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(`Image QR-${safeSlug}.png téléchargée.`);
  };

  const handleCopyUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
        toast.info('Lien de vérification QR copié dans le presse-papier.');
      }
    } catch {
      toast.warning('Copie automatique bloquée par le navigateur.');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        padding: '14px',
        borderRadius: '10px',
        background: '#ffffff',
        border: '1px solid var(--border)',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--fnpss-navy)' }}>
        {label}
      </div>

      {certificateNumber && (
        <div className="mono text-muted" style={{ fontSize: '11.5px' }}>
          {certificateNumber}
        </div>
      )}

      {dataUrl ? (
        <div
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: '2px solid var(--fnpss-navy)',
            background: '#ffffff'
          }}
        >
          <img
            src={dataUrl}
            alt={`QR Code officiel ${certificateNumber || 'FNPSS'}`}
            width={size}
            height={size}
            style={{ display: 'block' }}
          />
        </div>
      ) : genError ? (
        <div role="alert" style={{ fontSize: '12px', color: 'var(--fnpss-red)' }}>
          {genError}
        </div>
      ) : (
        <div className="skeleton" style={{ width: `${size}px`, height: `${size}px` }} />
      )}

      <div className="flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button type="button" size="sm" variant="primary" disabled={!dataUrl} onClick={handleDownloadPng}>
          ⬇️ Télécharger PNG
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleCopyUrl}>
          📋 Copier le lien
        </Button>
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-outline"
          style={{ textDecoration: 'none' }}
        >
          🔍 Ouvrir /verifier
        </a>
      </div>
    </div>
  );
}
