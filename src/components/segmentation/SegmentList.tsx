'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Users, Copy, Trash2, Edit, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSegmentationStore, type Segment } from '@/stores/segmentation-store';
import { cn } from '@/lib/utils';

interface SegmentListProps {
  onEdit?: (segmentId: string) => void;
  onSelect?: (segment: Segment) => void;
  selectable?: boolean;
  selectedId?: string;
}

export function SegmentList({ onEdit, onSelect, selectable, selectedId }: SegmentListProps) {
  const t = useTranslations();
  const { segments, loadSegment, deleteSegment, duplicateSegment } = useSegmentationStore();
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const handleEdit = (segmentId: string) => {
    loadSegment(segmentId);
    onEdit?.(segmentId);
  };

  const handleSelect = (segment: Segment) => {
    if (selectable) {
      onSelect?.(segment);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getConditionSummary = (segment: Segment) => {
    let totalConditions = 0;
    segment.groups.forEach((g) => {
      totalConditions += g.conditions.length;
    });
    return `${segment.groups.length} ${t('segmentation.groups')}, ${totalConditions} ${t('segmentation.conditions')}`;
  };

  if (segments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('segmentation.noSegments')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('segmentation.noSegmentsDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <Card
          key={segment.id}
          className={cn(
            'relative transition-all',
            selectable && 'cursor-pointer hover:border-primary',
            selectedId === segment.id && 'border-primary ring-2 ring-primary/20'
          )}
          onClick={() => handleSelect(segment)}
        >
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{segment.name}</h3>
                </div>
                {segment.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {segment.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {segment.contactCount} {t('segmentation.contacts')}
                  </span>
                  <span>{getConditionSummary(segment)}</span>
                  <span>{t('segmentation.created')}: {formatDate(segment.createdAt)}</span>
                </div>
              </div>

              {!selectable && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === segment.id ? null : segment.id);
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>

                  {openMenuId === segment.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                        <button
                          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(segment.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          {t('common.edit')}
                        </button>
                        <button
                          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateSegment(segment.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          {t('common.copy')}
                        </button>
                        <button
                          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-red-500 hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSegment(segment.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('common.delete')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
