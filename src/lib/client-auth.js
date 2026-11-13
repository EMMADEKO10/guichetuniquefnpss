/**
 * Gestion côté navigateur de la session FNPSS : jeton conservé en sessionStorage (onglet),
 * localStorage (autres onglets) et cookie (requêtes directes du navigateur, ex. téléchargement PDF).
 */

export function getClientToken() {
  if (typeof window === 'undefined') return '';
  const fromSession = sessionStorage.getItem('fnpss_session_token');
  if (fromSession) return fromSession;
  const fromLocal = localStorage.getItem('fnpss_session_token');
  if (fromLocal) return fromLocal;
  const match = document.cookie.match(/(?:^|;\s*)fnpss_session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function getClientUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('fnpss_user') || localStorage.getItem('fnpss_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveClientSession(token, user) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('fnpss_session_token', token);
  sessionStorage.setItem('fnpss_user', JSON.stringify(user || {}));
  localStorage.setItem('fnpss_session_token', token);
  localStorage.setItem('fnpss_user', JSON.stringify(user || {}));
}

export function clearClientSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('fnpss_session_token');
  sessionStorage.removeItem('fnpss_user');
  localStorage.removeItem('fnpss_session_token');
  localStorage.removeItem('fnpss_user');
}

