'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Sidebar } from './Sidebar';
import { getContactDisplay, hasContactInfo } from '@/lib/config';

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageLayout({ children, title, subtitle, actions }: PageLayoutProps) {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-4">{actions}</div>}
        </header>

        <div className="p-6">{children}</div>

        <footer className="border-t p-6 text-center text-sm text-muted-foreground">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          {hasContactInfo() && (
            <p className="mt-1">
              {t('footer.contact')}: {getContactDisplay()}
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}
