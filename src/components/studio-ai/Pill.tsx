import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const Pill = forwardRef<HTMLButtonElement, PillProps>(
  ({ active, className, type = 'button', children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      data-active={active ? 'true' : 'false'}
      className={cn('sai-pill', className)}
      {...rest}
    >
      {children}
    </button>
  ),
);
Pill.displayName = 'Pill';
