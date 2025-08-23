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
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Uploader du contenu</h1>
            <p className="text-muted-foreground">
              Partagez vos créations avec la communauté VisuStock
            </p>
          </div>

          <form onSubmit={handlePublish} className="space-y-8">
            {/* File Upload */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Files</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop multiple files at once. Images will be automatically watermarked for the marketplace.
              </p>
              <SimpleFileUpload 
                onFilesUploaded={handleFilesUploaded} 
                maxFiles={100} 
                maxFileSize={1000} 
              />
            </Card>

            {/* Content Details */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Content Details</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Title of your creation"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
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
                    placeholder="Describe your creation..."
                    rows={4}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input 
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0 for free"
                  />
                </div>
                
                <div>
                  <Label>Tags</Label>
                  <div className="flex space-x-2">
                    <Input 
                      value={formData.currentTag}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentTag: e.target.value }))}
                      placeholder="Add a tag"
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
              <Button 
                type="submit" 
                size="lg" 
                disabled={loading || uploadedFiles.length === 0 || !formData.title || !formData.description}
              >
                {loading ? 'Publishing...' : 'Publish Content'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="lg" 
                onClick={handleSaveDraft}
                disabled={loading || uploadedFiles.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button type="button" variant="outline" size="lg" asChild>
                <Link to="/seller-dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Upload;