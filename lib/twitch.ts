import { Video } from '@/data/videos';

async function getToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      next: { revalidate: 3600 * 24 }, // token valide ~60 jours, on revalide toutes les 24h
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function getUserId(clientId: string, token: string, login: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

function parseDuration(d: string): string {
  const h = d.match(/(\d+)h/)?.[1];
  const m = d.match(/(\d+)m/)?.[1];
  const s = d.match(/(\d+)s/)?.[1];
  if (h) return `${h}h ${m ?? '0'}min`;
  if (m) return `${m}:${String(s ?? '0').padStart(2, '0')}`;
  return d;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export async function fetchTwitchVideos(
  clientId: string,
  clientSecret: string,
  login: string
): Promise<Video[]> {
  const token = await getToken(clientId, clientSecret);
  if (!token) return [];

  const userId = await getUserId(clientId, token, login);
  if (!userId) return [];

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${userId}&type=archive&first=10`,
      {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data ?? []).map((v: any) => ({
      id: `twitch-${v.id}`,
      title: v.title,
      platform: 'twitch' as const,
      url: v.url,
      date: v.created_at.split('T')[0],
      duration: parseDuration(v.duration),
      views: v.view_count ? formatViews(v.view_count) : undefined,
      // Twitch thumbnail URL contient %{width}/%{height} à remplacer
      thumbnail: v.thumbnail_url
        ? v.thumbnail_url.replace('%{width}', '640').replace('%{height}', '360')
        : undefined,
    }));
  } catch {
    return [];
  }
}
