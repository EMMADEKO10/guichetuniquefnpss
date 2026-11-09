'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';

const DEFAULT_GUIDE_MODULES = [
  {
    id: 'MOD-01',
    stepNumber: 1,
    title: 'Création de compte ONG/ASBL & Connexion sans clé privée (Web3Auth)',
    targetRequirements: ['REQ-01', 'REQ-02', 'REQ-04', 'BLK-03'],
    summary: 'Inscrivez votre organisation par email/mot de passe ou via Google OAuth 2.0. Un portefeuille cryptographique MPC est associé automatiquement en arrière-plan sans aucune seed phrase à gérer.',
    checklist: [
      'Renseigner la dénomination officielle de l\'ONG/ASBL et l\'identité du représentant légal',
      'Compléter le numéro d\'enrôlement FNPSS ou l\'arrêté F92 dans la page Profil (/profile)',
      'Utiliser la récupération sécurisée (/auth/forgot-password) en cas d\'oubli du mot de passe'
    ]
  },
  {
    id: 'MOD-02',
    stepNumber: 2,
    title: 'Sélection du service (S1 à S6), dispense Once-Only & pièces PDF',
    targetRequirements: ['REQ-05', 'REQ-06', 'REQ-07'],
    summary: 'Choisissez votre démarche depuis le catalogue. Si votre ONG dispose déjà d\'une Attestation d\'Enrôlement S1 active, la pièce P2 est automatiquement dispensée (principe Once-Only).',
    checklist: [
      'Joindre les pièces obligatoires P1 à P6 au format PDF authentique (%PDF-, max 10 Mo par fichier)',
      'Vérifier l\'empreinte SHA-256 calculée automatiquement dans votre navigateur avant envoi',
      'Modifier ou retirer librement votre dossier (/dashboard) tant que l\'instruction n\'a pas débuté'
    ]
  },
  {
    id: 'MOD-03',
    stepNumber: 3,
    title: 'Frais réglementaires (20 USD + 300 USD) & Mode Hors-Ligne 3G en province',
    targetRequirements: ['REQ-10', 'REQ-11', 'REQ-12'],
    summary: 'Renseignez la référence de votre quittance bancaire ou Mobile Money (320 USD ou équivalent CDF). En cas de coupure 3G en province, votre brouillon est mis en file locale avec clé d\'idempotence anti-doublon.',
    checklist: [
      'Saisir la référence exacte du bordereau (Rawbank, EquityBCDC, TMB, M-Pesa, Airtel Money, Orange Money)',
      'Le délai légal de 10 jours ouvrables démarre dès validation de la quittance P6 par l\'agent FNPSS',
      'Synchronisation automatique sans doublon dès le rétablissement de la connexion'
    ]
  },
  {
    id: 'MOD-04',
    stepNumber: 4,
    title: 'Suivi temps réel, compléments documentaires & téléchargement PDF scellé',
    targetRequirements: ['REQ-08', 'REQ-09', 'NOT-01', 'NOT-04'],
    summary: 'Suivez chaque étape (Agent -> Chef de Division -> DG -> Ministère) depuis votre tableau de bord et votre centre de notifications.',
    checklist: [
      'En cas de demande de complément (COMPLEMENT_REQUIS), téléverser la pièce demandée pour reprendre le SLA',
      'Dès le statut VALIDE_DELIVRE, télécharger l\'acte officiel PDF 1.4 revêtu du QR Code et du sceau Polygon'
    ]
  },
  {
    id: 'MOD-05',
    stepNumber: 5,
    title: 'Présentation de l\'acte aux postes frontaliers DGDA / DGRAD / DGI',
    targetRequirements: ['VER-02', 'VER-03', 'VER-04'],
    summary: 'Présentez l\'attestation imprimée ou le fichier PDF reçu par email à l\'inspecteur douanier au poste frontière (Matadi, Kasumbalesa, Goma, N\'djili).',
    checklist: [
      'Scan du QR Code ou saisie du numéro d\'acte sur /verifier : Pastille Verte en moins de 2 secondes',
      'Vérification possible sans scan QR en déposant directement le fichier PDF sur /verifier (VER-04)'
    ]
  }
];

