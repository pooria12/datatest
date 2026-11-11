import { useState, useRef, useEffect, useCallback, useId, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@lib/utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({ content, children, side = 'top', delay = 200, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const show = () => {
    timeoutRef.current = window.setTimeout(() => setOpen(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  const positionTooltip = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    
    let top = 0, left = 0;
    
    switch (side) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }
    
    // Keep within viewport
    const padding = 8;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
    
    tooltipRef.current.style.top = `${top}px`;
    tooltipRef.current.style.left = `${left}px`;
  }, [side]);

  useEffect(() => {
    if (open) {
      positionTooltip();
      window.addEventListener('scroll', positionTooltip, { passive: true });
      window.addEventListener('resize', positionTooltip);
    }
    return () => {
      window.removeEventListener('scroll', positionTooltip);
      window.removeEventListener('resize', positionTooltip);
    };
  }, [open, positionTooltip, side]);

  const triggerProps = {
    ref: triggerRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    'aria-describedby': open ? tooltipId : undefined,
  };

  const tooltip = open ? (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className={cn(
        'fixed z-[var(--z-tooltip)] px-3 py-1.5 text-xs font-medium text-popover-foreground',
        'bg-popover border border-border rounded shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        'whitespace-nowrap pointer-events-none',
        className
      )}
      style={{ position: 'fixed' }}
    >
      {content}
    </div>
  ) : null;

  return (
    <>
      <span {...triggerProps}>{children}</span>
      {typeof window !== 'undefined' && createPortal(tooltip, document.body)}
    </>
  );
}