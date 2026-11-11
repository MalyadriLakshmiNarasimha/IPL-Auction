'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reaction } from '@/shared/types';

interface FloatingReaction extends Reaction {
  key: string;
  xOffset: number;
}

interface ReactionRailProps {
  reactions: Reaction[];
  onSendReaction: (emoji: Reaction['emoji']) => void;
}

const EMOJIS: Reaction['emoji'][] = ['🔥', '😂', '👏', '😮', '❤️', '🥵'];

export const ReactionRail: React.FC<ReactionRailProps> = ({
  reactions,
  onSendReaction,
}) => {
  const [floatingList, setFloatingList] = useState<FloatingReaction[]>([]);
  const lastSentAtRef = useRef<number>(0);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  useEffect(() => {
    if (reactions.length === 0) return;
    const latest = reactions[reactions.length - 1];
    const newFloating: FloatingReaction = {
      ...latest,
      key: `${latest.id}-${Math.random()}`,
      xOffset: (Math.random() - 0.5) * 50, // subtle horizontal drift
    };

    setFloatingList(prev => [...prev.slice(-12), newFloating]);

    const timer = setTimeout(() => {
      setFloatingList(prev => prev.filter(r => r.key !== newFloating.key));
    }, 2400);

    return () => clearTimeout(timer);
  }, [reactions]);

  const handleEmojiClick = (emoji: Reaction['emoji']) => {
    const now = Date.now();
    if (now - lastSentAtRef.current < 400) {
      return; // 400ms debounce
    }
    lastSentAtRef.current = now;
    setIsCoolingDown(true);
    setTimeout(() => setIsCoolingDown(false), 300);
    onSendReaction(emoji);
  };

  return (
    <>
      {/* Floating Emojis Canvas - floats up along the right edge */}
      <div className="fixed bottom-36 right-3 sm:right-5 z-40 pointer-events-none flex flex-col items-end">
        <AnimatePresence>
          {floatingList.map(item => (
            <motion.div
              key={item.key}
              initial={{ opacity: 1, y: 0, scale: 0.7, x: item.xOffset }}
              animate={{ opacity: 0, y: -200, scale: 1.3, x: item.xOffset * 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.0, ease: 'easeOut' }}
              className="flex items-center gap-1.5 mb-2 bg-[#0A0B0D]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-night-border/80 shadow-2xl"
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.franchise_color || '#DCC477' }}
              />
              <span className="text-xl select-none leading-none">{item.emoji}</span>
              <span className="text-[10px] font-bold text-floodlight truncate max-w-[80px]">
                {item.display_name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Vertical Emoji Toolbar on the Screen Edge */}
      <div
        className="flex flex-col items-center gap-1.5 bg-[#0A0B0D]/90 backdrop-blur-md p-1.5 rounded-2xl border border-night-border/80 shadow-2xl transition-all"
        role="toolbar"
        aria-label="Reaction emojis"
      >
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            type="button"
            disabled={isCoolingDown}
            onClick={() => handleEmojiClick(emoji)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-night-surface/80 hover:bg-night-raised active:scale-90 transition-all text-lg select-none border border-night-border/40 hover:border-flare/50 hover:shadow-flare disabled:opacity-60"
            title={`React with ${emoji}`}
            aria-label={`React with ${emoji}`}
          >
            <span className="transform transition-transform hover:scale-125 pointer-events-none">
              {emoji}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};
