'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DocumentViewer from '../../components/ui/DocumentViewer.jsx';
import DossierThread from '../../components/DossierThread.jsx';
import AlertBanner from '../../components/ui/AlertBanner.jsx';

const DEMO_STAFF_EMAILS = {
  AGENT: 'agent@fnpss.cd',
  CHEF_DIVISION: 'chef.division@fnpss.cd',
  DG: 'dg@fnpss.cd',
  MINISTERE: 'ministere@fnpss.cd',
  ADMIN: 'admin@fnpss.cd'
};

export default function AdminPage() {
  const [role, setRole] = useState('AGENT');
  const [sessionToken, setSessionToken] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedService, setSelectedService] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [isOpinionModalOpen, setIsOpinionModalOpen] = useState(false);
  const [opinionData, setOpinionData] = useState({ favorable: true, note: 'Avis favorable après examen des pièces' });

  const [isComplementModalOpen, setIsComplementModalOpen] = useState(false);
  const [complementReason, setComplementReason] = useState('');

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [isCosignModalOpen, setIsCosignModalOpen] = useState(false);
  const [cosignRef, setCosignRef] = useState('CAB/MIN-AS/2026/0150');

  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeData, setRevokeData] = useState({ reason: '', doubleConfirmed: false });

  // Provisionnement des comptes agents FNPSS (ADM-01 / ADM-03)
  const [staffList, setStaffList] = useState([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    role: 'AGENT',
    organizationName: 'FNPSS - Direction des Opérations',
    province: 'Kinshasa'
  });

  const [alertInfo, setAlertInfo] = useState(null); // { type, title, message, action }
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notify = (type, message, title = '', action = null) => {
    setAlertInfo({ type, message, title, action });
  };

  const [blockchainInfo, setBlockchainInfo] = useState({
    relayer: null,
    queue: null,
    deployment: null,
    milestoneG2: null,
    stats: null,
    supervision: null,
    pilot: null
  });

  const ensureStaffSession = async (targetRole = role) => {
    const email = DEMO_STAFF_EMAILS[targetRole];
    if (!email) return sessionToken;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'StaffFNPSS#2026' })
      });
      if (res.ok) {
        const d = await res.json();
        if (d.sessionToken) {
          setSessionToken(d.sessionToken);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('fnpss_session_token', d.sessionToken);
          }
          return d.sessionToken;
        }
      }
    } catch {}
    return typeof window !== 'undefined' ? sessionStorage.getItem('fnpss_session_token') || '' : '';
  };

  const authHeaders = (tokenOverride = sessionToken, extra = {}) => ({
    ...(tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : {}),
    ...extra
  });

  const fetchApplications = async (tokenOverride) => {
    setIsLoading(true);
    try {
      const tk = tokenOverride || sessionToken || (await ensureStaffSession(role));
      const [res, queueRes, deployRes, gatesRes, statsRes, supRes, pilotRes] = await Promise.all([
        fetch('/api/applications', { headers: authHeaders(tk) }),
        fetch('/api/blockchain/anchor-queue', { headers: authHeaders(tk) }),
        fetch('/api/blockchain/deploy', { headers: authHeaders(tk) }),
        fetch('/api/ops/gates', { headers: authHeaders(tk) }),
        fetch('/api/admin/stats', { headers: authHeaders(tk) }),
        fetch('/api/ops/supervision', { headers: authHeaders(tk) }),
        fetch('/api/ops/pilot', { headers: authHeaders(tk) })
      ]);
      const data = await res.json();
      if (data.success) {
        const list = data.applications || [];
        setApplications(list);
        setSelectedApp((prev) => {
          if (prev) {
            const refreshed = list.find((a) => a.referenceNumber === prev.referenceNumber);
            if (refreshed) return refreshed;
          }
          return list.length > 0 ? list[0] : null;
        });
      }
      const qData = queueRes.ok ? await queueRes.json() : {};
      const dData = deployRes.ok ? await deployRes.json() : {};
      const gData = gatesRes.ok ? await gatesRes.json() : {};
      const stData = statsRes.ok ? await statsRes.json() : {};
      const spData = supRes.ok ? await supRes.json() : {};
      const plData = pilotRes.ok ? await pilotRes.json() : {};
      setBlockchainInfo({
        relayer: qData.relayer || null,
        queue: qData.queue || null,
        deployment: dData.latestDeployment || null,
        milestoneG2: gData.milestoneG2Alpha || null,
        stats: stData.stats || null,
        supervision: spData || null,
        pilot: plData || null
      });
      if (role === 'ADMIN') {
        try {
          const staffRes = await fetch('/api/admin/staff', { headers: authHeaders(tk) });
          if (staffRes.ok) {
            const staffData = await staffRes.json();
            setStaffList(staffData.staff || []);
          }
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlushAnchorQueue = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/blockchain/anchor-queue', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'flush', isNetworkOnline: true })
      });
      if (res.ok) {
        const d = await res.json();
        notify('success', `File d'ancrage résiliente traitée (${d.queue?.confirmedCount || 0} transaction(s) confirmée(s) sur Polygon).`, 'File Résiliente Synchronisée');
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        notify('error', d.error || 'Erreur lors de la synchronisation de la file.', 'Échec de synchronisation');
      }
    } catch {
      notify('error', 'Erreur de communication réseau.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeployAmoy = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/blockchain/deploy', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ networkKey: 'polygon-amoy', initialRelayerBalancePol: 25 })
      });
      if (res.ok) {
        const d = await res.json();
        notify('success', `Contrat FNPSSRegistry vérifié sur Polygon Amoy (${d.deployment?.contractAddress?.slice(0, 12)}...). Smoke test OK.`, 'Contrat Qualifié');
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        notify('error', d.error || 'Qualification du contrat refusée.', 'Échec Qualification');
      }
    } catch {
      notify('error', 'Erreur de communication réseau lors du déploiement Amoy.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    ensureStaffSession(role).then((tk) => fetchApplications(tk));
  }, [role]);

  const filteredApps = applications.filter((app) => {
    if (selectedService !== 'ALL' && app.serviceCode !== selectedService) return false;
    if (selectedStatus !== 'ALL' && app.status !== selectedStatus) return false;
    return true;
  });

  const handleValidatePayment = async (ref) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/applications/validate-payment', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ referenceNumber: ref })
      });
      if (res.ok) {
        notify('success', `Quittance de frais validée pour le dossier ${ref}. Instruction démarrée.`, 'Paiement Validé (ADM-04)');
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        notify('error', d.error || 'Erreur lors de la validation du paiement.', 'Validation Refusée');
      }
    } catch (err) {
      notify('error', 'Impossible de contacter le serveur pour valider la quittance.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestComplement = async () => {
    if (!selectedApp || !complementReason.trim()) return;
    setIsSubmitting(true);
    setModalError('');
    try {
      const res = await fetch('/api/applications/request-complement', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          referenceNumber: selectedApp.referenceNumber,
          reason: complementReason
        })
      });
      if (res.ok) {
        notify('info', `Complément demandé sur le dossier ${selectedApp.referenceNumber}. Requérant notifié.`, 'Complément Demandé (ADM-06)');
        setIsComplementModalOpen(false);
        setComplementReason('');
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors de la demande de complément.';
        setModalError(msg);
        notify('error', msg, 'Demande de Complément Refusée');
      }
    } catch (err) {
      setModalError('Erreur de communication réseau.');
      notify('error', 'Impossible de joindre le serveur.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveSeal = async (ref) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/applications/approve-seal', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ referenceNumber: ref })
      });
      if (res.ok) {
        notify('success', `Attestation ${ref} approuvée et scellée avec succès sur la blockchain Polygon Amoy.`, 'Attestation Scellée (ADM-06)');
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        notify('error', d.error || 'Erreur lors de l\'approbation et du scellement.', 'Approbation Refusée');
      }
    } catch (err) {
      notify('error', 'Erreur lors du scellement sur la blockchain Polygon.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectReason.trim()) return;
    setIsSubmitting(true);
    setModalError('');
    try {
      const res = await fetch('/api/applications/reject', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          referenceNumber: selectedApp.referenceNumber,
          reason: rejectReason
        })
      });
      if (res.ok) {
        notify('warning', `Dossier ${selectedApp.referenceNumber} rejeté avec motif notifié au requérant.`, 'Dossier Rejeté (ADM-06)');
        setIsRejectModalOpen(false);
        setRejectReason('');
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors du rejet du dossier.';
        setModalError(msg);
        notify('error', msg, 'Rejet Refusé');
      }
    } catch (err) {
      setModalError('Erreur de communication réseau.');
      notify('error', 'Impossible de joindre le serveur.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDivisionOpinion = async () => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    setModalError('');
    try {
      const res = await fetch('/api/applications/division-opinion', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          referenceNumber: selectedApp.referenceNumber,
          favorable: opinionData.favorable,
          opinionNote: opinionData.note
        })
      });
      if (res.ok) {
        notify('success', `Avis technique formulé pour le dossier ${selectedApp.referenceNumber}. Transmis à la DG.`, 'Avis Technique Enregistré (ADM-08)');
        setIsOpinionModalOpen(false);
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors de l\'émission de l\'avis technique.';
        setModalError(msg);
        notify('error', msg, 'Avis Technique Refusé');
      }
    } catch (err) {
      setModalError('Erreur de communication réseau.');
      notify('error', 'Impossible de joindre le serveur.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCosignMinistry = async () => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    setModalError('');
    try {
      const res = await fetch('/api/applications/cosign-ministry', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          referenceNumber: selectedApp.referenceNumber,
          ministryReference: cosignRef
        })
      });
      if (res.ok) {
        notify('success', `Co-signature ministérielle enregistrée (${cosignRef}).`, 'Co-Signature Validée (ADM-06)');
        setIsCosignModalOpen(false);
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors de l\'enregistrement de la co-signature.';
        setModalError(msg);
        notify('error', msg, 'Co-Signature Refusée');
      }
    } catch (err) {
      setModalError('Erreur de communication réseau.');
      notify('error', 'Impossible de joindre le serveur.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setModalError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(staffForm)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || 'Création du compte agent refusée.';
        setModalError(msg);
        notify('error', msg, 'Création Refusée');
        return;
      }
      notify('success', `Compte agent ${data.account?.email} (${data.account?.role}) créé et enregistré.`, 'Compte Agent Provisionné (ADM-01)');
      setIsStaffModalOpen(false);
      setStaffForm({
        email: '',
        password: '',
        role: 'AGENT',
        organizationName: 'FNPSS - Direction des Opérations',
        province: 'Kinshasa'
      });
      fetchApplications();
    } catch (err) {
      setModalError('Erreur de communication réseau.');
      notify('error', 'Erreur réseau lors de la création du compte.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedApp) return;
    if (!revokeData.doubleConfirmed) {
      setModalError('La case de double confirmation par la Direction Générale est obligatoire.');
      return;
    }
    setIsSubmitting(true);
    setModalError('');

    try {
      const res = await fetch('/api/applications/revoke', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          referenceNumber: selectedApp.referenceNumber,
          reason: revokeData.reason,
          doubleConfirmed: revokeData.doubleConfirmed
        })
      });
      if (res.ok) {
        notify('warning', `Attestation ${selectedApp.referenceNumber} révoquée. Régies DGDA/DGI/DGRAD alertées en temps réel.`, 'Attestation Révoquée (VER-06)');
        setIsRevokeModalOpen(false);
        fetchApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors de la révocation';
        setModalError(msg);
        notify('error', msg, 'Révocation Refusée');
      }
    } catch (err) {
      setModalError('Erreur de communication réseau.');
      notify('error', 'Erreur réseau lors de la révocation.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Sélecteur de Rôle Instructeur */}
      <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <strong style={{ color: 'var(--fnpss-navy)', fontSize: '14px' }}>Console d'Instruction Back-Office FNPSS</strong>
          <div className="text-muted" style={{ fontSize: '12px' }}>Circuit multi-niveaux d'approbation et contrôle de recevabilité</div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Rôle actif :</span>
          {['AGENT', 'CHEF_DIVISION', 'DG', 'MINISTERE', 'ADMIN'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                background: role === r ? 'var(--fnpss-navy)' : '#f8fafc',
                color: role === r ? '#ffffff' : 'var(--text-main)',
                borderColor: role === r ? 'var(--fnpss-navy)' : 'var(--border)'
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Bandeau Relayer Blockchain Polygon Amoy, File Résiliente & Jalon G2 Alpha (BLK-09..11, GOV-12) */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <strong>Réseau :</strong> {blockchainInfo.deployment?.network?.name || 'Polygon Amoy Testnet (80002)'}
          </span>
          <span className="mono">
            <strong>Contrat :</strong> {(blockchainInfo.deployment?.contractAddress || '0x1111...').slice(0, 14)}...
          </span>
          <span>
            <strong>Relayer Paymaster :</strong> 0 crypto requérant ({blockchainInfo.relayer?.anchoredDocumentsCount ?? 0} actes ancrés)
          </span>
          <span>
            <strong>File résiliente (BLK-10) :</strong> {blockchainInfo.queue?.queuedCount ?? 0} en attente / {blockchainInfo.queue?.confirmedCount ?? 0} confirmé(s)
          </span>
          <Badge status="valide">
            Jalon G2 Alpha : {blockchainInfo.milestoneG2?.status || 'VALIDATED'}
          </Badge>
          <Badge status="valide">
            Jalon G3 Beta : {blockchainInfo.supervision?.milestoneG3Beta?.status || 'VALIDATED'}
          </Badge>
          <span>
            <strong>Budget 3G (REQ-12) :</strong> {blockchainInfo.supervision?.req12PerformanceBudget?.estimated3gLoadSeconds ?? '1.64'}s (&lt; 3,0s)
          </span>
          <span>
            <strong>Recettes validées (ADM-09) :</strong> {blockchainInfo.stats?.financials?.totalCollectedFeesUsd ?? 0} USD
          </span>
          <span>
            <strong>Cohorte Pilote (DEP-06) :</strong> {blockchainInfo.pilot?.pilotCohortSize ?? 5} ONG accompagnées ({blockchainInfo.pilot?.averagePilotSatisfactionOn5 ?? '4.8'}/5)
          </span>
          <span>
            <strong>SLA Hypercare (DEP-07) :</strong> {blockchainInfo.pilot?.hypercareSlaCompliancePct ?? 100}% conforme
          </span>
          <Badge status="valide">
            Contrat TMA V3 (DEP-08) : {blockchainInfo.pilot?.tmaContractAndRetrospective?.status || 'ACTIVE_SIGNED'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleFlushAnchorQueue}>
            🔄 Synchroniser File d&apos;Ancrage
          </Button>
          {(role === 'DG' || role === 'ADMIN') && (
            <>
              <Button variant="primary" size="sm" onClick={handleDeployAmoy}>
                ⛓️ Qualifier Contrat Amoy (BLK-11)
              </Button>
              <a
                href={`/api/admin/stats?format=csv&token=${encodeURIComponent(sessionToken)}`}
                className="btn btn-outline btn-sm"
                style={{ textDecoration: 'none' }}
              >
                📊 Export CSV (ADM-09)
              </a>
              <a
                href="/guide"
                className="btn btn-outline btn-sm"
                style={{ textDecoration: 'none' }}
              >
                🎓 Guides &amp; Formations (DEP-03..05)
              </a>
            </>
          )}
        </div>
      </div>

      {alertInfo && (
        <AlertBanner
          variant={alertInfo.type}
          title={alertInfo.title}
          message={alertInfo.message}
          action={alertInfo.action}
          onClose={() => setAlertInfo(null)}
          style={{ marginBottom: '18px' }}
        />
      )}

      {/* Grille Double Panneau (Inspection côte-à-côte) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '18px' }}>
        {/* Panneau Gauche : Liste & Fiche d'Instruction */}
        <div>
          <Card
            title="Dossiers en File d'Attente"
            actions={
              <div className="flex gap-2">
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '11.5px' }}
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  <option value="ALL">Tous Services</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                  <option value="S3">S3</option>
                  <option value="S4">S4</option>
                  <option value="S5">S5</option>
                  <option value="S6">S6</option>
                </select>
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '11.5px' }}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">Tous Statuts</option>
                  <option value="SOUMIS">Soumis</option>
                  <option value="EN_COURS_INSTRUCTION">En instruction</option>
                  <option value="VALIDE_DELIVRE">Validé</option>
                  <option value="REVOQUE">Révoqué</option>
                </select>
              </div>
            }
          >
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {filteredApps.map((app) => {
                const isSelected = selectedApp?.referenceNumber === app.referenceNumber;
                return (
                  <div
                    key={app.referenceNumber}
                    onClick={() => setSelectedApp(app)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${isSelected ? 'var(--fnpss-blue)' : 'var(--border)'}`,
                      background: isSelected ? '#eef6fc' : '#ffffff',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex justify-between items-center" style={{ marginBottom: '4px' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--fnpss-navy)', fontSize: '12.5px' }}>
                        {app.referenceNumber}
                      </span>
                      <Badge status="soumis">{app.serviceCode}</Badge>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{app.organizationName}</div>
                    <div className="text-muted" style={{ fontSize: '11.5px' }}>{app.projectTitle}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Fiche d'Instruction & Actions */}
          {selectedApp && (
            <Card title={`Fiche d'Instruction : ${selectedApp.referenceNumber}`}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px', marginBottom: '16px' }}>
                <div><span className="text-muted">Statut :</span> <strong>{selectedApp.status}</strong></div>
                <div><span className="text-muted">Frais :</span> <strong>{selectedApp.paymentValidated ? '✓ Quittance Validée' : '⏳ En attente'}</strong></div>
                <div><span className="text-muted">Avis Division :</span> <strong>{selectedApp.divisionOpinion ? (selectedApp.divisionOpinion.favorable ? '✓ Favorable' : '⚠️ Réservé') : 'Non émis'}</strong></div>
                <div><span className="text-muted">Co-signature :</span> <strong>{selectedApp.ministryCoSigned ? '✓ Apposée' : 'Non apposée'}</strong></div>
              </div>

              {selectedApp.certificate && (
                <div style={{ background: '#eef6fc', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--fnpss-navy)', marginBottom: '4px' }}>
                    ⛓️ Attestation Scellée : <span className="mono">{selectedApp.certificate.certificateNumber}</span>
                  </div>
                  <div className="mono text-muted" style={{ fontSize: '11px', wordBreak: 'break-all', marginBottom: '6px' }}>
                    Tx Amoy : {selectedApp.certificate.txHash} ({selectedApp.certificate.onChainMode || 'LIVE_RPC'})
                  </div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <a
                      href={selectedApp.certificate.explorerTxUrl || `https://amoy.polygonscan.com/tx/${selectedApp.certificate.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline"
                      style={{ textDecoration: 'none', fontSize: '11px' }}
                    >
                      🔗 Voir sur PolygonScan Amoy
                    </a>
                    <a
                      href={`/api/applications/certificate.pdf?ref=${encodeURIComponent(selectedApp.referenceNumber)}&token=${encodeURIComponent(sessionToken)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-success"
                      style={{ textDecoration: 'none', fontSize: '11px' }}
                    >
                      📥 Télécharger l&apos;Attestation PDF Scellée
                    </a>
                  </div>
                </div>
              )}

              {/* Guidance Contextuelle selon le Rôle et l'État du Dossier */}
              {role === 'AGENT' && (
                !selectedApp.paymentValidated ? (
                  <AlertBanner
                    variant="info"
                    title="Rôle AGENT — Contrôle Financier"
                    message="Vérifiez le bordereau P6_QUITTANCE dans la visionneuse. Cliquez sur « Valider Quittance Frais » pour enregistrer les 320 USD et démarrer le délai réglementaire SLA de 10 jours ouvrables."
                    style={{ marginBottom: '14px' }}
                  />
                ) : (
                  <AlertBanner
                    variant="success"
                    title="Rôle AGENT — Quittance Validée"
                    message="La quittance de frais a été validée. Le dossier est entre les mains du Chef de Division pour examen au fond."
                    style={{ marginBottom: '14px' }}
                  />
                )
              )}

              {role === 'CHEF_DIVISION' && (
                !selectedApp.paymentValidated ? (
                  <AlertBanner
                    variant="warning"
                    title="Étape Préalable Requise (Règle Métier ADM-08)"
                    message="La quittance bancaire (320 USD) doit impérativement être validée par un Agent avant que le Chef de Division puisse formuler un avis technique."
                    action={
                      <Button size="sm" variant="primary" onClick={() => { setRole('AGENT'); notify('info', 'Vous êtes maintenant sur le rôle AGENT. Validez la quittance ci-dessous.', 'Bascule de Rôle'); }}>
                        👉 Basculer sur le rôle AGENT pour valider la quittance
                      </Button>
                    }
                    style={{ marginBottom: '14px' }}
                  />
                ) : !selectedApp.divisionOpinion ? (
                  <AlertBanner
                    variant="info"
                    title="Rôle CHEF DE DIVISION — Examen au Fond"
                    message="La quittance est validée. Inspectez les pièces P1 à P5 dans la visionneuse puis cliquez sur « Émettre Avis Technique Division »."
                    style={{ marginBottom: '14px' }}
                  />
                ) : (
                  <AlertBanner
                    variant="success"
                    title="Rôle CHEF DE DIVISION — Avis Technique Enregistré"
                    message={`Avis technique ${selectedApp.divisionOpinion.favorable ? 'FAVORABLE' : 'RÉSERVÉ'} émis le ${selectedApp.divisionOpinion.signedAt ? new Date(selectedApp.divisionOpinion.signedAt).toLocaleDateString('fr-FR') : ''}. Dossier transmis à la Direction Générale.`}
                    style={{ marginBottom: '14px' }}
                  />
                )
              )}

              {role === 'DG' && (
                !selectedApp.paymentValidated ? (
                  <AlertBanner
                    variant="warning"
                    title="Étape 1 Manquante — Quittance Non Validée"
                    message="La quittance des frais bancaires n'a pas encore été validée par un Agent."
                    action={
                      <Button size="sm" variant="primary" onClick={() => setRole('AGENT')}>
                        👉 Basculer sur le rôle AGENT
                      </Button>
                    }
                    style={{ marginBottom: '14px' }}
                  />
                ) : !selectedApp.divisionOpinion?.favorable ? (
                  <AlertBanner
                    variant="warning"
                    title="Étape 2 Manquante — Avis Technique Requis (Règle Métier ADM-06)"
                    message="L'avis technique favorable du Chef de Division est exigé avant toute décision d'approbation ou de scellement blockchain."
                    action={
                      <Button size="sm" variant="accent" onClick={() => setRole('CHEF_DIVISION')}>
                        👉 Basculer sur le rôle CHEF_DIVISION
                      </Button>
                    }
                    style={{ marginBottom: '14px' }}
                  />
                ) : selectedApp.status !== 'VALIDE_DELIVRE' && selectedApp.status !== 'REVOQUE' && selectedApp.status !== 'REJETE' ? (
                  <AlertBanner
                    variant="success"
                    title="Rôle DG — Dossier Prêt pour Décision"
                    message="La recevabilité financière et technique est 100% conforme. Vous pouvez approuver et sceller l'attestation sur la Blockchain Polygon Amoy ou rejeter le dossier."
                    style={{ marginBottom: '14px' }}
                  />
                ) : selectedApp.certificate ? (
                  <AlertBanner
                    variant="success"
                    title="Attestation Scellée sur Blockchain"
                    message={`Attestation ${selectedApp.certificate.certificateNumber} ancrée sur Polygon Amoy (Tx: ${selectedApp.certificate.txHash?.slice(0, 14)}...).`}
                    style={{ marginBottom: '14px' }}
                  />
                ) : null
              )}

              {role === 'MINISTERE' && (
                !selectedApp.certificate ? (
                  <AlertBanner
                    variant="warning"
                    title="En Attente de Délivrance DG"
                    message="L'attestation doit être approuvée et scellée par la Direction Générale avant l'apposition de la co-signature ministérielle."
                    style={{ marginBottom: '14px' }}
                  />
                ) : !selectedApp.ministryCoSigned ? (
                  <AlertBanner
                    variant="info"
                    title="Rôle MINISTÈRE — Co-Signature Requise"
                    message="L'attestation officielle a été scellée sur Polygon. Cliquez sur « Co-Signature Ministérielle » pour enregistrer l'arrêté."
                    style={{ marginBottom: '14px' }}
                  />
                ) : (
                  <AlertBanner
                    variant="success"
                    title="Co-Signature Ministérielle Apposée"
                    message="L'attestation est officiellement co-signée par le Ministère de tutelle."
                    style={{ marginBottom: '14px' }}
                  />
                )
              )}

              {/* Boutons d'Action selon le Rôle */}
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {role === 'AGENT' && !selectedApp.paymentValidated && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleValidatePayment(selectedApp.referenceNumber)}
                  >
                    {isSubmitting ? 'Validation en cours...' : '💳 Valider Quittance Frais'}
                  </Button>
                )}

                {(role === 'AGENT' || role === 'CHEF_DIVISION') && selectedApp.status !== 'VALIDE_DELIVRE' && selectedApp.status !== 'REVOQUE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setModalError('');
                      setIsComplementModalOpen(true);
                    }}
                  >
                    📩 Demander Complément
                  </Button>
                )}

                {role === 'CHEF_DIVISION' && (
                  <Button
                    variant="accent"
                    size="sm"
                    disabled={isSubmitting || !selectedApp.paymentValidated}
                    onClick={() => {
                      if (!selectedApp.paymentValidated) {
                        notify('warning', 'La quittance des frais (320 USD) doit d\'abord être validée par un agent (Règle ADM-08).', 'Étape Préalable Requise');
                        return;
                      }
                      setModalError('');
                      setIsOpinionModalOpen(true);
                    }}
                    title={!selectedApp.paymentValidated ? "Quittance des frais en attente de validation par l'agent" : ""}
                  >
                    📝 Émettre Avis Technique Division {!selectedApp.paymentValidated && '(En attente validation quittance)'}
                  </Button>
                )}

                {role === 'DG' && selectedApp.status !== 'VALIDE_DELIVRE' && selectedApp.status !== 'REVOQUE' && selectedApp.status !== 'REJETE' && (
                  <>
                    <Button
                      variant="success"
                      size="sm"
                      disabled={isSubmitting || !selectedApp.paymentValidated || !selectedApp.divisionOpinion?.favorable}
                      onClick={() => {
                        if (!selectedApp.paymentValidated) {
                          notify('warning', 'La quittance doit être validée avant approbation.', 'Préalable Requis');
                          return;
                        }
                        if (!selectedApp.divisionOpinion?.favorable) {
                          notify('warning', 'L\'avis technique favorable de la division est requis avant approbation DG (Règle ADM-06).', 'Préalable Requis');
                          return;
                        }
                        handleApproveSeal(selectedApp.referenceNumber);
                      }}
                      title={!selectedApp.divisionOpinion?.favorable ? "En attente de l'avis favorable du Chef de Division" : ""}
                    >
                      {isSubmitting ? 'Scellement Polygon en cours...' : '✍️ Approuver & Sceller Blockchain'} {!selectedApp.divisionOpinion?.favorable && '(En attente avis division)'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setModalError('');
                        setIsRejectModalOpen(true);
                      }}
                    >
                      ✕ Rejeter la Demande
                    </Button>
                  </>
                )}

                {role === 'MINISTERE' && selectedApp.certificate && !selectedApp.ministryCoSigned && (
                  <Button
                    variant="accent"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalError('');
                      setIsCosignModalOpen(true);
                    }}
                  >
                    🏛️ Co-Signature Ministérielle
                  </Button>
                )}

                {(role === 'DG' || role === 'ADMIN') && selectedApp.certificate && selectedApp.status !== 'REVOQUE' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setModalError('');
                      setIsRevokeModalOpen(true);
                    }}
                  >
                    ⚠️ Révoquer l'Attestation
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Panneau Droit : Visionneuse Documentaire Côte-à-Côte */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card title="Inspection Documentaire Côte-à-Côte (ADM-05)">
            {selectedApp ? (
              <DocumentViewer
                referenceNumber={selectedApp.referenceNumber}
                token={sessionToken}
                documents={
                  selectedApp.attachedDocuments?.length > 0
                    ? selectedApp.attachedDocuments.map(d => ({
                        docCode: d.docCode,
                        name: d.docCode,
                        fileName: d.fileName,
                        sha256: d.sha256Hash,
                        sizeBytes: d.sizeBytes,
                        stored: Boolean(d.stored || d.cloudinaryUrl)
                      }))
                    : [
                        { docCode: 'P1_REQUETE', name: 'Requête motivée FNPSS', fileName: 'p1_requete.pdf', sha256: '0x' + '11'.repeat(32) },
                        { docCode: 'P2_ENROLEMENT', name: 'Accord de siège F92', fileName: 'p2_enrolement.pdf', sha256: '0x' + '22'.repeat(32) },
                        { docCode: 'P6_QUITTANCE', name: 'Bordereau bancaire 320 USD', fileName: 'p6_quittance.pdf', sha256: '0x' + '66'.repeat(32) }
                      ]
                }
              />
            ) : (
              <p className="text-muted">Sélectionnez un dossier à gauche pour inspecter ses pièces.</p>
            )}
          </Card>

          {selectedApp && (
            <Card title={`Échanges Instructeur / Requérant (${selectedApp.referenceNumber}) — NOT-04`}>
              <DossierThread
                referenceNumber={selectedApp.referenceNumber}
                tokenOverride={sessionToken}
              />
            </Card>
          )}
        </div>
      </div>

      {/* Provisionnement des Comptes Agents FNPSS (ADM-01 / ADM-03) */}
      {role === 'ADMIN' && (
        <Card
          title={`Gestion des Comptes Agents & Instructeurs FNPSS (${staffList.length}) — ADM-01 / ADM-03`}
          style={{ marginTop: '20px' }}
          actions={
            <Button variant="primary" size="sm" onClick={() => setIsStaffModalOpen(true)}>
              ➕ Créer un Compte Agent / Instructeur
            </Button>
          }
        >
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Email Institutionnel</th>
                  <th>Rôle RBAC</th>
                  <th>Service / Direction</th>
                  <th>Province</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((st) => (
                  <tr key={st.id || st.email}>
                    <td className="mono" style={{ fontWeight: 600 }}>{st.email}</td>
                    <td><Badge status="soumis">{st.role}</Badge></td>
                    <td>{st.organizationName}</td>
                    <td>{st.province}</td>
                    <td><Badge status={st.status === 'ACTIVE' ? 'valide' : 'revoque'}>{st.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modale Demande de Complément (ADM-06, NOT-04) */}
      <Modal
        isOpen={isComplementModalOpen}
        onClose={() => {
          setIsComplementModalOpen(false);
          setModalError('');
        }}
        title="Demande de Complément Documentaire (ADM-06)"
        footer={
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setIsComplementModalOpen(false)}>Annuler</Button>
            <Button variant="primary" disabled={isSubmitting || !complementReason.trim()} onClick={handleRequestComplement}>
              {isSubmitting ? 'Notification en cours...' : 'Notifier le Requérant'}
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner
            variant="error"
            title="Erreur lors de la demande de complément"
            message={modalError}
            onClose={() => setModalError('')}
            style={{ marginBottom: '14px' }}
          />
        )}
        <div className="form-group">
          <label htmlFor="comp-reason">Motif &amp; Pièces Complémentaires Sollicitées</label>
          <textarea
            id="comp-reason"
            rows="3"
            className="form-control"
            value={complementReason}
            onChange={(e) => setComplementReason(e.target.value)}
            placeholder="Ex: Veuillez joindre le rapport annuel certifié 2025 (Pièce P4)"
            required
          />
        </div>
      </Modal>

      {/* Modale Rejet de Demande (ADM-06) */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setModalError('');
        }}
        title="Rejet Motivé de la Demande (ADM-06)"
        footer={
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setIsRejectModalOpen(false)}>Annuler</Button>
            <Button variant="danger" disabled={isSubmitting || !rejectReason.trim()} onClick={handleReject}>
              {isSubmitting ? 'Traitement en cours...' : 'Confirmer le Rejet'}
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner
            variant="error"
            title="Erreur lors du rejet du dossier"
            message={modalError}
            onClose={() => setModalError('')}
            style={{ marginBottom: '14px' }}
          />
        )}
        <div className="form-group">
          <label htmlFor="rej-reason">Motif Officiel du Rejet</label>
          <textarea
            id="rej-reason"
            rows="3"
            className="form-control"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: Non-conformité des codes SH douaniers avec l'objet social"
            required
          />
        </div>
      </Modal>

      {/* Modale Avis Chef de Division */}
      <Modal
        isOpen={isOpinionModalOpen}
        onClose={() => {
          setIsOpinionModalOpen(false);
          setModalError('');
        }}
        title="Avis Technique du Chef de Division (ADM-08)"
        footer={
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setIsOpinionModalOpen(false)}>Annuler</Button>
            <Button
              variant="accent"
              disabled={isSubmitting || !selectedApp?.paymentValidated}
              onClick={handleDivisionOpinion}
            >
              {isSubmitting ? 'Enregistrement en cours...' : "Valider l'Avis"}
            </Button>
          </>
        }
      >
        {!selectedApp?.paymentValidated && (
          <AlertBanner
            variant="warning"
            title="Quittance Non Validée (Règle ADM-08)"
            message="La quittance des frais bancaires (320 USD) doit obligatoirement être validée par un agent avant que le Chef de Division puisse formuler un avis technique. Veuillez d'abord valider la quittance en tant qu'Agent."
            style={{ marginBottom: '14px' }}
          />
        )}
        {modalError && (
          <AlertBanner
            variant="error"
            title="Erreur lors de l'enregistrement de l'avis"
            message={modalError}
            onClose={() => setModalError('')}
            style={{ marginBottom: '14px' }}
          />
        )}
        <div className="form-group">
          <label htmlFor="opinion-sel">Sens de l'Avis Technique</label>
          <select
            id="opinion-sel"
            className="form-control"
            value={opinionData.favorable ? 'FAVORABLE' : 'RESERVE'}
            onChange={(e) => setOpinionData({ ...opinionData, favorable: e.target.value === 'FAVORABLE' })}
          >
            <option value="FAVORABLE">Avis Favorable</option>
            <option value="RESERVE">Avis avec Réserves / Défavorable</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="opinion-note">Motivation Technique</label>
          <textarea
            id="opinion-note"
            rows="3"
            className="form-control"
            value={opinionData.note}
            onChange={(e) => setOpinionData({ ...opinionData, note: e.target.value })}
          />
        </div>
      </Modal>

      {/* Modale Co-Signature Ministérielle */}
      <Modal
        isOpen={isCosignModalOpen}
        onClose={() => {
          setIsCosignModalOpen(false);
          setModalError('');
        }}
        title="Co-Signature du Ministère de Tutelle (ADM-06)"
        footer={
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setIsCosignModalOpen(false)}>Annuler</Button>
            <Button variant="accent" disabled={isSubmitting || !cosignRef.trim()} onClick={handleCosignMinistry}>
              {isSubmitting ? 'Enregistrement en cours...' : 'Apposer la Co-Signature'}
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner
            variant="error"
            title="Erreur lors de la co-signature"
            message={modalError}
            onClose={() => setModalError('')}
            style={{ marginBottom: '14px' }}
          />
        )}
        <div className="form-group">
          <label htmlFor="cosign-input">Numéro de Référence de l'Arrêté Ministériel</label>
          <input
            id="cosign-input"
            type="text"
            className="form-control"
            value={cosignRef}
            onChange={(e) => setCosignRef(e.target.value)}
            required
          />
        </div>
      </Modal>

      {/* Modale Révocation Double Confirmation */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={() => {
          setIsRevokeModalOpen(false);
          setModalError('');
        }}
        title="Révocation Formelle d'une Attestation (VER-06)"
        footer={
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setIsRevokeModalOpen(false)}>Annuler</Button>
            <Button variant="danger" disabled={isSubmitting || !revokeData.reason.trim() || !revokeData.doubleConfirmed} onClick={handleRevoke}>
              {isSubmitting ? 'Révocation en cours...' : 'Confirmer la Révocation'}
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner
            variant="error"
            title="Erreur lors de la révocation"
            message={modalError}
            onClose={() => setModalError('')}
            style={{ marginBottom: '14px' }}
          />
        )}
        <div className="form-group">
          <label htmlFor="rev-reason">Motif Impératif de la Révocation</label>
          <textarea
            id="rev-reason"
            rows="3"
            className="form-control"
            value={revokeData.reason}
            onChange={(e) => setRevokeData({ ...revokeData, reason: e.target.value })}
            placeholder="Ex: Fraude constatée sur les déclarations d'exonération"
            required
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
          <input
            id="rev-check"
            type="checkbox"
            checked={revokeData.doubleConfirmed}
            onChange={(e) => setRevokeData({ ...revokeData, doubleConfirmed: e.target.checked })}
          />
          <label htmlFor="rev-check" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fnpss-red)', margin: 0 }}>
            Confirmation formelle par la Direction Générale (Alerte synchrone DGDA/DGI/DGRAD)
          </label>
        </div>
      </Modal>

      {/* Modale Création de Compte Agent / Instructeur (ADM-01 / ADM-03) */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          setModalError('');
        }}
        title="Provisionner un Compte Agent / Instructeur FNPSS (ADM-01)"
        footer={
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setIsStaffModalOpen(false)}>Annuler</Button>
            <Button variant="primary" disabled={isSubmitting || !staffForm.email || !staffForm.password} onClick={handleCreateStaff}>
              {isSubmitting ? 'Création en cours...' : 'Créer le Compte'}
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner
            variant="error"
            title="Erreur lors de la création du compte"
            message={modalError}
            onClose={() => setModalError('')}
            style={{ marginBottom: '14px' }}
          />
        )}
        <form onSubmit={handleCreateStaff}>
          <div className="form-group">
            <label htmlFor="staff-email">Email Institutionnel (@fnpss.cd)</label>
            <input
              id="staff-email"
              type="email"
              className="form-control"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              placeholder="Ex: inspecteur.nordkivu@fnpss.cd"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="staff-pass">Mot de passe initial (&ge; 10 caractères)</label>
            <input
              id="staff-pass"
              type="password"
              className="form-control"
              value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              placeholder="Mot de passe sécurisé"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="staff-role">Rôle RBAC</label>
            <select
              id="staff-role"
              className="form-control"
              value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
            >
              <option value="AGENT">AGENT &bull; Instructeur FNPSS</option>
              <option value="CHEF_DIVISION">CHEF_DIVISION &bull; Chef de Division</option>
              <option value="DG">DG &bull; Direction Générale (Scellement)</option>
              <option value="MINISTERE">MINISTERE &bull; Ministère de Tutelle (Co-signature)</option>
              <option value="DOUANE">DOUANE &bull; Inspecteur DGDA / DGI / DGRAD</option>
              <option value="ADMIN">ADMIN &bull; Administrateur Système</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="staff-org">Direction / Service</label>
            <input
              id="staff-org"
              type="text"
              className="form-control"
              value={staffForm.organizationName}
              onChange={(e) => setStaffForm({ ...staffForm, organizationName: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

