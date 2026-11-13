import fs from 'node:fs';
import path from 'node:path';

/**
 * Générateur du Livre Blanc & Guide Architectural Complet sur le Montage Blockchain du FNPSS.
 * Produit un document Word (.doc) format A4 d'environ 20 pages couvrant :
 * - La théorie et le glossaire complet de la Blockchain & Cryptographie
 * - L'architecture technique complète (Off-Chain + On-Chain) et le Smart Contract FNPSSRegistry.sol
 * - Le récit exhaustif et chronologique du parcours de mise en production réalisé
 * - L'inventaire de toutes les plateformes utilisées et de toutes les alternatives écartées.
 */

const docContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>Architecture et Montage Blockchain - Guichet Unique Dématérialisé FNPSS (RDC)</title>
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
    font-size: 10.5pt;
    line-height: 1.48;
    color: #1f2937;
    background-color: #ffffff;
  }
  .page-break {
    page-break-before: always;
  }
  .cover-box {
    border: 2.5pt solid #0d3b66;
    background-color: #f8fafc;
    padding: 28pt 24pt;
    margin-top: 16pt;
    margin-bottom: 24pt;
    text-align: center;
  }
  .cover-tag {
    display: inline-block;
    background-color: #0d3b66;
    color: #ffffff;
    font-size: 9pt;
    font-weight: bold;
    padding: 4pt 12pt;
    letter-spacing: 1pt;
    text-transform: uppercase;
    margin-bottom: 14pt;
  }
  .cover-title {
    color: #0d3b66;
    font-size: 22pt;
    font-weight: bold;
    line-height: 1.25;
    margin-bottom: 10pt;
    text-transform: uppercase;
  }
  .cover-subtitle {
    color: #1e3a8a;
    font-size: 13pt;
    font-weight: normal;
    margin-bottom: 18pt;
  }
  .cover-meta {
    font-size: 9.5pt;
    color: #334155;
    border-top: 1pt solid #cbd5e1;
    padding-top: 12pt;
    margin-top: 14pt;
    text-align: left;
  }
  h1 {
    color: #0d3b66;
    font-size: 15.5pt;
    font-weight: bold;
    border-bottom: 2pt solid #0d3b66;
    padding-bottom: 4pt;
    margin-top: 18pt;
    margin-bottom: 10pt;
    page-break-after: avoid;
  }
  h2 {
    color: #1e3a8a;
    font-size: 12.5pt;
    font-weight: bold;
    margin-top: 14pt;
    margin-bottom: 6pt;
    border-bottom: 1pt solid #cbd5e1;
    padding-bottom: 2pt;
    page-break-after: avoid;
  }
  h3 {
    color: #1e40af;
    font-size: 11pt;
    font-weight: bold;
    margin-top: 10pt;
    margin-bottom: 4pt;
    page-break-after: avoid;
  }
  p {
    margin-top: 0;
    margin-bottom: 7pt;
    text-align: justify;
  }
  ul, ol {
    margin-top: 0;
    margin-bottom: 8pt;
    padding-left: 18pt;
  }
  li {
    margin-bottom: 3.5pt;
    text-align: justify;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 8pt;
    margin-bottom: 12pt;
    font-size: 9.2pt;
  }
  th {
    background-color: #0d3b66;
    color: #ffffff;
    font-weight: bold;
    text-align: left;
    padding: 6pt 7pt;
    border: 1pt solid #0d3b66;
  }
  td {
    padding: 5.5pt 7pt;
    border: 1pt solid #cbd5e1;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .callout-info {
    background-color: #eff6ff;
    border-left: 4pt solid #2563eb;
    padding: 8pt 11pt;
    margin: 10pt 0;
    font-size: 9.8pt;
  }
  .callout-warn {
    background-color: #fffbeb;
    border-left: 4pt solid #d97706;
    padding: 8pt 11pt;
    margin: 10pt 0;
    font-size: 9.8pt;
  }
  .callout-success {
    background-color: #ecfdf5;
    border-left: 4pt solid #059669;
    padding: 8pt 11pt;
    margin: 10pt 0;
    font-size: 9.8pt;
  }
  .code-block {
    background-color: #0f172a;
    color: #e2e8f0;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8.5pt;
    padding: 9pt 11pt;
    margin: 8pt 0;
    white-space: pre-wrap;
    border: 1pt solid #334155;
    line-height: 1.35;
  }
  .diagram-box {
    background-color: #f8fafc;
    color: #0f172a;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8.2pt;
    padding: 10pt;
    margin: 8pt 0;
    border: 1pt solid #94a3b8;
    white-space: pre;
    line-height: 1.3;
  }
  code {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 9.2pt;
    background-color: #f1f5f9;
    padding: 1pt 3pt;
    color: #0f172a;
  }
  .badge-adopted {
    background-color: #dcfce7;
    color: #166534;
    font-weight: bold;
    padding: 2pt 5pt;
    font-size: 8.2pt;
    border: 0.5pt solid #86efac;
  }
  .badge-rejected {
    background-color: #fee2e2;
    color: #991b1b;
    font-weight: bold;
    padding: 2pt 5pt;
    font-size: 8.2pt;
    border: 0.5pt solid #fca5a5;
  }
  .badge-alt {
    background-color: #fef3c7;
    color: #92400e;
    font-weight: bold;
    padding: 2pt 5pt;
    font-size: 8.2pt;
    border: 0.5pt solid #fcd34d;
  }
  .toc-table td {
    border: none;
    border-bottom: 0.5pt dotted #cbd5e1;
    padding: 4pt 2pt;
    background-color: transparent !important;
  }
  .footer-note {
    margin-top: 20pt;
    border-top: 1.5pt solid #0d3b66;
    padding-top: 8pt;
    font-size: 8.8pt;
    color: #475569;
    text-align: center;
  }
