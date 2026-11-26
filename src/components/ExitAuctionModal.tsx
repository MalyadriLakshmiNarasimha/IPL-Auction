'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X } from 'lucide-react';

interface ExitAuctionModalProps {
  isOpen: boolean;
  roomCode: string;
  isHost: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
}

export const ExitAuctionModal: React.FC<ExitAuctionModalProps> = ({
  isOpen,
  roomCode,
  isHost,
  onClose,
  onConfirmExit,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        {/* Backdrop click blocker */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative max-w-md w-full bg-[#0D0F12] border border-night-border rounded-2xl p-6 sm:p-7 shadow-2xl z-10 overflow-hidden"
        >
          {/* Top subtle decorative strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-floodlight-muted hover:text-white hover:bg-white/5 transition-colors"
            title="Cancel"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold text-floodlight tracking-tight mb-2">
              Exit Auction?
            </h3>

            <p className="text-xs sm:text-sm text-floodlight-muted leading-relaxed mb-4">
              Are you sure you want to leave this auction room?
            </p>

            <div className="p-3 rounded-xl bg-night border border-night-border mb-5 flex items-center justify-between">
              <span className="text-xs text-floodlight-muted">
                {isHost ? 'Host Room Progress Preserved' : 'Auction Room Code'}
              </span>
              <span className="font-mono font-black text-sm text-flare tracking-widest px-2.5 py-1 rounded-md bg-flare/10 border border-flare/30">
                {roomCode}
              </span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-floodlight font-bold text-xs transition-all active:scale-[0.98]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onConfirmExit}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirm Exit</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
