'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getGames, saveGames, saveTopGameIds, saveSiteConfig, SiteConfig } from '@/lib/redis';
import { Game } from '@/data/games';
import { fetchYouTubeVideos } from '@/lib/youtube';
import { fetchTwitchVideos } from '@/lib/twitch';
import { buildVideoLinks } from '@/lib/autolink';

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
