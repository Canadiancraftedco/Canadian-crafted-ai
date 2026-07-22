import { CATEGORIES, getFeaturedProducts, getRecommendationPool } from '@/lib/supabase';
import CinematicHomeLoader from '@/components/CinematicHomeLoader';

export default async function Home() {
  const featured = await getFeaturedProducts(8);
  const pool = await getRecommendationPool(20);

  return (
    <>
      {/* AvantLink affiliate application ownership verification — required on the
          homepage only. Uses a plain server-rendered <script> (not next/script)
          so it's present in the raw HTML AvantLink's verification crawler fetches —
          next/script's afterInteractive strategy only injects it client-side via JS,
          which a non-JS-executing crawler never sees.
          Safe to remove once the application shows as approved. */}
      <script
        src="https://classic.avantlink.com/affiliate_app_confirm.php?mode=js&authResponse=ced4adb1275ec1f5ff0dd7de659cb119ebba0374"
      />
      <CinematicHomeLoader categories={CATEGORIES} featured={featured} pool={pool} />
    </>
  );
}
