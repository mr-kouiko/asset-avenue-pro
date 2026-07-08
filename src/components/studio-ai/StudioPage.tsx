import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';

export type StudioCategory = 'video' | 'image' | 'audio';

interface StudioPageProps {
  category: StudioCategory;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Skip rendering Header/Footer if the page already renders its own. */
  chromeless?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * StudioPage — outer wrapper for every Studio AI tool page.
 * Applies the obsidian-navy background, the category-specific aurora,
 * and (optionally) the shared Header/Footer.
 *
 * Business logic, hooks, and generation flows remain owned by each page.
 */
export function StudioPage({
  category,
  title,
  subtitle,
  icon,
  chromeless = false,
  className,
  children,
}: StudioPageProps) {
  return (
    <div
      className={cn(
        'studio-ai min-h-screen flex flex-col',
        `studio-ai--${category}`,
        className,
      )}
    >
      {!chromeless && <Header />}
      <main className="flex-1">
        {(title || subtitle || icon) && (
          <section className="container mx-auto max-w-6xl px-4 pt-10 pb-6">
            <div className="flex items-center gap-4">
              {icon && (
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(109,94,245,0.18), rgba(0,217,255,0.12))',
                    border: '1px solid var(--sai-border-hairline)',
                    color: '#fff',
                  }}
                >
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h1 className="sai-heading text-3xl md:text-4xl font-semibold text-[color:var(--sai-text-primary)]">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm md:text-base text-[color:var(--sai-text-secondary)]">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
        {children}
      </main>
      {!chromeless && <Footer />}
    </div>
  );
}
