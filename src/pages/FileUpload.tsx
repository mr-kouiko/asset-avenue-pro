import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SimpleFileUpload } from "@/components/SimpleFileUpload";
import { Check, ArrowRight, Upload as UploadIcon, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useUploadedFiles } from "@/hooks/useUploadedFiles";
import { Badge } from "@/components/ui/badge";

interface UploadedFileData {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  isWatermarked?: boolean;
}

const FileUpload = () => {
  const navigate = useNavigate();
  const { files: draftFiles, loadDraftFiles, deleteFile } = useUploadedFiles();

  // Load draft files on mount
  useEffect(() => {
    loadDraftFiles();
  }, []);

  const handleFilesUploaded = (files: UploadedFileData[]) => {
    // Files are automatically saved to DB in SimpleFileUpload
    // Just reload the draft files to update the UI
    loadDraftFiles();
    toast.success(`${files.length} fichier(s) uploadé(s) avec succès`);
  };

  const handleContinueToProducts = () => {
    if (draftFiles.length === 0) {
      toast.error("Veuillez uploader au moins un fichier avant de continuer");
      return;
    }

    // No need for sessionStorage anymore, data is in DB
    navigate('/product-management');
  };

  const handleDeleteFile = async (fileId: string) => {
    await deleteFile(fileId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">1</span>
              <span>Upload des fichiers</span>
              <ArrowRight className="h-4 w-4" />
              <span className="px-3 py-1 rounded-full bg-muted">2</span>
              <span>Gestion des produits</span>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Uploader vos fichiers</h1>
            <p className="text-muted-foreground">
              Commencez par uploader tous vos fichiers numériques. Vous pourrez ensuite configurer chaque produit individuellement.
            </p>
          </div>

          <div className="space-y-6">
            {/* File Upload Section */}
            <Card className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <UploadIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Zone d'upload</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Déposez ou sélectionnez vos fichiers. Les images seront automatiquement filigranées pour la marketplace.
                </p>
              </div>
              
              <SimpleFileUpload 
                onFilesUploaded={handleFilesUploaded} 
                maxFiles={100} 
                maxFileSize={1000} 
              />
            </Card>

            {/* Uploaded Files Summary */}
            {draftFiles.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold">
                      Fichiers en brouillon ({draftFiles.length})
                    </h3>
                  </div>
                  <Badge variant="outline">Sauvegardés automatiquement</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {draftFiles.slice(0, 6).map((file) => (
                    <div key={file.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg group">
                      {file.preview_url && file.file_type.startsWith('image/') ? (
                        <img 
                          src={file.preview_url} 
                          alt={file.file_name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                          <UploadIcon className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} • {file.file_type.split('/')[0]}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  
                  {draftFiles.length > 6 && (
                    <div className="flex items-center justify-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        +{draftFiles.length - 6} autres fichiers
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4">
                  <Button 
                    onClick={handleContinueToProducts}
                    size="lg"
                    className="flex-1"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continuer vers la gestion des produits
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    asChild
                  >
                    <Link to="/seller-dashboard">Annuler</Link>
                  </Button>
                </div>
              </Card>
            )}

            {/* Instructions */}
            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-2">Prochaines étapes</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Uploadez tous vos fichiers en une fois</li>
                <li>• Passez ensuite à l'étape de configuration des produits</li>
                <li>• Chaque fichier aura son propre formulaire de métadonnées</li>
                <li>• Vous pourrez sauvegarder en brouillon ou publier directement</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default FileUpload;