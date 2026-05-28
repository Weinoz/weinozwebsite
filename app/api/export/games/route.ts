import { NextResponse } from 'next/server';
import { getGames } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const games = await getGames();
  const json = JSON.stringify({ exported_at: new Date().toISOString(), games }, null, 2);

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="jeux.json"',
      'Cache-Control': 'no-store',
    },
  });
}
