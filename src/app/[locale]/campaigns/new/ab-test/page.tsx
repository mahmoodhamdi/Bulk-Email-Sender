'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { ABTestConfig } from '@/components/ab-testing/ABTestConfig';
import { useABTestStore } from '@/stores/ab-test-store';
import { useCampaignStore } from '@/stores/campaign-store';

export default function ABTestConfigPage() {
  const t = useTranslations();
  const router = useRouter();
  const { currentTest, saveTest } = useABTestStore();
  const { draft, updateDraft } = useCampaignStore();

  const handleSave = () => {
    if (currentTest) {
      saveTest();
      updateDraft({ abTestId: currentTest.id });
    }
    router.push('/campaigns/new');
  };

  return (
    <PageLayout
      title={t('abTest.title')}
      subtitle={t('abTest.subtitle')}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/campaigns/new">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl">
        <ABTestConfig campaignId={draft.name || 'new-campaign'} />
      </div>
    </PageLayout>
  );
}
