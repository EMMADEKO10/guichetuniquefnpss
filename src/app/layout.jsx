import React from 'react';
import './globals.css';
import Header from '../components/ui/Header.jsx';
import Footer from '../components/ui/Footer.jsx';

export const metadata = {
  title: 'Guichet Unique Dématérialisé — FNPSS (RDC)',
  description: 'Portail officiel dématérialisé d\'enrôlement, de partenariat, d\'avis techniques et d\'exonérations pour les ONG et ASBL en RDC.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#0a2540'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
      </head>
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
