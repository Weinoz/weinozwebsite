import { getGames } from '@/lib/redis';
import AdminPanel from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const games = await getGames();
  return <AdminPanel initialGames={games} />;
}
