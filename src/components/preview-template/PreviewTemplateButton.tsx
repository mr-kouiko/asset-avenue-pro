import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutTemplate } from 'lucide-react';
import { PreviewTemplateModal } from './PreviewTemplateModal';
import { cn } from '@/lib/utils';

interface Props {
  assetUrl: string;
  assetType: 'image' | 'video';
  title?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  label?: string;
}

export function PreviewTemplateButton({
  assetUrl,
  assetType,
  title,
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Preview in Template',
}: Props) {
  const [open, setOpen] = useState(false);
  if (!assetUrl) return null;
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn('gap-2', className)}
      >
        <LayoutTemplate className="h-4 w-4" />
        {label}
      </Button>
      <PreviewTemplateModal
        open={open}
        onOpenChange={setOpen}
        assetUrl={assetUrl}
        assetType={assetType}
        title={title}
      />
    </>
  );
}
