import React from 'react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import AppIcon from '../components/ui/AppIcon.jsx';

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
    { label: 'Délai Légal Garanti', detail: 'SLA 10 jours ouvrables', color: 'var(--fnpss-navy)' },
    { label: 'Principe Once-Only', detail: 'Zéro redépôt des pièces', color: 'var(--fnpss-gold)' }
  ];

  return (
    <div>
      {/* Bannière de Bienvenue Institutionnelle alignée sur fnpss.org */}
      <section
        aria-label="Présentation du Guichet Unique FNPSS"
        className="hero-banner"
      >
        <div className="hero-split">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)'
                }}
              >
                <img
                  src="/brand/logo-fnpss-horizontal.webp"
                  alt="Logo officiel FNPSS — Le social dans la solidarité"
                  width={215}
                  height={73}
                  style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              <div>
                <Badge status="valide" style={{ background: 'rgba(255,255,255,0.16)', color: '#ffffff', marginBottom: '4px' }}>
                  Établissement Public &bull; République Démocratique du Congo
                </Badge>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f7d618', letterSpacing: '0.02em' }}>
                  Tutelle : Ministère des Affaires Sociales, Actions Humanitaires &amp; Solidarité Nationale
                </div>
              </div>
            </div>

            <h1 className="hero-title">
              Portail du Guichet Unique Dématérialisé du FNPSS
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '14.5px', maxWidth: '680px', marginBottom: '20px', lineHeight: 1.6 }}>
              Plateforme officielle du Fonds National de Promotion et de Service Social (FNPSS) dédiée aux{' '}
              <strong style={{ color: '#ffffff' }}>investissements sociaux, partenariats, dons humanitaires</strong>,
              agréments et exonérations fiscales et douanières en République Démocratique du Congo, avec suivi temps réel et scellement blockchain infalsifiable.
            </p>

            <div className="flex gap-3 hero-actions" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <a href="/applications/new" className="btn btn-brand btn-lg" style={{ textDecoration: 'none' }}>
                <span>Déposer un dossier en ligne</span>
                <AppIcon name="arrowForward" size="sm" />
              </a>
              <a
                href="/verifier"
                className="btn btn-outline btn-lg"
                style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.12)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.45)' }}
              >
                <AppIcon name="qr" size="sm" />
                <span>Contrôle Douanier DGDA</span>
              </a>
              <a
                href="/auth/login"
                className="btn btn-outline"
                style={{ textDecoration: 'none', background: 'transparent', color: '#ffffff', borderColor: 'rgba(255,255,255,0.35)' }}
              >
                Espace Requérant
              </a>
              <a
                href="https://www.fnpss.org/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#bfdbfe', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}
              >
                <span>Site officiel www.fnpss.org</span>
                <AppIcon name="external" size="xs" />
              </a>
            </div>
          </div>

          <div className="hero-media-card">
            <img
              src="/brand/hero-solidarite-nationale.webp"
              alt="Campagne de Solidarité Nationale sous le haut patronage de la Présidence et du Ministère des Affaires Sociales — FNPSS RDC"
              width={1000}
              height={627}
              decoding="async"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            <div className="hero-media-caption">
              <span>Campagne de Solidarité Nationale &bull; FNPSS RDC</span>
              <span style={{ color: '#f7d618', fontWeight: 700 }}>Kinshasa-Gombe</span>
            </div>
          </div>
        </div>

        <img src="/brand/fnpss-wave.svg" alt="" aria-hidden="true" className="hero-wave" />
      </section>

      {/* Ruban de Signaux de Confiance */}
      <div
        role="region"
        aria-label="Garanties techniques et légales"
        className="trust-grid"
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
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-navy)' }}>
          <div className="lbl">Résilience Rurale</div>
          <div className="val">&lt; 3.0 s</div>
          <div className="sub">Budget de performance 3G rurale</div>
        </div>
      </div>

      {/* Catalogue des 6 Services */}
      <div style={{ marginBottom: '28px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ marginBottom: '2px' }}>Catalogue des Services Dématérialisés</h2>
            <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
              Sélectionnez votre procédure officielle pour démarrer le dépôt avec pré-remplissage guidé.
            </p>
          </div>
          <a href="/guide" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
            <AppIcon name="guide" size="xs" />
            <span>Consulter le guide usager</span>
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
                      color: 'var(--fnpss-blue)',
                      background: 'var(--fnpss-blue-soft)',
                      border: '1px solid #bfdbfe',
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <AppIcon name="clock" size="xs" />
                    <span><strong>Délai :</strong> {svc.sla}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <AppIcon name="payment" size="xs" />
                    <span><strong>Frais :</strong> {svc.frais}</span>
                  </span>
                </div>
                <a href={`/applications/new?service=${svc.code}`} className="btn btn-primary btn-sm" style={{ width: '100%', textDecoration: 'none' }}>
                  <span>Initier la démarche</span>
                  <AppIcon name="arrowForward" size="xs" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission institutionnelle & Programmes phares alignés sur fnpss.org */}
      <Card
        title="À propos du FNPSS & Programmes Nationaux Phares"
        subtitle="Établissement Public (Décret n°13/007 du 23 janvier 2013) • Siège social : Kinshasa-Gombe"
      >
        <div className="mission-section-grid">
          <div style={{ display: 'grid', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6 }}>
              Placé sous la tutelle du <strong>Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale</strong>,
              le FNPSS mobilise et canalise les financements sociaux, accompagne les partenariats et assure l&apos;appui humanitaire
              aux populations vulnérables sur l&apos;ensemble du territoire congolais.
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ background: 'var(--surface-subtle)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-blue)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--fnpss-navy)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <AppIcon name="business" size="xs" />
                    <span>Investissements Sociaux &amp; Conventions de Partenariat</span>
                  </strong>
                  <a href="/applications/new?service=S2" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-blue)', textDecoration: 'none' }}>
                    Procédure S2 &rarr;
                  </a>
                </div>
                <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
                  Protocoles d&apos;accord et conventions cadre entre le FNPSS, les ONG/ASBL et les bailleurs institutionnels.
                </p>
              </div>
              <div style={{ background: 'var(--surface-subtle)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-green)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--fnpss-navy)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <AppIcon name="users" size="xs" />
                    <span>Dons Humanitaires, Philanthropie &amp; Exonérations</span>
                  </strong>
                  <a href="/applications/new?service=S5" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-blue)', textDecoration: 'none' }}>
                    Procédure S5 &rarr;
                  </a>
                </div>
                <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
                  Attestations officielles pour les dons humanitaires, fondations et demandes de franchise douanière.
                </p>
              </div>
              <div style={{ background: 'var(--surface-subtle)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-gold)' }}>
                <strong style={{ color: 'var(--fnpss-navy)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <AppIcon name="launch" size="xs" />
                  <span>Programmes Structurants : PABEA-COBALT &amp; PROSECAL-PS</span>
                </strong>
                <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
                  Réinsertion socio-économique des jeunes sortis des mines artisanales de cobalt et appui à la sécurité alimentaire des ménages vulnérables.
                </p>
              </div>
            </div>
          </div>

          <div className="mission-photo-frame">
            <img
              src="/brand/terrain-fnpss-action.jpg"
              alt="Intervention de terrain et projets sociaux du FNPSS en République Démocratique du Congo"
              width={960}
              height={540}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            <div style={{ padding: '10px 14px', background: 'var(--surface-subtle)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
              <span className="text-muted">Actions terrain &amp; relèvement communautaire en RDC</span>
              <a
                href="https://www.fnpss.org/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--fnpss-blue)', fontWeight: 700, textDecoration: 'none' }}
              >
                Actualités sur fnpss.org &rarr;
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Section Tutelle, Partenaires Institutionnels & Régies */}
      <Card title="Tutelle, Partenaires Institutionnels & Régies Financières">
        <div className="partners-strip">
          <div className="partner-logo-card">
            <img
              src="/brand/logo-fnpss-horizontal.webp"
              alt="Logo officiel horizontal FNPSS"
              width={200}
              height={68}
              style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto', display: 'block' }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--fnpss-navy)' }}>FNPSS</strong> &mdash; Établissement Public de Service Social
            </div>
          </div>
          <div className="partner-logo-card">
            <div className="ministere-logo-crop">
              <img
                src="/brand/logo-ministere-affaires-sociales.webp"
                alt="Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale"
                width={210}
                height={74}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--fnpss-navy)' }}>Ministère de Tutelle</strong> &mdash; Affaires Sociales &amp; Solidarité
            </div>
          </div>
          <div className="partner-logo-card">
            <img
              src="/brand/logo-fsrdc.png"
              alt="Fonds Social de la République Démocratique du Congo (FSRDC)"
              width={195}
              height={70}
              style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto', display: 'block' }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--fnpss-navy)' }}>FSRDC</strong> &mdash; Fonds Social de la RDC
            </div>
          </div>
        </div>

        <p style={{ marginTop: 0 }}>
          Le Guichet Unique FNPSS est interconnecté avec les systèmes d&apos;information des régies de recettes de la République Démocratique du Congo :
        </p>
        <div className="regies-grid">
          <div style={{ background: 'var(--surface-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-blue)' }}>
            <strong style={{ color: 'var(--fnpss-navy)' }}>DGDA (Douanes) :</strong>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Vérification instantanée en douane via QR Code sécurisé et intégration SydoniaWorld (API OpenAPI 3.0).
            </p>
          </div>
          <div style={{ background: 'var(--surface-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-green)' }}>
            <strong style={{ color: 'var(--fnpss-navy)' }}>DGI (Impôts) :</strong>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Contrôle des exemptions d&apos;impôts directs et taxe sur la valeur ajoutée pour les dons humanitaires.
            </p>
          </div>
          <div style={{ background: 'var(--surface-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--fnpss-orange-accessible)' }}>
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
