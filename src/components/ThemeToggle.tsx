'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ipl_theme');
    if (stored === 'light') {
      setIsLight(true);
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ipl_theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('ipl_theme', 'dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full border border-night-border bg-night-raised text-floodlight-muted hover:text-white transition-all"
      title={isLight ? 'Switch to Dusk Night match' : 'Switch to Day match'}
      aria-label="Toggle Theme"
    >
      {isLight ? <Moon className="w-4 h-4 text-night" /> : <Sun className="w-4 h-4 text-flare" />}
    </button>
  );
};

