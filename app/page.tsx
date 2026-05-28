import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Gamepad2 } from 'lucide-react';
import VideoCard from '@/components/VideoCard';
import GameCard from '@/components/GameCard';
import {
  YoutubeIcon, TwitchIcon, TikTokIcon,
  InstagramIcon, XIcon, DiscordIcon,
} from '@/components/SocialIcons';
import { fetchYouTubeVideos } from '@/lib/youtube';
import { fetchTwitchVideos } from '@/lib/twitch';
import { getGames } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const socialPlatforms = [
  { name: 'YouTube',   handle: '@weinoz',    href: 'https://www.youtube.com/@weinoz',        icon: YoutubeIcon,   desc: 'Vidéos gaming & vlogs' },
  { name: 'Twitch',    handle: 'weinoz',     href: 'https://www.twitch.tv/weinoz',            icon: TwitchIcon,    desc: 'Lives gaming' },
  { name: 'TikTok',    handle: '@weinoz',    href: 'https://www.tiktok.com/@weinoz',          icon: TikTokIcon,    desc: 'Clips & highlights' },
  { name: 'Instagram', handle: '@weinoz_',   href: 'https://www.instagram.com/weinoz_/',      icon: InstagramIcon, desc: 'Photos & stories' },
  { name: 'X',         handle: '@weinoz_',   href: 'https://x.com/weinoz_',                  icon: XIcon,         desc: 'Actu & pensées' },
  { name: 'Discord',   handle: 'Rejoindre',  href: 'https://discord.gg/uBG6UDX56a',          icon: DiscordIcon,   desc: 'La communauté' },
];

export default async function HomePage() {
  // Fetch everything in parallel
  const [youtubeVideos, twitchVideos, allGames] = await Promise.all([
    process.env.YOUTUBE_CHANNEL_ID
      ? fetchYouTubeVideos(process.env.YOUTUBE_CHANNEL_ID)
      : Promise.resolve([]),
    process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && process.env.TWITCH_LOGIN
      ? fetchTwitchVideos(process.env.TWITCH_CLIENT_ID, process.env.TWITCH_CLIENT_SECRET, process.env.TWITCH_LOGIN)
      : Promise.resolve([]),
    getGames(),
  ]);

  const featuredVideos = [...youtubeVideos, ...twitchVideos]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const featuredGames = allGames
    .filter((g) => g.status === 'terminé' || g.status === 'en cours')
    .slice(0, 8);

  const completedCount = allGames.filter((g) => g.status === 'terminé').length;

  return (
    <>
      {/* ── HERO ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #B318F5 0%, #8B0EE8 35%, #6B0DD4 62%, #7B1BF0 85%, #9B12E8 100%)',
          minHeight: '95vh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 0 5rem',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 20% 40%, rgba(255,255,255,0.07) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full">
          <p className="section-label mb-6 anim-fade-in" style={{ color: 'rgba(255,255,255,0.5)', animationDelay: '0s' }}>
            gaming &amp; bonne humeur 🧦
          </p>
          <h1
            className="anim-fade-up"
            style={{
              fontSize: 'clamp(4.5rem, 17vw, 14rem)',
              fontWeight: 900, lineHeight: 0.9, color: 'white',
              letterSpacing: '-0.03em', animationDelay: '0.08s', opacity: 0,
            }}
          >
            WEINOZ
          </h1>
          <div
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mt-8 anim-fade-up"
            style={{ animationDelay: '0.2s', opacity: 0 }}
          >
            <p style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '22rem', lineHeight: 1.6 }}>
              Viens te détendre. Mets tes pantoufles et poses-toi.
            </p>
            <div className="flex gap-3">
              <Link href="/videos" style={{
                background: 'white', color: '#7B0DE8', fontWeight: 700, fontSize: '0.85rem',
                padding: '0.6rem 1.4rem', borderRadius: '100px',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'opacity 0.2s',
              }}>
                Mes vidéos <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/jeux" style={{
                background: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 600, fontSize: '0.85rem',
                padding: '0.6rem 1.4rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.2)',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'background 0.2s',
              }}>
                <Gamepad2 className="w-4 h-4" /> Jeux
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── RÉSEAUX ── */}
      <section style={{ background: 'var(--purple-ink)', padding: '5rem 0' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <p className="section-label mb-6">Mes réseaux</p>
          <div>
            {socialPlatforms.map(({ name, handle, href, icon: Icon }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="social-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
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
        </div>
      </section>

      {/* ── VIDÉOS ── */}
      {featuredVideos.length > 0 && (
        <section style={{ background: '#0E0018', padding: '5rem 0' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
              <div>
                <p className="section-label mb-2">Dernières vidéos</p>
                <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  Ce que j&apos;ai pondu
                </h2>
              </div>
              <Link href="/videos" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(160,32,240,0.8)', whiteSpace: 'nowrap' }}
                className="hover:text-purple-400 transition-colors">
                Tout voir <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredVideos.map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── JEUX ── */}
      {featuredGames.length > 0 && (
        <section style={{ background: 'var(--purple-ink)', padding: '5rem 0 6rem' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
              <div>
                <p className="section-label mb-2">Jeux-vidéothèque</p>
                <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  Jeux testés, validés (ou pas)
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.4rem' }}>
                  {allGames.length} jeux · {completedCount} terminés
                </p>
              </div>
              <Link href="/jeux" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(160,32,240,0.8)', whiteSpace: 'nowrap' }}
                className="hover:text-purple-400 transition-colors">
                Tout voir <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {featuredGames.map((g) => <GameCard key={g.id} game={g} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
