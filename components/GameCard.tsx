'use client';

import { Game } from '@/data/games';
import { Clock, Star, Gamepad2, ExternalLink } from 'lucide-react';

const statusConfig = {
  'terminé': { label: 'Terminé', cls: 'status-completed' },
  'en cours': { label: 'En cours', cls: 'status-playing' },
  'abandonné': { label: 'Abandonné', cls: 'status-abandoned' },
  'liste de souhaits': { label: 'Wishlist', cls: 'status-wishlist' },
  'infini': { label: '∞ Infini', cls: 'status-infinite' },
};

const platformColors: Record<string, string> = {
  PC: '#60a5fa',
  PS5: '#4f8ef7',
  PS4: '#4f8ef7',
  'Xbox Series': '#4ade80',
  Switch: '#f87171',
  Mobile: '#a78bfa',
};

function titleToHue(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 60 + 250; // 250–310° = blue-purple-violet range
}

interface Props {
  game: Game;
  onClick?: () => void;
}

export default function GameCard({ game, onClick }: Props) {
  const status = statusConfig[game.status];
  const hue = titleToHue(game.title);
  const platformColor = platformColors[game.platforms[0]] ?? '#a78bfa';

  return (
    <div
      className="group game-card-hover flex flex-col overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {/* Cover */}
      <div
        style={{
          aspectRatio: '3/4',
          background: `linear-gradient(160deg, hsl(${hue},55%,18%) 0%, hsl(${hue + 20},40%,10%) 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {game.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.cover}
            alt={game.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
          />
        ) : (
          <Gamepad2 style={{ color: `hsl(${hue},60%,55%)`, opacity: 0.15, width: '2.5rem', height: '2.5rem' }} />
        )}
        <span
          className={status.cls}
          style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            padding: '0.18rem 0.55rem',
            borderRadius: '100px',
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <h3
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
          className="group-hover:text-white transition-colors"
        >
          {game.title}
        </h3>

        {/* Platform */}
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            color: platformColor,
            letterSpacing: '0.04em',
          }}
        >
          {game.platforms.join(' · ')}
        </span>

        {/* Rating */}
        {game.rating !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Star style={{ width: '0.75rem', height: '0.75rem', fill: '#facc15', color: '#facc15' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#facc15' }}>
              {game.rating}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>/10</span>
          </div>
        )}

        {/* Hours */}
        {game.hours !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock style={{ width: '0.7rem', height: '0.7rem', color: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
              {game.hours}h
            </span>
          </div>
        )}

        {/* Comment */}
        {game.comment && (
          <p
            style={{
              fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.3)',
              fontStyle: 'italic',
              lineHeight: 1.4,
              marginTop: '0.15rem',
              paddingTop: '0.4rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            &ldquo;{game.comment}&rdquo;
          </p>
        )}

        {/* Store link */}
        {game.storeUrl && (
          <a
            href={game.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              marginTop: '0.4rem',
              fontSize: '0.65rem',
              fontWeight: 600,
              color: 'rgba(160,32,240,0.7)',
              textDecoration: 'none',
              letterSpacing: '0.03em',
            }}
          >
            <ExternalLink style={{ width: '0.6rem', height: '0.6rem' }} />
            Acheter / voir le jeu
          </a>
        )}
      </div>
    </div>
  );
}
