import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

function extractImageFromHtml(html, baseUrl) {
  let match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

  if (!match) {
    match = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  }

  if (!match) return null;

  let url = match[1];
  if (url.startsWith('//')) url = 'https:' + url;
  else if (url.startsWith('/')) {
    const base = new URL(baseUrl);
    url = `${base.protocol}//${base.host}${url}`;
  }
  return url;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function findImageForProduct(product) {
  try {
    const res = await fetchWithTimeout(product.product_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CanadianCraftedBot/1.0; +https://canadiancraftedco.com)' },
      redirect: 'follow',
    }, 6000);
    if (!res.ok) return null;
    const html = await res.text();
    return extractImageFromHtml(html, product.product_url);
  } catch (err) {
    console.error(`Fetch failed/timed out for ${product.product_url}:`, err.message);
    return null;
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // small batch — Vercel's free plan caps function runtime around ~10s,
  // and each site fetch can take a few seconds, so we keep this conservative
  // and rely on the daily cron to grind through the backlog over time.
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, brand, product_url')
    .is('image_url', null)
    .eq('canada_verified', true)
    .limit(3);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let updated = 0;
  const results = [];

  for (const p of products) {
    const imageUrl = await findImageForProduct(p);
    if (imageUrl) {
      const { error: updateErr } = await supabase.from('products').update({ image_url: imageUrl }).eq('id', p.id);
      if (!updateErr) updated++;
    }
    results.push({ name: p.name, found: !!imageUrl, image_url: imageUrl || null });
  }

  return NextResponse.json({ ok: true, checked: products.length, updated, results });
}
