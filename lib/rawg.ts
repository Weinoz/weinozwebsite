export interface RawgGame {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  genres: Array<{ name: string }> | null;
  platforms: Array<{ platform: { name: string } }> | null;
  metacritic: number | null;
}

export interface RawgGameDetail extends RawgGame {
  website: string | null;
  stores: Array<{ url: string; store: { name: string; slug: string } }> | null;
}

export interface RawgScreenshot {
  id: number;
  image: string;
}

export async function getGameScreenshots(rawgId: number): Promise<RawgScreenshot[]> {
  const key = process.env.RAWG_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.rawg.io/api/games/${rawgId}/screenshots?key=${key}&page_size=8`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function getGameDetails(id: number): Promise<RawgGameDetail | null> {
  const key = process.env.RAWG_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.rawg.io/api/games/${id}?key=${key}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchRawg(query: string): Promise<RawgGame[]> {
  const key = process.env.RAWG_API_KEY;
  if (!key || !query.trim()) return [];
  try {
    const res = await fetch(
      `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&key=${key}&page_size=16&ordering=-rating`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}
