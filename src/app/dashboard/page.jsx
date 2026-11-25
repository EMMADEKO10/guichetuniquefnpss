'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DossierThread from '../../components/DossierThread.jsx';
import AlertBanner from '../../components/ui/AlertBanner.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import StatusStepper from '../../components/ui/StatusStepper.jsx';
import SlaIndicator from '../../components/ui/SlaIndicator.jsx';
import BlockchainSignal from '../../components/ui/BlockchainSignal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonKpiGrid, SkeletonCard } from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { getClientToken } from '../../lib/client-auth.js';
import { downloadAuthenticatedFile } from '../../lib/secure-download.js';
import QrCodeDisplay from '../../components/ui/QrCodeDisplay.jsx';
import AppIcon from '../../components/ui/AppIcon.jsx';

const COMPLEMENT_DOC_OPTIONS = [
  { code: 'P1_REQUETE', label: 'P1 — Requête motivée' },
  { code: 'P2_ENROLEMENT', label: 'P2 — Attestation d\'enrôlement' },
  { code: 'P3_PLAN_ACTION', label: 'P3 — Plan d\'action' },
  { code: 'P4_RAPPORT', label: 'P4 — Rapport annuel certifié' },
  { code: 'P5_PROJET', label: 'P5 — Descriptif du projet / liste des biens' },
  { code: 'P6_QUITTANCE', label: 'P6 — Bordereau / quittance bancaire' }
];

function getNextStepText(app) {
  if (app.status === 'REVOQUE') return 'Attestation révoquée par la Direction Générale — vérifiez le motif.';
  if (app.status === 'REJETE') return `Demande rejetée : ${app.rejectionReason || 'consultez le détail'}.`;
  if (app.status === 'COMPLEMENT_REQUIS') return 'Action requise : déposez la pièce justificative demandée pour relancer le SLA.';
  if (app.status === 'VALIDE_DELIVRE') {
    return app.ministryCoSigned
      ? 'Acte délivré, scellé sur Polygon et co-signé par le Ministère.'
      : 'Attestation délivrée et scellée sur Polygon — téléchargeable en PDF.';
  }
  if (!app.paymentValidated) return 'En attente de contrôle de votre quittance bancaire par un agent FNPSS.';
  if (!app.divisionOpinion) return 'En cours d\'examen technique par la Division compétente du FNPSS.';
  return 'Avis technique émis — en attente de signature finale et scellement par la Direction Générale.';
}

