import { Game } from '@/data/games';
import { Video } from '@/data/videos';

/**
 * Normalize a string for fuzzy comparison:
 * lowercase, strip combining diacritics (NFD decomposition), collapse
 * non-alphanumeric runs to a single space.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accent characters
    .replace(/[^a-z0-9]+/g, ' ')     // everything non-alphanum → space
    .trim();
}

/**
 * Return the first game whose title appears as a whole token sequence
 * inside the video title.  Games are checked longest-first so that
 * "Dark Souls III" is matched before "Dark Souls".
 */
export function findGameForVideo(videoTitle: string, games: Game[]): Game | null {
  const normTitle = normalize(videoTitle);
  if (!normTitle) return null;

  // Sort longest first to avoid shorter titles swallowing longer ones
  const sorted = [...games].sort((a, b) => b.title.length - a.title.length);

  for (const game of sorted) {
    const normGame = normalize(game.title);
    if (normGame.length < 3) continue; // skip trivially short names

    // After normalization the string only contains [a-z0-9 ], so space /
    // string-boundary anchors act as proper word boundaries.
    const escaped = normGame.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
    if (re.test(normTitle)) return game;
  }

  return null;
}

/**
 * Find a game in the library whose normalized title matches `name` exactly.
 * Used for Twitch category names (e.g. "Elden Ring") and YouTube tags.
 */
export function findGameByName(name: string, games: Game[]): Game | null {
  const normName = normalize(name);
  if (normName.length < 3) return null;
  return games.find((g) => normalize(g.title) === normName) ?? null;
}

/**
 * Match a list of videos against the game library.
 * Returns Map<gameId, newUrls[]> — only URLs not already in
 * game.linkedVideos are included.
 */
export function buildVideoLinks(
  videos: Video[],
  games: Game[],
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const video of videos) {
    const game = findGameForVideo(video.title, games);
    if (!game) continue;

    const existing = game.linkedVideos ?? [];
    if (existing.includes(video.url)) continue; // already linked

    const bucket = result.get(game.id) ?? [];
    if (!bucket.includes(video.url)) {
      bucket.push(video.url);
      result.set(game.id, bucket);
    }
  }

  return result;
}
