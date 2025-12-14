'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

/**
 * Client-side ErrorBoundary provider wrapper
 * Used in the app layout to catch errors in the client-side render tree
 */
export function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
