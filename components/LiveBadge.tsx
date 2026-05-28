'use client';

import { useEffect, useState } from 'react';

interface LiveData { live: boolean; title?: string; viewers?: number; game?: string }

export default function LiveBadge() {
  const [data, setData] = useState<LiveData>({ live: false });

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/twitch/live');
        setData(await res.json());
      } catch { /* ignore */ }
    }
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!data.live) return null;

  return (
    <a
      href="https://www.twitch.tv/weinoz"
      target="_blank"
      rel="noopener noreferrer"
      title={data.title ?? 'En live sur Twitch'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.18rem 0.6rem', borderRadius: '100px',
        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#fca5a5', fontSize: '0.68rem', fontWeight: 700,
        textDecoration: 'none', letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        width: '0.42rem', height: '0.42rem', borderRadius: '50%',
        background: '#ef4444', display: 'inline-block', flexShrink: 0,
        animation: 'pulse-live 1.4s ease-in-out infinite',
      }} />
      EN LIVE
      {data.viewers != null && (
        <span style={{ color: 'rgba(252,165,165,0.55)', fontWeight: 500 }}>
          · {data.viewers.toLocaleString('fr-FR')}
        </span>
      )}
    </a>
  );
}
