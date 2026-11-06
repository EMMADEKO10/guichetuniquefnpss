'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';

export default function DashboardPage() {
  const [applications, setApplications] = useState([]);
  const [selectedService, setSelectedService] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [activeModalApp, setActiveModalApp] = useState(null);
  const [editFormData, setEditFormData] = useState({ projectTitle: '', goodsSummary: '' });
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Erreur chargement demandes', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApps = applications.filter((app) => {
    if (selectedService !== 'ALL' && app.serviceCode !== selectedService) return false;
    if (selectedStatus !== 'ALL' && app.status !== selectedStatus) return false;
    return true;
  });

  const kpis = {
    total: applications.length,
    valides: applications.filter((a) => a.status === 'VALIDE_DELIVRE').length,
    instruction: applications.filter((a) => a.status === 'EN_COURS_INSTRUCTION' || a.status === 'SOUMIS').length,
    complements: applications.filter((a) => a.status === 'COMPLEMENT_REQUIS').length
  };

  const handleOpenEdit = (app) => {
    setActiveModalApp(app);
    setEditFormData({
      projectTitle: app.projectTitle || '',
      goodsSummary: app.goodsSummary || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!activeModalApp) return;

    try {
      const res = await fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceNumber: activeModalApp.referenceNumber,
          ...editFormData
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(`Dossier ${activeModalApp.referenceNumber} modifié avec succès.`);
        setActiveModalApp(null);
        fetchApplications();
      } else {
        alert(data.error || 'Erreur lors de la modification');
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const handleWithdraw = async (app) => {
    if (!confirm(`Confirmez-vous le retrait volontaire du dossier ${app.referenceNumber} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const res = await fetch('/api/applications/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceNumber: app.referenceNumber })
      });
      if (res.ok) {
        setFeedbackMsg(`Dossier ${app.referenceNumber} retiré.`);
        fetchApplications();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors du retrait');
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Tableau de Bord Requérant</h2>
          <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
            Suivi en temps réel de vos dossiers et téléchargement des attestations scellées
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/profile" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            👤 Mon Profil ONG
          </a>
          <a href="/applications/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            ➕ Déposer une Nouvelle Demande
          </a>
        </div>
      </div>

      {feedbackMsg && (
        <div style={{ background: '#e6f4ea', borderLeft: '4px solid var(--fnpss-green)', padding: '10px 14px', borderRadius: '4px', marginBottom: '18px', color: '#0d652d', fontSize: '13px' }}>
          {feedbackMsg}
        </div>
      )}

      {/* Grille des KPI */}
      <div className="kpi-grid">
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-blue)' }}>
          <div className="lbl">Dossiers Déposés</div>
          <div className="val">{kpis.total}</div>
          <div className="sub">Toutes démarches confondues</div>
        </div>
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-green)' }}>
          <div className="lbl">Attestations Délivrées</div>
          <div className="val">{kpis.valides}</div>
          <div className="sub">Scellées sur Blockchain Polygon</div>
        </div>
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-gold)' }}>
          <div className="lbl">En Cours d'Instruction</div>
          <div className="val">{kpis.instruction}</div>
          <div className="sub">Instruction FNPSS &bull; SLA 10j</div>
        </div>
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-red)' }}>
          <div className="lbl">Compléments Requis</div>
          <div className="val">{kpis.complements}</div>
          <div className="sub">Action usager requise</div>
        </div>
      </div>

      {/* Liste des Demandes */}
      <Card
        title="Mes Demandes au FNPSS (REQ-05)"
        actions={
          <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="ALL">Tous les Services</option>
              <option value="S1">S1 &bull; Enrôlement</option>
              <option value="S2">S2 &bull; Partenariat</option>
              <option value="S3">S3 &bull; Avis Technique</option>
              <option value="S4">S4 &bull; Exonération Douanière</option>
              <option value="S5">S5 &bull; Philanthropie</option>
              <option value="S6">S6 &bull; Arrêté Ministériel</option>
            </select>

            <select
              className="form-control"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="SOUMIS">Soumis</option>
              <option value="EN_COURS_INSTRUCTION">En instruction</option>
              <option value="VALIDE_DELIVRE">Validé & Délivré</option>
              <option value="REVOQUE">Révoqué</option>
            </select>
          </div>
        }
      >
        {isLoading ? (
          <p className="text-muted text-center" style={{ padding: '30px' }}>Chargement des dossiers...</p>
        ) : filteredApps.length === 0 ? (
          <div className="text-center" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📂</div>
            <h4>Aucun dossier trouvé pour ces critères</h4>
            <p className="text-muted" style={{ fontSize: '13px' }}>
              Commencez par initier une démarche auprès du Guichet Unique.
            </p>
            <a href="/applications/new" className="btn btn-accent btn-sm" style={{ marginTop: '10px', textDecoration: 'none' }}>
              Initier une demande
            </a>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Service</th>
                  <th>Objet du Projet</th>
                  <th>Date Dépôt</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr key={app.referenceNumber}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--fnpss-navy)' }}>
                      {app.referenceNumber}
                    </td>
                    <td>
                      <Badge status="soumis">{app.serviceCode}</Badge>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{app.projectTitle || 'Non renseigné'}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{app.goodsSummary || ''}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString('fr-FR') : 'Aujourd\'hui'}
                    </td>
                    <td>
                      <Badge
                        status={
                          app.status === 'VALIDE_DELIVRE'
                            ? 'valide'
                            : app.status === 'REVOQUE'
                            ? 'revoque'
                            : app.status === 'COMPLEMENT_REQUIS'
                            ? 'danger'
                            : 'instruction'
                        }
                      >
                        {app.status === 'VALIDE_DELIVRE'
                          ? '✓ Délivré'
                          : app.status === 'REVOQUE'
                          ? '✕ Révoqué'
                          : app.status === 'SOUMIS'
                          ? 'En attente'
                          : 'En instruction'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {app.status === 'SOUMIS' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(app)}
                              className="btn btn-sm btn-outline"
                              title="Modifier avant instruction (REQ-08)"
                            >
                              ✏️ Éditer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWithdraw(app)}
                              className="btn btn-sm btn-danger"
                              title="Retirer la demande (REQ-08)"
                            >
                              🗑️ Retirer
                            </button>
                          </>
                        )}
                        {app.certificate && (
                          <a
                            href={`/api/applications/certificate.pdf?ref=${app.referenceNumber}`}
                            className="btn btn-sm btn-success"
                            style={{ textDecoration: 'none' }}
                            target="_blank"
                            rel="noreferrer"
                          >
                            📥 PDF Scellé
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modale d'édition avant instruction (REQ-08) */}
      <Modal
        isOpen={Boolean(activeModalApp)}
        onClose={() => setActiveModalApp(null)}
        title={`Modifier le Dossier : ${activeModalApp?.referenceNumber || ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setActiveModalApp(null)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              Enregistrer les Modifications
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label htmlFor="edit-title">Intitulé du Projet</label>
            <input
              id="edit-title"
              type="text"
              className="form-control"
              value={editFormData.projectTitle}
              onChange={(e) => setEditFormData({ ...editFormData, projectTitle: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-goods">Descriptif Sommaire des Biens / Colisage</label>
            <textarea
              id="edit-goods"
              rows="3"
              className="form-control"
              value={editFormData.goodsSummary}
              onChange={(e) => setEditFormData({ ...editFormData, goodsSummary: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
