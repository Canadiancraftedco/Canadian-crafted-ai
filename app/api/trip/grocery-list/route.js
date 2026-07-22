import { NextResponse } from 'next/server';
import { generateGroceryList } from '@/lib/tripPlanner';

export const maxDuration = 30;

export async function POST(request) {
  const { people, days, dietary, mealPlan } = await request.json();
  if (!people || !days) {
    return NextResponse.json({ ok: false, error: 'people and days are required' }, { status: 400 });
  }

  try {
    const categories = await generateGroceryList({ people, days, dietary, mealPlan });
    return NextResponse.json({ ok: true, categories });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
