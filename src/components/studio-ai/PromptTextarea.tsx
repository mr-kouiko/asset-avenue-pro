import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const PromptTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className, rows = 4, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'sai-textarea w-full resize-y px-4 py-3 text-sm leading-relaxed',
        className,
      )}
      {...rest}
    />
  ),
);
PromptTextarea.displayName = 'PromptTextarea';
