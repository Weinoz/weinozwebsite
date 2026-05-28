'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getGames, saveGames, saveTopGameIds, saveSiteConfig, SiteConfig, getStreamGames, saveStreamGame } from '@/lib/redis';
import { Game } from '@/data/games';
import { Video } from '@/data/videos';
import { fetchYouTubeVideos, fetchYouTubeVideoTags } from '@/lib/youtube';
import { fetchTwitchVideos, fetchTwitchClips, fetchTwitchLiveStream } from '@/lib/twitch';
import { buildVideoLinks, findGameByName, findGameForVideo } from '@/lib/autolink';

export async function loginAction(_: unknown, formData: FormData) {
  const password = formData.get('password') as string;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) return { error: 'Mot de passe incorrect.' };

  const jar = await cookies();
  jar.set('weinoz_admin', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
  });
  redirect('/admin');
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete('weinoz_admin');
  redirect('/admin/login');
}

export async function addGameAction(game: Game) {
  const games = await getGames();
  const filtered = games.filter((g) => g.id !== game.id);
  await saveGames([game, ...filtered]);
  revalidatePath('/jeux');
  revalidatePath('/');
}

export async function removeGameAction(id: string) {
  const games = await getGames();
  await saveGames(games.filter((g) => g.id !== id));
  revalidatePath('/jeux');
  revalidatePath('/');
}

export async function setTopGamesAction(ids: string[]) {
  await saveTopGameIds(ids);
  revalidatePath('/');
}

export async function saveSiteConfigAction(config: SiteConfig) {
  await saveSiteConfig(config);
  revalidatePath('/a-propos');
}

// ── Video admin actions ───────────────────────────────────────────────────────

export interface AdminVideo {
  id: string;
  title: string;
  url: string;
  platform: 'youtube' | 'twitch';
  date: string;
  thumbnail?: string;
  duration?: string;
  views?: string;
  streamId?: string;
  // Enrichment
  currentGameId?: string;    // game that already has this URL in linkedVideos
  currentGameTitle?: string;
  detectedGameId?: string;   // auto-detected via tags / stream_games / title
  detectedGameTitle?: string;
}

/**
 * Fetch all videos from YouTube + Twitch, enrich with game assignments.
 * Also captures the current Twitch live game if streaming.
 */
export async function fetchVideosForAdminAction(): Promise<{
  videos: AdminVideo[];
  liveGame?: { streamId: string; gameName: string };
}> {
  const clientId  = process.env.TWITCH_CLIENT_ID;
  const secret    = process.env.TWITCH_CLIENT_SECRET;
  const login     = process.env.TWITCH_LOGIN;
  const ytId      = process.env.YOUTUBE_CHANNEL_ID;
  const ytApiKey  = process.env.YOUTUBE_API_KEY;

  const [games, ytRaw, twitchRaw, clipsRaw, streamGamesMap] = await Promise.all([
    getGames(),
    ytId ? fetchYouTubeVideos(ytId) : Promise.resolve([] as Video[]),
    clientId && secret && login
      ? fetchTwitchVideos(clientId, secret, login)
      : Promise.resolve([] as Video[]),
    clientId && secret && login
      ? fetchTwitchClips(clientId, secret, login)
      : Promise.resolve([] as Video[]),
    getStreamGames(),
  ]);

  // Build reverse map: url → { gameId, gameTitle }
  const urlToGame = new Map<string, { id: string; title: string }>();
  for (const game of games) {
    for (const url of game.linkedVideos ?? []) {
      urlToGame.set(url, { id: game.id, title: game.title });
    }
  }

  // Fetch YouTube tags if API key available
  let ytTags = new Map<string, string[]>();
  if (ytApiKey && ytRaw.length) {
    const ytVideoIds = ytRaw.map((v) => v.videoId).filter(Boolean) as string[];
    ytTags = await fetchYouTubeVideoTags(ytVideoIds, ytApiKey);
  }

  // Try to capture live Twitch game (fire-and-forget style — save in background)
  let liveGame: { streamId: string; gameName: string } | undefined;
  if (clientId && secret && login) {
    const live = await fetchTwitchLiveStream(clientId, secret, login);
    if (live) {
      liveGame = { streamId: live.streamId, gameName: live.gameName };
      // Persist in Redis so future VOD fetches can use it
      await saveStreamGame(live.streamId, live.gameName, live.twitchGameId);
    }
  }

  // Build enriched video list (VODs first, then clips)
  const allVideos = [...ytRaw, ...twitchRaw, ...clipsRaw] as Video[];
  const adminVideos: AdminVideo[] = allVideos.map((v) => {
    const linked = urlToGame.get(v.url);

    // Auto-detect game
    let detectedGame: { id: string; title: string } | null = null;

    if (v.platform === 'twitch' && v.streamId) {
      // Use stored stream→game mapping
      const sg = streamGamesMap[v.streamId];
      if (sg?.gameName) {
        const g = findGameByName(sg.gameName, games) ?? findGameForVideo(sg.gameName, games);
        if (g) detectedGame = { id: g.id, title: g.title };
      }
    }

    // For Twitch clips: use twitchGameName (best match — direct from API)
    if (!detectedGame && v.isClip && v.twitchGameName) {
      const g = findGameByName(v.twitchGameName, games);
      if (g) detectedGame = { id: g.id, title: g.title };
    }

    if (!detectedGame && v.platform === 'youtube' && v.videoId) {
      // Use YouTube tags
      const tags = ytTags.get(v.videoId) ?? [];
      for (const tag of tags) {
        const g = findGameByName(tag, games) ?? findGameForVideo(tag, games);
        if (g) { detectedGame = { id: g.id, title: g.title }; break; }
      }
    }

    if (!detectedGame) {
      // Fall back to title matching
      const g = findGameForVideo(v.title, games);
      if (g) detectedGame = { id: g.id, title: g.title };
    }

    return {
      id: v.id,
      title: v.title,
      url: v.url,
      platform: v.platform as 'youtube' | 'twitch',
      date: v.date,
      thumbnail: v.thumbnail,
      duration: (v as Video & { duration?: string }).duration,
      views: v.views,
      streamId: v.streamId,
      currentGameId:    linked?.id,
      currentGameTitle: linked?.title,
      detectedGameId:    linked ? undefined : detectedGame?.id,
      detectedGameTitle: linked ? undefined : detectedGame?.title,
    };
  });

  return { videos: adminVideos, liveGame };
}

