'use client';

import { useReputationStore, BounceType, BounceEvent } from '@/stores/reputation-store';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function BounceManager() {
  const t = useTranslations('reputation');
  const {
    bounces,
    bounceFilter,
    setBounceFilter,
    getFilteredBounces,
    removeBounce,
    removeBouncesByType,
    removeAllBounces,
    exportBounces,
  } = useReputationStore();

  const [selectedBounces, setSelectedBounces] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState<'all' | 'hard' | 'selected' | null>(null);

  const filteredBounces = getFilteredBounces();

  const handleSelectAll = () => {
    if (selectedBounces.size === filteredBounces.length) {
      setSelectedBounces(new Set());
    } else {
      setSelectedBounces(new Set(filteredBounces.map((b) => b.id)));
    }
  };

  const handleSelectBounce = (id: string) => {
    const newSelected = new Set(selectedBounces);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBounces(newSelected);
  };

  const handleRemoveSelected = () => {
    selectedBounces.forEach((id) => removeBounce(id));
    setSelectedBounces(new Set());
    setShowConfirmDialog(null);
  };

  const handleRemoveHardBounces = () => {
    removeBouncesByType('hard');
    setSelectedBounces(new Set());
    setShowConfirmDialog(null);
  };

  const handleRemoveAll = () => {
    removeAllBounces();
    setSelectedBounces(new Set());
    setShowConfirmDialog(null);
  };

  const handleExport = () => {
    const data = exportBounces();
    const csv = [
      ['Email', 'Type', 'Reason', 'Code', 'Campaign', 'Date'].join(','),
      ...data.map((b) =>
        [
          b.email,
          b.type,
          b.reason,
          b.code || '',
          b.campaignName || '',
          new Date(b.bouncedAt).toISOString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bounces-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return t('today');
    if (days === 1) return t('yesterday');
    if (days < 7) return `${days} ${t('daysAgo')}`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('bounceManager')}
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('export')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalBounces')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{bounces.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('hardBounces')}</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{bounces.hard}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('softBounces')}</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{bounces.soft}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={bounceFilter.type}
          onChange={(e) => setBounceFilter({ type: e.target.value as BounceType | 'all' })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">{t('allTypes')}</option>
          <option value="hard">{t('hardBounces')}</option>
          <option value="soft">{t('softBounces')}</option>
        </select>

        <select
          value={bounceFilter.dateRange}
          onChange={(e) => setBounceFilter({ dateRange: e.target.value as 'today' | 'week' | 'month' | 'all' })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="today">{t('today')}</option>
          <option value="week">{t('lastWeek')}</option>
          <option value="month">{t('lastMonth')}</option>
          <option value="all">{t('allTime')}</option>
        </select>

        <input
          type="text"
          placeholder={t('searchBounces')}
          value={bounceFilter.search}
          onChange={(e) => setBounceFilter({ search: e.target.value })}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Bounce Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedBounces.size === filteredBounces.length && filteredBounces.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('email')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('type')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('reason')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('campaign')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('date')}
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBounces.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('noBounces')}
                  </td>
                </tr>
              ) : (
                filteredBounces.map((bounce) => (
                  <tr key={bounce.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedBounces.has(bounce.id)}
                        onChange={() => handleSelectBounce(bounce.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {bounce.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          bounce.type === 'hard'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {t(bounce.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {bounce.reason}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {bounce.campaignName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(bounce.bouncedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeBounce(bounce.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {selectedBounces.size > 0 && (
          <button
            onClick={() => setShowConfirmDialog('selected')}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            {t('removeSelected')} ({selectedBounces.size})
          </button>
        )}
        {bounces.hard > 0 && (
          <button
            onClick={() => setShowConfirmDialog('hard')}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            {t('removeAllHardBounces')}
          </button>
        )}
      </div>

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('confirmRemove')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {showConfirmDialog === 'selected'
                ? t('confirmRemoveSelected', { count: selectedBounces.size })
                : showConfirmDialog === 'hard'
                ? t('confirmRemoveHardBounces', { count: bounces.hard })
                : t('confirmRemoveAll', { count: bounces.total })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t('cancel')}
              </button>
              <button
                onClick={
                  showConfirmDialog === 'selected'
                    ? handleRemoveSelected
                    : showConfirmDialog === 'hard'
                    ? handleRemoveHardBounces
                    : handleRemoveAll
                }
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                {t('remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BounceManager;
