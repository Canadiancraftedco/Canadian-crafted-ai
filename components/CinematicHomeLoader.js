'use client';

import dynamic from 'next/dynamic';

const CinematicHome = dynamic(() => import('./CinematicHome'), { ssr: false });

export default function CinematicHomeLoader(props) {
  return <CinematicHome {...props} />;
}
