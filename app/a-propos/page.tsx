import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  YoutubeIcon, TwitchIcon, TikTokIcon,
  InstagramIcon, XIcon, DiscordIcon,
} from '@/components/SocialIcons';

export const metadata: Metadata = {
  title: 'À propos',
  description: 'Qui est Weinoz ? Gaming, setup PC et stream — tout ce que tu voulais savoir.',
};

const socials = [
  { name: 'YouTube',   href: 'https://www.youtube.com/@weinoz',     icon: YoutubeIcon,   handle: '@weinoz'   },
  { name: 'Twitch',    href: 'https://www.twitch.tv/weinoz',         icon: TwitchIcon,    handle: 'weinoz'    },
  { name: 'TikTok',    href: 'https://www.tiktok.com/@weinoz',       icon: TikTokIcon,    handle: '@weinoz'   },
  { name: 'Instagram', href: 'https://www.instagram.com/weinoz_/',   icon: InstagramIcon, handle: '@weinoz_'  },
  { name: 'X',         href: 'https://x.com/weinoz_',               icon: XIcon,         handle: '@weinoz_'  },
  { name: 'Discord',   href: 'https://discord.gg/uBG6UDX56a',       icon: DiscordIcon,   handle: 'Rejoindre' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '3.5rem' }}>
      <p className="section-label" style={{ marginBottom: '0.75rem' }}>{title}</p>
      <div style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '1rem' }}>
        {children}
      </div>
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{value}</span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--purple-ink)', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(180deg, rgba(160,32,240,0.18) 0%, transparent 100%)',
        padding: '6rem 0 4rem',
        borderBottom: '1px solid rgba(160,32,240,0.1)',
      }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <p className="section-label mb-4">À propos</p>
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 8vw, 5rem)', color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Salut, c&apos;est<br />Weinoz 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1.5rem', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: '34rem' }}>
            Viens te détendre. Mets tes pantoufles et poses-toi. Gaming & bonne humeur, c&apos;est la vibe ici.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16">

        <Section title="Qui suis-je ?">
          <p>
            Je suis Weinoz, créateur de contenu gaming. Je stream sur Twitch, je poste des vidéos sur YouTube,
            et je partage des clips et moments forts sur TikTok et Instagram.
          </p>
          <p style={{ marginTop: '1rem' }}>
            Ma vibe : pas de prise de tête, juste du jeu, de la bonne humeur, et une communauté cool.
            Peu importe le jeu — soulslike, FPS, RPG, ou multijoueur avec les potes — du moment que c&apos;est fun.
          </p>
        </Section>

        <Section title="Ma config PC">
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '0.25rem 1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Spec label="CPU"    value="— à renseigner —" />
            <Spec label="GPU"    value="— à renseigner —" />
            <Spec label="RAM"    value="— à renseigner —" />
            <Spec label="Écran"  value="— à renseigner —" />
            <Spec label="Clavier" value="— à renseigner —" />
            <Spec label="Souris" value="— à renseigner —" />
            <Spec label="Casque" value="— à renseigner —" />
          </div>
        </Section>

        <Section title="Setup stream">
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '0.25rem 1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Spec label="Micro"   value="— à renseigner —" />
            <Spec label="Webcam"  value="— à renseigner —" />
            <Spec label="Logiciel" value="OBS Studio" />
          </div>
        </Section>

        <Section title="Me retrouver">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {socials.map(({ name, href, icon: Icon, handle }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="social-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="social-icon"><Icon className="w-5 h-5" /></span>
                  <span className="social-name">{name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="social-handle hidden sm:block">{handle}</span>
                  <ArrowUpRight className="social-arrow w-4 h-4" />
                </div>
              </a>
            ))}
          </div>
        </Section>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/jeux" style={{ fontSize: '0.85rem', color: 'rgba(160,32,240,0.7)', textDecoration: 'none', fontWeight: 600 }}>
            → Ma jeux-vidéothèque
          </Link>
          <Link href="/videos" style={{ fontSize: '0.85rem', color: 'rgba(160,32,240,0.7)', textDecoration: 'none', fontWeight: 600 }}>
            → Mes vidéos
          </Link>
        </div>
      </div>
    </div>
  );
}
