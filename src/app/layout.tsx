import type { Metadata } from 'next';
import './globals.css';
import { SoundToggle } from '@/components/SoundToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserNav } from '@/components/UserNav';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IPLAuction — Real-Time Multiplayer IPL Auction Game',
  description:
    'Draft real IPL stars live with friends using virtual money. Real-time split-flap scoreboard, authoritative timers, and authentic auction night broadcast feel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="floodlight-vignette min-h-screen flex flex-col justify-between selection:bg-flare selection:text-white">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-night/80 backdrop-blur-md border-b border-night-border px-4 py-2.5 sm:px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-flare flex items-center justify-center font-display font-black text-white text-xl shadow-flare group-hover:scale-105 transition-transform">
                IPL
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-tight text-floodlight leading-none">
                  AUCTION
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-flare">
                  LIVE BROADCAST
                </span>
              </div>
            </Link>

            {/* Quick Actions (Sound, Theme, Auth Profile) */}
            <div className="flex items-center gap-2.5">
              <SoundToggle />
              <ThemeToggle />
              <UserNav />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full">{children}</main>

        {/* Global Aria-Live Announcements for Screen Readers */}
        <div
          id="accessibility-announcer"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Legal & Safety Footer */}
        <footer className="border-t border-night-border bg-night/60 px-4 py-6 text-xs text-floodlight-muted">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-semibold text-floodlight">
                Unofficial fan game. Not affiliated with the BCCI, the IPL, or any franchise.
              </p>
              <p className="text-[11px] text-floodlight-subtle mt-0.5">
                Virtual money only. No real money, betting, prizes, or payments of any kind.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <Link href="/legal" className="hover:text-flare transition-colors">
                Legal & Disclaimer
              </Link>
              <span>·</span>
              <Link href="/legal#privacy" className="hover:text-flare transition-colors">
                Privacy
              </Link>
              <span>·</span>
              <Link href="/legal#terms" className="hover:text-flare transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

