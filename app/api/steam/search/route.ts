import { NextRequest, NextResponse } from 'next/server';
import { searchSteam } from '@/lib/steam';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q?.trim()) return NextResponse.json([]);
  return NextResponse.json(await searchSteam(q));
}
