'use client';

import { WorkflowBuilder, StepConfigPanel, AutomationStats } from '@/components/automation';
import { useAutomationStore } from '@/stores/automation-store';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AutomationDetailPage() {
  const t = useTranslations('automation');
  const params = useParams();
  const router = useRouter();
  const {
    currentAutomation,
    loadAutomation,
    loadAutomations,
    automations,
    updateAutomation,
    activateAutomation,
    pauseAutomation,
    clearCurrentAutomation,
    isLoading,
  } = useAutomationStore();
  const [activeView, setActiveView] = useState<'builder' | 'stats'>('builder');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const id = params.id as string;

  useEffect(() => {
    // Load automations if not loaded
    if (automations.length === 0) {
      loadAutomations();
    }
  }, [automations.length, loadAutomations]);

  useEffect(() => {
    if (automations.length > 0 && id) {
      loadAutomation(id);
    }
  }, [automations.length, id, loadAutomation]);

  useEffect(() => {
    return () => {
      clearCurrentAutomation();
    };
  }, [clearCurrentAutomation]);

  const handleSaveName = () => {
    if (editName.trim() && currentAutomation) {
      updateAutomation(currentAutomation.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleToggleStatus = () => {
    if (!currentAutomation) return;

    if (currentAutomation.status === 'active') {
      pauseAutomation(currentAutomation.id);
    } else {
      activateAutomation(currentAutomation.id);
    }
  };

  if (isLoading || !currentAutomation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
                {isEditingName ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className="text-xl font-bold bg-transparent border-b-2 border-primary focus:outline-none text-gray-900 dark:text-gray-100"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditName(currentAutomation.name);
                      setIsEditingName(true);
                    }}
                    className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-primary flex items-center gap-2"
                  >
                    {currentAutomation.name}
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[currentAutomation.status]}`}>
                    {t(`status.${currentAutomation.status}`)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentAutomation.steps.length} {t('steps')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setActiveView('builder')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeView === 'builder'
                      ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t('builder')}
                </button>
                <button
                  onClick={() => setActiveView('stats')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeView === 'stats'
                      ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t('statistics')}
                </button>
              </div>

              {/* Status toggle */}
              <button
                onClick={handleToggleStatus}
                disabled={currentAutomation.status === 'draft' && currentAutomation.steps.length === 0}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentAutomation.status === 'active'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {currentAutomation.status === 'active' ? t('pause') : t('activate')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'builder' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workflow Builder */}
            <div className="lg:col-span-2">
              <WorkflowBuilder />
            </div>

            {/* Config Panel */}
            <div className="lg:col-span-1">
              <StepConfigPanel />
            </div>
          </div>
        ) : (
          <AutomationStats />
        )}
      </main>
    </div>
  );
}
