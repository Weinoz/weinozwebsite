import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGames } from '@/lib/redis';
import { gameSlug } from '@/lib/utils';
import { extractSteamAppId, fetchSteamPrice } from '@/lib/steam';
import { ArrowLeft, Star, Clock, ExternalLink, Tag } from 'lucide-react';
import LinkedVideoCard from '@/components/LinkedVideoCard';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const games = await getGames();
  const game = games.find((g) => gameSlug(g.title) === slug);
  if (!game) return { title: 'Jeu introuvable' };
  return {
    title: game.title,
    description: game.comment
      ? `"${game.comment}" — ${game.platforms.join(' · ')} · ${game.status}`
      : `${game.title} · ${game.platforms.join(' · ')} · ${game.status}`,
    openGraph: {
      title: `${game.title} — WEINOZ`,
      description: game.comment ?? `${game.title} · ${game.platforms.join(' · ')}`,
      images: game.cover ? [{ url: game.cover, width: 1280, height: 720 }] : [],
    },
  };
}

const STATUS: Record<string, { label: string; color: string }> = {
  'terminé':           { label: 'Terminé',   color: '#22c55e' },
  'en cours':          { label: 'En cours',  color: '#6366f1' },
  'infini':            { label: '∞ Infini',  color: '#06b6d4' },
  'abandonné':         { label: 'Abandonné', color: '#ef4444' },
  'liste de souhaits': { label: 'Wishlist',  color: '#eab308' },
};

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const games = await getGames();
  const game = games.find((g) => gameSlug(g.title) === slug);
  if (!game) notFound();

  const status = STATUS[game.status] ?? { label: game.status, color: '#a78bfa' };
  const ratingStars = game.rating != null ? Math.round(game.rating / 2) : 0;

  // Fetch Steam price if the store URL is a Steam link
  const steamAppId = game.storeUrl ? extractSteamAppId(game.storeUrl) : null;
  const price = steamAppId ? await fetchSteamPrice(steamAppId) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--purple-ink)' }}>
      {/* Cover hero */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '21/9', maxHeight: '420px',
        overflow: 'hidden', background: '#1a002e',
      }}>
        {game.cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.cover} alt={game.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.55)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,0,24,1) 0%, transparent 60%)' }} />
          </>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8" style={{ marginTop: '-4rem', position: 'relative', paddingBottom: '5rem' }}>
        {/* Back link */}
        <Link href="/jeux" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
          marginBottom: '1.5rem',
        }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Retour à la bibliothèque
        </Link>

        {/* Title + badges */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{
              padding: '0.25rem 0.8rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
              background: `${status.color}22`, color: status.color, border: `1px solid ${status.color}44`,
            }}>
              {status.label}
            </span>
            <span style={{
              padding: '0.25rem 0.8rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {game.platforms.join(' · ')}
            </span>
          </div>
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: 'white', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {game.title}
          </h1>
          {(game.year || game.genre) && (
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.5rem' }}>
              {[game.year, game.genre].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Stats */}
        {(game.rating != null || game.hours != null) && (
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', marginBottom: '1.5rem' }}>
            {game.rating != null && (
              <div>
                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Note</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#facc15', lineHeight: 1 }}>{game.rating}</span>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>/10</span>
                    <div style={{ display: 'flex', gap: '0.1rem', marginTop: '0.1rem' }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} style={{ width: '0.85rem', height: '0.85rem', fill: s <= ratingStars ? '#facc15' : 'transparent', color: s <= ratingStars ? '#facc15' : 'rgba(255,255,255,0.15)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {game.hours != null && (
              <div>
                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Temps de jeu</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock style={{ width: '1rem', height: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{game.hours}h</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comment */}
        {game.comment && (
          <div style={{ padding: '1.25rem', background: 'rgba(160,32,240,0.06)', borderRadius: '16px', borderLeft: '3px solid rgba(160,32,240,0.4)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.62rem', color: 'rgba(160,32,240,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.6rem' }}>
              Mon avis
            </p>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontStyle: 'italic' }}>
              &ldquo;{game.comment}&rdquo;
            </p>
          </div>
        )}

        {/* Store link + price */}
        {game.storeUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.6rem 1.1rem', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textDecoration: 'none',
            }}>
              <ExternalLink className="w-4 h-4" />
              {steamAppId ? 'Voir sur Steam' : 'Voir / acheter le jeu'}
            </a>

            {price && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {price.isFree ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.45rem 0.9rem', borderRadius: '10px',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                    color: '#86efac', fontSize: '0.9rem', fontWeight: 700,
                  }}>
                    <Tag className="w-3.5 h-3.5" /> Gratuit
                  </span>
                ) : price.discount > 0 ? (
                  <>
                    <span style={{
                      padding: '0.2rem 0.55rem', borderRadius: '6px',
                      background: '#16a34a', color: 'white',
                      fontSize: '0.78rem', fontWeight: 800,
                    }}>
                      -{price.discount}%
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>
                      {price.initialFormatted}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#86efac' }}>
                      {price.finalFormatted}
                    </span>
                  </>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.45rem 0.9rem', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 700,
                  }}>
                    <Tag className="w-3.5 h-3.5" /> {price.finalFormatted}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Linked videos */}
        {game.linkedVideos && game.linkedVideos.length > 0 && (
          <div>
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
              Mes vidéos sur ce jeu
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {game.linkedVideos.map((url, i) => (
                <LinkedVideoCard key={i} url={url} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
