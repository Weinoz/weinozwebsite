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

// ── Shared live thumbnail (no API needed) ────────────────────────────────────
export function twitchLiveThumbnail(login: string) {
  return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login.toLowerCase()}-640x360.jpg`;
}

// ── Live info (full) ──────────────────────────────────────────────────────────

export interface LiveInfo {
  streamId: string;
  title: string;
  gameName: string;
  twitchGameId: string;
  viewerCount: number;
  startedAt: string; // ISO
  thumbnailUrl: string;
}

export async function fetchTwitchLiveInfo(
  clientId: string,
  clientSecret: string,
  login: string,
): Promise<LiveInfo | null> {
  const token = await getToken(clientId, clientSecret);
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${login}`,
      {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const s = data.data?.[0];
    if (!s) return null;
    return {
      streamId: s.id,
      title: s.title ?? '',
      gameName: s.game_name ?? '',
      twitchGameId: s.game_id ?? '',
      viewerCount: s.viewer_count ?? 0,
      startedAt: s.started_at,
      thumbnailUrl: s.thumbnail_url
        ? s.thumbnail_url.replace('{width}', '640').replace('{height}', '360')
        : twitchLiveThumbnail(login),
    };
  } catch {
    return null;
  }
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export interface ScheduleSegment {
  id: string;
  startTime: string; // ISO
  endTime: string;
  title: string;
  gameName: string | null;
}

export async function fetchTwitchSchedule(
  clientId: string,
  clientSecret: string,
  login: string,
  count = 5,
): Promise<ScheduleSegment[]> {
  const token = await getToken(clientId, clientSecret);
  if (!token) return [];
  const userId = await getUserId(clientId, token, login);
  if (!userId) return [];
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/schedule?broadcaster_id=${userId}&first=${count}`,
      {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data?.segments ?? []).map((seg: any) => ({
      id: seg.id,
      startTime: seg.start_time,
      endTime: seg.end_time,
      title: seg.title ?? '',
      gameName: seg.category?.name ?? null,
    }));
  } catch {
    return [];
  }
}

/** Check if the user is currently live and return the stream game (for game-capture logic). */
export async function fetchTwitchLiveStream(
  clientId: string,
  clientSecret: string,
  login: string,
): Promise<{ streamId: string; gameName: string; twitchGameId: string } | null> {
  const token = await getToken(clientId, clientSecret);
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${login}`,
      {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        cache: 'no-store', // always fresh — we need to know right now
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const stream = data.data?.[0];
    if (!stream || !stream.game_name) return null;
    return {
      streamId: stream.id,
      gameName: stream.game_name,
      twitchGameId: stream.game_id ?? '',
    };
  } catch {
    return null;
  }
}

// ── Clips ─────────────────────────────────────────────────────────────────────

async function batchGameNames(
  clientId: string,
  token: string,
  gameIds: string[],
): Promise<Map<string, string>> {
  if (!gameIds.length) return new Map();
  const unique = [...new Set(gameIds)].slice(0, 100);
  try {
    const qs = unique.map((id) => `id=${id}`).join('&');
    const res = await fetch(`https://api.twitch.tv/helix/games?${qs}`, {
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return new Map();
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Map((data.data ?? []).map((g: any) => [g.id, g.name]));
  } catch {
    return new Map();
  }
}

export async function fetchTwitchClips(
  clientId: string,
  clientSecret: string,
  login: string,
  count = 20,
): Promise<Video[]> {
  const token = await getToken(clientId, clientSecret);
  if (!token) return [];
  const userId = await getUserId(clientId, token, login);
  if (!userId) return [];

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=${count}`,
      {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clips: any[] = data.data ?? [];

    const gameIds = clips.map((c) => c.game_id).filter(Boolean);
    const gameNameMap = await batchGameNames(clientId, token, gameIds);

    return clips.map((c) => ({
      id: `twitch-clip-${c.id}`,
      title: c.title ?? `Clip — ${login}`,
      platform: 'twitch' as const,
      isClip: true,
      twitchGameId: c.game_id ?? undefined,
      twitchGameName: c.game_id ? (gameNameMap.get(c.game_id) ?? undefined) : undefined,
      url: c.url,
      date: (c.created_at ?? '').split('T')[0],
      duration: c.duration ? `${Math.round(c.duration)}s` : undefined,
      views: c.view_count ? formatViews(c.view_count) : undefined,
      thumbnail: c.thumbnail_url ?? undefined,
    }));
  } catch {
    return [];
  }
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
      streamId: v.stream_id ?? undefined, // links the VOD back to its live session
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
