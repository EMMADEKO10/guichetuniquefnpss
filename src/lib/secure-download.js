'use client';

function parseFileNameFromDisposition(disposition) {
  if (!disposition) return '';
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, '').trim());
    } catch {
      return utf8Match[1].replace(/["']/g, '').trim();
    }
  }
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match && match[1] ? match[1].trim() : '';
}

/**
 * Télécharge ou ouvre un document authentifié via l'en-tête Authorization: Bearer
 * afin de ne jamais exposer de jeton de session (?token=) dans l'URL ni l'historique navigateur.
 */
export async function downloadAuthenticatedFile(
  url,
  token,
  { fallbackFileName = 'document.pdf', openInNewTab = false } = {}
) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers, cache: 'no-store' });

  if (!res.ok) {
    let errorMessage = `Erreur HTTP ${res.status} lors du téléchargement.`;
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data?.error) errorMessage = data.error;
      } else {
        const text = await res.text();
        if (text && text.length < 240) errorMessage = text;
      }
    } catch {
      // Conserver le message par défaut
    }
    throw new Error(errorMessage);
  }

  const blob = await res.blob();
  const fileName =
    parseFileNameFromDisposition(res.headers.get('content-disposition')) || fallbackFileName;

  const objectUrl = URL.createObjectURL(blob);
  try {
    if (openInNewTab) {
      const win = window.open(objectUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        link.rel = 'noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } else {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }

  return fileName;
}
