'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import AlertBanner from '../../../components/ui/AlertBanner.jsx';
import { useToast } from '../../../components/ui/ToastProvider.jsx';
import { getClientToken, getClientUser } from '../../../lib/client-auth.js';
import { downloadAuthenticatedFile } from '../../../lib/secure-download.js';

const DRAFT_STORAGE_KEY = 'fnpss_new_app_draft_v1';
const OFFLINE_QUEUE_KEY = 'fnpss_offline_queue_v1';

export default function NewApplicationPage() {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [serviceCode, setServiceCode] = useState('S4');
  const [organizationName, setOrganizationName] = useState('ONG Espoir du Nord-Kivu');
  const [projectTitle, setProjectTitle] = useState('');
  const [goodsSummary, setGoodsSummary] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [attachedDocs, setAttachedDocs] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState('');
  const [stepError, setStepError] = useState('');
  const [hasS1Enrollment, setHasS1Enrollment] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const user = getClientUser();
    if (user?.organizationName) {
      setOrganizationName(user.organizationName);
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSvc = params.get('service');
      if (urlSvc && ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(urlSvc.toUpperCase())) {
        setServiceCode(urlSvc.toUpperCase());
      } else {
        try {
          const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (rawDraft) {
            const parsed = JSON.parse(rawDraft);
            if (parsed.serviceCode) setServiceCode(parsed.serviceCode);
            if (parsed.organizationName) setOrganizationName(parsed.organizationName);
            if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
            if (parsed.goodsSummary) setGoodsSummary(parsed.goodsSummary);
            if (parsed.paymentReference) setPaymentReference(parsed.paymentReference);
            setDraftRestored(true);
          }
        } catch {
          // Ignore invalid draft
        }
      }
    }

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ serviceCode, organizationName, projectTitle, goodsSummary, paymentReference, savedAt: Date.now() })
      );
    } catch {
      // Ignore quota errors
    }
  }, [serviceCode, organizationName, projectTitle, goodsSummary, paymentReference]);

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
    setProjectTitle('');
    setGoodsSummary('');
    setPaymentReference('');
    setDraftRestored(false);
    toast.info('Brouillon local effacé.');
  };

  const docDefinitions = [
    { code: 'P1_REQUETE', name: 'Requête motivée adressée au DG FNPSS' },
    { code: 'P2_ENROLEMENT', name: 'Certificat d\'enrôlement ou Accord de siège F92', onceOnly: true },
    { code: 'P3_PLAN_ACTION', name: 'Plan d\'action et chronogramme des activités' },
    { code: 'P4_RAPPORT', name: 'Rapport annuel certifié des réalisations' },
    { code: 'P5_PROJET', name: 'Liste détaillée des biens avec codes SH douaniers' },
    { code: 'P6_QUITTANCE', name: 'Bordereau bancaire ou Mobile Money (20$ + 300$)' }
  ];

  const readyDocsCount = docDefinitions.filter(
    (d) => (d.onceOnly && hasS1Enrollment) || Boolean(attachedDocs[d.code])
  ).length;

  // Calcul SHA-256 Web Crypto
  const handleFileUpload = async (docCode, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadErrors(prev => ({ ...prev, [docCode]: null }));

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      const msg = 'Format invalide : seuls les fichiers PDF sont acceptés.';
      setUploadErrors(prev => ({ ...prev, [docCode]: msg }));
      toast.error(msg, 'Format non autorisé');
      return;
    }

    setUploadingDoc(docCode);

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256Hex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const meta = {
        docCode,
        fileName: file.name,
        sizeBytes: file.size,
        sha256Hash: sha256Hex
      };
      setAttachedDocs(prev => ({ ...prev, [docCode]: meta }));

      if (file.size > 3 * 1024 * 1024) {
        setUploadErrors(prev => ({
          ...prev,
          [docCode]: `${file.name} dépasse 3 Mo : seule son empreinte SHA-256 est calculée, le stockage cloud complet est restreint.`
        }));
        toast.warning('Fichier supérieur à 3 Mo : empreinte seule enregistrée.', docCode);
        setUploadingDoc('');
        return;
      }
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const token = getClientToken();
      const up = await fetch('/api/applications/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ docCode, fileName: file.name, fileBase64: btoa(binary) })
      });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        const errMsg = `Stockage refusé : ${upData.error || up.status}`;
        setUploadErrors(prev => ({ ...prev, [docCode]: errMsg }));
        toast.error(errMsg, docCode);
        setUploadingDoc('');
        return;
      }
      if (upData.stored) {
        setAttachedDocs(prev => ({
          ...prev,
          [docCode]: {
            ...meta,
            sha256Hash: upData.sha256Hash || sha256Hex,
            storageKey: upData.storageKey,
            cloudinaryUrl: upData.cloudinaryUrl
          }
        }));
      }
      toast.success(`Pièce ${docCode} vérifiée (SHA-256) et chiffrée AES-256-GCM.`, 'Pièce enregistrée');
    } catch {
      const msg = 'Erreur lors de l\'inspection ou du hachage cryptographique du fichier PDF.';
      setUploadErrors(prev => ({ ...prev, [docCode]: msg }));
      toast.error(msg, docCode);
    } finally {
      setUploadingDoc('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const idempotencyKey = 'IDEM-' + Math.random().toString(36).substring(2, 12);
    const documentsArray = Object.values(attachedDocs);

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
        const msg = data.error || 'Erreur lors de la soumission.';
        setFeedback({ type: 'error', message: msg });
        toast.error(msg, 'Soumission refusée');
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
        const okMsg = `Dossier créé avec succès ! Référence : ${data.application?.referenceNumber}`;
        setFeedback({ type: 'success', message: okMsg, referenceNumber: data.application?.referenceNumber || '' });
        toast.success(okMsg, 'Demande enregistrée');
        window.dispatchEvent(new Event('fnpss-notif-refresh'));
      }
    } catch {
      const offlineKey = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const offlinePayload = {
        serviceCode,
        organizationName,
        projectTitle,
        goodsSummary,
        paymentReference,
        attachedDocuments: documentsArray,
        idempotencyKey: offlineKey
      };
      if (typeof window !== 'undefined') {
        try {
          const prevRaw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
          const prevQueue = prevRaw ? JSON.parse(prevRaw) : [];
          const nextQueue = [
            ...(Array.isArray(prevQueue) ? prevQueue : []),
            {
              idempotencyKey: offlineKey,
              savedAt: new Date().toISOString(),
              payload: offlinePayload
            }
          ];
          window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
          window.localStorage.removeItem(DRAFT_STORAGE_KEY);
          window.dispatchEvent(new Event('fnpss-offline-queue-updated'));
        } catch {
          // Ignorer les erreurs de quota localStorage
        }
      }
      const warnMsg =
        'Connexion interrompue : votre dossier a été placé dans la file hors-ligne PWA. Il sera synchronisé sans doublon dès le retour du réseau.';
      setFeedback({ type: 'warning', message: warnMsg });
      toast.warning(warnMsg, 'Mis en file hors-ligne PWA');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '12px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
        <div>
          <h2>Nouvelle Demande de Démarche FNPSS</h2>
          <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
            Formulaire dynamique S1–S6 avec principe Once-Only et calcul d&apos;intégrité SHA-256 (REQ-06)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Badge status="info">💾 Brouillon auto</Badge>
          {draftRestored && (
            <Button variant="outline" size="sm" onClick={clearDraft}>
              Effacer brouillon
            </Button>
          )}
        </div>
      </div>

      {/* Étapes du Wizard */}
      <div className="wizard-steps-grid" style={{ marginBottom: '20px' }}>
        {[
          { num: 1, title: '1. Démarche' },
          { num: 2, title: '2. Projet' },
          { num: 3, title: '3. Pièces' },
          { num: 4, title: '4. Finalisation' }
        ].map((s) => (
          <div
            key={s.num}
            style={{
              padding: '10px 8px',
              textAlign: 'center',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12px',
              border: step === s.num ? '2px solid var(--fnpss-orange)' : '1px solid var(--border)',
              background: step === s.num ? 'var(--fnpss-navy)' : step > s.num ? '#e6f4ea' : '#f1f5f9',
              color: step === s.num ? '#ffffff' : step > s.num ? 'var(--fnpss-green)' : 'var(--text-muted)'
            }}
          >
            {step > s.num ? `✓ ${s.title}` : s.title}
          </div>
        ))}
      </div>

      {feedback && (
        <AlertBanner
          variant={feedback.type}
          title={feedback.type === 'success' ? 'Dossier Enregistré' : feedback.type === 'error' ? 'Erreur de Soumission' : 'Information'}
          message={feedback.message}
          action={feedback.type === 'success' && (
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {feedback.referenceNumber && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    try {
                      await downloadAuthenticatedFile(
                        `/api/applications/receipt.pdf?ref=${encodeURIComponent(feedback.referenceNumber)}`,
                        getClientToken(),
                        { fallbackFileName: `Accuse-${feedback.referenceNumber}.pdf` }
                      );
                      toast.success('Accusé de réception PDF téléchargé.');
                    } catch (err) {
                      toast.error(err.message || 'Téléchargement impossible.', 'Accusé indisponible');
                    }
                  }}
                >
                  🧾 Télécharger l&apos;Accusé PDF
                </Button>
              )}
              <a href="/dashboard" className="btn btn-sm btn-success" style={{ textDecoration: 'none' }}>
                Accéder au Tableau de Bord &rarr;
              </a>
            </div>
          )}
          onClose={() => setFeedback(null)}
          style={{ marginBottom: '18px' }}
        />
      )}

      {stepError && (
        <AlertBanner
          variant="warning"
          title="Champ Requis"
          message={stepError}
          onClose={() => setStepError('')}
          style={{ marginBottom: '18px' }}
        />
      )}

      <Card>
        {/* Étape 1 : Choix du Service */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: '14px' }}>Étape 1 : Sélectionnez le Service Dématérialisé</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { code: 'S1', title: 'S1 • Enrôlement Initial ONG', sla: '5j', fee: '20 USD' },
                { code: 'S2', title: 'S2 • Accord de Partenariat', sla: '10j', fee: 'Inclus' },
                { code: 'S3', title: 'S3 • Avis Technique Projet', sla: '7j', fee: 'Inclus' },
                { code: 'S4', title: 'S4 • Exonération Douanière', sla: '10j', fee: '20$ + 300$' },
                { code: 'S5', title: 'S5 • Philanthropie & Dons', sla: '7j', fee: '20 USD' },
                { code: 'S6', title: 'S6 • Arrêté Interministériel', sla: '15j', fee: 'Sur dossier' }
              ].map((s) => (
                <div
                  key={s.code}
                  onClick={() => setServiceCode(s.code)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setServiceCode(s.code); }}
                  style={{
                    border: `2px solid ${serviceCode === s.code ? 'var(--fnpss-orange-accessible)' : 'var(--border)'}`,
                    background: serviceCode === s.code ? 'var(--fnpss-orange-soft)' : '#ffffff',
                    padding: '14px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <strong style={{ color: 'var(--fnpss-navy)' }}>{s.title}</strong>
                  <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                    SLA : {s.sla} &bull; Frais : {s.fee}
                  </div>
                </div>
              ))}
            </div>

            <div className="wizard-nav-row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="brand" onClick={() => { setStepError(''); setStep(2); }}>
                Continuer vers l&apos;Étape 2 &rarr;
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
                onChange={(e) => { setProjectTitle(e.target.value); setStepError(''); }}
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

            <div className="wizard-nav-row" style={{ marginTop: '20px' }}>
              <Button variant="outline" onClick={() => { setStepError(''); setStep(1); }}>
                &larr; Retour
              </Button>
              <Button
                variant="brand"
                onClick={() => {
                  if (!projectTitle.trim()) {
                    setStepError('Veuillez saisir un intitulé pour votre projet avant de passer à l\'étape des pièces justificatives.');
                    return;
                  }
                  setStepError('');
                  setStep(3);
                }}
              >
                Continuer vers les Pièces &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3 : Pièces Justificatives & Once-Only */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Étape 3 : Téléversement des Pièces Justificatives (P1 à P6)</h3>
              <Badge status={readyDocsCount === 6 ? 'valide' : 'info'}>
                {readyDocsCount}/6 pièces prêtes
              </Badge>
            </div>

            {hasS1Enrollment && (
              <AlertBanner
                variant="success"
                title="Principe Once-Only Activé"
                message="Votre organisation possède un enrôlement S1 actif. La pièce P2 (Accord de siège F92 / Statuts) est dispensée de redépôt et pré-validée automatiquement."
                style={{ marginBottom: '16px' }}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {docDefinitions.map((doc) => {
                const isExempted = doc.onceOnly && hasS1Enrollment;
                const uploaded = attachedDocs[doc.code];
                const isDocUploading = uploadingDoc === doc.code;
                const docError = uploadErrors[doc.code];

                return (
                  <div
                    key={doc.code}
                    style={{
                      border: `1px solid ${docError ? '#fca5a5' : uploaded || isExempted ? '#bbf7d0' : 'var(--border)'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      background: isExempted ? '#f0fdf4' : uploaded ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fnpss-navy)', wordBreak: 'break-word' }}>
                          {doc.code} &bull; {doc.name}
                        </div>
                        {isExempted ? (
                          <div style={{ color: 'var(--fnpss-green)', fontSize: '11.5px', fontWeight: 600 }}>
                            ✓ Dispensé (Once-Only validé antérieurement)
                          </div>
                        ) : isDocUploading ? (
                          <div style={{ color: 'var(--fnpss-blue)', fontSize: '11.5px', fontWeight: 600 }}>
                            ⏳ Calcul de l&apos;empreinte SHA-256 et chiffrement en cours...
                          </div>
                        ) : uploaded ? (
                          <div className="mono text-muted" style={{ fontSize: '11px', wordBreak: 'break-word' }}>
                            📄 {uploaded.fileName} &bull; SHA-256: {uploaded.sha256Hash.substring(0, 14)}... {uploaded.cloudinaryUrl ? '• 🔒 AES-256' : ''}
                          </div>
                        ) : (
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            Format PDF requis (max 3 Mo pour archivage cloud complet)
                          </div>
                        )}
                      </div>

                      {!isExempted && (
                        <div className="full-width-xs">
                          <input
                            id={`upload-${doc.code}`}
                            type="file"
                            accept="application/pdf,.pdf"
                            disabled={isDocUploading}
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileUpload(doc.code, e)}
                          />
                          <label
                            htmlFor={`upload-${doc.code}`}
                            className="btn btn-sm btn-outline full-width-xs"
                            style={{ cursor: isDocUploading ? 'wait' : 'pointer', margin: 0, opacity: isDocUploading ? 0.6 : 1 }}
                          >
                            {isDocUploading ? '⏳ Téléversement...' : uploaded ? '🔄 Remplacer' : '📤 Téléverser PDF'}
                          </label>
                        </div>
                      )}
                    </div>

                    {docError && (
                      <div style={{ color: '#b91c1c', fontSize: '11.5px', fontWeight: 600, background: '#fee2e2', padding: '6px 10px', borderRadius: '4px' }}>
                        ⚠️ {docError}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="wizard-nav-row">
              <Button variant="outline" onClick={() => { setStepError(''); setStep(2); }}>
                &larr; Retour
              </Button>
              <Button
                variant="brand"
                onClick={() => {
                  if (!attachedDocs['P1_REQUETE']) {
                    setStepError('La pièce P1_REQUETE (Requête motivée) est obligatoire avant de finaliser votre demande.');
                    return;
                  }
                  setStepError('');
                  setStep(4);
                }}
              >
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
                <li>Projet : <strong>{projectTitle || 'Non spécifié'}</strong></li>
                <li>Pièces prêtes : <strong>{readyDocsCount}/6</strong> {hasS1Enrollment && '(Once-Only actif)'}</li>
              </ul>
            </div>

            <div className="wizard-nav-row">
              <Button variant="outline" onClick={() => setStep(3)}>
                &larr; Retour aux Pièces
              </Button>
              <Button variant="success" isLoading={isLoading} loadingText="Soumission en cours..." onClick={handleSubmit}>
                ✅ Soumettre la Demande au FNPSS
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
