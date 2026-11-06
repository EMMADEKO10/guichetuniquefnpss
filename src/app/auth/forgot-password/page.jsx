import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setMessage('');
    setDevToken('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors de la demande.');
      } else {
        setMessage(data.message || 'Si un compte est associé à cette adresse, un lien de réinitialisation a été envoyé.');
        if (data.devToken) {
          setDevToken(data.devToken);
        }
      }
    } catch (err) {
      setErrorMessage('Erreur réseau. Veuillez vérifier votre connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto' }}>
      <Card
        title={
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--fnpss-navy)' }}>Mot de Passe Oublié</h2>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Procédure de récupération sécurisée FNPSS (REQ-03)
            </p>
          </div>
        }
      >
        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
          Saisissez l'adresse email professionnelle rattachée à votre organisation. Un lien à usage unique valable 15 minutes vous sera transmis.
        </p>

        {errorMessage && (
          <div style={{ background: '#fce8e6', borderLeft: '4px solid var(--fnpss-red)', padding: '10px 12px', borderRadius: '4px', marginBottom: '14px', fontSize: '12.5px', color: '#b31412' }} role="alert">
            {errorMessage}
          </div>
        )}

        {message && (
          <div style={{ background: '#e6f4ea', borderLeft: '4px solid var(--fnpss-green)', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px', color: '#0d652d' }} role="status">
            <p style={{ margin: 0, fontWeight: 600 }}>{message}</p>
            {devToken && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #b7e1cd' }}>
                <Badge variant="warning">Mode Dev / Test</Badge>
                <p style={{ fontSize: '11.5px', margin: '4px 0 0', wordBreak: 'break-all' }}>
                  Jeton de simulation : <code>{devToken}</code>
                </p>
                <div style={{ marginTop: '6px' }}>
                  <a
                    href={`/auth/reset-password?token=${devToken}`}
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-blue)' }}
                  >
                    ➡️ Cliquer ici pour simuler l'ouverture du lien de réinitialisation
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reset-email">Adresse Email Enregistrée</label>
            <input
              id="reset-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@ong-exemple.cd"
              required
              autoComplete="email"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full"
            style={{ width: '100%', marginTop: '6px' }}
          >
            Envoyer le Lien de Réinitialisation
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eef2f6', fontSize: '13px' }}>
          <a href="/auth/login" style={{ color: 'var(--fnpss-blue)', fontWeight: 600, textDecoration: 'none' }}>
            ← Retour à la connexion
          </a>
        </div>
      </Card>
    </div>
  );
}
