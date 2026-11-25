/**
 * Gestion côté navigateur de la session FNPSS : jeton conservé en sessionStorage (onglet),
 * localStorage (autres onglets) et cookie (requêtes directes du navigateur, ex. téléchargement PDF).
 */

export const CLIENT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function decodeBase64UrlJson(segment) {
  if (!segment || typeof segment !== 'string') return null;
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
    let jsonStr = '';
    if (typeof atob === 'function') {
      jsonStr = atob(padded);
    } else if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(padded, 'base64').toString('utf8');
    } else {
      return null;
    }
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function isClientTokenExpired(token, nowMs = Date.now(), ttlMs = CLIENT_SESSION_TTL_MS) {
  if (typeof token !== 'string' || !token.startsWith('fnpss.')) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const parsed = decodeBase64UrlJson(parts[1]);
  if (!parsed || !Number.isFinite(parsed.createdAt)) return false;
  return nowMs - parsed.createdAt > ttlMs;
}

function readRawClientToken() {
  if (typeof window === 'undefined') return '';
  const fromSession = sessionStorage.getItem('fnpss_session_token');
  if (fromSession) return fromSession;
  const fromLocal = localStorage.getItem('fnpss_session_token');
  if (fromLocal) return fromLocal;
  const match = document.cookie.match(/(?:^|;\s*)fnpss_session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function getClientToken() {
  if (typeof window === 'undefined') return '';
  const token = readRawClientToken();
  if (!token) return '';
  if (isClientTokenExpired(token)) {
    clearClientSession();
    return '';
  }
  return token;
}

export function getClientUser() {
  if (typeof window === 'undefined') return null;
  if (!getClientToken()) return null;
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
  window.dispatchEvent(new Event('fnpss-auth-change'));
}

export function clearClientSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('fnpss_session_token');
  sessionStorage.removeItem('fnpss_user');
  localStorage.removeItem('fnpss_session_token');
  localStorage.removeItem('fnpss_user');
  document.cookie = 'fnpss_session_token=; Path=/; Max-Age=0; SameSite=Lax';
  window.dispatchEvent(new Event('fnpss-auth-change'));
}
