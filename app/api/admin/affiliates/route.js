import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/adminAuth';
import { scanBrandForAffiliateProgram } from '@/lib/affiliates';

export const maxDuration = 60;

function requireSession() {
  const token = cookies().get('admin_session')?.value;
  return verifySessionToken(token);
}

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET: list all brand affiliate statuses, joined with product counts
export async function GET() {
  if (!requireSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = supabaseAdmin();

  const { data: statuses, error } = await supabase
    .from('brand_affiliate_status')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: products } = await supabase.from('products').select('brand');
  const allBrands = [...new Set((products || []).map((p) => p.brand))];
  const scannedBrands = new Set(statuses.map((s) => s.brand));
  const unscanned = allBrands.filter((b) => !scannedBrands.has(b));

  return NextResponse.json({ statuses, unscanned });
}

// POST: scan one brand (or all unscanned brands if brand === 'ALL')
export async function POST(request) {
  if (!requireSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { brand } = await request.json();
  if (!brand) return NextResponse.json({ error: 'brand required' }, { status: 400 });

  const supabase = supabaseAdmin();

  try {
    const result = await scanBrandForAffiliateProgram(supabase, brand);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// PATCH: manually update status/commission/notes (this is where YOU record real application outcomes)
export async function PATCH(request) {
  if (!requireSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { brand, updates } = await request.json();
  if (!brand || !updates) return NextResponse.json({ error: 'brand and updates required' }, { status: 400 });

  const allowed = ['status', 'commission_pct', 'notes', 'program_url', 'network'];
  const safeUpdates = { updated_at: new Date().toISOString() };
  for (const key of allowed) if (key in updates) safeUpdates[key] = updates[key];

  const supabase = supabaseAdmin();
  const { error } = await supabase.from('brand_affiliate_status').update(safeUpdates).eq('brand', brand);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
