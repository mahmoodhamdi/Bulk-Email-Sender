'use client';

import { cn } from '@/lib/utils';
import { usePreviewStore, type PreviewDevice } from '@/stores/preview-store';
import { useTranslations } from 'next-intl';

interface DeviceOption {
  id: PreviewDevice;
  icon: React.ReactNode;
  label: string;
}

export function DeviceToggle() {
  const t = useTranslations('preview');
  const { previewMode, setPreviewMode } = usePreviewStore();

  const devices: DeviceOption[] = [
    {
      id: 'desktop',
      label: t('desktop'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 'tablet',
      label: t('tablet'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 'mobile',
      label: t('mobile'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {devices.map((device) => (
        <button
          key={device.id}
          onClick={() => setPreviewMode(device.id)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
            previewMode === device.id
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
          title={device.label}
        >
          {device.icon}
          <span className="hidden sm:inline text-sm font-medium">{device.label}</span>
        </button>
      ))}
    </div>
  );
}

export function DarkModeToggle() {
  const t = useTranslations('preview');
  const { darkMode, setDarkMode } = usePreviewStore();

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
        darkMode
          ? 'bg-gray-800 text-yellow-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
      )}
      title={darkMode ? t('lightMode') : t('darkMode')}
    >
      {darkMode ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}

export function EmailClientSelector() {
  const t = useTranslations('preview');
  const { emailClient, setEmailClient } = usePreviewStore();

  const clients = [
    { id: 'default' as const, label: t('clientDefault') },
    { id: 'gmail' as const, label: 'Gmail' },
    { id: 'outlook' as const, label: 'Outlook' },
    { id: 'apple' as const, label: 'Apple Mail' },
  ];

  return (
    <select
      value={emailClient}
      onChange={(e) => setEmailClient(e.target.value as typeof emailClient)}
      className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
    >
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.label}
        </option>
      ))}
    </select>
  );
}
