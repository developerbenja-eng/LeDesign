'use client';

import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues with Leaflet
const WaterNetworkStudio = dynamic(
  () => import('@/components/water-network/WaterNetworkStudio'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Cargando Water Network Studio...</p>
        </div>
      </div>
    ),
  }
);

export default function WaterNetworkPage() {
  return <WaterNetworkStudio />;
}
