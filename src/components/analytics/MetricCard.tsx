'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  inverseColors?: boolean;
  className?: string;
  format?: 'number' | 'percentage';
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  inverseColors = false,
  className,
  format = 'number',
}: MetricCardProps) {
  const getChangeInfo = () => {
    if (change === undefined) return null;

    const isPositive = change > 0;
    const isNegative = change < 0;
    const absChange = Math.abs(change);

    let colorClass = 'text-muted-foreground';
    let Icon = Minus;

    if (isPositive) {
      colorClass = inverseColors ? 'text-red-500' : 'text-green-500';
      Icon = TrendingUp;
    } else if (isNegative) {
      colorClass = inverseColors ? 'text-green-500' : 'text-red-500';
      Icon = TrendingDown;
    }

    return {
      colorClass,
      Icon,
      text: `${isPositive ? '+' : isNegative ? '-' : ''}${absChange.toFixed(1)}%`,
    };
  };

  const changeInfo = getChangeInfo();

  const displayValue =
    format === 'percentage' && typeof value === 'number' ? `${value.toFixed(1)}%` : value;

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{displayValue}</p>
            {changeInfo && (
              <div className={cn('flex items-center gap-1 text-sm', changeInfo.colorClass)}>
                <changeInfo.Icon className="h-4 w-4" />
                <span>{changeInfo.text}</span>
                {changeLabel && (
                  <span className="text-muted-foreground ml-1">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Smaller variant for compact displays
export function MetricCardCompact({
  title,
  value,
  change,
  icon,
  inverseColors = false,
  className,
}: Omit<MetricCardProps, 'changeLabel' | 'format'>) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  let changeColor = 'text-muted-foreground';
  if (isPositive) changeColor = inverseColors ? 'text-red-500' : 'text-green-500';
  if (isNegative) changeColor = inverseColors ? 'text-green-500' : 'text-red-500';

  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-3', className)}>
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{title}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
      {change !== undefined && (
        <div className={cn('text-sm font-medium', changeColor)}>
          {change > 0 ? '+' : ''}
          {change.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export default MetricCard;
