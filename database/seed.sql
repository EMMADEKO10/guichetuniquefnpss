-- ============================================================================
-- GUICHET UNIQUE FNPSS (RDC) — DONNEES DE REFERENCE DES 6 SERVICES (OPS-03)
-- ============================================================================

INSERT INTO services (code, title, description, deposit_fee_usd, inquiry_fee_usd, sla_business_days, requires_ministry_signoff, required_document_types)
VALUES
(
    'S1',
    'Attestation d''enrôlement au FNPSS',
    'Reconnaissance et enregistrement officiel de l''organisme humanitaire ou social auprès du FNPSS.',
    20.00, 300.00, 10, FALSE,
    '["P1_REQUETE", "P3_PLAN_ACTION", "P4_RAPPORT", "P5_PROJET", "P6_QUITTANCE"]'::jsonb
),
(
    'S2',
    'Convention de partenariat avec le Gouvernement de la RDC',
    'Accord-cadre bilatéral permettant à l''organisme d''opérer des programmes sociaux et humanitaires en RDC.',
    20.00, 300.00, 10, TRUE,
    '["P1_REQUETE", "P2_ENROLEMENT", "P3_PLAN_ACTION", "P4_RAPPORT", "P5_PROJET", "P6_QUITTANCE"]'::jsonb
),
(
    'S3',
    'Attestation des biens à exonérer',
    'Validation qualitative et quantitative des équipements, véhicules, intrants médicaux ou vivres destinés aux projets sociaux.',
    20.00, 300.00, 10, FALSE,
    '["P1_REQUETE", "P2_ENROLEMENT", "P3_PLAN_ACTION", "P4_RAPPORT", "P5_PROJET", "P6_QUITTANCE"]'::jsonb
),
(
    'S4',
    'Certificat d''exonérations',
    'Document officiel conférant le droit à la franchise douanière et fiscale, vérifiable par QR Code par la DGDA.',
    20.00, 300.00, 10, FALSE,
    '["P1_REQUETE", "P2_ENROLEMENT", "P3_PLAN_ACTION", "P4_RAPPORT", "P5_PROJET", "P6_QUITTANCE"]'::jsonb
),
(
    'S5',
    'Certificat de philanthropie',
    'Attestation officielle d''utilité publique et sociale délivrée aux donateurs, fondations et mécènes.',
    20.00, 300.00, 10, FALSE,
    '["P1_REQUETE", "P2_ENROLEMENT", "P3_PLAN_ACTION", "P4_RAPPORT", "P5_PROJET", "P6_QUITTANCE"]'::jsonb
),
(
    'S6',
    'Arrêté ministériel portant avis favorable pour l''exonération',
    'Acte réglementaire signé par le Ministre de tutelle après instruction favorable du FNPSS pour exonération des droits et taxes.',
    20.00, 300.00, 10, TRUE,
    '["P1_REQUETE", "P2_ENROLEMENT", "P3_PLAN_ACTION", "P4_RAPPORT", "P5_PROJET", "P6_QUITTANCE"]'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    deposit_fee_usd = EXCLUDED.deposit_fee_usd,
    inquiry_fee_usd = EXCLUDED.inquiry_fee_usd,
    sla_business_days = EXCLUDED.sla_business_days,
    requires_ministry_signoff = EXCLUDED.requires_ministry_signoff,
    required_document_types = EXCLUDED.required_document_types;

