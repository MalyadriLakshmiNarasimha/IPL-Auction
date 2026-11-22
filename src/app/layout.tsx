import type { Metadata } from 'next';
import './globals.css';
import { NavigationShell } from '@/components/NavigationShell';

export const metadata: Metadata = {
  title: 'SPORTS AUCTION — The Bidding Arena',
  description:
    'Build your dream sports squad with friends in a real-time multiplayer auction room across IPL Cricket and PKL Kabaddi.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
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
