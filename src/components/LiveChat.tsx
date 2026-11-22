'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/shared/types';
import { MessageSquare, X, Send } from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  onSendMessage,
  isOpen,
  onToggle,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isRateLimited) return;

    onSendMessage(clean);
    setInputText('');

    // Client-side rate limit throttle
    setIsRateLimited(true);
    setTimeout(() => setIsRateLimited(false), 600);
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-24 left-4 z-40 bg-flare hover:bg-flare-hover text-white p-3 rounded-full shadow-flare flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          title="Open Room Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-turf text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-night">
              {messages.length > 99 ? '99+' : messages.length}
            </span>
          )}
        </button>
      )}

      {/* Slide-over Chat Box */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 bg-night border-l border-night-border shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-night-border flex items-center justify-between bg-night-raised">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-flare" />
              <h3 className="font-bold text-sm text-floodlight">Auction Room Chat</h3>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-full text-floodlight-muted hover:text-white hover:bg-night"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages list */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-floodlight-subtle py-8">
                No chat messages yet. Cheer on your bids!
              </div>
            ) : (
              messages.map(m => (
                <div key={m.id} className="p-2 rounded-lg bg-night-raised/70 border border-night-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    {m.franchise_color && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: m.franchise_color }}
                      />
                    )}
                    <span className="font-bold text-floodlight">
                      {m.franchise_short_code || m.display_name}
                    </span>
                    <span className="text-[10px] text-floodlight-subtle ml-auto" suppressHydrationWarning>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-floodlight-muted break-words">{m.message}</div>
                </div>
              ))
            )}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="p-2.5 border-t border-night-border bg-night-raised flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={isRateLimited ? 'Slow down...' : 'Type a message...'}
              maxLength={140}
              disabled={isRateLimited}
              className="flex-1 bg-night rounded-pill px-3 py-1.5 text-xs text-floodlight border border-night-border focus:outline-none focus:border-flare placeholder:text-floodlight-subtle"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isRateLimited}
              className="bg-flare hover:bg-flare-hover disabled:opacity-40 text-white p-2 rounded-full transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

