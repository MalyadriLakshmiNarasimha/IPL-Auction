'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-floodlight-muted hover:text-flare mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-floodlight tracking-tight">
          LEGAL & DISCLAIMERS
        </h1>
        <p className="text-xs text-floodlight-muted mt-1">
          Compliance, Safety, and Privacy Policies for IPLAuction
        </p>
      </div>

      {/* Primary Disclaimer Box */}
      <div className="p-5 rounded-card bg-night border border-night-border space-y-3">
        <div className="flex items-center gap-2 text-flare font-bold text-sm">
          <Shield className="w-5 h-5 text-flare" />
          <span>1. Fan Project Disclaimer</span>
        </div>
        <p className="text-xs text-floodlight-muted leading-relaxed">
          <strong>Unofficial fan game. Not affiliated with the BCCI, the IPL, or any franchise.</strong> This website is an independent interactive simulation built for educational and entertainment purposes among cricket fans. All cricket statistics and player identities are public knowledge. We do not use proprietary franchise logos, official trademarks, or copyrighted player photographs.
        </p>
      </div>

      {/* Virtual Money Only */}
      <div className="p-5 rounded-card bg-night border border-night-border space-y-3">
        <div className="flex items-center gap-2 text-turf font-bold text-sm">
          <Shield className="w-5 h-5 text-turf" />
          <span>2. Strict Virtual Money Policy (No Gambling or Betting)</span>
        </div>
        <p className="text-xs text-floodlight-muted leading-relaxed">
          All monetary values displayed (such as ₹100 Cr, ₹20 L, etc.) represent <strong>strictly virtual points</strong>. This application does not support, process, facilitate, or connect to any real-world money, payment gateways, betting, wagering, sweepstakes, or prizes of any kind. No financial consideration is ever required to play.
        </p>
      </div>

      {/* Privacy Policy */}
      <div id="privacy" className="p-5 rounded-card bg-night border border-night-border space-y-3">
        <div className="font-bold text-sm text-floodlight">3. Privacy Policy</div>
        <p className="text-xs text-floodlight-muted leading-relaxed">
          We respect user privacy. IPLAuction does not require email addresses, passwords, phone numbers, or social logins. Users are identified through anonymous session tokens stored in your browser&apos;s localStorage for reconnecting to active auction rooms. Chat messages and bids are transiently retained during the room lifecycle and discarded upon completion.
        </p>
      </div>

      {/* Terms of Service */}
      <div id="terms" className="p-5 rounded-card bg-night border border-night-border space-y-3">
        <div className="font-bold text-sm text-floodlight">4. Terms of Service</div>
        <p className="text-xs text-floodlight-muted leading-relaxed">
          By creating or joining a room, you agree to treat fellow participants with respect. Abusive chat messages or harassment are prohibited. Room hosts retain the power to kick participants who disrupt fair play.
        </p>
      </div>
    </div>
  );
}

