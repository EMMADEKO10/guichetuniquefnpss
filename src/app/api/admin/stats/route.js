/**
 * @fileoverview Route API Next.js — Tableau de Bord Statistique Exécutif (ADM-09)
 * et Réconciliation Comptable des Quittances 20 USD + 300 USD = 320 USD (GOV-11, REQ-10).
 * - GET  /api/admin/stats : indicateurs par service S1–S6, statut, province, encaissements et export CSV (`?format=csv`)
 * - POST /api/admin/stats : enregistrement anti-doublon (`register-receipt`) ou rapprochement bancaire (`reconcile-receipt`)
 */

import { newsAndStatsService } from '../../../../cms/news-and-stats.mjs';
import { paymentReconciliationLedger } from '../../../../finance/payment-reconciliation.mjs';
import { applicationEngine } from '../../../../workflow/application-engine.mjs';
import { authService } from '../../../../auth/auth-service.mjs';
import { requireActor, isStaff, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    if (!isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès réservé au personnel habilité FNPSS.');
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const applications = applicationEngine.listApplications();
    const applicants = authService.listApplicants();

    // Synchroniser dans le grand-livre les dossiers ayant une référence de paiement non encore enregistrée
    for (const app of applications) {
      if (app.paymentReference && !paymentReconciliationLedger.receiptsByDossierRef.has(app.referenceNumber)) {
        try {
          paymentReconciliationLedger.registerPaymentReceipt({
            referenceNumber: app.referenceNumber,
            organizationName: app.organizationName,
            serviceCode: app.serviceCode,
            paymentReference: app.paymentReference
          });
          if (app.paymentValidated) {
            paymentReconciliationLedger.reconcileAndValidateReceipt(
              { id: 'system_sync', role: 'AGENT' },
              app.referenceNumber,
              { bankStatementMatch: true }
            );
          }
        } catch {
          // Ignorer en cas de doublon déjà tracé
        }
      }
    }

    if (format === 'csv') {
      const csv = paymentReconciliationLedger.exportLedgerCsv();
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fnpss-statistiques-reconciliation.csv"'
        }
      });
    }

    const stats = newsAndStatsService.computeExecutiveStats(applications, applicants);
    const reconciliation = paymentReconciliationLedger.getReconciliationSummary();

    return Response.json({
      success: true,
      stats,
      reconciliation
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    if (!isStaff(actor)) {
      throw new HttpError(403, 'RBAC: Accès réservé au personnel habilité FNPSS.');
    }

    const body = await readJson(request);
    const action = body.action || 'register-receipt';

    if (action === 'register-receipt') {
      const receipt = paymentReconciliationLedger.registerPaymentReceipt({
        referenceNumber: body.referenceNumber,
        organizationName: body.organizationName,
        serviceCode: body.serviceCode || 'S6',
        paymentReference: body.paymentReference
      });
      await persistToNeon();
      return Response.json({
        success: true,
        action: 'register-receipt',
        receipt
      }, { status: 201 });
    }

    if (action === 'reconcile-receipt') {
      const receipt = paymentReconciliationLedger.reconcileAndValidateReceipt(
        actor,
        body.referenceNumber || body.paymentReference,
        {
          bankStatementMatch: body.bankStatementMatch !== false,
          bankNote: body.bankNote
        }
      );
      await persistToNeon();
      return Response.json({
        success: true,
        action: 'reconcile-receipt',
        receipt
      });
    }

    throw new HttpError(400, `Action de réconciliation inconnue : ${action}`);
  } catch (err) {
    return errorResponse(err);
  }
}

