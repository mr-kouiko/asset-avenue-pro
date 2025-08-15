import { useState } from "react";
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
  Info, 
  Shield, 
  User,
  Calendar,
  Eye,
  Star
} from "lucide-react";
import mockPhoto1 from "@/assets/mock-photo1.jpg";

const ProductDetail = () => {
  const [isLiked, setIsLiked] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState("standard");

  // Mock product data
  const product = {
    id: "1",
    title: "Magnifique coucher de soleil sur les montagnes",
    description: "Une image époustouflante capturant la beauté naturelle d'un coucher de soleil sur une chaîne de montagnes majestueuses. Parfait pour vos projets créatifs, publications sur les réseaux sociaux, ou décoration d'intérieur.",
    author: "Alex Photographe",
    authorAvatar: "/placeholder.svg",
    type: "photo",
    thumbnail: mockPhoto1,
    tags: ["paysage", "montagne", "coucher de soleil", "nature", "orange", "tranquillité"],
    uploadDate: "2024-01-15",
    dimensions: "4000 x 3000 px",
    fileSize: "2.4 MB",
    format: "JPG",
    likes: 1234,
    downloads: 567,
    views: 8945,
    rating: 4.8,
    reviews: 42,
  };

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

  // Mock related products
  const relatedProducts = [
    {
      id: "2",
      title: "Lever de soleil dans les Alpes",
      author: "Mountain Pro",
      price: 18,
      type: "photo" as const,
      thumbnail: mockPhoto1,
      likes: 892,
      downloads: 234,
    },
    {
      id: "3",
      title: "Panorama de montagne",
      author: "Nature Lover",
      price: 12,
      type: "photo" as const,
      thumbnail: mockPhoto1,
      likes: 567,
      downloads: 123,
    },
    {
      id: "4",
      title: "Ciel dramatique au coucher",
      author: "Sky Master",
      price: 20,
      type: "photo" as const,
      thumbnail: mockPhoto1,
      likes: 1456,
      downloads: 678,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="container py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column - Image */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsLiked(!isLiked)}
                  className="h-8 w-8 p-0"
                >
                  <Heart 
                    className="h-4 w-4" 
                    fill={isLiked ? "currentColor" : "none"}
                  />
                </Button>
                <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Dimensions</div>
                <div className="font-medium">{product.dimensions}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Format</div>
                <div className="font-medium">{product.format}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Taille</div>
                <div className="font-medium">{product.fileSize}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Type</div>
                <Badge variant="secondary" className="capitalize">
                  {product.type}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title and Author */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{product.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-muted-foreground text-sm">
                    {new Date(product.uploadDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>{product.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>{product.downloads}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{product.views}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  <span>{product.rating} ({product.reviews})</span>
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

            {/* Tags */}
            <div>
              <h3 className="font-semibold mb-2">Mots-clés</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* License Selection */}
            <div>
              <h3 className="font-semibold mb-4">Choisir une licence</h3>
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
                      <div className="text-2xl font-bold">
                        {license.price}€
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button size="lg" className="flex-1">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ajouter au panier
              </Button>
              <Button size="lg" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Acheter maintenant
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="related">Contenus similaires</TabsTrigger>
              <TabsTrigger value="author">Plus de cet auteur</TabsTrigger>
              <TabsTrigger value="reviews">Avis ({product.reviews})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="related" className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Contenus similaires</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedProducts.map((item) => (
                  <ContentCard key={item.id} {...item} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="author" className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Plus de {product.author}</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedProducts.map((item) => (
                  <ContentCard key={item.id} {...item} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold">{product.rating}</div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${
                            i < Math.floor(product.rating) 
                              ? "fill-current text-yellow-500" 
                              : "text-gray-300"
                          }`} 
                        />
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Basé sur {product.reviews} avis
                    </div>
                  </div>
                </div>
                
                <div className="text-muted-foreground">
                  Les avis clients seront bientôt disponibles.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;