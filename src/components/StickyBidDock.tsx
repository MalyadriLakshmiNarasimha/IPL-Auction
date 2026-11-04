'use client';

import React from 'react';
import { AuctionState, Participant, RoomSettings } from '@/shared/types';
import { BID_INCREMENTS, formatCurrency } from '@/shared/constants';
import { getBidButtonStatus } from '@/shared/validation';
import { soundManager } from '@/lib/sound';

interface StickyBidDockProps {
  participant: Participant | null;
  auctionState: AuctionState;
  settings: RoomSettings;
  onBid: (increment: number) => void;
  onWithdraw: () => void;
}

export const StickyBidDock: React.FC<StickyBidDockProps> = ({
  participant,
  auctionState,
  settings,
  onBid,
  onWithdraw,
}) => {
  const isBiddingActive = auctionState.phase === 'bidding';
  const hasWithdrawn = participant?.has_withdrawn_current || false;
  const isLeading = auctionState.current_bidder_id === participant?.id;

  const handleBidClick = (increment: number) => {
    soundManager.playBidTick();
    onBid(increment);
  };

  const handleWithdrawClick = () => {
    soundManager.vibrate(50);
    onWithdraw();
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 bg-night/95 backdrop-blur-md border-t border-night-border p-3 sm:p-4 shadow-2xl">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        {/* Buttons Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {BID_INCREMENTS.map(({ label, amount }) => {
            const status = getBidButtonStatus(participant, auctionState, settings, amount);
            const isDisabled = !isBiddingActive || status.disabled || hasWithdrawn;

            return (
              <button
                key={label}
                disabled={isDisabled}
                onClick={() => handleBidClick(amount)}
                title={status.reason}
                className={`relative group flex flex-col items-center justify-center min-h-[58px] sm:min-h-[64px] rounded-card px-2 py-1.5 transition-all duration-150 select-none ${
                  isDisabled
                    ? 'bg-night-raised/50 border border-night-border/50 opacity-40 cursor-not-allowed'
                    : 'bg-flare hover:bg-flare-hover active:scale-[0.98] text-white font-bold shadow-flare'
                }`}
              >
                <span className="font-display text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  {label}
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-white/90 truncate max-w-full">
                  = {formatCurrency(status.targetAmount)}
                </span>

                {/* Reason tooltip on mobile/hover if disabled */}
                {isDisabled && status.reason && (
                  <span className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none z-20">
                    {status.reason}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom row: Withdraw & Reason bar */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <div className="text-floodlight-muted truncate text-[11px] sm:text-xs">
            {hasWithdrawn ? (
              <span className="text-hammer font-semibold">You have withdrawn from this player</span>
            ) : isLeading ? (
              <span className="text-turf font-bold">You are the highest bidder</span>
            ) : !isBiddingActive ? (
              <span>Bidding paused or awaiting player</span>
            ) : (
              <span>Reserve required: ₹20L per remaining empty slot</span>
            )}
          </div>

          <button
            onClick={handleWithdrawClick}
            disabled={!isBiddingActive || hasWithdrawn || isLeading}
            title={isLeading ? 'Cannot withdraw while leading' : 'Drop out from this player'}
            className={`min-h-[36px] px-4 rounded-pill font-bold text-xs uppercase tracking-wider transition-all ${
              !isBiddingActive || hasWithdrawn || isLeading
                ? 'opacity-30 cursor-not-allowed text-floodlight-muted border border-night-border'
                : 'bg-hammer/20 text-hammer hover:bg-hammer/30 border border-hammer'
            }`}
          >
            {hasWithdrawn ? 'Withdrawn' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  );
};

