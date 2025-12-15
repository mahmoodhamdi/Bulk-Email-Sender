'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Simple Line Chart Component
interface LineChartData {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartData[];
  title?: string;
  description?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  className?: string;
}

export function SimpleLineChart({
  data,
  title,
  description,
  color = '#3b82f6',
  height = 200,
  showGrid = true,
  className,
}: LineChartProps) {
  const { path, area, points, maxValue, minValue } = useMemo(() => {
    if (data.length === 0) return { path: '', area: '', points: [], maxValue: 0, minValue: 0 };

    const values = data.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const width = 100;
    const chartHeight = 100;
    const padding = 5;

    const pts = data.map((d, i) => ({
      x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
      y: padding + ((max - d.value) / range) * (chartHeight - padding * 2),
      value: d.value,
      label: d.label,
    }));

    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const areaD = `${pathD} L ${pts[pts.length - 1].x} ${chartHeight} L ${pts[0].x} ${chartHeight} Z`;

    return { path: pathD, area: areaD, points: pts, maxValue: max, minValue: min };
  }, [data]);

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-base">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="pt-0">
        <div className="relative" style={{ height }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Grid lines */}
            {showGrid && (
              <g className="text-muted" stroke="currentColor" strokeWidth="0.2" opacity="0.3">
                <line x1="5" y1="25" x2="95" y2="25" />
                <line x1="5" y1="50" x2="95" y2="50" />
                <line x1="5" y1="75" x2="95" y2="75" />
              </g>
            )}

            {/* Area fill */}
            <path d={area} fill={color} opacity="0.1" />

            {/* Line */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="1.5"
                fill={color}
                className="hover:r-3 transition-all"
              />
            ))}
          </svg>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground py-1">
            <span>{Math.round(maxValue)}</span>
            <span>{Math.round((maxValue + minValue) / 2)}</span>
            <span>{Math.round(minValue)}</span>
          </div>
        </div>

        {/* X-axis labels */}
        {data.length > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground mt-2 px-6">
            <span>{data[0].label}</span>
            {data.length > 2 && <span>{data[Math.floor(data.length / 2)].label}</span>}
            <span>{data[data.length - 1].label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple Bar Chart Component
interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  description?: string;
  color?: string;
  height?: number;
  horizontal?: boolean;
  className?: string;
}

export function SimpleBarChart({
  data,
  title,
  description,
  color = '#3b82f6',
  height = 200,
  horizontal = false,
  className,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-base">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="pt-0">
        {horizontal ? (
          <div className="space-y-3" style={{ minHeight: height }}>
            {data.map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[60%]">{item.label}</span>
                  <span className="font-medium">{item.value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: item.color || color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-end gap-2 justify-between" style={{ height }}>
            {data.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || color,
                    minHeight: 4,
                  }}
                />
                <span className="text-xs text-muted-foreground truncate w-full text-center">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple Donut Chart Component
interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  title?: string;
  description?: string;
  size?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}

export function SimpleDonutChart({
  data,
  title,
  description,
  size = 180,
  centerLabel,
  centerValue,
  className,
}: DonutChartProps) {
  const { segments, total } = useMemo(() => {
    const tot = data.reduce((sum, d) => sum + d.value, 0);

    const segs = data.reduce<Array<{
      label: string;
      value: number;
      color: string;
      percentage: number;
      startAngle: number;
      endAngle: number;
    }>>((acc, item, index) => {
      const percentage = tot > 0 ? (item.value / tot) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = index === 0 ? -90 : acc[index - 1].endAngle;
      const endAngle = startAngle + angle;

      acc.push({
        ...item,
        percentage,
        startAngle,
        endAngle,
      });

      return acc;
    }, []);

    return { segments: segs, total: tot };
  }, [data]);

  const createArcPath = (startAngle: number, endAngle: number, radius: number, innerRadius: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);

    const x3 = 50 + innerRadius * Math.cos(endRad);
    const y3 = 50 + innerRadius * Math.sin(endRad);
    const x4 = 50 + innerRadius * Math.cos(startRad);
    const y4 = 50 + innerRadius * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-base">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="pt-0">
        <div className="flex items-center gap-6">
          {/* Chart */}
          <div className="relative" style={{ width: size, height: size }}>
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {segments.map((seg, i) => (
                <path
                  key={i}
                  d={createArcPath(seg.startAngle + 90, seg.endAngle + 90, 45, 30)}
                  fill={seg.color}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </svg>
            {(centerLabel || centerValue) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {centerValue && <span className="text-2xl font-bold">{centerValue}</span>}
                {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                <span className="text-sm flex-1 truncate">{seg.label}</span>
                <span className="text-sm font-medium">{seg.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Progress Bar Component
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color = '#3b82f6',
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && <span className="font-medium">{value.toLocaleString()}</span>}
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// Sparkline Component (mini chart for tables)
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = '#3b82f6',
  width = 80,
  height = 24,
  className,
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length === 0) return '';

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, i) => ({
      x: (i / (data.length - 1 || 1)) * 100,
      y: 100 - ((value - min) / range) * 100,
    }));

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [data]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      width={width}
      height={height}
      className={className}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default { SimpleLineChart, SimpleBarChart, SimpleDonutChart, ProgressBar, Sparkline };
