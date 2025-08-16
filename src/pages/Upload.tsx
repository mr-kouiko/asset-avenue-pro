import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, X, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    tags: [] as string[],
    currentTag: ''
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        
        <div className="container py-16 text-center">
          <UploadIcon className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Connexion requise</h1>
          <p className="text-muted-foreground mb-8">
            Vous devez être connecté en tant que vendeur pour uploader du contenu
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
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
    setLoading(true);

    try {
      // Mock upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Contenu uploadé avec succès ! En attente de validation.');
      navigate('/dashboard?tab=content');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Uploader du contenu</h1>
          <p className="text-muted-foreground">
            Partagez vos créations avec la communauté ArabsStock
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* File Upload */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Fichiers</h2>
            
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Glissez vos fichiers ici</h3>
              <p className="text-muted-foreground mb-4">
                ou cliquez pour sélectionner des fichiers
              </p>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload">
                <Button type="button" variant="outline" asChild>
                  <span>Sélectionner des fichiers</span>
                </Button>
              </Label>
            </div>

            {files.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Fichiers sélectionnés :</h4>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-surface p-3 rounded">
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    <SelectItem value="photo">Photos</SelectItem>
                    <SelectItem value="video">Vidéos</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="illustration">Illustrations</SelectItem>
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
            <Button type="submit" size="lg" disabled={loading || files.length === 0}>
              {loading ? 'Upload en cours...' : 'Publier le contenu'}
            </Button>
            <Button type="button" variant="outline" size="lg" asChild>
              <Link to="/dashboard">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Upload;