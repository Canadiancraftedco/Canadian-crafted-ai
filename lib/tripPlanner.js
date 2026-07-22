const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function tavilySearch(query, maxResults = 6) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: maxResults,
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function groqJson(systemPrompt, userPrompt, maxTokens = 1500) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Groq request failed: ${response.status} — ${await response.text()}`);
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content.trim());
}

export async function searchParks(query) {
  const results = await tavilySearch(`${query} park camping Canada official site`, 6);
  if (results.length === 0) return [];

  const context = results.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`).join('\n\n');

  const parsed = await groqJson(
    `Extract real Canadian parks/campgrounds from these search results. ONLY use information
actually present in the snippets — never invent parks or URLs. Prefer official park authority
sites (parkscanada.gc.ca, ontarioparks.com, bcparks.ca, sepaq.com, etc.) as the official_url when
present in results; otherwise use the most relevant result URL.

Respond with ONLY JSON: {"parks": [{"name": "string", "description": "string, 1-2 sentences, your own words", "province": "string or null", "park_type": "national" or "provincial" or "other", "official_url": "string, exact URL from results"}]}
Return up to 5 real parks found in the results.`,
    `Search query: ${query}\n\nResults:\n${context}`
  );

  return parsed.parks || [];
}

export async function searchTrails(parkName) {
  const results = await tavilySearch(`hiking trails at ${parkName} Canada`, 6);
  if (results.length === 0) return [];

  const context = results.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`).join('\n\n');

  const parsed = await groqJson(
    `Extract real hiking trails from these search results about a specific park. ONLY use
information present in the snippets — never invent trail names, distances, or URLs.

Respond with ONLY JSON: {"trails": [{"name": "string", "description": "string, 1-2 sentences", "distance_km": number or null, "difficulty": "easy"|"moderate"|"hard"|null, "source_url": "string, exact URL from results"}]}
Return up to 6 real trails found in the results. If none found, return an empty array.`,
    `Park: ${parkName}\n\nResults:\n${context}`
  );

  return parsed.trails || [];
}

export async function generateMealPlan({ people, days, dietary }) {
  const parsed = await groqJson(
    `You plan practical, tasty camping meal plans. Meals should be realistic for cooking
outdoors (camp stove, fire, cooler) — not restaurant-complexity dishes. Respect dietary
restrictions strictly if given. Vary meals across days rather than repeating the same thing.

Respond with ONLY JSON: {"days": [
  {
    "day": 1,
    "breakfast": {"name": "string", "description": "string, 1 sentence"},
    "lunch": {"name": "string", "description": "string, 1 sentence"},
    "dinner": {"name": "string", "description": "string, 1 sentence"},
    "snacks": {"name": "string", "description": "string, 1 sentence"}
  }
]}`,
    `People: ${people}\nDays: ${days}\nDietary restrictions: ${dietary || 'none'}\n\nGenerate a full camping meal plan, one entry per day.`,
    2500
  );

  return parsed.days || [];
}

export async function generateGroceryList({ people, days, dietary, mealPlan }) {
  const mealContext = mealPlan
    ? `\n\nBase the list on this exact meal plan (make sure every ingredient needed for these meals is included):\n${JSON.stringify(mealPlan)}`
    : '';

  const parsed = await groqJson(
    `You generate practical camping grocery lists. Size quantities realistically for the group
size and trip length given. Account for 3 meals + snacks per person per day. Respect dietary
restrictions strictly if given.

Respond with ONLY JSON: {"categories": [{"category": "string e.g. Produce, Proteins, Pantry & Dry Goods, Dairy & Eggs, Snacks, Drinks, Other", "items": [{"name": "string", "quantity": "string, e.g. '2 lbs' or '6'"}]}]}`,
    `People: ${people}\nDays: ${days}\nDietary restrictions: ${dietary || 'none'}\n\nGenerate a complete camping grocery list.${mealContext}`,
    2000
  );

  return parsed.categories || [];
}
