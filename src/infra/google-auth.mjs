/**
 * @fileoverview Vérification serveur des jetons Google Identity Services (REQ-02).
 * Un jeton d'identité (`credential`) est contrôlé auprès de Google (endpoint officiel `tokeninfo`) :
 * audience = notre client OAuth, émetteur Google, email vérifié, jeton non expiré.
 */

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

export function resolveGoogleClientId(env = process.env) {
  const id = String(env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  return /^[0-9A-Za-z_-]+(\.[0-9A-Za-z_-]+)*\.apps\.googleusercontent\.com$/.test(id) && !id.startsWith('your_')
    ? id
    : null;
}

/**
 * La connexion Google « simulée » (email déclaré sans preuve) permet d'usurper n'importe quel compte :
 * elle n'est autorisée qu'en développement/tests, ou si FNPSS_ALLOW_SIMULATED_GOOGLE=true est posé explicitement.
 */
export function isSimulatedGoogleAllowed(env = process.env) {
  return env.NODE_ENV !== 'production' || env.FNPSS_ALLOW_SIMULATED_GOOGLE === 'true';
}

export async function verifyGoogleIdToken(idToken, { env = process.env, fetchImpl = fetch, nowMs = Date.now() } = {}) {
  const clientId = resolveGoogleClientId(env);
  if (!clientId) {
    throw new Error('Connexion Google non configurée sur ce serveur (GOOGLE_OAUTH_CLIENT_ID manquant).');
  }
  const token = String(idToken || '').trim();
  if (!token || token.split('.').length !== 3) {
    throw new Error('Jeton Google invalide.');
  }

  const res = await fetchImpl(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    throw new Error('Jeton Google refusé ou expiré.');
  }
  const info = await res.json();

  if (info.aud !== clientId) {
    throw new Error('Jeton Google destiné à une autre application.');
  }
  if (!GOOGLE_ISSUERS.includes(info.iss)) {
    throw new Error('Émetteur du jeton Google inattendu.');
  }
  if (String(info.email_verified) !== 'true') {
    throw new Error('Adresse Google non vérifiée.');
  }
  if (!info.exp || Number(info.exp) * 1000 < nowMs) {
    throw new Error('Jeton Google expiré.');
  }
  if (!info.email) {
    throw new Error('Le jeton Google ne contient pas d\'adresse email.');
  }

  return {
    email: String(info.email).toLowerCase(),
    givenName: info.given_name || '',
    familyName: info.family_name || '',
    sub: info.sub || null
  };
}

