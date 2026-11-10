'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { LogOut, LogIn, UserPlus, ChevronDown } from 'lucide-react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

// Global in-flight deduplicator for /api/auth/me requests across components
let inFlightAuthPromise: Promise<any> | null = null;

function verifyAuthSession(): Promise<any> {
  if (!inFlightAuthPromise) {
    inFlightAuthPromise = apiFetch('/api/auth/me').finally(() => {
      setTimeout(() => {
        inFlightAuthPromise = null;
      }, 500);
    });
  }
  return inFlightAuthPromise;
}

export const UserNav: React.FC = () => {
  const router = useRouter();

  // Instant hydration from local storage cache to eliminate flicker
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ipl_auth_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('ipl_auth_cache');
    }
    return true;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isMounted = useRef(true);

  const checkAuth = useCallback(async () => {
    try {
      const { ok, data } = await verifyAuthSession();
      if (!isMounted.current) return;

      if (ok && data?.authenticated && data?.user) {
        setUser(data.user);
        try {
          localStorage.setItem('ipl_auth_cache', JSON.stringify(data.user));
          localStorage.setItem('ipl_display_name', data.user.name);
          if (data.socket_token) {
            localStorage.setItem('ipl_session_token', data.socket_token);
          }
        } catch {}
      } else if (ok && data?.authenticated === false) {
        // Authoritative unauthenticated response from server
        setUser(null);
        try {
          localStorage.removeItem('ipl_auth_cache');
          localStorage.removeItem('ipl_session_token');
        } catch {}
      }
      // If !ok (network blip, 502/503), preserve cached user to prevent flickering
    } catch {
      // Preserve existing user state on network blip
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    checkAuth();

    // Listen for intra-tab auth changes (login / logout)
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<AuthUser | null>;
      if (customEvent.detail) {
        setUser(customEvent.detail);
        setIsLoading(false);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    };

    // Listen for cross-tab auth changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ipl_auth_cache') {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {}
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    };

    window.addEventListener('ipl-auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted.current = false;
      window.removeEventListener('ipl-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuth]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Immediately clear state locally for instant UI update
    setUser(null);
    setIsOpen(false);

    try {
      localStorage.removeItem('ipl_session_token');
      localStorage.removeItem('ipl_auth_cache');
      localStorage.removeItem('ipl_display_name');
    } catch {}

    // Disconnect active socket session
    try {
      disconnectSocket();
    } catch {}

    // Dispatch intra-tab event so other components update synchronously
    window.dispatchEvent(new CustomEvent('ipl-auth-change', { detail: null }));

    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      setIsLoggingOut(false);
      router.push('/');
      router.refresh();
    }
  };

  // 1. Explicit loading skeleton: DO NOT show "Log In" while checking authentication
  if (isLoading && !user) {
    return (
      <div className="flex items-center gap-2" aria-busy="true" aria-label="Loading authentication">
        <div className="w-16 h-7 rounded-pill bg-night-raised/80 border border-night-border/40 animate-pulse" />
        <div className="w-20 h-7 rounded-pill bg-flare/15 border border-flare/30 animate-pulse" />
      </div>
    );
  }

  // 2. Unauthenticated state: display Log In & Register actions
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="px-3 py-1.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <LogIn className="w-3.5 h-3.5 text-flare" />
          <span>Log In</span>
        </Link>
        <Link
          href="/register"
          className="px-3.5 py-1.5 rounded-pill bg-flare hover:bg-flare-hover text-white text-xs font-bold shadow-flare transition-all flex items-center gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register</span>
        </Link>
      </div>
    );
  }

  // 3. Authenticated state: display user pill & dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight text-xs font-bold transition-all"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 rounded-full bg-flare text-white flex items-center justify-center font-black text-[10px]">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="truncate max-w-[100px] sm:max-w-[140px]">{user.name}</span>
        <ChevronDown className={`w-3 h-3 text-floodlight-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-card bg-night border border-night-border shadow-xl p-2 z-50 text-xs">
          <div className="p-2 border-b border-night-border">
            <div className="font-bold text-floodlight truncate">{user.name}</div>
            <div className="text-[10px] text-floodlight-muted truncate">{user.email}</div>
          </div>

          <div className="pt-1">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-hammer hover:bg-hammer/10 transition-colors font-bold text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
