import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  Download, 
  ShoppingCart, 
  Share2, 
  Shield, 
  User,
  Calendar,
  Eye,
  Star,
  Loader2,
  FileVideo,
  Music
} from "lucide-react";
import { useProductDetail } from "@/hooks/useProductDetail";
import { MediaPlayer } from "@/components/media/MediaPlayer";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useWatermarkedPreview } from "@/hooks/useWatermarkedPreview";
import { useVideoPricing } from "@/hooks/useVideoPricing";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useCart } from "@/hooks/useCart";
import mockPhoto1 from "@/assets/mock-photo1.jpg";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { product, loading: productLoading, error } = useProductDetail(id || '');
  const { content: marketplaceContent } = useMarketplace();
  const [isLiked, setIsLiked] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState("standard");
  
  // Hooks for cart and direct purchase
  const { addToCart } = useCart();
  const { createDirectPayment, loading: directPurchaseLoading } = useDirectPurchase();

  // Create watermarked preview for images
  const { watermarkedUrl, isProcessing } = useWatermarkedPreview({
    imageUrl: (product?.type === 'photo' || product?.type === 'illustration') ? product?.thumbnail : undefined,
    enabled: product?.type === 'photo' || product?.type === 'illustration'
  });

  // Use dynamic pricing for videos
  const { resolution, basePrice, licensePrice, totalPrice, isVideo } = useVideoPricing({
    type: product?.type || '',
    files: product?.files || [],
    selectedLicense
  });

  // Protection contre le téléchargement et l'inspection
  useEffect(() => {
    // Empêcher le clic droit
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Empêcher le drag & drop d'images/vidéos
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Empêcher les raccourcis clavier dangereux
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 - DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I - DevTools
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U - Voir le code source
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S - Enregistrer la page
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C - Inspect element
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
    };

    // Ajouter les event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    // Nettoyer à la sortie
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (productLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Chargement du produit...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
          <p className="text-muted-foreground">
            {error || "Le produit que vous recherchez n'existe pas ou n'est plus disponible."}
          </p>
        </div>
      </div>
    );
  }

  // Get file info for display with better error handling
  const originalFile = product.files?.find(f => f.is_original);
  const fileSize = originalFile ? `${(originalFile.file_size / (1024 * 1024)).toFixed(1)} MB` : 'N/A';
  const fileFormat = originalFile?.file_name?.split('.').pop()?.toUpperCase() || product.type?.toUpperCase() || 'N/A';
  
  // For now, dimensions will be extracted from actual metadata when available
  const dimensions = 'À déterminer'; // Will be updated when metadata is properly structured

  const licenses = [
    {
      id: "standard",
      name: "Licence Standard",
      price: 15,
      description: "Usage commercial limité, jusqu'à 500,000 impressions",
      features: [
        "Usage web et print",
        "Réseaux sociaux",
        "Présentations",
        "Usage commercial limité"
      ]
    },
    {
      id: "extended",
      name: "Licence Étendue",
      price: 45,
      description: "Usage commercial illimité, revente autorisée",
      features: [
        "Tous les droits de la licence standard",
        "Usage commercial illimité",
        "Revente de produits dérivés",
        "Usage sur produits à la vente"
      ]
    },
    {
      id: "exclusive",
      name: "Licence Exclusive",
      price: 299,
      description: "Droits exclusifs, image retirée de la vente",
      features: [
        "Tous les droits des licences précédentes",
        "Droits exclusifs",
        "Image retirée de la marketplace",
        "Certificat d'exclusivité"
      ]
    }
  ];

  // Fonction pour calculer et formater le prix
  const getPriceDisplay = (license: { id: string; price: number }) => {
    if (product?.price === null || product?.price === 0) {
      return 'Gratuit';
    }
    
    if (isVideo) {
      // Pour les vidéos, utiliser le nouveau système de tarification
      const currentLicensePrice = license.id === selectedLicense ? licensePrice : license.price;
      const currentTotal = basePrice + currentLicensePrice;
      return `${currentTotal}$`;
    } else {
      // Pour les autres types, utiliser l'ancien système
      return `${license.price}€`;
    }
  };

  // Get related products from marketplace with better filtering
  const relatedProducts = marketplaceContent
    .filter(item => item.id !== product.id)
    .filter(item => {
      // Prioritize same category, then same author
      const sameCategory = item.category_id === product.category?.id;
      const sameAuthor = item.author === product.author;
      return sameCategory || sameAuthor;
    })
    .sort((a, b) => {
      // Sort by category match first, then by author match
      const aCategory = a.category_id === product.category?.id ? 2 : 0;
      const bCategory = b.category_id === product.category?.id ? 2 : 0;
      const aAuthor = a.author === product.author ? 1 : 0;
      const bAuthor = b.author === product.author ? 1 : 0;
      return (bCategory + bAuthor) - (aCategory + aAuthor);
    })
    .slice(0, 6);

  const handleAddToCart = () => {
    try {
      const finalPrice = isVideo ? totalPrice : (
        selectedLicense === 'standard' ? 15 :
        selectedLicense === 'extended' ? 45 : 299
      );
      
      addToCart({
        id: product.id,
        title: product.title,
        author: product.author,
        price: finalPrice,
        type: product.type,
        thumbnail: product.thumbnail,
        licenseId: selectedLicense
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleDirectPurchase = async () => {
    if (!product) return;
    
    const finalPrice = isVideo ? basePrice : product.price || 0;
    
    await createDirectPayment({
      submission_id: product.id,
      title: product.title,
      author: product.author,
      price: finalPrice,
      license_id: selectedLicense,
      type: product.type,
      thumbnail: product.thumbnail
    }, selectedLicense);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="container py-8 select-none">
        <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Video/Image Display */}
        <div className="lg:col-span-2 space-y-6">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stock-gray border border-stock-border shadow-lg">
        {product.type === 'video' ? (
          <div className="w-full h-full bg-black rounded-xl overflow-hidden">
            {product.previewUrl ? (
              <MediaPlayer 
                src={product.previewUrl}
                type="video"
                title={product.title}
                poster={product.thumbnail}
                className="w-full h-full"
                autoPlay={false}
                controls={true}
                muted={false}
                watermarkSize="thumbnail"
              />
            ) : (
              /* Video not available - show loading/waiting message */
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                    <FileVideo className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Vidéo en cours de traitement</h3>
                  <p className="text-white/70 text-sm">
                    La vidéo est actuellement en cours de préparation.<br />
                    Elle sera disponible sous peu.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : product.type === 'audio' ? (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl overflow-hidden">
            {/* Universal Audio Player Container */}
            <div className="w-full h-full flex flex-col justify-center p-6">
              <MediaPlayer 
                src={product.previewUrl || ''}
                type="audio"
                title={product.title}
                className="bg-white/80 backdrop-blur-sm border shadow-lg rounded-lg"
                autoPlay={false}
                controls={true}
                muted={false}
                watermarkSize="normal"
              />
            </div>
          </div>
        ) : (
          <div className="relative">
            <img
              src={watermarkedUrl || product.thumbnail}
              alt={product.title}
              className={`w-full h-full object-cover ${isProcessing ? 'opacity-75' : ''}`}
              draggable="false"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Application du filigrane de protection...</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLiked(!isLiked)}
            className="h-9 w-9 p-0 backdrop-blur-sm bg-white/90 hover:bg-white border border-white/20 shadow-sm"
          >
            <Heart 
              className="h-4 w-4" 
              fill={isLiked ? "hsl(var(--primary))" : "none"}
              color={isLiked ? "hsl(var(--primary))" : "currentColor"}
            />
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-9 w-9 p-0 backdrop-blur-sm bg-white/90 hover:bg-white border border-white/20 shadow-sm"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Audio/Video indicator badge */}
        {product.type === 'video' && (
          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-lg">
            <FileVideo className="h-3 w-3" />
            Vidéo {resolution || 'HD'}
          </div>
        )}
        
      </div>

            {/* Technical Details - Adobe Stock Style */}
            <div className="bg-stock-gray/50 rounded-lg p-4 border border-stock-border/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-stock-dark/60 text-xs font-medium mb-1">DIMENSIONS</div>
                  <div className="font-medium text-stock-dark">{dimensions}</div>
                </div>
                <div>
                  <div className="text-stock-dark/60 text-xs font-medium mb-1">FORMAT</div>
                  <div className="font-medium text-stock-dark">{fileFormat}</div>
                </div>
                <div>
                  <div className="text-stock-dark/60 text-xs font-medium mb-1">TAILLE</div>
                  <div className="font-medium text-stock-dark">{fileSize}</div>
                </div>
                <div>
                  <div className="text-stock-dark/60 text-xs font-medium mb-1">TYPE</div>
                  <Badge variant="secondary" className="capitalize bg-stock-blue/10 text-stock-blue border-stock-blue/20">
                    {product.type}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Metadata & Purchase - Adobe Stock Style */}
          <div className="space-y-6">
            {/* Title and Author */}
            <div className="pb-4 border-b border-stock-border">
              <h1 className="text-2xl font-bold mb-3 text-stock-dark leading-tight">{product.title}</h1>
              
              {/* Author Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-stock-blue/10 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-stock-blue" />
                  </div>
                  <div>
                    <div className="font-medium text-stock-dark">{product.author}</div>
                    <div className="text-xs text-stock-dark/60">Créateur</div>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 text-sm text-stock-dark/60">
                <div className="flex items-center gap-1.5">
                  <Heart className="h-4 w-4" />
                  <span className="font-medium">{product.likes}</span>
                  <span className="text-xs">j'aime</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  <span className="font-medium">{product.downloads}</span>
                  <span className="text-xs">téléchargements</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">{product.views}</span>
                  <span className="text-xs">vues</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Tags - Adobe Stock Style */}
            <div>
              <h3 className="font-medium mb-3 text-stock-dark text-sm">MOTS-CLÉS</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="cursor-pointer text-xs px-2 py-1 border-stock-border bg-stock-gray/50 text-stock-dark/70 hover:border-stock-blue hover:bg-stock-blue/5 hover:text-stock-blue transition-colors"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* License Selection */}
            <div>
              <h3 className="font-semibold mb-4">Choisir une licence</h3>
              {isVideo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <FileVideo className="h-4 w-4" />
                    <span className="font-medium">Tarification vidéo {resolution}</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Prix de base {resolution}: <span className="font-semibold">{basePrice}$</span>
                    {licensePrice > 0 && (
                      <>
                        <br />Licence sélectionnée: <span className="font-semibold">+{licensePrice}€</span>
                        <br />Prix total: <span className="font-semibold text-lg">{totalPrice}$</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {licenses.map((license) => (
                  <div
                    key={license.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedLicense === license.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedLicense(license.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedLicense === license.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}>
                          {selectedLicense === license.id && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{license.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {license.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {getPriceDisplay(license)}
                        </div>
                        {isVideo && selectedLicense === license.id && (
                          <div className="text-xs text-muted-foreground">
                            {basePrice}$ + {license.price}€
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                size="lg" 
                className="flex-1"
                onClick={handleAddToCart}
                disabled={directPurchaseLoading}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ajouter au panier
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleDirectPurchase}
                disabled={directPurchaseLoading}
              >
                {directPurchaseLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Acheter maintenant
                  </>
                )}
              </Button>
            </div>

            {/* License Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Licence protégée</h4>
                  <p className="text-sm text-muted-foreground">
                    Tous nos contenus sont protégés par des licences claires et transparentes.
                    Utilisez-les en toute confiance pour vos projets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-16">
          <Tabs defaultValue="related" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="related">Contenus similaires</TabsTrigger>
              <TabsTrigger value="author">Plus de cet auteur</TabsTrigger>
            </TabsList>
            
            <TabsContent value="related" className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Contenus similaires</h3>
              {relatedProducts.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedProducts.map((item) => (
                    <ContentCard key={item.id} {...item} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <Eye className="h-8 w-8" />
                  </div>
                  <p>Aucun contenu similaire trouvé pour le moment.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="author" className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Plus de {product.author}</h3>
              {relatedProducts.filter(item => item.author === product.author).length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedProducts
                    .filter(item => item.author === product.author)
                    .map((item) => (
                      <ContentCard key={item.id} {...item} />
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-8 w-8" />
                  </div>
                  <p>Aucun autre contenu de cet auteur pour le moment.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;