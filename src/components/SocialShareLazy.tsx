import { lazy, Suspense, Component, ReactNode } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SocialShare = lazy(() => 
  import('./SocialShare').then(module => ({ default: module.SocialShare }))
);

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SocialShareErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('SocialShare Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface SocialShareLazyProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  hashtags?: string[];
  variant?: "default" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  productSlug?: string;
}

export const SocialShareLazy = (props: SocialShareLazyProps) => {
  const fallbackButton = (
    <Button 
      variant={props.variant || "secondary"} 
      size={props.size || "sm"}
      className={props.className}
      disabled
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );

  return (
    <SocialShareErrorBoundary fallback={fallbackButton}>
      <Suspense fallback={fallbackButton}>
        <SocialShare {...props} />
      </Suspense>
    </SocialShareErrorBoundary>
  );
};
