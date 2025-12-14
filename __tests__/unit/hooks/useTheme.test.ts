import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, useEffectiveTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/stores/settings-store';

// Mock window.matchMedia
const mockMatchMedia = vi.fn((query: string) => ({
  matches: query.includes('dark'),
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

describe('useTheme', () => {
  beforeEach(() => {
    // Reset the store before each test
    useSettingsStore.setState({ theme: 'system' });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    // Clean up document classes
    document.documentElement.classList.remove('light', 'dark');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return the current theme from store', () => {
    useSettingsStore.setState({ theme: 'dark' });
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBe('dark');
  });

  it('should apply light theme class to document', () => {
    useSettingsStore.setState({ theme: 'light' });
    renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should apply dark theme class to document', () => {
    useSettingsStore.setState({ theme: 'dark' });
    renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('should apply system theme based on prefers-color-scheme', () => {
    // Mock dark mode preference
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    useSettingsStore.setState({ theme: 'system' });
    renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('should update when theme changes', () => {
    useSettingsStore.setState({ theme: 'light' });
    renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('light')).toBe(true);

    act(() => {
      useSettingsStore.setState({ theme: 'dark' });
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('should remove previous theme class when changing themes', () => {
    useSettingsStore.setState({ theme: 'light' });
    renderHook(() => useTheme());

    act(() => {
      useSettingsStore.setState({ theme: 'dark' });
    });

    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});

describe('useEffectiveTheme', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'system' });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return light when theme is light', () => {
    useSettingsStore.setState({ theme: 'light' });
    const { result } = renderHook(() => useEffectiveTheme());
    expect(result.current).toBe('light');
  });

  it('should return dark when theme is dark', () => {
    useSettingsStore.setState({ theme: 'dark' });
    const { result } = renderHook(() => useEffectiveTheme());
    expect(result.current).toBe('dark');
  });

  it('should return system preference when theme is system', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    useSettingsStore.setState({ theme: 'system' });
    const { result } = renderHook(() => useEffectiveTheme());
    expect(result.current).toBe('dark');
  });
});
