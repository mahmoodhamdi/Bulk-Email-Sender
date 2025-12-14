'use client';

import { useReputationStore, RecommendationPriority } from '@/stores/reputation-store';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const PriorityBadge = ({ priority }: { priority: RecommendationPriority }) => {
  const t = useTranslations('reputation');

  const styles: Record<RecommendationPriority, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority]}`}>
      {t(`priority.${priority}`)}
    </span>
  );
};

const PriorityIcon = ({ priority }: { priority: RecommendationPriority }) => {
  const colors: Record<RecommendationPriority, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
  };

  if (priority === 'critical') {
    return (
      <svg className={`w-6 h-6 ${colors[priority]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }

  return (
    <svg className={`w-6 h-6 ${colors[priority]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

export function Recommendations() {
  const t = useTranslations('reputation');
  const { recommendations, dismissRecommendation, restoreRecommendation } = useReputationStore();
  const [showDismissed, setShowDismissed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeRecommendations = recommendations.filter((r) => !r.dismissed);
  const dismissedRecommendations = recommendations.filter((r) => r.dismissed);

  const priorityOrder: RecommendationPriority[] = ['critical', 'high', 'medium', 'low'];
  const sortedRecommendations = [...activeRecommendations].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
  );

  const criticalCount = activeRecommendations.filter((r) => r.priority === 'critical').length;
  const highCount = activeRecommendations.filter((r) => r.priority === 'high').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('recommendations')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('recommendationsDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
              {criticalCount} {t('critical')}
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
              {highCount} {t('high')}
            </span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {priorityOrder.map((priority) => {
          const count = activeRecommendations.filter((r) => r.priority === priority).length;
          return (
            <div
              key={priority}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center"
            >
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{t(`priority.${priority}`)}</p>
            </div>
          );
        })}
      </div>

      {/* Recommendations List */}
      {sortedRecommendations.length === 0 ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
            {t('noRecommendations')}
          </h3>
          <p className="text-green-700 dark:text-green-300 mt-1">
            {t('noRecommendationsDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRecommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
              >
                <div className="flex items-start gap-4">
                  <PriorityIcon priority={rec.priority} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {rec.category}
                      </span>
                      <PriorityBadge priority={rec.priority} />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {rec.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {rec.description}
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedId === rec.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expandedId === rec.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-200 dark:border-gray-700">
                  <div className="pt-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('impact')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rec.impact}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('suggestedAction')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rec.action}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissRecommendation(rec.id);
                          setExpandedId(null);
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        {t('dismiss')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dismissed Recommendations */}
      {dismissedRecommendations.length > 0 && (
        <div>
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showDismissed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {t('showDismissed')} ({dismissedRecommendations.length})
          </button>

          {showDismissed && (
            <div className="mt-4 space-y-2">
              {dismissedRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 line-through">{rec.title}</span>
                    <span className="text-xs text-gray-400">
                      {rec.dismissedAt && new Date(rec.dismissedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => restoreRecommendation(rec.id)}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('restore')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Recommendations;
