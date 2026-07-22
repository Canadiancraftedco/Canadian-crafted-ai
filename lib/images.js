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

    if (res.ok) {
      const html = await res.text();
      const imageUrl = extractImageFromHtml(html, product.product_url);
      if (imageUrl) return { imageUrl, reason: null };
    }
  } catch {
    // fall through to logo fallback below
  }

  // Fallback: every real company has a domain, and Clearbit's free logo API
  // (no key required) can almost always return something usable — better than
  // no image at all, and it's honest (it's literally the brand's own logo).
  try {
    const host = new URL(product.product_url).hostname.replace(/^www\./, '');
    const logoUrl = `https://logo.clearbit.com/${host}`;
    const checkRes = await fetchWithTimeout(logoUrl, { method: 'HEAD' }, 4000);
    if (checkRes.ok) {
      return { imageUrl: logoUrl, reason: 'used brand logo fallback (no product photo found)' };
    }
  } catch {
    // no-op, fall through to final failure
  }

  return { imageUrl: null, reason: 'no product photo or logo could be found' };
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
