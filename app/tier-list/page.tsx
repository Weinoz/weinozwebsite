import type { Metadata } from 'next';
import Link from 'next/link';
import { getGames } from '@/lib/redis';
import { gameSlug } from '@/lib/utils';
import { GameTier } from '@/data/games';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tier List',
  description: 'Mon classement perso — de S (légendaire) à D (bof). Uniquement les jeux que j\'ai testés.',
};

const TIERS: GameTier[] = ['S', 'A', 'B', 'C', 'D'];

const TIER_CONFIG: Record<GameTier, { color: string; bg: string; shadow: string }> = {
  S: { color: '#FF4444', bg: 'rgba(255,68,68,0.12)',    shadow: 'rgba(255,68,68,0.15)'    },
  A: { color: '#FF8C00', bg: 'rgba(255,140,0,0.12)',    shadow: 'rgba(255,140,0,0.15)'    },
  B: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)',    shadow: 'rgba(255,215,0,0.15)'    },
  C: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    shadow: 'rgba(34,197,94,0.15)'    },
  D: { color: '#818cf8', bg: 'rgba(129,140,248,0.12)',  shadow: 'rgba(129,140,248,0.15)'  },
};

export default async function TierListPage() {
  const games = await getGames();

  const tiered = TIERS.map((tier) => ({
    tier,
    cfg: TIER_CONFIG[tier],
    games: games.filter((g) => g.tier === tier),
  }));

  const totalTiered   = games.filter((g) => g.tier).length;
  const totalUntied   = games.filter((g) => !g.tier && g.status !== 'liste de souhaits').length;
  const hasAnyTier    = totalTiered > 0;

  return (
    <div style={{ background: 'var(--purple-ink)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(180deg, rgba(160,32,240,0.15) 0%, transparent 100%)',
        padding: '5rem 0 3.5rem',
        borderBottom: '1px solid rgba(160,32,240,0.1)',
      }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <p className="section-label mb-3">Classement personnel</p>
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 8vw, 5rem)', color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Tier List
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '1rem', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '30rem' }}>
            Mon classement perso — de <strong style={{ color: TIER_CONFIG.S.color }}>S</strong> (légendaire) à <strong style={{ color: TIER_CONFIG.D.color }}>D</strong> (bof).
            Uniquement les jeux que j&apos;ai testés.
          </p>
          {hasAnyTier && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
              {totalTiered} jeux classés · {totalUntied} non classés
            </p>
          )}
        </div>
      </section>

      {/* ── Tier rows ── */}
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {!hasAnyTier ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'rgba(255,255,255,0.2)' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎮</p>
            <p style={{ fontSize: '1rem', fontWeight: 700 }}>La tier list est vide pour l&apos;instant</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: 'rgba(255,255,255,0.15)' }}>
              Assigne un tier aux jeux depuis le panel admin
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {tiered.map(({ tier, cfg, games: tierGames }) => (
              <div
                key={tier}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: `1px solid ${cfg.color}28`,
                  opacity: tierGames.length === 0 ? 0.22 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Tier label */}
                <div style={{
                  width: '70px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: cfg.bg,
                  borderRight: `1px solid ${cfg.color}28`,
                }}>
                  <span style={{
                    fontSize: '2.25rem',
                    fontWeight: 900,
                    color: cfg.color,
                    letterSpacing: '-0.04em',
                    textShadow: `0 0 24px ${cfg.shadow}`,
                  }}>
                    {tier}
                  </span>
                </div>

                {/* Game covers */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                  padding: '0.5rem 0.6rem',
                  background: 'rgba(255,255,255,0.015)',
                  minHeight: '84px',
                  alignContent: 'center',
                  alignItems: 'center',
                }}>
                  {tierGames.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.1)', padding: '0 0.25rem' }}>—</span>
                  ) : (
                    tierGames.map((g) => (
                      <Link
                        key={g.id}
                        href={`/jeux/${gameSlug(g.title)}`}
                        title={g.title}
                        className="group"
                        style={{
                          position: 'relative',
                          display: 'block',
                          width: '90px',
                          height: '64px',
                          borderRadius: '7px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                          textDecoration: 'none',
                        }}
                      >
                        {g.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={g.cover}
                            alt={g.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
                            className="group-hover:scale-105"
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            background: cfg.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.3rem',
                            textAlign: 'center',
                          }}>
                            <span style={{ fontSize: '0.58rem', fontWeight: 700, color: cfg.color, lineHeight: 1.3 }}>
                              {g.title}
                            </span>
                          </div>
                        )}

                        {/* Title overlay on hover */}
                        <div
                          className="opacity-0 group-hover:opacity-100"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)',
                            display: 'flex',
                            alignItems: 'flex-end',
                            transition: 'opacity 0.18s',
                          }}
                        >
                          <p style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: 'white',
                            padding: '0.3rem 0.35rem',
                            lineHeight: 1.3,
                          }}>
                            {g.title}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        {hasAnyTier && (
          <div style={{ marginTop: '3rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {TIERS.map((t) => (
              <span key={t} style={{
                fontSize: '0.72rem',
                color: TIER_CONFIG[t].color,
                background: TIER_CONFIG[t].bg,
                border: `1px solid ${TIER_CONFIG[t].color}30`,
                padding: '0.2rem 0.7rem',
                borderRadius: '100px',
                fontWeight: 700,
              }}>
                {t} — {{
                  S: 'Chef-d\'œuvre',
                  A: 'Excellent',
                  B: 'Bon',
                  C: 'Correct',
                  D: 'Bof',
                }[t]}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
