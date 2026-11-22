'use client';

import React from 'react';
import Link from 'next/link';
import { Gavel, Sparkles, Shield, Heart } from 'lucide-react';

export const FooterSection: React.FC = () => {
  return (
    <footer className="relative border-t border-white/10 bg-[#08090B] text-floodlight-muted pt-14 pb-12 sm:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl border border-flare/50 bg-gradient-to-br from-[#DCC477] to-[#9D7A2C] flex items-center justify-center text-[#17130A] shadow-flare group-hover:-rotate-6 transition-transform">
                <Gavel className="w-5 h-5" strokeWidth={2.4} />
              </div>
              <div>
                <div className="font-display text-2xl font-black tracking-wider text-floodlight leading-none">
                  SPORTS AUCTION
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold tracking-[.25em] text-flare uppercase">
                  <Sparkles className="w-3 h-3" /> The bidding arena
                </div>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-floodlight-muted leading-relaxed max-w-sm">
              The premier multiplayer real-time sports auction platform. Host private auction rooms for Indian Premier League (IPL) and Pro Kabaddi League (PKL) with your friends.
            </p>

            <div className="flex items-center gap-2 text-xs text-floodlight-subtle">
              <Shield className="w-4 h-4 text-turf" />
              <span>100% Virtual Economy • Free to play with friends</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-floodlight mb-3.5">
                Arenas
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/create?sport=ipl" className="hover:text-flare transition-colors">
                    IPL Cricket Auction
                  </Link>
                </li>
                <li>
                  <Link href="/create?sport=pkl" className="hover:text-purple-400 transition-colors">
                    PKL Kabaddi Auction
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="hover:text-flare transition-colors">
                    Join with Room Code
                  </Link>
                </li>
                <li>
                  <Link href="/create" className="hover:text-flare transition-colors">
                    Create Custom Room
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-floodlight mb-3.5">
                Platform
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/history" className="hover:text-flare transition-colors">
                    My Rooms & History
                  </Link>
                </li>
                <li>
                  <a href="#features" className="hover:text-flare transition-colors">
                    Platform Features
                  </a>
                </li>
                <li>
                  <a href="#stats" className="hover:text-flare transition-colors">
                    Platform Statistics
                  </a>
                </li>
                <li>
                  <Link href="/legal" className="hover:text-flare transition-colors">
                    Scoring Methodology
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-floodlight mb-3.5">
                Legal & Info
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/legal" className="hover:text-flare transition-colors">
                    About Platform
                  </Link>
                </li>
                <li>
                  <Link href="/legal#privacy" className="hover:text-flare transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/legal#terms" className="hover:text-flare transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/legal#disclaimer" className="hover:text-flare transition-colors">
                    Credits & Disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/pkl-contact-sheet.html" target="_blank" className="hover:text-purple-400 transition-colors">
                    PKL Photos Verification
                  </Link>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Legal Disclaimer Box */}
        <div className="py-6 border-b border-white/5 text-[11px] sm:text-xs text-floodlight-subtle leading-relaxed">
          <p className="font-bold text-floodlight-muted uppercase tracking-wider mb-1">
            Legal Disclaimer & Non-Affiliation Notice
          </p>
          <p>
            Sports Auction – The Bidding Arena is an independent, unofficial fan-made auction simulation game developed strictly for social recreation and educational strategy entertainment. This platform is not affiliated with, endorsed by, sponsored by, or associated in any way with the Board of Control for Cricket in India (BCCI), the Indian Premier League (IPL), Mashal Sports Pvt. Ltd., the Pro Kabaddi League (PKL), or any of their respective member franchises, teams, or commercial partners.
          </p>
          <p className="mt-1.5">
            All team identities, franchise names, trademarks, player names, and likenesses referenced herein belong to their respective proprietary owners. All bids and transactions within this application utilize purely virtual credits and carry zero monetary value.
          </p>
        </div>

        {/* Copyright Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-floodlight-subtle text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} Sports Auction – The Bidding Arena. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Built with passion for sports fans and auction strategists.
          </p>
        </div>

      </div>
    </footer>
  );
};
