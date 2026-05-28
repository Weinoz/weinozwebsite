import { NextRequest, NextResponse } from 'next/server';
import { getGameDetails } from '@/lib/rawg';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) return NextResponse.json(null);
  const detail = await getGameDetails(numId);
  return NextResponse.json(detail);
}
