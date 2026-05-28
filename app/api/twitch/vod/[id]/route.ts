import { NextRequest, NextResponse } from 'next/server';

async function getToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      next: { revalidate: 3600 * 24 },
    });
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json(null);

  const token = await getToken(clientId, clientSecret);
  if (!token) return NextResponse.json(null);

  try {
    const res = await fetch(`https://api.twitch.tv/helix/videos?id=${id}`, {
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json(null);
    const data = await res.json();
    const video = data.data?.[0];
    if (!video) return NextResponse.json(null);

    return NextResponse.json(
      {
        thumbnail: video.thumbnail_url
          ? video.thumbnail_url.replace('%{width}', '640').replace('%{height}', '360')
          : null,
        title: video.title ?? null,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    );
  } catch {
    return NextResponse.json(null);
  }
}
