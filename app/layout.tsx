import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'WEINOZ', template: '%s — WEINOZ' },
  description: 'Gaming & bonne humeur 🧦 — Viens te détendre, mets tes pantoufles et poses-toi.',
  keywords: ['weinoz', 'gaming', 'twitch', 'youtube', 'jeux vidéo', 'stream', 'gaming fr'],
  openGraph: {
    title: 'WEINOZ',
    description: 'Gaming & bonne humeur 🧦 — Viens te détendre, mets tes pantoufles et poses-toi.',
    url: 'https://weinoz.com',
    siteName: 'WEINOZ',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@weinoz_',
    creator: '@weinoz_',
  },
  metadataBase: new URL('https://weinoz.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex flex-col min-h-screen antialiased">
        {/* Grain texture overlay */}
        <div className="grain-layer" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id="grain-filter">
              <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain-filter)" />
          </svg>
        </div>

        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
