'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Trophy, Users, Zap, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  type: 'room_invite' | 'auction_start' | 'sold_alert' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  sport?: 'IPL' | 'PKL';
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'room_invite',
    title: 'PKL Pro Auction Ready',
    message: 'Pro Kabaddi League arena is live! Create your room and bid for legends.',
    timestamp: 'Just now',
    read: false,
    link: '/create?sport=pkl',
    sport: 'PKL',
  },
  {
    id: 'notif-2',
    type: 'auction_start',
    title: 'IPL Mega Auction Pool',
    message: '274 verified players available across 10 official franchises.',
    timestamp: '10m ago',
    read: false,
    link: '/create?sport=ipl',
    sport: 'IPL',
  },
  {
    id: 'notif-3',
    type: 'system',
    title: 'Dual League Platform Live',
    message: 'Sports Auction now supports both IPL Cricket and PKL Kabaddi in real-time.',
    timestamp: '1h ago',
    read: true,
  },
];

export const NotificationsPopover: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check local authentication cache
    try {
      const cached = localStorage.getItem('ipl_auth_cache');
      setIsAuthenticated(!!cached);
    } catch {
      setIsAuthenticated(false);
    }

    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      setIsAuthenticated(!!customEvent.detail);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ipl_auth_cache') {
        setIsAuthenticated(!!e.newValue);
      }
    };

    window.addEventListener('ipl-auth-change', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('ipl-auth-change', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Bug Fix 1: Hide the notification bell and its badge for logged-out users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="relative w-9 h-9 rounded-xl border border-white/10 bg-[#151618] hover:border-flare/40 flex items-center justify-center text-floodlight-muted hover:text-flare transition-all active:scale-95"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-amber-500 to-purple-600 text-[9px] font-black text-white flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-white/15 bg-[#101113]/95 backdrop-blur-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-floodlight">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-flare/15 text-flare font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-floodlight-muted hover:text-flare font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-floodlight-muted hover:text-white p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto py-1">
            {notifications.map(item => (
              <div
                key={item.id}
                className={`py-3 px-2 rounded-xl transition-colors ${
                  item.read ? 'opacity-70 hover:opacity-100' : 'bg-white/[0.03]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      item.sport === 'PKL'
                        ? 'border border-purple-500/30 bg-purple-500/15 text-purple-400'
                        : 'border border-amber-500/30 bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {item.sport === 'PKL' ? <Zap className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-xs font-bold text-floodlight truncate">{item.title}</div>
                      <span className="text-[10px] text-floodlight-subtle shrink-0">{item.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-floodlight-muted mt-0.5 leading-snug">{item.message}</p>
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-block mt-1.5 text-[10px] font-bold text-flare hover:underline"
                      >
                        Enter Arena →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 mt-2 border-t border-white/5 text-center">
            <Link
              href="/history"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-floodlight-muted hover:text-flare transition-colors"
            >
              View Room History & Results →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
