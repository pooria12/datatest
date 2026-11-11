import { forwardRef, HTMLAttributes, useRef, useEffect } from 'react';
import { cn } from '@lib/utils';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      const element = scrollRef.current;
      if (!element) return;
      
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          // Allow vertical scrolling
          return;
        }
        if (e.deltaX !== 0 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          // Allow horizontal scrolling
          element.scrollLeft += e.deltaX;
          e.preventDefault();
        }
      };
      
      element.addEventListener('wheel', handleWheel, { passive: false });
      return () => element.removeEventListener('wheel', handleWheel);
    }, []);
    
    return (
      <div
        ref={ref}
        className={cn('relative overflow-auto scrollbar-thin', className)}
        {...props}
      >
        <div ref={scrollRef} className="min-w-fit">
          {children}
        </div>
      </div>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

// ScrollBar component for custom styling (optional)
export interface ScrollBarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex touch-none select-none transition-opacity',
        orientation === 'vertical' ? 'w-2' : 'h-2',
        className
      )}
      {...props}
    />
  )
);
ScrollBar.displayName = 'ScrollBar';