import type { PexelsItem } from "@/hooks/usePexelsSearch";
import type { PexelsSEOContent } from "@/hooks/usePexelsSEOContent";

interface Props {
  item: PexelsItem;
  isVideo: boolean;
  slug: string;
  productStyle?: boolean;
  seoContent?: PexelsSEOContent | null;
}

export const PexelsSchemaOrg = ({ item, isVideo, slug, productStyle, seoContent }: Props) => {
  const pageUrl = productStyle
    ? `https://visustock.com/products/${slug}`
    : `https://visustock.com/pexels/${slug}`;

  const description = seoContent?.meta_description
    || `Free ${isVideo ? 'stock video' : 'stock photo'} by ${item.photographer}. Available on VisuStock.`;

  const name = seoContent?.h1 || item.alt || item.title;

  const schema = isVideo
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name,
        description,
        thumbnailUrl: item.thumbnail,
        contentUrl: item.videoUrl,
        uploadDate: new Date().toISOString(),
        duration: item.duration ? `PT${Math.floor(item.duration / 60)}M${item.duration % 60}S` : undefined,
        width: item.width,
        height: item.height,
        author: { "@type": "Person", name: item.photographer, url: item.photographerUrl },
        publisher: { "@type": "Organization", name: "VisuStock", url: "https://visustock.com" },
        url: pageUrl,
        license: "https://www.pexels.com/license/",
        ...(seoContent?.keywords?.length ? { keywords: seoContent.keywords.join(", ") } : {}),
      }
    : {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        name,
        description,
        contentUrl: item.largeThumbnail || item.originalUrl,
        thumbnailUrl: item.thumbnail,
        width: item.width,
        height: item.height,
        author: { "@type": "Person", name: item.photographer, url: item.photographerUrl },
        publisher: { "@type": "Organization", name: "VisuStock", url: "https://visustock.com" },
        url: pageUrl,
        license: "https://www.pexels.com/license/",
        ...(seoContent?.keywords?.length ? { keywords: seoContent.keywords.join(", ") } : {}),
      };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
