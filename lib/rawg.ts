export interface RawgGame {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  genres: Array<{ name: string }> | null;
  platforms: Array<{ platform: { name: string } }> | null;
  metacritic: number | null;
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
