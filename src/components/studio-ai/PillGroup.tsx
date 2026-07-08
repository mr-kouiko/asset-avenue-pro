import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PillGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function PillGroup({ label, children, className }: PillGroupProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="sai-pill-label">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
