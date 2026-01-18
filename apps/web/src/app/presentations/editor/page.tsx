// ============================================================
// PRESENTATION EDITOR PAGE
// ============================================================
// Full-screen editor for creating and editing presentations

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePresentationStore } from '@/stores/presentation-store';
import { PresentationEditor } from '@/components/presentation/PresentationEditor';

export default function EditorPage() {
  const router = useRouter();
  const { presentation } = usePresentationStore();

  // Redirect to presentations page if no presentation loaded
  useEffect(() => {
    if (!presentation) {
      router.push('/presentations');
    }
  }, [presentation, router]);

  if (!presentation) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Cargando...</div>
      </div>
    );
  }

  return <PresentationEditor />;
}
