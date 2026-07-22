import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/adminAuth';

function requireSession() {
  const token = cookies().get('admin_session')?.value;
  return verifySessionToken(token);
}

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET() {
  if (!requireSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(request) {
  if (!requireSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const required = ['name', 'brand', 'category', 'product_url'];
  for (const field of required) {
    if (!body[field]) return NextResponse.json({ error: `${field} is required` }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .insert({
      id: crypto.randomUUID(),
      name: body.name,
      brand: body.brand,
      category: body.category,
      price: body.price ?? null,
      currency: 'CAD',
      description: body.description || null,
      product_url: body.product_url || null,
      image_url: body.image_url || null,
      source_site: 'manual_admin_entry',
      canada_verified: body.canada_verified ?? true,
      canada_confidence: 1,
      scraped_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, product: data });
}

export async function PATCH(request) {
  if (!requireSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, updates } = await request.json();
  if (!id || !updates) {
    return NextResponse.json({ error: 'id and updates required' }, { status: 400 });
  }

  // only allow specific fields to be edited from the admin UI
  const allowed = ['name', 'brand', 'price', 'description', 'category', 'canada_verified', 'image_url', 'product_url'];
  const safeUpdates = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase.from('products').update(safeUpdates).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  if (!requireSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
