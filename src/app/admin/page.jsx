'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DocumentViewer from '../../components/ui/DocumentViewer.jsx';
import DossierThread from '../../components/DossierThread.jsx';
import AlertBanner from '../../components/ui/AlertBanner.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import StatusStepper from '../../components/ui/StatusStepper.jsx';
import SlaIndicator from '../../components/ui/SlaIndicator.jsx';
import BlockchainSignal from '../../components/ui/BlockchainSignal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonKpiGrid, SkeletonCard } from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { getClientToken, getClientUser, saveClientSession, clearClientSession } from '../../lib/client-auth.js';
import { downloadAuthenticatedFile } from '../../lib/secure-download.js';
import QrCodeDisplay from '../../components/ui/QrCodeDisplay.jsx';
import AppIcon from '../../components/ui/AppIcon.jsx';

const STAFF_ROLES = ['AGENT', 'CHEF_DIVISION', 'DG', 'MINISTERE', 'ADMIN'];

const OPINION_TEMPLATES = [
  {
    label: 'Conforme Loi 004/2001',
    favorable: true,
    note: 'Statuts, personnalité juridique et pièces P1 à P6 conformes aux dispositions de la Loi n°004/2001 et aux critères du FNPSS.'
  },
  {
    label: 'Exonération humanitaire justifiée',
    favorable: true,
    note: 'Colisage cohérent avec l\'objet social et le plan d\'action validé. Avis technique favorable pour octroi d\'exonération.'
  },
  {
    label: 'Réserves — précisions requises',
    favorable: false,
    note: 'Avis avec réserves : incohérence partielle relevée entre les pièces techniques P3/P5 et l\'objet de la requête.'
  }
];

function isPendingForRole(app, role) {
  if (!app || !role) return false;
  if (app.status === 'REJETE' || app.status === 'REVOQUE') return false;
  if (role === 'AGENT') return !app.paymentValidated || app.status === 'SOUMIS';
  if (role === 'CHEF_DIVISION') return Boolean(app.paymentValidated && !app.divisionOpinion && app.status !== 'VALIDE_DELIVRE');
  if (role === 'DG') return Boolean(app.paymentValidated && app.divisionOpinion?.favorable && app.status !== 'VALIDE_DELIVRE');
  if (role === 'MINISTERE') return Boolean(app.certificate && !app.ministryCoSigned);
  if (role === 'ADMIN') return app.status !== 'VALIDE_DELIVRE';
  return false;
}

