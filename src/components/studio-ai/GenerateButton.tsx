import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * Primary CTA — the gradient button. Only one per Studio AI page.
 * Secondary actions must use the ghost/outline styling (see .sai-ghost).
 */
export const GenerateButton = forwardRef<HTMLButtonElement, GenerateButtonProps>(
  ({ loading, icon, disabled, className, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'sai-cta inline-flex items-center justify-center gap-2 text-sm',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  ),
);
GenerateButton.displayName = 'GenerateButton';
