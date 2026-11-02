-- ============================================================================
-- GUICHET UNIQUE FNPSS (RDC) — SCHEMA RELATIONNEL POSTGRESQL (OPS-03)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Rôles Utilisateurs (RBAC : ADM-01)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('REQUERANT', 'AGENT', 'CHEF_DIVISION', 'DG', 'MINISTERE', 'DOUANE', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(128) UNIQUE,
    wallet_address VARCHAR(42),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(40),
    role user_role NOT NULL DEFAULT 'REQUERANT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Organisations Requérantes (ONG, ASBL, Fondations, Mécènes : REQ-04)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    legal_name VARCHAR(255) NOT NULL,
    acronym VARCHAR(50),
    org_type VARCHAR(60) NOT NULL,
    registration_number VARCHAR(100),
    fnpss_enrollment_number VARCHAR(100),
    province VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    legal_representative VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Catalogue des 6 Services Administratifs (S1 à S6 : REQ-05)
CREATE TABLE IF NOT EXISTS services (
    code VARCHAR(10) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deposit_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 20.00,
    inquiry_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 300.00,
    sla_business_days INT NOT NULL DEFAULT 10,
    requires_ministry_signoff BOOLEAN NOT NULL DEFAULT FALSE,
    required_document_types JSONB NOT NULL
);

-- 4. Demandes / Dossiers (REQ-06, ADM-04)
DO $$ BEGIN
    CREATE TYPE application_status AS ENUM (
        'BROUILLON',
        'SOUMIS',
        'EN_COURS_INSTRUCTION',
        'COMPLEMENT_REQUIS',
        'AVIS_FAVORABLE',
        'EN_VALIDATION_MINISTERE',
        'VALIDE_DELIVRE',
        'REJETE'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    service_code VARCHAR(10) NOT NULL REFERENCES services(code),
    submitted_by UUID NOT NULL REFERENCES users(id),
    assigned_agent_id UUID REFERENCES users(id),
    project_title VARCHAR(255) NOT NULL,
    project_summary TEXT NOT NULL,
    goods_metadata JSONB,
    status application_status NOT NULL DEFAULT 'BROUILLON',
    rejection_or_complement_reason TEXT,
    submitted_at TIMESTAMPTZ,
    sla_started_at TIMESTAMPTZ,
    sla_due_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Pièces Justificatives (P1 à P6 : REQ-07, ADM-05)
CREATE TABLE IF NOT EXISTS application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    is_compliant BOOLEAN,
    agent_comment TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Paiements et Quittances de Frais (20 USD + 300 USD : GOV-11, REQ-10)
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('EN_ATTENTE', 'PREUVE_DEPOSEE', 'VALIDE', 'REJETE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    deposit_amount_usd NUMERIC(10,2) NOT NULL DEFAULT 20.00,
    inquiry_amount_usd NUMERIC(10,2) NOT NULL DEFAULT 300.00,
    amount_cdf NUMERIC(18,2),
    payment_channel VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(120) NOT NULL,
    receipt_document_id UUID REFERENCES application_documents(id),
    status payment_status NOT NULL DEFAULT 'PREUVE_DEPOSEE',
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Actes Officiels Scellés (VER-01, VER-02, VER-06)
DO $$ BEGIN
    CREATE TYPE certificate_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id),
    certificate_number VARCHAR(60) UNIQUE NOT NULL,
    service_code VARCHAR(10) NOT NULL REFERENCES services(code),
    pdf_storage_key VARCHAR(512) NOT NULL,
    pdf_sha256_hash CHAR(64) UNIQUE NOT NULL,
    qr_verification_url TEXT NOT NULL,
    issued_by UUID NOT NULL REFERENCES users(id),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status certificate_status NOT NULL DEFAULT 'ACTIVE',
    revoked_by UUID REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT
);

-- 8. Ancrage Blockchain et File de Transactions (BLK-09, BLK-10)
DO $$ BEGIN
    CREATE TYPE anchor_tx_status AS ENUM ('QUEUED', 'SUBMITTED', 'CONFIRMED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS blockchain_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID UNIQUE NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    network VARCHAR(40) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) UNIQUE,
    block_number BIGINT,
    tx_status anchor_tx_status NOT NULL DEFAULT 'QUEUED',
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Notifications Utilisateurs (NOT-01, NOT-02)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Journal d'Audit Immuable (ADM-07)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id),
    actor_role VARCHAR(40),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_org ON applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_certificates_hash ON certificates(pdf_sha256_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);

