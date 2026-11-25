'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/ops/production?section=guide-ong')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.dep03OngUserGuide?.modules) {
          setModules(data.dep03OngUserGuide.modules);
        }
      })
      .catch(() => {});
  }, []);

  const filteredModules = modules.filter((mod) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      mod.title.toLowerCase().includes(q) ||
      mod.summary.toLowerCase().includes(q) ||
      (mod.checklist || []).some((item) => item.toLowerCase().includes(q)) ||
      (mod.targetRequirements || []).some((req) => req.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: '940px', margin: '18px auto 32px' }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderTop: '4px solid var(--fnpss-orange-accessible)',
          borderRadius: '10px',
          padding: '18px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <img
            src="/brand/logo-fnpss.png"
            alt="Logo officiel FNPSS"
            width={44}
            height={44}
            style={{ objectFit: 'contain' }}
          />
          <div>
            <Badge status="valide" style={{ marginBottom: '4px' }}>
              DEP-03 &bull; DEP-04 &bull; DEP-05 &bull; Guides &amp; Formations Officielles
            </Badge>
            <h2 style={{ margin: 0 }}>Guide Utilisateur ONG/ASBL &amp; Supports de Formation</h2>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '3px 0 0' }}>
              &laquo; Le social dans la solidarité &raquo; &mdash; Manuel pas-à-pas pour les organisations humanitaires, instructeurs FNPSS et inspecteurs DGDA.
            </p>
          </div>
        </div>

        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <Button
            variant={activeTab === 'ONG' ? 'brand' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('ONG')}
          >
            📘 Guide ONG / ASBL
          </Button>
          <Button
            variant={activeTab === 'STAFF' ? 'brand' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('STAFF')}
          >
            🎓 Formations FNPSS / DGDA
          </Button>
          <a href="/design-system" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
            🎨 Charte &amp; Signaux
          </a>
        </div>
      </div>

      {/* Contrôle Douanier Express mobile */}
      <Card
        title="Contrôle Douanier Express (≤ 3 clics sur mobile)"
        subtitle="Parcours rapide pour les inspecteurs DGDA, DGI et DGRAD aux postes frontaliers"
        actions={
          <a href="/verifier" className="btn btn-brand btn-sm" style={{ textDecoration: 'none' }}>
            🔍 Ouvrir le Vérificateur
          </a>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px', fontSize: '12.5px' }}>
          <div style={{ background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <strong>1. Scanner ou saisir</strong>
            <div className="text-muted">Ouvrez <code>/verifier</code> et activez la caméra QR ou saisissez le N° d&apos;attestation.</div>
          </div>
          <div style={{ background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <strong>2. Lire la Pastille</strong>
            <div className="text-muted">Pastille Verte = Valide, Pastille Rouge = Révoquée ou falsifiée, Grise = Expirée.</div>
          </div>
          <div style={{ background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <strong>3. PDF sans QR Code</strong>
            <div className="text-muted">Téléversez directement le fichier PDF reçu par email pour comparer son empreinte SHA-256.</div>
          </div>
        </div>
      </Card>

      {activeTab === 'ONG' ? (
        <div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="guide-search" style={{ fontSize: '12.5px' }}>
              Rechercher une étape, pièce (P1–P6) ou exigence (ex: Once-Only, 3G, DGDA)
            </label>
            <input
              id="guide-search"
              type="search"
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer les modules du guide..."
            />
          </div>

          {filteredModules.length === 0 ? (
            <EmptyState
              icon="🔎"
              title="Aucun module correspondant"
              description="Modifiez votre mot-clé pour afficher l'ensemble des étapes du guichet."
              action={
                <Button size="sm" variant="outline" onClick={() => setSearchQuery('')}>
                  Réinitialiser la recherche
                </Button>
              }
            />
          ) : (
            filteredModules.map((mod) => (
              <Card
                key={mod.id}
                title={`Étape ${mod.stepNumber} — ${mod.title}`}
                actions={<Badge status="soumis" className="badge-wrap">{mod.targetRequirements.join(' · ')}</Badge>}
              >
                <p style={{ fontSize: '13.5px', marginBottom: '12px' }}>{mod.summary}</p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-main)' }}>
                  {mod.checklist.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                  ))}
                </ul>
              </Card>
            ))
          )}

          <div className="flex gap-3" style={{ flexWrap: 'wrap', marginTop: '14px' }}>
            <a href="/applications/new" className="btn btn-brand btn-sm" style={{ textDecoration: 'none' }}>
              🚀 Déposer une nouvelle demande
            </a>
            <a href="/dashboard" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
              📋 Suivre mes dossiers
            </a>
          </div>
        </div>
      ) : (
        <div>
          <Card title="1. Formation des Administrateurs & Instructeurs FNPSS (DEP-04)">
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              <li>Contrôle de recevabilité des pièces P1 à P6 via la visionneuse PDF côte-à-côte (<code>ADM-04</code>, <code>ADM-05</code>).</li>
              <li>Rapprochement bancaire de la quittance <code>P6</code> (<code>20 USD</code> dépôt + <code>300 USD</code> enquête = <code>320 USD</code>) et détection automatique des doublons (<code>GOV-11</code>).</li>
              <li>Approbation DG, scellement <code>SHA-256</code>, ancrage via le Relayer Paymaster et file résiliente (<code>BLK-09</code>, <code>BLK-10</code>).</li>
              <li>Procédure de révocation à double confirmation DG avec alerte synchrone DGDA / DGRAD / DGI (<code>VER-06</code>).</li>
            </ul>
          </Card>

          <Card title="2. Formation des Agents Valideurs des Ministères de Tutelle (DEP-05)">
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              <li>Examen des dossiers <code>S2</code> (Convention de partenariat) et <code>S6</code> (Arrêté ministériel d&apos;exonération) approuvés par la DG du FNPSS.</li>
              <li>Apposition de la co-signature ministérielle avec numéro de référence de l&apos;arrêté (<code>ADM-06</code>, <code>BLK-06</code>).</li>
            </ul>
          </Card>

          <Card title="3. Formation des Inspecteurs Douaniers DGDA aux Postes Frontaliers (DEP-05)">
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              <li>Scan du QR Code sur smartphone au poste frontière (<code>/verifier</code>) : lecture immédiate en plein soleil (<code>UX-06</code>, <code>VER-03</code>).</li>
              <li>Signification des pastilles : <strong>Pastille Verte</strong> (mainlevée autorisée), <strong>Pastille Rouge</strong> (acte falsifié ou révoqué par la DG), <strong>Pastille Grise</strong> (acte expiré).</li>
              <li>Contrôle d&apos;un PDF reçu par email sans scan QR Code par recalcul <code>SHA-256</code> direct (<code>VER-04</code>).</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
