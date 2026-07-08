import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type OutputAspect = 'video' | 'square' | 'audio';

interface OutputGridProps {
  aspect?: OutputAspect;
  columns?: 1 | 2 | 3;
  className?: string;
  children: ReactNode;
}

const columnClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

export function OutputGrid({
  aspect = 'video',
  columns = 1,
  className,
  children,
}: OutputGridProps) {
  return (
    <div
      data-aspect={aspect}
      className={cn('grid gap-4', columnClass[columns], className)}
    >
      {children}
    </div>
  );
}
