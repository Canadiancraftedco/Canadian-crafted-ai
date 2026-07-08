import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const IG_API_VERSION = 'v21.0';

async function generateCaption(product) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
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

  if (!response.ok) throw new Error(`Caption generation failed: ${response.status}`);
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

async function publishToInstagram({ imageUrl, caption }) {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  // Step 1: create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/${IG_API_VERSION}/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  );
  const containerData = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(`Container creation failed: ${JSON.stringify(containerData)}`);
  }

  // Step 2: publish the container
  const publishRes = await fetch(
    `https://graph.facebook.com/${IG_API_VERSION}/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: accessToken,
      }),
    }
  );
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(`Publish failed: ${JSON.stringify(publishData)}`);
  }

  return publishData.id; // this is the published post's IG media id
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || !process.env.INSTAGRAM_ACCESS_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'Instagram not configured — missing INSTAGRAM_BUSINESS_ACCOUNT_ID or INSTAGRAM_ACCESS_TOKEN env vars' },
      { status: 400 }
    );
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // pick one verified, image-having, not-yet-posted product
  const { data: candidates, error } = await supabase
    .from('products')
    .select('*')
    .eq('canada_verified', true)
    .not('image_url', 'is', null)
    .or('posted_to_instagram.is.null,posted_to_instagram.eq.false')
    .order('canada_confidence', { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, message: 'No eligible products to post right now.' });
  }

  const product = candidates[0];

  try {
    const { caption, hashtags } = await generateCaption(product);
    const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;

    const igPostId = await publishToInstagram({
      imageUrl: product.image_url,
      caption: fullCaption,
    });

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

    return NextResponse.json({ ok: true, product: product.name, ig_post_id: igPostId });
  } catch (err) {
    await supabase.from('instagram_posts').insert({
      product_id: product.id,
      status: 'failed',
      caption: null,
    });
    return NextResponse.json({ ok: false, product: product.name, error: String(err) }, { status: 500 });
  }
}
