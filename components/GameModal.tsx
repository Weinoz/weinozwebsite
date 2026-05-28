'use client';

import { useEffect, useState, useCallback } from 'react';
import { Game } from '@/data/games';
import { X, Star, Clock, ExternalLink, Play, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRawgId(gameId: string): number | null {
  if (!gameId.startsWith('rawg-')) return null;
  const n = parseInt(gameId.slice(5));
  return isNaN(n) ? null : n;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&/\s]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
    /youtube\.com\/embed\/([^?&/\s]+)/,
    /youtube\.com\/shorts\/([^?&/\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isTwitch(url: string) {
  return url.includes('twitch.tv') || url.includes('clips.twitch.tv');
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string }> = {
  'terminé':           { label: 'Terminé',   color: '#22c55e' },
  'en cours':          { label: 'En cours',  color: '#6366f1' },
  'infini':            { label: '∞ Infini',  color: '#06b6d4' },
  'abandonné':         { label: 'Abandonné', color: '#ef4444' },
  'liste de souhaits': { label: 'Wishlist',  color: '#eab308' },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  game: Game;
  onClose: () => void;
}

export default function GameModal({ game, onClose }: Props) {
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const allImages: string[] = [
    ...(game.cover ? [game.cover] : []),
    ...screenshots,
  ];
  const activeImage = allImages[activeIdx] ?? null;

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Escape key
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') setActiveIdx((i) => Math.min(i + 1, allImages.length - 1));
    if (e.key === 'ArrowLeft')  setActiveIdx((i) => Math.max(i - 1, 0));
  }, [onClose, allImages.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Fetch RAWG screenshots
  useEffect(() => {
    const rawgId = getRawgId(game.id);
    if (!rawgId) return;
    fetch(`/api/rawg/${rawgId}/screenshots`)
      .then(r => r.json())
      .then((data: { image: string }[]) => setScreenshots(data.map(s => s.image)))
      .catch(() => {});
  }, [game.id]);

  const status = STATUS[game.status] ?? { label: game.status, color: '#a78bfa' };
  const ratingStars = game.rating != null ? Math.round(game.rating / 2) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fade-in 0.2s ease forwards',
        }}
      />

      {/* Scroll container */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          overflowY: 'auto',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '2rem 1rem',
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '860px',
            background: '#0D0020',
            border: '1px solid rgba(160,32,240,0.2)',
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative',
            animation: 'modal-slide-up 0.25s ease forwards',
            marginBottom: '2rem',
          }}
        >
          {/* ── Close ── */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10,
              width: '2rem', height: '2rem',
              background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', cursor: 'pointer',
            }}
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── Main image ── */}
          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#1a002e' }}>
            {activeImage
              ? <img src={activeImage} alt={game.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🎮</div>
            }
            {/* Arrow nav */}
            {allImages.length > 1 && (
              <>
                <button onClick={() => setActiveIdx(i => Math.max(i - 1, 0))} disabled={activeIdx === 0} style={{
                  position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                  width: '2rem', height: '2rem', borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeIdx === 0 ? 0.3 : 1,
                }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveIdx(i => Math.min(i + 1, allImages.length - 1))} disabled={activeIdx === allImages.length - 1} style={{
                  position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                  width: '2rem', height: '2rem', borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeIdx === allImages.length - 1 ? 0.3 : 1,
                }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* ── Thumbnail strip ── */}
          {allImages.length > 1 && (
            <div style={{
              display: 'flex', gap: '0.4rem', padding: '0.6rem 1rem',
              overflowX: 'auto', background: 'rgba(0,0,0,0.35)',
            }}>
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setActiveIdx(i)} style={{
                  flexShrink: 0, width: '76px', height: '50px', borderRadius: '5px',
                  overflow: 'hidden', padding: 0, background: 'none', cursor: 'pointer',
                  border: `2px solid ${i === activeIdx ? 'rgba(160,32,240,0.9)' : 'transparent'}`,
                  transition: 'border-color 0.15s', opacity: i === activeIdx ? 1 : 0.55,
                }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          {/* ── Body ── */}
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Title + badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {game.title}
                </h2>
                {(game.year || game.genre) && (
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem' }}>
                    {[game.year, game.genre].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
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
                  {game.platform}
                </span>
              </div>
            </div>

            {/* Stats */}
            {(game.rating != null || game.hours != null) && (
              <div style={{
                display: 'flex', gap: '2.5rem', flexWrap: 'wrap',
                padding: '1rem 1.25rem',
                background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
              }}>
                {game.rating != null && (
                  <div>
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Note</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#facc15', lineHeight: 1 }}>{game.rating}</span>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>/10</span>
                        <div style={{ display: 'flex', gap: '0.1rem', marginTop: '0.1rem' }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} style={{
                              width: '0.75rem', height: '0.75rem',
                              fill: s <= ratingStars ? '#facc15' : 'transparent',
                              color: s <= ratingStars ? '#facc15' : 'rgba(255,255,255,0.15)',
                            }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {game.hours != null && (
                  <div>
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Temps de jeu</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock style={{ width: '1rem', height: '1rem', color: 'rgba(255,255,255,0.35)' }} />
                      <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{game.hours}h</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comment */}
            {game.comment && (
              <div style={{
                padding: '1rem 1.25rem',
                background: 'rgba(160,32,240,0.06)',
                borderRadius: '12px',
                borderLeft: '3px solid rgba(160,32,240,0.4)',
              }}>
                <p style={{ fontSize: '0.62rem', color: 'rgba(160,32,240,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Mon avis
                </p>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, fontStyle: 'italic' }}>
                  &ldquo;{game.comment}&rdquo;
                </p>
              </div>
            )}

            {/* Store link */}
            {game.storeUrl && (
              <a
                href={game.storeUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.55rem 1rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', textDecoration: 'none',
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Voir / acheter le jeu
              </a>
            )}

            {/* Linked videos */}
            {game.linkedVideos && game.linkedVideos.length > 0 && (
              <div>
                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Mes vidéos sur ce jeu
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {game.linkedVideos.map((url, i) => {
                    const ytId = getYouTubeId(url);
                    if (ytId) return (
                      <div key={i} style={{ borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9' }}>
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                          title={`Vidéo ${i + 1}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                      </div>
                    );
                    if (isTwitch(url)) return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.75rem 1rem', borderRadius: '10px',
                        background: 'rgba(145,70,255,0.1)', border: '1px solid rgba(145,70,255,0.25)',
                        color: '#c084fc', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
                      }}>
                        <Play className="w-4 h-4" /> Voir sur Twitch
                      </a>
                    );
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.65rem 1rem', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.8rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        <ExternalLink className="w-4 h-4" style={{ flexShrink: 0 }} /> {url}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
