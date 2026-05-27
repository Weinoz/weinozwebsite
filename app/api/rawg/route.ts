import { NextRequest, NextResponse } from 'next/server';
import { searchRawg } from '@/lib/rawg';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json([]);
  const results = await searchRawg(q);
  return NextResponse.json(results);
}
