'use client';

import { cn } from '@/lib/utils';
import {
  useUnsubscribeStore,
  type SuppressedContact,
  type UnsubscribeReason,
  type SuppressionSource,
} from '@/stores/unsubscribe-store';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

function ReasonBadge({ reason }: { reason: UnsubscribeReason }) {
  const t = useTranslations('unsubscribe');

  const colors: Record<UnsubscribeReason, string> = {
    not_interested: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    too_frequent: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    never_subscribed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    inappropriate_content: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    other: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span className={cn('px-2 py-1 text-xs font-medium rounded-full', colors[reason])}>
      {t(`reasons.${reason}`)}
    </span>
  );
}

function SourceBadge({ source }: { source: SuppressionSource }) {
  const t = useTranslations('unsubscribe');

  const colors: Record<SuppressionSource, string> = {
    link: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    manual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    import: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    bounce: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    complaint: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={cn('px-2 py-1 text-xs font-medium rounded-full', colors[source])}>
      {t(`sources.${source}`)}
    </span>
  );
}

interface SuppressionRowProps {
  contact: SuppressedContact;
  isSelected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

function SuppressionRow({ contact, isSelected, onToggle, onRemove }: SuppressionRowProps) {
  const t = useTranslations('unsubscribe');

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 text-primary rounded"
        />
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-gray-900 dark:text-gray-100">{contact.email}</span>
      </td>
      <td className="px-4 py-3">
        <ReasonBadge reason={contact.reason} />
      </td>
      <td className="px-4 py-3">
        <SourceBadge source={contact.source} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {contact.campaignName || '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {contact.suppressedAt.toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 transition-colors"
          title={t('remove')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

export function SuppressionList() {
  const t = useTranslations('unsubscribe');
  const {
    isLoading,
    searchQuery,
    reasonFilter,
    sourceFilter,
    dateRange,
    selectedIds,
    currentPage,
    pageSize,
    loadSuppressionList,
    setSearchQuery,
    setReasonFilter,
    setSourceFilter,
    setDateRange,
    clearFilters,
    toggleSelection,
    selectAll,
    clearSelection,
    removeFromSuppression,
    bulkRemove,
    exportSuppression,
    getFilteredList,
    getPaginatedList,
  } = useUnsubscribeStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState<UnsubscribeReason>('other');

  useEffect(() => {
    loadSuppressionList();
  }, [loadSuppressionList]);

  const filteredList = getFilteredList();
  const paginatedList = getPaginatedList();
  const totalPages = Math.ceil(filteredList.length / pageSize);

  const handleExport = () => {
    const csv = exportSuppression();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppression-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkRemove = () => {
    if (selectedIds.length > 0 && confirm(t('confirmBulkRemove', { count: selectedIds.length }))) {
      bulkRemove(selectedIds);
    }
  };

  const handleAddEmail = () => {
    if (newEmail) {
      useUnsubscribeStore.getState().addToSuppression(newEmail, newReason, 'manual');
      setNewEmail('');
      setShowAddModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Reason filter */}
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as UnsubscribeReason | 'all')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">{t('allReasons')}</option>
          <option value="not_interested">{t('reasons.notInterested')}</option>
          <option value="too_frequent">{t('reasons.tooFrequent')}</option>
          <option value="never_subscribed">{t('reasons.neverSubscribed')}</option>
          <option value="inappropriate_content">{t('reasons.inappropriateContent')}</option>
          <option value="other">{t('reasons.other')}</option>
        </select>

        {/* Source filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SuppressionSource | 'all')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">{t('allSources')}</option>
          <option value="link">{t('sources.link')}</option>
          <option value="manual">{t('sources.manual')}</option>
          <option value="import">{t('sources.import')}</option>
          <option value="bounce">{t('sources.bounce')}</option>
          <option value="complaint">{t('sources.complaint')}</option>
        </select>

        {/* Date range */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="7d">{t('last7Days')}</option>
          <option value="30d">{t('last30Days')}</option>
          <option value="90d">{t('last90Days')}</option>
          <option value="all">{t('allTime')}</option>
        </select>

        {/* Clear filters */}
        <button
          onClick={clearFilters}
          className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          {t('clearFilters')}
        </button>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('selected', { count: selectedIds.length })}
              </span>
              <button
                onClick={handleBulkRemove}
                className="px-3 py-1 text-sm text-red-500 hover:text-red-700"
              >
                {t('removeSelected')}
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {t('clearSelection')}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t('addEmail')}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('export')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-start">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredList.length && filteredList.length > 0}
                  onChange={() => (selectedIds.length === filteredList.length ? clearSelection() : selectAll())}
                  className="w-4 h-4 text-primary rounded"
                />
              </th>
              <th className="px-4 py-3 text-start text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('email')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('reason')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('source')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('campaign')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('date')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {t('noResults')}
                </td>
              </tr>
            ) : (
              paginatedList.map((contact) => (
                <SuppressionRow
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedIds.includes(contact.id)}
                  onToggle={() => toggleSelection(contact.id)}
                  onRemove={() => {
                    if (confirm(t('confirmRemove'))) {
                      removeFromSuppression(contact.id);
                    }
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('showing', {
              start: (currentPage - 1) * pageSize + 1,
              end: Math.min(currentPage * pageSize, filteredList.length),
              total: filteredList.length,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => useUnsubscribeStore.getState().setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
            >
              {t('previous')}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => useUnsubscribeStore.getState().setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {/* Add Email Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('addToSuppression')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reason')}
                </label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value as UnsubscribeReason)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="not_interested">{t('reasons.notInterested')}</option>
                  <option value="too_frequent">{t('reasons.tooFrequent')}</option>
                  <option value="never_subscribed">{t('reasons.neverSubscribed')}</option>
                  <option value="inappropriate_content">{t('reasons.inappropriateContent')}</option>
                  <option value="other">{t('reasons.other')}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAddEmail}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
