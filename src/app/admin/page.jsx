'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DocumentViewer from '../../components/ui/DocumentViewer.jsx';

export default function AdminPage() {
  const [role, setRole] = useState('AGENT');
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedService, setSelectedService] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [isOpinionModalOpen, setIsOpinionModalOpen] = useState(false);
  const [opinionData, setOpinionData] = useState({ favorable: true, note: 'Avis favorable après examen des pièces' });

  const [isCosignModalOpen, setIsCosignModalOpen] = useState(false);
  const [cosignRef, setCosignRef] = useState('CAB/MIN-AS/2026/0150');

  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeData, setRevokeData] = useState({ reason: '', doubleConfirmed: false });

  const [statusMsg, setStatusMsg] = useState('');

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
        if (!selectedApp && data.applications?.length > 0) {
          setSelectedApp(data.applications[0]);
        }
      }
    } catch (err) {
      console.error(err);
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

  const handleValidatePayment = async (ref) => {
    try {
      const res = await fetch('/api/applications/validate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleApproveSeal = async (ref) => {
    try {
      const res = await fetch('/api/applications/approve-seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleDivisionOpinion = async () => {
    if (!selectedApp) return;
    try {
      const res = await fetch('/api/applications/division-opinion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
          {['AGENT', 'CHEF_DIVISION', 'DG', 'MINISTERE'].map((r) => (
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

                {role === 'CHEF_DIVISION' && (
                  <Button variant="accent" size="sm" onClick={() => setIsOpinionModalOpen(true)}>
                    📝 Émettre Avis Technique Division
                  </Button>
                )}

                {role === 'DG' && selectedApp.status !== 'VALIDE_DELIVRE' && selectedApp.status !== 'REVOQUE' && (
                  <Button variant="success" size="sm" onClick={() => handleApproveSeal(selectedApp.referenceNumber)}>
                    ✍️ Approuver & Sceller Blockchain
                  </Button>
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

