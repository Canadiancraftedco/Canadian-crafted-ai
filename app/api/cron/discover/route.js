import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const CATEGORIES = ['outdoors', 'health', 'family', 'fitness'];

const SYSTEM_PROMPT = `You are a product research agent for Canadian Crafted Co., a Canadian outdoor/health/family/fitness marketplace.

Find REAL, currently-sold products from REAL Canadian companies (or companies with strong
Canadian availability) in the category you're given. Use web search to verify each product
actually exists right now — never invent products, brands, or URLs.

Also find the direct URL of a real product photo for each item (the actual image file URL,
e.g. ending in .jpg/.png/.webp, or a CDN image URL you can see referenced on the product page —
not the page URL itself). This is required for the item to be usable — if you can't find a real
image URL, still include the product but set image_url to null.

Respond with ONLY a JSON array (no markdown fences, no commentary):
[
  {
    "name": "string, product name",
    "brand": "string, company name",
    "price": number or null,
    "currency": "CAD",
    "category": "string, the category you were given",
    "description": "string, 1-2 sentences, in your own words, no quoted marketing copy",
    "product_url": "string, the exact page you verified",
    "image_url": "string or null, direct image file URL",
    "canada_confidence": number between 0 and 1 (how confident you are this is a genuinely Canadian company/product)
  }
]

Find 5-10 products. Only include items you actually found via search.`;

async function discoverForCategory(category) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Category: ${category}` }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const products = JSON.parse(text);
  if (!Array.isArray(products)) throw new Error('Model did not return an array');
  return products;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // rotate categories by day-of-year so every category gets covered over time
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % CATEGORIES.length;
  const category = CATEGORIES[dayIndex];

  try {
    const found = await discoverForCategory(category);
    let inserted = 0;

    for (const p of found) {
      if (!p.name || !p.brand || !p.product_url) continue;

      const { error } = await supabase.from('products').upsert(
        {
          id: crypto.randomUUID(),
          name: p.name,
          brand: p.brand,
          price: p.price ?? null,
          currency: p.currency || 'CAD',
          category: p.category || category,
          description: p.description || null,
          product_url: p.product_url,
          image_url: p.image_url || null,
          source_site: 'ai_cron_discovery',
          canada_verified: (p.canada_confidence ?? 0) >= 0.6,
          canada_confidence: p.canada_confidence ?? 0,
          scraped_at: new Date().toISOString(),
        },
        { onConflict: 'product_url', ignoreDuplicates: true }
      );

      if (!error) inserted++;
    }

    return NextResponse.json({ ok: true, category, found: found.length, inserted });
  } catch (err) {
    return NextResponse.json({ ok: false, category, error: String(err) }, { status: 500 });
  }
}
