import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { OutputAspect } from './OutputGrid';

interface EmptyStateCardProps {
  icon?: ReactNode;
  message: string;
  aspect?: OutputAspect;
  className?: string;
}

const aspectClass: Record<OutputAspect, string> = {
  video: 'aspect-video',
  square: 'aspect-square',
  audio: 'min-h-[120px]',
};

export function EmptyStateCard({ icon, message, aspect = 'video', className }: EmptyStateCardProps) {
  return (
    <div className={cn('sai-empty w-full', aspectClass[aspect], className)}>
      {icon && <div className="opacity-70">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}
