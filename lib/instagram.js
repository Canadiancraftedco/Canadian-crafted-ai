const IG_API_VERSION = 'v21.0';

export async function generateCaption(product) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      system: `You write short, genuine-sounding Instagram captions for Canadian Crafted Co.,
an account that highlights real Canadian outdoor/health/family/fitness products. Tone: warm,
enthusiastic but not salesy, proud of Canadian makers. 2-4 sentences max, no more than 2 emoji.
End with a simple call to action like "link in bio" — never fabricate claims about the product.

Respond with ONLY JSON, no markdown fences:
{"caption": "string", "hashtags": ["#tag1", "#tag2", ...] }
Provide 8-12 relevant hashtags mixing broad (#CanadianMade) and specific ones.`,
      messages: [
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
  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(text);
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

  const { caption, hashtags } = await generateCaption(product);
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
