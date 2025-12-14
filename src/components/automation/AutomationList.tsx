'use client';

import { useAutomationStore, type Automation, type AutomationStatus } from '@/stores/automation-store';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';

// Status badge component
function StatusBadge({ status }: { status: AutomationStatus }) {
  const t = useTranslations('automation');

  const styles = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {t(`status.${status}`)}
    </span>
  );
}

// Automation card component
function AutomationCard({ automation }: { automation: Automation }) {
  const t = useTranslations('automation');
  const { activateAutomation, pauseAutomation, deleteAutomation, duplicateAutomation } =
    useAutomationStore();
  const [showMenu, setShowMenu] = useState(false);

  const handleToggle = () => {
    if (automation.status === 'active') {
      pauseAutomation(automation.id);
    } else {
      activateAutomation(automation.id);
    }
  };

  const handleDelete = () => {
    if (confirm(t('confirmDelete'))) {
      deleteAutomation(automation.id);
    }
  };

  const handleDuplicate = () => {
    duplicateAutomation(automation.id);
    setShowMenu(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/automations/${automation.id}`}
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-primary"
            >
              {automation.name}
            </Link>
            <StatusBadge status={automation.status} />
          </div>
          {automation.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {automation.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {automation.stats.emailsSent.toLocaleString()} {t('emailsSent')}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {automation.stats.totalActive.toLocaleString()} {t('activeContacts')}
            </span>
            <span>{automation.stats.openRate.toFixed(1)}% {t('openRate')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle switch */}
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              automation.status === 'active' ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
            }`}
            disabled={automation.status === 'draft'}
            title={automation.status === 'draft' ? t('publishFirst') : undefined}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                automation.status === 'active' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                <Link
                  href={`/automations/${automation.id}`}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('edit')}
                </Link>
                <button
                  onClick={handleDuplicate}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('duplicate')}
                </button>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button
                  onClick={handleDelete}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {t('delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Steps preview */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto">
        {automation.steps.slice(0, 5).map((step, index) => (
          <div key={step.id} className="flex items-center">
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded whitespace-nowrap">
              {step.name}
            </span>
            {index < automation.steps.length - 1 && index < 4 && (
              <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        ))}
        {automation.steps.length > 5 && (
          <span className="text-xs text-gray-400">+{automation.steps.length - 5}</span>
        )}
      </div>
    </div>
  );
}

// Main list component
export function AutomationList() {
  const t = useTranslations('automation');
  const {
    getFilteredAutomations,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
  } = useAutomationStore();

  const automations = getFilteredAutomations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(['all', 'active', 'paused', 'draft'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {t(`filter.${status}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Automations grid */}
      {automations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('noAutomations')}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('noAutomationsDesc')}
          </p>
          <Link
            href="/automations/new"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('createFirst')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {automations.map((automation) => (
            <AutomationCard key={automation.id} automation={automation} />
          ))}
        </div>
      )}
    </div>
  );
}
