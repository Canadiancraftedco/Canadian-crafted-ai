// Shotstack video rendering — the actual encoding happens on Shotstack's
// servers, not ours, so this never risks Vercel's function timeout. We submit
// a render job (fast) and separately check on it later (also fast).
//
// NOTE: verify SHOTSTACK_API_URL against your Shotstack dashboard — sandbox
// vs production endpoints/keys are separate, and their exact paths can
// change. Default here is their documented sandbox/stage endpoint; swap to
// production once you're ready to render without any sandbox limitations.

const SHOTSTACK_API_URL = process.env.SHOTSTACK_API_URL || 'https://api.shotstack.io/stage';

export function buildReelTimeline(product, hookText) {
  return {
    timeline: {
      background: '#0A0F0C',
      tracks: [
        {
          clips: [
            {
              asset: { type: 'title', text: hookText, style: 'minimal', color: '#ECE9E1', size: 'medium', position: 'bottom' },
              start: 0.5,
              length: 6.5,
              transition: { in: 'fade', out: 'fade' },
            },
          ],
        },
        {
          clips: [
            {
              asset: { type: 'image', src: product.image_url },
              start: 0,
              length: 7,
              effect: 'zoomIn',
              transition: { in: 'fade' },
            },
          ],
        },
      ],
    },
    output: {
      format: 'mp4',
      size: { width: 1080, height: 1920 }, // 9:16 for Reels
    },
  };
}

export async function submitRender(timeline) {
  const res = await fetch(`${SHOTSTACK_API_URL}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SHOTSTACK_API_KEY,
    },
    body: JSON.stringify(timeline),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Shotstack render submission failed: ${JSON.stringify(data)}`);
  }
  return data.response.id;
}

export async function checkRenderStatus(renderId) {
  const res = await fetch(`${SHOTSTACK_API_URL}/render/${renderId}`, {
    headers: { 'x-api-key': process.env.SHOTSTACK_API_KEY },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Shotstack status check failed: ${JSON.stringify(data)}`);
  }
  // status: queued | fetching | rendering | saving | done | failed
  return { status: data.response.status, url: data.response.url || null, error: data.response.error || null };
}
