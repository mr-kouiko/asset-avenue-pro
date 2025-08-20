import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/FileUpload";
import { Upload as UploadIcon, X, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/ProtectedRoute";

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories, createSubmission, addDraftFiles, draftFiles } = useSellerDashboard();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    tags: [] as string[],
    currentTag: ''
  });

  const handleFilesUploaded = (uploadedFiles: {
    url: string; 
    name: string; 
    type: string; 
    bucket: string;
    size: number;
    previewUrl?: string;
    thumbnailUrl?: string;
    isWatermarked?: boolean;
  }[]) => {
    addDraftFiles(uploadedFiles);
  };

  const handleAddTag = () => {
    if (formData.currentTag && !formData.tags.includes(formData.currentTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.currentTag],
        currentTag: ''
      }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (draftFiles.length === 0) {
      toast.error('Veuillez uploader au moins un fichier');
      return;
    }

    setLoading(true);

    try {
      const categoryId = formData.category || undefined;
      const price = formData.price ? parseFloat(formData.price) : undefined;

      const result = await createSubmission({
        title: formData.title,
        description: formData.description,
        category_id: categoryId,
        price,
        tags: formData.tags
      });

      if (result) {
        toast.success('Contenu publié et disponible immédiatement sur le marketplace !');
        navigate('/seller-dashboard?tab=content');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de la création du contenu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute 
      allowedRoles={['creator', 'admin']}
      fallbackMessage="Cette page est réservée aux vendeurs. Seuls les créateurs peuvent uploader du contenu."
    >
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        
        <div className="container py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Uploader du contenu</h1>
            <p className="text-muted-foreground">
              Partagez vos créations avec la communauté VisuStock
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* File Upload */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Fichiers</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Glissez-déposez plusieurs fichiers à la fois. Les images seront automatiquement watermarquées pour le marketplace.
              </p>
              <FileUpload onFilesUploaded={handleFilesUploaded} maxFiles={100} maxFileSize={1000} />
            </Card>

            {/* Content Details */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Détails du contenu</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input 
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Titre de votre création"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea 
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez votre création..."
                    rows={4}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input 
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0 pour gratuit"
                  />
                </div>
                
                <div>
                  <Label>Tags</Label>
                  <div className="flex space-x-2">
                    <Input 
                      value={formData.currentTag}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentTag: e.target.value }))}
                      placeholder="Ajouter un tag"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Submit */}
            <div className="flex space-x-4">
              <Button type="submit" size="lg" disabled={loading || draftFiles.length === 0}>
                {loading ? 'Création en cours...' : 'Publier le contenu'}
              </Button>
              <Button type="button" variant="outline" size="lg" asChild>
                <Link to="/seller-dashboard">Annuler</Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Upload;