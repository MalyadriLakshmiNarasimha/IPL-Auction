'use client';

import React, { useState } from 'react';
import { AuctionState, Participant, RoomSettings } from '@/shared/types';
import { BID_INCREMENTS, formatCurrency } from '@/shared/constants';
import { getBidButtonStatus, validateBid } from '@/shared/validation';
import { soundManager } from '@/lib/sound';
import { SlidersHorizontal, Check, X, ShieldAlert } from 'lucide-react';

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
  const [showCustomBid, setShowCustomBid] = useState(false);
  const [customAmountInCr, setCustomAmountInCr] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);

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

  // Convert Crores input string (e.g. "4.5") to integer rupees
  const parsedCustomRupees = Math.round((parseFloat(customAmountInCr) || 0) * 10000000);

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant || !isBiddingActive || hasWithdrawn || isLeading) return;

    if (isNaN(parsedCustomRupees) || parsedCustomRupees <= 0) {
      setCustomError('Enter a valid bid amount in Crores (e.g. 3.50)');
      return;
    }

    const validation = validateBid(participant, auctionState, settings, parsedCustomRupees, true);
    if (!validation.valid) {
      setCustomError(validation.reason || 'Invalid custom bid');
      return;
    }

    soundManager.playBidTick();
    onBid(parsedCustomRupees, true);
    setCustomAmountInCr('');
    setShowCustomBid(false);
    setCustomError(null);
  };

  // Minimum required for custom bid
  const currentBid = auctionState.current_bid || (auctionState.current_player?.base_price || 0);
  const minCustomRequired = auctionState.current_bid > 0
    ? auctionState.current_bid + 2000000
    : (auctionState.current_player?.base_price || 2000000);

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 bg-[#0A0B0D]/95 backdrop-blur-md border-t border-night-border/80 px-3 py-2.5 sm:px-6 sm:py-3 shadow-2xl">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        {/* Custom Bid Expandable Panel */}
        {showCustomBid && (
          <form
            onSubmit={handleCustomBidSubmit}
            className="p-3 rounded-xl bg-night-card border border-flare/40 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 animate-fadeIn"
          >
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-flare flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Custom Jump Bid
                </span>
                <span className="text-[11px] text-floodlight-muted">
                  Min bid: <strong className="text-floodlight">{formatCurrency(minCustomRequired)}</strong>
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-floodlight-muted pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="0.2"
                  max="30"
                  autoFocus
                  placeholder={`e.g. ${(minCustomRequired / 10000000).toFixed(2)}`}
                  value={customAmountInCr}
                  onChange={(e) => {
                    setCustomAmountInCr(e.target.value);
                    setCustomError(null);
                  }}
                  className="w-full bg-night-surface border border-night-border rounded-lg pl-7 pr-14 py-1.5 text-floodlight font-display font-black text-lg focus:outline-none focus:border-flare"
                />
                <span className="absolute right-3 text-xs font-bold text-floodlight-muted pointer-events-none">
                  Crore
                </span>
              </div>
              {customError && (
                <div className="text-[10px] text-hammer font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                  <span>{customError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="submit"
                disabled={!isBiddingActive || hasWithdrawn || isLeading || parsedCustomRupees < minCustomRequired}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-flare hover:bg-flare-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-flare flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span>Place Custom Bid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomBid(false);
                  setCustomError(null);
                }}
                className="p-2 rounded-lg bg-night-surface hover:bg-night-border text-floodlight-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {/* 3 Standard Increment Buttons */}
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

          {/* Custom Bid Trigger Button */}
          <button
            type="button"
            disabled={!isBiddingActive || hasWithdrawn || isLeading}
            onClick={() => setShowCustomBid(prev => !prev)}
            className={`flex flex-col items-center justify-center min-h-[54px] sm:min-h-[62px] rounded-xl px-2 py-1 transition-all duration-150 select-none border ${
              showCustomBid
                ? 'bg-flare/20 border-flare text-flare font-bold'
                : !isBiddingActive || hasWithdrawn || isLeading
                  ? 'bg-night-raised/40 border-night-border/40 opacity-40 cursor-not-allowed text-floodlight-muted'
                  : 'bg-night-raised hover:bg-night-border/80 border-flare/40 text-flare hover:text-white font-bold'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 mb-0.5" />
            <span className="text-xs sm:text-sm font-display font-black uppercase tracking-tight">
              Custom
            </span>
            <span className="text-[9px] text-floodlight-muted">
              Enter Bid
            </span>
          </button>
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
