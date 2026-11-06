import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
          window.location.href = data.user?.role === 'APPLICANT' ? '/dashboard' : '/admin';
        }
      }
    } catch (err) {
      setErrorMessage('Erreur réseau. Si vous êtes hors-ligne, le mode PWA est actif.');
    } finally {
      setIsLoading(false);
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
