import { CATEGORIES, getFeaturedProducts } from '@/lib/supabase';
import CinematicHomeLoader from '@/components/CinematicHomeLoader';

export default async function Home() {
  const featured = await getFeaturedProducts(8);

  return <CinematicHomeLoader categories={CATEGORIES} featured={featured} />;
}
