'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import AlertBanner from '../../../components/ui/AlertBanner.jsx';
import { useToast } from '../../../components/ui/ToastProvider.jsx';
import { getClientToken, getClientUser } from '../../../lib/client-auth.js';
import { downloadAuthenticatedFile } from '../../../lib/secure-download.js';
import AppIcon from '../../../components/ui/AppIcon.jsx';

const DRAFT_STORAGE_KEY = 'fnpss_new_app_draft_v1';
const OFFLINE_QUEUE_KEY = 'fnpss_offline_queue_v1';

const SERVICE_OPTIONS = [
  {
    code: 'S1',
    title: 'Enrôlement Initial ONG',
    description: 'Identification officielle de votre ONG/ASBL et obtention du matricule FNPSS.',
    sla: '5 jours ouvr.',
    fee: '20 USD',
    icon: 'business'
  },
  {
    code: 'S2',
    title: 'Accord de Partenariat',
    description: 'Convention cadre de partenariat avec le Ministère des Affaires Sociales.',
    sla: '10 jours ouvr.',
    fee: 'Inclus',
    icon: 'institution'
  },
  {
    code: 'S3',
    title: 'Avis Technique Projet',
    description: 'Évaluation de conformité sociale préalable des programmes humanitaires.',
    sla: '7 jours ouvr.',
    fee: 'Inclus',
    icon: 'review'
  },
  {
    code: 'S4',
    title: 'Exonération Douanière',
    description: 'Franchise douanière et fiscale scellée sur Polygon pour vos importations.',
    sla: '10 jours ouvr.',
    fee: '20 USD + 300 USD',
    icon: 'seal'
  },
  {
    code: 'S5',
    title: 'Philanthropie & Dons',
    description: 'Reconnaissance officielle des dons, fondations et legs d\'utilité sociale.',
    sla: '7 jours ouvr.',
    fee: '20 USD',
    icon: 'verified'
  },
  {
    code: 'S6',
    title: 'Arrêté Interministériel',
    description: 'Acte conjoint Affaires Sociales / Finances pour programmes pluriannuels.',
    sla: '15 jours ouvr.',
    fee: 'Sur dossier',
    icon: 'audit'
  }
];

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

  const selectedServiceInfo = SERVICE_OPTIONS.find((s) => s.code === serviceCode) || SERVICE_OPTIONS[3];

  return (
    <div style={{ maxWidth: '920px', margin: '12px auto' }}>
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>Nouvelle Demande de Démarche FNPSS</h2>
          <p className="text-muted" style={{ fontSize: '13.5px', margin: 0 }}>
            Formulaire dynamique S1–S6 avec principe Once-Only et empreinte SHA-256 (REQ-06)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge status="info">
            <AppIcon name="save" size="xs" />
            <span>Brouillon auto</span>
          </Badge>
          {draftRestored && (
            <Button variant="outline" size="sm" onClick={clearDraft}>
              Effacer brouillon
            </Button>
          )}
        </div>
      </div>

      {/* Étapes du Wizard */}
      <div className="wizard-steps-grid" style={{ marginBottom: '22px' }}>
        {[
          { num: 1, title: 'Démarche' },
          { num: 2, title: 'Projet' },
          { num: 3, title: 'Pièces' },
          { num: 4, title: 'Finalisation' }
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div
              key={s.num}
              className={`wizard-step-pill ${isActive ? 'is-active' : isDone ? 'is-done' : ''}`}
            >
              <span className="wizard-step-num" aria-hidden="true">
                {isDone ? <AppIcon name="check" size={13} /> : s.num}
              </span>
              <span>{s.title}</span>
            </div>
          );
        })}
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
                  <AppIcon name="receipt" size="xs" />
                  <span>Télécharger l&apos;Accusé PDF</span>
                </Button>
              )}
              <a href="/dashboard" className="btn btn-sm btn-success" style={{ textDecoration: 'none' }}>
                <span>Accéder au Tableau de Bord</span>
                <AppIcon name="arrowForward" size="xs" />
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
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ marginBottom: '4px' }}>Étape 1 : Sélectionnez le Service Dématérialisé</h3>
              <p className="text-muted" style={{ fontSize: '13.5px', margin: 0 }}>
                Choisissez la démarche officielle correspondant à votre demande auprès du FNPSS.
              </p>
            </div>

            <div className="service-options-grid" role="radiogroup" aria-label="Services dématérialisés FNPSS">
              {SERVICE_OPTIONS.map((s) => {
                const isSelected = serviceCode === s.code;
                return (
                  <button
                    key={s.code}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setServiceCode(s.code)}
                    className={`service-option-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="service-option-icon" aria-hidden="true">
                            <AppIcon name={s.icon} size="md" />
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: isSelected ? 'var(--fnpss-orange-soft)' : '#f1f5f9',
                              color: isSelected ? 'var(--fnpss-orange-accessible)' : 'var(--fnpss-navy)'
                            }}
                          >
                            {s.code}
                          </span>
                        </div>
                        <span className="service-option-radio" aria-hidden="true">
                          {isSelected && <AppIcon name="check" size={12} />}
                        </span>
                      </div>

                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--fnpss-navy)', marginBottom: '5px', letterSpacing: '-0.015em' }}>
                        {s.title}
                      </div>
                      <p className="text-muted" style={{ fontSize: '12.5px', lineHeight: 1.5, margin: 0 }}>
                        {s.description}
                      </p>
                    </div>

                    <div className="service-option-meta">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <AppIcon name="clock" size="xs" />
                        <span>SLA : <strong style={{ color: 'var(--fnpss-navy)' }}>{s.sla}</strong></span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <AppIcon name="payment" size="xs" />
                        <span>Frais : <strong style={{ color: 'var(--fnpss-navy)' }}>{s.fee}</strong></span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="wizard-footer-bar wizard-nav-row">
              <div className="text-muted" style={{ fontSize: '13px' }}>
                Sélection : <strong style={{ color: 'var(--fnpss-navy)' }}>{selectedServiceInfo.code} — {selectedServiceInfo.title}</strong>
              </div>
              <Button variant="brand" onClick={() => { setStepError(''); setStep(2); }}>
                <span>Continuer vers l&apos;Étape 2</span>
                <AppIcon name="arrowForward" size="sm" />
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2 : Données du Projet */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ marginBottom: '4px' }}>Étape 2 : Descriptif du Projet et Colisage</h3>
                <p className="text-muted" style={{ fontSize: '13.5px', margin: 0 }}>
                  Précisez l&apos;objet de votre démarche et les informations techniques du dossier.
                </p>
              </div>
              <Badge status="brand">{selectedServiceInfo.code} &bull; {selectedServiceInfo.title}</Badge>
            </div>

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

            <div className="wizard-footer-bar wizard-nav-row">
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
                <span>Continuer vers les Pièces</span>
                <AppIcon name="arrowForward" size="sm" />
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3 : Pièces Justificatives & Once-Only */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px' }}>Étape 3 : Téléversement des Pièces Justificatives (P1 à P6)</h3>
                <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
                  Chaque document PDF est haché (SHA-256) localement puis chiffré en AES-256-GCM.
                </p>
              </div>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {docDefinitions.map((doc) => {
                const isExempted = doc.onceOnly && hasS1Enrollment;
                const uploaded = attachedDocs[doc.code];
                const isDocUploading = uploadingDoc === doc.code;
                const docError = uploadErrors[doc.code];

                return (
                  <div
                    key={doc.code}
                    style={{
                      border: `1.5px solid ${docError ? '#fca5a5' : uploaded || isExempted ? '#bbf7d0' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      background: isExempted ? '#f0fdf4' : uploaded ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13.5px', color: 'var(--fnpss-navy)', wordBreak: 'break-word' }}>
                          {doc.code} &bull; {doc.name}
                        </div>
                        {isExempted ? (
                          <div style={{ color: 'var(--fnpss-green)', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                            <AppIcon name="check" size="xs" />
                            <span>Dispensé (Once-Only validé antérieurement)</span>
                          </div>
                        ) : isDocUploading ? (
                          <div style={{ color: 'var(--fnpss-blue)', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                            <AppIcon name="hourglass" size="xs" />
                            <span>Calcul de l&apos;empreinte SHA-256 et chiffrement en cours...</span>
                          </div>
                        ) : uploaded ? (
                          <div className="mono text-muted" style={{ fontSize: '11.5px', wordBreak: 'break-word', display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                            <AppIcon name="pdf" size="xs" />
                            <span>{uploaded.fileName} &bull; SHA-256: {uploaded.sha256Hash.substring(0, 14)}...</span>
                            {uploaded.cloudinaryUrl && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--fnpss-green)' }}>
                                &bull; <AppIcon name="lock" size="xs" /> AES-256
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
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
                            <AppIcon name={isDocUploading ? 'hourglass' : uploaded ? 'refresh' : 'upload'} size="xs" />
                            <span>{isDocUploading ? 'Téléversement...' : uploaded ? 'Remplacer' : 'Téléverser PDF'}</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {docError && (
                      <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: 600, background: '#fee2e2', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AppIcon name="warning" size="xs" />
                        <span>{docError}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="wizard-footer-bar wizard-nav-row">
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
                <span>Vérification et Paiement</span>
                <AppIcon name="arrowForward" size="sm" />
              </Button>
            </div>
          </div>
        )}

        {/* Étape 4 : Quittance & Finalisation */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ marginBottom: '4px' }}>Étape 4 : Quittance des Frais et Soumission Finale</h3>
              <p className="text-muted" style={{ fontSize: '13.5px', margin: 0 }}>
                Vérifiez votre récapitulatif et saisissez la référence de votre bordereau de paiement.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="pay-ref">Référence du Bordereau Bancaire ou Mobile Money (P6)</label>
              <input
                id="pay-ref"
                type="text"
                className="form-control mono"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Ex: RAWBANK-TRX-2026-9874"
                required
              />
              <span className="text-muted" style={{ fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Frais légaux : 20 USD (Dépôt) + 300 USD (Enquête préalable FNPSS). SLA légal : 10 jours ouvrables.
              </span>
            </div>

            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '18px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13.5px', color: 'var(--fnpss-navy)', marginBottom: '12px' }}>
                Récapitulatif de la Demande
              </div>
              <div className="summary-grid" style={{ fontSize: '13px' }}>
                <div>
                  <div className="text-muted" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Démarche</div>
                  <strong style={{ color: 'var(--fnpss-navy)' }}>{selectedServiceInfo.code} — {selectedServiceInfo.title}</strong>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Organisation</div>
                  <strong style={{ color: 'var(--fnpss-navy)' }}>{organizationName}</strong>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Projet</div>
                  <strong style={{ color: 'var(--fnpss-navy)' }}>{projectTitle || 'Non spécifié'}</strong>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dossier PDF</div>
                  <strong style={{ color: 'var(--fnpss-navy)' }}>{readyDocsCount}/6 pièces {hasS1Enrollment && '(Once-Only actif)'}</strong>
                </div>
              </div>
            </div>

            <div className="wizard-footer-bar wizard-nav-row">
              <Button variant="outline" onClick={() => setStep(3)}>
                &larr; Retour aux Pièces
              </Button>
              <Button variant="success" isLoading={isLoading} loadingText="Soumission en cours..." onClick={handleSubmit}>
                <AppIcon name="success" size="sm" />
                <span>Soumettre la Demande au FNPSS</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
