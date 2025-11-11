import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentCard } from "@/components/ContentCard";
import { Eye, User } from "lucide-react";
import { useMarketplace } from "@/hooks/useMarketplace";

interface RelatedContentProps {
  productId: string;
  author: string;
  categoryId?: string;
}

export const RelatedContent: React.FC<RelatedContentProps> = ({ productId, author, categoryId }) => {
  const { content: marketplaceContent } = useMarketplace();

  // Build related products list
  const relatedProducts = marketplaceContent
    .filter(item => item.id !== productId)
    .filter(item => {
      const sameCategory = categoryId ? item.category_id === categoryId : false;
      const sameAuthor = item.author === author;
      return sameCategory || sameAuthor;
    })
    .sort((a, b) => {
      const aCategory = categoryId && a.category_id === categoryId ? 2 : 0;
      const bCategory = categoryId && b.category_id === categoryId ? 2 : 0;
      const aAuthor = a.author === author ? 1 : 0;
      const bAuthor = b.author === author ? 1 : 0;
      return (bCategory + bAuthor) - (aCategory + aAuthor);
    })
    .slice(0, 6);

  return (
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
          <h3 className="text-xl font-semibold mb-6">Plus de {author}</h3>
          {relatedProducts.filter(item => item.author === author).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts
                .filter(item => item.author === author)
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
  );
};
