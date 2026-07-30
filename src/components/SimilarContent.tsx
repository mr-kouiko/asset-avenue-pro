import { useSimilarAssets, SimilarAsset } from '@/hooks/useSimilarAssets';
import { ContentCard } from '@/components/ContentCard';

type Variant = 'strip' | 'cards';

interface Props {
  submissionId?: string;
  enabled?: boolean;
  variant?: Variant;
  /** Only used by the compact strip variant (Quick View). */
  onSelect?: (asset: SimilarAsset) => void;
  className?: string;
  showHeading?: boolean;
}

const typeOf = (fileType?: string | null): 'photo' | 'video' | 'audio' => {
  const t = (fileType || '').toLowerCase();
  if (t.startsWith('video')) return 'video';
  if (t.startsWith('audio')) return 'audio';
  return 'photo';
};

export const SimilarContent = ({
  submissionId,
  enabled = true,
  variant = 'cards',
  onSelect,
  className = '',
  showHeading = true,
}: Props) => {
  const { similar, loading } = useSimilarAssets(submissionId, enabled);

  if (!loading && similar.length === 0) return null;

  if (variant === 'strip') {
    return (
      <div className={className}>
        {showHeading && (
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Similar Content
          </h3>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="shrink-0 w-20 h-20 rounded bg-muted animate-pulse" />
              ))
            : similar.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect?.(s)}
                  className="shrink-0 w-20 h-20 rounded overflow-hidden border-2 border-transparent hover:border-border"
                  aria-label={s.title || 'Similar asset'}
                >
                  <img
                    src={s.thumbnail_path || '/placeholder.svg'}
                    alt={s.title || 'Similar asset'}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
        </div>
      </div>
    );
  }

  return (
    <section className={className}>
      {showHeading && <h3 className="text-xl font-semibold mb-6">Similar content</h3>}
      <div className="flex gap-6 overflow-x-auto pb-4 -mx-1 px-1 snap-x">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[280px] h-[300px] rounded-lg bg-muted animate-pulse"
              />
            ))
          : similar.map((s) => (
              <div key={s.id} className="shrink-0 w-[280px] snap-start">
                <ContentCard
                  id={s.id}
                  slug={s.slug || undefined}
                  title={s.title || 'Untitled'}
                  author=""
                  price={s.price ?? 0}
                  type={typeOf(s.file_type)}
                  thumbnail={s.thumbnail_path || '/placeholder.svg'}
                  likes={0}
                  downloads={0}
                />
              </div>
            ))}
      </div>
    </section>
  );
};
