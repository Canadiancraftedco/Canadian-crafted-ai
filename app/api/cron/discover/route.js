import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runDailyDiscovery } from '@/lib/discovery';

export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const results = await runDailyDiscovery(supabase);
    const totalInserted = Object.values(results).reduce((sum, r) => sum + (r.inserted || 0), 0);
    return NextResponse.json({ ok: true, totalInserted, byCategory: results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
