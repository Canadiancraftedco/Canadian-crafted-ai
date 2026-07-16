import { NextResponse } from 'next/server';

export const maxDuration = 20;

// Uses OpenStreetMap's free Overpass API — no key required
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });

  const query = `[out:json][timeout:15];node["shop"="supermarket"](around:15000,${lat},${lon});out body 12;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
    });
    if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
    const data = await res.json();

    function distanceKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const stores = (data.elements || [])
      .filter((el) => el.tags?.name)
      .map((el) => ({
        name: el.tags.name,
        lat: el.lat,
        lon: el.lon,
        distanceKm: Math.round(distanceKm(parseFloat(lat), parseFloat(lon), el.lat, el.lon) * 10) / 10,
        address: [el.tags['addr:housenumber'], el.tags['addr:street']].filter(Boolean).join(' ') || null,
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);

    return NextResponse.json({ ok: true, stores });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
