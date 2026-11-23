import React from 'react';
import './globals.css';
import Header from '../components/ui/Header.jsx';
import Footer from '../components/ui/Footer.jsx';
import { ToastProvider } from '../components/ui/ToastProvider.jsx';

export const metadata = {
  title: 'Guichet Unique Dématérialisé — FNPSS (RDC)',
  description: 'FNPSS — Le social dans la solidarité. Portail officiel dématérialisé d\'enrôlement, de partenariat, d\'avis techniques et d\'exonérations pour les ONG et ASBL en RDC.',
  icons: {
    icon: '/brand/favicon-fnpss.png',
    apple: '/brand/favicon-fnpss.png'
  }
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
        <ToastProvider>
          <a href="#main-content" className="skip-link">
            Aller au contenu principal
          </a>
          <Header />
          <main className="container" id="main-content">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
