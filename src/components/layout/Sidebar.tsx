'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Mail,
  Users,
  BarChart3,
  FileText,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: BarChart3, labelKey: 'nav.dashboard' },
  { href: '/campaigns', icon: Mail, labelKey: 'nav.campaigns' },
  { href: '/templates', icon: FileText, labelKey: 'nav.templates' },
  { href: '/contacts', icon: Users, labelKey: 'nav.contacts' },
  { href: '/analytics', icon: TrendingUp, labelKey: 'nav.analytics' },
  { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  // Remove locale prefix from pathname for comparison
  const normalizedPathname = pathname.replace(/^\/(en|ar)/, '') || '/';

  return (
    <aside className="hidden w-64 border-r bg-card lg:block">
      <div className="flex h-16 items-center border-b px-6">
        <Mail className="h-6 w-6 text-primary" />
        <span className="ml-2 text-lg font-semibold">
          {t('common.appName')}
        </span>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? normalizedPathname === '/'
              : normalizedPathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
