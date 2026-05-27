'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TokensRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/ai-bot?tab=tokens');
  }, [router]);

  return (
    <div className="flex h-96 items-center justify-center text-slate-500 text-xs font-semibold">
      Redirecting to AI Tokens Tab...
    </div>
  );
}
