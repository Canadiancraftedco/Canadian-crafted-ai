import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const CATEGORIES = [
  { slug: 'outdoors', label: 'Outdoors', tagline: 'Camp, hike, paddle, fish' },
  { slug: 'health', label: 'Health', tagline: 'Natural wellness, made in Canada' },
  { slug: 'family', label: 'Family', tagline: 'Gear and care for the whole crew' },
  { slug: 'fitness', label: 'Fitness', tagline: 'Train harder, buy local' },
];

export async function getProductsByCategory(category) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('canada_verified', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error.message);
    return [];
  }
  return data || [];
}

export async function getFeaturedProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('canada_verified', true)
    .order('canada_confidence', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Supabase error:', error.message);
    return [];
  }
  return data || [];
}
