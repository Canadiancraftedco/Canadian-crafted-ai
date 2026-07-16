const GROQ_MODEL = 'llama-3.3-70b-versatile';

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
  return data.results || [];
}

export async function extractProducts(searchResults, category) {
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

ONLY use information present in the search results given to you — never invent products, brands,
prices, or URLs that aren't backed by the snippets. If a result isn't a real, specific product or
Canadian brand, skip it. It's fine to return fewer results rather than invent ones.

Respond with ONLY a JSON object, no markdown fences:
{"products": [
  {
    "name": "string, product or brand/shop name",
    "brand": "string, company name",
    "price": number or null,
    "category": "string, use exactly what you were given",
    "description": "string, 1-2 sentences, your own words, based only on the snippet",
    "product_url": "string, the exact URL from the result",
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
  return parsed.products || [];
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
