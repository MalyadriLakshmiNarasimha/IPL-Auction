'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Gavel, Sparkles } from 'lucide-react';
import { SoundToggle } from '@/components/SoundToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserNav } from '@/components/UserNav';

export const NavigationShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname() || '';
  const isRoomPage = pathname.startsWith('/room/');

  return (
    <>
      {!isRoomPage && (
        <header className="sticky top-0 z-40 border-b px-4 py-3 sm:px-6 bg-[#08090B]/90 backdrop-blur-md border-flare/20">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 group min-w-0">
              <div className="w-10 h-10 rounded-xl border border-flare/50 bg-gradient-to-br from-[#DCC477] to-[#9D7A2C] flex items-center justify-center text-[#17130A] shadow-flare group-hover:-rotate-6 transition-transform">
                <Gavel className="w-5 h-5" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl sm:text-[27px] font-bold tracking-[.07em] text-floodlight leading-[.9]">
                  IPL AUCTION
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold tracking-[.25em] text-flare uppercase">
                  <Sparkles className="w-3 h-3" /> The bidding arena
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <nav className="hidden md:flex items-center gap-6 mr-3 text-xs font-semibold text-floodlight-muted">
                <Link href="/" className="hover:text-flare transition-colors">Home</Link>
                <Link href="/create" className="hover:text-flare transition-colors">Create room</Link>
                <Link href="/join" className="hover:text-flare transition-colors">Join room</Link>
                <Link href="/history" className="hover:text-flare transition-colors">History</Link>
              </nav>
              <SoundToggle />
              <ThemeToggle />
              <UserNav />
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 w-full">{children}</main>

      {!isRoomPage && (
        <footer className="border-t px-4 py-6 text-xs text-floodlight-muted bg-[#08090B]/80 border-night-border">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-semibold text-floodlight">An unofficial IPL-inspired fan game.</p>
              <p className="text-[11px] text-floodlight-subtle mt-1">
                Virtual money only. Not affiliated with the BCCI, IPL or any franchise.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <Link href="/legal" className="hover:text-flare transition-colors">Legal & Disclaimer</Link>
              <span className="text-flare/50">•</span>
              <Link href="/legal#privacy" className="hover:text-flare transition-colors">Privacy</Link>
              <span className="text-flare/50">•</span>
              <Link href="/legal#terms" className="hover:text-flare transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      )}
    </>
  );
};

