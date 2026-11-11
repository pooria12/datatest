import { Brain } from 'lucide-react';
import { cn } from '@lib/utils';

interface LogoProps {
  className?: string;
  textClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const boxSizes = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 22,
};

const textSizes = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
};

export function Logo({ className, textClassName, size = 'md', showText = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex shrink-0 items-center justify-center rounded-lg bg-accent', boxSizes[size])}>
        <Brain className="text-white" size={iconSizes[size]} aria-hidden="true" />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight text-foreground', textSizes[size], textClassName)}>
          DataMind AI
        </span>
      )}
    </div>
  );
}
