'use client';

import React from 'react';
import Link from 'next/link';
import { MiniAuctionDemo } from '@/components/MiniAuctionDemo';
import { ResumeAuctionModal } from '@/components/ResumeAuctionModal';
import {
  ArrowRight, Users, Zap, ShieldCheck, Trophy, Smartphone,
  Gavel, Wallet, BarChart3, Sparkles, Radio,
} from 'lucide-react';

const features = [
  { icon: Radio, title: 'Live auction room', body: 'Real-time bids, synchronized countdowns and instant squad updates for every participant.' },
  { icon: Wallet, title: 'Smart purse strategy', body: 'Track your remaining purse, squad slots and spending as the auction unfolds.' },
  { icon: BarChart3, title: 'Squad scorecards', body: 'Build a balanced squad and compare team strength when the hammer comes down.' },
];

export default function LandingPage() {
  return (
    <div className="pb-20">
      <ResumeAuctionModal />
      <section className="max-w-7xl mx-auto px-4 pt-10 sm:pt-16 lg:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-flare/30 bg-flare/10 px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-[.19em] text-flare">
              <span className="w-2 h-2 rounded-full bg-turf animate-pulse" />
              The ultimate friends auction experience
            </div>
            <h1 className="font-display text-[3.25rem] sm:text-7xl lg:text-[5.5rem] font-bold leading-[.88] tracking-[-.035em] text-floodlight">
              BUILD YOUR
              <span className="block text-flare italic">DREAM XI.</span>
              OWN THE
              <span className="block">AUCTION.</span>
            </h1>
            <p className="text-sm sm:text-base leading-7 text-floodlight-muted max-w-xl mx-auto lg:mx-0">
              Bring your cricket crew together, pick your franchise and battle for the biggest names in the player pool. Every bid counts. Every decision shapes your squad.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
              <Link href="/create" className="group w-full sm:w-auto min-h-14 px-8 rounded-full bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-sm shadow-flare flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5">
                Create auction room <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/join" className="w-full sm:w-auto min-h-14 px-8 rounded-full border border-white/15 bg-white/[.035] hover:bg-white/[.07] text-floodlight font-bold text-sm flex items-center justify-center gap-2 transition-all">
                Join with room code
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[11px] text-floodlight-subtle pt-2">
              <span className="inline-flex items-center gap-2"><Smartphone className="w-4 h-4 text-flare" /> Made for mobile</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-turf" /> Virtual money only</span>
              <span className="inline-flex items-center gap-2"><Users className="w-4 h-4 text-flare" /> Play with friends</span>
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="absolute -inset-8 bg-flare/[.06] blur-3xl rounded-full pointer-events-none" />
            <div className="relative rounded-[26px] border border-flare/20 bg-[#101113] p-2 sm:p-3 shadow-[0_30px_90px_rgba(0,0,0,.55)]">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[.07] mb-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-floodlight-muted">
                  <span className="w-2 h-2 rounded-full bg-red-400" /><span className="w-2 h-2 rounded-full bg-yellow-400" /><span className="w-2 h-2 rounded-full bg-green-400" />
                  Auction night preview
                </div>
                <span className="text-[9px] uppercase tracking-widest text-flare">Live demo</span>
              </div>
              <MiniAuctionDemo />
            </div>
            <div className="hidden sm:flex absolute -bottom-5 -left-5 items-center gap-3 rounded-2xl border border-flare/20 bg-[#171719] px-4 py-3 shadow-xl">
              <div className="w-9 h-9 rounded-xl bg-flare/15 flex items-center justify-center"><Gavel className="w-5 h-5 text-flare" /></div>
              <div><div className="text-xs font-bold text-floodlight">Your auction. Your strategy.</div><div className="text-[10px] text-floodlight-muted">Every bid changes the game.</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-20 sm:mt-28">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.24em] text-flare mb-2">Built for auction night</div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-floodlight">THE ROOM IS YOURS.</h2>
          </div>
          <p className="text-xs sm:text-sm text-floodlight-muted max-w-sm leading-6">Everything you need to run a competitive, fast-moving auction with your friends.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {features.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="group rounded-2xl border border-white/[.08] bg-gradient-to-b from-[#17181A] to-[#101113] p-6 sm:p-7 hover:border-flare/35 transition-colors">
              <div className="w-11 h-11 rounded-xl border border-flare/25 bg-flare/10 flex items-center justify-center mb-5"><Icon className="w-5 h-5 text-flare" /></div>
              <div className="text-[10px] font-bold tracking-[.2em] text-flare/70 mb-2">0{i + 1}</div>
              <h3 className="font-display text-2xl font-bold text-floodlight mb-2">{title}</h3>
              <p className="text-xs leading-6 text-floodlight-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-16 sm:mt-20">
        <div className="relative overflow-hidden rounded-[24px] border border-flare/25 bg-gradient-to-br from-[#1B1912] via-[#131313] to-[#0D0E10] p-7 sm:p-10">
          <div className="absolute -right-10 -top-24 w-72 h-72 rounded-full bg-flare/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-7">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.2em] font-bold text-flare mb-3"><Trophy className="w-4 h-4" /> The gavel is waiting</div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[.95] text-floodlight">CALL YOUR FRIENDS.<br/><span className="text-flare italic">START THE BIDDING.</span></h2>
              <p className="text-sm text-floodlight-muted mt-4 leading-6">Create a room, share the invite code and build a squad worth bragging about.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link href="/create" className="min-h-12 px-7 rounded-full bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-sm flex items-center justify-center gap-2"><Zap className="w-4 h-4"/> Start a room</Link>
              <Link href="/join" className="min-h-12 px-7 rounded-full border border-white/15 bg-white/[.04] text-floodlight font-bold text-sm flex items-center justify-center">Join a room</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
