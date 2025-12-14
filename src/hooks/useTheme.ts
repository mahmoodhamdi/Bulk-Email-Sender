'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * Hook to apply theme changes to the document
 * This handles DOM manipulation reactively based on theme state
 */
export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Also listen for system theme changes when in system mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return theme;
}

/**
 * Hook to get current effective theme (resolves 'system' to actual theme)
 */
export function useEffectiveTheme(): 'light' | 'dark' {
  const theme = useSettingsStore((state) => state.theme);

  if (theme === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return theme;
}
