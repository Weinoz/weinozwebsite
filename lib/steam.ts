export interface SteamSearchHit {
  id: number;
  name: string;
  cover: string;   // header.jpg CDN URL
  storeUrl: string;
}

export interface SteamPrice {
  final: number;             // cents
  initial: number;           // cents (before discount)
  discount: number;          // percent, 0 if no sale
  finalFormatted: string;    // e.g. "29,99€"
  initialFormatted: string;
  isFree: boolean;
}

// ── Owned Games (via Steam Web API) ──────────────────────────────────────────

export interface SteamOwnedGame {
  appId: number;
  name: string;
  playtimeMinutes: number; // playtime_forever from Steam API
  headerUrl: string;       // header.jpg (16:9)
  coverUrl: string;        // library_600x900.jpg (portrait, may 404)
  storeUrl: string;
}

/** Search the Steam store and return simplified hits. */
export async function searchSteam(query: string): Promise<SteamSearchHit[]> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=fr`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items ?? []).slice(0, 12).map((item: any) => ({
      id: item.id,
      name: item.name,
      cover: `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
      storeUrl: `https://store.steampowered.com/app/${item.id}/`,
    }));
  } catch {
    return [];
  }
}

export interface SteamGameInfo {
  name: string;
  year?: number;
  genre?: string;
  headerImage: string;
}

/** Fetch name, release year, genre and header image for a Steam App ID. */
export async function fetchSteamGameInfo(appId: number): Promise<SteamGameInfo | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=fr&l=fr`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.[String(appId)];
    if (!entry?.success || !entry.data) return null;
    const d = entry.data;

    // Date can be "15 nov. 2024", "2025", "Nov 15, 2024", "À venir", etc.
    let year: number | undefined;
    const yearMatch = (d.release_date?.date ?? '').match(/\b(19|20)\d{2}\b/);
    if (yearMatch) year = parseInt(yearMatch[0], 10);

    return {
      name: d.name,
      year,
      genre: d.genres?.[0]?.description,
      headerImage: d.header_image ?? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
    };
  } catch {
    return null;
  }
}

/** Extract the numeric Steam App ID from a store URL, or null if not Steam. */
export function extractSteamAppId(storeUrl: string): number | null {
  const m = storeUrl.match(/store\.steampowered\.com\/app\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Fetch current Steam price for an App ID (FR region, EUR). Returns null on any failure. */
export async function fetchSteamPrice(appId: number): Promise<SteamPrice | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=fr&l=fr`,
      { next: { revalidate: 3600 } }, // cache 1h
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.[String(appId)];
    if (!entry?.success || !entry.data) return null;

    if (entry.data.is_free) {
      return {
        final: 0, initial: 0, discount: 0,
        finalFormatted: 'Gratuit', initialFormatted: 'Gratuit',
        isFree: true,
      };
    }

    const p = entry.data.price_overview;
    if (!p) return null;

    return {
      final: p.final,
      initial: p.initial,
      discount: p.discount_percent ?? 0,
      finalFormatted: p.final_formatted,
      initialFormatted: p.initial_formatted,
      isFree: false,
    };
  } catch {
    return null;
  }
}
