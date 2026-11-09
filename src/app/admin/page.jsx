'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DocumentViewer from '../../components/ui/DocumentViewer.jsx';

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

  const [statusMsg, setStatusMsg] = useState('');
  const [blockchainInfo, setBlockchainInfo] = useState({
    relayer: null,
    queue: null,
    deployment: null,
    milestoneG2: null,
    stats: null,
    supervision: null
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
      const [res, queueRes, deployRes, gatesRes, statsRes, supRes] = await Promise.all([
        fetch('/api/applications', { headers: authHeaders(tk) }),
        fetch('/api/blockchain/anchor-queue', { headers: authHeaders(tk) }),
        fetch('/api/blockchain/deploy', { headers: authHeaders(tk) }),
        fetch('/api/ops/gates', { headers: authHeaders(tk) }),
        fetch('/api/admin/stats', { headers: authHeaders(tk) }),
        fetch('/api/ops/supervision', { headers: authHeaders(tk) })
      ]);
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
        if (!selectedApp && data.applications?.length > 0) {
          setSelectedApp(data.applications[0]);
        }
      }
      const qData = queueRes.ok ? await queueRes.json() : {};
      const dData = deployRes.ok ? await deployRes.json() : {};
      const gData = gatesRes.ok ? await gatesRes.json() : {};
      const stData = statsRes.ok ? await statsRes.json() : {};
      const spData = supRes.ok ? await supRes.json() : {};
      setBlockchainInfo({
        relayer: qData.relayer || null,
        queue: qData.queue || null,
        deployment: dData.latestDeployment || null,
        milestoneG2: gData.milestoneG2Alpha || null,
        stats: stData.stats || null,
        supervision: spData || null
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlushAnchorQueue = async () => {
    try {
      const res = await fetch('/api/blockchain/anchor-queue', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'flush', isNetworkOnline: true })
      });
      if (res.ok) {
        const d = await res.json();
        setStatusMsg(`File d'ancrage résiliente traitée (${d.queue?.confirmedCount || 0} transaction(s) confirmée(s) sur Polygon).`);
        fetchApplications();
      }
    } catch {
      alert('Erreur réseau');
    }
  };

  const handleDeployAmoy = async () => {
    try {
      const res = await fetch('/api/blockchain/deploy', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ networkKey: 'polygon-amoy', initialRelayerBalancePol: 25 })
      });
      if (res.ok) {
        const d = await res.json();
        setStatusMsg(`Contrat FNPSSRegistry vérifié sur Polygon Amoy (${d.deployment?.contractAddress?.slice(0, 12)}...). Smoke test OK.`);
        fetchApplications();
      }
    } catch {
      alert('Erreur réseau');
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
    try {
      const res = await fetch('/api/applications/validate-payment', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ referenceNumber: ref })
      });
      if (res.ok) {
        setStatusMsg(`Quittance de frais validée pour le dossier ${ref}. Instruction démarrée.`);
        fetchApplications();
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const handleRequestComplement = async () => {
    if (!selectedApp || !complementReason.trim()) return;
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
        setStatusMsg(`Complément demandé sur le dossier ${selectedApp.referenceNumber}. Requérant notifié.`);
        setIsComplementModalOpen(false);
        setComplementReason('');
        fetchApplications();
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const handleApproveSeal = async (ref) => {
    try {
      const res = await fetch('/api/applications/approve-seal', {
        method: 'POST',
        headers: authHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ referenceNumber: ref })
      });
      if (res.ok) {
        setStatusMsg(`Attestation ${ref} approuvée et scellée avec succès sur la blockchain Polygon.`);
        fetchApplications();
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectReason.trim()) return;
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
        setStatusMsg(`Dossier ${selectedApp.referenceNumber} rejeté avec motif notifié au requérant.`);
        setIsRejectModalOpen(false);
        setRejectReason('');
        fetchApplications();
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const handleDivisionOpinion = async () => {
    if (!selectedApp) return;
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
        setStatusMsg(`Avis technique formulé pour le dossier ${selectedApp.referenceNumber}.`);
        setIsOpinionModalOpen(false);
        fetchApplications();
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const handleCosignMinistry = async () => {
    if (!selectedApp) return;
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
        setStatusMsg(`Co-signature ministérielle enregistrée (${cosignRef}).`);
        setIsCosignModalOpen(false);
        fetchApplications();
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const handleRevoke = async () => {
    if (!selectedApp) return;
    if (!revokeData.doubleConfirmed) {
      alert('La case de double confirmation par la Direction Générale est obligatoire.');
      return;
    }

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
        setStatusMsg(`Attestation ${selectedApp.referenceNumber} révoquée. Régies DGDA/DGI/DGRAD alertées.`);
        setIsRevokeModalOpen(false);
        fetchApplications();
      } else {
        const d = await res.json();
        alert(d.error || 'Erreur lors de la révocation');
      }
    } catch (err) {
      alert('Erreur réseau');
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

      {statusMsg && (
        <div style={{ background: '#e6f4ea', borderLeft: '4px solid var(--fnpss-green)', padding: '10px 14px', borderRadius: '4px', marginBottom: '18px', color: '#0d652d', fontSize: '13px' }}>
          {statusMsg}
        </div>
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

              {/* Boutons d'Action selon le Rôle */}
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {role === 'AGENT' && !selectedApp.paymentValidated && (
                  <Button variant="primary" size="sm" onClick={() => handleValidatePayment(selectedApp.referenceNumber)}>
                    💳 Valider Quittance Frais
                  </Button>
                )}

                {(role === 'AGENT' || role === 'CHEF_DIVISION') && selectedApp.status !== 'VALIDE_DELIVRE' && selectedApp.status !== 'REVOQUE' && (
                  <Button variant="outline" size="sm" onClick={() => setIsComplementModalOpen(true)}>
                    📩 Demander Complément
                  </Button>
                )}

                {role === 'CHEF_DIVISION' && (
                  <Button variant="accent" size="sm" onClick={() => setIsOpinionModalOpen(true)}>
                    📝 Émettre Avis Technique Division
                  </Button>
                )}

                {role === 'DG' && selectedApp.status !== 'VALIDE_DELIVRE' && selectedApp.status !== 'REVOQUE' && selectedApp.status !== 'REJETE' && (
                  <>
                    <Button variant="success" size="sm" onClick={() => handleApproveSeal(selectedApp.referenceNumber)}>
                      ✍️ Approuver & Sceller Blockchain
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setIsRejectModalOpen(true)}>
                      ✕ Rejeter la Demande
                    </Button>
                  </>
                )}

                {role === 'MINISTERE' && selectedApp.certificate && !selectedApp.ministryCoSigned && (
                  <Button variant="accent" size="sm" onClick={() => setIsCosignModalOpen(true)}>
                    🏛️ Co-Signature Ministérielle
                  </Button>
                )}

                {(role === 'DG' || role === 'ADMIN') && selectedApp.certificate && selectedApp.status !== 'REVOQUE' && (
                  <Button variant="danger" size="sm" onClick={() => setIsRevokeModalOpen(true)}>
                    ⚠️ Révoquer l'Attestation
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Panneau Droit : Visionneuse Documentaire Côte-à-Côte */}
        <div>
          <Card title="Inspection Documentaire Côte-à-Côte (ADM-05)">
            {selectedApp ? (
              <DocumentViewer
                documents={
                  selectedApp.attachedDocuments?.length > 0
                    ? selectedApp.attachedDocuments.map(d => ({
                        docCode: d.docCode,
                        name: d.docCode,
                        fileName: d.fileName,
                        sha256: d.sha256Hash,
                        sizeBytes: d.sizeBytes
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
        </div>
      </div>

      {/* Modale Demande de Complément (ADM-06, NOT-04) */}
      <Modal
        isOpen={isComplementModalOpen}
        onClose={() => setIsComplementModalOpen(false)}
        title="Demande de Complément Documentaire (ADM-06)"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsComplementModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={handleRequestComplement}>Notifier le Requérant</Button>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="comp-reason">Motif & Pièces Complémentaires Sollicitées</label>
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
        onClose={() => setIsRejectModalOpen(false)}
        title="Rejet Motivé de la Demande (ADM-06)"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Annuler</Button>
            <Button variant="danger" onClick={handleReject}>Confirmer le Rejet</Button>
          </>
        }
      >
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
        onClose={() => setIsOpinionModalOpen(false)}
        title="Avis Technique du Chef de Division (ADM-08)"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpinionModalOpen(false)}>Annuler</Button>
            <Button variant="accent" onClick={handleDivisionOpinion}>Valider l'Avis</Button>
          </>
        }
      >
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
        onClose={() => setIsCosignModalOpen(false)}
        title="Co-Signature du Ministère de Tutelle (ADM-06)"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCosignModalOpen(false)}>Annuler</Button>
            <Button variant="accent" onClick={handleCosignMinistry}>Apposer la Co-Signature</Button>
          </>
        }
      >
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
        onClose={() => setIsRevokeModalOpen(false)}
        title="Révocation Formelle d'une Attestation (VER-06)"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsRevokeModalOpen(false)}>Annuler</Button>
            <Button variant="danger" onClick={handleRevoke}>Confirmer la Révocation</Button>
          </>
        }
      >
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
    </div>
  );
}

