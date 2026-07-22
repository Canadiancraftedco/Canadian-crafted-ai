const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Real, honest scope: this finds and records affiliate program info.
// It does NOT submit application forms — most programs require manual
// review/approval, so "applied"/"approved" are set by a human in admin
// once you've actually gone through the brand's process.

async function tavilySearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function analyzeForAffiliateProgram(brand, searchResults) {
  const context = searchResults.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`).join('\n\n');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Given web search results about a brand, determine whether they run an
affiliate/referral/influencer partner program. Only use what's actually in the snippets —
never guess or invent a URL.

Respond with ONLY JSON, no markdown fences:
{
  "has_program": true or false,
  "program_url": "string or null, the exact URL from results if found",
  "network": "string or null, e.g. Impact, ShareASale, Refersion, Awin, Amazon Associates, or 'Direct' if it's their own program",
  "commission_pct": number or null, only if explicitly stated in a snippet,
  "notes": "string, brief, e.g. what you found or why you're unsure"
}`,
        },
        { role: 'user', content: `Brand: ${brand}\n\nSearch results:\n${context}` },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Groq analysis failed: ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content.trim());
}

export async function scanBrandForAffiliateProgram(supabase, brand) {
  const results = await tavilySearch(`${brand} affiliate program partner program`);
  const analysis = await analyzeForAffiliateProgram(brand, results);

  const row = {
    brand,
    program_url: analysis.program_url || null,
    network: analysis.network || null,
    status: analysis.has_program ? 'found' : 'not_found',
    commission_pct: analysis.commission_pct || null,
    notes: analysis.notes || null,
    updated_at: new Date().toISOString(),
  };

  await supabase.from('brand_affiliate_status').upsert(row, { onConflict: 'brand' });
  return row;
}

export async function isAffiliatedBrand(supabase, brand) {
  const { data } = await supabase
    .from('brand_affiliate_status')
    .select('status')
    .eq('brand', brand)
    .maybeSingle();
  return data?.status === 'approved';
}
