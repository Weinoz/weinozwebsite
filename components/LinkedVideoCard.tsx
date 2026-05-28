'use client';

import { useState } from 'react';
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

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  url: string;
  index: number;
}

export default function LinkedVideoCard({ url, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  const ytId      = getYouTubeId(url);
  const twitchId  = getTwitchVideoId(url);

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
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '50%',
            background: 'rgba(220,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'transform 0.15s',
          }}>
            <Play style={{ color: 'white', width: '22px', height: '22px', marginLeft: '3px' }} />
          </div>
        </div>
        {/* Platform badge */}
        <span style={{
          position: 'absolute', bottom: '0.55rem', left: '0.6rem',
          background: 'rgba(0,0,0,0.72)', borderRadius: '4px',
          padding: '0.1rem 0.45rem', fontSize: '0.62rem', fontWeight: 700, color: '#ff6b6b',
        }}>
          YouTube
        </span>
      </button>
    );
  }

  // ── Twitch VOD ────────────────────────────────────────────────────────────
  if (twitchId) {
    if (expanded) {
      // parent must match the hostname serving the page
      const parent =
        typeof window !== 'undefined' ? window.location.hostname : 'weinoz.com';
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
          background: 'linear-gradient(135deg, #1a0533 0%, #2d0b66 100%)',
        }}
      >
        {/* Subtle grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(160,32,240,0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        {/* Play button */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '50%',
            background: 'rgba(145,70,255,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(145,70,255,0.4)',
          }}>
            <Play style={{ color: 'white', width: '22px', height: '22px', marginLeft: '3px' }} />
          </div>
        </div>
        {/* Platform badge */}
        <span style={{
          position: 'absolute', bottom: '0.55rem', left: '0.6rem',
          background: 'rgba(0,0,0,0.7)', borderRadius: '4px',
          padding: '0.1rem 0.45rem', fontSize: '0.62rem', fontWeight: 700, color: '#c084fc',
        }}>
          Twitch VOD
        </span>
      </button>
    );
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
