import type { Metadata } from 'next';
import './globals.css';
import { NavigationShell } from '@/components/NavigationShell';

export const metadata: Metadata = {
  title: 'IPLAuction — Real-Time Multiplayer IPL Auction Game',
  description:
    'Build your dream IPL squad with friends in a premium real-time auction room. Bid with virtual purse money and compete on squad strength.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="floodlight-vignette min-h-screen flex flex-col selection:bg-flare selection:text-black">
        <NavigationShell>{children}</NavigationShell>
        <div id="accessibility-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
      </body>
    </html>
  );
}
