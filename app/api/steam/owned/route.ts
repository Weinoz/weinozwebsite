import { NextResponse } from 'next/server';
import { SteamOwnedGame } from '@/lib/steam';

export const dynamic = 'force-dynamic';

async function resolveSteamId(apiKey: string, vanityUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${vanityUrl}`,
      { next: { revalidate: 3600 * 24 } },
    );
    const data = await res.json();
    if (data.response?.success === 1) return data.response.steamid ?? null;
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const apiKey    = process.env.STEAM_API_KEY;
  const steamId64 = process.env.STEAM_USER_ID;      // 64-bit Steam ID (preferred)
  const vanityUrl = process.env.STEAM_VANITY_URL;   // fallback: e.g. "weinoz"

  if (!apiKey) return NextResponse.json({ error: 'STEAM_API_KEY not set' }, { status: 500 });

  let resolvedId = steamId64;
  if (!resolvedId && vanityUrl) {
    resolvedId = (await resolveSteamId(apiKey, vanityUrl)) ?? undefined;
  }
  if (!resolvedId) {
    return NextResponse.json({ error: 'Set STEAM_USER_ID or STEAM_VANITY_URL in .env' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${resolvedId}&include_appinfo=1&include_played_free_games=1&format=json`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return NextResponse.json({ error: 'Steam API error' }, { status: 502 });

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = data.response?.games ?? [];

    const games: SteamOwnedGame[] = raw
      .map((g) => ({
        appId: g.appid,
        name: g.name ?? `App ${g.appid}`,
        playtimeMinutes: g.playtime_forever ?? 0,
        headerUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        coverUrl:  `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`,
        storeUrl:  `https://store.steampowered.com/app/${g.appid}/`,
      }))
      .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes); // most played first

    return NextResponse.json(
      games,
      { headers: { 'Cache-Control': 'private, max-age=3600' } },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch owned games' }, { status: 500 });
  }
}
