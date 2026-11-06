import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
        setErrorMessage(data.error || 'Identifiants invalides. Veuillez réessayer.');
      } else {
        setSuccessMessage('Connexion réussie ! Redirection...');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('fnpss_session_token', data.sessionToken);
          sessionStorage.setItem('fnpss_user', JSON.stringify(data.user || {}));
          window.location.href = data.user?.role === 'APPLICANT' ? '/dashboard' : '/admin';
        }
      }
    } catch (err) {
      setErrorMessage('Erreur réseau. Si vous êtes hors-ligne, le mode PWA est actif.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsGoogleLoading(true);

    try {
      // Simulation Google OAuth 2.0 avec dérivation Web3Auth MPC (REQ-02, BLK-02)
      const mockGoogleEmail = prompt('Entrez votre adresse email Google / Gmail :', 'direction@espoir-kivu.org');
      if (!mockGoogleEmail) {
        setIsGoogleLoading(false);
        return;
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleEmail: mockGoogleEmail,
          givenName: 'Représentant',
          familyName: 'Google OAuth',
          organizationName: 'ONG Partenaire RDC',
          province: 'Nord-Kivu'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors de la connexion Google.');
      } else {
        setSuccessMessage(`Connexion Google réussie ! Portefeuille Web3Auth rattaché : ${data.walletAddress?.slice(0, 10)}...`);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('fnpss_session_token', data.sessionToken);
          sessionStorage.setItem('fnpss_user', JSON.stringify(data.user || {}));
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 800);
        }
      }
    } catch (err) {
      setErrorMessage('Impossible de joindre le service Google OAuth / Web3Auth.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto' }}>
      <Card
        title={
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--fnpss-navy)' }}>Connexion au Guichet Unique</h2>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Espace sécurisé pour les ONG, ASBL et mandataires agréés
            </p>
          </div>
        }
      >
        {errorMessage && (
          <div style={{ background: '#fce8e6', borderLeft: '4px solid var(--fnpss-red)', padding: '10px 12px', borderRadius: '4px', marginBottom: '14px', fontSize: '12.5px', color: '#b31412' }} role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ background: '#e6f4ea', borderLeft: '4px solid var(--fnpss-green)', padding: '10px 12px', borderRadius: '4px', marginBottom: '14px', fontSize: '12.5px', color: '#0d652d' }} role="status">
            {successMessage}
          </div>
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
            <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
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

        <Button
          type="button"
          variant="outline"
          isLoading={isGoogleLoading}
          onClick={handleGoogleLogin}
          style={{ width: '100%', borderColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          Continuer avec Google (OAuth 2.0 & Web3Auth)
        </Button>

        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <Badge variant="info">
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
