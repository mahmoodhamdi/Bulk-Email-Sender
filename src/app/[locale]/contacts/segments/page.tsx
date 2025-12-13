'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { SegmentBuilder } from '@/components/segmentation/SegmentBuilder';
import { SegmentList } from '@/components/segmentation/SegmentList';
import { useSegmentationStore } from '@/stores/segmentation-store';

export default function SegmentsPage() {
  const t = useTranslations();
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list');
  const { createSegment, resetCurrentSegment } = useSegmentationStore();

  const handleCreate = () => {
    createSegment();
    setMode('create');
  };

  const handleEdit = (segmentId: string) => {
    setMode('edit');
  };

  const handleSave = () => {
    setMode('list');
    resetCurrentSegment();
  };

  const handleBack = () => {
    setMode('list');
    resetCurrentSegment();
  };

  return (
    <PageLayout
      title={t('segmentation.title')}
      subtitle={t('segmentation.subtitle')}
      actions={
        mode === 'list' ? (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/contacts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Link>
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('segmentation.newSegment')}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        )
      }
    >
      {mode === 'list' ? (
        <SegmentList onEdit={handleEdit} />
      ) : (
        <div className="mx-auto max-w-3xl">
          <SegmentBuilder onSave={handleSave} />
        </div>
      )}
    </PageLayout>
  );
}