/**
 * Link or unlink a video URL to a game.
 * Removes the URL from any game that currently has it, then adds it to newGameId (if provided).
 */
export async function linkVideoToGameAction(
  videoUrl: string,
  newGameId: string | null,
): Promise<void> {
  const games = await getGames();
  const updated = games.map((g) => {
    const without = (g.linkedVideos ?? []).filter((u) => u !== videoUrl);
    if (newGameId === g.id) {
      return { ...g, linkedVideos: [...without, videoUrl] };
    }
    return without.length !== (g.linkedVideos ?? []).length
      ? { ...g, linkedVideos: without.length > 0 ? without : undefined }
      : g;
  });
  await saveGames(updated);
  revalidatePath('/jeux');
  revalidatePath('/');
}

// ── Steam Import ──────────────────────────────────────────────────────────────

export interface SteamImportGame {
  appId: number;
  name: string;
  playtimeMinutes: number;
  coverUrl: string;
  storeUrl: string;
  alreadyInLibrary: boolean;
}

/**
 * Check which Steam app IDs are already in the library,
 * then return enriched list to the client.
 */
export async function getSteamImportStatusAction(
  appIds: number[],
): Promise<Record<number, boolean>> {
  const games = await getGames();
  const libraryIds = new Set(
    games
      .map((g) => g.id.replace(/^steam-/, ''))
      .filter((id) => !isNaN(Number(id)))
      .map(Number),
  );
  return Object.fromEntries(appIds.map((id) => [id, libraryIds.has(id)]));
}

/**
 * Import the selected Steam games into the library.
 * Skips any that already exist (matching id: steam-{appId}).
 */
export async function importSteamGamesAction(
  selections: { appId: number; name: string; playtimeMinutes: number; coverUrl: string; headerUrl: string; storeUrl: string }[],
): Promise<{ imported: number }> {
  const games = await getGames();
  const existingIds = new Set(games.map((g) => g.id));

  const toAdd: Game[] = selections
    .filter((s) => !existingIds.has(`steam-${s.appId}`))
    .map((s) => ({
      id: `steam-${s.appId}`,
      title: s.name,
      cover: s.headerUrl, // use header (16:9) as default, portrait may 404
      platform: 'PC' as const,
      status: 'terminé' as const,
      hours: s.playtimeMinutes > 0 ? Math.round(s.playtimeMinutes / 60) : undefined,
      storeUrl: s.storeUrl,
    }));

  if (toAdd.length === 0) return { imported: 0 };

  await saveGames([...toAdd, ...games]);
  revalidatePath('/jeux');
  revalidatePath('/');
  revalidatePath('/stats');
  return { imported: toAdd.length };
}

export async function syncVideoLinksAction(): Promise<{ added: number; gamesUpdated: number }> {
  const [games, ytVideos, twitchVideos] = await Promise.all([
    getGames(),
    process.env.YOUTUBE_CHANNEL_ID
      ? fetchYouTubeVideos(process.env.YOUTUBE_CHANNEL_ID)
      : Promise.resolve([]),
    process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && process.env.TWITCH_LOGIN
      ? fetchTwitchVideos(
          process.env.TWITCH_CLIENT_ID,
          process.env.TWITCH_CLIENT_SECRET,
          process.env.TWITCH_LOGIN,
        )
      : Promise.resolve([]),
  ]);

  const allVideos = [...ytVideos, ...twitchVideos];
  const links = buildVideoLinks(allVideos, games);

  let totalAdded = 0;
  let gamesUpdated = 0;

  const updatedGames = games.map((g) => {
    const newUrls = links.get(g.id);
    if (!newUrls?.length) return g;
    gamesUpdated++;
    totalAdded += newUrls.length;
    return { ...g, linkedVideos: [...(g.linkedVideos ?? []), ...newUrls] };
  });

  if (totalAdded > 0) {
    await saveGames(updatedGames);
    revalidatePath('/jeux');
    revalidatePath('/');
  }

  return { added: totalAdded, gamesUpdated };
}