export default function GuidePage() {
  const [modules, setModules] = useState(DEFAULT_GUIDE_MODULES);
  const [activeTab, setActiveTab] = useState('ONG');

  useEffect(() => {
    fetch('/api/ops/production?section=guide-ong')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.dep03OngUserGuide?.modules) {
          setModules(data.dep03OngUserGuide.modules);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: '920px', margin: '20px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <Badge status="valide" style={{ marginBottom: '6px' }}>
            DEP-03 &bull; DEP-04 &bull; DEP-05 &bull; Guides &amp; Formations Officielles
          </Badge>
          <h2 style={{ margin: 0 }}>Guide Utilisateur ONG/ASBL &amp; Supports de Formation</h2>
          <p className="text-muted" style={{ fontSize: '13px', margin: '4px 0 0' }}>
            Manuel illustré pas-à-pas pour les organisations humanitaires et supports de transfert de compétences FNPSS, Ministères et Douanes DGDA.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeTab === 'ONG' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('ONG')}
          >
            📘 Guide ONG / ASBL (DEP-03)
          </Button>
          <Button
            variant={activeTab === 'STAFF' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('STAFF')}
          >
            🎓 Formations FNPSS / Ministères / DGDA (DEP-04/05)
          </Button>
        </div>
      </div>

      {activeTab === 'ONG' ? (
        <div>
          {modules.map((mod) => (
            <Card
              key={mod.id}
              title={`Étape ${mod.stepNumber} — ${mod.title}`}
              actions={<Badge status="soumis">{mod.targetRequirements.join(' · ')}</Badge>}
            >
              <p style={{ fontSize: '13.5px', marginBottom: '12px' }}>{mod.summary}</p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-main)' }}>
                {mod.checklist.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <Card title="1. Formation des Administrateurs & Instructeurs FNPSS (DEP-04)">
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              <li>Contrôle de recevabilité des pièces P1 à P6 via la visionneuse PDF côte-à-côte (`ADM-04`, `ADM-05`).</li>
              <li>Rapprochement bancaire de la quittance `P6` (`20 USD` dépôt + `300 USD` enquête = `320 USD`) et détection automatique des doublons (`GOV-11`).</li>
              <li>Approbation DG, scellement `SHA-256`, ancrage via le Relayer Paymaster et file résiliente (`BLK-09`, `BLK-10`).</li>
              <li>Procédure de révocation à double confirmation DG avec alerte synchrone DGDA / DGRAD / DGI (`VER-06`).</li>
            </ul>
          </Card>

          <Card title="2. Formation des Agents Valideurs des Ministères de Tutelle (DEP-05)">
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              <li>Examen des dossiers `S2` (Convention de partenariat) et `S6` (Arrêté ministériel d&apos;exonération) approuvés par la DG du FNPSS.</li>
              <li>Apposition de la co-signature ministérielle avec numéro de référence de l&apos;arrêté (`ADM-06`, `BLK-06`).</li>
            </ul>
          </Card>

          <Card title="3. Formation des Inspecteurs Douaniers DGDA aux Postes Frontaliers (DEP-05)">
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              <li>Scan du QR Code sur smartphone au poste frontière (`/verifier`) : lecture immédiate en plein soleil (`UX-06`, `VER-03`).</li>
              <li>Signification des pastilles : <strong>Pastille Verte</strong> (mainlevée autorisée), <strong>Pastille Rouge</strong> (acte falsifié ou révoqué par la DG), <strong>Pastille Grise</strong> (acte expiré).</li>
              <li>Contrôle d&apos;un PDF reçu par email sans scan QR Code par recalcul `SHA-256` direct (`VER-04`).</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
