'use client';

import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import AlertBanner from '../../components/ui/AlertBanner.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import StatusStepper from '../../components/ui/StatusStepper.jsx';
import SlaIndicator from '../../components/ui/SlaIndicator.jsx';
import BlockchainSignal from '../../components/ui/BlockchainSignal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonCard, SkeletonKpiGrid, SkeletonRow } from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { buildWorkflowEmail } from '../../notifications/email-templates.mjs';

const EMAIL_PREVIEW_OPTIONS = [
  { key: 'APPLICATION_SUBMITTED', label: 'Accusé de réception' },
  { key: 'PAYMENT_VALIDATED', label: 'Quittance validée (SLA)' },
  { key: 'COMPLEMENT_REQUESTED', label: 'Complément requis' },
  { key: 'CERTIFICATE_ISSUED', label: 'Acte délivré & scellé' },
  { key: 'CERTIFICATE_REVOKED', label: 'Alerte Révocation' },
  { key: 'PASSWORD_RESET', label: 'Mot de passe oublié' }
];

export default function DesignSystemPage() {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailPreviewKey, setEmailPreviewKey] = useState('CERTIFICATE_ISSUED');

  const tokens = [
    { name: '--fnpss-navy', hex: '#0a2540', role: 'Marine institutionnelle (Header, titres)', contrast: '14.8:1 sur blanc (AAA)' },
    { name: '--fnpss-blue', hex: '#0066b2', role: 'Bleu République / Congo (Actions primaires)', contrast: '5.7:1 sur blanc (AA)' },
    { name: '--fnpss-orange-accessible', hex: '#b83d08', role: 'Orange FNPSS Texte & CTA (Accessible)', contrast: '6.3:1 sur blanc (AA+)' },
    { name: '--fnpss-orange', hex: '#df5311', role: 'Orange FNPSS Charte Graphique (Bordures / Icônes)', contrast: 'Décoratif / grands éléments' },
    { name: '--fnpss-green', hex: '#137333', role: 'Vert Souverain (Validé / Pastille Verte)', contrast: '5.9:1 sur blanc (AA)' },
    { name: '--fnpss-red', hex: '#c5221f', role: 'Rouge Alerte (Rejet / Révocation)', contrast: '5.6:1 sur blanc (AA)' },
    { name: '--fnpss-gold', hex: '#f7b924', role: 'Or RDC (Ruban & Mise en avant)', contrast: 'Sur fond sombre' },
    { name: '--fnpss-charcoal', hex: '#414042', role: 'Anthracite FNPSS (Texte institutionnel)', contrast: '10.4:1 sur blanc (AAA)' }
  ];

  const sampleAppEnCours = {
    applicationId: 'APP-DEMO-001',
    serviceType: 'S4',
    status: 'AVIS_PREALABLE',
    paymentStatus: 'PAID',
    slaHoursRemaining: 42,
    slaBreached: false
  };

  const sampleAppSealed = {
    applicationId: 'APP-DEMO-002',
    serviceType: 'S4',
    status: 'DELIVRE',
    paymentStatus: 'PAID',
    certificateNumber: 'FNPSS/EXO/2026/00042',
    blockchainTxHash: '0x4b12f9d0e8c31a75b8009f112233445566778899aabbccddeeff001122334455',
    blockchainNetwork: 'polygon-amoy',
    ministryCoSigned: true
  };

  const sampleAppRevoked = {
    ...sampleAppSealed,
    status: 'REVOQUE',
    certificateNumber: 'FNPSS/EXO/2026/00009'
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '10px auto 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <img src="/brand/logo-fnpss.png" alt="Logo FNPSS" width={52} height={52} style={{ objectFit: 'contain' }} />
        <div>
          <Badge status="brand" style={{ marginBottom: '4px' }}>Système de Design &amp; Signaux v1.0</Badge>
          <h2 style={{ margin: 0 }}>Charte Graphique &amp; Composants FNPSS</h2>
          <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
            &laquo; Le social dans la solidarité &raquo; &mdash; Référentiel visuel de production accessible WCAG 2.1 AA et optimisé 3G.
          </p>
        </div>
      </div>

      <Card title="1. Palette Institutionnelle & Contraste">
        <div className="drc-ribbon" style={{ marginBottom: '16px', borderRadius: '4px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {tokens.map((t) => (
            <div key={t.name} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
              <div style={{ height: '42px', background: t.hex }} />
              <div style={{ padding: '10px' }}>
                <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-navy)' }}>{t.name}</div>
                <div className="mono text-muted" style={{ fontSize: '11.5px' }}>{t.hex}</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>{t.role}</div>
                <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>{t.contrast}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="2. Boutons, États de Chargement & Raisons de Désactivation">
        <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: '14px' }}>
          <Button variant="primary">Primaire Bleu</Button>
          <Button variant="brand">Action FNPSS (Brand)</Button>
          <Button variant="accent">Accent Or</Button>
          <Button variant="success">Validation Souveraine</Button>
          <Button variant="danger">Rejet / Révocation</Button>
          <Button variant="outline">Secondaire Contour</Button>
          <Button variant="ghost">Tertiaire Ghost</Button>
        </div>
        <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
          <Button size="sm" variant="primary">Petit (sm)</Button>
          <Button size="md" variant="brand">Standard (md)</Button>
          <Button size="lg" variant="primary">Grand (lg)</Button>
          <Button variant="brand" isLoading loadingText="Scellement...">Chargement</Button>
          <Button variant="primary" disabledReason="Paiement Mobile Money requis avant signature">
            Bouton Verrouillé
          </Button>
        </div>
      </Card>

      <Card title="3. Badges Statuts, Bannières & Notifications Toast">
        <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: '16px' }}>
          <Badge status="soumis">Soumis</Badge>
          <Badge status="en_cours">En cours</Badge>
          <Badge status="complement">Complément requis</Badge>
          <Badge status="valide">Délivré / Valide</Badge>
          <Badge status="rejete">Rejeté</Badge>
          <Badge status="revoque">Révoqué</Badge>
          <Badge status="brand">Prioritaire FNPSS</Badge>
          <Badge status="info">Co-signé</Badge>
          <Badge status="warning">SLA Proche</Badge>
          <Badge status="neutral">Archivé</Badge>
        </div>

        <AlertBanner variant="info" title="Information SLA" message="Délai légal d'instruction garanti à 10 jours ouvrables dès rapprochement de quittance." />
        <AlertBanner variant="warning" title="Complément demandé" message="Veuillez transmettre la facture proforma signée avant 48h." />
        <AlertBanner variant="success" title="Certificat scellé" message="L'acte FNPSS/EXO/2026/00042 est vérifiable publiquement par QR Code." />
        <AlertBanner variant="danger" title="Attestation révoquée" message="Alerte envoyée en temps réel aux régies DGDA, DGI et DGRAD." />

        <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: '12px' }}>
          <Button size="sm" variant="success" onClick={() => toast.success('Dossier enregistré avec succès.')}>
            Tester Toast Succès
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info('Synchronisation avec le registre effectuée.')}>
            Tester Toast Info
          </Button>
          <Button size="sm" variant="accent" onClick={() => toast.warning('Échéance SLA dans moins de 24 heures.')}>
            Tester Toast Alerte
          </Button>
          <Button size="sm" variant="danger" onClick={() => toast.error('Échec temporaire de connexion réseau.')}>
            Tester Toast Erreur
          </Button>
          <Button size="sm" variant="brand" onClick={() => setConfirmOpen(true)}>
            Tester Dialogue Confirmation
          </Button>
        </div>
      </Card>

      <Card title="4. Signaux Opérationnels : Progression, SLA & Ancrage Blockchain">
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Stepper de Cycle de Vie Complet :</strong>
            <StatusStepper application={sampleAppEnCours} />
          </div>
          <div>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Indicateurs SLA :</strong>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <SlaIndicator application={{ slaHoursRemaining: 120, slaBreached: false }} />
              <SlaIndicator application={{ slaHoursRemaining: 28, slaBreached: false }} />
              <SlaIndicator application={{ slaHoursRemaining: 0, slaBreached: true }} />
              <SlaIndicator application={{ status: 'DELIVRE' }} />
            </div>
          </div>
          <div>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Signaux Blockchain :</strong>
            <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
              <BlockchainSignal application={sampleAppSealed} showLink />
              <BlockchainSignal application={sampleAppRevoked} />
            </div>
          </div>
        </div>
      </Card>

      <Card title="5. États Vides & Squelettes de Chargement">
        <SkeletonKpiGrid count={4} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '14px' }}>
          <div>
            <SkeletonCard rows={3} />
            <div style={{ marginTop: '10px' }}>
              <SkeletonRow width="80%" />
              <SkeletonRow width="60%" />
            </div>
          </div>
          <EmptyState
            icon="📂"
            title="Aucun dossier en attente"
            description="Tous les dossiers prioritaires ont été traités dans les délais SLA."
            action={<Button size="sm" variant="brand">Créer un dossier</Button>}
          />
        </div>
      </Card>

      {(() => {
        const previewEmail = buildWorkflowEmail(emailPreviewKey, {
          referenceNumber: 'FNPSS/DEM/2026/00042',
          details: {
            organizationName: 'ONG Espoir du Nord-Kivu',
            serviceCode: 'S4',
            projectTitle: 'Aide Humanitaire Goma — Kits Médicaux',
            slaDueAt: '2026-12-08',
            reason: 'Rapport annuel 2025 non revêtu de la signature du représentant légal.',
            certificateNumber: 'FNPSS/EXO/2026/00042',
            docHash: '0x4b12f9d0e8c31a75b8009f112233445566778899aabbccddeeff001122334455',
            explorerTxUrl: 'https://amoy.polygonscan.com/tx/0x4b12f9d0...',
            resetToken: 'a1b2c3d4e5f67890abcd'
          }
        });
        return (
          <Card
            title="6. Gabarits Emails Officiels (NOT-01 — HTML + Texte alternatif)"
            subtitle={`Objet : ${previewEmail?.subject || ''}`}
          >
            <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: '12px' }}>
              {EMAIL_PREVIEW_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  type="button"
                  size="sm"
                  variant={emailPreviewKey === opt.key ? 'brand' : 'outline'}
                  onClick={() => setEmailPreviewKey(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <iframe
              srcDoc={previewEmail?.html || ''}
              sandbox=""
              title="Aperçu email officiel FNPSS"
              style={{
                width: '100%',
                height: '520px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: '#f4f6f9'
              }}
            />
          </Card>
        );
      })()}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmer l'action critique"
        message="Cette boîte de dialogue accessible remplace window.confirm() sur l'ensemble des actions souveraines FNPSS."
        confirmLabel="Valider la démonstration"
        variant="brand"
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success('Action confirmée via ConfirmDialog.');
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
