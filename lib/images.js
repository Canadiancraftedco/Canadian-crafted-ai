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
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function findImageForProduct(product) {
  try {
    const res = await fetchWithTimeout(product.product_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    }, 6000);

    if (!res.ok) return { imageUrl: null, reason: `HTTP ${res.status}` };
    const html = await res.text();
    const imageUrl = extractImageFromHtml(html, product.product_url);
    return { imageUrl, reason: imageUrl ? null : 'no og:image/twitter:image tag found (often means JS-rendered page or homepage without one)' };
  } catch (err) {
    return { imageUrl: null, reason: err.name === 'AbortError' ? 'timed out' : err.message };
  }
}

export async function backfillImages(supabase, limit = 3) {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, brand, product_url')
    .is('image_url', null)
    .eq('canada_verified', true)
    .limit(limit);

  if (error) throw new Error(error.message);

  let updated = 0;
  const results = [];

  for (const p of products) {
    const { imageUrl, reason } = await findImageForProduct(p);
    if (imageUrl) {
      const { error: updateErr } = await supabase.from('products').update({ image_url: imageUrl }).eq('id', p.id);
      if (!updateErr) updated++;
    }
    results.push({ name: p.name, brand: p.brand, url: p.product_url, found: !!imageUrl, image_url: imageUrl || null, reason: reason || undefined });
  }

  return { checked: products.length, updated, results };
}