export default function DashboardPage() {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedService, setSelectedService] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [isLoading, setIsLoading] = useState(true);
  const [authExpired, setAuthExpired] = useState(false);
  const [activeModalApp, setActiveModalApp] = useState(null);
  const [editFormData, setEditFormData] = useState({ projectTitle: '', goodsSummary: '' });
  const [editError, setEditError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);
  const [sessionToken, setSessionToken] = useState('');
  const [threadApp, setThreadApp] = useState(null);
  const [qrModalApp, setQrModalApp] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [complementApp, setComplementApp] = useState(null);
  const [complementDocCode, setComplementDocCode] = useState('P1_REQUETE');
  const [complementFile, setComplementFile] = useState(null);
  const [complementBusy, setComplementBusy] = useState(false);
  const [complementError, setComplementError] = useState('');

  const notify = (type, message, title = '') => {
    setAlertInfo({ type, message, title });
  };

  const getToken = () => getClientToken();

  const authHeaders = useCallback((extra = {}) => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}`, ...extra } : { ...extra };
  }, []);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const t = getToken();
      setSessionToken(t);
      if (!t) {
        setApplications([]);
        setIsLoading(false);
        return;
      }
      const res = await fetch('/api/applications', { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 401) {
        setAuthExpired(true);
        setApplications([]);
        return;
      }
      setAuthExpired(false);
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
      const nRes = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${t}` } });
      if (nRes.ok) {
        const nData = await nRes.json();
        setNotifications(nData.notifications || []);
        setUnreadCount(nData.unreadCount || 0);
      }
    } catch (err) {
      console.error('Erreur chargement demandes', err);
      toast.error('Impossible de charger vos dossiers pour le moment.', 'Connexion instable');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ notificationId, read: true })
      });
      if (res.ok) {
        window.dispatchEvent(new Event('fnpss-notif-refresh'));
        fetchApplications();
      }
    } catch (err) {
      console.error('Erreur notification', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ markAllRead: true })
      });
      if (res.ok) {
        toast.success('Toutes vos notifications ont été marquées comme lues.');
        window.dispatchEvent(new Event('fnpss-notif-refresh'));
        fetchApplications();
      }
    } catch {
      toast.error('Erreur lors de la mise à jour des notifications.');
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

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

  const firstComplementApp = applications.find((a) => a.status === 'COMPLEMENT_REQUIS');

  const handleOpenEdit = (app) => {
    setActiveModalApp(app);
    setEditError('');
    setIsSubmitting(false);
    setEditFormData({
      projectTitle: app.projectTitle || '',
      goodsSummary: app.goodsSummary || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!activeModalApp) return;
    setIsSubmitting(true);
    setEditError('');

    try {
      const res = await fetch('/api/applications', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          referenceNumber: activeModalApp.referenceNumber,
          ...editFormData
        })
      });
      const data = await res.json();
      if (res.ok) {
        const msg = `Dossier ${activeModalApp.referenceNumber} modifié avec succès.`;
        notify('success', msg, 'Dossier Mis à Jour');
        toast.success(msg, 'Dossier Mis à Jour');
        setActiveModalApp(null);
        fetchApplications();
      } else {
        const msg = data.error || 'Erreur lors de la modification';
        setEditError(msg);
        notify('error', msg, 'Modification Refusée');
      }
    } catch {
      setEditError('Erreur de communication réseau.');
      toast.error('Impossible de contacter le serveur.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = (app) => {
    setWithdrawTarget(app);
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/applications/withdraw', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ referenceNumber: withdrawTarget.referenceNumber })
      });
      if (res.ok) {
        const msg = `Dossier ${withdrawTarget.referenceNumber} retiré avec succès.`;
        notify('warning', msg, 'Dossier Retiré (REQ-08)');
        toast.warning(msg, 'Dossier Retiré');
        setWithdrawTarget(null);
        fetchApplications();
      } else {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.error || 'Erreur lors du retrait du dossier.';
        notify('error', errMsg, 'Retrait Refusé');
        toast.error(errMsg, 'Retrait Refusé');
      }
    } catch {
      toast.error('Impossible de joindre le serveur pour le retrait.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',').pop());
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
      reader.readAsDataURL(file);
    });

  const handleProvideComplement = async () => {
    if (!complementApp) return;
    setComplementError('');
    if (complementFile && !complementFile.name.toLowerCase().endsWith('.pdf')) {
      setComplementError('Seuls les fichiers PDF sont autorisés.');
      return;
    }
    if (complementFile && complementFile.size > 3 * 1024 * 1024) {
      setComplementError('Le fichier dépasse 3 Mo.');
      return;
    }
    setComplementBusy(true);
    try {
      const payload = { referenceNumber: complementApp.referenceNumber, docCode: complementDocCode };

      if (complementFile) {
        const buf = await complementFile.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        const sha256Hash = '0x' + Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        const up = await fetch('/api/applications/document', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            docCode: complementDocCode,
            fileName: complementFile.name,
            fileBase64: await fileToBase64(complementFile)
          })
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          setComplementError(upData.error || 'Stockage de la pièce refusé.');
          return;
        }
        Object.assign(payload, {
          fileName: complementFile.name,
          sizeBytes: complementFile.size,
          sha256Hash: upData.sha256Hash || sha256Hash,
          ...(upData.stored ? { storageKey: upData.storageKey, cloudinaryUrl: upData.cloudinaryUrl } : {})
        });
      }

      const res = await fetch('/api/applications/provide-complement', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setComplementError(data.error || 'Complément non enregistré.');
        return;
      }
      const okMsg = `Complément déposé sur le dossier ${complementApp.referenceNumber} : l'instruction reprend.`;
      notify('success', okMsg, 'Complément Enregistré (SC-02)');
      toast.success(okMsg, 'Complément Enregistré');
      window.dispatchEvent(new Event('fnpss-notif-refresh'));
      setComplementApp(null);
      setComplementFile(null);
      fetchApplications();
    } catch {
      setComplementError('Erreur réseau : complément non enregistré.');
    } finally {
      setComplementBusy(false);
    }
  };

  const renderStatusBadge = (app) => (
    <Badge
      status={
        app.status === 'VALIDE_DELIVRE'
          ? 'valide'
          : app.status === 'REVOQUE'
          ? 'revoque'
          : app.status === 'COMPLEMENT_REQUIS'
          ? 'danger'
          : app.status === 'REJETE'
          ? 'danger'
          : 'instruction'
      }
    >
      {app.status === 'VALIDE_DELIVRE'
        ? 'Délivré'
        : app.status === 'REVOQUE'
        ? 'Révoqué'
        : app.status === 'REJETE'
        ? 'Rejeté'
        : app.status === 'COMPLEMENT_REQUIS'
        ? 'Complément requis'
        : app.status === 'SOUMIS'
        ? 'En attente'
        : 'En instruction'}
    </Badge>
  );

  return (
    <div>
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Tableau de Bord Requérant</h2>
          <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
            Suivi en temps réel de vos dossiers, échéances SLA et téléchargement des attestations scellées
          </p>
        </div>
        <div className="filter-controls-row">
          <a href="/profile" className="btn btn-outline full-width-xs" style={{ textDecoration: 'none' }}>
            <AppIcon name="user" size="sm" />
            <span>Mon Profil ONG</span>
          </a>
          <a href="/applications/new" className="btn btn-brand full-width-xs" style={{ textDecoration: 'none' }}>
            <AppIcon name="add" size="sm" />
            <span>Déposer une Nouvelle Demande</span>
          </a>
        </div>
      </div>

      {alertInfo && (
        <AlertBanner
          variant={alertInfo.type}
          title={alertInfo.title}
          message={alertInfo.message}
          onClose={() => setAlertInfo(null)}
          style={{ marginBottom: '18px' }}
        />
      )}

      {(authExpired || (typeof window !== 'undefined' && !getToken())) && (
        <AlertBanner
          variant="warning"
          title={authExpired ? 'Session expirée' : 'Session non identifiée'}
          message={
            authExpired
              ? 'Votre session a expiré par mesure de sécurité. Veuillez vous reconnecter pour accéder à vos dossiers.'
              : 'Vous consultez actuellement l\'interface sans session active. Connectez-vous avec votre compte ONG pour suivre vos dossiers.'
          }
          action={
            <a href="/auth/login" className="btn btn-sm btn-brand" style={{ textDecoration: 'none' }}>
              <AppIcon name="security" size="sm" />
              <span>Se connecter</span>
            </a>
          }
          style={{ marginBottom: '18px' }}
        />
      )}

      {firstComplementApp && (
        <AlertBanner
          variant="warning"
          title={`Action requise : ${kpis.complements} dossier${kpis.complements > 1 ? 's' : ''} en attente de complément`}
          message={`Le dossier ${firstComplementApp.referenceNumber} attend une pièce complémentaire (${firstComplementApp.complementReason || 'consultez le motif'}). Le délai SLA est suspendu jusqu'au dépôt.`}
          action={
            <Button
              size="sm"
              variant="brand"
              onClick={() => {
                setComplementApp(firstComplementApp);
                setComplementError('');
                setComplementFile(null);
              }}
            >
              <AppIcon name="upload" size="sm" />
              <span>Fournir le complément maintenant</span>
            </Button>
          }
          style={{ marginBottom: '18px' }}
        />
      )}

      {/* Grille des KPI */}
      {isLoading ? (
        <SkeletonKpiGrid count={4} />
      ) : (
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
            <div className="lbl">En Cours d&apos;Instruction</div>
            <div className="val">{kpis.instruction}</div>
            <div className="sub">Instruction FNPSS &bull; SLA 10j</div>
          </div>
          <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-orange)' }}>
            <div className="lbl">Compléments Requis</div>
            <div className="val">{kpis.complements}</div>
            <div className="sub">Action usager requise</div>
          </div>
        </div>
      )}

      {/* Liste des Demandes */}
      <Card
        title="Mes Demandes au FNPSS (REQ-05)"
        actions={
          <div className="filter-controls-row">
            <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '5px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: viewMode === 'cards' ? 'var(--fnpss-navy)' : '#ffffff',
                  color: viewMode === 'cards' ? '#ffffff' : 'var(--text-main)'
                }}
              >
                <AppIcon name="cards" size="xs" />
                <span>Cartes</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '5px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: viewMode === 'table' ? 'var(--fnpss-navy)' : '#ffffff',
                  color: viewMode === 'table' ? '#ffffff' : 'var(--text-main)'
                }}
              >
                <AppIcon name="table" size="xs" />
                <span>Tableau</span>
              </button>
            </div>
            <select
              className="form-control"
              aria-label="Filtrer par service"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="ALL">Tous les Services</option>
              <option value="S1">S1 — Enrôlement ONG</option>
              <option value="S2">S2 — Partenariat</option>
              <option value="S3">S3 — Avis Technique</option>
              <option value="S4">S4 — Exonération Douanière</option>
              <option value="S5">S5 — Philanthropie</option>
              <option value="S6">S6 — Arrêté Ministériel</option>
            </select>
            <select
              className="form-control"
              aria-label="Filtrer par statut"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="SOUMIS">En attente</option>
              <option value="EN_COURS_INSTRUCTION">En instruction</option>
              <option value="COMPLEMENT_REQUIS">Complément requis</option>
              <option value="VALIDE_DELIVRE">Validé &amp; Délivré</option>
              <option value="REJETE">Rejeté</option>
              <option value="REVOQUE">Révoqué</option>
            </select>
          </div>
        }
      >
        {isLoading ? (
          <SkeletonCard rows={4} />
        ) : filteredApps.length === 0 ? (
          <EmptyState
            icon="folder"
            title="Aucun dossier trouvé pour ces critères"
            description="Commencez par initier une démarche dématérialisée auprès du Guichet Unique FNPSS."
            action={
              <a href="/applications/new" className="btn btn-brand btn-sm" style={{ textDecoration: 'none' }}>
                <AppIcon name="add" size="sm" />
                <span>Initier une demande</span>
              </a>
            }
          />
        ) : viewMode === 'cards' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredApps.map((app) => (
              <div
                key={app.referenceNumber}
                style={{
                  border: `1px solid ${app.status === 'COMPLEMENT_REQUIS' ? '#fca5a5' : 'var(--border)'}`,
                  borderLeft: `4px solid ${
                    app.status === 'VALIDE_DELIVRE'
                      ? 'var(--fnpss-green)'
                      : app.status === 'COMPLEMENT_REQUIS' || app.status === 'REJETE'
                      ? 'var(--fnpss-red)'
                      : 'var(--fnpss-blue)'
                  }`,
                  borderRadius: '10px',
                  padding: '16px',
                  background: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="mono" style={{ fontWeight: 800, color: 'var(--fnpss-navy)', fontSize: '14px', wordBreak: 'break-word' }}>
                        {app.referenceNumber}
                      </span>
                      <Badge status="soumis">{app.serviceCode}</Badge>
                      {renderStatusBadge(app)}
                    </div>
                    <h4 style={{ margin: '6px 0 2px', fontSize: '15px', color: 'var(--fnpss-navy)', wordBreak: 'break-word' }}>
                      {app.projectTitle || 'Projet sans intitulé'}
                    </h4>
                    {app.goodsSummary && (
                      <div className="text-muted" style={{ fontSize: '12px', wordBreak: 'break-word' }}>{app.goodsSummary}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <SlaIndicator application={app} />
                    <BlockchainSignal application={app} showLink />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #eef2f6', marginBottom: '12px' }}>
                  <StatusStepper application={app} compact />
                  <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '8px' }}>
                    <strong>Prochaine étape :</strong> {getNextStepText(app)}
                  </div>
                  {app.status === 'COMPLEMENT_REQUIS' && app.complementReason && (
                    <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <AppIcon name="complement" size="xs" />
                      <span>Motif instructeur : {app.complementReason}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-between items-center" style={{ flexWrap: 'wrap' }}>
                  <span className="text-muted" style={{ fontSize: '11.5px' }}>
                    Déposé le {app.createdAt ? new Date(app.createdAt).toLocaleDateString('fr-FR') : 'Aujourd\'hui'}
                  </span>
                  <div className="card-action-bar">
                    {app.status === 'SOUMIS' && (
                      <>
                        <button type="button" onClick={() => handleOpenEdit(app)} className="btn btn-sm btn-outline">
                          <AppIcon name="edit" size="xs" />
                          <span>Éditer</span>
                        </button>
                        <button type="button" onClick={() => handleWithdraw(app)} className="btn btn-sm btn-danger">
                          <AppIcon name="delete" size="xs" />
                          <span>Retirer</span>
                        </button>
                      </>
                    )}
                    {app.status === 'COMPLEMENT_REQUIS' && (
                      <button
                        type="button"
                        onClick={() => {
                          setComplementApp(app);
                          setComplementError('');
                          setComplementFile(null);
                        }}
                        className="btn btn-sm btn-brand"
                      >
                        <AppIcon name="upload" size="xs" />
                        <span>Fournir Complément</span>
                      </button>
                    )}
                    <button type="button" onClick={() => setThreadApp(app)} className="btn btn-sm btn-outline">
                      <AppIcon name="chat" size="xs" />
                      <span>Échanges</span>
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await downloadAuthenticatedFile(
                            `/api/applications/receipt.pdf?ref=${encodeURIComponent(app.referenceNumber)}`,
                            sessionToken,
                            { fallbackFileName: `Accuse-${app.referenceNumber}.pdf` }
                          );
                          toast.success('Accusé de réception PDF téléchargé.');
                        } catch (err) {
                          toast.error(err.message || 'Téléchargement impossible.', 'Accusé indisponible');
                        }
                      }}
                    >
                      <AppIcon name="receipt" size="xs" />
                      <span>Accusé PDF</span>
                    </Button>
                    {app.certificate && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="success"
                          onClick={async () => {
                            try {
                              await downloadAuthenticatedFile(
                                `/api/applications/certificate.pdf?ref=${encodeURIComponent(app.referenceNumber)}`,
                                sessionToken,
                                { fallbackFileName: `${app.referenceNumber}.pdf` }
                              );
                              toast.success('Attestation PDF officielle téléchargée.');
                            } catch (err) {
                              toast.error(err.message || 'Téléchargement impossible.', 'PDF indisponible');
                            }
                          }}
                        >
                          <AppIcon name="pdfFile" size="xs" />
                          <span>PDF Scellé</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setQrModalApp(app)}
                        >
                          <AppIcon name="qr" size="xs" />
                          <span>QR Code</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Service</th>
                  <th>Objet du Projet</th>
                  <th>Délai SLA &amp; Blockchain</th>
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
                      {app.status === 'COMPLEMENT_REQUIS' && app.complementReason && (
                        <div style={{ color: '#b91c1c', fontSize: '11.5px', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AppIcon name="complement" size="xs" />
                          <span>Motif instructeur : {app.complementReason}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <SlaIndicator application={app} />
                        <BlockchainSignal application={app} />
                      </div>
                    </td>
                    <td>{renderStatusBadge(app)}</td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {app.status === 'SOUMIS' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(app)}
                              className="btn btn-sm btn-outline"
                              title="Modifier avant instruction (REQ-08)"
                            >
                              <AppIcon name="edit" size="xs" />
                              <span>Éditer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWithdraw(app)}
                              className="btn btn-sm btn-danger"
                              title="Retirer la demande (REQ-08)"
                            >
                              <AppIcon name="delete" size="xs" />
                              <span>Retirer</span>
                            </button>
                          </>
                        )}
                        {app.status === 'COMPLEMENT_REQUIS' && (
                          <button
                            type="button"
                            onClick={() => {
                              setComplementApp(app);
                              setComplementError('');
                              setComplementFile(null);
                            }}
                            className="btn btn-sm btn-brand"
                            title="Joindre la pièce complémentaire demandée (SC-02)"
                          >
                            <AppIcon name="upload" size="xs" />
                            <span>Fournir Complément</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setThreadApp(app)}
                          className="btn btn-sm btn-outline"
                          title="Fil de discussion instructeur / requérant (NOT-04)"
                        >
                          <AppIcon name="chat" size="xs" />
                          <span>Échanges</span>
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          title="Télécharger l'Accusé de Réception PDF (REQ-06)"
                          onClick={async () => {
                            try {
                              await downloadAuthenticatedFile(
                                `/api/applications/receipt.pdf?ref=${encodeURIComponent(app.referenceNumber)}`,
                                sessionToken,
                                { fallbackFileName: `Accuse-${app.referenceNumber}.pdf` }
                              );
                              toast.success('Accusé de réception PDF téléchargé.');
                            } catch (err) {
                              toast.error(err.message || 'Téléchargement impossible.', 'Accusé indisponible');
                            }
                          }}
                        >
                          <AppIcon name="receipt" size="xs" />
                          <span>Accusé PDF</span>
                        </Button>
                        {app.certificate && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="success"
                              onClick={async () => {
                                try {
                                  await downloadAuthenticatedFile(
                                    `/api/applications/certificate.pdf?ref=${encodeURIComponent(app.referenceNumber)}`,
                                    sessionToken,
                                    { fallbackFileName: `${app.referenceNumber}.pdf` }
                                  );
                                  toast.success('Attestation PDF officielle téléchargée.');
                                } catch (err) {
                                  toast.error(err.message || 'Téléchargement impossible.', 'PDF indisponible');
                                }
                              }}
                            >
                              <AppIcon name="pdfFile" size="xs" />
                              <span>PDF Scellé</span>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setQrModalApp(app)}
                            >
                              <AppIcon name="qr" size="xs" />
                              <span>QR Code</span>
                            </Button>
                          </>
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

      {/* Centre de Notifications In-App (NOT-02) */}
      <Card
        title={`Centre de Notifications (${unreadCount} non lue${unreadCount > 1 ? 's' : ''}) — NOT-02`}
        style={{ marginTop: '20px' }}
        actions={
          unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <AppIcon name="check" size="xs" />
              <span>Tout marquer comme lu</span>
            </Button>
          )
        }
      >
        {notifications.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
            Aucune notification pour le moment.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: n.read ? '#ffffff' : '#eef6fc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontWeight: n.read ? 600 : 700, fontSize: '13px', color: 'var(--fnpss-navy)' }}>
                      {n.title}
                    </div>
                    <div className="text-muted" style={{ fontSize: '12px', wordBreak: 'break-word' }}>{n.message}</div>
                  </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkNotificationRead(n.id)}
                    className="btn btn-sm btn-outline"
                  >
                    Marquer lu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modale d'édition avant instruction (REQ-08) */}
      <Modal
        isOpen={Boolean(activeModalApp)}
        onClose={() => {
          setActiveModalApp(null);
          setEditError('');
        }}
        title={`Modifier le Dossier : ${activeModalApp?.referenceNumber || ''}`}
        footer={
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setActiveModalApp(null)}>
              Annuler
            </Button>
            <Button variant="primary" isLoading={isSubmitting} loadingText="Enregistrement..." onClick={handleSaveEdit}>
              Enregistrer les Modifications
            </Button>
          </>
        }
      >
        {editError && (
          <AlertBanner
            variant="error"
            title="Erreur lors de la modification"
            message={editError}
            onClose={() => setEditError('')}
            style={{ marginBottom: '14px' }}
          />
        )}
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

      {/* Modale de Fourniture de Complément Documentaire (SC-02, ADM-06) */}
      <Modal
        isOpen={Boolean(complementApp)}
        onClose={() => {
          setComplementApp(null);
          setComplementError('');
        }}
        title={`Fournir un Complément : ${complementApp?.referenceNumber || ''}`}
        footer={
          <>
            <Button variant="outline" disabled={complementBusy} onClick={() => setComplementApp(null)}>
              Annuler
            </Button>
            <Button variant="brand" onClick={handleProvideComplement} isLoading={complementBusy} loadingText="Chiffrement & Envoi...">
              <AppIcon name="upload" size="sm" />
              <span>Déposer le Complément</span>
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleProvideComplement(); }}>
          {complementError && (
            <AlertBanner
              variant="error"
              title="Erreur lors du dépôt du complément"
              message={complementError}
              onClose={() => setComplementError('')}
              style={{ marginBottom: '14px' }}
            />
          )}
          {complementApp?.complementReason && (
            <AlertBanner
              variant="warning"
              title="Motif de la demande de complément (Instructeur FNPSS)"
              message={complementApp.complementReason}
              style={{ marginBottom: '14px' }}
            />
          )}
          <div className="form-group">
            <label htmlFor="comp-doc-code">Pièce Justificative à Compléter ou Remplacer</label>
            <select
              id="comp-doc-code"
              className="form-control"
              value={complementDocCode}
              onChange={(e) => setComplementDocCode(e.target.value)}
            >
              {COMPLEMENT_DOC_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="comp-file">Fichier PDF/A Complémentaire (&le; 3 Mo)</label>
            <input
              id="comp-file"
              type="file"
              accept="application/pdf,.pdf"
              className="form-control"
              onChange={(e) => setComplementFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <p className="text-muted" style={{ fontSize: '11.5px', margin: 0 }}>
            Le fichier sera contrôlé (en-tête %PDF-, absence de script actif), chiffré en AES-256-GCM sur Cloudinary et relancera automatiquement le compteur SLA de votre dossier.
          </p>
        </form>
      </Modal>

      {/* Modale Fil de Discussion Dossier (NOT-04) */}
      <Modal
        isOpen={Boolean(threadApp)}
        onClose={() => setThreadApp(null)}
        title={`Fil d'Échanges — Dossier ${threadApp?.referenceNumber || ''}`}
        footer={
          <Button variant="outline" onClick={() => setThreadApp(null)}>
            Fermer
          </Button>
        }
      >
        {threadApp && (
          <DossierThread
            referenceNumber={threadApp.referenceNumber}
            tokenOverride={sessionToken}
          />
        )}
      </Modal>

      {/* Confirmation standardisée de retrait avant instruction (REQ-08) */}
      <ConfirmDialog
        isOpen={Boolean(withdrawTarget)}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={confirmWithdraw}
        title="Confirmer le retrait volontaire"
        message={`Confirmez-vous le retrait définitif du dossier ${withdrawTarget?.referenceNumber || ''} avant le démarrage de son instruction ?`}
        details={withdrawTarget ? <strong>{withdrawTarget.projectTitle || withdrawTarget.serviceCode}</strong> : null}
        confirmLabel="Oui, retirer ce dossier"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Modale QR Code de Vérification DGDA */}
      <Modal
        isOpen={Boolean(qrModalApp?.certificate)}
        onClose={() => setQrModalApp(null)}
        title={`QR Code Officiel — ${qrModalApp?.certificate?.certificateNumber || ''}`}
        footer={
          <Button variant="outline" onClick={() => setQrModalApp(null)}>
            Fermer
          </Button>
        }
      >
        {qrModalApp?.certificate && (
          <QrCodeDisplay
            value={
              qrModalApp.certificate.qrVerificationUrl ||
              `${typeof window !== 'undefined' ? window.location.origin : 'https://guichetuniquefnpss.vercel.app'}/verifier?hash=${qrModalApp.certificate.docHash}&cert=${encodeURIComponent(qrModalApp.certificate.certificateNumber)}`
            }
            certificateNumber={qrModalApp.certificate.certificateNumber}
            label="QR Code de Contrôle Douanier DGDA"
          />
        )}
      </Modal>
    </div>
  );
}
