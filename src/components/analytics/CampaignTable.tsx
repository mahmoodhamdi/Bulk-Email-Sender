'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronUp, ChevronDown, Search, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContainer,
  PaginationInfo,
  PageSizeSelector,
} from '@/components/ui/pagination';
import { Sparkline } from './Charts';
import { type CampaignMetrics, formatNumber, formatPercentage } from '@/stores/analytics-store';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';

interface CampaignTableProps {
  campaigns: CampaignMetrics[];
  onExport?: () => void;
  onCampaignClick?: (campaign: CampaignMetrics) => void;
  className?: string;
}

type SortField = 'name' | 'sent' | 'openRate' | 'clickRate' | 'bounceRate' | 'sentAt';
type SortDirection = 'asc' | 'desc';

export function CampaignTable({
  campaigns,
  onExport,
  onCampaignClick,
  className,
}: CampaignTableProps) {
  const t = useTranslations('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('sentAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const calculateRate = (numerator: number, denominator: number) =>
    denominator > 0 ? (numerator / denominator) * 100 : 0;

  const sortedCampaigns = useMemo(() => {
    const filtered = campaigns.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'sent':
          aValue = a.sent;
          bValue = b.sent;
          break;
        case 'openRate':
          aValue = calculateRate(a.opened, a.delivered);
          bValue = calculateRate(b.opened, b.delivered);
          break;
        case 'clickRate':
          aValue = calculateRate(a.clicked, a.delivered);
          bValue = calculateRate(b.clicked, b.delivered);
          break;
        case 'bounceRate':
          aValue = calculateRate(a.bounced, a.sent);
          bValue = calculateRate(b.bounced, b.sent);
          break;
        case 'sentAt':
          aValue = a.sentAt.getTime();
          bValue = b.sentAt.getTime();
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [campaigns, searchQuery, sortField, sortDirection]);

  // Pagination
  const {
    paginatedItems: paginatedCampaigns,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    startIndex,
    endIndex,
    goToPage,
    setPageSize,
    pageSizeOptions,
  } = usePagination(sortedCampaigns, { initialPageSize: 10 });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const getStatusColor = (status: CampaignMetrics['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'sending':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Generate mock trend data for sparkline
  const generateTrendData = (campaign: CampaignMetrics) => {
    const base = campaign.opened;
    return Array.from({ length: 7 }, (_, i) =>
      Math.max(0, base + Math.floor(Math.random() * base * 0.5) - base * 0.25)
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{t('report.recipientActivity')}</CardTitle>
            <CardDescription>
              {campaigns.length} {t('campaigns')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchCampaigns')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 pr-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-primary"
                  >
                    {t('campaignName')}
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="pb-3 px-4">
                  <span className="font-medium text-sm">{t('status')}</span>
                </th>
                <th className="pb-3 px-4">
                  <button
                    onClick={() => handleSort('sent')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-primary"
                  >
                    {t('metrics.sent')}
                    {renderSortIcon('sent')}
                  </button>
                </th>
                <th className="pb-3 px-4">
                  <button
                    onClick={() => handleSort('openRate')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-primary"
                  >
                    {t('metrics.openRate')}
                    {renderSortIcon('openRate')}
                  </button>
                </th>
                <th className="pb-3 px-4">
                  <button
                    onClick={() => handleSort('clickRate')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-primary"
                  >
                    {t('metrics.clickRate')}
                    {renderSortIcon('clickRate')}
                  </button>
                </th>
                <th className="pb-3 px-4">
                  <span className="font-medium text-sm">{t('trend')}</span>
                </th>
                <th className="pb-3 px-4">
                  <button
                    onClick={() => handleSort('sentAt')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-primary"
                  >
                    {t('date')}
                    {renderSortIcon('sentAt')}
                  </button>
                </th>
                <th className="pb-3 pl-4"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedCampaigns.map((campaign) => {
                const openRate = calculateRate(campaign.opened, campaign.delivered);
                const clickRate = calculateRate(campaign.clicked, campaign.delivered);

                return (
                  <tr
                    key={campaign.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 pr-4">
                      <span className="font-medium">{campaign.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                          getStatusColor(campaign.status)
                        )}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium">{formatNumber(campaign.sent)}</span>
                      <span className="text-muted-foreground text-sm ml-1">
                        / {formatNumber(campaign.delivered)} delivered
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatPercentage(openRate)}</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(openRate * 2, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatPercentage(clickRate)}</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(clickRate * 5, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Sparkline
                        data={generateTrendData(campaign)}
                        color={openRate > 20 ? '#22c55e' : '#3b82f6'}
                        width={60}
                        height={20}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-muted-foreground">
                        {campaign.sentAt.toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 pl-4">
                      {onCampaignClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCampaignClick(campaign)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sortedCampaigns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? t('noResults') : t('noCampaigns')}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <PaginationContainer>
            <div className="flex items-center gap-4">
              <PaginationInfo
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={totalItems}
              />
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                options={pageSizeOptions}
              />
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </PaginationContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default CampaignTable;
