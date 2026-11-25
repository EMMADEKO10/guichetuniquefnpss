'use client';

import React, { useState, useEffect, useRef } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import AlertBanner from '../../../components/ui/AlertBanner.jsx';
import { useToast } from '../../../components/ui/ToastProvider.jsx';
import { saveClientSession } from '../../../lib/client-auth.js';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export default function LoginPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [googleConfig, setGoogleConfig] = useState({ clientId: null, simulated: false, loaded: false });
  const googleButtonRef = useRef(null);

  const finishLogin = (data, redirectTo) => {
    saveClientSession(data.sessionToken, data.user);
    window.location.href = redirectTo || (data.user?.role === 'REQUERANT' ? '/dashboard' : '/admin');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Identifiants invalides. Veuillez réessayer.';
        setErrorMessage(msg);
        toast.error(msg, 'Connexion refusée');
      } else {
        setSuccessMessage('Connexion réussie ! Redirection...');
        toast.success('Connexion réussie au Guichet Unique FNPSS.');
        finishLogin(data);
      }
    } catch (err) {
      setErrorMessage('Erreur réseau. Si vous êtes hors-ligne, le mode PWA est actif.');
    } finally {
      setIsLoading(false);
    }
  };

  const postGoogle = async (payload) => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsGoogleLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors de la connexion Google.');
      } else {
        setSuccessMessage(`Connexion Google réussie ! Portefeuille Web3Auth rattaché : ${data.walletAddress?.slice(0, 10)}...`);
        setTimeout(() => finishLogin(data, '/dashboard'), 600);
      }
    } catch (err) {
      setErrorMessage('Impossible de joindre le service Google OAuth / Web3Auth.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Mode développement uniquement : le serveur n'accepte l'email déclaré que si la simulation est autorisée.
  const handleGoogleLogin = async () => {
    const mockGoogleEmail = prompt('Mode développement — entrez une adresse email Google :', 'direction@espoir-kivu.org');
    if (!mockGoogleEmail) return;
    await postGoogle({
      googleEmail: mockGoogleEmail,
      givenName: 'Représentant',
      familyName: 'Google OAuth',
      organizationName: 'ONG Partenaire RDC',
      province: 'Nord-Kivu'
    });
  };

  // Connexion Google réelle (Google Identity Services) : le jeton est vérifié côté serveur.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/google-config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cancelled) return;
        setGoogleConfig({ clientId: cfg.clientId || null, simulated: Boolean(cfg.simulated), loaded: true });
        if (!cfg.clientId) return;

        const init = () => {
          if (!window.google?.accounts?.id || !googleButtonRef.current) return;
          window.google.accounts.id.initialize({
            client_id: cfg.clientId,
            callback: (response) => postGoogle({ credential: response.credential })
          });
          const containerWidth = googleButtonRef.current.parentElement?.clientWidth || 340;
          const btnWidth = Math.max(220, Math.min(340, Math.floor(containerWidth - 4)));
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            locale: 'fr',
            width: btnWidth
          });
        };

        if (window.google?.accounts?.id) {
          init();
        } else {
          const script = document.createElement('script');
          script.src = GIS_SCRIPT_SRC;
          script.async = true;
          script.defer = true;
          script.onload = init;
          document.head.appendChild(script);
        }
      })
      .catch(() => setGoogleConfig({ clientId: null, simulated: false, loaded: true }));
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="auth-shell">
      <Card
        title={
          <div style={{ textAlign: 'center', width: '100%' }}>
            <img
              src="/brand/logo-fnpss.png"
              alt="Logo officiel FNPSS"
              width={40}
              height={40}
              style={{ objectFit: 'contain', marginBottom: '6px' }}
            />
            <h2 style={{ fontSize: '18px', color: 'var(--fnpss-navy)', margin: 0 }}>Connexion au Guichet Unique</h2>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Espace sécurisé pour les ONG, ASBL et mandataires agréés
            </p>
          </div>
        }
      >
        {errorMessage && (
          <AlertBanner
            variant="error"
            title="Échec d'authentification"
            message={errorMessage}
            onClose={() => setErrorMessage('')}
            style={{ marginBottom: '14px' }}
          />
        )}

        {successMessage && (
          <AlertBanner
            variant="success"
            title="Authentifié"
            message={successMessage}
            style={{ marginBottom: '14px' }}
          />
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="login-email">Adresse Email Professionnelle</label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@ong-exemple.cd"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center" style={{ marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <label htmlFor="login-password" style={{ margin: 0 }}>Mot de Passe</label>
              <a href="/auth/forgot-password" style={{ fontSize: '12px', color: 'var(--fnpss-accent)', textDecoration: 'none' }}>
                Mot de passe oublié ?
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full"
            style={{ width: '100%', marginTop: '8px' }}
          >
            Se Connecter
          </Button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>OU AVEC IDENTITÉ NUMÉRIQUE</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {googleConfig.clientId ? (
          <div style={{ display: 'flex', justifyContent: 'center', minHeight: '44px', overflow: 'hidden' }}>
            <div ref={googleButtonRef} />
          </div>
        ) : googleConfig.loaded && googleConfig.simulated ? (
          <Button
            type="button"
            variant="outline"
            isLoading={isGoogleLoading}
            onClick={handleGoogleLogin}
            style={{ width: '100%', borderColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Continuer avec Google (mode développement simulé)
          </Button>
        ) : googleConfig.loaded ? (
          <p className="text-muted" style={{ fontSize: '12px', textAlign: 'center', margin: 0 }}>
            La connexion Google n'est pas activée sur ce serveur.
          </p>
        ) : null}


        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <Badge variant="info" className="badge-wrap">
            Abstraction Web3Auth : Portefeuille 0x... auto-dérivé sans seed phrase (BLK-02)
          </Badge>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eef2f6', fontSize: '13px' }}>
          Vous n'avez pas encore de compte ?{' '}
          <a href="/auth/register" style={{ color: 'var(--fnpss-blue)', fontWeight: 700, textDecoration: 'none' }}>
            Créer un compte ONG
          </a>
        </div>
      </Card>
    </div>
  );
}