function compareBySlaUrgency(a, b) {
  if (a.status === 'COMPLEMENT_REQUIS' && b.status !== 'COMPLEMENT_REQUIS') return -1;
  if (b.status === 'COMPLEMENT_REQUIS' && a.status !== 'COMPLEMENT_REQUIS') return 1;
  const da = a.slaDueAt ? new Date(a.slaDueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const db = b.slaDueAt ? new Date(b.slaDueAt).getTime() : Number.MAX_SAFE_INTEGER;
  return da - db;
}

export default function AdminPage() {
  const toast = useToast();
  const [role, setRole] = useState('');
  const [staffUser, setStaffUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [workQueueTab, setWorkQueueTab] = useState('TODO'); // 'TODO' | 'COMPLEMENTS' | 'DELIVERED' | 'ALL'
  const [selectedService, setSelectedService] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showExecStats, setShowExecStats] = useState(true);
  const [showTechBanner, setShowTechBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const selectAppWithMobileScroll = (app) => {
    setSelectedApp(app);
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setTimeout(() => {
        document.getElementById('admin-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  // Modales
  const [isOpinionModalOpen, setIsOpinionModalOpen] = useState(false);
  const [qrModalCert, setQrModalCert] = useState(null);
  const [opinionData, setOpinionData] = useState({ favorable: true, note: 'Avis favorable après examen des pièces' });

  const [isComplementModalOpen, setIsComplementModalOpen] = useState(false);
  const [complementReason, setComplementReason] = useState('');

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [isCosignModalOpen, setIsCosignModalOpen] = useState(false);
  const [cosignRef, setCosignRef] = useState('CAB/MIN-AS/2026/0150');

  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeData, setRevokeData] = useState({ reason: '', doubleConfirmed: false });

  const [sealConfirmApp, setSealConfirmApp] = useState(null);

  // Administration (ADM-01 / ADM-03 / ADM-07)
  const [adminTab, setAdminTab] = useState('STAFF'); // 'STAFF' | 'APPLICANTS' | 'AUDIT'
  const [staffList, setStaffList] = useState([]);
  const [applicantsList, setApplicantsList] = useState([]);
  const [applicantQuery, setApplicantQuery] = useState('');
  const [applicantToggleTarget, setApplicantToggleTarget] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    role: 'AGENT',
    organizationName: 'FNPSS - Direction des Opérations',
    province: 'Kinshasa'
  });

  const [alertInfo, setAlertInfo] = useState(null);
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notify = (type, message, title = '', action = null) => {
    setAlertInfo({ type, message, title, action });
    if (type === 'success') toast.success(message, title || 'Succès');
    else if (type === 'error') toast.error(message, title || 'Erreur');
    else if (type === 'warning') toast.warning(message, title || 'Attention');
    else toast.info(message, title || 'Information');
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

  const ensureStaffSession = useCallback(async () => {
    const existingToken = getClientToken();
    if (!existingToken) {
      setStaffUser(null);
      setRole('');
      setAuthChecked(true);
      setIsLoading(false);
      return '';
    }
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${existingToken}` }
      });
      if (res.ok) {
        const d = await res.json();
        if (d.user && STAFF_ROLES.includes(d.user.role)) {
          setSessionToken(existingToken);
          setStaffUser(d.user);
          setRole(d.user.role);
          saveClientSession(existingToken, d.user);
          setAuthChecked(true);
          return existingToken;
        }
      }
    } catch {
      const localUser = getClientUser();
      if (localUser && STAFF_ROLES.includes(localUser.role)) {
        setSessionToken(existingToken);
        setStaffUser(localUser);
        setRole(localUser.role);
        setAuthChecked(true);
        return existingToken;
      }
    }
    setStaffUser(null);
    setRole('');
    setAuthChecked(true);
    setIsLoading(false);
    return '';
  }, []);

  const switchStaffAccount = () => {
    clearClientSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  };

  const authHeaders = useCallback((tokenOverride = sessionToken, extra = {}) => ({
    ...(tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : {}),
    ...extra
  }), [sessionToken]);

  const fetchApplications = useCallback(async (tokenOverride, roleOverride) => {
    setIsLoading(true);
    try {
      const tk = tokenOverride || sessionToken || (await ensureStaffSession());
      if (!tk) {
        setIsLoading(false);
        return;
      }
      const hdrs = { Authorization: `Bearer ${tk}` };
      const [res, queueRes, deployRes, gatesRes, statsRes, supRes, pilotRes] = await Promise.all([
        fetch('/api/applications', { headers: hdrs }),
        fetch('/api/blockchain/anchor-queue', { headers: hdrs }),
        fetch('/api/blockchain/deploy', { headers: hdrs }),
        fetch('/api/ops/gates', { headers: hdrs }),
        fetch('/api/admin/stats', { headers: hdrs }),
        fetch('/api/ops/supervision', { headers: hdrs }),
        fetch('/api/ops/pilot', { headers: hdrs })
      ]);
      const data = await res.json();
      if (data.success) {
        const list = (data.applications || []).slice().sort(compareBySlaUrgency);
        setApplications(list);
        setSelectedApp((prev) => {
          if (prev) {
            const refreshed = list.find((a) => a.referenceNumber === prev.referenceNumber);
            if (refreshed) return refreshed;
          }
          const activeRole = roleOverride || getClientUser()?.role || '';
          const firstTodo = list.find((a) => isPendingForRole(a, activeRole));
          return firstTodo || (list.length > 0 ? list[0] : null);
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
      const activeRole = roleOverride || getClientUser()?.role || '';
      if (activeRole === 'ADMIN') {
        const [staffRes, applicantsRes, auditRes] = await Promise.all([
          fetch('/api/admin/staff', { headers: hdrs }).catch(() => null),
          fetch('/api/admin/applicants', { headers: hdrs }).catch(() => null),
          fetch('/api/admin/audit', { headers: hdrs }).catch(() => null)
        ]);
        if (staffRes?.ok) {
          const staffData = await staffRes.json();
          setStaffList(staffData.staff || []);
        }
        if (applicantsRes?.ok) {
          const appData = await applicantsRes.json();
          setApplicantsList(appData.applicants || []);
        }
        if (auditRes?.ok) {
          const audData = await auditRes.json();
          setAuditLogs(audData.logs || []);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger la console back-office.', 'Erreur Réseau');
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, ensureStaffSession, toast]);

  useEffect(() => {
    ensureStaffSession().then((tk) => {
      if (tk) fetchApplications(tk, getClientUser()?.role);
    });
  }, [ensureStaffSession, fetchApplications]);

  const refreshAll = () => {
    window.dispatchEvent(new Event('fnpss-notif-refresh'));
    fetchApplications();
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
        refreshAll();
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
        refreshAll();
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
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        notify('error', d.error || 'Erreur lors de la validation du paiement.', 'Validation Refusée');
      }
    } catch {
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
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors de la demande de complément.';
        setModalError(msg);
        notify('error', msg, 'Demande de Complément Refusée');
      }
    } catch {
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
        setSealConfirmApp(null);
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        notify('error', d.error || 'Erreur lors de l\'approbation et du scellement.', 'Approbation Refusée');
      }
    } catch {
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
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors du rejet du dossier.';
        setModalError(msg);
        notify('error', msg, 'Rejet Refusé');
      }
    } catch {
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
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors de l\'émission de l\'avis technique.';
        setModalError(msg);
        notify('error', msg, 'Avis Technique Refusé');
      }
    } catch {
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
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors de l\'enregistrement de la co-signature.';
        setModalError(msg);
        notify('error', msg, 'Co-Signature Refusée');
      }
    } catch {
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
      refreshAll();
    } catch {
      setModalError('Erreur de communication réseau.');
      notify('error', 'Erreur réseau lors de la création du compte.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleApplicantStatus = async () => {
    if (!applicantToggleTarget) return;
    const nextStatus = applicantToggleTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/applicants', {
        method: 'PUT',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          userId: applicantToggleTarget.id,
          status: nextStatus,
          reason: nextStatus === 'SUSPENDED' ? 'Suspension administrative depuis console ADMIN' : 'Réactivation administrative'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify('error', data.error || 'Action refusée sur le compte requérant.', 'Erreur ADM-03');
      } else {
        notify('success', `Compte ${applicantToggleTarget.email} passé à ${nextStatus}.`, 'Statut Requérant Mis à Jour');
        setApplicantToggleTarget(null);
        refreshAll();
      }
    } catch {
      notify('error', 'Erreur réseau lors de la mise à jour du requérant.', 'Erreur Réseau');
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
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.error || 'Erreur lors de la révocation';
        setModalError(msg);
        notify('error', msg, 'Révocation Refusée');
      }
    } catch {
      setModalError('Erreur de communication réseau.');
      notify('error', 'Erreur réseau lors de la révocation.', 'Erreur Réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authChecked && !role) {
    return (
      <div style={{ maxWidth: '580px', margin: '48px auto' }}>
        <Card title="Console d'Instruction Back-Office FNPSS — Accès Restreint (ADM-01)">
          <AlertBanner
            variant="warning"
            title="Authentification Instructeur Requise"
            message="Cet espace back-office est strictement réservé aux agents habilités du FNPSS et du Ministère de tutelle (AGENT, CHEF_DIVISION, DG, MINISTERE, ADMIN). Veuillez vous connecter avec votre compte institutionnel."
            style={{ marginBottom: '18px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <a href="/" className="btn btn-outline" style={{ textDecoration: 'none' }}>
              &larr; Retour à l&apos;accueil
            </a>
            <Button variant="brand" onClick={switchStaffAccount}>
              <AppIcon name="security" size="sm" />
              <span>Se connecter avec un Compte Instructeur (@fnpss.cd)</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const todoCount = applications.filter((a) => isPendingForRole(a, role)).length;
  const complementsCount = applications.filter((a) => a.status === 'COMPLEMENT_REQUIS').length;
  const deliveredCount = applications.filter((a) => a.status === 'VALIDE_DELIVRE').length;
  const activeInstructionCount = applications.filter((a) => a.status === 'EN_COURS_INSTRUCTION' || a.status === 'SOUMIS').length;

  const filteredApps = applications.filter((app) => {
    if (selectedService !== 'ALL' && app.serviceCode !== selectedService) return false;
    if (selectedStatus !== 'ALL' && app.status !== selectedStatus) return false;
    if (workQueueTab === 'TODO' && !isPendingForRole(app, role)) return false;
    if (workQueueTab === 'COMPLEMENTS' && app.status !== 'COMPLEMENT_REQUIS') return false;
    if (workQueueTab === 'DELIVERED' && app.status !== 'VALIDE_DELIVRE') return false;
    return true;
  });

  const filteredApplicants = applicantsList.filter((u) => {
    if (!applicantQuery.trim()) return true;
    const q = applicantQuery.toLowerCase();
    return `${u.organizationName || ''} ${u.email || ''} ${u.province || ''}`.toLowerCase().includes(q);
  });

  const filteredAuditLogs = auditLogs.filter((l) => {
    if (!auditActionFilter) return true;
    return String(l.action || '').includes(auditActionFilter);
  });

  return (
    <div>
      {/* Bandeau d'Identité & Rôle Instructeur Authentifié */}
      <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border)', borderLeft: '4px solid var(--fnpss-orange)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <strong style={{ color: 'var(--fnpss-navy)', fontSize: '15px' }}>Console d&apos;Instruction Back-Office FNPSS</strong>
          <div className="text-muted" style={{ fontSize: '12px' }}>Circuit multi-niveaux d&apos;approbation et contrôle de recevabilité</div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Agent connecté : <strong style={{ color: 'var(--fnpss-navy)' }}>{staffUser?.email || 'Session active'}</strong>
          </span>
          <Badge status="brand">Rôle RBAC : {role || 'Vérification...'}</Badge>
          <Button variant="outline" size="sm" onClick={switchStaffAccount}>
            <AppIcon name="swap" size="sm" />
            <span>Changer de Compte</span>
          </Button>
        </div>
      </div>

      {/* KPI Back-Office adaptés au rôle */}
      {isLoading && applications.length === 0 ? (
        <SkeletonKpiGrid count={4} />
      ) : (
        <div className="kpi-grid" style={{ marginBottom: '18px' }}>
          <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-orange)' }}>
            <div className="lbl">À traiter ({role || 'Rôle'})</div>
            <div className="val">{todoCount}</div>
            <div className="sub">Dossiers attendant votre action</div>
          </div>
          <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-blue)' }}>
            <div className="lbl">Instruction &amp; Dépôts</div>
            <div className="val">{activeInstructionCount}</div>
            <div className="sub">{complementsCount} complément(s) en attente</div>
          </div>
          <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-green)' }}>
            <div className="lbl">Attestations Délivrées</div>
            <div className="val">{deliveredCount}</div>
            <div className="sub">Ancrées Polygon Amoy</div>
          </div>
          <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-navy)' }}>
            <div className="lbl">Recettes Validées (ADM-09)</div>
            <div className="val">{blockchainInfo.stats?.financials?.totalCollectedFeesUsd ?? 0} $</div>
            <div className="sub">Quittances contrôlées FNPSS</div>
          </div>
        </div>
      )}

      {/* Bandeau Relayer Blockchain Polygon Amoy, File Résiliente & Jalon G2 Alpha (BLK-09..11, GOV-12) */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '18px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>
              <strong>Réseau :</strong> {blockchainInfo.deployment?.network?.name || 'Polygon Amoy Testnet (80002)'}
            </span>
            <Badge status="valide">Jalon G2 Alpha : {blockchainInfo.milestoneG2?.status || 'VALIDATED'}</Badge>
            <Badge status="valide">Jalon G3 Beta : {blockchainInfo.supervision?.milestoneG3Beta?.status || 'VALIDATED'}</Badge>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowTechBanner((v) => !v)}>
            {showTechBanner ? 'Masquer détails réseau ▴' : 'Détails réseau & outils ▾'}
          </Button>
        </div>

        {showTechBanner && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="mono">
                <strong>Contrat :</strong> {(blockchainInfo.deployment?.contractAddress || '0x1111...').slice(0, 14)}...
              </span>
              <span>
                <strong>Relayer Paymaster :</strong> 0 crypto requérant ({blockchainInfo.relayer?.anchoredDocumentsCount ?? 0} actes ancrés)
              </span>
              <span>
                <strong>File résiliente (BLK-10) :</strong> {blockchainInfo.queue?.queuedCount ?? 0} en attente / {blockchainInfo.queue?.confirmedCount ?? 0} confirmé(s)
              </span>
              <span>
                <strong>Budget 3G (REQ-12) :</strong> {blockchainInfo.supervision?.req12PerformanceBudget?.estimated3gLoadSeconds ?? '1.64'}s (&lt; 3,0s)
              </span>
            </div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <Button variant="outline" size="sm" isLoading={isSubmitting} onClick={handleFlushAnchorQueue}>
                <AppIcon name="sync" size="xs" />
                <span>Synchroniser File d&apos;Ancrage</span>
              </Button>
              {(role === 'DG' || role === 'ADMIN') && (
                <>
                  <Button variant="primary" size="sm" isLoading={isSubmitting} onClick={handleDeployAmoy}>
                    <AppIcon name="chain" size="xs" />
                    <span>Qualifier Contrat Amoy (BLK-11)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await downloadAuthenticatedFile('/api/admin/stats?format=csv', sessionToken, {
                          fallbackFileName: 'fnpss-statistiques-reconciliation.csv'
                        });
                        toast.success('Export CSV statistiques téléchargé.');
                      } catch (err) {
                        notify('error', err.message || 'Export CSV impossible.', 'Échec Export');
                      }
                    }}
                  >
                    <AppIcon name="stats" size="xs" />
                    <span>Export CSV (ADM-09)</span>
                  </Button>
                  <a
                    href="/guide"
                    className="btn btn-outline btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    <AppIcon name="training" size="xs" />
                    <span>Guides &amp; Formations (DEP-03..05)</span>
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vue Exécutive & Recettes DG / Admin (ADM-09) */}
      {(role === 'DG' || role === 'ADMIN') && blockchainInfo.stats && (() => {
        const execStats = blockchainInfo.stats;
        const serviceList = Object.values(execStats.byService || {});
        const maxServiceTotal = Math.max(1, ...serviceList.map((s) => s.total || 0));
        const statusEntries = Object.entries(execStats.byStatus || {});
        return (
          <Card
            title="Vue Exécutive & Recettes (ADM-09)"
            subtitle="Pilotage consolidé des encaissements, statuts d'instruction et volumes par procédure S1–S6"
            actions={
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowExecStats((v) => !v)}>
                {showExecStats ? 'Masquer' : 'Afficher'}
              </Button>
            }
          >
            {showExecStats ? (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-green)' }}>
                    <div className="text-muted">Recettes réconciliées</div>
                    <strong style={{ fontSize: '18px', color: 'var(--fnpss-navy)' }}>
                      {execStats.financials?.totalCollectedFeesUsd ?? 0} USD
                    </strong>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {(execStats.financials?.totalCollectedFeesCdf ?? 0).toLocaleString('fr-FR')} CDF &bull; {execStats.financials?.validatedPaymentsCount ?? 0} quittance(s)
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-blue)' }}>
                    <div className="text-muted">Actes &amp; Co-signatures</div>
                    <strong style={{ fontSize: '18px', color: 'var(--fnpss-navy)' }}>
                      {execStats.totals?.activeCertificatesCount ?? 0} actif(s)
                    </strong>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {execStats.totals?.ministryCoSignedCount ?? 0} co-signé(s) Ministère &bull; {execStats.totals?.registeredOrganizations ?? 0} ONG
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-orange-accessible)' }}>
                    <div className="text-muted">Répartition par statut</div>
                    <div className="flex gap-1" style={{ flexWrap: 'wrap', marginTop: '4px' }}>
                      {statusEntries.map(([stKey, stVal]) => (
                        <Badge key={stKey} status="neutral">{stKey}: {stVal}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {serviceList.length > 0 && (
                  <div role="region" aria-label="Volume des dossiers par service S1 à S6">
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-navy)', marginBottom: '8px' }}>
                      Volumes par service FNPSS (S1–S6)
                    </div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {serviceList.map((svc) => {
                        const pct = Math.round(((svc.total || 0) / maxServiceTotal) * 100);
                        return (
                          <div key={svc.code} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 78px', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                            <span className="mono" style={{ fontWeight: 700, color: 'var(--fnpss-navy)' }}>{svc.code}</span>
                            <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${svc.total > 0 ? Math.max(8, pct) : 0}%`,
                                  height: '100%',
                                  background: 'var(--fnpss-blue)',
                                  borderRadius: '999px'
                                }}
                              />
                            </div>
                            <span className="text-muted" style={{ textAlign: 'right' }}>
                              {svc.total} ({svc.validated} val.)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted" style={{ fontSize: '12px' }}>
                Vue exécutive réduite — cliquez sur « Afficher » pour consulter les graphiques et recettes.
              </span>
            )}
          </Card>
        );
      })()}

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

      {/* Grille Double Panneau Responsive (Inspection côte-à-côte) */}
      <div className="admin-split-grid">
        {/* Panneau Gauche : File de Travail & Fiche d'Instruction */}
        <div>
          <Card
            id="admin-workqueue"
            title="Dossiers en File d'Attente"
            actions={
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <select
                  className="form-control"
                  aria-label="Filtrer par service"
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
                  aria-label="Filtrer par statut"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '11.5px' }}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">Tous Statuts</option>
                  <option value="SOUMIS">Soumis</option>
                  <option value="EN_COURS_INSTRUCTION">En instruction</option>
                  <option value="COMPLEMENT_REQUIS">Complément requis</option>
                  <option value="VALIDE_DELIVRE">Validé</option>
                  <option value="REJETE">Rejeté</option>
                  <option value="REVOQUE">Révoqué</option>
                </select>
              </div>
            }
          >
            {/* Onglets File de travail priorisée */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {[
                { key: 'TODO', label: `À traiter (${todoCount})` },
                { key: 'COMPLEMENTS', label: `Compléments (${complementsCount})` },
                { key: 'DELIVERED', label: `Délivrés (${deliveredCount})` },
                { key: 'ALL', label: `Tous (${applications.length})` }
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setWorkQueueTab(t.key)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: workQueueTab === t.key ? 'var(--fnpss-navy)' : '#f8fafc',
                    color: workQueueTab === t.key ? '#ffffff' : 'var(--text-main)',
                    borderColor: workQueueTab === t.key ? 'var(--fnpss-navy)' : 'var(--border)'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {isLoading ? (
                <SkeletonCard rows={3} />
              ) : filteredApps.length === 0 ? (
                <EmptyState
                  icon="success"
                  title="Aucun dossier dans cette file"
                  description={workQueueTab === 'TODO' ? 'Aucun dossier en attente de votre rôle actuellement. Consultez l\'onglet « Tous » pour l\'historique.' : 'Modifiez vos filtres pour voir les autres dossiers.'}
                  action={workQueueTab !== 'ALL' ? <Button size="sm" variant="outline" onClick={() => setWorkQueueTab('ALL')}>Voir tous les dossiers</Button> : null}
                />
              ) : (
                filteredApps.map((app) => {
                  const isSelected = selectedApp?.referenceNumber === app.referenceNumber;
                  const urgentForMe = isPendingForRole(app, role);
                  return (
                    <div
                      key={app.referenceNumber}
                      onClick={() => selectAppWithMobileScroll(app)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectAppWithMobileScroll(app); }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${isSelected ? 'var(--fnpss-blue)' : 'var(--border)'}`,
                        borderLeft: `4px solid ${urgentForMe ? 'var(--fnpss-orange)' : isSelected ? 'var(--fnpss-blue)' : 'var(--border)'}`,
                        background: isSelected ? '#eef6fc' : '#ffffff',
                        marginBottom: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="flex justify-between items-center" style={{ marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--fnpss-navy)', fontSize: '12.5px' }}>
                          {app.referenceNumber}
                        </span>
                        <div className="flex gap-2 items-center">
                          <Badge status="soumis">{app.serviceCode}</Badge>
                          <SlaIndicator application={app} />
                        </div>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{app.organizationName}</div>
                      <div className="text-muted" style={{ fontSize: '11.5px' }}>{app.projectTitle}</div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Fiche d'Instruction & Actions */}
          {selectedApp && (
            <Card
              id="admin-detail-panel"
              title={`Fiche d'Instruction : ${selectedApp.referenceNumber}`}
              actions={
                <a href="#admin-workqueue" className="btn btn-sm btn-outline mobile-only" style={{ textDecoration: 'none' }}>
                  ↑ Liste
                </a>
              }
            >
              <div style={{ marginBottom: '14px' }}>
                <StatusStepper application={selectedApp} compact />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <SlaIndicator application={selectedApp} />
                <BlockchainSignal application={selectedApp} showLink />
              </div>

              <div className="meta-2col-grid" style={{ fontSize: '12.5px', marginBottom: '16px' }}>
                <div><span className="text-muted">Statut :</span> <strong>{selectedApp.status}</strong></div>
                <div><span className="text-muted">Frais :</span> <strong>{selectedApp.paymentValidated ? 'Quittance Validée' : 'En attente'}</strong></div>
                <div><span className="text-muted">Avis Division :</span> <strong>{selectedApp.divisionOpinion ? (selectedApp.divisionOpinion.favorable ? 'Favorable' : 'Réservé') : 'Non émis'}</strong></div>
                <div><span className="text-muted">Co-signature :</span> <strong>{selectedApp.ministryCoSigned ? 'Apposée' : 'Non apposée'}</strong></div>
              </div>

              {selectedApp.certificate && (
                <div style={{ background: '#eef6fc', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--fnpss-navy)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <AppIcon name="chain" size="sm" />
                    <span>Attestation Scellée : <span className="mono">{selectedApp.certificate.certificateNumber}</span></span>
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
                      <AppIcon name="external" size="xs" />
                      <span>Voir sur PolygonScan Amoy</span>
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="success"
                      style={{ fontSize: '11px' }}
                      onClick={async () => {
                        try {
                          await downloadAuthenticatedFile(
                            `/api/applications/certificate.pdf?ref=${encodeURIComponent(selectedApp.referenceNumber)}`,
                            sessionToken,
                            { fallbackFileName: `${selectedApp.referenceNumber}.pdf` }
                          );
                          toast.success('Attestation PDF scellée téléchargée.');
                        } catch (err) {
                          notify('error', err.message || 'Téléchargement PDF impossible.', 'PDF indisponible');
                        }
                      }}
                    >
                      <AppIcon name="pdfFile" size="xs" />
                      <span>Télécharger l&apos;Attestation PDF Scellée</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      style={{ fontSize: '11px' }}
                      onClick={() => setQrModalCert(selectedApp.certificate)}
                    >
                      <AppIcon name="qr" size="xs" />
                      <span>Afficher / Télécharger QR Code</span>
                    </Button>
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
                    message="La quittance bancaire (320 USD) doit impérativement être validée par un compte habilité AGENT avant que le Chef de Division puisse formuler un avis technique."
                    action={
                      <Button size="sm" variant="primary" onClick={switchStaffAccount}>
                        <AppIcon name="security" size="xs" />
                        <span>Se connecter avec un compte AGENT</span>
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
                      <Button size="sm" variant="primary" onClick={switchStaffAccount}>
                        <AppIcon name="security" size="xs" />
                        <span>Se connecter avec un compte AGENT</span>
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
                      <Button size="sm" variant="accent" onClick={switchStaffAccount}>
                        <AppIcon name="security" size="xs" />
                        <span>Se connecter avec un compte CHEF_DIVISION</span>
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
                    variant="brand"
                    size="sm"
                    isLoading={isSubmitting}
                    loadingText="Validation..."
                    onClick={() => handleValidatePayment(selectedApp.referenceNumber)}
                  >
                    <AppIcon name="payment" size="xs" />
                    <span>Valider Quittance Frais</span>
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
                    <AppIcon name="complement" size="xs" />
                    <span>Demander Complément</span>
                  </Button>
                )}

                {role === 'CHEF_DIVISION' && (
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={isSubmitting || !selectedApp.paymentValidated}
                    disabledReason="Quittance des frais en attente de validation par l'agent (ADM-08)"
                    onClick={() => {
                      setModalError('');
                      setIsOpinionModalOpen(true);
                    }}
                  >
                    <AppIcon name="review" size="xs" />
                    <span>Émettre Avis Technique Division {!selectedApp.paymentValidated && '(En attente validation quittance)'}</span>
                  </Button>
                )}

                {role === 'DG' && selectedApp.status !== 'VALIDE_DELIVRE' && selectedApp.status !== 'REVOQUE' && selectedApp.status !== 'REJETE' && (
                  <>
                    <Button
                      variant="success"
                      size="sm"
                      disabled={isSubmitting || !selectedApp.paymentValidated || !selectedApp.divisionOpinion?.favorable}
                      disabledReason={!selectedApp.paymentValidated ? 'Quittance non validée' : 'Avis technique favorable de la division requis (ADM-06)'}
                      onClick={() => setSealConfirmApp(selectedApp)}
                    >
                      <AppIcon name="seal" size="xs" />
                      <span>{isSubmitting ? 'Scellement Polygon en cours...' : 'Approuver & Sceller Blockchain'} {!selectedApp.divisionOpinion?.favorable && '(En attente avis division)'}</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setModalError('');
                        setIsRejectModalOpen(true);
                      }}
                    >
                      <AppIcon name="close" size="xs" />
                      <span>Rejeter la Demande</span>
                    </Button>
                  </>
                )}

                {role === 'MINISTERE' && selectedApp.certificate && !selectedApp.ministryCoSigned && (
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalError('');
                      setIsCosignModalOpen(true);
                    }}
                  >
                    <AppIcon name="institution" size="xs" />
                    <span>Co-Signature Ministérielle</span>
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
                    <AppIcon name="gppBad" size="xs" />
                    <span>Révoquer l&apos;Attestation</span>
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
              <EmptyState icon="documents" title="Aucun dossier sélectionné" description="Sélectionnez un dossier à gauche pour inspecter ses pièces justificatives." />
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

      {/* Panneau d'Administration Système (ADM-01 / ADM-03 / ADM-07) */}
      {role === 'ADMIN' && (
        <Card
          title="Administration Système & Gouvernance FNPSS (ADM-01 / ADM-03 / ADM-07)"
          style={{ marginTop: '20px' }}
          actions={
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button size="sm" variant={adminTab === 'STAFF' ? 'primary' : 'outline'} onClick={() => setAdminTab('STAFF')}>
                <AppIcon name="users" size="xs" />
                <span>Agents ({staffList.length})</span>
              </Button>
              <Button size="sm" variant={adminTab === 'APPLICANTS' ? 'primary' : 'outline'} onClick={() => setAdminTab('APPLICANTS')}>
                <AppIcon name="business" size="xs" />
                <span>Requérants ONG ({applicantsList.length})</span>
              </Button>
              <Button size="sm" variant={adminTab === 'AUDIT' ? 'primary' : 'outline'} onClick={() => setAdminTab('AUDIT')}>
                <AppIcon name="audit" size="xs" />
                <span>Journal d&apos;Audit ({auditLogs.length})</span>
              </Button>
            </div>
          }
        >
          {adminTab === 'STAFF' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <Button variant="brand" size="sm" onClick={() => { setModalError(''); setIsStaffModalOpen(true); }}>
                  <AppIcon name="userAdd" size="xs" />
                  <span>Créer un Compte Agent / Instructeur</span>
                </Button>
              </div>
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
            </div>
          )}

          {adminTab === 'APPLICANTS' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', maxWidth: '320px' }}
                  placeholder="Rechercher organisation, email, province..."
                  value={applicantQuery}
                  onChange={(e) => setApplicantQuery(e.target.value)}
                />
              </div>
              {filteredApplicants.length === 0 ? (
                <EmptyState icon="business" title="Aucun compte requérant trouvé" />
              ) : (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Organisation</th>
                        <th>Email</th>
                        <th>Province</th>
                        <th>Dossiers</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplicants.map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 700 }}>{u.organizationName || 'N/A'}</td>
                          <td className="mono">{u.email}</td>
                          <td>{u.province || 'N/A'}</td>
                          <td>{u.applicationsCount ?? 0}</td>
                          <td><Badge status={u.status === 'ACTIVE' ? 'valide' : 'danger'}>{u.status}</Badge></td>
                          <td>
                            <Button
                              size="sm"
                              variant={u.status === 'ACTIVE' ? 'danger' : 'success'}
                              onClick={() => setApplicantToggleTarget(u)}
                            >
                              {u.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminTab === 'AUDIT' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', maxWidth: '300px' }}
                  placeholder="Filtrer par action (ex: CERTIFICATE)..."
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value.toUpperCase())}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await downloadAuthenticatedFile('/api/admin/audit?format=csv', sessionToken, {
                        fallbackFileName: 'fnpss-journal-audit.csv'
                      });
                      toast.success('Journal d\'audit CSV téléchargé.');
                    } catch (err) {
                      notify('error', err.message || 'Export audit CSV impossible.', 'Échec Export');
                    }
                  }}
                >
                  <AppIcon name="download" size="xs" />
                  <span>Exporter Audit CSV (ADM-07)</span>
                </Button>
              </div>
              {filteredAuditLogs.length === 0 ? (
                <EmptyState icon="audit" title="Aucune trace d'audit correspondante" />
              ) : (
                <div className="table-responsive" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Horodatage</th>
                        <th>Acteur / Rôle</th>
                        <th>Action</th>
                        <th>Dossier Cible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.slice(0, 40).map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '11.5px' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : ''}</td>
                          <td><Badge status="neutral">{log.actorRole}</Badge> <span className="mono" style={{ fontSize: '11px' }}>{log.actorId}</span></td>
                          <td className="mono" style={{ fontWeight: 700, fontSize: '11.5px' }}>{log.action}</td>
                          <td className="mono" style={{ fontSize: '12px' }}>{log.targetId || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Confirmation DG avant scellement Blockchain */}
      <ConfirmDialog
        isOpen={Boolean(sealConfirmApp)}
        onClose={() => setSealConfirmApp(null)}
        onConfirm={() => sealConfirmApp && handleApproveSeal(sealConfirmApp.referenceNumber)}
        title="Confirmer l'Approbation & le Scellement Blockchain"
        message={`Vous êtes sur le point d'approuver officiellement le dossier ${sealConfirmApp?.referenceNumber || ''} et d'inscrire son empreinte SHA-256 de manière irréversible sur la Blockchain Polygon Amoy.`}
        details={
          sealConfirmApp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Organisation :</strong> {sealConfirmApp.organizationName}</div>
              <div><strong>Service :</strong> {sealConfirmApp.serviceCode} &bull; <strong>Projet :</strong> {sealConfirmApp.projectTitle}</div>
              <div><strong>Préalables :</strong> Quittance validée &bull; Avis division favorable</div>
            </div>
          )
        }
        confirmLabel="Approuver & Sceller sur Polygon"
        variant="success"
        isLoading={isSubmitting}
      />

      {/* Confirmation Admin suspension / réactivation Requérant */}
      <ConfirmDialog
        isOpen={Boolean(applicantToggleTarget)}
        onClose={() => setApplicantToggleTarget(null)}
        onConfirm={handleToggleApplicantStatus}
        title={applicantToggleTarget?.status === 'ACTIVE' ? 'Suspendre le compte requérant' : 'Réactiver le compte requérant'}
        message={`Confirmez-vous le changement de statut du compte ${applicantToggleTarget?.email || ''} (${applicantToggleTarget?.organizationName || ''}) ?`}
        confirmLabel={applicantToggleTarget?.status === 'ACTIVE' ? 'Confirmer la suspension' : 'Confirmer la réactivation'}
        variant={applicantToggleTarget?.status === 'ACTIVE' ? 'danger' : 'success'}
        isLoading={isSubmitting}
      />

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
            <Button variant="primary" isLoading={isSubmitting} loadingText="Notification en cours..." disabled={!complementReason.trim()} onClick={handleRequestComplement}>
              Notifier le Requérant
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner variant="error" title="Erreur lors de la demande de complément" message={modalError} onClose={() => setModalError('')} style={{ marginBottom: '14px' }} />
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
            <Button variant="danger" isLoading={isSubmitting} loadingText="Traitement..." disabled={!rejectReason.trim()} onClick={handleReject}>
              Confirmer le Rejet
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner variant="error" title="Erreur lors du rejet du dossier" message={modalError} onClose={() => setModalError('')} style={{ marginBottom: '14px' }} />
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
              variant="brand"
              isLoading={isSubmitting}
              loadingText="Enregistrement..."
              disabled={!selectedApp?.paymentValidated}
              onClick={handleDivisionOpinion}
            >
              Valider l&apos;Avis
            </Button>
          </>
        }
      >
        {!selectedApp?.paymentValidated && (
          <AlertBanner
            variant="warning"
            title="Quittance Non Validée (Règle ADM-08)"
            message="La quittance des frais bancaires (320 USD) doit obligatoirement être validée par un agent avant que le Chef de Division puisse formuler un avis technique."
            style={{ marginBottom: '14px' }}
          />
        )}
        {modalError && (
          <AlertBanner variant="error" title="Erreur lors de l'enregistrement de l'avis" message={modalError} onClose={() => setModalError('')} style={{ marginBottom: '14px' }} />
        )}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-navy)', marginBottom: '6px' }}>
            Modèles de motivation rapide :
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {OPINION_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => setOpinionData({ favorable: tpl.favorable, note: tpl.note })}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '11px' }}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="opinion-sel">Sens de l&apos;Avis Technique</label>
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
            <Button variant="brand" isLoading={isSubmitting} loadingText="Enregistrement..." disabled={!cosignRef.trim()} onClick={handleCosignMinistry}>
              Apposer la Co-Signature
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner variant="error" title="Erreur lors de la co-signature" message={modalError} onClose={() => setModalError('')} style={{ marginBottom: '14px' }} />
        )}
        <div className="form-group">
          <label htmlFor="cosign-input">Numéro de Référence de l&apos;Arrêté Ministériel</label>
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
            <Button variant="danger" isLoading={isSubmitting} loadingText="Révocation..." disabled={!revokeData.reason.trim() || !revokeData.doubleConfirmed} onClick={handleRevoke}>
              Confirmer la Révocation
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner variant="error" title="Erreur lors de la révocation" message={modalError} onClose={() => setModalError('')} style={{ marginBottom: '14px' }} />
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
            <Button variant="primary" isLoading={isSubmitting} loadingText="Création..." disabled={!staffForm.email || !staffForm.password} onClick={handleCreateStaff}>
              Créer le Compte
            </Button>
          </>
        }
      >
        {modalError && (
          <AlertBanner variant="error" title="Erreur lors de la création du compte" message={modalError} onClose={() => setModalError('')} style={{ marginBottom: '14px' }} />
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

      {/* Modale QR Code Officiel Attestation */}
      <Modal
        isOpen={Boolean(qrModalCert)}
        onClose={() => setQrModalCert(null)}
        title={`QR Code de Vérification — ${qrModalCert?.certificateNumber || ''}`}
        footer={
          <Button variant="outline" onClick={() => setQrModalCert(null)}>
            Fermer
          </Button>
        }
      >
        {qrModalCert && (
          <QrCodeDisplay
            value={
              qrModalCert.qrVerificationUrl ||
              `${typeof window !== 'undefined' ? window.location.origin : 'https://guichetuniquefnpss.vercel.app'}/verifier?hash=${qrModalCert.docHash}&cert=${encodeURIComponent(qrModalCert.certificateNumber)}`
            }
            certificateNumber={qrModalCert.certificateNumber}
            label="QR Code Officiel Scellé Polygon"
          />
        )}
      </Modal>
    </div>
  );
}
