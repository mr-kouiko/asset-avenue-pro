import { Share2, Facebook, Twitter, Linkedin, MessageCircle, Link2, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

type ProductType = 'photo' | 'video' | 'audio' | 'illustration' | 'ebook' | 'pdf' | 'music';

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  hashtags?: string[];
  productType?: ProductType;
  author?: string;
  variant?: "default" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

// Generate optimized content for each product type and platform
const generateShareContent = (
  title: string,
  description: string,
  productType: ProductType,
  author?: string,
  platform?: string
) => {
  const typeLabels: Record<ProductType, string> = {
    photo: '📸 Photo',
    video: '🎬 Vidéo',
    audio: '🎵 Audio',
    music: '🎶 Musique',
    illustration: '🎨 Illustration',
    ebook: '📚 E-book',
    pdf: '📄 PDF',
  };

  const typeEmojis: Record<ProductType, string> = {
    photo: '📸',
    video: '🎬',
    audio: '🎵',
    music: '🎶',
    illustration: '🎨',
    ebook: '📚',
    pdf: '📄',
  };

  const emoji = typeEmojis[productType];
  const label = typeLabels[productType];
  
  // Truncate description for social media
  const shortDesc = description.length > 120 
    ? description.substring(0, 117) + '...' 
    : description;

  // Platform-specific optimizations
  if (platform === 'twitter') {
    // Twitter: concise, impactful
    const authorText = author ? ` par ${author}` : '';
    return `${emoji} ${title}${authorText} | ${shortDesc}`;
  }
  
  if (platform === 'linkedin') {
    // LinkedIn: professional tone
    const authorText = author ? `\n👤 Créé par: ${author}` : '';
    return `${label}: ${title}\n\n${description}${authorText}\n\n✨ Découvrez ce contenu professionnel sur VisuStock`;
  }
  
  if (platform === 'whatsapp') {
    // WhatsApp: friendly and direct
    const authorText = author ? ` de ${author}` : '';
    return `${emoji} *${title}*${authorText}\n\n${shortDesc}\n\n👉 Voir plus:`;
  }
  
  // Facebook and default: balanced approach
  const authorText = author ? `\nPar ${author}` : '';
  return `${emoji} ${title}${authorText}\n\n${shortDesc}`;
};

// Generate automatic hashtags based on product type and content
const generateHashtags = (productType: ProductType, customTags?: string[]): string[] => {
  const baseHashtags: Record<ProductType, string[]> = {
    photo: ['Photography', 'Photo', 'StockPhoto', 'VisuStock'],
    video: ['Video', 'VideoContent', 'StockVideo', 'VisuStock'],
    audio: ['Audio', 'Sound', 'AudioContent', 'VisuStock'],
    music: ['Music', 'Musique', 'AudioTrack', 'VisuStock'],
    illustration: ['Illustration', 'DigitalArt', 'GraphicDesign', 'VisuStock'],
    ebook: ['Ebook', 'DigitalBook', 'Reading', 'VisuStock'],
    pdf: ['PDF', 'Document', 'DigitalContent', 'VisuStock'],
  };

  const productHashtags = baseHashtags[productType] || ['VisuStock'];
  
  // Combine with custom tags (limit to 5 total for optimal engagement)
  const allHashtags = [...productHashtags];
  if (customTags && customTags.length > 0) {
    // Add first 2 custom tags
    allHashtags.push(...customTags.slice(0, 2).map(tag => 
      tag.replace(/[^a-zA-Z0-9]/g, '')
    ));
  }
  
  return allHashtags.slice(0, 5);
}

export const SocialShare = ({
  url,
  title,
  description = "",
  image,
  hashtags = [],
  productType = 'photo',
  author,
  variant = "secondary",
  size = "sm",
  className = "",
}: SocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Generate optimized hashtags
  const optimizedHashtags = generateHashtags(productType, hashtags);
  const shareHashtags = optimizedHashtags.join(',');

  // Generate platform-specific content
  const twitterContent = generateShareContent(title, description, productType, author, 'twitter');
  const linkedinContent = generateShareContent(title, description, productType, author, 'linkedin');
  const whatsappContent = generateShareContent(title, description, productType, author, 'whatsapp');
  const defaultContent = generateShareContent(title, description, productType, author);

  // Build tracked URL with UTM parameters per platform
  const getTrackedUrl = (platform?: string) => {
    try {
      const u = new URL(url);
      u.searchParams.set('utm_source', platform || 'share');
      u.searchParams.set('utm_medium', 'social');
      u.searchParams.set('utm_campaign', 'product_share');
      u.searchParams.set('utm_content', productType);
      return u.toString();
    } catch {
      return url;
    }
  };

  const socialLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getTrackedUrl('facebook'))}&quote=${encodeURIComponent(defaultContent)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(getTrackedUrl('twitter'))}&text=${encodeURIComponent(twitterContent)}${shareHashtags ? `&hashtags=${shareHashtags}` : ''}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getTrackedUrl('linkedin'))}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(whatsappContent)}%20${encodeURIComponent(getTrackedUrl('whatsapp'))}`,
    pinterest: image 
      ? `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(getTrackedUrl('pinterest'))}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(defaultContent)}`
      : undefined,
  };

  const handleShare = (platform: string) => {
    const link = socialLinks[platform as keyof typeof socialLinks];
    if (link) {
      window.open(link, '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getTrackedUrl('copy_link'));
      setCopied(true);
      toast.success("Lien copié dans le presse-papiers!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Impossible de copier le lien");
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  const handleNativeShare = async () => {
    if (!canShare) return;
    try {
      await (navigator as any).share({
        title,
        text: description,
        url: getTrackedUrl('native_share'),
      });
    } catch {
      // Ignored: user cancelled or share failed
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size}
            className={className}
          >
            <Share2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Partager</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">Partager ce {productType}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{title}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Preview Button */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault();
                  setShowPreview(true);
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                <span>Aperçu du partage</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Aperçu du partage</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Visual Preview */}
                {image && (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={image} 
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Content Preview */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Titre</h4>
                  <p className="text-sm font-medium">{title}</p>
                  
                  <h4 className="font-semibold text-sm text-muted-foreground mt-3">Description</h4>
                  <p className="text-sm text-muted-foreground">{description || 'Aucune description'}</p>
                  
                  <h4 className="font-semibold text-sm text-muted-foreground mt-3">Hashtags</h4>
                  <div className="flex flex-wrap gap-2">
                    {optimizedHashtags.map((tag, index) => (
                      <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <h4 className="font-semibold text-sm text-muted-foreground mt-3">URL</h4>
                  <p className="text-xs text-muted-foreground break-all">{url}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenuSeparator />

          {/* Native Share (Mobile) */}
            {canShare && (
              <>
                <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>Partager...</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

          {/* Facebook */}
          <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer">
            <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />
            <span>Facebook</span>
          </DropdownMenuItem>

          {/* Twitter */}
          <DropdownMenuItem onClick={() => handleShare('twitter')} className="cursor-pointer">
            <Twitter className="mr-2 h-4 w-4 text-[#1DA1F2]" />
            <span>Twitter</span>
          </DropdownMenuItem>

          {/* LinkedIn */}
          <DropdownMenuItem onClick={() => handleShare('linkedin')} className="cursor-pointer">
            <Linkedin className="mr-2 h-4 w-4 text-[#0A66C2]" />
            <span>LinkedIn</span>
          </DropdownMenuItem>

          {/* WhatsApp */}
          <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="cursor-pointer">
            <MessageCircle className="mr-2 h-4 w-4 text-[#25D366]" />
            <span>WhatsApp</span>
          </DropdownMenuItem>

          {/* Pinterest (only if image exists) */}
          {image && socialLinks.pinterest && (
            <DropdownMenuItem onClick={() => handleShare('pinterest')} className="cursor-pointer">
              <svg className="mr-2 h-4 w-4 text-[#E60023]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
              </svg>
              <span>Pinterest</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Copy Link */}
          <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Lien copié!</span>
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                <span>Copier le lien</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
