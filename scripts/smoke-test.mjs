// Smoke test réel : démarre le serveur Next.js de production (sortie standalone, comme l'image Docker),
// interroge pages et API, puis l'arrête.
// Si un serveur `next dev` tourne en parallèle sur `.next`, utilise un dossier isolé `.next-smoke`
// pour éviter que le watcher de `next dev` n'écrase `pages-manifest.json` / `app-paths-manifest.json`.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3123;
const BASE = `http://127.0.0.1:${PORT}`;

function isManifestIntact(distDir) {
  try {
    const pagesManifest = JSON.parse(fs.readFileSync(path.join(distDir, 'server/pages-manifest.json'), 'utf8'));
    const appManifest = JSON.parse(fs.readFileSync(path.join(distDir, 'server/app-paths-manifest.json'), 'utf8'));
    return (
      fs.existsSync(path.join(distDir, 'standalone/server.js')) &&
      Object.keys(pagesManifest).length >= 2 &&
      Boolean(appManifest['/api/health/route'])
    );
  } catch {
    return false;
  }
}

let distDir = process.env.NEXT_DIST_DIR || '.next';
if (!isManifestIntact(distDir)) {
  distDir = '.next-smoke';
  if (!isManifestIntact(distDir)) {
    console.log(`Construction d'un build isolé dans ${distDir} (évite tout conflit avec next dev)...`);
    fs.rmSync(distDir, { recursive: true, force: true });
    const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
      stdio: 'inherit',
      env: { ...process.env, NEXT_DIST_DIR: distDir }
    });
    if (build.status !== 0) process.exit(build.status || 1);
  }
}

// Comme dans le Dockerfile : les ressources statiques accompagnent le serveur autonome.
fs.cpSync(path.join(distDir, 'static'), path.join(distDir, 'standalone', distDir, 'static'), { recursive: true });

const server = spawn(process.execPath, [path.join(distDir, 'standalone/server.js')], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(PORT), HOSTNAME: '127.0.0.1', FNPSS_ENABLE_DEMO_STAFF: 'true' }
});
let logs = '';
server.stdout.on('data', d => (logs += d));
server.stderr.on('data', d => (logs += d));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

try {
  if (!(await waitReady())) throw new Error('Serveur non démarré :\n' + logs);

  for (const p of ['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/dashboard', '/profile', '/applications/new', '/admin', '/verifier']) {
    const r = await fetch(BASE + p);
    const html = await r.text();
    check(`GET ${p}`, r.status === 200 && html.includes('Guichet Unique'), `HTTP ${r.status}`);
  }

  const h1 = await (await fetch(`${BASE}/api/health`)).json();
  await sleep(1100);
  const h2 = await (await fetch(`${BASE}/api/health`)).json();
  check('Sonde /api/health dynamique', h1.status === 'healthy' && h1.timestamp !== h2.timestamp);

  const json = (method, body, headers = {}) => ({ method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

  const login = await fetch(`${BASE}/api/auth/login`, json('POST', { email: 'contact@espoir-kivu.org', password: 'PasswordRDC#2026' }));
  const loginData = await login.json();
  check('POST /api/auth/login (compte seed)', login.status === 200 && loginData.user?.role === 'REQUERANT', `HTTP ${login.status}, rôle ${loginData.user?.role}`);

  const prof = await fetch(`${BASE}/api/auth/profile`, { headers: { Authorization: `Bearer ${loginData.sessionToken}` } });
  check('GET /api/auth/profile (session entre deux requêtes)', prof.status === 200, `HTTP ${prof.status}`);

  const g = await fetch(`${BASE}/api/auth/google`, json('POST', { googleEmail: 'smoke@gmail.com', givenName: 'A', familyName: 'B' }));
  const gData = await g.json();
  check('POST /api/auth/google (wallet Web3Auth)', g.status === 200 && /^0x[0-9a-f]{40}$/.test(gData.walletAddress || ''), `HTTP ${g.status}`);

  const unauthApps = await fetch(`${BASE}/api/applications`);
  check('GET /api/applications sans jeton (rejet 401)', unauthApps.status === 401, `HTTP ${unauthApps.status}`);

  const apps = await fetch(`${BASE}/api/applications`, { headers: { Authorization: `Bearer ${loginData.sessionToken}` } });
  check('GET /api/applications authentifié', apps.status === 200, `HTTP ${apps.status}`);

  const notifs = await fetch(`${BASE}/api/notifications`, { headers: { Authorization: `Bearer ${loginData.sessionToken}` } });
  check('GET /api/notifications authentifié', notifs.status === 200, `HTTP ${notifs.status}`);

  const news = await fetch(`${BASE}/api/cms/news`);
  check('GET /api/cms/news public', news.status === 200, `HTTP ${news.status}`);

  const v = await fetch(`${BASE}/api/verify?hash=0x${'ab'.repeat(32)}`);
  check('GET /api/verify (hash inconnu)', v.status === 200 || v.status === 404, `HTTP ${v.status}`);

  const headers = (await fetch(BASE + '/')).headers;
  check('En-têtes de sécurité', headers.get('x-frame-options') === 'DENY' && headers.get('x-content-type-options') === 'nosniff' && !headers.get('x-powered-by'));
} catch (err) {
  check('Exécution', false, err.message);
} finally {
  server.kill();
}

for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} vérifications réussies`);
process.exit(failed ? 1 : 0);
