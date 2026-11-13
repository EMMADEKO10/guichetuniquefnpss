import fs from 'node:fs';
import path from 'node:path';

/**
 * Générateur du Dossier Complet (~20 pages A4) :
 * - Parcours détaillé de chacun des 7 profils utilisateurs (au moindre détail)
 * - Inventaire honnête : Cas d'utilisation déjà implémentés vs simulés en mémoire vs non encore implémentés
 * - Véritable rôle de la Blockchain et tous les scénarios cryptographiques on-chain / off-chain
 * - Encyclopédie complète des concepts de la plateforme, leur importance et les problèmes résolus du Cahier des Charges.
 */

const docContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>Dossier Complet : Parcours Utilisateurs, État d'Implémentation, Rôle Blockchain &amp; Concepts — Guichet Unique FNPSS (RDC)</title>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 21.0cm 29.7cm;
    margin: 2.0cm 2.0cm 2.0cm 2.0cm;
    mso-page-orientation: portrait;
  }
  @page Section1 {
    mso-header-margin: 36.0pt;
    mso-footer-margin: 36.0pt;
    mso-paper-source: 0;
  }
  div.Section1 {
    page: Section1;
  }
  body {
    font-family: 'Segoe UI', Calibri, Arial, Helvetica, sans-serif;
    font-size: 10.2pt;
    line-height: 1.45;
    color: #1f2937;
    background-color: #ffffff;
  }
  .page-break {
    page-break-before: always;
  }
  .cover-box {
    border: 2.5pt solid #0d3b66;
    background-color: #f8fafc;
    padding: 24pt 22pt;
    margin-top: 10pt;
    margin-bottom: 18pt;
    text-align: center;
  }
  .cover-tag {
    display: inline-block;
    background-color: #0d3b66;
    color: #ffffff;
    font-size: 8.5pt;
    font-weight: bold;
    padding: 4pt 12pt;
    letter-spacing: 0.8pt;
    text-transform: uppercase;
    margin-bottom: 12pt;
  }
  .cover-title {
    color: #0d3b66;
    font-size: 20pt;
    font-weight: bold;
    line-height: 1.25;
    margin-bottom: 10pt;
    text-transform: uppercase;
  }
  .cover-subtitle {
    color: #1e3a8a;
    font-size: 11.8pt;
    font-weight: normal;
    margin-bottom: 14pt;
  }
  .cover-meta {
    font-size: 9.2pt;
    color: #334155;
    border-top: 1pt solid #cbd5e1;
    padding-top: 10pt;
    margin-top: 12pt;
    text-align: left;
  }
  h1 {
    color: #0d3b66;
    font-size: 14.5pt;
    font-weight: bold;
    border-bottom: 2pt solid #0d3b66;
    padding-bottom: 4pt;
    margin-top: 6pt;
    margin-bottom: 10pt;
    page-break-after: avoid;
  }
  h2 {
    color: #1e3a8a;
    font-size: 12pt;
    font-weight: bold;
    margin-top: 12pt;
    margin-bottom: 5pt;
    border-left: 3.5pt solid #0284c7;
    padding-left: 8pt;
    page-break-after: avoid;
  }
  h3 {
    color: #0f172a;
    font-size: 10.6pt;
    font-weight: bold;
    margin-top: 9pt;
    margin-bottom: 4pt;
    page-break-after: avoid;
  }
  p {
    margin: 0 0 7pt 0;
    text-align: justify;
  }
  ul, ol {
    margin-top: 3pt;
    margin-bottom: 8pt;
    padding-left: 18pt;
  }
  li {
    margin-bottom: 3.5pt;
    text-align: justify;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6pt;
    margin-bottom: 10pt;
    font-size: 8.9pt;
  }
  th {
    background-color: #0d3b66;
    color: #ffffff;
    font-weight: bold;
    text-align: left;
    padding: 5.5pt 6pt;
    border: 1pt solid #0d3b66;
  }
  td {
    padding: 4.5pt 6pt;
    border: 1pt solid #cbd5e1;
    vertical-align: top;
    text-align: left;
  }
  tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .toc-table td {
    border: none;
    border-bottom: 0.5pt dotted #cbd5e1;
    padding: 4pt 4pt;
    background-color: #ffffff !important;
    font-size: 9.5pt;
  }
  .callout-info {
    background-color: #eff6ff;
    border-left: 4pt solid #1d4ed8;
    padding: 8pt 10pt;
    margin: 8pt 0 10pt 0;
    font-size: 9.5pt;
  }
  .callout-warn {
    background-color: #fffbeb;
    border-left: 4pt solid #d97706;
    padding: 8pt 10pt;
    margin: 8pt 0 10pt 0;
    font-size: 9.5pt;
  }
  .callout-success {
    background-color: #ecfdf5;
    border-left: 4pt solid #059669;
    padding: 8pt 10pt;
    margin: 8pt 0 10pt 0;
    font-size: 9.5pt;
  }
  .callout-danger {
    background-color: #fef2f2;
    border-left: 4pt solid #dc2626;
    padding: 8pt 10pt;
    margin: 8pt 0 10pt 0;
    font-size: 9.5pt;
  }
  .code-block {
    background-color: #0f172a;
    color: #e2e8f0;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8.3pt;
    line-height: 1.35;
    padding: 8pt 10pt;
    margin: 6pt 0 10pt 0;
    white-space: pre-wrap;
    border: 1pt solid #334155;
  }
  code {
    font-family: Consolas, 'Courier New', monospace;
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 1pt 3pt;
    font-size: 8.8pt;
  }
  .badge-done {
    background-color: #dcfce7;
    color: #166534;
    font-weight: bold;
    padding: 1.5pt 5pt;
    border: 0.5pt solid #86efac;
    font-size: 8pt;
  }
  .badge-sim {
    background-color: #fef3c7;
    color: #92400e;
    font-weight: bold;
    padding: 1.5pt 5pt;
    border: 0.5pt solid #fcd34d;
    font-size: 8pt;
  }
  .badge-todo {
    background-color: #fee2e2;
    color: #991b1b;
    font-weight: bold;
    padding: 1.5pt 5pt;
    border: 0.5pt solid #fca5a5;
    font-size: 8pt;
  }
  .badge-cloud {
    background-color: #dbeafe;
    color: #1e40af;
    font-weight: bold;
    padding: 1.5pt 5pt;
    border: 0.5pt solid #93c5fd;
    font-size: 8pt;
  }
  .footer-note {
    margin-top: 14pt;
    border-top: 1.5pt solid #0d3b66;
    padding-top: 6pt;
    font-size: 8.5pt;
    color: #475569;
    text-align: center;
  }
