import { getGames, getTopGameIds } from '@/lib/redis';
import AdminPanel from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [games, topIds] = await Promise.all([getGames(), getTopGameIds()]);
  return <AdminPanel initialGames={games} initialTopIds={topIds} />;
}
