import { Game } from '@/data/games';
import { games as defaultGames } from '@/data/games';

const KEY = 'weinoz:games';

function configured() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis(command: unknown[]) {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN!}`,
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
