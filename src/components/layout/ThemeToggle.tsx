'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 opacity-50 shrink-0" />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-1.5 sm:p-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-500 dark:text-amber-400 border border-slate-300 dark:border-slate-700 transition flex items-center justify-center shadow-sm shrink-0 min-w-[34px] min-h-[34px]"
      aria-label="Toggle Theme"
      title={isDark ? 'Berpindah ke Mode Terang (Light)' : 'Berpindah ke Mode Gelap (Dark)'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-600/20 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
