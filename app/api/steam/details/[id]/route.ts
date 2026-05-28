import { NextRequest, NextResponse } from 'next/server';
import { fetchSteamGameInfo } from '@/lib/steam';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const appId = parseInt(id, 10);
  if (isNaN(appId)) return NextResponse.json(null);
  return NextResponse.json(await fetchSteamGameInfo(appId));
}
