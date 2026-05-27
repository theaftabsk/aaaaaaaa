'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DevicesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/whatsapp');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Redirecting to official WhatsApp Cloud API Manager...</p>
      </div>
    </div>
  );
}
