import { CATEGORIES, getFeaturedProducts, getRecommendationPool } from '@/lib/supabase';
import CinematicHomeLoader from '@/components/CinematicHomeLoader';

export default async function Home() {
  const featured = await getFeaturedProducts(8);
  const pool = await getRecommendationPool(20);

  return <CinematicHomeLoader categories={CATEGORIES} featured={featured} pool={pool} />;
}
