import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

async function findImageForProduct(supabase, product) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: `Find the direct image file URL (ending in .jpg/.png/.webp, or a CDN image URL) for
a real product photo of the given product on the given brand's site. Respond with ONLY the URL,
nothing else. If you cannot find a real, direct image URL, respond with exactly: NONE`,
      messages: [
        {
          role: 'user',
          content: `Product: "${product.name}" by ${product.brand}\nProduct page: ${product.product_url}`,
        },
      ],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!text || text === 'NONE' || !text.startsWith('http')) return null;
  return text;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, brand, product_url')
    .is('image_url', null)
    .eq('canada_verified', true)
    .limit(5); // small batch per run to stay well within function time limits

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let updated = 0;
  const results = [];

  for (const p of products) {
    const imageUrl = await findImageForProduct(supabase, p);
    if (imageUrl) {
      const { error: updateErr } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', p.id);
      if (!updateErr) updated++;
    }
    results.push({ name: p.name, found: !!imageUrl });
  }

  return NextResponse.json({ ok: true, checked: products.length, updated, results });
}
