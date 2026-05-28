import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #B318F5 0%, #7B0DE8 100%)',
          borderRadius: '7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '22px',
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
