'use client';

import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import AlertBanner from '../../../components/ui/AlertBanner.jsx';
import { useToast } from '../../../components/ui/ToastProvider.jsx';

export default function ForgotPasswordPage() {
  const toast = useToast();
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
        const msg = data.error || 'Erreur lors de la demande.';
        setErrorMessage(msg);
        toast.error(msg, 'Demande refusée');
      } else {
        const okMsg = data.message || 'Si un compte est associé à cette adresse, un lien de réinitialisation a été envoyé.';
        setMessage(okMsg);
        toast.info('Instruction de réinitialisation générée.');
        if (data.devToken) {
          setDevToken(data.devToken);
        }
      }
    } catch (err) {
      setErrorMessage('Erreur réseau. Veuillez vérifier votre connexion.');
      toast.error('Erreur réseau.', 'Connexion interrompue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <Card
        title={
          <div style={{ textAlign: 'center', width: '100%' }}>
            <img
              src="/brand/logo-fnpss.png"
              alt="Logo officiel FNPSS"
              width={38}
              height={38}
              style={{ objectFit: 'contain', marginBottom: '6px' }}
            />
            <h2 style={{ fontSize: '18px', color: 'var(--fnpss-navy)', margin: 0 }}>Mot de Passe Oublié</h2>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Procédure de récupération sécurisée FNPSS (REQ-03)
            </p>
          </div>
        }
      >
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
          Saisissez l&apos;adresse email professionnelle rattachée à votre organisation. Un lien à usage unique valable 15 minutes vous sera transmis.
        </p>

        {errorMessage && (
          <AlertBanner
            variant="error"
            title="Erreur"
            message={errorMessage}
            onClose={() => setErrorMessage('')}
            style={{ marginBottom: '14px' }}
          />
        )}

        {message && (
          <AlertBanner variant="success" title="Demande enregistrée" message={message} style={{ marginBottom: '16px' }}>
            {devToken && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #b7e1cd' }}>
                <Badge status="warning">Mode Dev / Test</Badge>
                <p style={{ fontSize: '11.5px', margin: '4px 0 0', wordBreak: 'break-all' }}>
                  Jeton de simulation : <code>{devToken}</code>
                </p>
                <div style={{ marginTop: '8px' }}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.sessionStorage.setItem('fnpss_dev_reset_token', devToken);
                        window.location.href = '/auth/reset-password';
                      }
                    }}
                  >
                    ➡️ Ouvrir la page de réinitialisation
                  </Button>
                </div>
              </div>
            )}
          </AlertBanner>
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

