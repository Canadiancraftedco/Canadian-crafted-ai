import { NextResponse } from 'next/server';

// classify current conditions into a simple tag our recommendation
// rules engine can match against product weather_tags
function classify(tempC, weatherCode) {
  const snowCodes = [71, 73, 75, 77, 85, 86];
  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];

  if (snowCodes.includes(weatherCode)) return 'snow';
  if (rainCodes.includes(weatherCode)) return 'rain';
  if (tempC >= 24) return 'hot';
  if (tempC <= 5) return 'cold';
  return 'mild';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&timezone=auto`
    );
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    const data = await res.json();

    const tempC = data.current.temperature_2m;
    const weatherCode = data.current.weather_code;
    const condition = classify(tempC, weatherCode);

    return NextResponse.json({
      ok: true,
      tempC,
      weatherCode,
      isDay: data.current.is_day === 1,
      condition,
      forecast: data.daily.time.map((date, i) => ({
        date,
        max: data.daily.temperature_2m_max[i],
        min: data.daily.temperature_2m_min[i],
        weatherCode: data.daily.weather_code[i],
      })),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
