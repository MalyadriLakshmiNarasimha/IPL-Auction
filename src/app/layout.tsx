import type { Metadata } from 'next';
import './globals.css';
import { SoundToggle } from '@/components/SoundToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserNav } from '@/components/UserNav';
import Link from 'next/link';
import { Gavel, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'IPLAuction — Real-Time Multiplayer IPL Auction Game',
  description:
    'Build your dream IPL squad with friends in a premium real-time auction room. Bid with virtual purse money and compete on squad strength.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="floodlight-vignette min-h-screen flex flex-col selection:bg-flare selection:text-black">
        <header className="sticky top-0 z-40 border-b px-4 py-3 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 group min-w-0">
              <div className="w-10 h-10 rounded-xl border border-flare/50 bg-gradient-to-br from-[#DCC477] to-[#9D7A2C] flex items-center justify-center text-[#17130A] shadow-flare group-hover:-rotate-6 transition-transform">
                <Gavel className="w-5 h-5" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl sm:text-[27px] font-bold tracking-[.07em] text-floodlight leading-[.9]">IPL AUCTION</div>
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
              </nav>
              <SoundToggle />
              <ThemeToggle />
              <UserNav />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full">{children}</main>

        <div id="accessibility-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />

        <footer className="border-t px-4 py-6 text-xs text-floodlight-muted">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-semibold text-floodlight">An unofficial IPL-inspired fan game.</p>
              <p className="text-[11px] text-floodlight-subtle mt-1">Virtual money only. Not affiliated with the BCCI, IPL or any franchise.</p>
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
      </body>
    </html>
  );
}
