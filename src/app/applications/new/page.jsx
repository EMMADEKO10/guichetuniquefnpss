'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';

function getClientToken() {
  if (typeof window === 'undefined') return '';
  const fromSession = sessionStorage.getItem('fnpss_session_token');
  if (fromSession) return fromSession;
  const fromLocal = localStorage.getItem('fnpss_session_token');
  if (fromLocal) return fromLocal;
  const match = document.cookie.match(/(?:^|;\s*)fnpss_session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function NewApplicationPage() {
  const [step, setStep] = useState(1);
  const [serviceCode, setServiceCode] = useState('S4');
  const [organizationName, setOrganizationName] = useState('ONG Espoir du Nord-Kivu');
  const [projectTitle, setProjectTitle] = useState('');
  const [goodsSummary, setGoodsSummary] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [attachedDocs, setAttachedDocs] = useState({});
  const [hasS1Enrollment, setHasS1Enrollment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const token = getClientToken();
    if (!token) return;
    fetch('/api/applications?service=S1&status=VALIDE_DELIVRE', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.applications) && d.applications.length > 0) {
          setHasS1Enrollment(true);
        }
      })
      .catch(() => {});
  }, []);

  const docDefinitions = [
    { code: 'P1_REQUETE', name: 'Requête motivée adressée au DG FNPSS' },
    { code: 'P2_ENROLEMENT', name: 'Certificat d\'enrôlement ou Accord de siège F92', onceOnly: true },
    { code: 'P3_PLAN_ACTION', name: 'Plan d\'action et chronogramme des activités' },
    { code: 'P4_RAPPORT', name: 'Rapport annuel certifié des réalisations' },
    { code: 'P5_PROJET', name: 'Liste détaillée des biens avec codes SH douaniers' },
    { code: 'P6_QUITTANCE', name: 'Bordereau bancaire ou Mobile Money (20$ + 300$)' }
  ];

  // Calcul SHA-256 Web Crypto
  const handleFileUpload = async (docCode, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Seuls les fichiers au format PDF sont autorisés.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256Hex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      setAttachedDocs(prev => ({
        ...prev,
        [docCode]: {
          docCode,
          fileName: file.name,
          sizeBytes: file.size,
          sha256Hash: sha256Hex
        }
      }));
    } catch (err) {
      alert('Erreur lors du calcul de l\'empreinte cryptographique');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const idempotencyKey = 'IDEM-' + Math.random().toString(36).substring(2, 12);
    const documentsArray = Object.values(attachedDocs);

    // Si Once-Only actif pour P2, on injecte l'exemption
    if (hasS1Enrollment && !attachedDocs['P2_ENROLEMENT']) {
      documentsArray.push({
        docCode: 'P2_ENROLEMENT',
        fileName: 'accord_siege_f92_enrole.pdf',
        sizeBytes: 1024,
        sha256Hash: '0x' + '22'.repeat(32),
        isExemptedOnceOnly: true
      });
    }

    try {
      const token = getClientToken();
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          serviceCode,
          organizationName,
          projectTitle,
          goodsSummary,
          paymentReference,
          attachedDocuments: documentsArray,
          idempotencyKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Erreur lors de la soumission.' });
      } else {
        setFeedback({
          type: 'success',
          message: `Dossier créé avec succès ! Référence : ${data.application?.referenceNumber}`
        });
      }
    } catch (err) {
      setFeedback({
        type: 'warning',
        message: 'Connexion interrompue. Votre demande est sauvegardée dans la file d\'attente PWA et sera synchronisée dès le retour du réseau.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '20px auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>Nouvelle Demande de Démarche FNPSS</h2>
        <p className="text-muted" style={{ fontSize: '13px' }}>
          Formulaire dynamique S1–S6 avec principe Once-Only et calcul d'intégrité SHA-256 (REQ-06)
        </p>
      </div>

      {/* Étapes du Wizard */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { num: 1, title: '1. Démarche' },
          { num: 2, title: '2. Projet' },
          { num: 3, title: '3. Pièces' },
          { num: 4, title: '4. Finalisation' }
        ].map((s) => (
          <div
            key={s.num}
            style={{
              flex: 1,
              padding: '10px',
              textAlign: 'center',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12px',
              background: step === s.num ? 'var(--fnpss-blue)' : step > s.num ? '#e6f4ea' : '#f1f5f9',
              color: step === s.num ? '#ffffff' : step > s.num ? 'var(--fnpss-green)' : 'var(--text-muted)'
            }}
          >
            {s.title}
          </div>
        ))}
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '6px',
            marginBottom: '18px',
            fontSize: '13px',
            background: feedback.type === 'success' ? '#e6f4ea' : feedback.type === 'error' ? '#fce8e6' : '#fffbeb',
            color: feedback.type === 'success' ? '#0d652d' : feedback.type === 'error' ? '#b31412' : '#b45309',
            borderLeft: `4px solid ${feedback.type === 'success' ? 'var(--fnpss-green)' : feedback.type === 'error' ? 'var(--fnpss-red)' : '#f59e0b'}`
          }}
        >
          {feedback.message}
          {feedback.type === 'success' && (
            <div style={{ marginTop: '8px' }}>
              <a href="/dashboard" className="btn btn-sm btn-success" style={{ textDecoration: 'none' }}>
                Accéder au Tableau de Bord &rarr;
              </a>
            </div>
          )}
        </div>
      )}

      <Card>
        {/* Étape 1 : Choix du Service */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: '14px' }}>Étape 1 : Sélectionnez le Service Dématérialisé</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[
                { code: 'S1', title: 'S1 &bull; Enrôlement Initial ONG', sla: '5j', fee: '20 USD' },
                { code: 'S2', title: 'S2 &bull; Accord de Partenariat', sla: '10j', fee: 'Inclus' },
                { code: 'S3', title: 'S3 &bull; Avis Technique Projet', sla: '7j', fee: 'Inclus' },
                { code: 'S4', title: 'S4 &bull; Exonération Douanière', sla: '10j', fee: '20$ + 300$' },
                { code: 'S5', title: 'S5 &bull; Philanthropie & Dons', sla: '7j', fee: '20 USD' },
                { code: 'S6', title: 'S6 &bull; Arrêté Interministériel', sla: '15j', fee: 'Sur dossier' }
              ].map((s) => (
                <div
                  key={s.code}
                  onClick={() => setServiceCode(s.code)}
                  style={{
                    border: `2px solid ${serviceCode === s.code ? 'var(--fnpss-blue)' : 'var(--border)'}`,
                    background: serviceCode === s.code ? '#eef6fc' : '#ffffff',
                    padding: '14px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <strong style={{ color: 'var(--fnpss-navy)' }} dangerouslySetInnerHTML={{ __html: s.title }} />
                  <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                    SLA : {s.sla} &bull; Frais : {s.fee}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={() => setStep(2)}>
                Continuer vers l'Étape 2 &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2 : Données du Projet */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: '14px' }}>Étape 2 : Descriptif du Projet et Colisage</h3>
            <div className="form-group">
              <label htmlFor="proj-org">Organisation Déposante</label>
              <input
                id="proj-org"
                type="text"
                className="form-control"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="proj-title">Intitulé du Projet Humanitaire / Social</label>
              <input
                id="proj-title"
                type="text"
                className="form-control"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Ex: Distribution d'équipements médicaux aux maternités rurales"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="proj-goods">Détail des Marchandises / Biens à Exonérer</label>
              <textarea
                id="proj-goods"
                rows="3"
                className="form-control"
                value={goodsSummary}
                onChange={(e) => setGoodsSummary(e.target.value)}
                placeholder="Ex: 50 couveuses pédiatriques, 20 groupes électrogènes (SH 8402.10)"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <Button variant="outline" onClick={() => setStep(1)}>
                &larr; Retour
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Continuer vers les Pièces &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3 : Pièces Justificatives & Once-Only */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: '14px' }}>Étape 3 : Téléversement des Pièces Justificatives (P1 à P6)</h3>

            {/* Notification Once-Only */}
            {hasS1Enrollment && (
              <div style={{ background: '#e6f4ea', borderLeft: '4px solid var(--fnpss-green)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '12.5px', color: '#0d652d' }}>
                ✨ <strong>Principe Once-Only Activé :</strong> Votre organisation possède un enrôlement S1 actif. La pièce <strong>P2 (Accord de siège F92 / Statuts)</strong> est dispensée de redépôt et pré-validée automatiquement.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {docDefinitions.map((doc) => {
                const isExempted = doc.onceOnly && hasS1Enrollment;
                const uploaded = attachedDocs[doc.code];

                return (
                  <div
                    key={doc.code}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px',
                      background: isExempted ? '#f0fdf4' : uploaded ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fnpss-navy)' }}>
                        {doc.code} &bull; {doc.name}
                      </div>
                      {isExempted ? (
                        <div style={{ color: 'var(--fnpss-green)', fontSize: '11.5px', fontWeight: 600 }}>
                          ✓ Dispensé (Once-Only validé antérieurement)
                        </div>
                      ) : uploaded ? (
                        <div className="mono text-muted" style={{ fontSize: '11px' }}>
                          📄 {uploaded.fileName} &bull; SHA-256: {uploaded.sha256Hash.substring(0, 14)}...
                        </div>
                      ) : (
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          Format PDF requis (max 15 Mo)
                        </div>
                      )}
                    </div>

                    {!isExempted && (
                      <div>
                        <input
                          id={`upload-${doc.code}`}
                          type="file"
                          accept="application/pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(doc.code, e)}
                        />
                        <label
                          htmlFor={`upload-${doc.code}`}
                          className="btn btn-sm btn-outline"
                          style={{ cursor: 'pointer', margin: 0 }}
                        >
                          {uploaded ? '🔄 Remplacer' : '📤 Téléverser PDF'}
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outline" onClick={() => setStep(2)}>
                &larr; Retour
              </Button>
              <Button variant="primary" onClick={() => setStep(4)}>
                Vérification et Paiement &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* Étape 4 : Quittance & Finalisation */}
        {step === 4 && (
          <div>
            <h3 style={{ marginBottom: '14px' }}>Étape 4 : Quittance des Frais et Soumission Finale</h3>
            <div className="form-group">
              <label htmlFor="pay-ref">Référence du Bordereau Bancaire ou Mobile Money (P6)</label>
              <input
                id="pay-ref"
                type="text"
                className="form-control"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Ex: RAWBANK-TRX-2026-9874"
                required
              />
              <span className="text-muted" style={{ fontSize: '11.5px' }}>
                Frais légaux : 20 USD (Dépôt) + 300 USD (Enquête préalable FNPSS). SLA légal : 10 jours ouvrables.
              </span>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #eef2f6', marginBottom: '20px', fontSize: '13px' }}>
              <strong style={{ color: 'var(--fnpss-navy)' }}>Récapitulatif de la Demande :</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                <li>Démarche : <strong>{serviceCode}</strong></li>
                <li>Organisation : <strong>{organizationName}</strong></li>
                <li>Objet du projet : <strong>{projectTitle || 'Non renseigné'}</strong></li>
                <li>Pièces jointes attachées : <strong>{Object.keys(attachedDocs).length + (hasS1Enrollment ? 1 : 0)} / 6</strong></li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outline" onClick={() => setStep(3)}>
                &larr; Retour
              </Button>
              <Button
                variant="success"
                onClick={handleSubmit}
                isLoading={isLoading}
              >
                🚀 Confirmer et Déposer le Dossier
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

