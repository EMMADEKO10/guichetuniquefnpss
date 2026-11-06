import React from 'react';
import './globals.css';
import Header from '../components/ui/Header.jsx';
import Footer from '../components/ui/Footer.jsx';

export const metadata = {
  title: 'Guichet Unique Dématérialisé — FNPSS (RDC)',
  description: 'Portail officiel dématérialisé d\'enrôlement, de partenariat, d\'avis techniques et d\'exonérations pour les ONG et ASBL en RDC.'
};

// Next.js 14 : viewport et themeColor doivent être exportés séparément des métadonnées.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a2540'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Header />
        <main className="container" id="main-content">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

