'use client';

import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/\s]+)/,
  );
  return m?.[1] ?? null;
}

function getTwitchVideoId(url: string): string | null {
  const m = url.match(/twitch\.tv\/videos\/(\d+)/);
  return m?.[1] ?? null;
}

// ── shared overlay ────────────────────────────────────────────────────────────

function PlayOverlay({ color }: { color: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '54px', height: '54px', borderRadius: '50%',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
      }}>
        <Play style={{ color: 'white', width: '22px', height: '22px', marginLeft: '3px' }} />
      </div>
    </div>
  );
}

function PlatformBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      position: 'absolute', bottom: '0.55rem', left: '0.6rem',
      background: 'rgba(0,0,0,0.72)', borderRadius: '4px',
      padding: '0.1rem 0.45rem', fontSize: '0.62rem', fontWeight: 700, color,
    }}>
      {label}
    </span>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  url: string;
  index: number;
}

export default function LinkedVideoCard({ url, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  const ytId     = getYouTubeId(url);
  const twitchId = getTwitchVideoId(url);

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (ytId) {
    if (expanded) {
      return (
        <div style={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9' }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`}
            title={`Vidéo ${index + 1}`}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      );
    }
    return (
      <button
        onClick={() => setExpanded(true)}
        title="Lire la vidéo"
        style={{
          position: 'relative', borderRadius: '12px', overflow: 'hidden',
          aspectRatio: '16/9', display: 'block', width: '100%',
          cursor: 'pointer', border: 'none', padding: 0, background: '#000',
        }}
      >
        <img
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          alt={`Vidéo YouTube ${index + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }}
        />
        <PlayOverlay color="rgba(220,0,0,0.92)" />
        <PlatformBadge label="YouTube" color="#ff6b6b" />
      </button>
    );
  }

  // ── Twitch VOD ────────────────────────────────────────────────────────────
  if (twitchId) {
    return <TwitchVodCard twitchId={twitchId} index={index} url={url} />;
  }

  // ── Generic fallback ──────────────────────────────────────────────────────
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.75rem 1rem', borderRadius: '10px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.85rem',
      }}
    >
      <Play style={{ width: '1rem', height: '1rem', flexShrink: 0 }} /> Voir la vidéo
    </a>
  );
}

// ── Twitch sub-component (needs useEffect for thumbnail fetch) ────────────────

function TwitchVodCard({ twitchId, index, url }: { twitchId: string; index: number; url: string }) {
  const [expanded, setExpanded]     = useState(false);
  const [thumbnail, setThumbnail]   = useState<string | null>(null);
  const [thumbLoaded, setThumbLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/twitch/vod/${twitchId}`)
      .then((r) => r.json())
      .then((d) => { if (d?.thumbnail) setThumbnail(d.thumbnail); })
      .catch(() => {/* no-op — placeholder stays */});
  }, [twitchId]);

  if (expanded) {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'weinoz.com';
    return (
      <div style={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9' }}>
        <iframe
          src={`https://player.twitch.tv/?video=${twitchId}&parent=${parent}&autoplay=true`}
          title={`VOD Twitch ${index + 1}`}
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      title="Regarder le VOD Twitch"
      style={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden',
        aspectRatio: '16/9', display: 'block', width: '100%',
        cursor: 'pointer', border: 'none', padding: 0,
        // Show placeholder gradient until thumbnail loads
        background: 'linear-gradient(135deg, #1a0533 0%, #2d0b66 100%)',
      }}
    >
      {/* Real thumbnail — fades in once loaded */}
      {thumbnail && (
        <img
          src={thumbnail}
          alt={`VOD Twitch ${index + 1}`}
          onLoad={() => setThumbLoaded(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: thumbLoaded ? 0.85 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Placeholder grid (visible until thumbnail loads) */}
      {!thumbLoaded && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(160,32,240,0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
      )}

      <PlayOverlay color="rgba(145,70,255,0.88)" />
      <PlatformBadge label="Twitch VOD" color="#c084fc" />

      {/* External link — opens in new tab without expanding */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Ouvrir sur Twitch"
        style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'rgba(0,0,0,0.6)', borderRadius: '4px',
          padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 700,
          color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
        }}
      >
        ↗
      </a>
    </button>
  );
}
