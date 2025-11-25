import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SimpleFileUpload } from "@/components/SimpleFileUpload";
import { Check, ArrowRight, Upload as UploadIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface UploadedFileData {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  isWatermarked?: boolean;
}

const FileUpload = () => {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with empty state - this is a fresh upload session
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleFilesUploaded = async (files: UploadedFileData[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload files");
        return;
      }

      // Save files to uploaded_files table
      const filesToInsert = files.map(file => ({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_url: file.url,
        file_size: file.size,
        preview_url: file.previewUrl,
        thumbnail_url: file.thumbnailUrl,
        is_watermarked: file.isWatermarked || false,
        status: 'completed'
      }));

      const { data: insertedFiles, error } = await supabase
        .from('uploaded_files')
        .insert(filesToInsert)
        .select();

      if (error) {
        console.error('Error saving files to database:', error);
        toast.error("Error saving files");
        return;
      }

      console.log('✅ Files saved to database:', insertedFiles);
      
      // Update state with database IDs
      const filesWithDbIds = files.map((file, index) => ({
        ...file,
        id: insertedFiles?.[index]?.id || file.id
      }));

      setUploadedFiles(prev => [...prev, ...filesWithDbIds]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error in handleFilesUploaded:', error);
      toast.error("Error processing files");
    }
  };

  const handleContinueToProducts = () => {
    console.log('🔘 Button clicked! Uploaded files count:', uploadedFiles.length);
    console.log('📦 Files to transfer:', uploadedFiles);
    
    if (uploadedFiles.length === 0) {
      console.log('❌ No files found, showing error');
      toast.error("Please upload at least one file before continuing");
      return;
    }

    // Store uploaded files in session storage for the next step
    try {
      const filesData = JSON.stringify(uploadedFiles);
      console.log('💾 Storing files in sessionStorage:', filesData.length, 'characters');
      sessionStorage.setItem('pendingUploadedFiles', filesData);
      console.log('✅ SessionStorage set successfully');
      
      console.log('🚀 Navigating to /product-management...');
      navigate('/product-management');
    } catch (error) {
      console.error('❌ Error in handleContinueToProducts:', error);
      toast.error('Navigation error');
    }
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
      fallbackMessage="This page is reserved for sellers. Only creators can upload content."
    >
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        
        <div className="container py-8 max-w-4xl">
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">1</span>
              <span>File Upload</span>
              <ArrowRight className="h-4 w-4" />
              <span className="px-3 py-1 rounded-full bg-muted">2</span>
              <span>Product Management</span>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Upload Your Files</h1>
            <p className="text-muted-foreground">
              Start by uploading all your digital files. You can then configure each product individually.
            </p>
          </div>

          <div className="space-y-6">
            {/* File Upload Section */}
            <Card className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <UploadIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Upload Zone</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Drop or select your files. Images will be automatically watermarked for the marketplace.
                </p>
              </div>
              
              <SimpleFileUpload 
                onFilesUploaded={handleFilesUploaded} 
                maxFiles={100} 
                maxFileSize={1000} 
              />
            </Card>

            {/* Uploaded Files Summary */}
            {uploadedFiles.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Check className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold">
                    Uploaded Files ({uploadedFiles.length})
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {uploadedFiles.slice(0, 6).map((file) => (
                    <div key={file.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                      {file.type.startsWith('image/') && file.previewUrl ? (
                        <img 
                          src={file.previewUrl} 
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : file.type.startsWith('video/') && (file.url || file.previewUrl) ? (
                        <video 
                          src={file.url || file.previewUrl} 
                          className="w-12 h-12 object-cover rounded"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                          <UploadIcon className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {file.type.split('/')[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {uploadedFiles.length > 6 && (
                    <div className="flex items-center justify-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        +{uploadedFiles.length - 6} more files
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
                    Continue to Product Management
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    asChild
                  >
                    <Link to="/seller-dashboard">Cancel</Link>
                  </Button>
                </div>
              </Card>
            )}

            {/* Instructions */}
            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-2">Next Steps</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload all your files at once</li>
                <li>• Then proceed to the product configuration step</li>
                <li>• Each file will have its own metadata form</li>
                <li>• You can save as draft or publish directly</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default FileUpload;