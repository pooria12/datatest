import { forwardRef, HTMLAttributes, ReactNode, useState, Children, cloneElement } from 'react';
import { cn } from '@lib/utils';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
}

const sizeStyles = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

const shapeStyles = {
  circle: 'rounded-full',
  square: 'rounded-lg',
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', shape = 'circle', ...props }, ref) => {
    const [imageError, setImageError] = useState(false);
    
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center overflow-hidden bg-muted font-medium',
          'ring-1 ring-border',
          sizeStyles[size],
          shapeStyles[shape],
          className
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || ''}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          fallback || (
            <span className="text-muted-foreground">
              {alt?.charAt(0).toUpperCase() || '?'}
            </span>
          )
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 5, size = 'md', children, ...props }, ref) => {
    const childArray = Children.toArray(children);
    const visibleChildren = childArray.slice(0, max);
    const remainingCount = childArray.length - max;
    
    return (
      <div ref={ref} className={cn('flex -space-x-2', className)} {...props}>
        {visibleChildren.map((child, index) => (
          <span key={index} className="relative z-10">
            {cloneElement(child as React.ReactElement<{ size?: string }>, { size })}
          </span>
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              'inline-flex items-center justify-center bg-muted font-medium ring-1 ring-border',
              sizeStyles[size],
              shapeStyles.circle
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = 'AvatarGroup';