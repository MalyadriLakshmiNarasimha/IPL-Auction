'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function JoinRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const code = (params.code as string || '').toUpperCase();
    if (code) {
      router.replace(`/room/${code}`);
    } else {
      router.replace('/join');
    }
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-center text-xs text-floodlight-muted">
      Joining room...
    </div>
  );
}

