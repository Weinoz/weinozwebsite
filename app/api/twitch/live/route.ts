import { NextResponse } from 'next/server';

async function getToken(): Promise<string | null> {
  const { TWITCH_CLIENT_ID: id, TWITCH_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) return null;
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${id}&client_secret=${secret}&grant_type=client_credentials`,
      next: { revalidate: 3600 * 24 },
    });
    const data = await res.json();
    return data.access_token ?? null;
  } catch { return null; }
}

export async function GET() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const login   = process.env.TWITCH_LOGIN;
  if (!clientId || !login) return NextResponse.json({ live: false });

  const token = await getToken();
  if (!token) return NextResponse.json({ live: false });

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${login}`,
      {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        next: { revalidate: 60 },
      }
    );
    const data = await res.json();
    const stream = data.data?.[0];
    if (!stream) return NextResponse.json({ live: false });
    return NextResponse.json({
      live: true,
      title:   stream.title,
      viewers: stream.viewer_count,
      game:    stream.game_name,
    });
  } catch {
    return NextResponse.json({ live: false });
  }
}
