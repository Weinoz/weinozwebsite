import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGames } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jar = await cookies();
  const session = jar.get('weinoz_admin');
  const password = process.env.ADMIN_PASSWORD;

  if (!password || !session || session.value !== password) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

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
