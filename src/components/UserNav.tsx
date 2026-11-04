'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, LogOut, LogIn, UserPlus, ChevronDown } from 'lucide-react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const UserNav: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Fetch authenticated user
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.authenticated && data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('ipl_session_token');
      localStorage.removeItem('ipl_display_name');
      setUser(null);
      setIsOpen(false);
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight text-xs font-bold transition-all"
      >
        <div className="w-5 h-5 rounded-full bg-flare text-white flex items-center justify-center font-black text-[10px]">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="truncate max-w-[100px] sm:max-w-[140px]">{user.name}</span>
        <ChevronDown className="w-3 h-3 text-floodlight-muted" />
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
