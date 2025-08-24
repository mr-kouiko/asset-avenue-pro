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
import { SimpleFileUpload } from "@/components/SimpleFileUpload";
import { useContentManagement } from "@/hooks/useContentManagement";
import { Upload as UploadIcon, X, Plus, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/ProtectedRoute";

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories } = useSellerDashboard();
  const { 
    loading, 
    uploadedFiles, 
    handleFilesUploaded, 
    removeFile, 
    publishContent, 
    saveDraft 
  } = useContentManagement();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    tags: [] as string[],
    currentTag: ''
  });

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

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const categoryId = formData.category || undefined;
    const price = formData.price ? parseFloat(formData.price) : 0;

    const success = await publishContent({
      title: formData.title,
      description: formData.description,
      category_id: categoryId,
      price,
      tags: formData.tags
    });

    if (success) {
      navigate('/seller-dashboard');
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title || !formData.description) {
      toast.error('Please fill in title and description to save as draft');
      return;
    }

    const categoryId = formData.category || undefined;
    const price = formData.price ? parseFloat(formData.price) : 0;

    await saveDraft({
      title: formData.title,
      description: formData.description,
      category_id: categoryId,
      price,
      tags: formData.tags
    });
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
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Nouveau système d'upload</h1>
            <p className="text-muted-foreground mb-6">
              Nous avons amélioré l'expérience d'upload avec un processus en deux étapes plus simple et efficace.
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">🎉 Upload repensé pour plus d'efficacité</h2>
              <div className="space-y-3 text-left max-w-2xl mx-auto">
                <div className="flex items-start space-x-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mt-0.5">1</span>
                  <div>
                    <p className="font-medium">Upload groupé de fichiers</p>
                    <p className="text-sm text-muted-foreground">Uploadez tous vos fichiers en une seule fois</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mt-0.5">2</span>
                  <div>
                    <p className="font-medium">Configuration individuelle</p>
                    <p className="text-sm text-muted-foreground">Configurez chaque produit séparément avec ses propres métadonnées</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Button size="lg" asChild>
                  <Link to="/file-upload">
                    Commencer l'upload
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Legacy Upload Notice */}
          <Card className="p-6 bg-muted/50">
            <h2 className="text-xl font-semibold mb-4">Ancien système (Déprécié)</h2>
            <p className="text-muted-foreground mb-4">
              Cette version de l'upload est conservée temporairement. Nous recommandons fortement d'utiliser le nouveau système ci-dessus.
            </p>
            <div className="flex space-x-4">
              <Button variant="secondary" asChild>
                <Link to="/file-upload">Utiliser le nouveau système</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/seller-dashboard">Retour au tableau de bord</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Upload;