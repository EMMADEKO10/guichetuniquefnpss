import React, { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!token) {
      setErrorMessage('Jeton de réinitialisation manquant.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Lien invalide ou expiré.');
      } else {
        setSuccessMessage('Votre mot de passe a été réinitialisé avec succès !');
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }, 1500);
      }
    } catch (err) {
      setErrorMessage('Erreur réseau. Impossible de contacter le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto' }}>
      <Card
        title={
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--fnpss-navy)' }}>Nouveau Mot de Passe</h2>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Finalisation de la réinitialisation (REQ-03)
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
            <div style={{ marginTop: '6px', fontSize: '11.5px' }}>Redirection vers la page de connexion...</div>
          </div>
        )}

        <form onSubmit={handleReset}>
          <div className="form-group">
            <label htmlFor="reset-token">Jeton de Réinitialisation</label>
            <input
              id="reset-token"
              type="text"
              className="form-control"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Code hexadécimal reçu par email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reset-new-password">Nouveau Mot de Passe (min. 8 caractères)</label>
            <input
              id="reset-new-password"
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reset-confirm-password">Confirmer le Nouveau Mot de Passe</label>
            <input
              id="reset-confirm-password"
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full"
            style={{ width: '100%', marginTop: '8px' }}
          >
            Enregistrer le Nouveau Mot de Passe
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eef2f6', fontSize: '13px' }}>
          <a href="/auth/login" style={{ color: 'var(--fnpss-blue)', fontWeight: 600, textDecoration: 'none' }}>
            ← Annuler et retourner à la connexion
          </a>
        </div>
      </Card>
    </div>
  );
}
