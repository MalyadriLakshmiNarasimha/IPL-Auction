'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Gavel,
  Sparkles,
  Trophy,
  Menu,
  X,
  BarChart2,
  History as HistoryIcon,
  Home,
  Users,
  User,
  PlusCircle,
  LogIn,
  UserPlus
} from 'lucide-react';
import { SoundToggle } from '@/components/SoundToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserNav } from '@/components/UserNav';
import { NotificationsPopover } from '@/components/NotificationsPopover';
import { LeaderboardModal } from '@/components/LeaderboardModal';

export const NavigationShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname() || '';
  const router = useRouter();
  const isRoomPage = pathname.startsWith('/room/');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
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

    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleProfileClick = () => {
    if (isAuthenticated) {
      router.push('/history');
    } else {
      router.push('/login');
    }
  };

  return (
    <>
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />

      {!isRoomPage && (
        <header className="sticky top-0 z-40 border-b px-3 sm:px-6 py-2.5 sm:py-3 bg-[#08090B]/95 backdrop-blur-md border-white/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Brand Logo & Title */}
            <Link href="/" className="flex items-center gap-2 group shrink-0" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-8 h-8 rounded-lg sm:rounded-xl border border-amber-400/40 bg-gradient-to-br from-[#DCC477] via-[#B89643] to-[#8C43E6] flex items-center justify-center text-[#17130A] shadow-flare group-hover:-rotate-6 transition-transform shrink-0">
                <Gavel className="w-4 h-4 text-white" strokeWidth={2.4} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display text-sm min-[360px]:text-base sm:text-xl font-black tracking-wider text-floodlight leading-none whitespace-nowrap">
                  SPORTS AUCTION
                </span>
                <span className="hidden min-[380px]:flex items-center gap-1 mt-0.5 text-[7px] sm:text-[8.5px] font-bold tracking-[.18em] text-flare uppercase whitespace-nowrap">
                  <Sparkles className="w-2 h-2 text-amber-400" />
                  <span>The Bidding Arena</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation (Matching reference image center pills) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold text-floodlight-muted bg-white/[0.03] border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <Link
                href="/"
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full transition-all ${
                  pathname === '/'
                    ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 shadow-sm'
                    : 'hover:text-flare'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </Link>
              <Link
                href="/history?tab=ongoing"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all hover:text-flare ${
                  pathname === '/history' ? 'text-flare' : ''
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>My Rooms</span>
              </Link>
              <Link
                href="/history"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all hover:text-flare"
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                <span>History</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all hover:text-flare cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Leaderboard</span>
              </button>
              <a
                href="/#stats"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all hover:text-flare"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Stats</span>
              </a>
            </nav>

            {/* Right Controls (Desktop & Mobile) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Notification bell: Hidden for logged-out users via NotificationsPopover */}
              <NotificationsPopover />
              <div className="hidden sm:flex items-center gap-1.5">
                <SoundToggle />
                <ThemeToggle />
              </div>
              <UserNav />

              {/* Mobile Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
                className="lg:hidden w-8 h-8 rounded-xl border border-white/10 bg-[#151618] hover:border-flare/40 flex items-center justify-center text-floodlight-muted hover:text-flare transition-colors ml-0.5"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Collapsible Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden pt-3 pb-2 border-t border-white/10 mt-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Guest Quick Actions: Log In & Register */}
              {!isAuthenticated && (
                <div className="flex items-center gap-2 px-1 mb-2.5 pb-2.5 border-b border-white/10">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-night-raised border border-night-border text-center text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5 text-flare" />
                    <span>Log In</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-flare text-center text-xs font-extrabold text-[#17130A] flex items-center justify-center gap-1.5 shadow-flare"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </Link>
                </div>
              )}

              <nav className="flex flex-col gap-1 text-xs font-semibold text-floodlight px-1">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-flare transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-400" />
                    <span>Home Arena</span>
                  </span>
                  <span className="text-[9px] uppercase font-bold text-flare">Active</span>
                </Link>

                <Link
                  href="/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl bg-flare/10 border border-flare/20 text-flare font-bold transition-colors flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Room</span>
                </Link>

                <Link
                  href="/join"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-flare transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Join with Code</span>
                </Link>

                <Link
                  href="/history?tab=ongoing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-flare transition-colors flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>My Rooms</span>
                </Link>

                <Link
                  href="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-flare transition-colors flex items-center gap-2"
                >
                  <HistoryIcon className="w-4 h-4" />
                  <span>History & Results</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsLeaderboardOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 hover:text-flare transition-colors flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-purple-400" />
                  <span>Leaderboard</span>
                </button>

                <a
                  href="/#stats"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-flare transition-colors flex items-center gap-2"
                >
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                  <span>Platform Stats</span>
                </a>
              </nav>
            </div>
          )}
        </header>
      )}

      {/* Main Content Area with Bottom Padding on Mobile so Fixed Bottom Nav Never Hides Content */}
      <main className={`flex-1 w-full overflow-x-hidden ${!isRoomPage ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0' : ''}`}>
        {children}
      </main>

      {/* Footer */}
      {!isRoomPage && (
        <footer className="border-t px-4 py-6 text-xs text-floodlight-muted bg-[#08090B] border-white/10 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-semibold text-floodlight">Sports Auction – The Bidding Arena</p>
              <p className="text-[11px] text-floodlight-subtle mt-1">
                Virtual money only. Unofficial fan game not affiliated with BCCI, IPL, PKL, or any franchise.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <Link href="/legal" className="hover:text-flare transition-colors">Legal & Disclaimer</Link>
              <span className="text-white/20">•</span>
              <Link href="/legal#privacy" className="hover:text-flare transition-colors">Privacy</Link>
              <span className="text-white/20">•</span>
              <Link href="/legal#terms" className="hover:text-flare transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      )}

      {/* Mobile Fixed Bottom Navigation Bar (Matching Reference Mobile Screen on Right) */}
      {!isRoomPage && (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0C0F]/95 backdrop-blur-xl border-t border-white/10 px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] shadow-[0_-10px_25px_rgba(0,0,0,0.7)]"
        >
          <div className="flex items-center justify-around max-w-md mx-auto">
            {/* 1. Home */}
            <Link
              href="/"
              className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
                pathname === '/' ? 'text-amber-300 font-bold' : 'text-floodlight-muted hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-lg ${pathname === '/' ? 'bg-amber-400/15' : ''}`}>
                <Home className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Home</span>
            </Link>

            {/* 2. My Rooms */}
            <Link
              href="/history?tab=ongoing"
              className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
                pathname === '/history' ? 'text-amber-300 font-bold' : 'text-floodlight-muted hover:text-white'
              }`}
            >
              <div className="p-1 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">My Rooms</span>
            </Link>

            {/* 3. History */}
            <Link
              href="/history"
              className="flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl text-floodlight-muted hover:text-white transition-colors"
            >
              <div className="p-1 rounded-lg">
                <HistoryIcon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">History</span>
            </Link>

            {/* 4. Stats */}
            <a
              href="/#stats"
              className="flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl text-floodlight-muted hover:text-white transition-colors"
            >
              <div className="p-1 rounded-lg">
                <BarChart2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Stats</span>
            </a>

            {/* 5. Profile */}
            <button
              type="button"
              onClick={handleProfileClick}
              className="flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl text-floodlight-muted hover:text-white transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-lg">
                <User className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Profile</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
};