</style>
</head>
<body>
<div class="Section1">

  <!-- ======================================================================= -->
  <!-- PAGE 1 : PAGE DE GARDE & SOMMAIRE EXECUTIF                              -->
  <!-- ======================================================================= -->
  <div class="cover-box">
    <div class="cover-tag">Document d'Architecture Technique &amp; Guide de Référence Web3</div>
    <div class="cover-title">Montage, Architecture et Déploiement de l'Infrastructure Blockchain du Guichet Unique FNPSS</div>
    <div class="cover-subtitle">
      Manuel complet d'ingénierie cryptographique, recueil des concepts fondamentaux, journal détaillé de mise en œuvre,
      et analyse comparative des plateformes retenues et alternatives écartées
    </div>
    <div class="cover-meta">
      <table>
        <tr>
          <td style="width: 32%; background-color: #ffffff;"><strong>Institution Bénéficiaire</strong></td>
          <td style="background-color: #ffffff;">Fonds National de Promotion et de Service Social (FNPSS) — République Démocratique du Congo</td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9;"><strong>Plateforme Cible</strong></td>
          <td style="background-color: #f1f5f9;">Guichet Unique Dématérialisé des Actes Administratifs (Services S1 à S6)</td>
        </tr>
        <tr>
          <td style="background-color: #ffffff;"><strong>Réseau Blockchain Actif</strong></td>
          <td style="background-color: #ffffff;">Polygon Amoy Testnet (Chain ID : <code>80002</code> / <code>0x13882</code>) — Préparation Polygon PoS Mainnet (<code>137</code>)</td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9;"><strong>Smart Contract Déployé</strong></td>
          <td style="background-color: #f1f5f9;"><code>FNPSSRegistry.sol</code> à l'adresse <code>0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code></td>
        </tr>
        <tr>
          <td style="background-color: #ffffff;"><strong>Compte Admin &amp; Relayer</strong></td>
          <td style="background-color: #ffffff;"><code>0xE1F9C03Dd7CCb443F7aD583278e184433b331aC1</code></td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9;"><strong>Date de Rédaction &amp; Version</strong></td>
          <td style="background-color: #f1f5f9;">Novembre 2026 — Version 1.0 (Post-Déploiement &amp; Validation Production 60/60 tests)</td>
        </tr>
      </table>
    </div>
  </div>

  <h2>Synthèse Exécutive</h2>
  <p>
    Le présent document constitue le dossier architectural et opérationnel complet du montage de l'infrastructure Web3 et cloud du
    <strong>Guichet Unique Dématérialisé du FNPSS</strong> en République Démocratique du Congo. Face aux défis de falsification des attestations
    d'enrôlement (S1), conventions de partenariat (S2), attestations de biens à exonérer (S3), certificats d'exonération douanière (S4),
    certificats de philanthropie (S5) et arrêtés ministériels (S6), la plateforme combine une architecture hybride : stockage off-chain chiffré
    et ancrage cryptographique irréversible sur la blockchain Layer 2 <strong>Polygon</strong>.
  </p>
  <p>
    Au-delà de la théorie pure (fonctionnement interne des blockchains, cryptographie asymétrique, Machine Virtuelle Ethereum, gestion du gaz),
    ce document retrace intégralement le <strong>parcours réel effectué étape par étape</strong> : depuis l'initialisation de la base Neon PostgreSQL
    et du chiffrement Cloudinary AES-256-GCM, jusqu'au déploiement effectif du contrat intelligent <code>FNPSSRegistry.sol</code> sur Polygon Amoy,
    en passant par la résolution des incidents rencontrés (faucets Chainlink et Google Cloud, RPC Polygon défaillant, confusion réseau Ethereum vs Amoy,
    dépannage port 587/465 Gmail SMTP). Chaque choix technologique est systématiquement mis en perspective avec les <strong>alternatives citées mais non adoptées</strong>.
  </p>

  <h2>Table des Matières</h2>
  <table class="toc-table">
    <tr><td><strong>Chapitre 1</strong> — Fondamentaux Théoriques de la Technologie Blockchain</td><td style="text-align:right;">p. 2</td></tr>
    <tr><td><strong>Chapitre 2</strong> — L'Écosystème EVM, Couches Layer 1 / Layer 2 &amp; Choix de Polygon</td><td style="text-align:right;">p. 4</td></tr>
    <tr><td><strong>Chapitre 3</strong> — Glossaire Encyclopédique des Concepts Blockchain, Web3 &amp; Cryptographie</td><td style="text-align:right;">p. 6</td></tr>
    <tr><td><strong>Chapitre 4</strong> — Architecture Technique Complète du Montage Blockchain FNPSS</td><td style="text-align:right;">p. 8</td></tr>
    <tr><td><strong>Chapitre 5</strong> — Anatomie Détaillée du Smart Contract <code>FNPSSRegistry.sol</code></td><td style="text-align:right;">p. 10</td></tr>
    <tr><td><strong>Chapitre 6</strong> — Parcours Réel (Phase 1) : Base de Données Neon &amp; Stockage Chiffré Cloudinary</td><td style="text-align:right;">p. 12</td></tr>
    <tr><td><strong>Chapitre 7</strong> — Parcours Réel (Phase 2) : Authentification Hybride Google OAuth &amp; Web3Auth</td><td style="text-align:right;">p. 14</td></tr>
    <tr><td><strong>Chapitre 8</strong> — Parcours Réel (Phase 3) : Configuration MetaMask, Nœuds RPC &amp; ChainList</td><td style="text-align:right;">p. 16</td></tr>
    <tr><td><strong>Chapitre 9</strong> — Parcours Réel (Phase 4) : L'Odyssée des Faucets &amp; Obtention du Gaz POL</td><td style="text-align:right;">p. 17</td></tr>
    <tr><td><strong>Chapitre 10</strong> — Parcours Réel (Phase 5) : Compilation &amp; Déploiement sur Remix IDE</td><td style="text-align:right;">p. 18</td></tr>
    <tr><td><strong>Chapitre 11</strong> — Services Connexes : Notifications Gmail SMTP SSL, Vercel &amp; Alternatives</td><td style="text-align:right;">p. 19</td></tr>
    <tr><td><strong>Chapitre 12</strong> — Bilan des Tests, Audit de Sécurité &amp; Transition vers Polygon Mainnet</td><td style="text-align:right;">p. 20</td></tr>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 2-3 : CHAPITRE 1 - FONDAMENTAUX THEORIQUES DE LA BLOCKCHAIN        -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 1 : Fondamentaux Théoriques de la Technologie Blockchain</h1>

  <h2>1.1 Définition et Principe du Registre Distribué (DLT)</h2>
  <p>
    Une <strong>blockchain</strong> (ou chaîne de blocs) est une sous-catégorie des registres distribués (<em>Distributed Ledger Technology — DLT</em>).
    Il s'agit d'une base de données numérique partagée, répliquée et synchronisée simultanément à travers un réseau de milliers de serveurs
    indépendants appelés <strong>nœuds validateurs</strong>, sans aucune autorité centrale de contrôle ni administrateur unique capable de modifier
    silencieusement l'historique.
  </p>
  <p>
    Contrairement à une base de données relationnelle classique (PostgreSQL, MySQL, Oracle) qui autorise les quatre opérations <strong>CRUD</strong>
    (<em>Create, Read, Update, Delete</em>), une blockchain publique est strictement <strong><em>Append-Only</em></strong> (ajout uniquement).
    Une information inscrite et validée dans un bloc ne peut jamais être ni modifiée ni effacée rétroactivement. Toute correction ultérieure (comme
    la révocation d'un certificat d'exonération frauduleux) doit obligatoirement faire l'objet d'une nouvelle transaction datée qui s'ajoute à la suite
    de la chaîne, conservant ainsi une piste d'audit historique infalsifiable.
  </p>

  <h2>1.2 Structure Interne des Blocs et Chaînage Cryptographique</h2>
  <p>
    Les transactions soumises par les utilisateurs sont regroupées par paquets chronologiques appelés <strong>blocs</strong>. Chaque bloc contient :
  </p>
  <ul>
    <li><strong>L'en-tête du bloc (Block Header) :</strong> numéro de hauteur (<em>Block Number</em>), horodatage Unix exact (<em>Timestamp</em>), identifiant du validateur, racine de l'arbre de Merkle des transactions (<em>Transactions Root</em>) et racine d'état global (<em>State Root</em>).</li>
    <li><strong>Le hachage du bloc précédent (Parent Hash) :</strong> l'empreinte cryptographique unique du bloc <code>N - 1</code>. Ce pointeur relie mathématiquement chaque bloc à son prédécesseur jusqu'au tout premier bloc (<em>Genesis Block</em>).</li>
    <li><strong>Le corps du bloc (Payload) :</strong> la liste ordonnée des transactions validées et leurs reçus d'exécution (<em>Transaction Receipts</em> et journaux d'événements <em>Logs</em>).</li>
  </ul>
  <p>
    Si un attaquant tentait d'altérer ne serait-ce qu'un seul bit d'une transaction passée dans le bloc 1000, l'empreinte du bloc 1000 changerait
    instantanément, rendant invalide le pointeur <code>ParentHash</code> stocké dans le bloc 1001, puis dans le bloc 1002, et ainsi de suite
    jusqu'au bloc courant. Ce mécanisme garantit une <strong>immuabilité mathématique</strong>.
  </p>

  <h2>1.3 Les Fonctions de Hachage Cryptographique (SHA-256 et Keccak-256)</h2>
  <p>
    Une fonction de hachage cryptographique transforme un fichier ou un texte de taille arbitraire (1 octet ou 10 Go) en une chaîne de longueur fixe
    appelée <strong>condensat</strong>, <strong>empreinte</strong> ou <strong>hash</strong>. Le Guichet Unique FNPSS utilise deux algorithmes standards :
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Algorithme</th>
        <th style="width: 22%;">Taille de Sortie</th>
        <th style="width: 30%;">Utilisation dans le Projet FNPSS</th>
        <th style="width: 30%;">Propriétés Cryptographiques</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>SHA-256</strong><br/>(FIPS 180-4)</td>
        <td>256 bits<br/>(32 octets / 64 hex + <code>0x</code> = <code>bytes32</code>)</td>
        <td>Calcul de l'empreinte canonique des actes PDF officiels (<code>src/crypto/document-sealer.mjs</code>) et ancrage dans <code>FNPSSRegistry.sol</code>.</td>
        <td>Déterministe, unidirectionnel (irréversible), résistant aux collisions et à l'effet d'avalanche.</td>
      </tr>
      <tr>
        <td><strong>Keccak-256</strong><br/>(Famille SHA-3)</td>
        <td>256 bits<br/>(32 octets)</td>
        <td>Utilisé nativement par l'EVM pour dériver les adresses Ethereum/Polygon, calculer les sélecteurs de fonctions (4 octets) et indexer <code>_numberToHash</code>.</td>
        <td>Standard officiel de l'écosystème Ethereum/Solidity (<code>keccak256(bytes(...))</code>).</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-info">
    <strong>Effet d'avalanche appliqué au contrôle douanier (DGDA) :</strong><br/>
    Si un fraudeur modifie ne serait-ce qu'une seule virgule, une date ou un chiffre dans un certificat PDF d'exonération délivré par le FNPSS,
    son empreinte <code>SHA-256</code> change à plus de 50 % de ses bits. Lors du contrôle à la frontière, l'empreinte recalculée ne correspond plus
    à celle ancrée dans <code>FNPSSRegistry.sol</code>, déclenchant instantanément l'alerte rouge de falsification.
  </div>

  <div class="page-break"></div>
  <h2>1.4 Cryptographie Asymétrique, Signature ECDSA et Adresses EVM</h2>
  <p>
    L'identité sur une blockchain repose non pas sur un couple « identifiant / mot de passe », mais sur une paire de clés mathématiques générée
    sur la courbe elliptique <strong>secp256k1</strong> via l'algorithme <strong>ECDSA</strong> (<em>Elliptic Curve Digital Signature Algorithm</em>) :
  </p>
  <ol>
    <li><strong>La Clé Privée (Private Key) :</strong> un nombre aléatoire secret de 256 bits (64 caractères hexadécimaux). Quiconque détient cette clé possède l'autorité absolue de signer des transactions au nom du compte. <em>Elle ne doit jamais transiter sur Internet ni figurer dans le code source Git.</em></li>
    <li><strong>La Clé Publique (Public Key) :</strong> calculée mathématiquement de manière unidirectionnelle à partir de la clé privée par multiplication scalaire sur la courbe elliptique. Il est impossible de retrouver la clé privée à partir de la clé publique.</li>
    <li><strong>L'Adresse EVM (<code>0x...</code>) :</strong> dérivée en prenant les <strong>20 derniers octets</strong> (40 caractères hexadécimaux) du hachage <code>Keccak-256</code> de la clé publique, préfixés par <code>0x</code> (ex. votre adresse déployée : <code>0xE1F9C03Dd7CCb443F7aD583278e184433b331aC1</code>). Le mélange majuscules/minuscules suit la norme de somme de contrôle <strong>EIP-55</strong> pour prévenir les fautes de frappe.</li>
  </ol>

  <h2>1.5 Mécanismes de Consensus : PoW vs PoS vs PoA</h2>
  <p>
    Comment des milliers d'ordinateurs répartis sur la planète s'accordent-ils sur l'état exact du registre sans chef d'orchestre ? C'est le rôle
    du <strong>protocole de consensus</strong> :
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Mécanisme</th>
        <th style="width: 34%;">Principe de Fonctionnement</th>
        <th style="width: 22%;">Consommation &amp; Vitesse</th>
        <th style="width: 22%;">Adéquation FNPSS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Proof of Work (PoW)</strong><br/><em>Ex : Bitcoin, Ethereum pré-2022</em></td>
        <td>Des mineurs résolvent des énigmes mathématiques énergivores par force brute pour gagner le droit de sceller le bloc suivant.</td>
        <td>Très énergivore ; lent (Bitcoin : ~10 min/bloc ; ~7 TPS).</td>
        <td><span class="badge-rejected">Non retenu</span><br/>Coût élevé, latence incompatible avec un guichet temps réel.</td>
      </tr>
      <tr>
        <td><strong>Proof of Stake (PoS)</strong><br/><em>Ex : Ethereum, Polygon PoS</em></td>
        <td>Des validateurs immobilisent (« stakent ») du capital en jetons natifs (ETH, POL) comme caution de bonne conduite. Tout comportement malveillant entraîne la perte de la caution (<em>Slashing</em>).</td>
        <td>99,95 % plus sobre ; très rapide (Polygon : ~2,1 secondes/bloc).</td>
        <td><span class="badge-adopted">Retenu (Polygon)</span><br/>Finalité quasi instantanée, frais infimes, sécurité économique massive.</td>
      </tr>
      <tr>
        <td><strong>Proof of Authority (PoA)</strong><br/><em>Ex : Chaînes privées / Consortiums</em></td>
        <td>Seul un petit cercle d'entités identifiées et cooptées a le droit de valider les blocs.</td>
        <td>Très rapide, mais faible décentralisation.</td>
        <td><span class="badge-rejected">Non retenu</span><br/>Moins crédible qu'une blockchain publique auditable par les partenaires internationaux.</td>
      </tr>
    </tbody>
  </table>

  <h2>1.6 Anatomie d'une Transaction EVM (EIP-1559) et Économie du Gaz</h2>
  <p>
    Dans toute blockchain compatible Ethereum (dont Polygon Amoy et Polygon Mainnet), chaque opération modifiant l'état du registre est payée en
    <strong>Gaz</strong> (unité mesurant l'effort de calcul CPU et de stockage disque consommé par les nœuds validateurs). Depuis la mise à jour
    <strong>EIP-1559</strong>, le prix du gaz se décompose en deux éléments :
  </p>
  <ul>
    <li><strong>Base Fee (Frais de base) :</strong> tarif dynamique déterminé automatiquement par le protocole selon la congestion du bloc précédent (exprimé en <strong>Gwei</strong>, soit 10<sup>-9</sup> POL/ETH). Cette part est détruite (<em>burned</em>).</li>
    <li><strong>Priority Fee (Pourboire / Tip) :</strong> incitation facultative versée au validateur pour prioriser l'inclusion de la transaction.</li>
    <li><strong>MaxFeePerGas :</strong> plafond maximal que l'émetteur accepte de payer par unité de gaz. Si le <em>MaxFeePerGas</em> soumis est inférieur à la <em>Base Fee</em> minimale du réseau (ex. <code>0.73 Gwei</code> soumis sur Ethereum alors que Polygon Amoy exige ~<code>30 Gwei</code>), la transaction est rejetée.</li>
  </ul>
  <div class="code-block">Coût total maximum de transaction = gasLimit × maxFeePerGas + value
Exemple réel du déploiement de FNPSSRegistry.sol sur Polygon Amoy :
• Gaz consommé au déploiement : ~1 450 000 unités de gaz
• Prix moyen sur Amoy : ~36,3 Gwei (0,0000000363 POL par unité de gaz)
• Coût réel payé sur vos 1 POL : ~0,052 à 0,078 POL (solde restant observé sur Remix : 0,922 POL !)</div>

  <!-- ======================================================================= -->
  <!-- PAGE 4-5 : CHAPITRE 2 - ECOSYSTEME EVM, L1 vs L2 & CHOIX POLYGON        -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 2 : Écosystème EVM, Couches Layer 1 / Layer 2 et Choix de Polygon</h1>

  <h2>2.1 Qu'est-ce que la Machine Virtuelle Ethereum (EVM) ?</h2>
  <p>
    L'<strong>EVM (Ethereum Virtual Machine)</strong> est un ordinateur mondial décentralisé et déterministe. Chaque nœud du réseau exécute
    exactement les mêmes instructions bas niveau (<em>Opcodes</em>) sur le même état initial pour aboutir rigoureusement au même résultat.
    L'EVM est isolée dans un bac à sable (<em>sandbox</em>) : un Smart Contract ne peut ni accéder au système de fichiers local, ni effectuer
    de requête HTTP sortante, ni générer d'aléa non déterministe.
  </p>
  <p>
    L'immense avantage de choisir une architecture <strong>EVM-compatible</strong> réside dans la <strong>portabilité absolue</strong> : le code
    Solidity écrit pour le FNPSS (<code>contracts/FNPSSRegistry.sol</code>) fonctionne à l'identique sur Ethereum, Polygon PoS, Polygon Amoy,
    Celo, Arbitrum, Optimism, Base ou Avalanche C-Chain. Le FNPSS n'est donc jamais prisonnier d'un fournisseur blockchain unique (<em>Zero Vendor Lock-in</em>).
  </p>

  <h2>2.2 Comparatif Layer 1 (L1) vs Layer 2 (L2)</h2>
  <p>
    Le <strong>Trilemme de la Blockchain</strong> stipule qu'il est difficile d'optimiser simultanément la sécurité, la décentralisation et la scalabilité.
    Pour résoudre la congestion et les frais prohibitifs d'Ethereum Layer 1 (où un simple déploiement ou ancrage peut coûter entre 5 et 50 USD),
    l'industrie a développé les réseaux <strong>Layer 2 (L2)</strong> et sidechains :
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Critère Technique</th>
        <th style="width: 25%;">Ethereum Layer 1 (L1)</th>
        <th style="width: 26%;">Polygon PoS (L2 Retenue)</th>
        <th style="width: 25%;">Celo (L2 Alternative ADR-003)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Chain ID (Mainnet / Testnet)</strong></td>
        <td><code>1</code> / Sepolia (<code>11155111</code>)</td>
        <td><strong><code>137</code> (<code>0x89</code>)</strong> / Amoy <strong><code>80002</code> (<code>0x13882</code>)</strong></td>
        <td><code>42220</code> / Alfajores (<code>44787</code>)</td>
      </tr>
      <tr>
        <td><strong>Temps de bloc (Finalité)</strong></td>
        <td>~12 secondes (finalité ~15 min)</td>
        <td><strong>~2,1 secondes</strong></td>
        <td>~5 secondes (migration OP Stack)</td>
      </tr>
      <tr>
        <td><strong>Coût déploiement Smart Contract</strong></td>
        <td><strong>13 $US à 60 $US+</strong> (vu en direct sur MetaMask : 13,67 $US)</td>
        <td><strong>&lt; 0,05 USD</strong> (0,078 POL test)</td>
        <td>&lt; 0,05 USD</td>
      </tr>
      <tr>
        <td><strong>Coût d'un ancrage (<code>registerDocument</code>)</strong></td>
        <td>2,00 USD à 15,00 USD par acte</td>
        <td><strong>&lt; 0,005 USD</strong> (&gt; 150 000 actes pour 1 000 USD)</td>
        <td>&lt; 0,005 USD</td>
      </tr>
      <tr>
        <td><strong>Coût vérification Douane (DGDA)</strong></td>
        <td>0,00 USD (<code>eth_call</code>)</td>
        <td><strong>0,00 USD</strong> (<code>eth_call</code> lecture seule)</td>
        <td>0,00 USD (<code>eth_call</code>)</td>
      </tr>
      <tr>
        <td><strong>Écosystème Paymaster / Web3Auth</strong></td>
        <td>Très mature mais trop coûteux</td>
        <td><strong>Support natif de premier rang</strong></td>
        <td>Support plus restreint</td>
      </tr>
      <tr>
        <td><strong>Verdict Architectural FNPSS</strong></td>
        <td><span class="badge-rejected">Écarté</span> (Trop coûteux et lent)</td>
        <td><span class="badge-adopted">Adopté (ADR-003 / BLK-01)</span></td>
        <td><span class="badge-alt">Alternative de repli viable</span></td>
      </tr>
    </tbody>
  </table>

  <h2>2.3 Autres Blockchains &amp; Technologies Citées mais Non Adoptées</h2>
  <p>
    Dans le cadre du cadrage architectural (ADR-003 et Note Technique V3), plusieurs autres solutions technologiques existent sur le marché mais
    ont été écartées au profit de Polygon :
  </p>
  <ul>
    <li><strong>Hyperledger Fabric / Corda (Blockchains Privées de Consortium) :</strong> Bien que prisées par certaines banques, elles exigent de déployer et maintenir sa propre infrastructure de nœuds (coût serveur élevé dépassant le budget de 11 000 USD) et n'offrent pas de preuve publique opposable vérifiable sans accès au VPN du consortium par des partenaires externes (ONG internationales, bailleurs, DGDA).</li>
    <li><strong>Solana / Bitcoin / Cardano (Non-EVM) :</strong> Écartés dès le départ car incompatibles avec l'écosystème Solidity/EVM, les outils MetaMask standards et les librairies EVM de Web3Auth choisies dans les spécifications.</li>
    <li><strong>Arbitrum One / Optimism / Base (Rollups Optimistes L2) :</strong> Excellents réseaux L2, mais Polygon PoS dispose d'une adoption institutionnelle plus ancienne dans les projets gouvernementaux africains et d'un coût de transfert/ancrage ultra-prévisible.</li>
    <li><strong>Ethereum Hoodi &amp; Sepolia (Testnets Ethereum L1 vus sur Google Cloud Faucet) :</strong> Réseaux de test réservés au Layer 1 Ethereum, inadaptés pour tester les spécificités RPC et les tarifs de gaz de Polygon.</li>
  </ul>

  <div class="page-break"></div>
  <h2>2.4 La Transition Historique : De Polygon Mumbai (Déprécié) à Polygon Amoy</h2>
  <p>
    La <em>Note Technique Blockchain V3</em> initiale du projet FNPSS mentionnait le réseau de test historique <strong>Polygon Mumbai (Chain ID : <code>80001</code>)</strong>.
    Or, l'équipe d'ingénierie de Polygon Labs a officiellement <strong>déprécié et arrêté Polygon Mumbai en avril 2024</strong> car ce dernier était adossé
    au testnet Goerli d'Ethereum, lui-même mis hors service.
  </p>
  <p>
    Conformément à la décision <strong>ADR-003</strong> et au garde-fou logiciel codé directement dans <code>src/blockchain/polygon-deployer.mjs</code>
    (ligne 44 : rejet explicite de toute tentative de configuration sur <code>mumbai</code> ou <code>80001</code>), le projet FNPSS a basculé exclusivement
    sur le successeur officiel : <strong>Polygon Amoy Testnet (Chain ID : <code>80002</code>)</strong>, adossé au testnet Ethereum Sepolia.
  </p>

  <div class="callout-warn">
    <strong>Environnement Testnet vs Mainnet :</strong><br/>
    <strong>Polygon Amoy (<code>80002</code>)</strong> utilise des jetons <strong>POL sans valeur monétaire réelle</strong> obtenus gratuitement via des faucets.
    Il reproduit à l'identique le comportement de <strong>Polygon PoS Mainnet (<code>137</code>)</strong> afin de valider le code, l'intégration API et les tests
    pilotes avant d'engager de vrais fonds lors de la bascule en production finale (<code>BLK-12</code>).
  </div>

  <h2>2.5 Rôle des Nœuds RPC (Remote Procedure Call)</h2>
  <p>
    Une application web Next.js ou un navigateur comme Chrome ne stocke pas les centaines de gigaoctets de la blockchain Polygon sur son disque dur.
    Pour interagir avec la chaîne, l'application communique en JSON-RPC (via HTTPS) avec un serveur spécialisé appelé <strong>Nœud RPC</strong> :
  </p>
  <ul>
    <li><strong>Appels en lecture seule (<code>eth_call</code>, <code>eth_getBalance</code>, <code>eth_getCode</code>) :</strong> Le nœud RPC consulte son état local et répond en quelques millisecondes <strong>sans transaction blockchain et sans payer de gaz (0,00 USD)</strong>. C'est ainsi que le douanier DGDA vérifie l'authenticité d'un certificat.</li>
    <li><strong>Appels en écriture (<code>eth_sendRawTransaction</code>) :</strong> Le nœud RPC diffuse une transaction signée cryptographiquement (par MetaMask ou le Relayer serveur FNPSS) vers le mempool des validateurs pour inclusion dans le prochain bloc.</li>
  </ul>

  <!-- ======================================================================= -->
  <!-- PAGE 6-7 : CHAPITRE 3 - GLOSSAIRE ENCYCLOPEDIQUE DES CONCEPTS           -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 3 : Glossaire Encyclopédique des Concepts Blockchain et Web3</h1>

  <p>
    Ce chapitre définit de manière rigoureuse l'ensemble des concepts techniques rencontrés tout au long de l'architecture et du déploiement du
    système FNPSS, afin de servir de référence commune aux équipes techniques, auditeurs de sécurité et décideurs institutionnels.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Concept / Terme</th>
        <th style="width: 76%;">Définition Technique Détaillée et Rôle dans le Projet FNPSS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Smart Contract</strong><br/><em>(Contrat Intelligent)</em></td>
        <td>Programme informatique autonome stocké de manière permanente à une adresse fixe sur la blockchain. Son code s'exécute de façon déterministe et inviolable dès qu'une transaction l'invoque. Dans notre projet, <code>FNPSSRegistry.sol</code> joue le rôle de registre notarial infalsifiable.</td>
      </tr>
      <tr>
        <td><strong>Solidity</strong></td>
        <td>Langage de programmation orienté objet à typage statique conçu pour rédiger des Smart Contracts sur l'EVM. Le contrat FNPSS utilise le pragma <code>^0.8.24</code> (compilé avec succès en <code>0.8.34</code> sur Remix IDE), intégrant la protection native contre les débordements d'entiers (Overflow/Underflow).</td>
      </tr>
      <tr>
        <td><strong>Bytecode EVM &amp; Opcodes</strong></td>
        <td>Résultat binaire de la compilation du code source Solidity (suite d'instructions hexadécimales exécutables par l'EVM, ex. <code>0x60806040...</code>). À noter : les versions récentes (Solidity &ge; 0.8.20) utilisent l'opcode <code>5f</code> (<code>PUSH0</code>) issu du hard-fork Shanghai, pleinement supporté par Polygon Amoy. Le bytecode déployé du FNPSS pèse exactement <strong>23 508 octets</strong> en hexadécimal.</td>
      </tr>
      <tr>
        <td><strong>ABI</strong><br/><em>(Application Binary Interface)</em></td>
        <td>Contrat d'interface au format JSON généré lors de la compilation. Il décrit toutes les fonctions du Smart Contract (noms, types de paramètres, valeurs de retour) et permet à l'application Next.js d'encoder les appels vers l'adresse <code>0x1474...b705</code>.</td>
      </tr>
      <tr>
        <td><strong>Wallet</strong><br/><em>(Portefeuille)</em></td>
        <td>Logiciel ou module gérant les paires de clés cryptographiques (clé privée / adresse publique) et signant les transactions. On distingue les portefeuilles <em>Custodial</em> (un tiers garde la clé) et <em>Non-Custodial</em> (seul l'utilisateur ou le système MPC la contrôle, comme MetaMask et Web3Auth).</td>
      </tr>
      <tr>
        <td><strong>EOA vs Smart Wallet</strong></td>
        <td>Un <strong>EOA</strong> (<em>Externally Owned Account</em>) est un compte contrôlé par une clé privée humaine (ex. votre compte MetaMask <code>0xE1F9...aC1</code>). Un <strong>Contract Account</strong> est gouverné par du code. L'<em>Account Abstraction</em> (ERC-4337) unifie les deux pour permettre par exemple des signatures multiples ou la récupération sociale.</td>
      </tr>
      <tr>
        <td><strong>MPC</strong><br/><em>(Multi-Party Computation)</em></td>
        <td>Technologie cryptographique utilisée par <strong>Web3Auth</strong> : la clé privée n'existe jamais en un seul morceau. Elle est mathématiquement fragmentée entre plusieurs serveurs sécurisés et le navigateur/appareil de l'utilisateur (OAuth Google), permettant aux ONG de bénéficier d'une adresse blockchain sans jamais manipuler de phrase secrète (Seed Phrase).</td>
      </tr>
      <tr>
        <td><strong>Seed Phrase</strong><br/><em>(Phrase Mnémonique BIP-39)</em></td>
        <td>Suite de 12 ou 24 mots anglais permettant de régénérer toutes les clés privées d'un portefeuille MetaMask. Sa perte entraîne la perte irréversible d'accès au portefeuille administrateur (d'où la nécessité de sauvegarder les accès MetaMask hors-ligne en lieu sûr).</td>
      </tr>
      <tr>
        <td><strong>Relayer &amp; Paymaster</strong><br/><em>(Méta-transactions)</em></td>
        <td>Serveur intermédiaire institutionnel (propriété du FNPSS) qui détient la provision de gaz (<code>POL</code>) et soumet les transactions d'ancrage on-chain pour le compte du Guichet Unique. Grâce au Relayer (<code>BLK-09</code>), aucune ONG requérante n'a besoin d'acheter ni de posséder de cryptomonnaie.</td>
      </tr>
      <tr>
        <td><strong>Faucet</strong><br/><em>(Robinet de Test)</em></td>
        <td>Service web gratuit distribuant de petites quantités de jetons de test (ici <code>POL</code> sur Amoy) aux développeurs pour payer le gaz lors des phases de test. Les jetons d'un faucet n'ont aucune valeur financière marchande.</td>
      </tr>
      <tr>
        <td><strong>Explorateur de Blocs</strong><br/><em>(PolygonScan)</em></td>
        <td>Moteur de recherche web public permettant d'inspecter en toute transparence chaque bloc, transaction, solde de compte, événement émis et code de Smart Contract (ex. <code>https://amoy.polygonscan.com</code> pour Amoy et <code>https://polygonscan.com</code> pour Mainnet).</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Concept / Terme</th>
        <th style="width: 76%;">Définition Technique Détaillée et Rôle dans le Projet FNPSS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>On-Chain vs Off-Chain</strong></td>
        <td><strong>On-Chain :</strong> données stockées directement sur la blockchain publique (empreinte <code>SHA-256</code>, numéro d'acte, dates, statut, émetteur). <strong>Off-Chain :</strong> données conservées dans l'infrastructure cloud privée (PostgreSQL Neon + fichiers chiffrés Cloudinary). Cette séparation garantit la confidentialité absolue des dossiers ONG.</td>
      </tr>
      <tr>
        <td><strong>Privacy by Design</strong><br/><em>(Zéro PII On-Chain)</em></td>
        <td>Principe architectural fondamental (<code>BLK-09</code>, Code du Numérique RDC) interdisant formellement d'inscrire des données personnelles (PII : noms, e-mails, téléphones, PDF bruts) sur un registre public immuable. Seul le condensat mathématique irréversible <code>SHA-256</code> est publié.</td>
      </tr>
      <tr>
        <td><strong>Chiffrement AES-256-GCM</strong></td>
        <td>Algorithme de chiffrement symétrique authentifié (<em>Advanced Encryption Standard — Galois/Counter Mode</em>) à clé de 256 bits utilisé par le FNPSS pour protéger les documents stockés dans Cloudinary (<code>OPS-05</code>). Chaque fichier chiffré comporte un vecteur d'initialisation aléatoire unique (<code>IV</code> de 96 bits) et une étiquette d'intégrité (<code>AuthTag</code> de 128 bits) empêchant toute lecture ou altération côté fournisseur cloud.</td>
      </tr>
      <tr>
        <td><strong><code>bytes32</code></strong></td>
        <td>Type de donnée fixe en Solidity occupant exactement 32 octets (256 bits), idéal pour stocker un hash <code>SHA-256</code> de manière extrêmement économique en gaz comparé à une chaîne de caractères (<code>string</code>).</td>
      </tr>
      <tr>
        <td><strong><code>eth_estimateGas</code></strong></td>
        <td>Requête JSON-RPC exécutée en simulation par un outil comme Remix IDE avant l'envoi réel d'une transaction pour estimer combien d'unités de gaz seront nécessaires et vérifier si la transaction ne risque pas d'échouer (<em>revert</em>) ou de manquer de fonds.</td>
      </tr>
      <tr>
        <td><strong><code>Injected Provider</code></strong></td>
        <td>Objet JavaScript standard (norme <strong>EIP-1193</strong> / <code>window.ethereum</code>) injecté dans le navigateur par l'extension MetaMask, permettant à une application web (comme Remix IDE ou notre Guichet Unique) de demander à l'utilisateur de signer des transactions sans jamais exposer sa clé privée au site web.</td>
      </tr>
      <tr>
        <td><strong><code>Wei</code> &amp; <code>Gwei</code></strong></td>
        <td>Subdivisions du jeton natif POL/ETH (18 décimales). <code>1 POL = 10<sup>18</sup> Wei</code> (soit <code>0xde0b6b3a7640000</code> en hexadécimal). <code>1 Gwei = 10<sup>9</sup> Wei</code>, unité standard pour exprimer les prix du gaz.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 8-9 : CHAPITRE 4 - ARCHITECTURE TECHNIQUE GLOBALE FNPSS            -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 4 : Architecture Technique Complète du Montage Blockchain FNPSS</h1>

  <h2>4.1 Architecture Globale Hybride en 4 Couches</h2>
  <p>
    Pour répondre aux contraintes opérationnelles de la République Démocratique du Congo (connectivité 3G intermittente en province, budget maîtrisé,
    accessibilité WCAG AA pour les acteurs humanitaires non-techniciens et valeur probante juridique devant les juridictions et la DGDA),
    l'architecture est structurée en <strong>quatre couches découplées et résilientes</strong> :
  </p>

  <div class="diagram-box">+---------------------------------------------------------------------------------------+
| COUCHE 1 : PRÉSENTATION &amp; ACCÈS CLIENT (Next.js 14 App Router + PWA Hors-Ligne 3G)   |
|  • Portail Requérant (ONG) : Assistant S1-S6, Once-Only P2, File hors-ligne REQ-11    |
|  • Back-Office FNPSS &amp; Tutelle : Instruction, Validation 5 niveaux, Révocation DG     |
|  • Portail Douanier DGDA/DGRAD/DGI (/verifier) : Scan QR Code &amp; Upload PDF sans QR    |
+-------------------------------------------+-------------------------------------------+
                                            | HTTPS / TLS 1.3 + JWT + Google OAuth / Web3Auth
                                            v
+---------------------------------------------------------------------------------------+
| COUCHE 2 : ORCHESTRATION MÉTIER, CRYPTOGRAPHIE &amp; RELAYER (Node.js / API Routes)       |
|  • Scellement PDF 1.4 &amp; Calcul SHA-256 déterministe (src/crypto/document-sealer.mjs)  |
|  • Garde-fou anti-malware PDF (Magic bytes %PDF-, &lt;10 Mo, blocage /JS, /Launch)       |
|  • Relayer FNPSS &amp; File d'Ancrage Résiliente (BLK-09 / BLK-10) avec Retry exponentiel |
+-------------------------------+-----------------------------------+-------------------+
                                |                                   |
        +-----------------------v-----------+           +-----------v-------------------+
        | COUCHE 3 : STOCKAGE OFF-CHAIN     |           | COUCHE 4 : BLOCKCHAIN LAYER 2 |
        | • PostgreSQL 16/18 (Neon Cloud)   |           | • Réseau : Polygon Amoy/PoS   |
        |   10 tables relationnelles + Logs |           | • Contrat : FNPSSRegistry.sol |
        | • Cloudinary Stockage Objet       |           |   Adresse : 0x1474...ab705    |
        |   Chiffré AES-256-GCM (IV+Tag)    |           | • Lecture 0 gaz (eth_call)    |
        +-----------------------------------+           +-------------------------------+</div>

  <h2>4.2 Le Flux Cryptographique de Bout en Bout (De l'Émission au Contrôle Douanier)</h2>
  <p>
    Lorsqu'un dossier (S1 à S6) franchit avec succès les étapes d'instruction et de paiement (20 USD dépôt + 300 USD enquête) puis est approuvé par
    la Direction Générale du FNPSS (et co-signé par le Ministère pour S2/S6), la chaîne de scellement s'exécute automatiquement :
  </p>
  <ol>
    <li><strong>Génération du PDF Officiel Scellé :</strong> Le moteur <code>src/pdf/certificate-generator.mjs</code> génère le titre officiel au format PDF intégrant les mentions légales RDC, le numéro unique d'acte (ex. <code>FNPSS-EXO-2026-00124</code>) et un QR Code pointant vers l'URL de vérification.</li>
    <li><strong>Calcul de l'Empreinte SHA-256 :</strong> Le module <code>document-sealer.mjs</code> calcule de manière déterministe le condensat <code>SHA-256</code> sur 32 octets (<code>bytes32</code>) de l'acte.</li>
    <li><strong>Chiffrement et Archivage Off-Chain :</strong> Le document binaire et les pièces justificatives P1–P6 sont chiffrés localement en <code>AES-256-GCM</code> avant d'être expédiés vers Cloudinary (<code>guichetuniquefnpss/pdfs</code>), tandis que les métadonnées sont inscrites dans Neon PostgreSQL.</li>
    <li><strong>Ancrage On-Chain via le Relayer (<code>BLK-09</code> / <code>BLK-10</code>) :</strong> Le Relayer FNPSS envoie la transaction <code>registerDocument(docHash, certificateNumber, serviceCode, expiresAt)</code> sur <code>FNPSSRegistry.sol</code>. En cas de coupure RPC temporaire, la file résiliente met l'ancrage en file d'attente (<code>RETRY_QUEUED</code>) et le réexécute automatiquement dès le retour réseau.</li>
    <li><strong>Vérification Douanière Instantanée (DGDA / DGRAD / DGI) :</strong> Aux postes frontaliers (Matadi, Kasumbalesa, Goma, Ndjili), l'inspecteur scanne le QR Code, saisit le numéro d'acte ou glisse-dépose directement le fichier PDF reçu par l'ONG (vérification sans scan <code>VER-04</code>). Le système recalcule le <code>SHA-256</code> et interroge le Smart Contract par <code>verifyDocument(docHash)</code> (coût : 0 USD) :
      <ul>
        <li><strong>Pastille Verte (Valide) :</strong> Hash existant, statut <code>ACTIVE</code> et non expiré.</li>
        <li><strong>Pastille Grise (Expiré) :</strong> Statut <code>ACTIVE</code> mais <code>block.timestamp &gt; expiresAt</code>.</li>
        <li><strong>Pastille Rouge (Falsifié ou Révoqué) :</strong> Hash inconnu (<code>NONE</code>) ou révoqué administrativement (<code>REVOKED</code>) avec affichage du motif officiel.</li>
      </ul>
    </li>
  </ol>

  <div class="page-break"></div>
  <h2>4.3 Conformité Juridique et Souveraineté en République Démocratique du Congo</h2>
  <p>
    La conception technique du montage blockchain est alignée sur le cadre normatif congolais (documenté dans <code>CONFORMITE_JURIDIQUE_ET_VALEUR_PROBANTE_RDC.md</code>) :
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 35%;">Texte Légal (RDC)</th>
        <th style="width: 65%;">Traduction Technique dans le Montage Blockchain FNPSS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Ordonnance-Loi n° 23/010 du 13 mars 2023 (Code du Numérique)</strong></td>
        <td>Confère valeur probante à l'écrit électronique sous réserve d'identification de l'émetteur (rôles RBAC <code>admin</code> / <code>registrar</code> / <code>ministrySigner</code> on-chain), d'intégrité (condensat <code>SHA-256</code>) et d'horodatage fiable (<code>issuedAt = block.timestamp</code> immuable).</td>
      </tr>
      <tr>
        <td><strong>Protection des Données Personnelles (Code du Numérique)</strong></td>
        <td>Séparation stricte On-Chain / Off-Chain (<em>Privacy by Design</em>) : zéro donnée nominative, zéro montant financier et zéro fichier PDF sur Polygon. Chiffrement au repos <code>AES-256-GCM</code> pour les pièces P1–P6 off-chain.</td>
      </tr>
      <tr>
        <td><strong>Ordonnance-Loi n° 10/002 (Code des Douanes — DGDA)</strong></td>
        <td>Vérification cryptographique instantanée en moins de 2 secondes par la DGDA sans appel aux serveurs internes du FNPSS grâce aux appels RPC directs <code>eth_call</code> vers Polygon et à l'API partenaire sécurisée par <code>X-API-Key</code> (<code>VER-05</code>).</td>
      </tr>
      <tr>
        <td><strong>Décret n° 13/007 (Statuts du FNPSS) &amp; Loi n° 004/2001 (ASBL)</strong></td>
        <td>Traçabilité inaltérable des 6 actes administratifs (S1 à S6) et capacité immédiate de révocation administrative mondiale en cas d'irrégularité (<code>revokeDocument</code>).</td>
      </tr>
    </tbody>
  </table>

  <h2>4.4 Relayer Résilient, File d'Attente Idempotente (<code>BLK-10</code>) &amp; Verdicts Douaniers (<code>VER-03</code>)</h2>
  <p>
    En Afrique Centrale, la connectivité Internet vers les nœuds RPC publics peut subir des micro-coupures temporaires. Afin qu'un acte signé
    par la Direction Générale du FNPSS ne soit jamais bloqué ou perdu lors d'une panne réseau, le module serveur
    <code>src/blockchain/registry-simulator.mjs</code> implémente la classe <strong><code>ResilientAnchorQueue</code></strong> :
  </p>
  <ul>
    <li><strong>Enfilement idempotent (<code>enqueue</code>) :</strong> Indexe chaque tâche par <code>docHash</code> afin d'éviter toute double transaction on-chain et tout gaspillage de gaz en cas de double clic ou de reprise après incident.</li>
    <li><strong>Reprise automatique (<code>flush</code>) :</strong> Si le réseau est indisponible, la tâche passe en attente contrôlée (<code>NETWORK_OFFLINE_QUEUED</code>) avec compteur de tentatives (<code>attempts</code>), puis est ancrée dès le retour du lien RPC jusqu'au statut <code>CONFIRMED</code> avec enregistrement du <code>txHash</code>.</li>
    <li><strong>Double liaison PDF/JSON (<code>bindRenderedPdfHash</code> — <code>VER-04</code>) :</strong> Lie l'empreinte binaire exacte du fichier PDF rendu à l'empreinte canonique scellée on-chain pour permettre aux douaniers de vérifier aussi bien le QR Code que le fichier PDF téléversé.</li>
  </ul>
  <p>
    Lors d'un contrôle aux frontières, la fonction <code>verifyDocument</code> traduit automatiquement l'état du contrat en l'une des quatre
    pastilles normalisées (<code>CustomsBadgeVerdict</code>) : <strong><code>PASTILLE_VERTE_VALIDE</code></strong> (authentique et en cours de validité),
    <strong><code>PASTILLE_ROUGE_FALSIFIE</code></strong> (empreinte inconnue), <strong><code>PASTILLE_ROUGE_REVOQUE</code></strong> (annulé administrativement)
    et <strong><code>PASTILLE_GRISE_EXPIRE</code></strong> (validité dépassée).
  </p>

  <!-- ======================================================================= -->
  <!-- PAGE 10-11 : CHAPITRE 5 - ANATOMIE DU SMART CONTRACT FNPSSRegistry.sol  -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 5 : Anatomie Détaillée du Smart Contract <code>FNPSSRegistry.sol</code></h1>

  <h2>5.1 Caractéristiques Générales et Sécurité Native</h2>
  <p>
    Le cœur on-chain du système réside dans le fichier <code>contracts/FNPSSRegistry.sol</code> (251 lignes de Solidity pur, sous licence MIT).
    Conçu de manière volontairement <strong>autonome (zéro dépendance externe)</strong> pour éliminer tout risque lié à des librairies tierces et
    permettre un déploiement rapide et auditable sans erreur d'importation, ce contrat implémente l'ensemble des exigences <code>BLK-04</code> à <code>BLK-08</code>.
  </p>

  <h2>5.2 Modèle de Données On-Chain</h2>
  <p>
    Le contrat stocke uniquement les métadonnées strictement nécessaires à la preuve cryptographique et à la vérification douanière :
  </p>
  <div class="code-block">enum DocStatus {
    NONE,       // 0 : Empreinte inconnue (Document inexistant ou falsifie)
    ACTIVE,     // 1 : Acte authentique et en vigueur
    REVOKED     // 2 : Acte revoque administrativement par le FNPSS ou la Tutelle
}

struct DocumentRecord {
    string certificateNumber;   // Ex: "FNPSS-EXO-2026-00124"
    uint8 serviceCode;          // 1 (S1) a 6 (S6)
    uint64 issuedAt;            // Timestamp Unix d'ancrage
    uint64 expiresAt;           // Timestamp Unix d'expiration (0 = validite permanente)
    DocStatus status;           // Statut courant on-chain
    address issuer;             // Adresse du relayer/signataire FNPSS
    address ministryCoSigner;   // Adresse de contre-seing ministeriel (optionnel pour S2/S6)
    uint64 revokedAt;           // Timestamp Unix de revocation (0 si non revoque)
    string revocationReason;    // Motif officiel de revocation
}

mapping(bytes32 =&gt; DocumentRecord) private _records;      // Index primaire : Hash SHA-256 -&gt; Enregistrement
mapping(bytes32 =&gt; bytes32) private _numberToHash;        // Index secondaire : keccak256(Numéro) -&gt; Hash SHA-256</div>

  <h2>5.3 Contrôle d'Accès Granulaire (RBAC) et Coupe-Circuit d'Urgence</h2>
  <p>
    Afin d'empêcher tout tiers non autorisé d'enregistrer ou de révoquer un acte officiel sur Polygon, le contrat implémente quatre niveaux de permissions
    vérifiés par des <em>modifiers</em> Solidity à chaque appel d'écriture :
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Rôle / Modifier</th>
        <th style="width: 28%;">Fonctions Autorisées</th>
        <th style="width: 50%;">Portée et Sécurité Opérationnelle</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>ADMIN</strong><br/>(<code>onlyAdmin</code>)</td>
        <td><code>setRegistrar()</code>, <code>setRevoker()</code>, <code>setMinistrySigner()</code>, <code>setPaused()</code></td>
        <td>Gouverne l'attribution et le retrait des rôles et actionne le coupe-circuit d'urgence (<code>paused = true</code>) en cas de compromission suspectée d'une clé de relayer.</td>
      </tr>
      <tr>
        <td><strong>REGISTRAR / Relayer</strong><br/>(<code>onlyRegistrar</code>)</td>
        <td><code>registerDocument()</code></td>
        <td>Seul compte autorisé à ancrer un nouveau certificat S1–S6. Rejette les empreintes nulles, les doublons de hash et les dates d'expiration passées.</td>
      </tr>
      <tr>
        <td><strong>MINISTRY SIGNER</strong><br/>(<code>onlyMinistry</code>)</td>
        <td><code>coSignDocument()</code></td>
        <td>Permet au Ministère de Tutelle d'apposer son contre-seing cryptographique unique sur un acte actif (S2 : Convention de partenariat, S6 : Arrêté ministériel).</td>
      </tr>
      <tr>
        <td><strong>REVOKER</strong><br/>(<code>onlyRevoker</code>)</td>
        <td><code>revokeDocument()</code></td>
        <td>Révocation irréversible avec motif officiel obligatoire (<code>revocationReason</code>), incrémentant le compteur <code>totalRevoked</code> et notifiant instantanément tous les contrôles DGDA.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>
  <h2>5.4 Vérification Publique sans Gaz et Indexation par Numéro d'Acte</h2>
  <p>
    Deux fonctions marquées <code>external view</code> permettent à n'importe quel organisme (DGDA, DGRAD, DGI, ONG, bailleurs de fonds) de vérifier
    un document gratuitement via un simple appel RPC :
  </p>
  <ul>
    <li><strong><code>verifyDocument(bytes32 docHash)</code> :</strong> Retourne simultanément quatre valeurs : <code>isValid</code> (vrai uniquement si actif et non expiré), <code>isExpired</code> (vrai si la date courante du bloc dépasse <code>expiresAt</code>), le <code>status</code> brut (0, 1 ou 2) et l'intégralité de la structure <code>DocumentRecord</code>.</li>
    <li><strong><code>getHashByCertificateNumber(string certificateNumber)</code> :</strong> Permet au douanier n'ayant qu'un numéro imprimé (ex. <code>FNPSS-EXO-2026-00124</code>) de retrouver l'empreinte <code>SHA-256</code> correspondante grâce au hachage <code>keccak256(bytes(certificateNumber))</code> sans stocker de texte non indexable coûteux.</li>
  </ul>

  <h2>5.5 Événements Blockchain (Audit Trail Immuable)</h2>
  <p>
    Chaque action émet un événement indexé (<code>DocumentRegistered</code>, <code>DocumentCoSigned</code>, <code>DocumentRevoked</code>,
    <code>RoleUpdated</code>, <code>PauseStateChanged</code>). Ces logs permettent aux indexeurs et au tableau de bord FNPSS de reconstituer
    l'historique chronologique complet directement depuis la blockchain sans dépendre uniquement de la base PostgreSQL locale.
  </p>

  <h2>5.6 Sécurité Solidity, Modélisation du Gaz et Auditabilité</h2>
  <p>
    Le contrat <code>FNPSSRegistry.sol</code> a été conçu selon les standards de sécurité institutionnelle (prévus pour l'audit <code>SEC-05</code> /
    <code>BLK-12</code>) :
  </p>
  <ul>
    <li><strong>Immunité par conception contre la réentrance :</strong> Le contrat ne manipule aucun actif financier natif ni jeton ERC-20 (aucune fonction <code>payable</code>, aucun appel externe <code>.call()</code> vers des adresses tierces). La surface d'attaque financière est donc nulle.</li>
    <li><strong>Protection contre les écrasements et collisions :</strong> <code>registerDocument()</code> rejette systématiquement les empreintes nulles (<code>bytes32(0)</code>), les empreintes déjà enregistrées (<code>_records[docHash].status != DocStatus.NONE</code>), les chaînes de certificat vides, les codes de service hors plage <code>[1..6]</code> et les dates d'expiration antérieures à <code>block.timestamp</code>.</li>
    <li><strong>Optimisation du stockage et du gaz :</strong> Les champs temporels (<code>issuedAt</code>, <code>expiresAt</code>, <code>revokedAt</code>) utilisent <code>uint64</code> (suffisant jusqu'à l'an 584 milliards) et sont compactés dans un même slot EVM de 256 bits avec <code>serviceCode</code> (<code>uint8</code>) et <code>DocStatus</code>.</li>
    <li><strong>Capacité d'absorption économique :</strong> Avec un coût inférieur à 0,005 USD par transaction sur Polygon PoS Mainnet (conformément à <code>ADR-003</code>), une dotation annuelle de 1 000 USD en jetons POL permet d'ancrer plus de <strong>150 000 actes officiels</strong>, tandis que toutes les consultations douanières restent strictement gratuites.</li>
  </ul>

  <!-- ======================================================================= -->
  <!-- PAGE 12-13 : CHAPITRE 6 - PARCOURS PHASE 1 : NEON DB & CLOUDINARY       -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 6 : Parcours Réel — Phase 1 : Base de Données &amp; Stockage Off-Chain Chiffré</h1>

  <p>
    À partir de ce chapitre, le document retrace l'intégralité du <strong>parcours réel effectué étape par étape</strong> lors du passage de
    l'environnement de développement vers l'infrastructure de production connectée (configuration du fichier <code>.env</code>), en détaillant les
    plateformes retenues, les scripts développés, les incidents résolus et les alternatives envisagées.
  </p>

  <h2>6.1 Base de Données Relationnelle : Neon Serverless PostgreSQL</h2>
  <p>
    Les données métier, comptes utilisateurs, demandes S1–S6, reçus de paiement et journaux d'audit nécessitaient une base <strong>PostgreSQL 16+</strong>
    hautement disponible avec chiffrement TLS obligatoire (<code>sslmode=require</code>).
  </p>
  <h3>Démarche réalisée ensemble :</h3>
  <ol>
    <li>Création du projet cloud sur <strong>Neon Console</strong> (<code>console.neon.tech</code>) sous l'identifiant <code>summer-glade-74760137</code> (base <code>neondb</code>, hôte pooler AWS <code>ep-holy-sunset-bezqb6ri-pooler.c-9.us-east-2.aws.neon.tech</code>).</li>
    <li>Saisie sécurisée de <code>DATABASE_URL</code> dans <code>.env</code> sans exposer le mot de passe en clair.</li>
    <li>Création et exécution du script automatisé <code>scripts/neon-setup.mjs</code> (<code>npm run db:neon</code>) qui a :
      <ul>
        <li>Synchronisé <code>POSTGRES_USER</code>, <code>POSTGRES_PASSWORD</code>, <code>POSTGRES_DB=neondb</code> et <code>POSTGRES_PORT=5432</code> ;</li>
        <li>Généré cryptographiquement deux clés aléatoires 256 bits : <code>DOCUMENT_ENCRYPTION_KEY_HEX</code> et <code>JWT_SECRET</code> (64 caractères hexadécimaux) ;</li>
        <li>Exécuté <code>database/schema.sql</code> créant les <strong>10 tables officielles</strong> (<code>users</code>, <code>organizations</code>, <code>services</code>, <code>applications</code>, <code>application_documents</code>, <code>certificates</code>, <code>payments</code>, <code>blockchain_anchors</code>, <code>notifications</code>, <code>audit_logs</code>) ;</li>
        <li>Exécuté <code>database/seed.sql</code> amorçant les <strong>6 services S1 à S6</strong> sur Neon (PostgreSQL 18.6 détecté).</li>
      </ul>
    </li>
    <li><strong>Incident technique résolu :</strong> Lors de la première exécution de <code>npm run db:neon</code> dans le terminal sandboxé, l'erreur réseau <code>fetch failed</code> est survenue car l'isolation bloquait les appels sortants. La relance avec autorisation réseau hors-sandbox a permis d'initialiser Neon avec succès.</li>
  </ol>

  <h3>Alternatives SGBD Citées mais Non Adoptées à ce Stade :</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Plateforme / Solution</th>
        <th style="width: 20%;">Statut</th>
        <th style="width: 56%;">Raison du Choix ou du Rejet</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Neon PostgreSQL</strong></td>
        <td><span class="badge-adopted">Adopté</span></td>
        <td>Serverless instantané, connexion pooling native optimisée pour Next.js/Vercel, branchements rapides, SQL Editor intégré et niveau gratuit généreux.</td>
      </tr>
      <tr>
        <td><strong>Serveur Souverain / VPS + Docker</strong></td>
        <td><span class="badge-alt">Cible Finale Production RDC</span></td>
        <td>Préconisé par <code>docker-compose.yml</code> et <code>OPS-07</code> pour l'hébergement souverain final à Kinshasa/Lubumbashi lorsque les serveurs gouvernementaux dédiés sont provisionnés.</td>
      </tr>
      <tr>
        <td><strong>Supabase</strong></td>
        <td><span class="badge-rejected">Non adopté</span></td>
        <td>Excellent fournisseur PostgreSQL managé, mais redondant avec notre propre couche d'authentification RBAC/Web3Auth sur mesure.</td>
      </tr>
      <tr>
        <td><strong>Railway / Render / AWS RDS</strong></td>
        <td><span class="badge-rejected">Non adopté</span></td>
        <td>Écartés pour la phase pilote au profit de la simplicité et du démarrage immédiat de Neon.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>
  <h2>6.2 Stockage Objet Chiffré Off-Chain : Cloudinary + Chiffrement AES-256-GCM</h2>
  <p>
    Pour stocker les pièces justificatives volumineuses des ONG (Statuts notariés P1, Agréments P2, Plans d'action P3, Rapports P4, Listes de colisage P5,
    Quittances P6) et les attestations scellées sans exposer le contenu en clair sur un cloud tiers, nous avons mis en place une couche de chiffrement
    applicatif stricte.
  </p>
  <h3>Démarche réalisée ensemble :</h3>
  <ol>
    <li>Création d'un compte sur <strong>Cloudinary</strong> (<code>console.cloudinary.com</code>, Cloud Name : <code>dyjvghbxp</code>) et structuration d'un dossier dédié <code>guichetuniquefnpss/pdfs</code>.</li>
    <li>Développement de l'adaptateur <code>src/storage/cloudinary-storage.mjs</code> (fonctions <code>uploadEncryptedPdfToCloudinary</code> et <code>downloadAndDecryptPdfFromCloudinary</code>) et du script de test <code>scripts/cloudinary-setup.mjs</code> (<code>npm run storage:cloudinary</code>).</li>
    <li><strong>Incident technique résolu :</strong> Erreur initiale <code>Variable CLOUDINARY_URL absente ou incomplète</code> car l'utilisateur disposait des clés individuelles (<code>API Key</code> et <code>API Secret</code>) plutôt que de l'URL combinée. Nous avons ajouté explicitement les variables <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code> et <code>CLOUDINARY_API_SECRET</code> dans <code>.env</code> et adapté le script de synchronisation.</li>
    <li><strong>Validation en direct :</strong> Un fichier test chiffré <code>smoke_test_fnpss_aes256gcm.enc.json</code> (398 octets) a été téléversé sur Cloudinary, puis retéléchargé et déchiffré avec succès (empreinte SHA-256 vérifiée : <code>0xf1f8841b...7fae54df</code>).</li>
  </ol>

  <h3>Alternatives Stockage Objet Citées mais Non Adoptées :</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Fournisseur Stockage</th>
        <th style="width: 20%;">Statut</th>
        <th style="width: 56%;">Analyse Comparative</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Cloudinary</strong> (avec chiffrement AES-256-GCM)</td>
        <td><span class="badge-adopted">Adopté</span></td>
        <td>Choisi par l'utilisateur pour sa simplicité d'activation immédiate sans carte bancaire requise et son support des fichiers bruts (<code>raw</code>).</td>
      </tr>
      <tr>
        <td><strong>Cloudflare R2</strong></td>
        <td><span class="badge-alt">Alternative Recommandée</span></td>
        <td>Compatible API S3, gratuit jusqu'à 10 Go/mois avec zéro frais de bande passante sortante (<em>Zero Egress Fees</em>) ; idéal pour de très gros volumes d'archives PDF.</td>
      </tr>
      <tr>
        <td><strong>Supabase Storage S3 / AWS S3</strong></td>
        <td><span class="badge-rejected">Non adopté</span></td>
        <td>AWS S3 nécessite une carte bancaire et facture les sorties réseau ; Supabase Storage n'a pas été retenu pour garder une stack unifiée autour de Neon + Cloudinary.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 14-15 : CHAPITRE 7 - AUTHENTIFICATION HYBRIDE & WEB3AUTH           -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 7 : Parcours Réel — Phase 2 : Authentification Hybride &amp; Web3Auth</h1>

  <p>
    Une contrainte majeure d'expérience utilisateur du Guichet Unique (<code>REQ-01</code>, <code>REQ-02</code>, <code>BLK-02</code>, <code>BLK-03</code>)
    est qu'une ONG humanitaire opérant en province doit pouvoir se connecter en 2 clics via son compte Google, tout en obtenant automatiquement
    une identité cryptographique Web3 en arrière-plan sans jamais installer d'extension ni sauvegarder de phrase secrète.
  </p>

  <h2>7.1 Configuration de Google OAuth 2.0 (Google Cloud Console)</h2>
  <p>
    Sur <strong>Google Cloud Console</strong> (<code>console.cloud.google.com</code>) :
  </p>
  <ol>
    <li>Configuration de l'écran d'autorisation OAuth (<em>OAuth Consent Screen</em>) de type <strong>Externe</strong> pour le projet Guichet Unique FNPSS.</li>
    <li>Création d'un <strong>ID client OAuth (Application Web)</strong> générant <code>GOOGLE_OAUTH_CLIENT_ID</code> (<code>1061325653437-...apps.googleusercontent.com</code>) et <code>GOOGLE_OAUTH_CLIENT_SECRET</code>.</li>
    <li>Enregistrement des origines JavaScript autorisées (<code>http://localhost:3000</code> et URL de production Vercel) et des URI de redirection autorisés (<code>/auth/login</code>).</li>
  </ol>

  <h2>7.2 Configuration de Web3Auth via MetaMask Developer</h2>
  <p>
    Historiquement accessible sur <code>dashboard.web3auth.io</code>, la plateforme Web3Auth a fusionné son portail d'administration avec
    <strong>MetaMask Developer</strong> (<code>developer.metamask.io</code>). Ce changement d'interface a nécessité plusieurs ajustements précis
    que nous avons résolus ensemble en temps réel sur captures d'écran :
  </p>
  <ol>
    <li><strong>Création du projet Web3Auth :</strong> Produit <em>Plug and Play</em>, plateforme <strong>Web Application</strong>, environnement <strong>Sapphire Devnet</strong> (<code>WEB3AUTH_NETWORK=sapphire_devnet</code>), générant le <code>WEB3AUTH_CLIENT_ID</code> (87 caractères commençant par <code>BJH5K0Ft...</code>).</li>
    <li><strong>Résolution du problème « Settings / Whitelist introuvable » :</strong> Dans le nouveau tableau de bord MetaMask Developer, l'ancienne section « Whitelist » a été déplacée vers l'onglet <strong><code>Domains → Allowlist URLs</code></strong> et n'apparaît qu'après avoir coché la plateforme <code>Web Application</code> dans <em>General</em>.</li>
    <li><strong>Correction de l'erreur de syntaxe Allowlist :</strong> Deux URLs avaient initialement été saisies sur la même ligne séparées par une virgule (<code>http://localhost:3000/auth/login, http://localhost:3000</code>), ce qui aurait provoqué un rejet OAuth/CORS. Elles ont été supprimées puis saisies proprement <strong>une par une sans chemin</strong> : <code>http://localhost:3000</code> et <code>https://guichetuniquefnpss.vercel.app</code>.</li>
    <li><strong>Activation des chaînes dans <code>Chains &amp; Networks</code> :</strong>
      <ul>
        <li>Lors de la saisie manuelle du formulaire, l'utilisateur a remarqué que les champs (<code>Logo URL</code>, <code>Chain ID</code>, <code>RPC URL</code>, etc.) apparaissaient grisés/inaccessibles pour Polygon Amoy.</li>
        <li><strong>Explication technique :</strong> Contrairement à un réseau inconnu nécessitant <em>Add a Custom Network</em> (où nous avions préparé les valeurs hexadécimales <code>0x13882</code> et <code>0x89</code>), <strong>Polygon Amoy</strong> et <strong>Polygon Mainnet</strong> sont des réseaux officiels nativement préconfigurés par MetaMask/Web3Auth. Le simple fait d'activer l'interrupteur vert sur <em>Polygon Amoy</em> dans la liste centrale a suffi (le formulaire Custom à droite pouvait être ignoré).</li>
      </ul>
    </li>
  </ol>

  <div class="page-break"></div>
  <h3>Comparatif des Solutions d'Authentification &amp; Portefeuilles Embarqués :</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Solution</th>
        <th style="width: 20%;">Statut</th>
        <th style="width: 56%;">Justification Technique</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Web3Auth (Sapphire Devnet / Mainnet) + Google OAuth 2.0</strong></td>
        <td><span class="badge-adopted">Adopté</span></td>
        <td>Portefeuille MPC non-custodial transparent pour les requérants ONG, intégration directe avec Google Workspace, écosystème unifié avec MetaMask Developer et conformité totale avec <code>BLK-02/03</code>.</td>
      </tr>
      <tr>
        <td><strong>Magic.link</strong></td>
        <td><span class="badge-alt">Alternative citée</span></td>
        <td>Mentionnée dans les spécifications fonctionnelles (<code>F01</code>) comme alternative de portefeuille par lien magique e-mail (<em>Magic Links</em>), non retenue face à la gratuité et la flexibilité MPC de Web3Auth.</td>
      </tr>
      <tr>
        <td><strong>Connexion MetaMask directe imposée aux ONG</strong></td>
        <td><span class="badge-rejected">Rejeté (ONG) / Adopté (Admin)</span></td>
        <td>Imposer l'extension MetaMask aux requérants humanitaires bloquerait l'adoption (barrière technique et gestion de seed phrase). MetaMask est en revanche idéal pour l'<strong>administrateur technique FNPSS</strong> déployant et gouvernant le contrat.</td>
      </tr>
    </tbody>
  </table>

  <h2>7.3 Séparation Identitaire : Session JWT Web, Google OAuth &amp; Clé MPC Web3Auth</h2>
  <p>
    Afin d'éviter toute confusion lors de l'exploitation et de la maintenance du portail, l'architecture identitaire repose sur trois couches
    complémentaires et strictement cloisonnées :
  </p>
  <ul>
    <li><strong>Jeton applicatif serveur (<code>JWT_SECRET</code> 64 hex) :</strong> Signe les sessions HTTP du Guichet Unique (table <code>sessions</code> PostgreSQL) pour l'accès aux formulaires, au suivi de dossier et aux pièces chiffrées Cloudinary.</li>
    <li><strong>Identité fédérée (<code>GOOGLE_OAUTH_CLIENT_ID</code>) :</strong> Prouve l'authenticité de l'adresse e-mail de l'organisation requérante auprès de Google Cloud Console sans gestion locale de mots de passe.</li>
    <li><strong>Portefeuille MPC non-custodial (<code>WEB3AUTH_CLIENT_ID</code> — <code>sapphire_devnet</code>) :</strong> Fractionne la clé cryptographique via <em>Multi-Party Computation</em> (seuil de Shamir) entre le jeton OAuth, le nœud décentralisé Sapphire et le navigateur. Ainsi, même le FNPSS ne détient jamais la clé privée d'un requérant, tout en lui attribuant une adresse EVM déterministe (<code>wallet_address</code> en base) prête à signer des accusés de soumission sans extension.</li>
  </ul>

  <!-- ======================================================================= -->
  <!-- PAGE 16 : CHAPITRE 8 - PARCOURS PHASE 3 : METAMASK, RPC & CHAINLIST     -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 8 : Parcours Réel — Phase 3 : Configuration MetaMask, Nœuds RPC &amp; ChainList</h1>

  <p>
    Pour déployer le contrat <code>FNPSSRegistry.sol</code> sur la blockchain publique Polygon Amoy et signer la transaction initiale de création,
    il convenait de préparer le portefeuille administrateur dans l'extension navigateur <strong>MetaMask</strong> (adresse créée :
    <code>0xE1F9C03Dd7CCb443F7aD583278e184433b331aC1</code>).
  </p>

  <h2>8.1 Distinction Critique entre Deux Interfaces MetaMask</h2>
  <p>
    Une étape clé de notre parcours a consisté à bien distinguer deux écrans portant le nom MetaMask :
  </p>
  <ul>
    <li><strong>Portail Web <code>developer.metamask.io</code> (côté serveur / application) :</strong> Sert uniquement à obtenir le <code>WEB3AUTH_CLIENT_ID</code> pour les utilisateurs finaux de l'application web.</li>
    <li><strong>Extension Navigateur MetaMask (icône renard en haut à droite de Chrome) :</strong> Sert au développeur/administrateur pour signer et payer les transactions on-chain (comme le déploiement du Smart Contract depuis Remix IDE).</li>
  </ul>

  <h2>8.2 Incident sur l'URL RPC Officielle et Résolution par PublicNode &amp; ChainList</h2>
  <p>
    Lors de l'ajout manuel du réseau Polygon Amoy Testnet dans l'extension MetaMask (Chain ID <code>80002</code>, symbole <code>POL</code>,
    explorateur <code>https://amoy.polygonscan.com</code>), l'URL RPC par défaut <code>https://rpc-amoy.polygon.technology</code> a échoué
    à la validation dans le navigateur (et a également renvoyé <code>getaddrinfo ENOTFOUND</code> lors de nos tests Node.js ultérieurs).
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 34%;">Endpoint RPC / Méthode</th>
        <th style="width: 18%;">Statut</th>
        <th style="width: 48%;">Observation Réelle lors du Montage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>https://rpc-amoy.polygon.technology</code></td>
        <td><span class="badge-rejected">Défaillant / Limité</span></td>
        <td>Refusé lors de l'enregistrement dans MetaMask et erreur DNS <code>ENOTFOUND</code> depuis Node.js. Remplacé dans le fichier <code>.env</code>.</td>
      </tr>
      <tr>
        <td><strong><code>https://polygon-amoy-bor-rpc.publicnode.com</code></strong></td>
        <td><span class="badge-adopted">Adopté (.env &amp; MetaMask)</span></td>
        <td>Validé immédiatement par MetaMask et confirmé en temps réel par nos requêtes JSON-RPC (<code>eth_blockNumber</code>, <code>eth_getBalance</code>, <code>eth_getCode</code>).</td>
      </tr>
      <tr>
        <td><strong>ChainList (<code>chainlist.org/chain/80002</code>)</strong></td>
        <td><span class="badge-adopted">Utilisé</span></td>
        <td>A automatiquement reconnu le réseau Amoy configuré, affiché les RPC disponibles et fourni le lien vers l'explorateur.</td>
      </tr>
      <tr>
        <td><code>https://80002.rpc.thirdweb.com</code></td>
        <td><span class="badge-alt">Testé avec succès</span></td>
        <td>Utilisé avec succès pour vérifier en direct l'arrivée de 1 POL dans le portefeuille avant le déploiement.</td>
      </tr>
      <tr>
        <td><code>https://polygon-amoy.drpc.org</code></td>
        <td><span class="badge-alt">Alternative RPC citée</span></td>
        <td>Endpoint communautaire alternatif fiable conservé en secours.</td>
      </tr>
      <tr>
        <td><code>https://rpc.ankr.com/polygon_amoy</code></td>
        <td><span class="badge-rejected">Écarté</span></td>
        <td>Exige désormais une clé API authentifiée (<code>code -32000: Unauthorized</code>).</td>
      </tr>
    </tbody>
  </table>
  <p>
    <em>Note d'ergonomie rencontrée :</em> MetaMask a affiché un message orange suggérant le nom court officiel <em>« Amoy »</em> à la place de
    <em>« Polygon Amoy Testnet »</em>. Ce message n'était qu'informatif et l'enregistrement a été finalisé avec succès.
  </p>

  <!-- ======================================================================= -->
  <!-- PAGE 17 : CHAPITRE 9 - PARCOURS PHASE 4 : L'ODYSSEE DES FAUCETS         -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 9 : Parcours Réel — Phase 4 : L'Odyssée des Faucets &amp; Obtention du Gaz POL</h1>

  <p>
    Lors de la première tentative de déploiement sur Remix IDE, le nœud RPC a retourné l'erreur bloquante :
    <code>Gas estimation failed... insufficient funds (code=INSUFFICIENT_FUNDS)</code>. Bien que les jetons sur un réseau de test soient gratuits,
    tout déploiement consomme du gaz : le portefeuille <code>0xE1F9C03Dd7CCb443F7aD583278e184433b331aC1</code> affichait <strong>0 POL</strong>.
    Obtenir des jetons de test en 2026 nécessite de naviguer entre les protections anti-bots des différents faucets :
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 26%;">Plateforme Faucet</th>
        <th style="width: 18%;">Verdict Réel</th>
        <th style="width: 56%;">Détails de l'Expérience &amp; Comportement Observé</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Chainlink Faucet</strong><br/><code>faucets.chain.link/polygon-amoy</code></td>
        <td><span class="badge-rejected">Échec</span></td>
        <td>A rejeté la demande de <code>0,5 POL</code> avec un bandeau explicatif strict : <em>« Pour obtenir des jetons natifs, l'utilisateur doit posséder au moins 1 LINK sur le réseau principal Ethereum »</em> (barrière anti-Sybil financière).</td>
      </tr>
      <tr>
        <td><strong>Google Cloud Web3 Faucet</strong><br/><code>cloud.google.com/application/web3/faucet</code></td>
        <td><span class="badge-rejected">Inapplicable</span></td>
        <td>La liste déroulante du faucet Google Cloud proposait <em>Ethereum Sepolia</em>, <em>Ethereum Hoodi</em>, <em>PYUSD</em>, <em>Injective</em>, etc., mais <strong>Polygon Amoy n'y figurait pas</strong>.</td>
      </tr>
      <tr>
        <td><strong>Polygon Official Faucet</strong><br/><code>faucet.polygon.technology</code></td>
        <td><span class="badge-adopted">Succès (+1 POL)</span></td>
        <td>Après vérification d'identité via <strong>X.COM</strong> (coche verte validée) et soumission de l'adresse <code>0xE1F9...31aC1</code>, la page a affiché <em>« You can request this token again in 24 hours »</em>. Notre vérification JSON-RPC directe a immédiatement confirmé le solde on-chain exact : <strong><code>1 POL</code> (<code>0xde0b6b3a7640000</code> wei)</strong>.</td>
      </tr>
      <tr>
        <td><strong>PoW Amoy Faucet (pk910)</strong><br/><code>polygon-amoy.faucet.pk910.de</code></td>
        <td><span class="badge-alt">Alternative sans compte</span></td>
        <td>Proposée comme alternative infaillible sans aucune connexion sociale (le navigateur effectue 30 secondes de calcul Proof-of-Work pour réclamer ~0,1 POL).</td>
      </tr>
      <tr>
        <td><strong>Alchemy Amoy Faucet</strong><br/><code>alchemy.com/faucets/polygon-amoy</code></td>
        <td><span class="badge-alt">Alternative avec Google</span></td>
        <td>Distribue 0,5 POL contre une simple connexion gratuite avec un compte Google/GitHub.</td>
      </tr>
      <tr>
        <td><strong>QuickNode Faucet</strong><br/><code>faucet.quicknode.com/polygon/amoy</code></td>
        <td><span class="badge-alt">Alternative citée</span></td>
        <td>Autre robinet multi-chaînes public utilisable en solution de repli.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-success">
    <strong>Leçon d'ingénierie pratique :</strong><br/>
    Même après un don validé par un faucet, l'interface web d'un faucet peut paraître ambiguë (bouton grisé + mention de délai de 24h).
    Vérifier directement le solde par appel JSON-RPC (<code>eth_getBalance</code>) évite de perdre du temps sur d'autres faucets alors que les fonds
    sont déjà arrivés sur la blockchain.
  </div>

  <!-- ======================================================================= -->
  <!-- PAGE 18 : CHAPITRE 10 - PARCOURS PHASE 5 : COMPILATION & REMIX IDE      -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 10 : Parcours Réel — Phase 5 : Compilation &amp; Déploiement sur Remix IDE</h1>

  <h2>10.1 Choix de Remix IDE et Alternatives de Déploiement Écartées</h2>
  <p>
    Pour compiler et déployer <code>contracts/FNPSSRegistry.sol</code> sans installer de lourde chaîne d'outils Solidity locale (<code>solc</code>,
    gestion des RPC dans des scripts privés avec clé privée en clair sur disque), nous avons opté pour <strong>Remix IDE</strong>
    (<code>remix.ethereum.org</code> / <code>app.remix.live</code>) couplé à la signature sécurisée dans MetaMask.
  </p>
  <ul>
    <li><strong>Hardhat / Foundry (<code>forge create</code>) — Alternatives non retenues ici :</strong> Outils professionnels puissants en ligne de commande, mais qui exigent d'exporter et de coller la clé privée en clair dans un script local. L'approche Remix + MetaMask garantit que la clé privée administrateur n'a jamais quitté l'extension chiffrée du navigateur.</li>
    <li><strong>Thirdweb Deploy — Alternative non retenue :</strong> Utile pour les contrats standardisés, mais superflu pour notre contrat autonome FNPSS sans dépendance.</li>
  </ul>

  <h2>10.2 Journal des Étapes de Compilation et Résolution de Deux Incidents Critiques</h2>
  <ol>
    <li><strong>Création et Compilation :</strong> Création de <code>contracts/FNPSSRegistry.sol</code> dans l'espace de travail Remix (<code>default_workspace</code>) et compilation réussie avec le compilateur Solidity <code>0.8.34</code> (compatible <code>pragma solidity ^0.8.24</code>), confirmée par la coche verte sans erreur.</li>
    <li><strong>Incident n° 1 — Environnement « Remix VM » vs « Injected Provider - MetaMask » :</strong>
      Lors de la première ouverture de l'onglet <em>Deploy &amp; Run Transactions</em>, Remix était réglé par défaut sur <strong><code>Remix VM (Osaka)</code></strong> avec un faux compte de test local (<code>0x5B3...eddC4</code> doté de <code>100.000 ETH</code> fictifs). Un déploiement dans cet environnement n'existe que dans la mémoire volatile du navigateur et jamais sur la vraie blockchain Polygon. Le basculement vers <strong><code>Browser Extension → MetaMask</code></strong> (anciennement <em>Injected Provider - MetaMask</em>) a connecté le vrai compte <code>0xE1F9...31aC1</code>.</li>
    <li><strong>Incident n° 2 — L'énigme de l'erreur « Insufficient Funds » malgré 1 POL en portefeuille :</strong>
      Bien que <code>0xE1F9...31aC1</code> dispose bel et bien de <code>1 POL</code> sur Amoy, Remix a encore affiché l'erreur <code>insufficient funds for transfer</code>, et en forçant l'envoi, MetaMask a affiché une popup demandant <strong><code>13,67 $US ETH</code></strong> sur le <strong>Réseau : Ethereum</strong> !<br/>
      <strong>Diagnostic cryptographique :</strong> En inspectant le champ hexadécimal <code>"maxFeePerGas": "0x2b9bf779"</code> dans le message d'erreur de Remix, sa conversion décimale donnait <code>731 641 721 wei</code> = <strong><code>0,73 Gwei</code></strong>. Or, Polygon Amoy impose une base fee minimale de ~30 Gwei ; <code>0,73 Gwei</code> est le tarif typique d'<strong>Ethereum L1 Mainnet</strong> ! Cela prouvait mathématiquement que l'extension MetaMask était encore positionnée sur le réseau Ethereum (où le solde ETH est à 0) et non sur Amoy.</li>
    <li><strong>Résolution &amp; Déploiement Effectif :</strong> Après annulation de la transaction Ethereum dans MetaMask, activation des réseaux de test et sélection explicite de <strong><code>Réseau :: Amoy</code></strong> (affichant <code>POL : 0,08 $US / 1 POL</code>), les paramètres du constructeur ont été passés :
      <ul>
        <li><code>initialAdmin</code> : <code>0xE1F9C03Dd7CCb443F7aD583278e184433b331aC1</code></li>
        <li><code>initialRelayer</code> : <code>0xE1F9C03Dd7CCb443F7aD583278e184433b331aC1</code></li>
      </ul>
      La transaction a été confirmée en quelques secondes.</li>
  </ol>

  <div class="callout-success">
    <strong>Résultat Officiel On-Chain (Vérifié par <code>eth_getCode</code>) :</strong><br/>
    • <strong>Adresse du Smart Contract FNPSSRegistry :</strong> <code>0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code><br/>
    • <strong>Longueur du bytecode vérifiée en direct sur Polygon Amoy :</strong> <code>23 508</code> caractères hexadécimaux<br/>
    • <strong>Solde restant sur le compte Admin/Relayer après déploiement :</strong> <code>0,922 POL</code><br/>
    • <strong>Explorateur public :</strong> <code>https://amoy.polygonscan.com/address/0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code>
  </div>

  <!-- ======================================================================= -->
  <!-- PAGE 19 : CHAPITRE 11 - SERVICES CONNEXES : SMTP GMAIL & HEBERGEMENT    -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 11 : Services Connexes — Notifications Gmail SMTP SSL, Vercel &amp; Alternatives</h1>

  <h2>11.1 Messagerie Transactionnelle (<code>NOT-01</code>) : Gmail SMTP SSL</h2>
  <p>
    En parallèle de la couche blockchain, le Guichet Unique notifie en temps réel les ONG et agents FNPSS par e-mail (réception de dossier,
    demande de complément, délivrance de l'attestation scellée, révocation).
  </p>
  <ol>
    <li><strong>Choix du fournisseur :</strong> Utilisation de <strong>Gmail SMTP</strong> (compte <code>belcheckatwood.09@gmail.com</code>) avec activation de la validation en deux étapes (2FA) et génération d'un <strong>Mot de passe d'application</strong> de 16 lettres dans <code>myaccount.google.com/apppasswords</code>.</li>
    <li><strong>Incident réseau résolu (Port 587 STARTTLS vs Port 465 SSL) :</strong> Le premier test via notre utilitaire dédié <code>scripts/test-smtp.mjs</code> (<code>npm run email:test</code>) sur le port <code>587</code> (STARTTLS) a expiré après 12 secondes (<em>Timeout</em>). Le basculement automatique sur le port <strong><code>465</code> (SSL/TLS direct)</strong> a abouti instantanément à l'authentification réussie (<code>Code 235: 2.7.0 Accepted</code>) et à la livraison effective d'un e-mail de test réel dans la boîte de réception (<code>Code 250: 2.0.0 OK</code>).</li>
  </ol>

  <h3>Alternatives Messagerie SMTP Citées :</h3>
  <ul>
    <li><strong>Brevo (ex-Sendinblue — <code>smtp-relay.brevo.com</code>) :</strong> Alternative recommandée pour le passage à grande échelle (jusqu'à 300 e-mails transactionnels gratuits par jour avec statistiques de délivrabilité et SPF/DKIM dédiés), mise en réserve après la phase de test Gmail.</li>
    <li><strong>Messagerie Institutionnelle Souveraine (<code>smtp.fnpss.cd</code>) :</strong> Cible finale une fois les enregistrements DNS MX/SPF du domaine officiel du FNPSS raccordés.</li>
    <li><strong>Resend / Mailgun :</strong> Alternatives API modernes non retenues pour conserver la simplicité du protocole standard SMTP.</li>
  </ul>

  <h2>11.2 Hébergement Web Applicatif Next.js : Vercel, Render, Railway &amp; Serveur Souverain</h2>
  <p>
    L'application Next.js 14 (mode <em>standalone</em>) doit être exposée publiquement afin que l'URL inscrite dans les QR Codes des certificats
    (<code>PUBLIC_VERIFY_BASE_URL</code>) soit accessible partout aux postes frontières de la RDC :
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Hébergeur / Infra</th>
        <th style="width: 20%;">Statut</th>
        <th style="width: 56%;">Notes Architecturales &amp; Parcours</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Vercel</strong> (<code>vercel.com</code>)</td>
        <td><span class="badge-adopted">Configuré (Pilote Web)</span></td>
        <td>Connecté au dépôt GitHub <code>EMMADEKO10/guichetuniquefnpss</code> (<code>guichetuniquefnpss.vercel.app</code> autorisé dans Web3Auth). Lors du parcours, un blocage 2FA Vercel sans codes de secours a conduit à documenter la procédure de réinitialisation via <code>vercel.com/help</code> ainsi que les hébergeurs de repli immédiats.</td>
      </tr>
      <tr>
        <td><strong>Render / Railway</strong></td>
        <td><span class="badge-alt">Alternatives de repli immédiates</span></td>
        <td>Proposées pour un déploiement GitHub en 5 minutes avec support natif Docker et variables <code>.env</code> sans contrainte d'accès 2FA bloquante.</td>
      </tr>
      <tr>
        <td><strong>Cluster Souverain Kinshasa / Lubumbashi</strong></td>
        <td><span class="badge-alt">Cible Souveraineté État</span></td>
        <td>Architecture Docker Compose avec réplication active/passive, TLS 1.3, RPO 15 min / RTO 30 min telle que définie dans le module <code>OPS-07</code> (Sprint 6).</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================================================================= -->
  <!-- PAGE 20 : CHAPITRE 12 - BILAN FINAL & TRANSITION POLYGON MAINNET        -->
  <!-- ======================================================================= -->
  <div class="page-break"></div>
  <h1>Chapitre 12 : Bilan des Validations &amp; Transition vers Polygon Mainnet</h1>

  <h2>12.1 Inventaire Consolidé de la Configuration de Production (<code>.env</code>)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 26%;">Couche Technique</th>
        <th style="width: 34%;">Plateforme / Technologie Retenue</th>
        <th style="width: 40%;">Preuve de Validation Vérifiée</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Base de Données</strong></td>
        <td>Neon Serverless PostgreSQL (<code>neondb</code>)</td>
        <td><code>npm run db:neon</code> : 10 tables créées + 6 services S1–S6 insérés et vérifiés.</td>
      </tr>
      <tr>
        <td><strong>Stockage Documents</strong></td>
        <td>Cloudinary + Chiffrement <code>AES-256-GCM</code></td>
        <td><code>npm run storage:cloudinary</code> : envoi chiffré + déchiffrement binaire 100 % validé.</td>
      </tr>
      <tr>
        <td><strong>Authentification Hybride</strong></td>
        <td>Google OAuth 2.0 + Web3Auth (<code>sapphire_devnet</code>)</td>
        <td>JWT 64 hex généré, Client ID OAuth &amp; Web3Auth (87 car.) configurés + Allowlist validée.</td>
      </tr>
      <tr>
        <td><strong>Blockchain Layer 2</strong></td>
        <td>Polygon Amoy (<code>80002</code>) + RPC PublicNode</td>
        <td>Contrat <code>0x1474ECCD68C0a9b3c28624532359B2e8A70ab705</code> déployé (bytecode vérifié : 23 508 caractères hexadécimaux / 11 753 octets).</td>
      </tr>
      <tr>
        <td><strong>Notifications Email</strong></td>
        <td>Gmail SMTP SSL (Port <code>465</code>)</td>
        <td><code>npm run email:test</code> (<code>--send</code>) : Auth 235 &amp; livraison réelle boîte mail Code 250 OK.</td>
      </tr>
      <tr>
        <td><strong>Qualité Logicielle</strong></td>
        <td>Suite de tests &amp; Serveur Next.js Standalone</td>
        <td><code>npm test</code> : <strong>30/30 suites PASS</strong> · <code>npm run smoke</code> : <strong>30/30 checks PASS</strong>.</td>
      </tr>
    </tbody>
  </table>

  <h2>12.2 Checklist de Passage en Production Définitive (Polygon PoS Mainnet — <code>BLK-12</code>)</h2>
  <p>
    La phase actuelle sur <strong>Polygon Amoy</strong> constitue l'environnement complet de pré-production et de démonstration pilote (à coût nul).
    Avant l'ouverture nationale à l'ensemble des postes douaniers sur <strong>Polygon PoS Mainnet (Chain ID <code>137</code>)</strong>, les six actions
    suivantes devront être exécutées :
  </p>
  <ol>
    <li><strong>Audit de Sécurité Indépendant (<code>SEC-03 / SEC-05</code>) :</strong> Faire auditer <code>contracts/FNPSSRegistry.sol</code> (protection contre réentrance, contrôle strict des droits admin, coupe-circuit d'urgence) et l'API Relayer.</li>
    <li><strong>Sécurisation du Compte Administrateur (Multisig) :</strong> Remplacer l'adresse EOA unique (<code>0xE1F9...31aC1</code>) par un coffre-fort multi-signatures (<strong>Safe / Gnosis Safe</strong> exigeant par exemple 2 signatures sur 3 entre la DG FNPSS, la DSI et le Ministère) pour le rôle <code>admin</code>, tout en conservant un portefeuille dédié et plafonné pour le <code>Relayer</code> serveur.</li>
    <li><strong>Approvisionnement en Vrais Jetons POL :</strong> Créditer le portefeuille Relayer de <code>250 POL</code> sur Polygon PoS Mainnet (enveloppe estimée à ~1 000 USD permettant plus de 150 000 ancrages officiels).</li>
    <li><strong>Redéploiement &amp; Vérification du Code Source :</strong> Déployer le même contrat <code>FNPSSRegistry.sol</code> sur Polygon Mainnet (<code>137</code>) et publier son code source sur <code>polygonscan.com</code> pour une transparence publique intégrale.</li>
    <li><strong>Bascule Web3Auth Mainnet :</strong> Passer l'environnement Web3Auth de <code>sapphire_devnet</code> à <code>sapphire_mainnet</code> et mettre à jour <code>BLOCKCHAIN_NETWORK=polygon-mainnet</code> ainsi que <code>FNPSS_REGISTRY_CONTRACT_ADDRESS</code> dans l'hébergement de production.</li>
    <li><strong>Bascule SMTP Institutionnel :</strong> Remplacer la passerelle de test Gmail par un serveur dédié à haut volume (Brevo ou serveur officiel <code>@fnpss.cd</code> avec enregistrements SPF/DKIM/DMARC).</li>
  </ol>

  <div class="footer-note">
    <strong>FNPSS &bull; Guichet Unique Dématérialisé</strong> &bull; Document d'Architecture et Montage Blockchain &bull; République Démocratique du Congo &bull; 2026
  </div>

</div>
</body>
</html>`;

const outputDir = path.resolve('documentation du projet');
const primaryPath = path.join(outputDir, 'GUIDE_ARCHITECTURE_ET_MONTAGE_BLOCKCHAIN_FNPSS.doc');
const fallbackPath = path.join(outputDir, 'GUIDE_ARCHITECTURE_ET_MONTAGE_BLOCKCHAIN_FNPSS_REV2.doc');
let finalPath = primaryPath;
try {
  fs.writeFileSync(primaryPath, docContent, 'utf-8');
} catch (err) {
  if (err && err.code === 'EBUSY') {
    fs.writeFileSync(fallbackPath, docContent, 'utf-8');
    finalPath = fallbackPath;
    console.warn('Fichier principal verrouillé par Word, version enrichie écrite dans :', fallbackPath);
  } else {
    throw err;
  }
}
console.log('Document Word généré avec succès :', finalPath);
