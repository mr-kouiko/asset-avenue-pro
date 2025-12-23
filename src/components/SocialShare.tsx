import { Share2, Facebook, Twitter, Linkedin, MessageCircle, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  hashtags?: string[];
  variant?: "default" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const SocialShare = ({
  url,
  title,
  description = "",
  image,
  hashtags = [],
  variant = "secondary",
  size = "sm",
  className = "",
}: SocialShareProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);
  
  // Limit hashtags to 5 max for optimal reach
  const limitedHashtags = hashtags.slice(0, 5);
  const hashtagsForTwitter = limitedHashtags.join(',');
  const hashtagsForText = limitedHashtags.length > 0 
    ? ' ' + limitedHashtags.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ') 
    : '';
  
  // Build full share text with description, URL and hashtags
  const fullShareText = `${title}${description ? ` - ${description}` : ''}`;
  const shareTextWithHashtags = encodeURIComponent(`${fullShareText}${hashtagsForText}`);
  const shareTextWithUrl = encodeURIComponent(`${fullShareText}${hashtagsForText}\n\n${url}`);

  const socialLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTextWithHashtags}`,
    twitter: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${encodeURIComponent(fullShareText)}${hashtagsForTwitter ? `&hashtags=${hashtagsForTwitter}` : ''}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    whatsapp: `https://wa.me/?text=${shareTextWithUrl}`,
    pinterest: image 
      ? `https://pinterest.com/pin/create/button/?url=${shareUrl}&media=${encodeURIComponent(image)}&description=${shareTextWithHashtags}`
      : undefined,
  };

  const handleShare = (platform: string) => {
    const link = socialLinks[platform as keyof typeof socialLinks];
    if (link) {
      window.open(link, '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = async () => {
    // Guard: prevent SSR access to navigator
    if (typeof window === 'undefined' || !navigator?.clipboard) {
      toast.error("Fonction de copie non disponible");
      return;
    }
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié dans le presse-papiers!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleNativeShare = async () => {
    // Guard: prevent SSR access to navigator
    if (typeof window === 'undefined' || !navigator?.share) {
      return;
    }
    
    try {
      await navigator.share({
        title,
        text: description,
        url,
      });
    } catch (error) {
      // User cancelled or share failed
      console.log('Share cancelled');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={className}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Native Share (Mobile) */}
        {typeof window !== 'undefined' && navigator?.share && (
          <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
            <Share2 className="mr-2 h-4 w-4" />
            <span>Partager...</span>
          </DropdownMenuItem>
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

        {/* Copy Link */}
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-600" />
              <span className="text-green-600">Copié!</span>
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
  );
};
