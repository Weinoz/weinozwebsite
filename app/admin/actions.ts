'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getGames, saveGames, saveTopGameIds, saveSiteConfig, SiteConfig } from '@/lib/redis';
import { Game } from '@/data/games';

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
