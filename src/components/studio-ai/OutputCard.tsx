import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { OutputAspect } from './OutputGrid';

interface OutputCardProps {
  aspect?: OutputAspect;
  className?: string;
  children: ReactNode;
}

const aspectClass: Record<OutputAspect, string> = {
  video: 'aspect-video',
  square: 'aspect-square',
  audio: 'min-h-[120px]',
};

export function OutputCard({ aspect = 'video', className, children }: OutputCardProps) {
  return (
    <div className={cn('sai-surface overflow-hidden w-full', aspectClass[aspect], className)}>
      {children}
    </div>
  );
}
