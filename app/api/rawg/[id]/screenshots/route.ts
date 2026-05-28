import { NextRequest, NextResponse } from 'next/server';
import { getGameScreenshots } from '@/lib/rawg';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) return NextResponse.json([]);
  const screenshots = await getGameScreenshots(numId);
  return NextResponse.json(screenshots);
}
