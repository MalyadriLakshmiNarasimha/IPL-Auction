/**
 * Centralized API Client and URL Configuration for IPL Auction
 *
 * Directs API requests to:
 * - Production: Same-origin relative URLs on Netlify by default (or custom NEXT_PUBLIC_API_URL if configured)
 * - Local development: http://localhost:3001 (Authoritative backend)
 *
 * Automatically includes credentials: "include" for HTTP-only session cookies.
 * Provides resilient fallback to same-origin proxies if cross-origin requests encounter 404, 502, or network failures.
 */

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // In the browser, always use same-origin relative URLs for REST API endpoints.
    // This completely eliminates cross-domain cookie rejection (Safari ITP, Chrome Privacy Sandbox),
    // avoids CORS preflight latency, and prevents authentication flickering.
    return '';
  }

  // Server-side / SSR default
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

/**
 * Universal authenticated fetch client.
 * Enforces credentials: "include", handles preflights, and extracts error messages.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const backendBase = getApiUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If endpoint is a full URL, use it; otherwise prepend backend base URL
  const targetUrl = endpoint.startsWith('http')
    ? endpoint
    : `${backendBase}${normalizedEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Include session token in Authorization header as redundant defense against cookie restrictions
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const sessionToken = localStorage.getItem('ipl_session_token');
    if (sessionToken) {
      headers.set('Authorization', `Bearer ${sessionToken}`);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send and accept HTTP-only cookies
  };

  try {
    const res = await fetch(targetUrl, fetchOptions);

    // If a cross-origin request returned 404, 502, 503, or 504 and we are in the browser,
    // automatically attempt same-origin fallback
    if (!res.ok && typeof window !== 'undefined' && targetUrl.startsWith('http') && !targetUrl.startsWith(window.location.origin)) {
      if ([404, 502, 503, 504].includes(res.status)) {
        try {
          console.warn(`[API] Cross-origin ${targetUrl} returned status ${res.status}. Attempting same-origin fallback: ${normalizedEndpoint}`);
          const fallbackRes = await fetch(normalizedEndpoint, fetchOptions);
          const fallbackContentType = fallbackRes.headers.get('content-type') || '';
          const fallbackData = fallbackContentType.includes('application/json')
            ? await fallbackRes.json().catch(() => ({}))
            : await fallbackRes.text().catch(() => '');

          if (fallbackRes.ok) {
            return { ok: true, status: fallbackRes.status, data: fallbackData };
          }
        } catch {}
      }
    }

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '');

    if (!res.ok) {
      const errorMsg =
        (typeof data === 'object' && data?.error) ||
        (typeof data === 'string' && data.length < 200 ? data : '') ||
        `Request failed with status ${res.status}`;
      return { ok: false, status: res.status, data, error: errorMsg };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    // If network fetch failed completely (e.g. CORS block, network blip), try same-origin fallback
    if (typeof window !== 'undefined' && targetUrl.startsWith('http') && !targetUrl.startsWith(window.location.origin)) {
      try {
        console.warn(`[API] Cross-origin fetch to ${targetUrl} failed (${err.message}). Attempting same-origin fallback: ${normalizedEndpoint}`);
        const fallbackRes = await fetch(normalizedEndpoint, fetchOptions);
        const fallbackContentType = fallbackRes.headers.get('content-type') || '';
        const fallbackData = fallbackContentType.includes('application/json')
          ? await fallbackRes.json().catch(() => ({}))
          : await fallbackRes.text().catch(() => '');

        if (!fallbackRes.ok) {
          const fallbackErr =
            (typeof fallbackData === 'object' && fallbackData?.error) ||
            `Request failed with status ${fallbackRes.status}`;
          return { ok: false, status: fallbackRes.status, data: fallbackData, error: fallbackErr };
        }

        return { ok: true, status: fallbackRes.status, data: fallbackData };
      } catch (fallbackErr: any) {
        // Both primary and fallback failed
      }
    }

    const friendlyMessage =
      err.message === 'Failed to fetch'
        ? 'Unable to connect to the auction server. Please verify your internet connection or backend server status.'
        : err.message || 'Network request failed';

    return {
      ok: false,
      status: 0,
      data: {} as T,
      error: friendlyMessage,
    };
  }
}
