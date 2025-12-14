'use client';

import { useTheme } from '@/hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes theme handling
 * Wraps children and applies theme class to document
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme handling - applies theme to document on mount and changes
  useTheme();

  return <>{children}</>;
}
