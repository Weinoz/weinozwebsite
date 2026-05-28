import { Game } from '@/data/games';
import { games as defaultGames } from '@/data/games';

const KEY = 'weinoz:games';

// ── Site config (À propos page) ───────────────────────────────────────────────
export interface SiteConfig {
  bio?: string;
  pc?: {
    cpu?: string;
    gpu?: string;
    ram?: string;
    screen?: string;
    keyboard?: string;
    mouse?: string;
    headset?: string;
  };
  stream?: {
    micro?: string;
    webcam?: string;
    software?: string;
  };
}

function configured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function redis(command: unknown[]) {
  const res = await fetch(process.env.KV_REST_API_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const data = await res.json();
  return data.result;
}

export async function getGames(): Promise<Game[]> {
  if (!configured()) return defaultGames;
  try {
    const raw = await redis(['GET', KEY]);
    if (!raw) return defaultGames;
    return JSON.parse(raw) as Game[];
  } catch {
    return defaultGames;
  }
}

export async function saveGames(games: Game[]): Promise<void> {
  if (!configured()) return;
  await redis(['SET', KEY, JSON.stringify(games)]);
}

// ── Top games (curated list of up to 5 game IDs) ──────────────────────────────
const TOP_KEY = 'weinoz:top';

export async function getTopGameIds(): Promise<string[]> {
  if (!configured()) return [];
  try {
    const raw = await redis(['GET', TOP_KEY]);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function saveTopGameIds(ids: string[]): Promise<void> {
  if (!configured()) return;
  await redis(['SET', TOP_KEY, JSON.stringify(ids.slice(0, 5))]);
}

// ── Site config ───────────────────────────────────────────────────────────────
const CONFIG_KEY = 'weinoz:config';

export async function getSiteConfig(): Promise<SiteConfig> {
  if (!configured()) return {};
  try {
    const raw = await redis(['GET', CONFIG_KEY]);
    if (!raw) return {};
    return JSON.parse(raw) as SiteConfig;
  } catch {
    return {};
  }
}

export async function saveSiteConfig(config: SiteConfig): Promise<void> {
  if (!configured()) return;
  await redis(['SET', CONFIG_KEY, JSON.stringify(config)]);
}
