import { ReactNode } from 'react';
import { cn } from '@lib/utils';
import { Card, CardContent } from '@components/ui/Card';
import { Progress } from '@components/ui/Progress';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  icon?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  progress?: {
    value: number;
    max?: number;
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  progress,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {trend && (
                <span className={cn('text-sm font-medium', trend.positive ? 'text-success' : 'text-destructive')}>
                  {trend.positive ? '+' : ''}{trend.value}{trend.label}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            )}
            {progress && (
              <div className="mt-3">
                <Progress value={progress.value} max={progress.max} variant={progress.variant} size="sm" />
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconBg)}>
              <span className={cn(iconColor)}>{icon}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}