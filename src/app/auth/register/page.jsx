import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    organizationName: '',
    legalForm: 'ONG_NATIONALE',
    representativeName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors de la création du compte.');
      } else {
        setSuccessMessage('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
      }
    } catch (err) {
      setErrorMessage('Erreur réseau. Veuillez réessayer ultérieurement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '560px', margin: '30px auto' }}>
      <Card
        title={
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--fnpss-navy)' }}>Création de Compte ONG / ASBL</h2>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Enregistrez votre organisation pour accéder aux démarches dématérialisées
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
            {successMessage}{' '}
            <a href="/auth/login" style={{ color: 'var(--fnpss-green)', fontWeight: 700 }}>
              Aller à la connexion &rarr;
            </a>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="org-name">Dénomination Légale de l'Organisation</label>
            <input
              id="org-name"
              name="organizationName"
              type="text"
              className="form-control"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Ex: Fondation Solidarité Congo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="org-form">Forme Juridique</label>
            <select
              id="org-form"
              name="legalForm"
              className="form-control"
              value={formData.legalForm}
              onChange={handleChange}
            >
              <option value="ONG_NATIONALE">ONG Nationale</option>
              <option value="ONG_INTERNATIONALE">ONG Internationale</option>
              <option value="ASBL">Association Sans But Lucratif (ASBL)</option>
              <option value="FONDATION">Fondation d'Utilité Publique</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rep-name">Nom et Post-nom du Représentant Légal</label>
            <input
              id="rep-name"
              name="representativeName"
              type="text"
              className="form-control"
              value={formData.representativeName}
              onChange={handleChange}
              placeholder="Ex: Dr. Jean-Baptiste Kalala"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="reg-email">Email Professionnel</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@ong.cd"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-phone">Numéro de Téléphone</label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+243 81 000 0000"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="reg-pass">Mot de Passe</label>
              <input
                id="reg-pass"
                name="password"
                type="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 caractères"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-conf">Confirmation</label>
              <input
                id="reg-conf"
                name="confirmPassword"
                type="password"
                className="form-control"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Répétez le mot de passe"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: '10px' }}
          >
            Créer le Compte et Obtenir l'Accès
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #eef2f6', fontSize: '13px' }}>
          Vous possédez déjà un compte ?{' '}
          <a href="/auth/login" style={{ color: 'var(--fnpss-blue)', fontWeight: 700, textDecoration: 'none' }}>
            Se connecter
          </a>
        </div>
      </Card>
    </div>
  );
}

