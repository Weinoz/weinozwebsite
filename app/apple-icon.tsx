import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #B318F5 0%, #7B0DE8 100%)',
          borderRadius: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '120px',
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          W
        </span>
      </div>
    ),
    { ...size },
  );
}
