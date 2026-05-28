import { getGames, getTopGameIds, getSiteConfig } from '@/lib/redis';
import AdminPanel from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [games, topIds, siteConfig] = await Promise.all([getGames(), getTopGameIds(), getSiteConfig()]);
  return <AdminPanel initialGames={games} initialTopIds={topIds} initialConfig={siteConfig} />;
}
