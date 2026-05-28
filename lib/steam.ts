export interface SteamPrice {
  final: number;             // cents
  initial: number;           // cents (before discount)
  discount: number;          // percent, 0 if no sale
  finalFormatted: string;    // e.g. "29,99€"
  initialFormatted: string;
  isFree: boolean;
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
