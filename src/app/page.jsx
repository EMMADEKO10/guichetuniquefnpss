import React from 'react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';

export default function HomePage() {
  const services = [
    {
      code: 'S1',
      title: 'Enrôlement ONG & ASBL',
      description: 'Identification initiale, enregistrement des statuts et obtention du matricule national FNPSS.',
      sla: '5 jours ouvrables',
      frais: '20 USD',
      badge: 'Obligatoire'
    },
    {
      code: 'S2',
      title: 'Convention Cadre de Partenariat',
      description: 'Accréditation institutionnelle et protocole d\'accord avec le Ministère des Affaires Sociales.',
      sla: '10 jours ouvrables',
      frais: 'Inclus',
      badge: 'Partenariat'
    },
    {
      code: 'S3',
      title: 'Avis Technique de Conformité',
      description: 'Attestation de conformité sociale et évaluation technique préalable des projets d\'aide humanitaire.',
      sla: '7 jours ouvrables',
      frais: 'Inclus',
      badge: 'Technique'
    },
    {
      code: 'S4',
      title: 'Certificat d\'Exonération Douanière & Fiscale',
      description: 'Attestation officielle scellée par blockchain pour franchise douanière à l\'importation de biens.',
      sla: '10 jours ouvrables',
      frais: '20$ dépôt + 300$ enquête',
      badge: 'Douanes & Impôts'
    },
    {
      code: 'S5',
      title: 'Certificat de Philanthropie & Dons',
      description: 'Reconnaissance officielle des dons humanitaires, fondations et legs d\'utilité sociale.',
      sla: '7 jours ouvrables',
      frais: '20 USD',
      badge: 'Philanthropie'
    },
    {
      code: 'S6',
      title: 'Arrêté Ministériel Interinstitutionnel',
      description: 'Acte conjoint Affaires Sociales / Finances / Budget pour les programmes pluriannuels d\'envergure.',
      sla: '15 jours ouvrables',
      frais: 'Sur dossier',
      badge: 'Interministériel'
    }
  ];

  return (
    <div>
      {/* Bannière de Bienvenue */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--fnpss-navy), #065a82)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '32px 28px',
          marginBottom: '28px',
          boxShadow: '0 4px 16px rgba(10,37,64,0.12)'
        }}
      >
        <Badge status="valide" style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
          Plateforme Officielle Souveraine
        </Badge>
        <h1 style={{ color: '#ffffff', fontSize: '28px', marginBottom: '10px' }}>
          Portail du Guichet Unique Dématérialisé
        </h1>
        <p style={{ color: '#e2e8f0', fontSize: '15px', maxWidth: '780px', marginBottom: '20px' }}>
          Plateforme dématérialisée du Fonds National de Promotion et de Service Social (FNPSS) pour l'octroi,
          le suivi et la vérification infalsifiable des agréments et exonérations fiscales et douanières en République Démocratique du Congo.
        </p>
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <a href="/applications/new" className="btn btn-accent" style={{ textDecoration: 'none' }}>
            🚀 Déposer un dossier en ligne
          </a>
          <a href="/verifier" className="btn btn-outline" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
            🔍 Contrôle Douanier DGDA (Scan QR)
          </a>
          <a href="/auth/login" className="btn btn-outline" style={{ textDecoration: 'none', background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
            👤 Espace Requérant
          </a>
        </div>
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
        <div className="kpi-box" style={{ borderLeftColor: 'var(--fnpss-accent)' }}>
          <div className="lbl">Résilience Rurale</div>
          <div className="val">&lt; 3.0 s</div>
          <div className="sub">Budget de performance 3G rurale</div>
        </div>
      </div>

      {/* Catalogue des 6 Services */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '14px' }}>Catalogue des Services Dématérialisés</h2>
        <div className="services-grid">
          {services.map((svc) => (
            <div key={svc.code} className="service-card">
              <div>
                <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                  <span className="mono" style={{ fontWeight: 800, color: 'var(--fnpss-blue)', fontSize: '14px' }}>
                    {svc.code}
                  </span>
                  <Badge status="soumis">{svc.badge}</Badge>
                </div>
                <h3>{svc.title}</h3>
                <p className="text-muted" style={{ fontSize: '13px' }}>
                  {svc.description}
                </p>
              </div>
              <div>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid #eef2f6', marginBottom: '14px' }}>
                  ⏱ <strong>Délai :</strong> {svc.sla} &bull; 💳 <strong>Frais :</strong> {svc.frais}
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
        <p>
          Le Guichet Unique FNPSS est interconnecté avec les systèmes d'information des régies de recettes de la République Démocratique du Congo :
        </p>
        <div className="flex gap-4" style={{ flexWrap: 'wrap', marginTop: '12px' }}>
          <div style={{ flex: 1, minWidth: '220px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--fnpss-navy)' }}>🛃 DGDA (Douanes) :</strong>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Vérification instantanée en douane via QR Code sécurisé et intégration SydoniaWorld (API OpenAPI 3.0).
            </p>
          </div>
          <div style={{ flex: 1, minWidth: '220px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--fnpss-navy)' }}>🏛️ DGI (Impôts) :</strong>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Contrôle des exemptions d'impôts directs et taxe sur la valeur ajoutée pour les dons humanitaires.
            </p>
          </div>
          <div style={{ flex: 1, minWidth: '220px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--fnpss-navy)' }}>📑 DGRAD (Recettes non fiscales) :</strong>
            <p className="text-muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Suivi et notification synchronisée en cas de révocation ou suspension des exonérations.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
