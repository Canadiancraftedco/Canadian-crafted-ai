import { CATEGORIES, getFeaturedProducts, getRecommendationPool } from '@/lib/supabase';
import CinematicHomeLoader from '@/components/CinematicHomeLoader';
import Script from 'next/script';

export default async function Home() {
  const featured = await getFeaturedProducts(8);
  const pool = await getRecommendationPool(20);

  return (
    <>
      {/* AvantLink affiliate application ownership verification —
          required on the homepage only, per AvantLink's confirmation instructions.
          Safe to remove once the application shows as approved. */}
      <Script
        src="https://classic.avantlink.com/affiliate_app_confirm.php?mode=js&authResponse=ced4adb1275ec1f5ff0dd7de659cb119ebba0374"
        strategy="afterInteractive"
      />
      <CinematicHomeLoader categories={CATEGORIES} featured={featured} pool={pool} />
    </>
  );
}
