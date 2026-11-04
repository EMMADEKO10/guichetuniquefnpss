/**
 * @fileoverview Moteur de Réconciliation Comptable et Anti-Doublon des Quittances (GOV-11, REQ-10)
 * pour la Direction Financière du FNPSS (20 USD frais de dépôt + 300 USD frais d'enquête = 320 USD / CDF).
 */

import { calculateServiceFees } from '../domain/services-catalog.mjs';
import { assertPermission } from '../workflow/application-engine.mjs';

export const SUPPORTED_DRC_PAYMENT_CHANNELS = Object.freeze({
  RAWBANK: 'Rawbank RDC',
  EQUITYBCDC: 'EquityBCDC RDC',
  BCDC: 'EquityBCDC (Ex-BCDC)',
  TMB: 'Trust Merchant Bank (TMB)',
  FBNBANK: 'FirstBank DRC (FBNBank)',
  MPESA: 'Vodacom M-Pesa RDC',
  AIRTEL: 'Airtel Money RDC',
  ORANGE: 'Orange Money RDC'
});

/**
 * Identifie le canal bancaire ou Mobile Money à partir de la référence de quittance P6.
 */
export function detectPaymentChannel(paymentReference) {
  const clean = String(paymentReference || '').trim().toUpperCase();
  for (const [prefix, label] of Object.entries(SUPPORTED_DRC_PAYMENT_CHANNELS)) {
    if (clean.startsWith(prefix)) {
      return { code: prefix, label };
    }
  }
  return { code: 'AUTRE_BANQUE_RDC', label: 'Virement Bancaire / Guichet Agréé RDC' };
}

export class PaymentReconciliationLedger {
  constructor(exchangeRateCdfPerUsd = 2800) {
    this.exchangeRateCdfPerUsd = exchangeRateCdfPerUsd;
    this.receiptsByPaymentRef = new Map();
    this.receiptsByDossierRef = new Map();
    this.voucherSeq = 1;
  }

  /**
   * Enregistre une preuve de paiement P6 et bloque toute tentative de réutilisation
   * d'une même quittance sur plusieurs dossiers (GOV-11, REQ-10).
   */
  registerPaymentReceipt({
    referenceNumber,
    organizationName,
    serviceCode = 'S6',
    paymentReference,
    registeredAtIso = new Date().toISOString()
  }) {
    const cleanPayRef = String(paymentReference || '').trim().toUpperCase();
    if (!cleanPayRef || cleanPayRef.length < 5) {
      throw new Error('REQ-10: Référence de preuve de paiement (quittance P6) invalide ou trop courte');
    }
    if (!referenceNumber) {
      throw new Error('REQ-10: Numéro de dossier requis pour rattacher la quittance P6');
    }

    const existing = this.receiptsByPaymentRef.get(cleanPayRef);
    if (existing && existing.referenceNumber !== referenceNumber) {
      throw new Error(
        `GOV-11/REQ-10: Fraude ou doublon détecté — la quittance ${cleanPayRef} est déjà utilisée sur le dossier ${existing.referenceNumber}`
      );
    }

    const fees = calculateServiceFees(serviceCode, this.exchangeRateCdfPerUsd);
    const channel = detectPaymentChannel(cleanPayRef);

    const entry = {
      paymentReference: cleanPayRef,
      referenceNumber,
      organizationName: organizationName || 'ONG Requérante',
      serviceCode,
      channelCode: channel.code,
      channelLabel: channel.label,
      depositFeeUsd: fees.depositFeeUsd,
      inquiryFeeUsd: fees.inquiryFeeUsd,
      totalUsd: fees.totalUsd,
      totalCdf: fees.totalCdf,
      exchangeRateCdfPerUsd: this.exchangeRateCdfPerUsd,
      status: 'PENDING_VERIFICATION',
      voucherNumber: null,
      reconciledBy: null,
      reconciledAtIso: null,
      bankNote: '',
      registeredAtIso
    };

    this.receiptsByPaymentRef.set(cleanPayRef, entry);
    this.receiptsByDossierRef.set(referenceNumber, entry);
    return { ...entry };
  }

  /**
   * Valide ou rejette une quittance après rapprochement avec le relevé bancaire du FNPSS (GOV-11).
   */
  reconcileAndValidateReceipt(actor, dossierOrPaymentRef, {
    bankStatementMatch = true,
    bankNote = 'Rapprochement relevé bancaire FNPSS conforme (20 USD dépôt + 300 USD enquête)'
  } = {}) {
    assertPermission(actor, 'VALIDATE_PAYMENT');
    const key = String(dossierOrPaymentRef || '').trim();
    const entry = this.receiptsByDossierRef.get(key) || this.receiptsByPaymentRef.get(key.toUpperCase());
    if (!entry) {
      throw new Error(`GOV-11: Aucune quittance trouvée pour la référence ${key}`);
    }

    entry.reconciledBy = actor.id;
    entry.reconciledAtIso = new Date().toISOString();
    entry.bankNote = bankNote;

    if (bankStatementMatch) {
      entry.status = 'RECONCILED_VALIDATED';
      if (!entry.voucherNumber) {
        entry.voucherNumber = `BORD-FNPSS-2026-${String(this.voucherSeq++).padStart(5, '0')}`;
      }
    } else {
      entry.status = 'REJECTED_DISCREPANCY';
    }

    return { ...entry };
  }

  /**
   * Génère la synthèse comptable pour la Direction Financière du FNPSS (GOV-11).
   */
  getReconciliationSummary() {
    const all = Array.from(this.receiptsByDossierRef.values());
    const validated = all.filter(r => r.status === 'RECONCILED_VALIDATED');
    const pending = all.filter(r => r.status === 'PENDING_VERIFICATION');
    const rejected = all.filter(r => r.status === 'REJECTED_DISCREPANCY');

    const totalDepositUsd = validated.reduce((sum, r) => sum + r.depositFeeUsd, 0);
    const totalInquiryUsd = validated.reduce((sum, r) => sum + r.inquiryFeeUsd, 0);
    const totalValidatedUsd = validated.reduce((sum, r) => sum + r.totalUsd, 0);
    const totalValidatedCdf = validated.reduce((sum, r) => sum + r.totalCdf, 0);

    return {
      totalReceiptsCount: all.length,
      validatedCount: validated.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      breakdownValidatedUsd: {
        depositFeesUsd: totalDepositUsd,
        inquiryFeesUsd: totalInquiryUsd,
        totalUsd: totalValidatedUsd
      },
      totalValidatedCdf,
      exchangeRateCdfPerUsd: this.exchangeRateCdfPerUsd,
      entries: all.map(r => ({ ...r }))
    };
  }

  /**
   * Exporte le grand-livre des quittances au format CSV pour la comptabilité FNPSS (GOV-11).
   */
  exportLedgerCsv() {
    const headers = [
      'Bordereau_FNPSS',
      'Dossier_Ref',
      'Quittance_Ref',
      'Canal_Bancaire',
      'Organisation',
      'Service',
      'Frais_Depot_USD',
      'Frais_Enquete_USD',
      'Total_USD',
      'Total_CDF',
      'Statut_Reconciliation'
    ];
    const rows = Array.from(this.receiptsByDossierRef.values()).map(r => [
      r.voucherNumber || 'EN_ATTENTE',
      r.referenceNumber,
      r.paymentReference,
      `"${r.channelLabel}"`,
      `"${r.organizationName}"`,
      r.serviceCode,
      r.depositFeeUsd,
      r.inquiryFeeUsd,
      r.totalUsd,
      r.totalCdf,
      r.status
    ]);
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

