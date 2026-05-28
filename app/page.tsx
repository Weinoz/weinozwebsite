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
import { getGames, getTopGameIds } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const socialPlatforms = [
  { name: 'YouTube',   handle: '@weinoz',   href: 'https://www.youtube.com/@weinoz',     icon: YoutubeIcon   },
  { name: 'Twitch',    handle: 'weinoz',    href: 'https://www.twitch.tv/weinoz',         icon: TwitchIcon    },
  { name: 'TikTok',    handle: '@weinoz',   href: 'https://www.tiktok.com/@weinoz',       icon: TikTokIcon    },
  { name: 'Instagram', handle: '@weinoz_',  href: 'https://www.instagram.com/weinoz_/',   icon: InstagramIcon },
  { name: 'X',         handle: '@weinoz_',  href: 'https://x.com/weinoz_',               icon: XIcon         },
  { name: 'Discord',   handle: 'Rejoindre', href: 'https://discord.gg/uBG6UDX56a',       icon: DiscordIcon   },
];

export default async function HomePage() {
  const [youtubeVideos, twitchVideos, allGames, topIds] = await Promise.all([
    process.env.YOUTUBE_CHANNEL_ID
      ? fetchYouTubeVideos(process.env.YOUTUBE_CHANNEL_ID)
      : Promise.resolve([]),
    process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && process.env.TWITCH_LOGIN
      ? fetchTwitchVideos(process.env.TWITCH_CLIENT_ID, process.env.TWITCH_CLIENT_SECRET, process.env.TWITCH_LOGIN)
      : Promise.resolve([]),
    getGames(),
    getTopGameIds(),
  ]);

  const topGames = topIds
    .map((id) => allGames.find((g) => g.id === id))
    .filter(Boolean) as (typeof allGames)[number][];

  const featuredVideos = [...youtubeVideos, ...twitchVideos]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const featuredGames = allGames
    .filter((g) => g.status === 'terminé' || g.status === 'en cours' || g.status === 'infini')
    .slice(0, 8);

  const completedCount = allGames.filter((g) => g.status === 'terminé').length;

  // Game covers for the hero strip
  const heroCoverGames = allGames.filter((g) => g.cover).slice(0, 6);

  return (
    <>
      {/* ── HERO ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #B318F5 0%, #8B0EE8 35%, #6B0DD4 62%, #7B1BF0 85%, #9B12E8 100%)',
          minHeight: '90vh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '5rem 0 4rem',
        }}
      >
        {/* Light glare */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 40%, rgba(255,255,255,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Top: tagline */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full">
          <p className="section-label anim-fade-in" style={{ color: 'rgba(255,255,255,0.5)' }}>
            gaming &amp; bonne humeur 🧦
          </p>
        </div>

        {/* Center: big title */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full">
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
          <p
            className="anim-fade-up"
            style={{
              color: 'rgba(255,255,255,0.55)', maxWidth: '26rem',
              lineHeight: 1.6, marginTop: '1.5rem',
              animationDelay: '0.16s', opacity: 0,
            }}
          >
            Viens te détendre. Mets tes pantoufles et poses-toi.
          </p>
        </div>

        {/* Bottom: CTA + game cover strip */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full anim-fade-up" style={{ animationDelay: '0.24s', opacity: 0 }}>
          {/* Buttons */}
          <div className="flex gap-3 mb-6">
            <Link href="/videos" style={{
              background: 'white', color: '#7B0DE8', fontWeight: 700, fontSize: '0.85rem',
              padding: '0.6rem 1.4rem', borderRadius: '100px',
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            }}>
              Mes vidéos <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/jeux" style={{
              background: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 600, fontSize: '0.85rem',
              padding: '0.6rem 1.4rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.2)',
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <Gamepad2 className="w-4 h-4" /> Jeux
            </Link>
          </div>

          {/* Game covers strip — only if covers exist */}
          {heroCoverGames.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              {heroCoverGames.map((g) => (
                <div
                  key={g.id}
                  title={g.title}
                  style={{
                    width: '70px', height: '52px', borderRadius: '6px', overflow: 'hidden',
                    flexShrink: 0, opacity: 0.7,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    transition: 'opacity 0.2s, transform 0.2s',
                  }}
                  className="hover:opacity-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.cover!} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginLeft: '0.5rem', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>
                {allGames.length} jeux · {completedCount} terminés
              </span>
            </div>
          )}

          {/* Fallback stats when no covers yet */}
          {heroCoverGames.length === 0 && allGames.length > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
              {allGames.length} jeux · {completedCount} terminés · {featuredVideos.length} vidéos récentes
            </p>
          )}
        </div>
      </section>

      {/* ── MON TOP 5 ── */}
      {topGames.length > 0 && (
        <section style={{ background: '#0E0018', padding: '5rem 0' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
              <div>
                <p className="section-label mb-2">Sélection personnelle</p>
                <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  Mon Top {topGames.length}
                </h2>
              </div>
              <Link href="/jeux" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(160,32,240,0.8)', whiteSpace: 'nowrap' }}
                className="hover:text-purple-400 transition-colors">
                Tout voir <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className={`grid gap-4 ${topGames.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
              {topGames.map((g) => <GameCard key={g.id} game={g} />)}
            </div>
          </div>
        </section>
      )}

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
