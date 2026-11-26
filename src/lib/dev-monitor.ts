const REDACTED_KEYS = ['password', 'token', 'cookie', 'secret', 'authorization', 'session'];

export function sanitizeLogMessage(msg: string): string {
  if (!msg) return '';
  let out = msg;
  for (const key of REDACTED_KEYS) {
    const regex = new RegExp(`(${key}\\s*[:=]\\s*)([^\\s,;]+)`, 'gi');
    out = out.replace(regex, '$1[REDACTED]');
  }
  return out;
}

export function isDevMonitoringEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function logDevApiFailure(method: string, endpoint: string, status: number, reason?: string): void {
  if (!isDevMonitoringEnabled()) return;
  const cleanEndpoint = endpoint.split('?')[0];
  console.warn(
    `[DEV-MONITOR][API] ${method.toUpperCase()} ${cleanEndpoint} -> HTTP ${status}${
      reason ? ` (${sanitizeLogMessage(reason)})` : ''
    }`
  );
}

export function logDevError(source: string, err: unknown): void {
  if (!isDevMonitoringEnabled()) return;
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[DEV-MONITOR][${source}] ${sanitizeLogMessage(message)}`);
}
