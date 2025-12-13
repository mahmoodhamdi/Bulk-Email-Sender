'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Trophy, FlaskConical, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  useABTestStore,
  type ABTestType,
  type WinnerCriteria,
} from '@/stores/ab-test-store';
import { cn } from '@/lib/utils';

interface ABTestConfigProps {
  campaignId: string;
  onComplete?: () => void;
}

export function ABTestConfig({ campaignId, onComplete }: ABTestConfigProps) {
  const t = useTranslations();
  const {
    currentTest,
    createTest,
    updateTest,
    addVariant,
    updateVariant,
    removeVariant,
    setWinnerCriteria,
    setSampleSize,
    setTestDuration,
    setAutoSelectWinner,
  } = useABTestStore();

  React.useEffect(() => {
    if (!currentTest) {
      createTest(campaignId);
    }
  }, [campaignId, currentTest, createTest]);

  if (!currentTest) return null;

  const testTypes: { value: ABTestType; label: string; description: string }[] = [
    {
      value: 'subject',
      label: t('abTest.types.subject'),
      description: t('abTest.types.subjectDesc'),
    },
    {
      value: 'content',
      label: t('abTest.types.content'),
      description: t('abTest.types.contentDesc'),
    },
    {
      value: 'fromName',
      label: t('abTest.types.fromName'),
      description: t('abTest.types.fromNameDesc'),
    },
    {
      value: 'sendTime',
      label: t('abTest.types.sendTime'),
      description: t('abTest.types.sendTimeDesc'),
    },
  ];

  const winnerCriteria: { value: WinnerCriteria; label: string }[] = [
    { value: 'openRate', label: t('abTest.criteria.openRate') },
    { value: 'clickRate', label: t('abTest.criteria.clickRate') },
    { value: 'conversionRate', label: t('abTest.criteria.conversionRate') },
  ];

  const handleAddVariant = () => {
    const variantLetter = String.fromCharCode(65 + currentTest.variants.length);
    addVariant({ name: `Variant ${variantLetter}` });
  };

  return (
    <div className="space-y-6">
      {/* Test Name */}
      <div className="space-y-2">
        <Label htmlFor="testName">{t('abTest.testName')}</Label>
        <Input
          id="testName"
          value={currentTest.name}
          onChange={(e) => updateTest({ name: e.target.value })}
          placeholder={t('abTest.testNamePlaceholder')}
        />
      </div>

      {/* Test Type Selection */}
      <div className="space-y-3">
        <Label>{t('abTest.testType')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {testTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateTest({ testType: type.value })}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                currentTest.testType === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="font-medium">{type.label}</div>
              <div className="text-sm text-muted-foreground">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            {t('abTest.variants')}
          </CardTitle>
          <CardDescription>{t('abTest.variantsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTest.variants.map((variant, index) => (
            <div
              key={variant.id}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm',
                      index === 0
                        ? 'bg-blue-500 text-white'
                        : index === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-orange-500 text-white'
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <Input
                    value={variant.name}
                    onChange={(e) =>
                      updateVariant(variant.id, { name: e.target.value })
                    }
                    className="h-8 w-40"
                  />
                </div>
                {currentTest.variants.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariant(variant.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Variant Content based on test type */}
              {currentTest.testType === 'subject' && (
                <div className="space-y-2">
                  <Label className="text-xs">{t('abTest.subjectLine')}</Label>
                  <Input
                    value={variant.subject || ''}
                    onChange={(e) =>
                      updateVariant(variant.id, { subject: e.target.value })
                    }
                    placeholder={t('abTest.subjectPlaceholder')}
                  />
                </div>
              )}

              {currentTest.testType === 'fromName' && (
                <div className="space-y-2">
                  <Label className="text-xs">{t('abTest.fromNameLabel')}</Label>
                  <Input
                    value={variant.fromName || ''}
                    onChange={(e) =>
                      updateVariant(variant.id, { fromName: e.target.value })
                    }
                    placeholder={t('abTest.fromNamePlaceholder')}
                  />
                </div>
              )}

              {currentTest.testType === 'content' && (
                <div className="space-y-2">
                  <Label className="text-xs">{t('abTest.contentLabel')}</Label>
                  <textarea
                    value={variant.content || ''}
                    onChange={(e) =>
                      updateVariant(variant.id, { content: e.target.value })
                    }
                    className="min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                    placeholder={t('abTest.contentPlaceholder')}
                  />
                </div>
              )}

              {currentTest.testType === 'sendTime' && (
                <div className="space-y-2">
                  <Label className="text-xs">{t('abTest.sendTimeLabel')}</Label>
                  <Input
                    type="datetime-local"
                    value={
                      variant.sendTime
                        ? new Date(variant.sendTime).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      updateVariant(variant.id, {
                        sendTime: new Date(e.target.value),
                      })
                    }
                  />
                </div>
              )}
            </div>
          ))}

          {currentTest.variants.length < 4 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddVariant}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('abTest.addVariant')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Test Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t('abTest.settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sample Size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label>{t('abTest.sampleSize')}</Label>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="50"
                value={currentTest.sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium">
                {currentTest.sampleSize}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('abTest.sampleSizeHint')}
            </p>
          </div>

          {/* Test Duration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>{t('abTest.testDuration')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="168"
                value={currentTest.testDuration}
                onChange={(e) => setTestDuration(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {t('abTest.hours')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('abTest.testDurationHint')}
            </p>
          </div>

          {/* Winner Criteria */}
          <div className="space-y-2">
            <Label>{t('abTest.winnerCriteria')}</Label>
            <div className="flex flex-wrap gap-2">
              {winnerCriteria.map((criteria) => (
                <Button
                  key={criteria.value}
                  variant={
                    currentTest.winnerCriteria === criteria.value
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => setWinnerCriteria(criteria.value)}
                >
                  {criteria.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Auto Select Winner */}
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('abTest.autoSelectWinner')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('abTest.autoSelectWinnerHint')}
              </p>
            </div>
            <button
              onClick={() => setAutoSelectWinner(!currentTest.autoSelectWinner)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                currentTest.autoSelectWinner ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  currentTest.autoSelectWinner && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