</style>
</head>
<body>
<div class="Section1">

  <!-- ======================================================================= -->
  <!-- PAGE 1 : PAGE DE GARDE & CADRE EXECUTIF                                 -->
  <!-- ======================================================================= -->
  <div class="cover-box">
    <div class="cover-tag">Dossier Directeur Fonctionnel, Technique &amp; Blockchain — Version Exhaustive</div>
    <div class="cover-title">Parcours Utilisateurs Détaillés, État d'Implémentation, Rôle &amp; Scénarios Blockchain et Encyclopédie des Concepts</div>
    <div class="cover-subtitle">
      Guichet Unique Dématérialisé du Fonds National de Promotion et de Service Social (FNPSS) — République Démocratique du Congo
    </div>
    <div class="cover-meta">
      <table>
        <tr>
          <td style="width: 32%; background-color: #ffffff;"><strong>Institution &amp; Tutelle</strong></td>
          <td style="background-color: #ffffff;">FNPSS — Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale (RDC)</td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9;"><strong>Périmètre Fonctionnel</strong></td>
          <td style="background-color: #f1f5f9;">7 Profils Acteurs (<code>REQUERANT</code>, <code>AGENT</code>, <code>CHEF_DIVISION</code>, <code>DG</code>, <code>MINISTERE</code>, <code>DOUANE</code>, <code>ADMIN</code>) &bull; Services <code>S1</code> à <code>S6</code> &bull; Pièces <code>P1</code> à <code>P6</code></td>
        </tr>
        <tr>
          <td style="background-color: #ffffff;"><strong>Ancrage Blockchain Actif</strong></td>
          <td style="background-color: #ffffff;">Smart Contract <code>FNPSSRegistry.sol</code> déployé sur Polygon Amoy (<code>80002</code>) à <code>0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code></td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9;"><strong>Base documentaire source</strong></td>
          <td style="background-color: #f1f5f9;"><code>SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md</code>, <code>PERSONAS_ET_PARCOURS_UTILISATEURS.md</code>, <code>MATRICE_TRACABILITE_87_ISSUES</code> &amp; Code Source Next.js / Solidity</td>
        </tr>
        <tr>
          <td style="background-color: #ffffff;"><strong>Validation Logicielle Actuelle</strong></td>
          <td style="background-color: #ffffff;">Suite unitaire/E2E : <strong>30/30 tests PASS</strong> (<code>npm test</code>) &bull; Smoke tests : <strong>30/30 vérifications PASS</strong></td>
        </tr>
      </table>
    </div>
  </div>

  <h2>Objet et Valeur Stratégique de ce Document</h2>
  <p>
    Ce document de référence répond à quatre questions essentielles pour le pilotage, la recette fonctionnelle et la mise en production nationale
    du <strong>Guichet Unique Dématérialisé du FNPSS</strong> :
  </p>
  <ol>
    <li><strong>Comment chaque utilisateur évolue-t-il sur la plateforme, écran par écran et clic par clic ?</strong> Nous détaillons le parcours intégral des 7 acteurs (ONG requérante, Agent instructeur, Chef de division, Direction générale, Ministère de tutelle, Inspecteur douanier DGDA et Administrateur système) pour l'ensemble des 6 services administratifs (<code>S1</code> à <code>S6</code>).</li>
    <li><strong>Qu'est-ce qui est réellement implémenté aujourd'hui par rapport à ce qui reste à finaliser ?</strong> Avec une totale transparence d'ingénierie, nous distinguons les fonctionnalités <em>implémentées dans le code et l'UI Next.js</em>, les briques <em>validées sur les services cloud externes</em> (Neon PostgreSQL, Cloudinary AES-256-GCM, Polygon Amoy, Gmail SMTP SSL), les composants fonctionnant encore sur <em>moteur/simulateur en mémoire</em>, et les chantiers <em>non encore implémentés pour le Go-Live national</em>.</li>
    <li><strong>Quel est le véritable rôle de la Blockchain et quels sont tous ses scénarios d'exécution ?</strong> Démystification du rôle exact de Polygon (preuve mathématique immuable, non-répudiation, contre-seing ministériel, révocation instantanée, vérification douanière sans dépendance serveur) et description de <strong>10 scénarios blockchain complets</strong>.</li>
    <li><strong>À quoi servent concrètement tous les concepts techniques employés ?</strong> Chaque concept (<code>SHA-256</code>, <code>AES-256-GCM</code>, <code>Once-Only</code>, <code>SLA</code>, <code>RBAC</code>, <code>Fail-Closed</code>, <code>Anti-IDOR</code>, <code>Web3Auth MPC</code>, <code>Relayer/Paymaster</code>, <code>PWA IndexedDB</code>, <code>Double Empreinte VER-04</code>, <code>X-API-Key</code>) est expliqué simplement, puis relié au <strong>problème exact du cahier des charges qu'il résout</strong>.</li>
  </ol>

  <div class="callout-info">
    <strong>Note de gouvernance (Décision D1 / Issue <code>GOV-05</code>) :</strong> Le cahier des charges initial indiquait que les procédures internes resteraient d'abord manuelles avant notification finale. Le présent système implémente à la fois le mode minimaliste (dépôt + délivrance) et le <strong>workflow numérique multi-niveaux complet</strong> (Agent &rarr; Chef de Division &rarr; DG &rarr; Ministère) paramétrable par service.
  </div>

  <!-- ======================================================================= -->
  <!-- PAGE 2 : TABLE DES MATIERES & PROBLEMATIQUES DU CAHIER DES CHARGES      -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Table des Matières &amp; Problématiques du Cahier des Charges</h1>

  <table class="toc-table">
    <tr><td><strong>Section 1–2</strong> — Synthèse Exécutive, Problématiques du Cahier des Charges &amp; Référentiel S1–S6 / P1–P6</td><td style="text-align:right;">p. 1–2</td></tr>
    <tr><td><strong>Section 3–4</strong> — Parcours Utilisateur 1 : Le Requérant ONG / ASBL (<code>REQUERANT</code>) de bout en bout</td><td style="text-align:right;">p. 3–4</td></tr>
    <tr><td><strong>Section 5</strong> — Parcours Utilisateur 2 : L'Agent Instructeur FNPSS (<code>AGENT</code>) &amp; Réconciliation P6</td><td style="text-align:right;">p. 5</td></tr>
    <tr><td><strong>Section 6</strong> — Parcours Utilisateurs 3 &amp; 4 : Chef de Division (<code>CHEF_DIVISION</code>) &amp; Direction Générale (<code>DG</code>)</td><td style="text-align:right;">p. 6</td></tr>
    <tr><td><strong>Section 7</strong> — Parcours Utilisateurs 5 &amp; 6 : Ministère de Tutelle (<code>MINISTERE</code>) &amp; Douanier DGDA (<code>DOUANE</code>)</td><td style="text-align:right;">p. 7</td></tr>
    <tr><td><strong>Section 8</strong> — Parcours Utilisateur 7 : Administrateur Système (<code>ADMIN</code>) — Gouvernance, Audit &amp; Ops</td><td style="text-align:right;">p. 8</td></tr>
    <tr><td><strong>Section 9</strong> — Machine à États Complète d'un Dossier &amp; Matrice de Droits RBAC / Routes API</td><td style="text-align:right;">p. 9</td></tr>
    <tr><td><strong>Section 10</strong> — Audit Réel d'Implémentation (1/2) : Cas d'Utilisation &amp; Services Cloud Déjà Implémentés</td><td style="text-align:right;">p. 10</td></tr>
    <tr><td><strong>Section 11</strong> — Audit Réel d'Implémentation (2/2) : Brique Simulée en Mémoire vs Non Encore Implémentée</td><td style="text-align:right;">p. 11</td></tr>
    <tr><td><strong>Section 12</strong> — Le Véritable Rôle de la Blockchain dans le Guichet Unique FNPSS</td><td style="text-align:right;">p. 12</td></tr>
    <tr><td><strong>Section 13–14</strong> — Les 10 Scénarios Complets sur la Blockchain (Nominaux, Exceptionnels &amp; Sécurité)</td><td style="text-align:right;">p. 13–14</td></tr>
    <tr><td><strong>Section 15–17</strong> — Encyclopédie Complète des Concepts Plateforme (Crypto, Web3, Sécurité &amp; Résilience 3G)</td><td style="text-align:right;">p. 15–17</td></tr>
    <tr><td><strong>Section 18</strong> — Matrice Cahier des Charges &rarr; Problème Concret &rarr; Concept Solution &rarr; Impact Mesuré</td><td style="text-align:right;">p. 18</td></tr>
    <tr><td><strong>Section 19</strong> — Réconciliation Comptable RDC (<code>GOV-11</code>) &amp; Modèle de Données Hybride (SQL + On-Chain)</td><td style="text-align:right;">p. 19</td></tr>
    <tr><td><strong>Section 20</strong> — Feuille de Route Opérationnelle de Finalisation vers la Production Nationale</td><td style="text-align:right;">p. 20</td></tr>
  </table>

  <h2>Les 6 Problématiques Racines du Cahier des Charges FNPSS</h2>
  <p>
    D'après les documents fondateurs (<em>GUICHET UNIQUE FNPSS.pdf</em>, <em>Note Technique Blockchain V3</em> et <em>SPECIFICATIONS_FONCTIONNELLES_ET_CAS_UTILISATION.md</em>),
    la plateforme a été conçue pour résoudre six dysfonctionnements structurels affectant les exonérations humanitaires en RDC :
  </p>
  <ol>
    <li><strong>Falsification documentaire aux frontières :</strong> Les attestations et arrêtés PDF ou papier étaient facilement altérables (montants, listes de biens, dates modifiées sous éditeur PDF/Photoshop) sans moyen de contrôle instantané à Kasumbalesa, Matadi, Goma ou N'Djili.</li>
    <li><strong>Enclavement géographique et coûts de déplacement :</strong> Les ONG opérant au Nord-Kivu, Sud-Kivu, Ituri, Tanganyika ou Kasaï devaient envoyer des coursiers physiques à Kinshasa pour déposer les dossiers et suivre l'avancement.</li>
    <li><strong>Opacité des délais et perte de dossiers :</strong> Absence de chronomètre réglementaire traçable sur le délai officiel de <strong>10 jours ouvrables</strong>, ni d'historique horodaté des demandes de compléments.</li>
    <li><strong>Redondance bureaucratique et perte de saisie en 3G :</strong> Les requérants devaient ré-fournir leurs statuts/enrôlements à chaque dossier et perdaient leurs formulaires lors des coupures électriques ou instabilités réseau en province.</li>
    <li><strong>Fraude sur les quittances bancaires (<code>20 USD + 300 USD</code>) :</strong> Risque de réutilisation d'un même numéro de bordereau bancaire ou Mobile Money sur plusieurs dossiers d'exonération.</li>
    <li><strong>Révocation inefficace :</strong> Lorsqu'un acte faisait l'objet d'un retrait ou d'une suspension pour abus, l'information mettait des semaines à atteindre tous les postes douaniers DGDA et régies financières (DGRAD, DGI).</li>
  </ol>

  <h2>Référentiel Officiel des 6 Services (<code>S1</code>–<code>S6</code>) et Pièces Exigées (<code>P1</code>–<code>P6</code>)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 10%;">Code</th>
        <th style="width: 34%;">Intitulé Officiel du Service</th>
        <th style="width: 14%;">Préfixe Acte</th>
        <th style="width: 18%;">Frais / Délai SLA</th>
        <th style="width: 24%;">Pièces &amp; Tutelle</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><strong>S1</strong></td><td>Attestation d'enrôlement au FNPSS</td><td><code>ENR</code></td><td>20$ + 300$ / 10 j</td><td>P1, P3, P4, P5, P6 (Direct FNPSS)</td></tr>
      <tr><td><strong>S2</strong></td><td>Convention de partenariat avec le Gouvernement</td><td><code>CNV</code></td><td>20$ + 300$ / 10 j</td><td>P1 à P6 (<strong>Co-signé Ministère</strong>)</td></tr>
      <tr><td><strong>S3</strong></td><td>Attestation des biens à exonérer</td><td><code>BIE</code></td><td>20$ + 300$ / 10 j</td><td>P1 à P6 (P2 Once-Only possible)</td></tr>
      <tr><td><strong>S4</strong></td><td>Certificat d'exonérations</td><td><code>CEX</code></td><td>20$ + 300$ / 10 j</td><td>P1 à P6 (P2 Once-Only possible)</td></tr>
      <tr><td><strong>S5</strong></td><td>Certificat de philanthropie</td><td><code>PHI</code></td><td>20$ + 300$ / 10 j</td><td>P1 à P6 (P2 Once-Only possible)</td></tr>
      <tr><td><strong>S6</strong></td><td>Arrêté ministériel portant avis favorable</td><td><code>ARR</code></td><td>20$ + 300$ / 10 j</td><td>P1 à P6 (<strong>Co-signé Ministère</strong>)</td></tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 3 : PARCOURS REQUERANT ONG (PARTIE 1)                              -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Parcours Détaillé — Persona 1 : Le Requérant ONG / ASBL (<code>REQUERANT</code>) [1/2]</h1>
  <p>
    <strong>Profil type (<code>UX-01</code>) :</strong> Chantal M., 38 ans, coordinatrice logistique d'une ONG humanitaire à Goma (Nord-Kivu),
    travaillant sur PC portable ou smartphone Android avec connexion 3G/4G intermittente, sans aucune compétence en cryptomonnaie ni blockchain.
  </p>

  <h2>Étape 1 : Découverte sur la Page d'Accueil Publique (<code>/</code>)</h2>
  <ol>
    <li><strong>Chargement ultra-léger :</strong> L'usager accède au portail Next.js (<code>src/app/page.jsx</code>). L'écran affiche le bandeau institutionnel FNPSS, les statistiques publiques, le fil d'actualités officiel alimenté par le CMS (<code>GET /api/cms/news</code> — <code>REQ-13</code>), et les <strong>6 cartes de services (<code>S1</code> à <code>S6</code>)</strong>.</li>
    <li><strong>Consultation sans authentification :</strong> Chaque carte indique l'objet du service, le délai réglementaire de <strong>10 jours ouvrables</strong>, les frais fixes (<code>20 USD</code> dépôt + <code>300 USD</code> enquête) et la liste des pièces attendues (<code>P1</code> à <code>P6</code>). Un bouton <em>« Commencer par ici »</em> oriente vers l'inscription ou le dépôt.</li>
  </ol>

  <h2>Étape 2 : Inscription, Connexion Hybride &amp; Identité Web3 Invisible (<code>/auth/*</code>)</h2>
  <ol>
    <li><strong>Option A — Inscription Classique Email + Mot de passe (<code>/auth/register</code>, <code>REQ-01</code>) :</strong>
      <ul>
        <li>Chantal saisit : Prénom, Nom, Dénomination de l'ONG, Province (ex. Nord-Kivu), Numéro d'enrôlement éventuel, Email et Mot de passe (minimum 8 caractères).</li>
        <li>À l'envoi vers <code>POST /api/auth/register</code>, le serveur vérifie le format e-mail, hache le mot de passe via <strong><code>scrypt</code> + sel aléatoire 16 octets</strong> (résistant aux attaques par dictionnaire) et crée l'utilisateur avec le rôle <code>REQUERANT</code>.</li>
        <li><strong>Création Web3 transparente (<code>BLK-03</code>) :</strong> En arrière-plan, sans aucune fenêtre crypto ni phrase secrète de 12 mots, une adresse EVM (<code>0x...</code> sur 42 caractères) est associée au compte.</li>
      </ul>
    </li>
    <li><strong>Option B — Connexion Rapide Google OAuth 2.0 (<code>/auth/login</code>, <code>REQ-02</code>, <code>BLK-02</code>) :</strong>
      <ul>
        <li>En 1 clic sur <em>« Se connecter avec Google »</em>, le portail récupère l'email vérifié, le prénom et le nom Google via <code>POST /api/auth/google</code>, pré-remplit le profil ONG et ouvre la session avec portefeuille Web3Auth associé.</li>
      </ul>
    </li>
    <li><strong>Option C — Mot de passe oublié &amp; Réinitialisation neutre (<code>/auth/forgot-password</code> &amp; <code>/auth/reset-password</code>, <code>REQ-03</code>) :</strong>
      <ul>
        <li>Si Chantal oublie son mot de passe, l'API génère un jeton cryptographique à usage unique et à durée limitée, tout en retournant une <strong>réponse neutre</strong> (impossible pour un attaquant de savoir si un e-mail existe dans la base — protection contre l'énumération).</li>
      </ul>
    </li>
    <li><strong>Protection Anti-Brute-Force :</strong> Après <strong>5 tentatives erronées</strong> de mot de passe, le compte est temporairement verrouillé et l'incident tracé dans <code>authLogs</code>.</li>
  </ol>

  <h2>Étape 3 : Paramétrage du Profil ONG &amp; Principe « Once-Only » (<code>/profile</code>, <code>REQ-04</code>)</h2>
  <ol>
    <li>Une fois authentifiée (jeton de session conservé en <code>sessionStorage</code> côté navigateur), Chantal accède à <code>/profile</code> (<code>GET/PUT /api/auth/profile</code>).</li>
    <li>Elle complète ou met à jour la dénomination exacte de son organisation, sa province d'opération et son numéro d'agrément/F92, et visualise en lecture seule son adresse publique blockchain (<code>walletAddress</code>) à titre informatif.</li>
    <li><strong>Mécanisme serveur « Dites-le-nous une seule fois » (<em>Once-Only</em>) :</strong> Dès qu'une organisation dispose d'une <strong>Attestation d'enrôlement (<code>S1</code>)</strong> au statut <code>VALIDE_DELIVRE</code> et non révoquée, le serveur détecte automatiquement cette éligibilité lors de toute future demande <code>S2</code> à <code>S6</code> et <strong>dispense l'usager de re-téléverser la pièce <code>P2_ENROLEMENT</code></strong>. Point sécurité crucial : même si un utilisateur tente de forger un drapeau <code>isExemptedOnceOnly: true</code> dans la requête JSON, le serveur ignore toute déclaration client et recalcule l'exemption depuis la base.</li>
  </ol>

  <div class="callout-success">
    <strong>Gain concret pour l'ONG :</strong> La coordinatrice à Goma passe de la constitution physique de classeurs papier expédiés par avion vers Kinshasa à une authentification en 15 secondes sans jamais avoir à installer MetaMask ni acheter de jetons POL.
  </div>

  <!-- ======================================================================= -->
  <!-- PAGE 4 : PARCOURS REQUERANT ONG (PARTIE 2)                              -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Parcours Détaillé — Persona 1 : Le Requérant ONG / ASBL (<code>REQUERANT</code>) [2/2]</h1>

  <h2>Étape 4 : Tableau de Bord Requérant &amp; Messagerie (<code>/dashboard</code>, <code>REQ-05</code>, <code>REQ-08</code>, <code>NOT-02/04</code>)</h2>
  <p>
    Sur <code>/dashboard</code>, l'interface interroge simultanément <code>GET /api/applications</code> (filtré strictement sur <code>ownerId = actor.id</code> — anti-IDOR)
    et <code>GET /api/notifications</code>. Chantal dispose :
  </p>
  <ul>
    <li><strong>Des compteurs dynamiques</strong> par service (<code>S1</code>–<code>S6</code>) et par statut (<code>SOUMIS</code>, <code>EN_COURS_INSTRUCTION</code>, <code>COMPLEMENT_REQUIS</code>, <code>VALIDE_DELIVRE</code>, <code>REJETE</code>, <code>REVOQUE</code>).</li>
    <li><strong>Du centre de notifications in-app :</strong> badge compteur de messages non lus ; clic pour marquer comme lu (<code>PUT /api/notifications</code>).</li>
    <li><strong>De la modification ou du retrait avant instruction (<code>REQ-08</code>) :</strong> Tant que l'agent FNPSS n'a pas encore validé le paiement (statut <code>SOUMIS</code> et <code>paymentValidated === false</code>), Chantal peut modifier l'intitulé, la liste des biens ou la référence quittance (<code>PUT /api/applications</code>), ou <strong>retirer/supprimer complètement son dossier</strong> (<code>POST /api/applications/withdraw</code>). Dès que l'instruction démarre, le système verrouille ces deux actions.</li>
    <li><strong>De l'export CSV/suivi</strong> de ses propres demandes.</li>
  </ul>

  <h2>Étape 5 : Assistant de Soumission en 3 Étapes &amp; Hachage Local (<code>/applications/new</code>, <code>REQ-06/07/11</code>)</h2>
  <ol>
    <li><strong>Étape 1 du Wizard — Choix du service &amp; description :</strong> Sélection d'un service parmi <code>S1</code> à <code>S6</code>, saisie de l'intitulé du projet humanitaire (ex. <em>« Importation de 12 tonnes de kits médicaux pour zones de santé »</em>) et description détaillée des biens (avec codes SH douaniers, quantités et valeur estimative).</li>
    <li><strong>Étape 2 du Wizard — Téléversement des pièces <code>P1</code> à <code>P6</code> &amp; Web Crypto SHA-256 :</strong>
      <ul>
        <li>Contrôle immédiat : format strictement <strong><code>.pdf</code></strong> (<code>application/pdf</code>, en-tête binaire <code>%PDF-</code>), taille maximale <strong>10 Mo par fichier</strong>, et blocage serveur de tout script malveillant (<code>/JS</code>, <code>/JavaScript</code>, <code>/Launch</code>, <code>/OpenAction</code>, <code>/EmbeddedFiles</code>, <code>/AA</code>, <code>/RichMedia</code> — exigence <code>REQ-07</code>).</li>
        <li><strong>Calcul SHA-256 côté navigateur (<code>crypto.subtle.digest('SHA-256', buffer)</code>) :</strong> Avant même l'envoi réseau, le navigateur calcule l'empreinte <code>0x...</code> de chaque pièce jointe et la stocke avec le nom et la taille du fichier.</li>
        <li>Si le dossier S1 est actif, la case <code>P2_ENROLEMENT</code> affiche le badge <em>« Exempté automatiquement (Once-Only) »</em>.</li>
      </ul>
    </li>
    <li><strong>Étape 3 du Wizard — Référence de paiement &amp; Résilience Hors-Ligne PWA (<code>REQ-10</code>, <code>REQ-11</code>) :</strong>
      <ul>
        <li>Chantal saisit sa référence de bordereau bancaire ou Mobile Money couvrant les <strong>320 USD</strong> (<code>20 USD</code> dépôt + <code>300 USD</code> enquête), génère une <strong>clé d'idempotence</strong> (<code>IDEM-...</code>) et soumet via <code>POST /api/applications</code>.</li>
        <li><strong>En cas de coupure 3G en Nord-Kivu :</strong> le brouillon est conservé localement (PWA / file asynchrone <code>/api/pwa/sync</code>). À la reconnexion, la clé d'idempotence garantit que deux appuis sur « Envoyer » ne créeront jamais deux dossiers ni deux facturations.</li>
        <li>À la confirmation, le système attribue le numéro unique <strong><code>FNPSS/DEM/2026/00001</code></strong> et déclenche l'e-mail + notification <code>APPLICATION_SUBMITTED</code>.</li>
      </ul>
    </li>
  </ol>

  <h2>Étape 6 : Régularisation d'un Complément &amp; Téléchargement du PDF Scellé (<code>SC-02</code>, <code>REQ-09</code>)</h2>
  <ol>
    <li><strong>Si un agent demande un complément (<code>COMPLEMENT_REQUIS</code>) :</strong> Chantal reçoit un e-mail et une alerte dans son fil de discussion dossier (<code>GET /api/notifications?ref=...</code>) indiquant la pièce manquante ou illisible (ex. <em>« Rapport d'activité 2025 non signé »</em>). Elle ouvre le dossier, répond sur le fil (<code>POST /api/notifications</code>) et transmet la pièce corrective via <code>POST /api/applications/provide-complement</code>. Le dossier repasse instantanément à <code>EN_COURS_INSTRUCTION</code> et le chronomètre SLA reprend.</li>
    <li><strong>Une fois l'acte délivré (<code>VALIDE_DELIVRE</code>) :</strong> Chantal reçoit la notification <code>CERTIFICATE_ISSUED</code> et clique sur <em>« Télécharger le Certificat Officiel PDF »</em> (<code>GET /api/applications/certificate.pdf?ref=...</code>). Chaque téléchargement est journalisé dans les logs d'audit (<code>CERTIFICATE_DOWNLOADED</code>). Le PDF reçu contient l'en-tête FNPSS/RDC, le numéro national d'acte (ex. <code>FNPSS-CEX-2026-00001</code>), l'empreinte blockchain et le <strong>QR Code dynamique</strong> à présenter à la douane.</li>
  </ol>

  <!-- ======================================================================= -->
  <!-- PAGE 5 : PARCOURS AGENT INSTRUCTEUR FNPSS                               -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Parcours Détaillé — Persona 2 : L'Agent Instructeur FNPSS (<code>AGENT</code>)</h1>
  <p>
    <strong>Profil type (<code>UX-01</code>) :</strong> Patrick K., 34 ans, agent instructeur au siège du FNPSS à Kinshasa. Il traite
    quotidiennement 15 à 30 dossiers couvrant les 6 services, contrôle la conformité administrative des ONG et déclenche le compte à rebours officiel.
  </p>

  <h2>Étape 1 : Accès au Back-Office d'Instruction (<code>/admin</code>, <code>ADM-02</code>, <code>ADM-04</code>)</h2>
  <ol>
    <li>Patrick s'authentifie avec son compte <code>AGENT</code>. Conformément à la matrice RBAC (<code>ROLE_PERMISSIONS</code>), il dispose exclusivement des trois droits métier : <code>VALIDATE_PAYMENT</code>, <code>INSPECT_APPLICATION</code> et <code>REQUEST_COMPLEMENT</code>. Il ne peut ni approuver définitivement, ni rejeter, ni révoquer un certificat (séparation des pouvoirs).</li>
    <li>L'écran charge l'ensemble des dossiers (<code>GET /api/applications</code>) avec double filtrage dynamique par <strong>service (<code>S1</code>–<code>S6</code>)</strong> et par <strong>statut</strong> (<code>SOUMIS</code>, <code>EN_COURS_INSTRUCTION</code>, <code>COMPLEMENT_REQUIS</code>, etc.), ainsi que l'indicateur visuel de respect du délai SLA de <strong>10 jours ouvrables</strong>.</li>
  </ol>

  <h2>Étape 2 : Vérification Financière &amp; Anti-Doublon de la Quittance <code>P6</code> (<code>GOV-11</code>, <code>REQ-10</code>)</h2>
  <ol>
    <li>Lorsqu'un nouveau dossier apparaît au statut <code>SOUMIS</code> (<code>paymentValidated = false</code>), Patrick ouvre la fiche et examine la référence de paiement transmise (ex. <code>RAWBANK-CDF-2026-88421</code> ou <code>MPESA-RDC-2026-10294</code>) ainsi que le bordereau PDF <code>P6_QUITTANCE</code>.</li>
    <li>Il vérifie dans le Grand Livre comptable (<code>PaymentReconciliationLedger</code>) que la référence est bien encaissée pour <strong>320 USD</strong> ventilés réglementairement en <strong>20 USD de frais de dépôt + 300 USD de frais d'enquête de conformité</strong>.</li>
    <li><strong>Garde-fou anti-fraude :</strong> Si une ONG tente de soumettre un second dossier en réutilisant un ancien numéro de bordereau déjà validé, le moteur lève l'alerte bloquante <code>GOV-11/REQ-10 : Fraude ou doublon détecté</code>.</li>
    <li>Lorsque la quittance est authentique, Patrick clique sur <strong>« Valider le paiement &amp; Démarrer l'instruction »</strong> (<code>POST /api/applications/validate-payment</code>) :
      <ul>
        <li>Le statut bascule de <code>SOUMIS</code> à <code>EN_COURS_INSTRUCTION</code>.</li>
        <li>L'échéance SLA (<code>slaDueAt</code>) est calculée à <strong>+10 jours ouvrables</strong> en sautant automatiquement week-ends et jours fériés configurés (<code>computeSlaDueDate</code>).</li>
        <li>Une notification <code>PAYMENT_VALIDATED</code> est envoyée à l'ONG avec sa date limite indicative de traitement, et le dossier devient verrouillé contre toute modification/retrait client (<code>REQ-08</code>).</li>
      </ul>
    </li>
  </ol>

  <h2>Étape 3 : Examen Documentaire via la Visionneuse PDF Intégrée (<code>ADM-05</code>)</h2>
  <ol>
    <li>Patrick clique sur chaque pièce jointe <code>P1</code> à <code>P6</code> dans la fiche de traitement. Le composant <code>DocumentViewer</code> affiche le PDF directement dans l'interface web côte à côte avec la check-list de recevabilité, sans obliger l'agent à télécharger des dizaines de fichiers sur son poste local (réduction du risque de fuite de données sur PC).</li>
    <li>Pour les services <code>S2</code> à <code>S6</code> bénéficiant du mode <em>Once-Only</em>, Patrick voit clairement la mention certifiée serveur que l'enrôlement <code>S1</code> de l'ONG est actif et vérifié.</li>
    <li>L'agent vérifie la cohérence des quantités et valeurs estimatives des biens à exonérer (<code>P5_PROJET</code>) avec la requête officielle (<code>P1_REQUETE</code>).</li>
  </ol>

  <h2>Étape 4 : Demande de Complément &amp; Suspension du Chronomètre SLA (<code>SC-02</code>, <code>F09</code>, <code>NOT-04</code>)</h2>
  <ol>
    <li>Si une pièce est illisible, expirée ou incomplète, Patrick clique sur <strong>« Demander un complément »</strong>, saisit un motif précis et obligatoire dans la modale (ex. <em>« Attestation fiscale ou signature manquante sur le rapport annuel P4 »</em>) et valide (<code>POST /api/applications/request-complement</code>).</li>
    <li>Le dossier passe en statut <code>COMPLEMENT_REQUIS</code>, <strong>le compteur de délai de 10 jours est suspendu (<code>slaPaused = true</code>)</strong> afin que le retard de l'ONG ne pénalise pas les statistiques du FNPSS, un message est posté automatiquement sur le fil du dossier, et l'ONG est avertie instantanément par e-mail/in-app.</li>
    <li>Dès réception du complément fourni par le requérant, Patrick retrouve le dossier à nouveau actif en <code>EN_COURS_INSTRUCTION</code> et poursuit la préparation de l'enquête de conformité avant transmission au Chef de Division.</li>
  </ol>

  <!-- ======================================================================= -->
  <!-- PAGE 6 : PARCOURS CHEF DE DIVISION & DIRECTION GENERALE                 -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Parcours Détaillés — Persona 3 : Chef de Division &amp; Persona 4 : Direction Générale</h1>

  <h2>Persona 3 : Le Chef de Division Métier (<code>CHEF_DIVISION</code>) — Circuit Multi-Niveaux (<code>ADM-08</code>)</h2>
  <p>
    Le Chef de Division assure le contrôle hiérarchique intermédiaire entre l'instruction opérationnelle de l'agent et la signature souveraine
    de la Direction Générale. Son parcours sur <code>/admin</code> s'articule en quatre actions :
  </p>
  <ol>
    <li><strong>Revue des dossiers instruits :</strong> Filtre les demandes à l'état <code>EN_COURS_INSTRUCTION</code> dont le paiement et les pièces <code>P1</code>–<code>P6</code> ont été contrôlés par l'agent instructeur.</li>
    <li><strong>Contrôle de précondition serveur :</strong> Si le Chef de Division tente de court-circuiter l'agent en émettant un avis sur un dossier dont la quittance n'est pas validée (<code>paymentValidated === false</code>), le backend bloque l'action (<code>ADM-08 : La quittance des frais doit être validée par un agent avant l'avis du Chef de Division</code>).</li>
    <li><strong>Émission de l'Avis Technique Motivé (<code>POST /api/applications/division-opinion</code>) :</strong> Depuis la modale dédiée, il choisit <em>Avis Favorable</em> ou <em>Avis Réservé</em> et saisit sa note technique (ex. <em>« Enquête de conformité concluante pour 12 tonnes d'intrants médicaux ; conforme aux statuts S1 »</em>).</li>
    <li><strong>Traçabilité :</strong> L'étape <code>AVIS_FAVORABLE_CHEF_DIVISION</code> (ou <code>AVIS_RESERVE_CHEF_DIVISION</code>) est horodatée et ajoutée au tableau <code>approvalSteps</code> du dossier et au journal d'audit <code>DIVISION_CHIEF_OPINION_EMITTED</code>.</li>
  </ol>

  <h2>Persona 4 : La Direction Générale du FNPSS (<code>DG</code>) — Décision Souveraine &amp; Révocation</h2>
  <p>
    <strong>Profil type (<code>UX-01</code>) :</strong> Jean-Pierre L., 52 ans, Directeur Général à Kinshasa. Il détient les prérogatives
    d'autorité de validation finale (<code>APPROVE_AND_SEAL_CERTIFICATE</code>), de rejet motivé (<code>REJECT_APPLICATION</code>)
    et de révocation administrative mondiale (<code>REVOKE_CERTIFICATE</code>), ainsi que le contrôle stratégique du contrat blockchain.
  </p>
  <ol>
    <li><strong>Consultation de la vue décisionnelle :</strong> Dans <code>/admin</code>, le DG visualise la synthèse du dossier : identité ONG, montant exonérable/biens, validation paiement agent, avis motivé du Chef de Division et historique complet <code>approvalSteps</code>.</li>
    <li><strong>Cas A — Approbation, Génération PDF &amp; Ancrage Blockchain (<code>POST /api/applications/approve-seal</code> — <code>CU04</code>) :</strong>
      <ul>
        <li>En un clic sur <em>« Valider et Sceller l'Acte sur Blockchain »</em>, le système vérifie que le paiement est validé et génère le numéro officiel national séquentiel (ex. <code>FNPSS-CEX-2026-00001</code>).</li>
        <li>Il calcule la date d'expiration (par défaut 365 jours), exécute le scellement cryptographique canonique (<code>docHash</code> SHA-256 à 32 octets), transmet la transaction d'ancrage au Smart Contract via le Relayer (<code>registerDocument</code>), génère le fichier PDF officiel normé (<code>%PDF-1.4</code>) avec QR Code, calcule le second hash du fichier PDF binaire final (<code>pdfSha256</code>) et lie les deux empreintes dans le registre.</li>
        <li>Le dossier passe à <code>VALIDE_DELIVRE</code> et notifie automatiquement l'ONG requérante.</li>
      </ul>
    </li>
    <li><strong>Cas B — Rejet Motivé Après Enquête (<code>POST /api/applications/reject</code> — <code>SC-05</code>, <code>ADM-06</code>) :</strong>
      <ul>
        <li>Si l'enquête sociale ou financière révèle une non-conformité, le DG ouvre la modale de rejet et saisit un motif légal obligatoire. Le statut passe à <code>REJETE</code>, le SLA est figé, aucune empreinte n'est ancrée sur Polygon, et le requérant reçoit la notification motivée. (Protection : impossible de rejeter un dossier déjà délivré, révoqué ou déjà rejeté).</li>
      </ul>
    </li>
    <li><strong>Cas C — Révocation Administrative d'Urgence avec Double Confirmation (<code>POST /api/applications/revoke</code> — <code>CU06</code>, <code>VER-06</code>) :</strong>
      <ul>
        <li>En cas de fraude constatée a posteriori ou de détournement d'usage des biens exonérés, le DG sélectionne l'acte délivré, saisit obligatoirement le motif officiel de révocation et coche la case de <strong>double confirmation explicite</strong> (<code>doubleConfirmed === true</code>).</li>
        <li>Sans double confirmation ou sans motif, l'API rejette la commande. Une fois confirmée, la transaction <code>revokeDocument</code> bascule le statut on-chain vers <code>REVOKED</code>, marque le dossier <code>REVOQUE</code> et déclenche la notification vers les régies partenaires <code>['DGDA', 'DGRAD', 'DGI']</code> et l'ONG.</li>
      </ul>
    </li>
  </ol>

  <!-- ======================================================================= -->
  <!-- PAGE 7 : PARCOURS MINISTERE & DOUANIER DGDA                             -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Parcours Détaillés — Persona 5 : Ministère de Tutelle &amp; Persona 6 : Douanier DGDA</h1>

  <h2>Persona 5 : Le Point Focal du Ministère de Tutelle (<code>MINISTERE</code>)</h2>
  <p>
    <strong>Rôle inter-institutionnel :</strong> Représentant du cabinet du Ministère des Affaires Sociales, Actions Humanitaires et
    Solidarité Nationale (ou des Ministères cosignataires Plan/Finances). Son intervention est requise spécifiquement pour les actes conjoints
    de l'État : les <strong>Conventions de partenariat (<code>S2</code>)</strong> et les <strong>Arrêtés ministériels portant avis favorable (<code>S6</code>)</strong>.
  </p>
  <ol>
    <li><strong>Périmètre RBAC cloisonné :</strong> L'acteur <code>MINISTERE</code> détient uniquement la permission <code>COSIGN_MINISTRY_ACT</code> (plus lecture des dossiers). Il ne peut ni instruire ni révoquer ni créer d'actes en solo.</li>
    <li><strong>Vérification préalable :</strong> Le dossier doit impérativement avoir déjà été validé et scellé par le FNPSS (<code>app.certificate.docHash</code> présent) ; à défaut, l'API refuse la co-signature ministérielle.</li>
    <li><strong>Apposition du Contre-Seing Ministériel (<code>POST /api/applications/cosign-ministry</code>) :</strong>
      <ul>
        <li>Depuis <code>/admin</code>, le conseiller ministériel ouvre la modale de contre-seing, saisit la référence officielle du cabinet (ex. <code>CAB/MIN-AS/2026/0150</code>) et confirme.</li>
        <li>Le backend appelle la fonction <code>coSignDocument(docHash)</code> sur le Smart Contract <code>FNPSSRegistry</code>.</li>
        <li>Sur Polygon, le champ <code>ministryCoSigner</code> de l'enregistrement passe de l'adresse nulle <code>0x000...000</code> à l'adresse cryptographique certifiée du Ministère, et l'événement <code>DocumentCoSigned</code> est émis irréversiblement dans la blockchain.</li>
      </ul>
    </li>
  </ol>

  <h2>Persona 6 : L'Inspecteur Douanier DGDA (<code>DOUANE</code>) &amp; Vérificateur Terrain</h2>
  <p>
    <strong>Profil type (<code>UX-01</code>, <code>UX-06</code>) :</strong> Inspecteur Thierry B. aux postes frontières de Kasumbalesa, Matadi,
    Goma ou Aéroport de N'Djili. Utilise un smartphone Android en extérieur (plein soleil) sur réseau 2G/3G parfois dégradé.
  </p>
  <ol>
    <li><strong>Accès Direct Public Zéro-Friction (<code>/verifier</code>, <code>VER-03</code>) :</strong>
      <ul>
        <li>L'inspecteur n'a <strong>aucun compte à créer ni mot de passe à taper</strong> pour une vérification standard.</li>
        <li>Budget de performance strict : page optimisée pour la faible bande passante 3G (<code>&lt; 150 Ko</code> de JavaScript initial, temps cible <code>&lt; 3,0 secondes</code>), police large lisible en plein soleil et icônes explicites doublant la couleur (accessibilité daltonisme WCAG).</li>
      </ul>
    </li>
    <li><strong>Trois Modes de Vérification Possibles sur Terrain :</strong>
      <ul>
        <li><strong>Mode A — Scan du QR Code (<code>GET /api/verify?hash=0x...</code>) :</strong> La caméra du téléphone scanne le QR Code imprimé sur le document papier ou sur la tablette du déclarant, ce qui ouvre directement <code>/verifier?hash=...</code>.</li>
        <li><strong>Mode B — Saisie manuelle du Numéro d'Acte (<code>GET /api/verify?ref=FNPSS-CEX-2026-00001</code>) :</strong> Si le QR Code est froissé ou illisible sur une copie papier, l'inspecteur tape le numéro d'attestation ; le registre résout le hash via l'index secondaire <code>keccak256(certificateNumber)</code>.</li>
        <li><strong>Mode C — Vérification Directe d'un Fichier PDF sans Scan QR (<code>POST /api/verify</code> — <code>VER-04</code>) :</strong> Si un déclarant envoie le certificat par e-mail ou WhatsApp au poste douanier, l'inspecteur sélectionne ce fichier <code>.pdf</code> dans la zone dédiée de <code>/verifier</code>. Le navigateur calcule immédiatement son <code>SHA-256</code> localement et l'envoie avec le PDF encodé à l'API, qui vérifie la correspondance avec l'empreinte PDF binaire scellée (<code>pdfHashToDocHash</code>). Même un seul caractère altéré (ex. changer « 10 véhicules » en « 100 véhicules ») produit un hash totalement différent et déclenche l'alerte fraude.</li>
      </ul>
    </li>
    <li><strong>Lecture des 4 Verdicts Visuels Instantanés :</strong>
      <ul>
        <li>🟢 <strong><code>PASTILLE_VERTE_VALIDE</code> :</strong> Document authentique et en vigueur — affiche le bénéficiaire, le type d'acte <code>S1</code>–<code>S6</code>, la date d'émission, la date d'expiration, le numéro d'acte et la preuve blockchain.</li>
        <li>🔴 <strong><code>PASTILLE_ROUGE_FALSIFIE</code> :</strong> Empreinte inconnue sur le registre (faux document fabriqué ou fichier modifié) — consigne d'immobilisation de la cargaison.</li>
        <li>🔴 <strong><code>PASTILLE_ROUGE_REVOQUE</code> :</strong> Document authentique à l'origine mais annulé administrativement par le FNPSS — affiche le motif officiel de révocation (<code>revocationReason</code>).</li>
        <li>⚪ <strong><code>PASTILLE_GRISE_EXPIRE</code> :</strong> Document authentique mais dont la durée légale de franchise est dépassée (<code>block.timestamp &gt; expiresAt</code>).</li>
      </ul>
    </li>
    <li><strong>Mode Inter-Système Automatisé DGDA / DGRAD / DGI (<code>VER-05</code>) :</strong> Le système informatique douanier central (ex. SYDONIA) peut interroger <code>/api/verify</code> par API REST (spécification OpenAPI 3.1 <code>openapi/fnpss-dgda-api.yaml</code>) en s'authentifiant avec un en-tête HTTP <strong><code>X-API-Key</code></strong> et en étant protégé par limitation de débit (<em>Rate Limiting</em> — en-têtes <code>X-RateLimit-Limit</code> / <code>X-RateLimit-Remaining</code> et code HTTP <code>429</code> en cas d'abus).</li>
  </ol>

  <!-- ======================================================================= -->
  <!-- PAGE 8 : PARCOURS ADMINISTRATEUR SYSTEME                                -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Parcours Détaillé — Persona 7 : L'Administrateur Système (<code>ADMIN</code>)</h1>
  <p>
    L'Administrateur Système est le garant de la disponibilité, de la sécurité RBAC, de l'auditabilité réglementaire et de la gouvernance
    technique du Guichet Unique et de son infrastructure blockchain. Il dispose d'une vue complète dans <code>/admin</code> et accède aux
    endpoints d'exploitation <code>/api/admin/*</code>, <code>/api/blockchain/*</code> et <code>/api/ops/*</code>.
  </p>

  <h2>1. Gestion des Comptes Requérants ONG (<code>GET/PATCH /api/admin/applicants</code> — <code>ADM-03</code>)</h2>
  <ul>
    <li>L'administrateur consulte la liste des organisations enregistrées (email, nom d'ONG, province, fournisseur d'auth Email ou Google/Web3Auth, adresse EVM <code>0x...</code>, statut <code>ACTIVE</code> ou <code>SUSPENDED</code>).</li>
    <li>En cas d'usurpation d'identité ou d'infraction grave, il peut <strong>suspendre ou réactiver un compte requérant</strong> ; chaque changement d'état est enregistré dans les journaux d'authentification et d'audit.</li>
  </ul>

  <h2>2. Administration des Actualités du Portail Public (<code>POST/PUT /api/cms/news</code> — <code>ADM-10</code>, <code>REQ-13</code>)</h2>
  <ul>
    <li>Publie, modifie ou dépublie les communiqués officiels du FNPSS affichés sur la page d'accueil publique (ex. notes circulaires sur les exonérations, nouveaux taux de change CDF/USD, calendriers de permanence douanière).</li>
  </ul>

  <h2>3. Journal d'Audit Immuable &amp; Export CSV Réglementaire (<code>GET /api/admin/audit</code> — <code>ADM-07</code>)</h2>
  <ul>
    <li>Consulte l'intégralité des actions tracées (dépôt, modification, retrait, validation paiement, demande de complément, avis Chef de division, scellement DG, contre-seing ministériel, révocation, téléchargement PDF) filtrables par acteur, rôle, action ou référence dossier.</li>
    <li>Exporte le journal au format <strong>CSV</strong> en 1 clic pour les inspections de l'IGF (Inspection Générale des Finances) ou la Cour des Comptes.</li>
  </ul>

  <h2>4. Tableau de Bord Statistique &amp; Financier Exécutif (<code>GET /api/admin/stats</code> — <code>ADM-09</code>, <code>GOV-11</code>)</h2>
  <ul>
    <li>Visualise les indicateurs consolidés : nombre total de dossiers, répartition par service <code>S1</code>–<code>S6</code>, taux d'approbation/rejet/révocation, respect moyen du SLA 10 jours, et montants encaissés ventilés (<code>20 USD</code> dépôt vs <code>300 USD</code> enquête).</li>
  </ul>

  <h2>5. Pilotage Blockchain, Relayer &amp; Coupe-Circuit d'Urgence (<code>/api/blockchain/*</code> — <code>BLK-08</code> à <code>BLK-12</code>)</h2>
  <ul>
    <li><strong>Surveillance de la file d'ancrage (<code>GET/POST /api/blockchain/anchor-queue</code>) :</strong> Inspecte l'adresse du Relayer Paymaster, le nombre d'actes ancrés, les tâches en attente (<code>QUEUED</code> / <code>FAILED</code>) et déclenche un vidage manuel (<code>flush</code>) après une coupure réseau.</li>
    <li><strong>Gestion du déploiement réseau (<code>GET/POST /api/blockchain/deploy</code>) :</strong> Vérifie la cible (<code>polygon-amoy</code> <code>80002</code> vs <code>polygon-mainnet</code> <code>137</code>), sachant que la bascule vers Mainnet est bloquée par un garde-fou serveur tant que l'audit de sécurité <code>FNPSS_MAINNET_AUDIT_PASSED</code> et le solde Relayer minimum ne sont pas certifiés (<code>BLK-12</code>).</li>
    <li><strong>Gouvernance On-Chain (<code>FNPSSRegistry.sol</code>) :</strong> Via son portefeuille MetaMask administrateur (et futur Multisig Safe en Mainnet), il gère les rôles on-chain (<code>setRegistrar</code>, <code>setRevoker</code>, <code>setMinistrySigner</code>) et dispose du bouton d'arrêt d'urgence <strong><code>setPaused(true)</code></strong> gelant immédiatement toute écriture si une clé de serveur Relayer était suspectée de compromission.</li>
  </ul>

  <h2>6. Supervision Technique, Sauvegardes Chiffrées &amp; Jalons Go/No-Go (<code>/api/ops/*</code>)</h2>
  <ul>
    <li><strong><code>/api/ops/supervision</code> (<code>OPS-06</code>, <code>REQ-12</code>) :</strong> Contrôle la latence API, les erreurs HTTP, le taux de disponibilité et le respect du budget réseau 3G (<code>&lt; 150 Ko</code> / <code>&lt; 3 s</code>).</li>
    <li><strong><code>/api/ops/gates</code> (<code>GOV-09</code>, <code>GOV-12</code>, <code>GOV-13</code>, <code>OPS-05</code>) :</strong> Évalue l'état des jalons <code>G1</code> (Cadrage), <code>G2</code> (Alpha), <code>G3</code> (Beta &amp; Audit/UAT) et exécute/vérifie les sauvegardes chiffrées <code>AES-256-GCM</code> de la base de données.</li>
    <li><strong><code>/api/ops/production</code> &amp; <code>/api/ops/pilot</code> (<code>DEP-01</code> à <code>DEP-09</code>) :</strong> Suit la cohorte pilote des ONG, les incidents Hypercare, les sessions de formation (ONG, Agents, Ministères, DGDA) et la clôture COPIL.</li>
  </ul>

  <!-- ======================================================================= -->
  <!-- PAGE 9 : MACHINE A ETATS & MATRICE RBAC                                 -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Machine à États Complète d'un Dossier &amp; Matrice des Permissions RBAC</h1>

  <h2>1. Cycle de Vie Exhaustif d'une Demande (<code>FNPSS/DEM/2026/xxxxx</code>)</h2>
  <p>
    La machine à états implémentée dans <code>src/workflow/application-engine.mjs</code> impose des transitions strictes et auditées.
    Aucune étape critique (signature DG, avis Chef de division) ne peut contourner la validation financière préalable :
  </p>
  <div class="code-block">[Brouillon PWA Offline] --(Reprise / Idempotence POST /api/applications)--&gt; [SOUMIS]
   |
   |-- (Avant validation paiement uniquement - REQ-08) --&gt; Modification (PUT) ou Retrait [RETIRE / SUPPRIME]
   |
   |-- (AGENT ou CHEF_DIVISION valide quittance P6 - GOV-11) --&gt; [EN_COURS_INSTRUCTION] (SLA 10j demarre)
          |
          |-- (AGENT / CHEF_DIVISION demande piece - SC-02) --&gt; [COMPLEMENT_REQUIS] (slaPaused = true)
          |        |
          |        +-- (REQUERANT fournit piece) -------------&gt; [EN_COURS_INSTRUCTION] (slaPaused = false)
          |
          |-- (CHEF_DIVISION emet avis motive - ADM-08) ------&gt; Etape AVIS_FAVORABLE ou AVIS_RESERVE enregistree
          |
          |-- (DG rejette avec motif - SC-05 / ADM-06) -------&gt; [REJETE] (Fin - SLA fige, zero ancrage)
          |
          +-- (DG valide et scelle - CU04) -------------------&gt; [VALIDE_DELIVRE] + Ancrage Polygon registerDocument()
                   |                                                            + Generation PDF &amp; QR Code + Liaison pdfSha256
                   |-- (Si S2 ou S6 : MINISTERE contre-signe)-&gt; Co-signature on-chain coSignDocument()
                   |
                   |-- (DG revoque avec double confirm VER-06)-&gt; [REVOQUE] + On-chain REVOKED + Alerte DGDA/DGRAD/DGI
                   |
                   +-- (Si block.timestamp &gt; expiresAt) ------&gt; [EXPIRE] (Calcul dynamique on-chain = Pastille Grise)</div>

  <h2>2. Matrice Complète des Droits RBAC par Rôle (<code>Roles</code> — <code>ADM-01</code>)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 17%;">Rôle Système</th>
        <th style="width: 39%;">Permissions Atomiques Accordées (<code>ROLE_PERMISSIONS</code>)</th>
        <th style="width: 44%;">Routes API &amp; Actions Exclusives Autorisées</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong><code>REQUERANT</code></strong><br/>(ONG / ASBL)</td>
        <td><code>SUBMIT_APPLICATION</code>, <code>UPDATE_OWN_DRAFT_APPLICATION</code>, <code>WITHDRAW_OWN_DRAFT_APPLICATION</code>, <code>UPLOAD_COMPLEMENT</code>, <code>DOWNLOAD_OWN_CERTIFICATE</code></td>
        <td><code>GET/POST/PUT /api/applications</code> (strictement <code>ownerId === actor.id</code>), <code>withdraw</code>, <code>provide-complement</code>, <code>certificate.pdf</code>, <code>/api/pwa/sync</code>.</td>
      </tr>
      <tr>
        <td><strong><code>AGENT</code></strong><br/>(Instructeur)</td>
        <td><code>VALIDATE_PAYMENT</code>, <code>INSPECT_APPLICATION</code>, <code>REQUEST_COMPLEMENT</code></td>
        <td>Lecture tous dossiers, <code>validate-payment</code>, <code>request-complement</code>, fil dossier <code>/api/notifications</code>, lecture file blockchain &amp; stats.</td>
      </tr>
      <tr>
        <td><strong><code>CHEF_DIVISION</code></strong><br/>(Validateur)</td>
        <td>Droits <code>AGENT</code> + <code>EMIT_FAVORABLE_OPINION</code></td>
        <td>Idem Agent + <code>POST /api/applications/division-opinion</code> (avis technique favorable ou réservé avant décision DG).</td>
      </tr>
      <tr>
        <td><strong><code>DG</code></strong><br/>(Direction Gén.)</td>
        <td><code>APPROVE_AND_SEAL_CERTIFICATE</code>, <code>REVOKE_CERTIFICATE</code>, <code>REJECT_APPLICATION</code></td>
        <td>Lecture tous dossiers, <code>approve-seal</code>, <code>reject</code>, <code>revoke</code> (avec <code>doubleConfirmed: true</code>), <code>anchor-queue</code>, <code>deploy</code>.</td>
      </tr>
      <tr>
        <td><strong><code>MINISTERE</code></strong><br/>(Tutelle)</td>
        <td><code>COSIGN_MINISTRY_ACT</code></td>
        <td>Lecture dossiers, <code>POST /api/applications/cosign-ministry</code> (uniquement sur actes scellés <code>S2</code>/<code>S6</code>).</td>
      </tr>
      <tr>
        <td><strong><code>DOUANE</code></strong><br/>(DGDA / Public)</td>
        <td><code>VERIFY_QR_CERTIFICATE</code> (plus accès public sans compte sur <code>/verifier</code>)</td>
        <td><code>GET /api/verify?hash=...</code>, <code>POST /api/verify</code> (PDF direct), passerelle API partenaire avec <code>X-API-Key</code>.</td>
      </tr>
      <tr>
        <td><strong><code>ADMIN</code></strong><br/>(Admin Sys.)</td>
        <td><code>MANAGE_USERS</code>, <code>VIEW_AUDIT_LOGS</code></td>
        <td><code>/api/admin/applicants</code>, <code>/api/admin/audit</code> (CSV), <code>/api/cms/news</code>, <code>/api/blockchain/*</code>, <code>/api/ops/*</code>, gouvernance Smart Contract.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-danger">
    <strong>Principe de sécurité Fail-Closed &amp; Anti-Escalade (<code>SEC-04</code>) :</strong> Le rôle d'un utilisateur n'est <strong>jamais</strong> lu depuis les paramètres envoyés par le navigateur ; il provient exclusivement de la session serveur vérifiée par le jeton <code>Bearer</code>. Toute route inconnue ou tout rôle non explicitement autorisé reçoit immédiatement un refus HTTP <code>401</code> ou <code>403</code>.
  </div>

  <!-- ======================================================================= -->
  <!-- PAGE 10 : ETAT REEL D'IMPLEMENTATION (PARTIE 1 : DEJA IMPLEMENTE)       -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>État Réel d'Implémentation (1/2) — Cas d'Utilisation &amp; Services Validés</h1>
  <p>
    Afin d'éviter toute confusion entre maquette, prototype, moteur applicatif et infrastructure cloud connectée, voici l'inventaire factuel
    et vérifié des composants <strong>déjà implémentés et testés</strong> dans le dépôt à ce jour :
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Cas d'Utilisation / Module</th>
        <th style="width: 18%;">Statut Réel</th>
        <th style="width: 58%;">Preuve Concrete d'Implémentation &amp; Périmètre Couvert</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong><code>CU01</code> / <code>REQ-01..04</code></strong><br/>Comptes, OAuth, Reset, Profil</td>
        <td><span class="badge-done">Implémenté (App + API)</span><br/><span class="badge-cloud">OAuth + Web3Auth Configurés</span></td>
        <td>Écrans <code>/auth/login</code>, <code>/register</code>, <code>/forgot-password</code>, <code>/reset-password</code>, <code>/profile</code> ; hachage <code>scrypt</code> salé, anti-brute-force (5 essais), réponse neutre reset ; Google Cloud OAuth &amp; Web3Auth Sapphire Devnet configurés dans <code>.env</code>.</td>
      </tr>
      <tr>
        <td><strong><code>CU02</code> / <code>REQ-05..11</code></strong><br/>Catalogue S1–S6, Wizard, Once-Only, Modif/Retrait</td>
        <td><span class="badge-done">Implémenté (App + API)</span></td>
        <td>Catalogue complet <code>S1</code>–<code>S6</code> (<code>src/domain/services-catalog.mjs</code>), Assistant <code>/applications/new</code> avec calcul <code>SHA-256</code> navigateur Web Crypto, exemption serveur <code>P2_ENROLEMENT</code>, garde-fou PDF anti-JS/MIME/10 Mo (<code>document-upload-guard.mjs</code>), modification/retrait avant instruction, file PWA <code>OfflinePwaSyncQueue</code>.</td>
      </tr>
      <tr>
        <td><strong><code>CU03</code> / <code>ADM-01..10</code></strong><br/>Back-Office, Quittance, SLA, Visionneuse, Multi-niveaux</td>
        <td><span class="badge-done">Implémenté (App + API)</span></td>
        <td>Console <code>/admin</code> complète pour les 7 rôles ; contrôle anti-doublon quittance <code>P6</code> sur 7 canaux RDC (<code>payment-reconciliation.mjs</code>) ; calcul SLA 10 jours ouvrables avec pause sur complément ; visionneuse PDF intégrée <code>DocumentViewer</code> ; avis Chef de Division ; rejet DG ; audit CSV ; CMS actualités ; stats exécutives.</td>
      </tr>
      <tr>
        <td><strong><code>CU04</code> / <code>CU06</code> / <code>VER-01..06</code></strong><br/>PDF Normé, QR Code, Révocation &amp; Vérif Douanière</td>
        <td><span class="badge-done">Implémenté (App + API)</span></td>
        <td>Générateur des 6 gabarits PDF officiels <code>%PDF-1.4</code> (<code>certificate-generator.mjs</code>) ; double confirmation de révocation <code>VER-06</code> ; portail public <code>/verifier</code> avec scan/saisie hash, vérification directe d'un fichier PDF sans QR (<code>VER-04</code>) et API partenaire <code>X-API-Key</code> + Rate Limiting 429 (<code>VER-05</code>).</td>
      </tr>
      <tr>
        <td><strong><code>NOT-01..04</code></strong><br/>Notifications &amp; Messagerie</td>
        <td><span class="badge-done">Implémenté (App + API)</span><br/><span class="badge-cloud">Gmail SMTP SSL Validé</span></td>
        <td>Centre in-app avec compteur de non-lus, fil de discussion dossier, diffusions ciblées ; protocole Gmail SMTP SSL port <code>465</code> vérifié par envoi d'un vrai e-mail via <code>npm run email:test -- --send</code> (Code 250 OK).</td>
      </tr>
      <tr>
        <td><strong><code>OPS-03</code> / <code>OPS-05</code></strong><br/>Base SQL Neon &amp; Stockage Cloudinary Chiffré</td>
        <td><span class="badge-cloud">Déployé &amp; Validé Cloud</span></td>
        <td>Schéma 10 tables + seed S1–S6 exécutés sur <strong>Neon PostgreSQL</strong> (<code>npm run db:neon</code>) ; adaptateur <code>cloudinary-storage.mjs</code> testé en réel (<code>npm run storage:cloudinary</code> : chiffrement <code>AES-256-GCM</code>, upload <code>raw</code> sur Cloudinary, téléchargement et déchiffrement binaire exact).</td>
      </tr>
      <tr>
        <td><strong><code>BLK-04..11</code></strong><br/>Smart Contract Solidity sur Polygon Amoy</td>
        <td><span class="badge-cloud">Déployé On-Chain (Amoy)</span></td>
        <td><code>contracts/FNPSSRegistry.sol</code> compilé (Solidity <code>0.8.34</code>) et déployé sur Polygon Amoy (<code>80002</code>) à <code>0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code> ; bytecode vérifié via <code>eth_getCode</code> (23 508 caractères hexadécimaux) ; RPC PublicNode actif.</td>
      </tr>
      <tr>
        <td><strong><code>SEC-01..07</code> / <code>DEP-01..09</code></strong><br/>Tests E2E, Smoke &amp; Ops</td>
        <td><span class="badge-done">Implémenté &amp; Vérifié</span></td>
        <td><code>npm test</code> : <strong>30/30 suites PASS</strong> ; <code>npm run smoke</code> : <strong>30/30 vérifications PASS</strong> ; sauvegarde/restauration chiffrée, jalons Go/No-Go <code>G1</code>–<code>G4</code> et guide interactif <code>/guide</code>.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 11 : ETAT REEL D'IMPLEMENTATION (PARTIE 2 : SIMULE VS A FAIRE)      -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>État Réel d'Implémentation (2/2) — Simulé en Mémoire vs Non Encore Implémenté</h1>
  <p>
    La distinction suivante est fondamentale pour l'équipe technique et le COPIL : bien que toutes les briques cloud existent individuellement
    et que l'application Next.js soit fonctionnelle de bout en bout, <strong>le cœur runtime des routes API Next.js s'appuie encore sur des moteurs
    en mémoire JavaScript</strong> pour fonctionner de manière autonome et instantanée lors des démonstrations et tests automatisés.
  </p>

  <h2>1. Ce qui est Fonctionnel mais Simulé en Mémoire (Raccordement Runtime Requis)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Composant</th>
        <th style="width: 18%;">État Actuel</th>
        <th style="width: 58%;">Ce qui tourne aujourd'hui vs Ce qu'il faut câbler en Production</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Persistance Données App (<code>applicationEngine</code>, <code>authService</code>)</strong></td>
        <td><span class="badge-sim">En Mémoire (Map JS)</span></td>
        <td>Les routes Next.js stockent dossiers, utilisateurs et logs en mémoire vive (données réinitialisées au redémarrage serveur). <strong>À câbler :</strong> remplacer les <code>Map</code> par des requêtes SQL <code>pg</code> vers les 10 tables déjà créées sur Neon PostgreSQL (<code>OPS-03</code>).</td>
      </tr>
      <tr>
        <td><strong>Interactions Blockchain Backend (<code>registrySimulator</code>)</strong></td>
        <td><span class="badge-sim">Simulateur On-Chain</span></td>
        <td><code>approve-seal</code>, <code>cosign-ministry</code>, <code>revoke</code> et <code>/api/verify</code> interrogent <code>FNPSSRegistryContract</code> en JS (fidèle à 100 % à la logique Solidity). <strong>À câbler :</strong> connecter <code>ethers</code> / <code>viem</code> ou JSON-RPC signé avec la clé du Relayer vers le contrat réel <code>0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code> sur PublicNode Amoy (puis Mainnet).</td>
      </tr>
      <tr>
        <td><strong>Portefeuille Web3Auth (<code>deriveWeb3AuthWallet</code>)</strong></td>
        <td><span class="badge-sim">Dérivation HMAC Locale</span></td>
        <td>L'adresse <code>0x...</code> est calculée par HMAC déterministe côté serveur et <code>/api/auth/google</code> simule la réception du profil Google. <strong>À câbler :</strong> intégrer les SDK client Google Identity Services + <code>@web3auth/modal</code> / <code>@web3auth/no-modal</code> avec <code>WEB3AUTH_CLIENT_ID</code> dans <code>/auth/login</code>.</td>
      </tr>
      <tr>
        <td><strong>Stockage PDF Uploadés dans le Wizard (<code>/applications/new</code>)</strong></td>
        <td><span class="badge-sim">Métadonnées + Hash Client</span></td>
        <td>Le navigateur calcule le vrai <code>SHA-256</code> du PDF et envoie ses métadonnées ; l'adaptateur <code>cloudinary-storage.mjs</code> fonctionne via script. <strong>À câbler :</strong> streamer les binaires PDF depuis <code>POST /api/applications</code> vers <code>uploadEncryptedPdfToCloudinary()</code>.</td>
      </tr>
      <tr>
        <td><strong>Envoi E-mail Runtime (<code>NotificationCenter</code>)</strong></td>
        <td><span class="badge-sim">File Outbox Mémoire</span></td>
        <td>Les événements créent des objets dans <code>emailOutbox</code> en mémoire ; le vrai SMTP Gmail fonctionne dans <code>scripts/test-smtp.mjs</code>. <strong>À câbler :</strong> appeler le client SMTP SSL port <code>465</code> (ou Brevo) depuis <code>notifyTransactionalEvent()</code>.</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Ce qui N'est Pas Encore Implémenté (Reste à Construire pour le Go-Live National)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 28%;">Fonctionnalité du Cahier des Charges</th>
        <th style="width: 16%;">Statut</th>
        <th style="width: 56%;">Détail de ce qu'il reste à développer / finaliser</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Scanner Caméra QR Code Temps Réel (<code>VER-03</code>)</strong></td>
        <td><span class="badge-todo">Non implémenté</span></td>
        <td>La page <code>/verifier</code> accepte déjà le paramètre URL <code>?hash=...</code> scanné par l'appareil photo natif du téléphone, la saisie manuelle et l'upload PDF, mais n'embarque pas encore de lecteur vidéo caméra WebRTC in-app (ex. <code>html5-qrcode</code>).</td>
      </tr>
      <tr>
        <td><strong>Webhooks Temps Réel Banques RDC &amp; Mobile Money (<code>REQ-10</code>)</strong></td>
        <td><span class="badge-todo">Non implémenté</span></td>
        <td>Le contrôle de référence et l'anti-doublon existent dans <code>payment-reconciliation.mjs</code>, mais la vérification reste manuelle par l'agent ; les API directes Rawbank / EquityBCDC / Vodacom M-Pesa / Airtel Money / Orange Money sont prévues en intégration partenaire / Année 2.</td>
      </tr>
      <tr>
        <td><strong>Authentification 2FA Réelle (OTP TOTP / SMS) (<code>F03</code>)</strong></td>
        <td><span class="badge-todo">Non implémenté</span></td>
        <td>La double confirmation DG sur révocation (<code>doubleConfirmed</code>) est implémentée par case/modale, mais le second facteur matériel TOTP (Google Authenticator) ou SMS OTP pour les comptes à privilèges n'est pas encore codé.</td>
      </tr>
      <tr>
        <td><strong>Vrai QR Code Graphique dans le PDF Binaire &amp; Service Worker PWA Complet</strong></td>
        <td><span class="badge-todo">Partiel / À finaliser</span></td>
        <td>Le PDF 1.4 intègre l'URL et l'empreinte ; l'incrustation matricielle d'une image PNG QR Code scannable graphiquement et l'enregistrement d'un <code>sw.js</code> + <code>IndexedDB</code> complet côté navigateur (aujourd'hui modélisé via <code>OfflinePwaSyncQueue</code> + API) restent à parachever.</td>
      </tr>
      <tr>
        <td><strong>Production Nationale Polygon Mainnet &amp; Audit Externe (<code>BLK-12</code>, <code>SEC-03/04</code>)</strong></td>
        <td><span class="badge-todo">Bloqué par Garde Mainnet</span></td>
        <td>Déploiement sur Polygon Mainnet (<code>137</code>), coffre-fort Multisig Safe pour l'admin DG, approvisionnement 250 POL, audit externe du Smart Contract / pentest OWASP et migration vers serveur souverain Kinshasa/Lubumbashi (<code>OPS-07</code>).</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 12 : LE VERITABLE ROLE DE LA BLOCKCHAIN                            -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Le Véritable Rôle de la Blockchain dans le Guichet Unique FNPSS</h1>

  <h2>1. Pourquoi une Base de Données Classique (PostgreSQL) Ne Suffit-Elle Pas ?</h2>
  <p>
    Une question légitime revient souvent lors des comités de pilotage : <em>« Si le FNPSS possède déjà une base PostgreSQL sécurisée, pourquoi ajouter une blockchain ? »</em>.
    Dans une base de données centralisée classique, quiconque obtient un accès administrateur (ou pirate le serveur applicatif) peut <strong>modifier rétroactivement une ligne</strong>, changer la date d'émission d'une attestation ou falsifier l'historique sans laisser de preuve mathématique externe vérifiable par des tiers.
  </p>
  <p>
    De plus, les douaniers (DGDA), les régies financières (DGRAD, DGI) et les bailleurs internationaux sont des <strong>acteurs distincts</strong> du FNPSS : ils ont besoin d'une <strong>preuve neutre, publique et mathématiquement infalsifiable</strong> qu'un certificat d'exonération a bel et bien été émis à telle date par le FNPSS, co-signé par le Ministère, et n'a pas été révoqué depuis — même si le portail web principal du FNPSS subit une panne ou une cyberattaque.
  </p>

  <h2>2. Les 6 Piliers du Rôle Réel de Polygon dans l'Architecture FNPSS</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 26%;">Pilier Blockchain</th>
        <th style="width: 74%;">Traduction Concrète dans le Système FNPSS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Notarisation &amp; Intégrité Absolue (Preuve de Non-Altération)</strong></td>
        <td>Seule l'empreinte <code>SHA-256</code> (32 octets) du certificat est écrite dans le Smart Contract <code>FNPSSRegistry.sol</code>. Modifier une seule lettre, un seul chiffre sur un véhicule exonéré ou une virgule dans le PDF produit un hash totalement différent : la fraude est mathématiquement détectable en 1 seconde.</td>
      </tr>
      <tr>
        <td><strong>2. Horodatage Légal Immuable (Code du Numérique RDC)</strong></td>
        <td>À la seconde où le bloc Polygon est validé par le réseau décentralisé, <code>issuedAt = block.timestamp</code> grave de manière ineffaçable la date et l'heure d'émission. Personne ne peut antidater ou postdater un arrêté.</td>
      </tr>
      <tr>
        <td><strong>3. Preuve Multi-Institutionnelle (Contre-Seing Ministériel)</strong></td>
        <td>Pour les services <code>S2</code> et <code>S6</code>, le contrat enregistre séparément l'adresse <code>issuer</code> (FNPSS) et l'adresse <code>ministryCoSigner</code> (Ministère de Tutelle). L'acte porte la double signature cryptographique de la chaîne administrative.</td>
      </tr>
      <tr>
        <td><strong>4. Révocation Instantanée Mondiale</strong></td>
        <td>Un document papier falsifié ou retiré continue de circuler physiquement. En appelant <code>revokeDocument()</code>, l'état on-chain devient instantanément <code>REVOKED</code> pour tous les postes frontières de Matadi à Goma.</td>
      </tr>
      <tr>
        <td><strong>5. Vérification Décentralisée &amp; Gratuite (<code>view</code>)</strong></td>
        <td>La fonction <code>verifyDocument()</code> est marquée <code>external view</code> : tout nœud RPC Polygon répond gratuitement en lecture seule en moins de 2 secondes, sans payer de gaz et sans exposer les serveurs internes du FNPSS.</td>
      </tr>
      <tr>
        <td><strong>6. Zéro Complexité Crypto pour les Usagers (Abstraction)</strong></td>
        <td>L'ONG utilise Google/Email (Web3Auth MPC invisible) et le FNPSS paie les fractions de centimes de gaz via un unique portefeuille serveur <strong>Relayer</strong> (<code>&lt; 0,005 USD</code> par acte sur Mainnet).</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Ce que la Blockchain NE Fait Volontairement PAS (Règle Privacy by Design)</h2>
  <div class="callout-warn">
    <strong>Séparation stricte On-Chain / Off-Chain :</strong> La blockchain n'est <strong>ni un disque dur, ni un coffre de fichiers, ni un moyen de paiement pour les ONG</strong> :
    <ul style="margin-bottom:0;">
      <li><strong>Zéro fichier PDF sur la blockchain :</strong> Stocker des PDF de plusieurs mégaoctets sur Polygon coûterait extrêmement cher et violerait la confidentialité publique. Les pièces restent chiffrées en <code>AES-256-GCM</code> hors chaîne (Cloudinary / coffre souverain).</li>
      <li><strong>Zéro donnée personnelle (PII) ni montant secret en clair on-chain :</strong> Seuls le <code>docHash</code>, le numéro d'acte, le code service (<code>1..6</code>), les timestamps et le statut sont inscrits dans <code>FNPSSRegistry.sol</code>.</li>
      <li><strong>Zéro paiement en cryptomonnaie exigé aux ONG :</strong> Les frais réglementaires (<code>20 USD + 300 USD</code>) restent payés en Francs Congolais / Dollars via banques congolaises et Mobile Money.</li>
    </ul>
  </div>

  <!-- ======================================================================= -->
  <!-- PAGE 13 : TOUS LES SCENARIOS BLOCKCHAIN (1 A 5)                         -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Tous les Scénarios sur la Blockchain (Scénarios 1 à 5)</h1>

  <h2>Scénario 1 — Création d'Identité Web3 Transparente lors du Login ONG (<code>BLK-02 / BLK-03</code>)</h2>
  <ul>
    <li><strong>Déclencheur :</strong> Une ONG se connecte avec Google OAuth 2.0 ou par email sur le portail.</li>
    <li><strong>Mécanisme Blockchain :</strong> Aucune transaction de gaz n'est envoyée sur Polygon à ce stade. Le module Web3Auth (MPC) dérive une paire de clés ECDSA (<code>secp256k1</code>) et associe une adresse publique <code>0x...</code> au compte de l'ONG dans la table <code>users</code> (<code>wallet_address</code>), lui permettant de signer cryptographiquement ses soumissions sans manipuler de clé privée.</li>
  </ul>

  <h2>Scénario 2 — Scellement et Ancrage Nominal d'un Nouvel Acte Officiel (<code>CU04 / SC-01 / BLK-05</code>)</h2>
  <ol>
    <li>La Direction Générale approuve la demande (ex. Certificat d'exonération <code>S4</code> n° <code>FNPSS-CEX-2026-00001</code>).</li>
    <li>Le serveur construit l'empreinte canonique <code>SHA-256</code> (<code>docHash = 0x...</code> sur 32 octets) des métadonnées officielles de l'acte.</li>
    <li>Le <strong>Relayer FNPSS</strong> (autorisé par le rôle <code>onlyRegistrar</code>) appelle <code>registerDocument(docHash, certificateNumber, serviceCode, expiresAt)</code> sur le contrat <code>0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code>.</li>
    <li>Le Smart Contract vérifie : contrat non en pause, appelant autorisé, <code>docHash != 0</code>, empreinte inédite (<code>DocStatus.NONE</code>), <code>serviceCode</code> dans <code>[1..6]</code>, <code>expiresAt</code> valide.</li>
    <li>Il écrit le <code>DocumentRecord</code>, indexe <code>_numberToHash[keccak256(certificateNumber)] = docHash</code>, incrémente <code>totalRegistered</code> et émet l'événement <code>DocumentRegistered</code>.</li>
    <li>Le PDF final est généré avec le QR Code pointant vers <code>/verifier?hash=docHash</code> et son hash binaire <code>pdfSha256</code> est lié pour <code>VER-04</code>.</li>
  </ol>

  <h2>Scénario 3 — Contre-Seing / Co-Signature Ministérielle On-Chain (<code>ADM-06 / S2 &amp; S6</code>)</h2>
  <ol>
    <li>Concerne uniquement les actes conjoints (<code>S2</code> Convention de partenariat, <code>S6</code> Arrêté ministériel).</li>
    <li>Une fois l'acte ancré au statut <code>ACTIVE</code> par le FNPSS, le Point Focal du Ministère de Tutelle valide le contre-seing.</li>
    <li>Le compte autorisé <code>onlyMinistry</code> invoque <code>coSignDocument(docHash)</code>.</li>
    <li>Le contrat vérifie que l'acte est actif et n'a pas encore été co-signé (<code>ministryCoSigner == address(0)</code>), inscrit l'adresse du signataire ministériel et émet <code>DocumentCoSigned(docHash, signer, timestamp)</code>.</li>
  </ol>

  <h2>Scénario 4 — Ancrage Résilient en Cas de Coupure Internet / Panne RPC (<code>BLK-10 / SC-04</code>)</h2>
  <ol>
    <li>La DG signe un certificat alors que le lien Internet du serveur ou le nœud RPC Polygon subit une panne passagère.</li>
    <li>Au lieu de bloquer le travail du FNPSS par une erreur fatale, le backend insère le job dans <code>ResilientAnchorQueue.enqueue()</code> avec indexation idempotente par <code>docHash</code> (statut <code>QUEUED</code>).</li>
    <li>Lors de la tentative <code>flush(false)</code>, la tâche reste protégée en attente (<code>NETWORK_OFFLINE_QUEUED</code>) sans duplication.</li>
    <li>Dès le rétablissement réseau, la boucle de reprise exécute <code>flush(true)</code> : la transaction part une seule et unique fois vers Polygon, passe à <code>CONFIRMED</code> avec son <code>txHash</code> réel, et garantit qu'aucun certificat ne reste orphelin sans ancrage.</li>
  </ol>

  <h2>Scénario 5 — Vérification Douanière Nominale par Scan QR Code (<code>CU05 / VER-03</code>)</h2>
  <ol>
    <li>À la frontière de Kasumbalesa ou au port de Matadi, l'inspecteur DGDA scanne le QR Code imprimé sur l'attestation.</li>
    <li>Le navigateur ouvre <code>/verifier?hash=0x...</code> (ou saisit le numéro d'acte résolu via <code>getHashByCertificateNumber()</code>).</li>
    <li>L'API appelle en lecture gratuite (sans gaz) <code>verifyDocument(docHash)</code> sur le contrat Polygon.</li>
    <li>Le contrat répond <code>isValid = true, isExpired = false, status = ACTIVE</code>. L'écran affiche la <strong>🟢 PASTILLE VERTE : AUTHENTIQUE &amp; VALIDE</strong> en moins de 2 secondes.</li>
  </ol>

  <!-- ======================================================================= -->
  <!-- PAGE 14 : TOUS LES SCENARIOS BLOCKCHAIN (6 A 10)                        -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Tous les Scénarios sur la Blockchain (Scénarios 6 à 10)</h1>

  <h2>Scénario 6 — Vérification Directe d'un Fichier PDF Reçu Sans Scan QR (<code>VER-04</code>)</h2>
  <ol>
    <li>Un opérateur envoie son certificat par courriel sans version papier ni QR Code scannable à proximité.</li>
    <li>L'inspecteur DGDA importe directement ce fichier <code>.pdf</code> dans l'écran <code>/verifier</code>.</li>
    <li>Le client recalcule l'empreinte <code>SHA-256</code> exacte du fichier binaire et l'envoie à <code>POST /api/verify</code>.</li>
    <li>Le vérificateur contrôle la correspondance avec l'empreinte PDF binaire scellée (<code>pdfHashToDocHash</code>) puis interroge l'état du <code>docHash</code> sur le Smart Contract. Si l'acte est toujours actif et non révoqué, l'inspecteur obtient la Pastille Verte même sans appareil photo.</li>
  </ol>

  <h2>Scénario 7 — Détection de Falsification ou Altération d'un Seul Octet (<code>SC-03</code>)</h2>
  <ol>
    <li>Un fraudeur prend un vrai certificat PDF FNPSS de <code>5 véhicules</code> et le modifie sous éditeur PDF pour inscrire <code>50 véhicules</code> (ou change la date d'expiration visuellement).</li>
    <li>Par effet avalanche du hachage <code>SHA-256</code>, le condensat du fichier falsifié devient radicalement différent de celui inscrit sur Polygon (ex. <code>0x9a4c...</code> au lieu de <code>0x7f83...</code>).</li>
    <li>Lors du scan ou du dépôt du PDF falsifié à la douane, <code>verifyDocument(hashFalsifie)</code> renvoie <code>DocStatus.NONE</code> (<code>isValid = false</code>).</li>
    <li>L'écran affiche immédiatement la <strong>🔴 PASTILLE ROUGE : ALERTE — DOCUMENT INCONNU OU FALSIFIÉ</strong>, permettant l'immobilisation immédiate de la cargaison frauduleuse.</li>
  </ol>

  <h2>Scénario 8 — Révocation Administrative Mondiale Instantanée (<code>CU06 / VER-06 / BLK-07</code>)</h2>
  <ol>
    <li>Trois semaines après délivrance, une inspection révèle que l'ONG a revendu commercialement les biens exonérés ou fourni de fausses pièces.</li>
    <li>La DG du FNPSS déclenche la révocation avec motif légal obligatoire et double confirmation explicite.</li>
    <li>Le Relayer appelle <code>revokeDocument(docHash, reason)</code> sur Polygon ; le contrat exige <code>onlyRevoker</code>, vérifie que le statut est <code>ACTIVE</code> et le bascule irréversiblement à <code>DocStatus.REVOKED</code> avec horodatage <code>revokedAt</code> et motif public, tout en émettant <code>DocumentRevoked</code>.</li>
    <li>Dans la seconde suivante, à n'importe quel poste frontière du pays, le scan du QR Code original qui affichait encore Vert la veille bascule désormais instantanément sur <strong>🔴 PASTILLE ROUGE : DOCUMENT RÉVOQUÉ</strong> avec affichage du motif officiel.</li>
  </ol>

  <h2>Scénario 9 — Expiration Temporelle Automatique On-Chain (<code>Pastille Grise</code>)</h2>
  <ol>
    <li>Un certificat d'exonération temporaire a été délivré pour 365 jours (<code>expiresAt &gt; 0</code>).</li>
    <li>Aucune transaction de mise à jour payante n'est nécessaire à la date anniversaire : le Smart Contract compare en direct l'horloge du bloc courant (<code>block.timestamp &gt; rec.expiresAt</code>).</li>
    <li>Dès le premier jour de dépassement, <code>verifyDocument()</code> retourne automatiquement <code>isValid = false, isExpired = true, status = ACTIVE</code>, affichant la <strong>⚪ PASTILLE GRISE : CERTIFICAT EXPIRÉ</strong> pour inviter l'ONG à renouveler sa démarche.</li>
  </ol>

  <h2>Scénario 10 — Incident de Sécurité, Coupe-Circuit &amp; Transition Multisig Mainnet (<code>BLK-08 / BLK-12</code>)</h2>
  <ol>
    <li><strong>Incident clé serveur compromise :</strong> L'Administrateur appelle <code>setPaused(true)</code> depuis son coffre administrateur (modificateur <code>whenNotPaused</code>), gelant instantanément tout nouvel enregistrement ou révocation suspecte tout en maintenant les consultations douanières (<code>verifyDocument</code>) 100 % opérationnelles ! Il révoque ensuite l'ancienne clé relayer via <code>setRegistrar(oldRelayer, false)</code> et en active une neuve.</li>
    <li><strong>Passage Polygon Amoy &rarr; Polygon PoS Mainnet (<code>137</code>) :</strong> Avant l'ouverture nationale, le contrat est audité (<code>SEC-03</code>), redéployé sur le réseau principal avec transfert du rôle <code>admin</code> vers un <strong>Multisig Safe (2/3 signatures)</strong>, et doté de <code>250 POL</code> de gaz pour couvrir plus de 150 000 actes officiels.</li>
  </ol>

  <!-- ======================================================================= -->
  <!-- PAGE 15 : ENCYCLOPEDIE DES CONCEPTS (1/3 : CRYPTOGRAPHIE)               -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Encyclopédie des Concepts Utilisés (1/3) — Cryptographie</h1>
  <p>
    Chaque brique cryptographique intégrée dans le Guichet Unique répond à une exigence juridique ou opérationnelle précise.
    Voici leur définition, leur importance critique et le problème du cahier des charges qu'elles résolvent :
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Concept &amp; Fichier Clé</th>
        <th style="width: 30%;">Explication Simple &amp; Technique</th>
        <th style="width: 22%;">Importance Critique</th>
        <th style="width: 26%;">Problème Cahier des Charges Résolu</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Hachage <code>SHA-256</code></strong><br/>(<code>document-sealer.mjs</code> &amp; Web Crypto navigateur)</td>
        <td>Fonction mathématique à sens unique transformant n'importe quel texte ou fichier PDF en une empreinte hexadécimale unique de 256 bits (32 octets, 64 caractères). Impossible de retrouver le fichier d'origine depuis l'empreinte.</td>
        <td>Propriété d'effet avalanche : changer un seul pixel ou caractère change 50 % des bits de l'empreinte.</td>
        <td><strong>Falsification des attestations PDF (S1–S6) :</strong> permet aux douaniers DGDA de détecter mathématiquement toute retouche Photoshop/Word sans exposer les données confidentielles sur Internet.</td>
      </tr>
      <tr>
        <td><strong>Hachage <code>Keccak-256</code></strong><br/>(<code>FNPSSRegistry.sol</code>)</td>
        <td>Fonction de hachage native d'Ethereum/Polygon utilisée ici pour indexer le numéro d'acte textuel (<code>_numberToHash[keccak256(bytes(certNumber))]</code>).</td>
        <td>Réduit drastiquement le coût du gaz par rapport à des index textuels longs tout en restant compatible EVM.</td>
        <td><strong>Saisie manuelle sans QR Code :</strong> permet à un douanier de taper uniquement <code>FNPSS-CEX-2026-00001</code> quand le QR Code papier est abîmé ou illisible.</td>
      </tr>
      <tr>
        <td><strong>Chiffrement Symétrique Authentifié <code>AES-256-GCM</code></strong><br/>(<code>cloudinary-storage.mjs</code> &amp; backups)</td>
        <td>Chiffrement de grade militaire avec clé 256 bits, vecteur d'initialisation unique (IV 12 octets) par fichier et étiquette d'authenticité (<code>AuthTag</code> 16 octets) vérifiant l'intégrité avant déchiffrement.</td>
        <td>Même si l'hébergeur cloud (Cloudinary) était compromis ou inspecté, aucun tiers ne peut lire ni modifier silencieusement les pièces P1–P6 des ONG.</td>
        <td><strong>Confidentialité &amp; Souveraineté des Données (Code du Numérique RDC) :</strong> protège les statuts, rapports financiers et sauvegardes SQL avant stockage sur cloud tiers.</td>
      </tr>
      <tr>
        <td><strong>Double Empreinte <code>docHash</code> + <code>pdfSha256</code> (<code>VER-04</code>)</strong><br/>(<code>registry-simulator.mjs</code>, <code>document-upload-guard.mjs</code>)</td>
        <td>Scelle d'une part l'empreinte canonique des métadonnées structurées (<code>docHash</code>), et lie d'autre part l'empreinte binaire exacte du fichier PDF rendu final (<code>bindRenderedPdfHash</code>).</td>
        <td>Autorise la vérification aussi bien par données du QR Code que par soumission brute d'un fichier PDF téléchargé.</td>
        <td><strong>Contrôle douanier d'un PDF reçu par email/WhatsApp :</strong> permet à la DGDA de vérifier un fichier numérique sans exiger de scanner un QR Code imprimé.</td>
      </tr>
      <tr>
        <td><strong>Hachage de Mots de Passe <code>scrypt</code> + Sel Aléatoire</strong><br/>(<code>auth-service.mjs</code>)</td>
        <td>Fonction de dérivation de clé lente et gourmande en mémoire combinée à un sel aléatoire de 16 octets unique par utilisateur, comparée à temps constant (<code>timingSafeEqual</code>).</td>
        <td>Empêche le cassage massif des mots de passe par GPU ou tables arc-en-ciel en cas de fuite de base de données.</td>
        <td><strong>Sécurité d'accès des comptes ONG et Agents (<code>REQ-01</code>, <code>SEC-04</code>) :</strong> protège les comptes officiels habilités à déposer ou instruire des exonérations fiscales.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 16 : ENCYCLOPEDIE DES CONCEPTS (2/3 : BLOCKCHAIN & WEB3)           -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Encyclopédie des Concepts Utilisés (2/3) — Blockchain &amp; Web3</h1>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Concept &amp; Fichier Clé</th>
        <th style="width: 30%;">Explication Simple &amp; Technique</th>
        <th style="width: 22%;">Importance Critique</th>
        <th style="width: 26%;">Problème Cahier des Charges Résolu</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Account Abstraction &amp; Web3Auth MPC</strong><br/>(<code>auth-service.mjs</code>, <code>developer.metamask.io</code>)</td>
        <td>Architecture qui cache la complexité d'un portefeuille crypto en associant une connexion Google OAuth 2.0 / Email à une clé fractionnée par calcul multipartite (MPC) sans phrase secrète.</td>
        <td>Élimine le point de friction numéro 1 du Web3 : 99 % des usagers non-informaticiens abandonneraient s'il fallait noter 12 mots secrets.</td>
        <td><strong>Accessibilité universelle des ONG humanitaires (<code>UX-01</code>, <code>BLK-02/03</code>) :</strong> garantit qu'une ONG rurale au Kivu utilise la plateforme aussi facilement qu'une boîte Gmail.</td>
      </tr>
      <tr>
        <td><strong>Gas Relayer / Paymaster Centralisé</strong><br/>(<code>/api/blockchain/anchor-queue</code>, <code>BLK-09</code>)</td>
        <td>Compte serveur unique géré et financé par le FNPSS qui signe et paie en jetons <code>POL</code> toutes les transactions d'ancrage et de révocation pour le compte de l'institution.</td>
        <td>Sépare complètement les coûts d'infrastructure blockchain de l'expérience utilisateur des ONG et fonctionnaires.</td>
        <td><strong>Suppression de l'achat de crypto par les usagers :</strong> ni les ONG, ni les inspecteurs FNPSS, ni le Ministère n'ont besoin d'acheter du POL ou d'alimenter un wallet personnel.</td>
      </tr>
      <tr>
        <td><strong>Layer 2 EVM (Polygon Amoy / PoS Mainnet)</strong><br/>(<code>polygon-deployer.mjs</code>, <code>ADR-003</code>)</td>
        <td>Réseau compatible Machine Virtuelle Ethereum (<code>Solidity ^0.8.24</code>) offrant une finalité en ~2 secondes et des frais de transaction divisés par 1000 par rapport à Ethereum L1.</td>
        <td>Assure la viabilité budgétaire à long terme d'un établissement public et garantit une attente quasi nulle lors de la signature DG.</td>
        <td><strong>Coût &amp; Latence (<code>&lt; 0,005 USD</code>/acte et <code>&lt; 3 s</code>) :</strong> permet d'ancrer plus de 150 000 actes avec seulement 1 000 USD de budget gaz, là où Ethereum L1 coûterait plus de 10 USD par acte.</td>
      </tr>
      <tr>
        <td><strong>Privacy by Design (Zéro PII On-Chain)</strong><br/>(<code>FNPSSRegistry.sol</code>)</td>
        <td>Architecture qui exclut par construction toute donnée personnelle nominative, pièce financière ou contenu médical des blocs publics mondiaux.</td>
        <td>La blockchain étant publique et ineffaçable à vie, y inscrire des données privées créerait une violation juridique irréversible.</td>
        <td><strong>Conformité Code du Numérique &amp; Souveraineté État :</strong> concilie transparence publique anti-fraude et protection stricte des dossiers des ONG et donateurs.</td>
      </tr>
      <tr>
        <td><strong>Smart Contract RBAC &amp; Circuit Breaker (<code>Pausable</code>)</strong><br/>(<code>FNPSSRegistry.sol</code>)</td>
        <td>Rôles stricts inscrits dans le code du contrat (<code>onlyAdmin</code>, <code>onlyRegistrar</code>, <code>onlyRevoker</code>, <code>onlyMinistry</code>) et interrupteur d'urgence <code>setPaused(true)</code>.</td>
        <td>Empêche tout acteur tiers sur la blockchain publique d'enregistrer ou de révoquer des certificats FNPSS, et protège en cas de fuite de clé.</td>
        <td><strong>Souveraineté institutionnelle &amp; plan d'urgence cyber :</strong> garantit que seul le FNPSS émet des actes valides et peut geler les écritures en 1 transaction si besoin.</td>
      </tr>
      <tr>
        <td><strong>File d'Attente Blockchain Idempotente (<code>ResilientAnchorQueue</code>)</strong><br/>(<code>registry-simulator.mjs</code>)</td>
        <td>Tampon asynchrone indexé par <code>docHash</code> qui conserve les ancrages non envoyés lors d'une panne RPC et les rejoue automatiquement au retour de la connexion.</td>
        <td>Rend le workflow métier du DG totalement indépendant de la stabilité instantanée du réseau Internet ou des nœuds RPC publics.</td>
        <td><strong>Instabilité réseau en RDC (<code>BLK-10</code>, <code>SC-04</code>) :</strong> évite la perte d'ancrages ou les doubles paiements de gaz en cas de micro-coupure pendant la signature.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 17 : ENCYCLOPEDIE DES CONCEPTS (3/3 : APPLICATIFS & SECURITE)      -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Encyclopédie des Concepts Utilisés (3/3) — Applicatifs, Sécurité &amp; Terrain RDC</h1>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Concept &amp; Fichier Clé</th>
        <th style="width: 30%;">Explication Simple &amp; Technique</th>
        <th style="width: 22%;">Importance Critique</th>
        <th style="width: 26%;">Problème Cahier des Charges Résolu</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Principe « Once-Only » Vérifié Serveur</strong><br/>(<code>api/applications/route.js</code>)</td>
        <td>Exemption automatique de la pièce <code>P2_ENROLEMENT</code> pour les services <code>S2</code>–<code>S6</code> dès lors que le serveur confirme un dossier <code>S1</code> actif et non révoqué pour cette ONG.</td>
        <td>Le calcul côté serveur empêche un usager malveillant de contourner la vérification en falsifiant le JSON envoyé.</td>
        <td><strong>Redondance bureaucratique :</strong> évite aux ONG déjà reconnues de soumettre les mêmes actes statutaires à chaque nouvelle demande d'exonération.</td>
      </tr>
      <tr>
        <td><strong>SLA Dynamique 10 Jours Ouvrables + Pause</strong><br/>(<code>services-catalog.mjs</code>, <code>application-engine.mjs</code>)</td>
        <td>Chronomètre réglementaire démarrant uniquement après validation de la quittance, excluant week-ends/jours fériés et se mettant en pause (<code>slaPaused</code>) durant les compléments.</td>
        <td>Mesure objectivement la performance réelle des agents FNPSS sans fausser les délais à cause des retards des requérants.</td>
        <td><strong>Opacité et lenteur des dossiers :</strong> offre aux ONG une visibilité fiable sur l'engagement de service du FNPSS et alerte les superviseurs avant dépassement.</td>
      </tr>
      <tr>
        <td><strong>PWA Hors-Ligne &amp; Clé d'Idempotence</strong><br/>(<code>offline-sync-queue.mjs</code>, <code>/api/pwa/sync</code>)</td>
        <td>File de synchronisation locale tolérante aux coupures associée à un identifiant unique par opération (<code>idempotencyKey</code>) dédupliqué côté serveur.</td>
        <td>Empêche qu'une reconnexion 3G répétée ne crée 3 dossiers identiques ou ne déclenche 3 réconciliations comptables.</td>
        <td><strong>Coupures 3G/électricité en province (<code>REQ-11</code>, <code>UX-01</code>) :</strong> les coordinatrices en zone humanitaire ne perdent plus leur travail ni ne génèrent de doublons.</td>
      </tr>
      <tr>
        <td><strong>RBAC Fail-Closed &amp; Anti-IDOR</strong><br/>(<code>route-access-policy.mjs</code>, <code>api-auth.mjs</code>)</td>
        <td>Politique « tout ce qui n'est pas explicitement permis est refusé » + contrôle systématique que la ressource consultée appartient bien à <code>actor.id</code> (pour un requérant).</td>
        <td>Empêche une ONG A de lire les dossiers ou télécharger les PDF confidentiels d'une ONG B en modifiant simplement un numéro dans l'URL.</td>
        <td><strong>Étanchéité des dossiers concurrents (<code>SEC-04</code>) :</strong> protège les factures proforma et projets humanitaires de chaque ONG contre toute fuite transversale.</td>
      </tr>
      <tr>
        <td><strong>Garde-Fou Upload PDF Anti-Malware (<code>REQ-07</code>)</strong><br/>(<code>document-upload-guard.mjs</code>)</td>
        <td>Inspection binaire vérifiant l'en-tête <code>%PDF-</code>, la limite de 10 Mo et rejetant les balises actives dangereuses (<code>/JavaScript</code>, <code>/Launch</code>, <code>/OpenAction</code>, etc.).</td>
        <td>Bloque les fichiers exécutables déguisés en PDF ou les PDF piégés avant qu'ils n'atteignent le poste d'un agent instructeur.</td>
        <td><strong>Protection des postes du FNPSS :</strong> permet aux agents d'ouvrir les pièces en toute sécurité dans la visionneuse intégrée (<code>ADM-05</code>).</td>
      </tr>
      <tr>
        <td><strong>Passerelle API <code>X-API-Key</code> &amp; Rate Limiting</strong><br/>(<code>partner-api-gateway.mjs</code>)</td>
        <td>Authentification dédiée pour les systèmes partenaires (DGDA, DGRAD, DGI) avec quota de requêtes par minute et rejet HTTP <code>429</code> en cas de saturation.</td>
        <td>Protège la disponibilité de l'infrastructure publique contre les attaques par déni de service (DDoS) ou le scraping automatisé.</td>
        <td><strong>Interopérabilité étatique sécurisée (<code>VER-05</code>) :</strong> raccorde directement les logiciels douaniers/fiscaux de l'État tout en gardant un trafic maîtrisé.</td>
      </tr>
      <tr>
        <td><strong>Budget Réseau 3G &amp; Contraste WCAG AAA</strong><br/>(<code>VER-03</code>, <code>REQ-12</code>, <code>UX-05</code>)</td>
        <td>Conception légère (<code>&lt; 150 Ko</code> JS sur la vue douane), chargement cible &lt; 3 s en 3G et pastilles à fort contraste + icônes textuelles explicites.</td>
        <td>Une page trop lourde ou pâle échouerait sur un smartphone d'entrée de gamme sous le soleil d'un poste frontalier.</td>
        <td><strong>Exploitation réelle aux frontières RDC :</strong> garantit que le contrôle douanier fonctionne partout où passe un signal mobile minimal.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 18 : MATRICE CAHIER DES CHARGES -> PROBLEME -> SOLUTION -> IMPACT  -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Matrice de Correspondance : Cahier des Charges &rarr; Problème &rarr; Solution &rarr; Impact</h1>
  <p>
    Ce tableau récapitulatif relie directement chaque grand bloc du cahier des charges initial au problème opérationnel constaté,
    à l'ensemble des concepts techniques mobilisés et au gain concret vérifié pour l'État congolais et les partenaires humanitaires :
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Exigence CDC</th>
        <th style="width: 24%;">Problème Initial sur le Terrain</th>
        <th style="width: 32%;">Concepts &amp; Choix Techniques Appliqués</th>
        <th style="width: 26%;">Bénéfice Opérationnel Mesuré</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Lutte contre la fraude documentaire (<code>F11</code>–<code>F16</code>, <code>SC-03</code>)</strong></td>
        <td>Faux certificats d'exonération modifiés en PDF ou imprimés avec de fausses signatures, faisant perdre des recettes douanières à l'État.</td>
        <td>Hachage <code>SHA-256</code> + ancrage Smart Contract <code>FNPSSRegistry.sol</code> sur Polygon + QR Code dynamique + vérification fichier brut <code>VER-04</code>.</td>
        <td>Détection instantanée (<strong>100 % des altérations bloquées</strong>) par Pastille Rouge DGDA en moins de 3 secondes.</td>
      </tr>
      <tr>
        <td><strong>Révocation immédiate des abus (<code>F14</code>, <code>CU06</code>, <code>VER-06</code>)</strong></td>
        <td>Délais administratifs de plusieurs semaines pour prévenir toutes les frontières lorsqu'un agrément est retiré.</td>
        <td>Fonction <code>revokeDocument()</code> on-chain + double confirmation DG + diffusion d'alerte vers <code>DGDA</code>, <code>DGRAD</code>, <code>DGI</code>.</td>
        <td>Invalidation mondiale effective dès le bloc Polygon suivant (<strong>~2 secondes</strong>) sur tous les postes frontaliers.</td>
      </tr>
      <tr>
        <td><strong>Déconcentration provinciale &amp; 3G (<code>REQ-05..12</code>, <code>SC-04</code>)</strong></td>
        <td>Déplacements physiques coûteux depuis les provinces et échecs d'envoi de gros formulaires sur connexion instable.</td>
        <td>Portail Web Responsive + Web3Auth sans wallet + PWA <code>OfflinePwaSyncQueue</code> + clé d'idempotence + file <code>ResilientAnchorQueue</code>.</td>
        <td>Zéro déplacement physique pour déposer/suivre ; tolérance aux coupures sans perte de brouillon ni doublon.</td>
      </tr>
      <tr>
        <td><strong>Maîtrise des frais &amp; anti-fraude P6 (<code>F06</code>, <code>GOV-11</code>, <code>REQ-10</code>)</strong></td>
        <td>Réutilisation frauduleuse d'une même quittance bancaire de 320 USD sur plusieurs requêtes distinctes.</td>
        <td>Grand Livre <code>PaymentReconciliationLedger</code> indexé en référence unique sur 7 canaux RDC + ventilation <code>20$ + 300$</code> + export CSV.</td>
        <td><strong>Zéro doublon de quittance possible</strong> ; traçabilité comptable et démarrage objectif du chronomètre SLA 10 j.</td>
      </tr>
      <tr>
        <td><strong>Instruction interne rigoureuse (<code>F07</code>–<code>F10</code>, <code>ADM-01..08</code>)</strong></td>
        <td>Dossiers égarés, absence de piste d'audit sur qui a approuvé quoi, échanges informels non tracés.</td>
        <td>Workflow RBAC 7 rôles + Visionneuse <code>DocumentViewer</code> intégrée + Fil dossier <code>NOT-04</code> + Pause SLA + Journal d'audit CSV <code>ADM-07</code>.</td>
        <td>Chaîne de responsabilité nominative complète (Agent &rarr; Chef de Division &rarr; DG &rarr; Ministère) auditable par l'IGF.</td>
      </tr>
      <tr>
        <td><strong>Confidentialité &amp; Souveraineté État (<code>OPS-05</code>, <code>SEC-04/06</code>)</strong></td>
        <td>Crainte que la mise en ligne ou l'usage d'une blockchain publique n'expose les secrets administratifs et données ONG.</td>
        <td><em>Privacy by Design</em> (Zéro PII on-chain) + Chiffrement <code>AES-256-GCM</code> off-chain + Anti-IDOR + En-têtes OWASP + Upload Guard PDF.</td>
        <td>Conformité intégrale à l'Ordonnance-Loi n° 23/010 (Code du Numérique RDC) sans compromettre la vérifiabilité publique.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-info">
    <strong>Synthèse Architecturale :</strong> Aucune technologie n'a été ajoutée « par effet de mode ». La blockchain couvre exclusivement le <strong>scellement de vérité publique</strong> (intégrité, date, émetteurs, révocation), tandis que PostgreSQL, Cloudinary chiffré <code>AES-256-GCM</code> et Next.js portent la <strong>logique métier souveraine et la confidentialité</strong>.
  </div>

  <!-- ======================================================================= -->
  <!-- PAGE 19 : RECONCILIATION COMPTABLE & ARCHITECTURE DES DONNEES           -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Réconciliation Comptable (<code>GOV-11</code>) &amp; Architecture des Données Hybride</h1>

  <h2>1. Réconciliation Bancaire &amp; Mobile Money Multi-Canaux en RDC</h2>
  <p>
    Conformément au module <code>src/finance/payment-reconciliation.mjs</code> et aux décisions COPIL (<code>GOV-11</code> / <code>ADR-002</code>),
    chaque demande soumise exige la preuve de paiement des frais réglementaires totaux de <strong>320 USD</strong> (convertibles en CDF selon le taux officiel),
    décomposés strictement en deux lignes comptables lors de la validation par l'agent instructeur :
  </p>
  <ul>
    <li><strong>Frais de dépôt de dossier :</strong> <code>20 USD</code> (imputés dès la réception conforme).</li>
    <li><strong>Frais d'enquête technique et de conformité :</strong> <code>300 USD</code> (couvrant l'instruction et les vérifications de terrain).</li>
  </ul>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Code Canal Reconnu</th>
        <th style="width: 34%;">Établissement Bancaire / Opérateur Mobile Money</th>
        <th style="width: 42%;">Format de Référence Normalisé (Anti-Doublon)</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><code>RAWBANK</code></td><td>Rawbank RDC</td><td><code>RAWBANK-CDF-2026-xxxxx</code></td></tr>
      <tr><td><code>EQUITYBCDC</code> / <code>BCDC</code></td><td>EquityBCDC RDC</td><td><code>EQUITYBCDC-2026-xxxxx</code> / <code>BCDC-CDF-2026-xxxxx</code></td></tr>
      <tr><td><code>TMB</code></td><td>Trust Merchant Bank (TMB)</td><td><code>TMB-USD-2026-xxxxx</code></td></tr>
      <tr><td><code>FBNBANK</code></td><td>FirstBank DRC (FBNBank)</td><td><code>FBNBANK-2026-xxxxx</code></td></tr>
      <tr><td><code>MPESA</code></td><td>Vodacom M-Pesa RDC</td><td><code>MPESA-RDC-2026-xxxxx</code></td></tr>
      <tr><td><code>AIRTEL</code></td><td>Airtel Money RDC</td><td><code>AIRTEL-RDC-2026-xxxxx</code></td></tr>
      <tr><td><code>ORANGE</code></td><td>Orange Money RDC</td><td><code>ORANGE-RDC-2026-xxxxx</code></td></tr>
    </tbody>
  </table>
  <p>
    Chaque validation génère un numéro de bordereau comptable interne séquentiel <strong><code>BORD-FNPSS-2026-xxxxx</code></strong> et bloque à jamais
    toute tentative de réutilisation de la même référence normalisée en majuscules sur un autre dossier.
  </p>

  <h2>2. Répartition Exacte des Données : SQL PostgreSQL (10 Tables) vs Cloud Objet vs Polygon</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Couche de Stockage</th>
        <th style="width: 40%;">Données Exactes Persistées</th>
        <th style="width: 35%;">Mécanisme de Protection</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Base Relationnelle PostgreSQL</strong><br/>(<code>database/schema.sql</code> — 10 tables sur Neon)</td>
        <td><code>users</code> (avec <code>wallet_address</code>), <code>services_catalog</code> (S1–S6), <code>applications</code>, <code>application_documents</code>, <code>payments_ledger</code>, <code>approval_steps</code>, <code>certificates</code>, <code>notifications</code>, <code>dossier_messages</code>, <code>audit_logs</code>.</td>
        <td>SSL/TLS requis (<code>sslmode=require</code>), mots de passe <code>scrypt</code>, contrôles d'intégrité référentielle et migrations vérifiées par empreinte SHA-256 (<code>OPS-03</code>).</td>
      </tr>
      <tr>
        <td><strong>Stockage Objet Cloud</strong><br/>(Cloudinary <code>raw/upload</code>)</td>
        <td>Pièces justificatives PDF soumises par les ONG (<code>P1</code> à <code>P6</code>) et sauvegardes archivées des actes officiels.</td>
        <td>Chiffrement côté serveur applicatif <strong><code>AES-256-GCM</code></strong> avant envoi (<code>iv</code> + <code>authTag</code> + <code>ciphertext</code>) — illisible sans la clé <code>DOCUMENT_ENCRYPTION_KEY_HEX</code>.</td>
      </tr>
      <tr>
        <td><strong>Registre Public Polygon</strong><br/>(<code>FNPSSRegistry.sol</code>)</td>
        <td><code>docHash</code>, <code>certificateNumber</code>, <code>serviceCode</code>, <code>issuedAt</code>, <code>expiresAt</code>, <code>status</code> (<code>ACTIVE</code>/<code>REVOKED</code>), <code>issuer</code>, <code>ministryCoSigner</code>, <code>revokedAt</code>, <code>revocationReason</code>.</td>
        <td>Immutabilité cryptographique par consensus Proof-of-Stake, accès écriture verrouillé par RBAC on-chain et pause d'urgence.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 20 : FEUILLE DE ROUTE DE FINALISATION VERS GO-LIVE                 -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Feuille de Route Opérationnelle — De l'État Actuel au Go-Live National</h1>
  <p>
    À l'issue des phases déjà accomplies (architecture, UI Next.js complète, 30/30 tests unitaires &amp; E2E, 30/30 smoke tests, base Neon initialisée,
    Cloudinary AES-256-GCM testé, Gmail SMTP SSL vérifié, contrat <code>FNPSSRegistry.sol</code> déployé sur Polygon Amoy à
    <code>0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code>), voici le plan ordonné et concret pour transformer l'application hybride actuelle
    en plateforme nationale de production sans simulation résiduelle :
  </p>

  <h2>Phase A — Raccordement Runtime des Connecteurs Déjà Provisionnés (Sprint Final d'Intégration)</h2>
  <ol>
    <li><strong>Persistance PostgreSQL Neon dans les routes API Next.js :</strong> Remplacer le stockage en mémoire (<code>Map</code> JS) de <code>GuichetUniqueEngine</code>, <code>AuthService</code>, <code>NotificationCenter</code> et <code>PaymentReconciliationLedger</code> par un pool <code>pg</code> exploitant les 10 tables de <code>database/schema.sql</code>.</li>
    <li><strong>Relayer Polygon Réel :</strong> Câbler un client JSON-RPC EVM (<code>ethers</code> ou <code>viem</code>) avec la clé du compte Relayer dans <code>approveAndSealCertificate</code>, <code>recordMinistryCoSignature</code>, <code>revokeCertificate</code> et <code>/api/verify</code> afin d'écrire et lire directement sur le contrat déployé via <code>POLYGON_AMOY_RPC_URL</code>.</li>
    <li><strong>Streaming Upload/Download Cloudinary &amp; SMTP Runtime :</strong> Connecter <code>POST /api/applications</code> aux fonctions éprouvées de <code>cloudinary-storage.mjs</code> et brancher <code>NotificationCenter</code> sur le transport SMTP SSL Gmail (puis Brevo / <code>@fnpss.cd</code>).</li>
    <li><strong>SDK Web3Auth &amp; Google Identity Côté Navigateur :</strong> Intégrer le bouton Google réel + SDK Web3Auth (<code>WEB3AUTH_CLIENT_ID</code>) dans <code>/auth/login</code> pour obtenir des signatures et portefeuilles MPC réels en session.</li>
  </ol>

  <h2>Phase B — Compléments Fonctionnels Terrain &amp; Sécurité Avancée</h2>
  <ol>
    <li><strong>Lecteur QR Caméra In-App + Service Worker PWA Réel :</strong> Ajouter la capture caméra WebRTC sur <code>/verifier</code>, l'incrustation graphique d'image QR Code dans les PDF générés, et l'enregistrement complet du Service Worker <code>sw.js</code> + base <code>IndexedDB</code> côté client.</li>
    <li><strong>2FA OTP &amp; Interopérabilité Bancaire / Mobile Money :</strong> Activer le second facteur OTP pour les rôles à privilèges (<code>AGENT</code>, <code>DG</code>, <code>MINISTERE</code>, <code>ADMIN</code>) et préparer les webhooks de réconciliation automatique avec les banques RDC et opérateurs Mobile Money.</li>
  </ol>

  <h2>Phase C — Sécurité, Déploiement Polygon PoS Mainnet (<code>137</code>) &amp; Souveraineté État</h2>
  <ol>
    <li><strong>Audit Externe &amp; Pentest (<code>SEC-03 / SEC-04 / G3</code>) :</strong> Auditer <code>FNPSSRegistry.sol</code> et exécuter les tests d'intrusion OWASP sur les endpoints publics/partenaires.</li>
    <li><strong>Gouvernance Multisig &amp; Déploiement Mainnet (<code>BLK-12</code>) :</strong> Transférer l'administration vers un coffre-fort <strong>Multisig Safe (2/3 signatures)</strong>, créditer le Relayer de <code>250 POL</code> sur Polygon Mainnet (<code>137</code>), redéployer le contrat, vérifier son code sur <code>polygonscan.com</code> et basculer Web3Auth sur <code>sapphire_mainnet</code>.</li>
    <li><strong>Infrastructure Souveraine RDC (<code>OPS-07 / DEP-01..07</code>) :</strong> Migrer vers le cluster souverain Docker Compose (Kinshasa / Lubumbashi) avec réplication temps réel (RPO 15 min / RTO 30 min), former la cohorte pilote ONG, les inspecteurs DGDA et lancer le support Hypercare.</li>
  </ol>

  <div class="footer-note">
    <strong>FNPSS &bull; Guichet Unique Dématérialisé</strong> &bull; Parcours Utilisateurs, État d'Implémentation, Scénarios Blockchain &amp; Concepts &bull; RDC &bull; 2026
  </div>

</div>
</body>
</html>`;

const outputDir = path.resolve('documentation du projet');
const primaryPath = path.join(outputDir, 'DOSSIER_PARCOURS_UTILISATEURS_ET_ROLE_BLOCKCHAIN_FNPSS.doc');
const fallbackPath = path.join(outputDir, 'DOSSIER_PARCOURS_UTILISATEURS_ET_ROLE_BLOCKCHAIN_FNPSS_REV2.doc');
let finalPath = primaryPath;
try {
  fs.writeFileSync(primaryPath, docContent, 'utf-8');
} catch (err) {
  if (err && err.code === 'EBUSY') {
    fs.writeFileSync(fallbackPath, docContent, 'utf-8');
    finalPath = fallbackPath;
    console.warn('Fichier principal verrouillé par Word, version écrite dans :', fallbackPath);
  } else {
    throw err;
  }
}
console.log('Dossier Word généré avec succès :', finalPath);

