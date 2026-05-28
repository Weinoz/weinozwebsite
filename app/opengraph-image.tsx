import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'WEINOZ — gaming & bonne humeur 🧦';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #B318F5 0%, #8B0EE8 35%, #6B0DD4 62%, #7B1BF0 85%, #9B12E8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Light spot */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'radial-gradient(ellipse at 25% 40%, rgba(255,255,255,0.09) 0%, transparent 55%)',
        }} />

        <div style={{ color: 'white', fontSize: 168, fontWeight: 900, letterSpacing: '-6px', lineHeight: 1 }}>
          WEINOZ
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 38, marginTop: 28, letterSpacing: '0.02em' }}>
          gaming &amp; bonne humeur 🧦
        </div>
      </div>
    ),
    { ...size }
  );
}
