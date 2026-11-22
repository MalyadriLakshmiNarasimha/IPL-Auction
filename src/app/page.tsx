'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeroSection } from '@/components/HeroSection';
import { SportsSelectionSection } from '@/components/SportsSelectionSection';
import { PlatformFeaturesSection } from '@/components/PlatformFeaturesSection';
import { PlatformStatsSection } from '@/components/PlatformStatsSection';
import { FinalCtaSection } from '@/components/FinalCtaSection';
import { FooterSection } from '@/components/FooterSection';
import { ResumeAuctionModal } from '@/components/ResumeAuctionModal';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { JoinRoomModal } from '@/components/JoinRoomModal';
import { ALL_PLAYERS } from '@/shared/player-data';
import { ALL_PKL_PLAYERS } from '@/shared/pkl-player-data';

export default function SportsAuctionHomePage() {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [targetSport, setTargetSport] = useState<'IPL' | 'PKL'>('IPL');

  const handleOpenCreate = (sport?: 'IPL' | 'PKL') => {
    if (sport) {
      setTargetSport(sport);
      router.push(`/create?sport=${sport.toLowerCase()}`);
    } else {
      setCreateModalOpen(true);
    }
  };

  const handleOpenJoin = () => {
    setJoinModalOpen(true);
  };

  const handleEnterArena = (sport: 'IPL' | 'PKL') => {
    setTargetSport(sport);
    router.push(`/create?sport=${sport.toLowerCase()}`);
  };

  return (
    <div className="relative min-h-screen bg-[#080808] text-floodlight flex flex-col selection:bg-flare selection:text-black">
      {/* Resume Active Auction Session Modal if user had an in-flight auction */}
      <ResumeAuctionModal />

      {/* Quick Interactive Modals */}
      <CreateRoomModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        initialSport={targetSport}
      />
      <JoinRoomModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
      />

      {/* Section B: Hero Section */}
      <HeroSection
        onCreateRoom={handleOpenCreate}
        onJoinRoom={handleOpenJoin}
      />

      {/* Section C: Sports Selection Section */}
      <SportsSelectionSection
        iplPlayerCount={ALL_PLAYERS.length}
        pklPlayerCount={ALL_PKL_PLAYERS.length}
        onEnterArena={handleEnterArena}
      />

      {/* Section D: Platform Features Section */}
      <PlatformFeaturesSection />

      {/* Section E: Platform Statistics Section */}
      <PlatformStatsSection
        initialStats={{
          iplPlayers: ALL_PLAYERS.length,
          pklPlayers: ALL_PKL_PLAYERS.length,
        }}
      />

      {/* Section F: Final Call to Action */}
      <FinalCtaSection
        onCreateRoom={handleOpenCreate}
        onJoinRoom={handleOpenJoin}
      />

      {/* Section G: Enhanced Comprehensive Footer */}
      <FooterSection />
    </div>
  );
}
