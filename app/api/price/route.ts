import { NextRequest, NextResponse } from 'next/server';
import { extractSteamAppId, fetchSteamPrice } from '@/lib/steam';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json(null);

  const appId = extractSteamAppId(url);
  if (!appId) return NextResponse.json(null);

  const price = await fetchSteamPrice(appId);
  return NextResponse.json(price, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
