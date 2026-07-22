import { NextResponse } from 'next/server';
import { searchTrails } from '@/lib/tripPlanner';

export const maxDuration = 30;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const park = searchParams.get('park')?.trim();
  if (!park) return NextResponse.json({ trails: [] });

  try {
    const trails = await searchTrails(park);
    return NextResponse.json({ ok: true, trails });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
