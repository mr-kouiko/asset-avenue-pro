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
  isAiGenerated?: boolean;
  detectedCategory?: 'photo' | 'video' | 'audio' | 'ebook';
  fileHash?: string;
}

const FileUpload = () => {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recoveredCount, setRecoveredCount] = useState(0);

  // Recover pending uploads on page load (files uploaded but not yet linked to products)
  useEffect(() => {
    const recoverPendingUploads = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Find files uploaded in the last 24 hours that aren't linked to any content_files
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: pendingFiles, error } = await supabase
          .from('uploaded_files')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error recovering pending uploads:', error);
          setIsLoading(false);
          return;
        }

        if (pendingFiles && pendingFiles.length > 0) {
          // Check which files are NOT yet linked to content_files
          const { data: linkedFiles } = await supabase
            .from('content_files')
            .select('file_path')
            .in('file_path', pendingFiles.map(f => f.file_url));

          const linkedPaths = new Set(linkedFiles?.map(f => f.file_path) || []);
          
          // Filter to only unlinked files
          const unlinkedFiles = pendingFiles.filter(f => !linkedPaths.has(f.file_url));

          if (unlinkedFiles.length > 0) {
            console.log(`🔄 Recovering ${unlinkedFiles.length} pending uploads`);
            
            const recoveredFiles: UploadedFileData[] = unlinkedFiles.map(file => ({
              id: file.id,
              url: file.file_url,
              name: file.file_name,
              type: file.file_type,
              size: file.file_size,
              previewUrl: file.preview_url || undefined,
              thumbnailUrl: file.thumbnail_url || undefined,
              isWatermarked: file.is_watermarked || false,
              fileHash: file.file_hash || undefined,
            }));

            setUploadedFiles(recoveredFiles);
            setRecoveredCount(unlinkedFiles.length);
            
            // Notify user about recovered files
            toast.info(`🔄 Recovered ${unlinkedFiles.length} file(s) from your previous session`, {
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error('Error in recoverPendingUploads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    recoverPendingUploads();
  }, []);

  const handleFilesUploaded = async (files: UploadedFileData[]) => {
    console.log('📥 handleFilesUploaded called with files:', files);
    
    // CRITICAL: Always update state first so the button appears
    // Even if database save fails, user can continue
    setUploadedFiles(prev => {
      const newFiles = [...prev, ...files];
      console.log('✅ State updated, total files:', newFiles.length);
      return newFiles;
    });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("User not logged in, but files are in state");
        toast.warning("Files uploaded but not saved to database - please login");
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
        file_hash: file.fileHash || null, // CRITICAL: Save hash for duplicate detection
        status: 'completed'
      }));

      console.log('💾 Saving files to database:', filesToInsert);

      const { data: insertedFiles, error } = await supabase
        .from('uploaded_files')
        .insert(filesToInsert)
        .select();

      if (error) {
        console.error('Error saving files to database:', error);
        toast.warning("Files ready but database save failed - you can still continue");
        return;
      }

      console.log('✅ Files saved to database:', insertedFiles);
      
      // Update state with database IDs (replace the files we just added)
      if (insertedFiles && insertedFiles.length > 0) {
        setUploadedFiles(prev => {
          return prev.map(file => {
            const dbFile = insertedFiles.find(df => df.file_url === file.url);
            if (dbFile) {
              return { ...file, id: dbFile.id };
            }
            return file;
          });
        });
      }

      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error in handleFilesUploaded:', error);
      toast.warning("Files ready - database save failed but you can continue");
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Checking for pending uploads...</p>
              </div>
            </div>
          ) : (
            <>
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
                    {recoveredCount > 0 && (
                      <span className="ml-2 text-sm font-normal text-amber-600">
                        ({recoveredCount} recovered from previous session)
                      </span>
                    )}
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
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default FileUpload;