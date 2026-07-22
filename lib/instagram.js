import { isAffiliatedBrand } from './affiliates.js';
import { getTopPerformingExamples } from './engagement.js';

const IG_API_VERSION = 'v21.0';
const GROQ_MODEL = 'llama-3.3-70b-versatile';


export async function generateCaption(product, topExamples = []) {
  const examplesBlock = topExamples.length > 0
    ? `\n\nThese past captions performed well for this account — use them as a loose style/tone reference (don't copy them, just learn from what worked):\n${topExamples.map((e, i) => `${i + 1}. "${e.caption}" (${e.score} engagement points)`).join('\n')}`
    : '';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.8,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You write short, genuine-sounding Instagram captions for Canadian Crafted Co.,
an account that highlights real Canadian outdoor/health/family/fitness products. Tone: warm,
enthusiastic but not salesy, proud of Canadian makers. 2-4 sentences max, no more than 2 emoji.
End with a simple call to action like "link in bio" — never fabricate claims about the product.

Respond with ONLY a JSON object, no markdown fences:
{"caption": "string", "hashtags": ["#tag1", "#tag2", ...]}
Provide 8-12 relevant hashtags mixing broad (#CanadianMade) and specific ones.${examplesBlock}`,
        },
        {
          role: 'user',
          content: `Product: ${product.name}\nBrand: ${product.brand}\nCategory: ${product.category}\nDescription: ${product.description || 'N/A'}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Caption generation failed: ${response.status} — ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content.trim();
  return JSON.parse(text);
}

async function waitForContainerReady(containerId, accessToken, { timeoutMs = 30000, intervalMs = 2000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(
      `https://graph.facebook.com/${IG_API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') {
      throw new Error(`Media container failed processing: ${JSON.stringify(data)}`);
    }
    // still IN_PROGRESS or EXPIRED (rare) — wait and check again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Timed out waiting for Instagram to finish processing the media container');
}

export async function publishToInstagram({ imageUrl, caption }) {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  const containerRes = await fetch(
    `https://graph.facebook.com/${IG_API_VERSION}/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
    }
  );
  const containerData = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(`Container creation failed: ${JSON.stringify(containerData)}`);
  }

  // Instagram needs a moment to download/process the image before it can be published —
  // publishing immediately after creation often fails with "media not ready"
  await waitForContainerReady(containerData.id, accessToken);

  const publishRes = await fetch(
    `https://graph.facebook.com/${IG_API_VERSION}/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
    }
  );
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(`Publish failed: ${JSON.stringify(publishData)}`);
  }

  return publishData.id;
}

export async function postProductToInstagram(supabase, product) {
  if (!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || !process.env.INSTAGRAM_ACCESS_TOKEN) {
    throw new Error('Instagram not configured — missing INSTAGRAM_BUSINESS_ACCOUNT_ID or INSTAGRAM_ACCESS_TOKEN');
  }
  if (!product.image_url) {
    throw new Error('Product has no image_url — run image backfill first');
  }
  if (!product.canada_verified) {
    throw new Error('Product is not verified as Canadian — approve it in admin first');
  }
  const affiliated = await isAffiliatedBrand(supabase, product.brand);
  if (!affiliated) {
    throw new Error(`Brand "${product.brand}" is not an approved affiliate — check Affiliate Programs in admin`);
  }

  const topExamples = await getTopPerformingExamples(supabase, product.category);
  const { caption, hashtags } = await generateCaption(product, topExamples);
  const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;
  const igPostId = await publishToInstagram({ imageUrl: product.image_url, caption: fullCaption });

  await supabase.from('instagram_posts').insert({
    product_id: product.id,
    caption,
    hashtags,
    image_url: product.image_url,
    post_id: igPostId,
    status: 'posted',
    posted_at: new Date().toISOString(),
  });

  await supabase
    .from('products')
    .update({ posted_to_instagram: true, instagram_caption: caption, hashtags })
    .eq('id', product.id);

  return { igPostId, caption, hashtags };
}
