import { cookies } from 'next/headers';
import { getGames } from '@/lib/redis';
import JeuxClient from '@/components/JeuxClient';

export const dynamic = 'force-dynamic';

export default async function JeuxPage() {
  const jar = await cookies();
  const session = jar.get('weinoz_admin');
  const isAdmin = !!(process.env.ADMIN_PASSWORD && session?.value === process.env.ADMIN_PASSWORD);

  const games = await getGames();
  return <JeuxClient initialGames={games} isAdmin={isAdmin} />;
}
