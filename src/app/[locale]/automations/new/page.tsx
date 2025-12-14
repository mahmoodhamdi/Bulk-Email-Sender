'use client';

import { useAutomationStore } from '@/stores/automation-store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function NewAutomationPage() {
  const t = useTranslations('automation');
  const router = useRouter();
  const { createAutomation } = useAutomationStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;

    const id = createAutomation(name.trim(), description.trim() || undefined);
    router.push(`/automations/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/automations"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('createAutomation')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('createAutomationDesc')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('automationName')} *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('description')} ({t('optional')})
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Template options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('startWith')}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className="p-4 border-2 border-primary bg-primary/5 rounded-lg text-left"
                >
                  <div className="text-primary font-semibold">{t('templates.blank')}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('templates.blankDesc')}
                  </div>
                </button>
                <button
                  type="button"
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-left hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {t('templates.welcome')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('templates.welcomeDesc')}
                  </div>
                </button>
                <button
                  type="button"
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-left hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {t('templates.reengagement')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('templates.reengagementDesc')}
                  </div>
                </button>
                <button
                  type="button"
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-left hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {t('templates.birthday')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('templates.birthdayDesc')}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/automations"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('cancel')}
            </Link>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('createAndContinue')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
