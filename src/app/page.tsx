'use client';

import React from 'react';
import Link from 'next/link';
import { MiniAuctionDemo } from '@/components/MiniAuctionDemo';
import { ArrowRight, Users, Zap, Shield, Trophy, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* HERO SECTION */}
      <section className="max-w-6xl mx-auto px-4 pt-8 sm:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline & CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-flare/15 border border-flare/30 text-flare text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              Real-Time Multiplayer Auction
            </div>

            <h1 className="font-display text-5xl sm:text-7xl font-black text-floodlight tracking-tight leading-[0.95]">
              FEEL THE THRILL OF A <span className="text-flare">LIVE IPL AUCTION</span> NIGHT.
            </h1>

            <p className="text-base sm:text-lg text-floodlight-muted max-w-xl mx-auto lg:mx-0">
              Gather your friends, take a franchise badge, and bid live on 255 real IPL stars with virtual purse money. Authoritative timers, split-flap scoreboards, and gavel moments right on your phone.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                href="/create"
                className="w-full sm:w-auto px-8 py-3.5 rounded-pill bg-flare hover:bg-flare-hover text-white font-bold text-base shadow-flare flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Start a Room</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/join"
                className="w-full sm:w-auto px-8 py-3.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight font-bold text-base flex items-center justify-center gap-2 transition-all"
              >
                Join with Code
              </Link>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-floodlight-subtle pt-2">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-turf" /> Mobile WhatsApp Friendly
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-400" /> 100% Virtual Money
              </span>
            </div>
          </div>

          {/* Right Column: Mini Auction Demo */}
          <div className="lg:col-span-5 w-full">
            <MiniAuctionDemo />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (4 NUMBERED STEPS) */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display text-3xl sm:text-5xl font-black text-floodlight tracking-tight">
            HOW IT WORKS
          </h2>
          <p className="text-sm text-floodlight-muted mt-1">
            4 simple steps to run your fantasy auction night
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-card bg-night border border-night-border relative shadow-sm">
            <div className="font-display text-4xl font-black text-flare/40 mb-2">01</div>
            <h3 className="font-bold text-base text-floodlight mb-1">Create Room</h3>
            <p className="text-xs text-floodlight-muted">
              Choose your purse (₹100 Cr - ₹150 Cr), squad size, bid timers, and curate your custom player pool.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-card bg-night border border-night-border relative shadow-sm">
            <div className="font-display text-4xl font-black text-flare/40 mb-2">02</div>
            <h3 className="font-bold text-base text-floodlight mb-1">Share the Link</h3>
            <p className="text-xs text-floodlight-muted">
              Drop the invite link straight into your WhatsApp group. Friends join in seconds without passwords.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-card bg-night border border-night-border relative shadow-sm">
            <div className="font-display text-4xl font-black text-flare/40 mb-2">03</div>
            <h3 className="font-bold text-base text-floodlight mb-1">Bid Live</h3>
            <p className="text-xs text-floodlight-muted">
              Experience split-flap scoreboards, heartbeat countdowns, atomic bid queues, and thrilling gavel moments.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-card bg-night border border-night-border relative shadow-sm">
            <div className="font-display text-4xl font-black text-flare/40 mb-2">04</div>
            <h3 className="font-bold text-base text-floodlight mb-1">Crown the Winner</h3>
            <p className="text-xs text-floodlight-muted">
              Get ranked by a 100-point role balance algorithm, celebrate awards, and export a shareable graphic.
            </p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF & HIGHLIGHTS */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="scoreboard-panel rounded-card border border-night-border p-6 sm:p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-flare text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-4 h-4" />
            Designed For Cricket Fanatics
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-floodlight">
            BUILT FOR WHATSAPP GROUPS & LIVE BROADCAST NIGHTS
          </h2>
          <p className="text-xs sm:text-sm text-floodlight-muted max-w-xl mx-auto">
            Zero clunky spreadsheets. Clean 48px tap targets, sub-second latency, reserve rules to prevent bankruptcies, and instant state restoration when switching between apps.
          </p>

          <div className="pt-2">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-flare hover:bg-flare-hover text-white font-bold text-sm shadow-flare"
            >
              Start Auction Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

