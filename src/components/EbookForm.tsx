import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Image, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EbookFormProps {
  fileData: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  };
  productData: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    currentTag: string;
    coverUrl?: string;
  };
  categories: Array<{ id: string; name: string; }>;
  onUpdateProductData: (updates: any) => void;
  onGenerateAI: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  loading?: boolean;
}

export const EbookForm = ({
  fileData,
  productData,
  categories,
  onUpdateProductData,
  onGenerateAI,
  onSaveDraft,
  onPublish,
  loading = false
}: EbookFormProps) => {
  const [coverImage, setCoverImage] = useState<{ url: string; file?: File } | null>(
    productData.coverUrl ? { url: productData.coverUrl } : null
  );
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Find the Ebooks category
  const ebooksCategory = categories.find(cat => cat.name.toLowerCase() === 'ebooks');

  // Auto-select Ebooks category if not already selected
  useState(() => {
    if (!productData.category && ebooksCategory) {
      onUpdateProductData({ category: ebooksCategory.id });
    }
  });

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image pour la couverture");
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB max
      toast.error("L'image de couverture ne peut pas dépasser 2MB");
      return;
    }

    setUploadingCover(true);
    
    try {
      // Upload cover image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setCoverImage({ url: publicUrl, file });
      // Update parent component with cover URL
      onUpdateProductData({ coverUrl: publicUrl });
      toast.success("Couverture uploadée avec succès");
      
    } catch (error) {
      console.error('Cover upload error:', error);
      toast.error(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCoverUpload(e.target.files[0]);
    }
  };

  const handleAddTag = () => {
    if (productData.currentTag) {
      const newTags = productData.currentTag
        .split(/[,;;\n]/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && !productData.tags.includes(tag));
      
      if (newTags.length > 0) {
        onUpdateProductData({
          tags: [...productData.tags, ...newTags],
          currentTag: ''
        });
      }
    }
  };

  const handleTagInputChange = (value: string) => {
    if (value.includes(',') || value.includes(';')) {
      const currentValue = value.replace(/[,;]$/, '');
      onUpdateProductData({ currentTag: currentValue });
      handleAddTag();
    } else {
      onUpdateProductData({ currentTag: value });
    }
  };

  const handleRemoveTag = (tag: string) => {
    onUpdateProductData({
      tags: productData.tags.filter(t => t !== tag)
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header avec info PDF */}
      <div className="flex items-center space-x-4 pb-4 border-b">
        <div className="w-16 h-20 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-lg flex items-center justify-center border">
          <FileText className="h-8 w-8 text-red-600" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold">Ebook PDF</h3>
            <Badge variant="secondary">PDF</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{fileData.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(fileData.size)}</p>
        </div>

        <Button 
          onClick={onGenerateAI} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Générer avec IA
        </Button>
      </div>

      {/* Upload de couverture - Obligatoire */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">
          Image de couverture <span className="text-destructive">*</span>
        </Label>
        
        {coverImage ? (
          <div className="flex items-center space-x-4">
            <img 
              src={coverImage.url} 
              alt="Couverture" 
              className="w-20 h-28 object-cover rounded-lg border"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Couverture uploadée</p>
              <p className="text-xs text-muted-foreground">
                {coverImage.file?.name || 'Image de couverture'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
              >
                Changer la couverture
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setCoverImage(null);
                onUpdateProductData({ coverUrl: undefined });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div 
            onClick={() => coverInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Cliquez pour uploader la couverture</p>
            <p className="text-xs text-muted-foreground">
              Toutes dimensions acceptées, max 2MB
            </p>
          </div>
        )}
        
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploadingCover}
        />
      </Card>

      {/* Formulaire produit */}
      <div className="space-y-4">
        {/* Titre */}
        <div>
          <Label htmlFor="title">Titre de l'ebook</Label>
          <Input
            id="title"
            value={productData.title}
            onChange={(e) => onUpdateProductData({ title: e.target.value })}
            placeholder="Ex: Guide complet du développement React"
          />
        </div>

        {/* Catégorie (détectée automatiquement) */}
        <div>
          <Label>Catégorie</Label>
          <div className="flex items-center space-x-2 h-10 px-3 border rounded-md bg-muted/50">
            <Badge variant="secondary">
              {categories.find(c => c.id === productData.category)?.name || 'Ebooks'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              (Détectée automatiquement pour les PDF)
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description détaillée</Label>
          <Textarea
            id="description"
            value={productData.description}
            onChange={(e) => onUpdateProductData({ description: e.target.value })}
            placeholder="Décrivez le contenu, les chapitres, ce que l'acheteur va apprendre..."
            className="min-h-[120px]"
          />
        </div>

        {/* Tags */}
        <div>
          <Label>Tags/Mots-clés</Label>
          <div className="space-y-2">
            <Input
              value={productData.currentTag}
              onChange={(e) => handleTagInputChange(e.target.value)}
              placeholder="Ajoutez des tags (séparez par des virgules)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            {productData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {productData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                    <X 
                      className="h-3 w-3 ml-1" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4 border-t">
        <Button 
          onClick={onSaveDraft} 
          variant="outline"
          disabled={loading || !productData.title.trim()}
        >
          Sauvegarder le brouillon
        </Button>
        <Button 
          onClick={onPublish}
          disabled={loading || !productData.title.trim() || !productData.description.trim() || !coverImage}
          className="flex-1"
        >
          Publier l'ebook
        </Button>
      </div>

      {!coverImage && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Note:</strong> Une image de couverture est obligatoire pour publier un ebook. 
          Elle sera affichée dans le catalogue et sur la page produit.
        </div>
      )}
    </div>
  );
};