import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const PROVINCES_RDC = [
  'Kinshasa', 'Nord-Kivu', 'Sud-Kivu', 'Haut-Katanga', 'Ituri', 'Kasaï-Central',
  'Kasaï-Oriental', 'Kongo-Central', 'Maniema', 'Tshopo', 'Équateur', 'Lualaba'
];

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    organizationName: '',
    province: 'Kinshasa',
    enrollmentNumber: '',
    email: '',
    walletAddress: '',
    role: 'APPLICANT'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [copiedWallet, setCopiedWallet] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('fnpss_session_token') : null;
      if (!token) {
        // Redirection vers login si non connecté
        window.location.href = '/auth/login';
        return;
      }

      const res = await fetch(`/api/auth/profile?token=${token}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Session expirée');
      }

      const data = await res.json();
      if (data.user) {
        setProfile({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          organizationName: data.user.organizationName || '',
          province: data.user.province || 'Kinshasa',
          enrollmentNumber: data.user.enrollmentNumber || '',
          email: data.user.email || '',
          walletAddress: data.user.walletAddress || '',
          role: data.user.role || 'APPLICANT'
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Impossible de charger le profil. Veuillez vous reconnecter.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('fnpss_session_token') : null;
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          organizationName: profile.organizationName,
          province: profile.province,
          enrollmentNumber: profile.enrollmentNumber
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error || 'Erreur lors de la mise à jour.' });
      } else {
        setStatusMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erreur réseau lors de l\'enregistrement.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('fnpss_session_token') : null;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: token })
        });
      }
    } catch (err) {
      console.warn('Erreur déconnexion réseau');
    } finally {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fnpss_session_token');
        sessionStorage.removeItem('fnpss_user');
        window.location.href = '/auth/login';
      }
    }
  };

  const handleCopyWallet = () => {
    if (profile.walletAddress && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(profile.walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p>Chargement du profil de l'organisation...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '30px auto', padding: '0 16px' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: 'var(--fnpss-navy)', margin: 0 }}>
            Profil de l'Organisation & Mandataire
          </h1>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '13.5px' }}>
            Gestion de vos informations institutionnelles et de votre identité décentralisée (REQ-04, BLK-03)
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} isLoading={isLoggingOut} style={{ color: 'var(--fnpss-red)', borderColor: '#fca5a5' }}>
          Se Déconnecter
        </Button>
      </div>

      {statusMessage.text && (
        <div
          style={{
            background: statusMessage.type === 'error' ? '#fce8e6' : '#e6f4ea',
            borderLeft: `4px solid ${statusMessage.type === 'error' ? 'var(--fnpss-red)' : 'var(--fnpss-green)'}`,
            padding: '12px 14px',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '13px',
            color: statusMessage.type === 'error' ? '#b31412' : '#0d652d'
          }}
          role={statusMessage.type === 'error' ? 'alert' : 'status'}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Carte Portefeuille Web3Auth Abstraction (BLK-02, BLK-03) */}
      <Card style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #0a2540 0%, #065a82 100%)', color: '#fff' }}>
        <div className="flex justify-between items-start" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="flex items-center" style={{ gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>🔐</span>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
                Portefeuille Numérique FNPSS (Web3Auth MPC)
              </h3>
              <Badge variant="warning">Non-Custodial</Badge>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1', maxWidth: '520px', lineHeight: 1.4 }}>
              Ce portefeuille certifie vos signatures cryptographiques sur le registre souverain Polygon Amoy sans que vous ayez à retenir une clé privée.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyWallet}
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', fontSize: '12px' }}
          >
            {copiedWallet ? '✓ Adresse Copiée !' : 'Copier l\'adresse'}
          </Button>
        </div>

        <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.5px', wordBreak: 'break-all' }}>
          {profile.walletAddress || '0x0000000000000000000000000000000000000000'}
        </div>
      </Card>

      {/* Formulaire des Informations Institutionnelles */}
      <Card title="Informations Institutionnelles et Mandataire Légal">
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label htmlFor="prof-org">Dénomination Officielle de l'Organisation / ONG</label>
            <input
              id="prof-org"
              type="text"
              className="form-control"
              value={profile.organizationName}
              onChange={(e) => setProfile({ ...profile, organizationName: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="prof-firstname">Prénom du Mandataire Légal</label>
              <input
                id="prof-firstname"
                type="text"
                className="form-control"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="prof-lastname">Nom & Post-Nom</label>
              <input
                id="prof-lastname"
                type="text"
                className="form-control"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="prof-email">Adresse Email Officielle (Non Modifiable)</label>
              <input
                id="prof-email"
                type="email"
                className="form-control"
                value={profile.email}
                disabled
                style={{ background: '#f8fafc', color: '#64748b' }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="prof-province">Province du Siège Opérationnel</label>
              <select
                id="prof-province"
                className="form-control"
                value={profile.province}
                onChange={(e) => setProfile({ ...profile, province: e.target.value })}
              >
                {PROVINCES_RDC.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prof-matricule">
              Numéro de Matricule FNPSS / Enrôlement National (Facultatif au dépôt initial)
            </label>
            <input
              id="prof-matricule"
              type="text"
              className="form-control"
              value={profile.enrollmentNumber || ''}
              onChange={(e) => setProfile({ ...profile, enrollmentNumber: e.target.value })}
              placeholder="Ex : FNPSS-ONG-2026-NK-0442"
            />
          </div>

          <div className="flex justify-between items-center" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <a href="/dashboard" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
              ← Retour au Tableau de Bord
            </a>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Enregistrer les Modifications
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
