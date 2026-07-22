const GROQ_MODEL = 'llama-3.3-70b-versatile';

const EXCLUDED_DOMAINS = [
  'reddit.com', 'pinterest.', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'substack.com', 'medium.com', 'quora.com', 'youtube.com', 'tiktok.com',
  'canoe.com', 'saveonfoods.com', 'wikipedia.org', 'blogspot.com',
];

function isUsableUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return !EXCLUDED_DOMAINS.some((d) => host.includes(d));
  } catch {
    return false;
  }
}

export async function tavilySearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 8,
      include_answer: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.status} — ${await res.text()}`);
  }
  const data = await res.json();
  const results = data.results || [];
  return results.filter((r) => isUsableUrl(r.url));
}

export async function extractProducts(searchResults, category) {
  if (searchResults.length === 0) return [];

  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
    .join('\n\n');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You extract real Canadian product/brand listings for Canadian Crafted Co.,
a marketplace for Canadian outdoor/health/family/fitness products, from web search results.

CRITICAL RULE: product_url must be a page on the brand's OWN website (their shop, product page,
or homepage) — specifically the URL given in the search result, never a third-party site.
Every search result given to you is already from a real brand/retailer's own domain (article
sites, forums, and directories have been filtered out already), so you can trust these URLs are
usable — just don't alter them or substitute a URL you think you remember.

ONLY use information present in the search results given to you — never invent products, brands,
prices, or URLs. If a result isn't a real, specific product or Canadian brand, skip it. It's fine
to return fewer results rather than invent ones.

Respond with ONLY a JSON object, no markdown fences:
{"products": [
  {
    "name": "string, product or brand/shop name",
    "brand": "string, company name",
    "price": number or null,
    "category": "string, use exactly what you were given",
    "description": "string, 1-2 sentences, your own words, based only on the snippet",
    "product_url": "string, the exact URL from the result — copy it exactly, do not modify",
    "canada_confidence": number 0-1, how confident this is a genuinely Canadian company/product
  }
]}`,
        },
        {
          role: 'user',
          content: `Category: ${category}\n\nSearch results:\n${context}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq extraction failed: ${response.status} — ${await response.text()}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content.trim());
  const validUrls = new Set(searchResults.map((r) => r.url));
  return (parsed.products || []).filter((p) => validUrls.has(p.product_url));
}

export async function runDiscovery(supabase, { query, category }) {
  const searchResults = await tavilySearch(query);
  const found = await extractProducts(searchResults, category);

  let inserted = 0;
  const insertedProducts = [];

  for (const p of found) {
    if (!p.name || !p.brand || !p.product_url) continue;

    const row = {
      id: crypto.randomUUID(),
      name: p.name,
      brand: p.brand,
      price: p.price ?? null,
      currency: 'CAD',
      category: p.category || category,
      description: p.description || null,
      product_url: p.product_url,
      source_site: 'ai_discovery',
      canada_verified: (p.canada_confidence ?? 0) >= 0.6,
      canada_confidence: p.canada_confidence ?? 0,
      scraped_at: new Date().toISOString(),
    };

    const { error, data } = await supabase
      .from('products')
      .upsert(row, { onConflict: 'product_url', ignoreDuplicates: true })
      .select()
      .maybeSingle();

    if (!error) {
      inserted++;
      if (data) insertedProducts.push(data);
    }
  }

  return { searchResultCount: searchResults.length, found: found.length, inserted, insertedProducts };
}

// Runs discovery across ALL categories in one call — used by the daily cron
// so the catalog grows meaningfully every day instead of one category at a time.
export async function runDailyDiscovery(supabase) {
  const CATEGORIES = ['outdoors', 'health', 'family', 'fitness'];
  const results = {};

  for (const category of CATEGORIES) {
    try {
      results[category] = await runDiscovery(supabase, {
        query: `Canadian ${category} brands products made in Canada`,
        category,
      });
    } catch (err) {
      results[category] = { error: String(err) };
    }
  }

  return results;
}
