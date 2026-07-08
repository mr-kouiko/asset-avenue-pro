import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  className?: string;
  children: ReactNode;
}

/** Glassmorphism card that hosts the prompt + filter pills + generate button. */
export function ControlPanel({ className, children }: ControlPanelProps) {
  return (
    <div className={cn('sai-panel', className)}>
      {children}
    </div>
  );
}
