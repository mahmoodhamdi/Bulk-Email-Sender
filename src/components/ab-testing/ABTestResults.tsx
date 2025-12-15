'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, TrendingUp, Mail, MousePointer, Target, Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useABTestStore, type ABVariant } from '@/stores/ab-test-store';
import { cn } from '@/lib/utils';

interface ABTestResultsProps {
  testId?: string;
  onSelectWinner?: (variantId: string) => void;
}

export function ABTestResults({ testId, onSelectWinner }: ABTestResultsProps) {
  const t = useTranslations();
  const { currentTest, loadTest, selectWinner, calculateWinner, getVariantStats } =
    useABTestStore();

  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (testId && (!currentTest || currentTest.id !== testId)) {
      loadTest(testId);
    }
  }, [testId, currentTest, loadTest]);

  React.useEffect(() => {
    if (!currentTest?.startedAt) {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const startTime = new Date(currentTest.startedAt!).getTime();
      const endTime = startTime + currentTest.testDuration * 60 * 60 * 1000;
      const remaining = endTime - Date.now();

      if (remaining <= 0) {
        setTimeRemaining(t('abTest.testComplete'));
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m ${t('abTest.remaining')}`);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentTest?.startedAt, currentTest?.testDuration, t]);

  if (!currentTest) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t('abTest.noTestSelected')}</p>
        </CardContent>
      </Card>
    );
  }

  const suggestedWinner = calculateWinner();
  const isCompleted = currentTest.status === 'completed';
  const isRunning = currentTest.status === 'running';

  const handleSelectWinner = (variantId: string) => {
    selectWinner(variantId);
    onSelectWinner?.(variantId);
  };

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{currentTest.name}</CardTitle>
              <CardDescription>
                {t(`abTest.types.${currentTest.testType}`)} -{' '}
                {t(`abTest.criteria.${currentTest.winnerCriteria}`)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  getStatusColor(currentTest.status)
                )}
              />
              <span className="text-sm font-medium capitalize">
                {t(`abTest.status.${currentTest.status}`)}
              </span>
            </div>
          </div>
        </CardHeader>
        {isRunning && timeRemaining && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {timeRemaining}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Variant Results */}
      <div className="grid gap-4 md:grid-cols-2">
        {currentTest.variants.map((variant, index) => {
          const stats = getVariantStats(variant.id);
          const isWinner = currentTest.winnerId === variant.id;
          const isSuggestedWinner = suggestedWinner?.id === variant.id;

          return (
            <Card
              key={variant.id}
              className={cn(
                'relative overflow-hidden transition-all',
                isWinner && 'ring-2 ring-yellow-500',
                isSuggestedWinner && !isWinner && 'ring-2 ring-green-500/50'
              )}
            >
              {isWinner && (
                <div className="absolute right-2 top-2">
                  <Crown className="h-6 w-6 text-yellow-500" />
                </div>
              )}
              {isSuggestedWinner && !isWinner && isRunning && (
                <div className="absolute right-2 top-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              )}

              <CardHeader>
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
                  <div>
                    <CardTitle className="text-lg">{variant.name}</CardTitle>
                    {currentTest.testType === 'subject' && variant.subject && (
                      <CardDescription className="truncate max-w-[200px]">
                        {variant.subject}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <Mail className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                    <div className="text-2xl font-bold">{variant.sent}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('abTest.sent')}
                    </div>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-5 w-5 text-blue-500 mb-1" />
                    <div className="text-2xl font-bold">
                      {formatPercentage(stats?.openRate || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('abTest.openRate')}
                    </div>
                  </div>
                  <div className="text-center">
                    <MousePointer className="mx-auto h-5 w-5 text-green-500 mb-1" />
                    <div className="text-2xl font-bold">
                      {formatPercentage(stats?.clickRate || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('abTest.clickRate')}
                    </div>
                  </div>
                  <div className="text-center">
                    <Target className="mx-auto h-5 w-5 text-orange-500 mb-1" />
                    <div className="text-2xl font-bold">
                      {formatPercentage(stats?.conversionRate || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('abTest.conversionRate')}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{t('abTest.performance')}</span>
                    <span>{stats?.openRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-orange-500'
                      )}
                      style={{ width: `${Math.min(100, stats?.openRate || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Select Winner Button */}
                {isRunning && !currentTest.autoSelectWinner && !isWinner && (
                  <Button
                    className="w-full"
                    variant={isSuggestedWinner ? 'default' : 'outline'}
                    onClick={() => handleSelectWinner(variant.id)}
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    {t('abTest.selectAsWinner')}
                  </Button>
                )}

                {isWinner && (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-yellow-500/10 py-2 text-yellow-600">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">{t('abTest.winner')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      {isCompleted && currentTest.winnerId && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {t('abTest.testCompleted')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentTest.variants.find((v) => v.id === currentTest.winnerId)?.name}{' '}
                  {t('abTest.wasSelectedAsWinner')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
