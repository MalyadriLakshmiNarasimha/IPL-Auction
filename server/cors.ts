import http from 'http';

export const DEFAULT_ALLOWED_ORIGINS = [
  'https://iplauctionlive.netlify.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Returns the normalized list of allowed CORS origins.
 * Combines hardcoded defaults with CLIENT_ORIGIN and ALLOWED_ORIGINS env variables.
 */
export function getAllowedOrigins(): string[] {
  const origins = new Set<string>(DEFAULT_ALLOWED_ORIGINS);

  if (process.env.CLIENT_ORIGIN) {
    process.env.CLIENT_ORIGIN.split(',')
      .map(s => s.trim().replace(/\/$/, ''))
      .filter(Boolean)
      .forEach(o => origins.add(o));
  }

  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',')
      .map(s => s.trim().replace(/\/$/, ''))
      .filter(Boolean)
      .forEach(o => origins.add(o));
  }

  return Array.from(origins);
}

/**
 * Checks if a given request origin is in the allowed origins list.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return false;
  const cleanOrigin = origin.trim().replace(/\/$/, '');
  const allowed = getAllowedOrigins();
  return allowed.includes(cleanOrigin);
}

/**
 * Applies centralized, secure CORS headers to an HTTP response.
 * Returns true if the request was an OPTIONS preflight request that has been handled.
 */
export function applyCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();

  if (origin && isAllowedOrigin(origin)) {
    const cleanOrigin = origin.trim().replace(/\/$/, '');
    res.setHeader('Access-Control-Allow-Origin', cleanOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  } else if (!origin) {
    // Non-browser or server-to-server requests without Origin header
    res.setHeader('Access-Control-Allow-Origin', allowed[0]);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  }

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Origin not allowed by CORS policy' }));
      return true;
    }
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}

