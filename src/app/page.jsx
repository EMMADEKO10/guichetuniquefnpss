import React from 'react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function HomePage() {
  const services = [
    {
      code: 'S1',
      title: 'Enrôlement ONG & ASBL',
      description: 'Identification initiale, enregistrement des statuts et obtention du matricule national FNPSS.',
      sla: '5 jours ouvrables',
      frais: '20 USD',
      badge: 'Obligatoire',
      badgeVariant: 'info'
    },
    {
      code: 'S2',
      title: 'Convention Cadre de Partenariat',
      description: 'Accréditation institutionnelle et protocole d\'accord avec le Ministère des Affaires Sociales.',
      sla: '10 jours ouvrables',
      frais: 'Inclus',
      badge: 'Partenariat',
      badgeVariant: 'soumis'
    },
    {
      code: 'S3',
      title: 'Avis Technique de Conformité',
      description: 'Attestation de conformité sociale et évaluation technique préalable des projets d\'aide humanitaire.',
      sla: '7 jours ouvrables',
      frais: 'Inclus',
      badge: 'Technique',
      badgeVariant: 'brand'
    },
    {
      code: 'S4',
      title: 'Certificat d\'Exonération Douanière & Fiscale',
      description: 'Attestation officielle scellée par blockchain pour franchise douanière à l\'importation de biens.',
      sla: '10 jours ouvrables',
      frais: '20$ dépôt + 300$ enquête',
      badge: 'Douanes & Impôts',
      badgeVariant: 'valide'
    },
    {
      code: 'S5',
      title: 'Certificat de Philanthropie & Dons',
      description: 'Reconnaissance officielle des dons humanitaires, fondations et legs d\'utilité sociale.',
      sla: '7 jours ouvrables',
      frais: '20 USD',
      badge: 'Philanthropie',
      badgeVariant: 'warning'
    },
    {
      code: 'S6',
      title: 'Arrêté Ministériel Interinstitutionnel',
      description: 'Acte conjoint Affaires Sociales / Finances / Budget pour les programmes pluriannuels d\'envergure.',
      sla: '15 jours ouvrables',
      frais: 'Sur dossier',
      badge: 'Interministériel',
      badgeVariant: 'neutral'
    }
  ];

  const trustSignals = [
    { label: 'Ancrage Blockchain', detail: 'Polygon Amoy • 0 gaz public', color: 'var(--fnpss-green)' },
    { label: 'Chiffrement Coffre-Fort', detail: 'AES-256-GCM • SHA-256', color: 'var(--fnpss-blue)' },
    { label: 'Délai Légal Garanti', detail: 'SLA 10 jours ouvrables', color: 'var(--fnpss-orange-accessible)' },
    { label: 'Principe Once-Only', detail: 'Zéro redépôt des pièces', color: 'var(--fnpss-gold)' }
  ];

  return (
    <div>
      {/* Bannière de Bienvenue Institutionnelle */}
      <section
        aria-label="Présentation du Guichet Unique FNPSS"
        style={{
          background: 'linear-gradient(135deg, var(--fnpss-navy) 0%, #0d3b66 65%, #065a82 100%)',
          color: '#ffffff',
          borderRadius: '14px',
          padding: '32px 28px',
          marginBottom: '18px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '10px',
              padding: '6px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
            }}
          >
            <img
              src="/brand/logo-fnpss.png"
              alt="Logo officiel FNPSS"
              width={44}
              height={44}
              style={{ objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div>
            <Badge status="valide" style={{ background: 'rgba(255,255,255,0.16)', color: '#ffffff', marginBottom: '4px' }}>
              République Démocratique du Congo &bull; Plateforme Officielle Souveraine
            </Badge>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fed7aa', letterSpacing: '0.03em' }}>
              &laquo; Le social dans la solidarité &raquo; &mdash; Fonds National de Promotion et de Service Social
            </div>
          </div>
        </div>

        <h1 style={{ color: '#ffffff', fontSize: '28px', marginBottom: '10px', lineHeight: 1.2 }}>
          Portail du Guichet Unique Dématérialisé
        </h1>
        <p style={{ color: '#e2e8f0', fontSize: '15px', maxWidth: '780px', marginBottom: '22px', lineHeight: 1.6 }}>
          Plateforme souveraine du Fonds National de Promotion et de Service Social (FNPSS) pour l&apos;octroi,
          le suivi en temps réel et la vérification infalsifiable des agréments et exonérations fiscales et douanières en RDC.
        </p>

        <div className="flex gap-4" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/applications/new" className="btn btn-brand btn-lg" style={{ textDecoration: 'none' }}>
            Déposer un dossier en ligne &rarr;
          </a>
          <a
            href="/verifier"
            className="btn btn-outline btn-lg"
            style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.12)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.45)' }}
          >
            Contrôle Douanier DGDA (Scan QR)
          </a>
          <a
            href="/auth/login"
            className="btn btn-outline"
            style={{ textDecoration: 'none', background: 'transparent', color: '#ffffff', borderColor: 'rgba(255,255,255,0.35)' }}
          >
            Espace Requérant
          </a>
        </div>
      </section>

      {/* Ruban de Signaux de Confiance */}
      <div
        role="region"
        aria-label="Garanties techniques et légales"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '10px',
          marginBottom: '22px'
        }}
      >
        {trustSignals.map((sig) => (
          <div
            key={sig.label}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderTop: `3px solid ${sig.color}`,
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-navy)' }}>{sig.label}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{sig.detail}</div>
          </div>
        ))}
      </div>

      {/* Grille des KPI */}
      <div className="kpi-grid">
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-blue)' }}>
          <div className="lbl">Délai Légal Maximum</div>
          <div className="val">10 Jours</div>
          <div className="sub">Instruction et réponse FNPSS</div>
        </div>
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-green)' }}>
          <div className="lbl">Intégrité Blockchain</div>
          <div className="val">Polygon Amoy</div>
          <div className="sub">Vérification publique à 0 gaz</div>
        </div>
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-gold)' }}>
          <div className="lbl">Principe Administratif</div>
          <div className="val">Once-Only</div>
          <div className="sub">Exemption automatique de redépôt</div>
        </div>
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-orange-accessible)' }}>
          <div className="lbl">Résilience Rurale</div>
          <div className="val">&lt; 3.0 s</div>
          <div className="sub">Budget de performance 3G rurale</div>
        </div>
      </div>

      {/* Catalogue des 6 Services */}
      <div style={{ marginBottom: '32px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ marginBottom: '2px' }}>Catalogue des Services Dématérialisés</h2>
            <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
              Sélectionnez votre procédure officielle pour démarrer le dépôt avec pré-remplissage guidé.
            </p>
          </div>
          <a href="/guide" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
            Consulter le guide usager
          </a>
        </div>

        <div className="services-grid">
          {services.map((svc) => (
            <div key={svc.code} className="service-card">
              <div>
                <div className="flex justify-between items-center" style={{ marginBottom: '10px' }}>
                  <span
                    className="mono"
                    style={{
                      fontWeight: 800,
                      color: 'var(--fnpss-navy)',
                      background: 'var(--fnpss-orange-soft)',
                      border: '1px solid #fed7aa',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    {svc.code}
                  </span>
                  <Badge status={svc.badgeVariant}>{svc.badge}</Badge>
                </div>
                <h3 style={{ marginBottom: '6px' }}>{svc.title}</h3>
                <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.55 }}>
                  {svc.description}
                </p>
              </div>
              <div>
                <div
                  style={{
                    background: 'var(--surface-subtle)',
                    padding: '9px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: '1px solid var(--border)',
                    marginBottom: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <span>⏱ <strong>Délai :</strong> {svc.sla}</span>
                  <span>💳 <strong>Frais :</strong> {svc.frais}</span>
                </div>
                <a href={`/applications/new?service=${svc.code}`} className="btn btn-primary btn-sm" style={{ width: '100%', textDecoration: 'none' }}>
                  Initier la démarche &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section Régies & Partenaires */}
      <Card title="Interconnexion avec les Régies Financières & Autorités de Contrôle">
        <p style={{ marginTop: 0 }}>
          Le Guichet Unique FNPSS est interconnecté avec les systèmes d&apos;information des régies de recettes de la République Démocratique du Congo :
        </p>
        <div className="flex gap-4" style={{ flexWrap: 'wrap', marginTop: '12px' }}>
          <div style={{ flex: 1, minWidth: '220px', background: 'var(--surface-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-blue)' }}>
            <strong style={{ color: 'var(--fnpss-navy)' }}>DGDA (Douanes) :</strong>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Vérification instantanée en douane via QR Code sécurisé et intégration SydoniaWorld (API OpenAPI 3.0).
            </p>
          </div>
          <div style={{ flex: 1, minWidth: '220px', background: 'var(--surface-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-green)' }}>
            <strong style={{ color: 'var(--fnpss-navy)' }}>DGI (Impôts) :</strong>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Contrôle des exemptions d&apos;impôts directs et taxe sur la valeur ajoutée pour les dons humanitaires.
            </p>
          </div>
          <div style={{ flex: 1, minWidth: '220px', background: 'var(--surface-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-orange-accessible)' }}>
            <strong style={{ color: 'var(--fnpss-navy)' }}>DGRAD (Recettes non fiscales) :</strong>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Suivi et notification synchronisée en cas de révocation ou suspension des exonérations.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
