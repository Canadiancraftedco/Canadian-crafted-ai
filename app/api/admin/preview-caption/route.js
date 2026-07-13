import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/adminAuth';
import { generateCaption } from '@/lib/instagram';

export async function POST(request) {
  const token = cookies().get('admin_session')?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { product } = await request.json();
  if (!product) return NextResponse.json({ ok: false, error: 'product required' }, { status: 400 });

  try {
    const result = await generateCaption(product);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
