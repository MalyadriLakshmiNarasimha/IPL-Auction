'use client';

import React, { useEffect, useState } from 'react';
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

const EMOJIS: Reaction['emoji'][] = ['🔥', '😱', '💰', '😂', '👏'];

export const ReactionRail: React.FC<ReactionRailProps> = ({
  reactions,
  onSendReaction,
}) => {
  const [floatingList, setFloatingList] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const latest = reactions[reactions.length - 1];
    const newFloating: FloatingReaction = {
      ...latest,
      key: `${latest.id}-${Math.random()}`,
      xOffset: (Math.random() - 0.5) * 80, // slight random horizontal float
    };

    setFloatingList(prev => [...prev.slice(-15), newFloating]);

    const timer = setTimeout(() => {
      setFloatingList(prev => prev.filter(r => r.key !== newFloating.key));
    }, 2800);

    return () => clearTimeout(timer);
  }, [reactions]);

  return (
    <>
      {/* Floating Emojis Canvas */}
      <div className="fixed bottom-24 right-4 z-40 pointer-events-none flex flex-col items-end">
        <AnimatePresence>
          {floatingList.map(item => (
            <motion.div
              key={item.key}
              initial={{ opacity: 1, y: 0, scale: 0.6, x: item.xOffset }}
              animate={{ opacity: 0, y: -220, scale: 1.4, x: item.xOffset * 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="flex items-center gap-1.5 mb-2 bg-night/80 backdrop-blur-sm px-2 py-0.5 rounded-pill border border-night-border shadow-lg"
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.franchise_color }}
              />
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[10px] font-semibold text-floodlight truncate max-w-[70px]">
                {item.display_name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Emoji Trigger Bar */}
      <div className="flex items-center gap-1 sm:gap-2 bg-night-raised/90 backdrop-blur-sm p-1 sm:p-1.5 rounded-pill border border-night-border shadow-md">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-night hover:scale-110 active:scale-95 transition-all text-base sm:text-lg select-none"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};

