import type { PexelsItem } from "@/hooks/usePexelsSearch";

interface Props {
  item: PexelsItem;
  isVideo: boolean;
  slug: string;
}

export const PexelsSchemaOrg = ({ item, isVideo, slug }: Props) => {
  const pageUrl = `https://visustock.com/pexels/${slug}`;

  const schema = isVideo
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: item.alt || item.title,
        description: `Free stock video by ${item.photographer} from Pexels. Available on VisuStock.`,
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
      }
    : {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        name: item.alt || item.title,
        description: `Free stock photo by ${item.photographer} from Pexels. Available on VisuStock.`,
        contentUrl: item.largeThumbnail || item.originalUrl,
        thumbnailUrl: item.thumbnail,
        width: item.width,
        height: item.height,
        author: { "@type": "Person", name: item.photographer, url: item.photographerUrl },
        publisher: { "@type": "Organization", name: "VisuStock", url: "https://visustock.com" },
        url: pageUrl,
        license: "https://www.pexels.com/license/",
      };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
