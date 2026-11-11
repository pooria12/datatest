import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@lib/utils';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'narrow';
}

const PageContainer = forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'max-w-7xl',
      narrow: 'max-w-3xl',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto w-full px-4 sm:px-6 lg:px-8 py-6',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PageContainer.displayName = 'PageContainer';

export { PageContainer };