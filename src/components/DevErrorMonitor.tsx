'use client';

import { useEffect } from 'react';
import { isDevMonitoringEnabled, logDevError } from '@/lib/dev-monitor';

export function DevErrorMonitor() {
  useEffect(() => {
    if (!isDevMonitoringEnabled()) return;

    const handleError = (event: ErrorEvent) => {
      logDevError('FRONTEND_RUNTIME', event.error || event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logDevError('UNHANDLED_PROMISE', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
