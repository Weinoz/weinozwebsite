import { getGames } from '@/lib/redis';
import JeuxClient from '@/components/JeuxClient';

export const dynamic = 'force-dynamic';

export default async function JeuxPage() {
  const games = await getGames();
  return <JeuxClient initialGames={games} />;
}
