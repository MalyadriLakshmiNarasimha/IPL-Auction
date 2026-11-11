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
  onBid: (incrementOrAmount: number, isExplicitAmount?: boolean) => void;
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
  const hasWithdrawn =
    participant?.has_withdrawn_current ||
    (participant?.id ? auctionState.passed_participant_ids?.includes(participant.id) : false) ||
    false;
  const isLeading = auctionState.current_bidder_id === participant?.id;

  const handleBidClick = (increment: number) => {
    soundManager.playBidTick();
    onBid(increment, false);
  };

  const handleWithdrawClick = () => {
    soundManager.vibrate(50);
    onWithdraw();
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 bg-[#0A0B0D]/95 backdrop-blur-md border-t border-night-border/80 px-3 py-2.5 sm:px-6 sm:py-3 shadow-2xl">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        {/* Buttons Grid - 3 Balanced Quick Bid Increments */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {BID_INCREMENTS.map(({ label, amount }) => {
            const status = getBidButtonStatus(participant, auctionState, settings, amount);
            const isDisabled = !isBiddingActive || status.disabled || hasWithdrawn;

            return (
              <button
                key={label}
                disabled={isDisabled}
                onClick={() => handleBidClick(amount)}
                title={status.reason}
                className={`relative group flex flex-col items-center justify-center min-h-[54px] sm:min-h-[62px] rounded-xl px-2 py-1 transition-all duration-150 select-none ${
                  isDisabled
                    ? 'bg-night-raised/50 border border-night-border/40 opacity-40 cursor-not-allowed'
                    : 'bg-flare hover:bg-flare-hover active:scale-[0.98] text-white font-bold shadow-flare'
                }`}
              >
                <span className="font-display text-lg sm:text-2xl font-black tracking-tight leading-tight">
                  {label}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold tabular-nums text-white/90 truncate max-w-full">
                  = {formatCurrency(status.targetAmount)}
                </span>

                {isDisabled && status.reason && (
                  <span className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none z-20">
                    {status.reason}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Status Row & Withdraw/Pass */}
        <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
          <div className="text-floodlight-muted truncate text-[11px] sm:text-xs">
            {hasWithdrawn ? (
              <span className="text-hammer font-semibold">You have passed on this player</span>
            ) : isLeading ? (
              <span className="text-turf font-bold">You hold the highest bid</span>
            ) : auctionState.phase === 'announcing' ? (
              <span className="text-flare font-bold animate-pulse">📢 Announcing player profile & base price...</span>
            ) : !isBiddingActive ? (
              <span>Bidding paused or awaiting player</span>
            ) : (
              <span>Reserve required: ₹20L per remaining empty slot</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Pass Count Telemetry Badge */}
            {(auctionState.total_eligible_passers ?? 0) > 0 && (
              <div
                className="px-2.5 py-1 rounded-full bg-night-border/50 border border-night-border text-[11px] sm:text-xs font-mono font-medium flex items-center gap-1.5"
                title={`${auctionState.pass_count ?? 0} of ${auctionState.total_eligible_passers} managers passed`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${(auctionState.pass_count ?? 0) > 0 ? 'bg-amber-400 animate-pulse' : 'bg-floodlight-muted'}`} />
                <span className="text-floodlight font-bold">{auctionState.pass_count ?? 0}/{auctionState.total_eligible_passers}</span>
                <span className="text-floodlight-muted">Passed</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleWithdrawClick}
              disabled={!isBiddingActive || hasWithdrawn || isLeading}
              title={isLeading ? 'Cannot pass while highest bidder' : 'Pass / Withdraw from this player'}
              className={`min-h-[32px] sm:min-h-[34px] px-3.5 sm:px-4 rounded-full font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all flex-shrink-0 ${
                !isBiddingActive || hasWithdrawn || isLeading
                  ? 'opacity-30 cursor-not-allowed text-floodlight-muted border border-night-border'
                  : 'bg-hammer/20 text-hammer hover:bg-hammer/30 border border-hammer'
              }`}
            >
              {hasWithdrawn ? 'Passed' : 'Pass / Withdraw'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
