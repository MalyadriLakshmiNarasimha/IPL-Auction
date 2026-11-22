'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, Users, Radio, ShieldCheck, Smartphone, ChevronDown } from 'lucide-react';

interface HeroSectionProps {
  onCreateRoom: (sport?: 'IPL' | 'PKL') => void;
  onJoinRoom: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onCreateRoom, onJoinRoom }) => {
  const prefersReducedMotion = useReducedMotion();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollDown = () => {
    const arenaSection = document.getElementById('arenas');
    if (arenaSection) {
      arenaSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#07070D] h-[calc(100dvh-56px)] sm:h-[calc(100dvh-var(--nav-height,64px)-24px)] min-h-[500px] sm:min-h-[560px] max-h-[760px] sm:max-h-[820px] flex flex-col justify-center">

      {/* Thin gold-to-purple glow line along top edge directly under nav */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-amber-500/70 via-amber-300/40 via-40% to-purple-500/70 shadow-[0_1px_12px_rgba(214,182,93,0.35),0_1px_12px_rgba(168,85,247,0.35)] z-30 pointer-events-none" />

      {/* =========================================================================
          1. FULL-BLEED BACKGROUND & FLOODLIGHT ATMOSPHERE (z-0 to z-10)
          - Edge-to-edge stretching across any viewport width (up to ultra-wide)
          - Left: Golden cricket floodlight cluster, warm amber smoke, stadium haze
          - Right: Purple kabaddi arena floodlight cluster, vibrant violet smoke
          - Center: Deep dark vignette ensuring 100% typography contrast
          - Lighting NEVER covers the players (strictly in z-10 layer)
         ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
        {/* Base dark canvas */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090812] via-[#07070D] to-[#0A0914]" />

        {/* --- DESKTOP & TABLET WINGS (z-10) --- */}
        {/* Left Edge Amber Floodlight Cluster & Stadium Haze */}
        <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-[46%] max-w-[850px] z-10">
          <Image
            src="/images/hero-left-stadium.webp"
            alt="Golden Cricket Stadium Floodlights"
            fill
            priority
            sizes="(max-width: 1024px) 50vw, 850px"
            className="object-cover object-left opacity-95"
          />
          {/* Amber bloom & gentle horizontal falloff to dark center */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 via-transparent to-[#07070D]" />
          <div className="absolute left-6 top-6 w-80 h-80 rounded-full bg-amber-400/25 blur-[90px]" />
        </div>

        {/* Right Edge Purple Floodlight Cluster & Arena Haze */}
        <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[46%] max-w-[850px] z-10">
          <Image
            src="/images/hero-right-arena.webp"
            alt="Purple Kabaddi Arena Floodlights"
            fill
            priority
            sizes="(max-width: 1024px) 50vw, 850px"
            className="object-cover object-right opacity-95"
          />
          {/* Purple bloom & gentle horizontal falloff to dark center */}
          <div className="absolute inset-0 bg-gradient-to-l from-purple-500/15 via-transparent to-[#07070D]" />
          <div className="absolute right-6 top-6 w-80 h-80 rounded-full bg-purple-500/25 blur-[90px]" />
        </div>

        {/* Center Vignette for 100% Editorial Legibility */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#07070D_26%,_transparent_74%)] z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070D]/90 via-transparent to-[#07070D]/30 z-10" />
      </div>

      {/* =========================================================================
          2. DESKTOP & TABLET LAYOUT (sm:flex, 640px and wider)
          - Background scales full-bleed edge-to-edge
          - Centered inner wrapper (max-w-[1360px] 2xl:max-w-[1700px]) keeps players
            and content locked in stable harmonious relationship at any resolution
          - LEFT ATHLETE (Rohit Sharma) shifted toward center by 40-60px at 1920px width,
            scaling proportionally at smaller widths with clamp(0px, calc(3.2vw - 12px), 50px)
          - RIGHT ATHLETE (Rahul Chaudhari) remains anchored at right-0 bottom-0
          - Layer order: background (z-0/z-10) -> players (z-20) -> content (z-30) -> chevron (z-40)
         ========================================================================= */}
      <div className="hidden sm:flex relative w-full max-w-[1360px] 2xl:max-w-[1700px] h-full mx-auto items-center justify-center z-20">

        {/* LEFT ATHLETE: Rohit Sharma (MI Batting Pose - shifted slightly inward) */}
        <div
          style={{ left: 'clamp(0px, calc(3.2vw - 12px), 50px)' }}
          className="absolute bottom-0 z-20 pointer-events-none select-none items-end flex transition-all duration-300"
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -35 }}
            animate={
              prefersReducedMotion
                ? { opacity: 1, x: 0 }
                : {
                    opacity: 1,
                    x: 0,
                    y: [0, -6, 0],
                    transition: {
                      opacity: { duration: 0.65, ease: 'easeOut' },
                      x: { duration: 0.65, ease: 'easeOut' },
                      y: { duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
                    },
                  }
            }
            className="relative w-[190px] sm:w-[220px] md:w-[250px] lg:w-[380px] xl:w-[430px] 2xl:w-[470px] h-[300px] sm:h-[340px] md:h-[390px] lg:h-[520px] xl:h-[570px] 2xl:h-[610px] -ml-2 sm:-ml-1 lg:ml-0"
          >
            {/* Soft Amber Silhouette Glow */}
            <div className="absolute left-6 top-10 w-52 h-72 bg-amber-500/20 rounded-full blur-3xl -z-10" />

            <div
              className="relative w-full h-full"
              style={{
                maskImage:
                  'linear-gradient(to top, transparent 0%, black 14%, black 100%), linear-gradient(to right, transparent 0%, black 2.5%, black 84%, transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to top, transparent 0%, black 14%, black 100%), linear-gradient(to right, transparent 0%, black 2.5%, black 84%, transparent 100%)',
                maskComposite: 'intersect',
                WebkitMaskComposite: 'destination-in',
              }}
            >
              <Image
                src="/images/hero-rohit-cutout.webp"
                alt="IPL Cricket Player - Rohit Sharma in Mumbai Indians Jersey"
                fill
                priority
                sizes="(max-width: 768px) 220px, (max-width: 1024px) 250px, (max-width: 1280px) 380px, 470px"
                className="object-contain object-left-bottom filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
              />
            </div>
          </motion.div>
        </div>

        {/* RIGHT ATHLETE: Rahul Chaudhari (PKL Raider Raised Arm) */}
        <div className="absolute right-0 bottom-0 z-20 pointer-events-none select-none items-end justify-end flex">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 35 }}
            animate={
              prefersReducedMotion
                ? { opacity: 1, x: 0 }
                : {
                    opacity: 1,
                    x: 0,
                    y: [0, -6, 0],
                    transition: {
                      opacity: { duration: 0.65, ease: 'easeOut', delay: 0.08 },
                      x: { duration: 0.65, ease: 'easeOut', delay: 0.08 },
                      y: { duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
                    },
                  }
            }
            className="relative w-[205px] sm:w-[235px] md:w-[270px] lg:w-[410px] xl:w-[470px] 2xl:w-[510px] h-[300px] sm:h-[340px] md:h-[390px] lg:h-[520px] xl:h-[570px] 2xl:h-[610px] -mr-2 sm:-mr-1 lg:mr-0"
          >
            {/* Soft Purple Silhouette Glow */}
            <div className="absolute right-6 top-10 w-52 h-72 bg-purple-600/20 rounded-full blur-3xl -z-10" />

            <div
              className="relative w-full h-full"
              style={{
                maskImage:
                  'linear-gradient(to top, transparent 0%, black 14%, black 100%), linear-gradient(to left, transparent 0%, black 2.5%, black 84%, transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to top, transparent 0%, black 14%, black 100%), linear-gradient(to left, transparent 0%, black 2.5%, black 84%, transparent 100%)',
                maskComposite: 'intersect',
                WebkitMaskComposite: 'destination-in',
              }}
            >
              <Image
                src="/images/hero-rahul-cutout.webp"
                alt="PKL Kabaddi Raider - Rahul Chaudhari in Telugu Titans Jersey"
                fill
                priority
                sizes="(max-width: 768px) 235px, (max-width: 1024px) 270px, (max-width: 1280px) 410px, 510px"
                className="object-contain object-right-bottom filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
              />
            </div>
          </motion.div>
        </div>

        {/* CENTER EDITORIAL COLUMN (Desktop & Tablet) */}
        <div className="relative z-30 w-full max-w-[380px] sm:max-w-[420px] md:max-w-[460px] lg:max-w-[580px] xl:max-w-[620px] mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col items-center text-center my-auto">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#FFD25A]/45 bg-[#0B0A14]/90 backdrop-blur-md px-3 sm:px-4 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.6)] mb-2.5 sm:mb-3.5 max-w-full">
            <span className="flex items-center gap-1 sm:gap-1.5 text-[#FFD25A] font-extrabold text-[10.5px] sm:text-[11.5px] tracking-wider uppercase shrink-0">
              <Radio className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#FFD25A] animate-pulse" />
              <span>IPL + PKL</span>
            </span>
            <span className="text-white/25 text-xs font-light">|</span>
            <span className="text-[#FFD25A]/95 font-bold uppercase tracking-[0.14em] text-[9.5px] sm:text-[10.5px] truncate">
              REAL-TIME MULTIPLAYER AUCTION
            </span>
          </div>

          {/* 3-Line Headline with Serif Display & Gold Gradient */}
          <h1 className="font-display font-bold tracking-tight text-[#F4F0E6] text-[clamp(1.85rem,3.4vw,3.25rem)] leading-[1.05] text-center">
            <span className="block text-[#F4F0E6]">THE ULTIMATE</span>
            <span className="block mt-1 bg-gradient-to-r from-[#FFD25A] via-[#F5A800] to-[#E69500] bg-clip-text text-transparent italic pe-1 drop-shadow-[0_2px_16px_rgba(245,168,0,0.35)]">
              SPORTS AUCTION
            </span>
            <span className="block mt-1 text-[#F4F0E6]">EXPERIENCE</span>
          </h1>

          {/* Subtext (2 lines) */}
          <p className="mt-2.5 sm:mt-3 text-[13px] sm:text-[14px] lg:text-[14.5px] text-white/85 max-w-xs sm:max-w-md md:max-w-lg leading-relaxed font-normal">
            Create a room, invite your friends and build your dream squad in India&apos;s biggest sporting leagues.
          </p>

          {/* Buttons (Side by Side, 48px height) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 mt-3.5 sm:mt-4 w-full max-w-xs sm:max-w-none sm:flex sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => onCreateRoom()}
              style={{ minHeight: '48px', height: '48px' }}
              className="group h-12 min-h-[48px] px-6 sm:px-7 rounded-full bg-gradient-to-r from-[#FFCB2E] to-[#F5A300] hover:brightness-105 text-[#120F06] font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(255,203,46,0.4)] flex items-center justify-center gap-1.5 sm:gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current shrink-0" />
              <span className="whitespace-nowrap font-black tracking-wide">Create a Room</span>
            </button>

            <button
              type="button"
              onClick={onJoinRoom}
              style={{ minHeight: '48px', height: '48px' }}
              className="h-12 min-h-[48px] px-6 sm:px-7 rounded-full border-[1.5px] border-purple-500/40 hover:border-pink-500/50 bg-[#0B0A14]/85 hover:bg-[#151324] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Users className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="whitespace-nowrap font-bold tracking-wide">Join with Code</span>
            </button>
          </div>

          {/* Trust Row */}
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[10.5px] sm:text-[11.5px] text-white/50 pt-3 sm:pt-4 w-full">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-400/80 shrink-0" />
              <span>Up to 30 Friends</span>
            </span>
            <span className="text-white/20">·</span>
            <span className="inline-flex items-center gap-1">
              <Radio className="w-3 h-3 text-purple-400/80 shrink-0" />
              <span>Real-Time Sync</span>
            </span>
            <span className="text-white/20">·</span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400/80 shrink-0" />
              <span>Virtual Money Only</span>
            </span>
            <span className="text-white/20 hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1 hidden sm:inline-flex">
              <Smartphone className="w-3 h-3 text-amber-300/80 shrink-0" />
              <span>Touch & Mobile Ready</span>
            </span>
          </div>
        </div>

        {/* Scroll Chevron (Desktop / Tablet) */}
        <div
          className={`absolute bottom-2.5 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 ${
            hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-65 hover:opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={handleScrollDown}
            aria-label="Scroll to Choose Your Arena"
            className="flex flex-col items-center text-white/60 hover:text-white transition-colors cursor-pointer group"
          >
            <ChevronDown className="w-4 h-4 text-[#FFD25A]/80 animate-bounce group-hover:text-[#FFD25A]" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          3. DEDICATED MOBILE LAYOUT (Screen < 640px)
          Stack order:
           a) TOP: Pill badge + 3-line headline
           b) MIDDLE: BOTH PLAYERS SIDE BY SIDE (30-35% hero height, flex-1, center overlap, bottom fade)
           c) BOTTOM: 2-line subtext + full-width 52px buttons (12px gap) + 2x2 trust chips + chevron
          - Bottom ends with padding = bottom nav height + env(safe-area-inset-bottom)
          - On short phones (<700px): players shrink first, keeping headline & buttons 100% visible
         ========================================================================= */}
      <div className="sm:hidden relative w-full h-full flex flex-col justify-between overflow-hidden z-20 px-4 min-[390px]:px-5">

        {/* Crisp Corner Floodlight Matrices (Mobile Vector Dots) */}
        <div className="absolute top-2 left-2.5 z-0 pointer-events-none">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-[#161208]/80 border border-amber-500/40 shadow-[0_0_12px_rgba(255,190,60,0.35)]">
            {[...Array(6)].map((_, i) => (
              <div key={`sml-${i}`} className="w-1.5 h-1.5 rounded-full bg-[#FFF9C4] shadow-[0_0_4px_#FFB300]" />
            ))}
          </div>
        </div>

        <div className="absolute top-2 right-2.5 z-0 pointer-events-none">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-[#130B1C]/80 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.35)]">
            {[...Array(6)].map((_, i) => (
              <div key={`smr-${i}`} className="w-1.5 h-1.5 rounded-full bg-[#F3E8FF] shadow-[0_0_4px_#C084FC]" />
            ))}
          </div>
        </div>

        {/* --- BLOCK A (TOP): Pill Badge & 3-Line Headline --- */}
        <div className="relative z-30 w-full shrink-0 flex flex-col items-center text-center pt-1.5 min-[390px]:pt-2.5">
          {/* Mobile Pill Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD25A]/45 bg-[#0B0A14]/90 backdrop-blur-md px-3 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.5)] mb-1 min-[390px]:mb-1.5 max-w-full">
            <Radio className="w-3 h-3 text-[#FFD25A] animate-pulse shrink-0" />
            <span className="text-[#FFD25A] font-extrabold text-[10px] tracking-wider uppercase shrink-0">IPL + PKL</span>
            <span className="text-white/20 text-xs font-light">|</span>
            <span className="text-[#FFD25A]/95 font-bold uppercase tracking-[0.12em] text-[8.5px] truncate">
              REAL-TIME MULTIPLAYER AUCTION
            </span>
          </div>

          {/* 3-Line Mobile Headline */}
          <h1 className="font-display font-bold tracking-tight text-[#F4F0E6] text-[clamp(1.38rem,6.2vw,2rem)] leading-[1.06] text-center">
            <span className="block text-[#F4F0E6]">THE ULTIMATE</span>
            <span className="block mt-0.5 bg-gradient-to-r from-[#FFD25A] via-[#F5A800] to-[#E69500] bg-clip-text text-transparent italic drop-shadow-[0_2px_12px_rgba(245,168,0,0.35)]">
              SPORTS AUCTION
            </span>
            <span className="block mt-0.5 text-[#F4F0E6]">EXPERIENCE</span>
          </h1>
        </div>

        {/* --- BLOCK B (MIDDLE): BOTH PLAYERS SIDE BY SIDE --- */}
        <div className="relative w-full flex-1 min-h-[105px] max-h-[225px] flex items-end justify-center pointer-events-none select-none z-10 overflow-hidden my-auto">
          {/* Amber Glow behind Batter */}
          <div className="absolute left-[12%] bottom-2 w-32 min-[390px]:w-44 h-32 rounded-full bg-amber-400/25 blur-2xl -z-10" />

          {/* Purple Glow behind Raider */}
          <div className="absolute right-[12%] bottom-2 w-32 min-[390px]:w-44 h-32 rounded-full bg-purple-600/25 blur-2xl -z-10" />

          {/* Left Batter: Rohit Sharma (MI) */}
          <div
            className="relative w-[48%] max-w-[195px] h-full -mr-3 sm:-mr-4"
            style={{
              maskImage:
                'linear-gradient(to top, transparent 0%, black 22%, black 100%), linear-gradient(to right, black 82%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to top, transparent 0%, black 22%, black 100%), linear-gradient(to right, black 82%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          >
            <Image
              src="/images/hero-rohit-cutout.webp"
              alt="IPL Cricket Player - Rohit Sharma"
              fill
              priority
              sizes="200px"
              className="object-contain object-bottom-right filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.85)]"
            />
          </div>

          {/* Right Raider: Rahul Chaudhari (PKL) */}
          <div
            className="relative w-[52%] max-w-[215px] h-full -ml-3 sm:-ml-4"
            style={{
              maskImage:
                'linear-gradient(to top, transparent 0%, black 22%, black 100%), linear-gradient(to left, black 82%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to top, transparent 0%, black 22%, black 100%), linear-gradient(to left, black 82%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          >
            <Image
              src="/images/hero-rahul-cutout.webp"
              alt="PKL Kabaddi Raider - Rahul Chaudhari"
              fill
              priority
              sizes="220px"
              className="object-contain object-bottom-left filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.85)]"
            />
          </div>
        </div>

        {/* --- BLOCK C (BOTTOM): Subtext, Buttons & Chips --- */}
        <div className="relative z-30 w-full shrink-0 flex flex-col items-center max-w-[360px] mx-auto pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">
          {/* 2-Line Subtext */}
          <p className="text-[11.5px] min-[390px]:text-[12.5px] text-white/80 max-w-[325px] leading-snug font-normal text-center mb-2 min-[390px]:mb-2.5">
            Create a room, invite your friends and build your dream squad in India&apos;s biggest sporting leagues.
          </p>

          {/* Two Full-Width Buttons Stacked (12px gap, 52px tall each) */}
          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onCreateRoom()}
              style={{ height: '52px', minHeight: '52px' }}
              className="w-full h-[52px] min-h-[52px] rounded-full bg-gradient-to-r from-[#FFCB2E] to-[#F5A300] hover:brightness-105 text-[#120F06] font-black text-sm shadow-[0_0_24px_rgba(255,203,46,0.35)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current shrink-0" />
              <span className="tracking-wide">Create a Room</span>
            </button>

            <button
              type="button"
              onClick={onJoinRoom}
              style={{ height: '52px', minHeight: '52px' }}
              className="w-full h-[52px] min-h-[52px] rounded-full border-[1.5px] border-purple-500/40 hover:border-pink-500/50 bg-[#0B0A14]/90 text-white font-bold text-sm shadow-[0_0_18px_rgba(168,85,247,0.25)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer backdrop-blur-md"
            >
              <Users className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="tracking-wide">Join with Code</span>
            </button>
          </div>

          {/* 2x2 Trust Chips */}
          <div className="grid grid-cols-2 gap-1.5 w-full mt-2 min-[390px]:mt-2.5">
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-[9.5px] min-[390px]:text-[10px] text-white/70">
              <Users className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Up to 30 Friends</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-[9.5px] min-[390px]:text-[10px] text-white/70">
              <Radio className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="truncate">Real-Time Sync</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-[9.5px] min-[390px]:text-[10px] text-white/70">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Virtual Money Only</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-[9.5px] min-[390px]:text-[10px] text-white/70">
              <Smartphone className="w-3 h-3 text-amber-300 shrink-0" />
              <span className="truncate">Touch & Mobile Ready</span>
            </div>
          </div>

          {/* Small Animated Bounce Scroll Chevron */}
          <div
            className={`flex justify-center mt-1.5 min-[390px]:mt-2 transition-opacity duration-300 ${
              hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={handleScrollDown}
              aria-label="Scroll down"
              className="p-0.5 text-white/60 hover:text-white cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5 text-[#FFD25A] animate-bounce" />
            </button>
          </div>
        </div>

      </div>

    </section>
  );
};
