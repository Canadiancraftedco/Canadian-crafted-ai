import { NextResponse } from 'next/server';
import { searchParks } from '@/lib/tripPlanner';

export const maxDuration = 30;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ parks: [] });

  try {
    const parks = await searchParks(q);
    return NextResponse.json({ ok: true, parks });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
