import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runDiscovery } from '@/lib/discovery';

export const maxDuration = 60;

const CATEGORIES = ['outdoors', 'health', 'family', 'fitness'];

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % CATEGORIES.length;
  const category = CATEGORIES[dayIndex];

  try {
    const result = await runDiscovery(supabase, {
      query: `Canadian ${category} brands products made in Canada`,
      category,
    });
    return NextResponse.json({ ok: true, category, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, category, error: String(err) }, { status: 500 });
  }
}
