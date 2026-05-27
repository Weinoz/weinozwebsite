import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Weinoz', template: '%s — Weinoz' },
  description: 'Créateur de contenu gaming. Retrouve mes vidéos, streams et ma jeux-vidéothèque.',
  openGraph: {
    title: 'Weinoz',
    description: 'Créateur de contenu gaming.',
    url: 'https://weinoz.com',
    siteName: 'Weinoz',
  },
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
