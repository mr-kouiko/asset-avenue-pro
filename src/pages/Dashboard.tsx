import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  TrendingUp,
  DollarSign,
  Download,
  Eye,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Image,
  Film,
  Music,
  FileText,
  ArrowRight,
  Check,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { SimpleFileUpload } from "@/components/SimpleFileUpload";
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { supabase } from '@/integrations/supabase/client';
import { StoreSettingsCard } from '@/components/StoreSettingsCard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { 
    loading, 
    stats, 
    submissions, 
    unsubmittedFiles,
    updateSubmission, 
    deleteSubmission,
    refreshData 
  } = useSellerDashboard();
  
  
  const [activeTab, setActiveTab] = useState("overview");
  
  // Refresh dashboard data when returning to this page
  useEffect(() => {
    // Refresh when component mounts or becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshData();
      }
    };

    // Refresh on mount
    refreshData();

    // Also refresh when tab becomes visible again
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  const handleEditSubmission = async (submissionId: string) => {
    try {
      console.log('📝 [DASHBOARD] Starting edit for submission:', submissionId);
      const startTime = Date.now();
      
      // Normalize UUID
      const normalizedId = submissionId.split('/').pop() || submissionId;
      console.log('🆔 [DASHBOARD] Normalized submission ID:', normalizedId);
      console.log('👤 [DASHBOARD] Current user ID:', user?.id);
      
      // Query 1: Get submission data
      console.log('📊 [DASHBOARD] Querying content_submissions...');
      const queryStart = Date.now();
      const { data: submission, error: submissionError } = await supabase
        .from('content_submissions')
        .select('*')
        .eq('id', normalizedId)
        .eq('creator_id', user?.id) // Ensure user owns this submission
        .single();

      const queryTime1 = Date.now() - queryStart;
      console.log(`📦 [DASHBOARD] Submission query completed in ${queryTime1}ms`);
      console.log('📦 [DASHBOARD] Submission result:', { data: submission, error: submissionError });

      if (submissionError) {
        console.error('❌ [DASHBOARD] RLS ERROR on content_submissions:', submissionError);
        toast.error("Unable to load this submission");
        return;
      }

      if (!submission) {
        console.error('❌ [DASHBOARD] No submission found with ID:', normalizedId);
        toast.error("Submission not found");
        return;
      }

      console.log('✅ [DASHBOARD] Submission loaded:', submission.title);

      // Query 2: Get files separately
      console.log('📁 [DASHBOARD] Querying content_files...');
      const filesStart = Date.now();
      const { data: contentFiles, error: filesError } = await supabase
        .from('content_files')
        .select('*')
        .eq('submission_id', normalizedId);

      const queryTime2 = Date.now() - filesStart;
      console.log(`📁 [DASHBOARD] Files query completed in ${queryTime2}ms`);
      console.log('📁 [DASHBOARD] Files result:', { 
        count: contentFiles?.length || 0, 
        error: filesError 
      });

      if (filesError) {
        console.error('❌ [DASHBOARD] RLS ERROR on content_files:', filesError);
      }

      if (!contentFiles || contentFiles.length === 0) {
        console.warn('⚠️ [DASHBOARD] No files found for submission');
        toast.error('No files found for this product');
        return;
      }

      contentFiles.forEach(file => {
        console.log(`  📄 [DASHBOARD] File: ${file.file_name} | Path: ${file.file_path} | Bucket: uploads`);
      });

      // Format files for ProductManagement
      const formattedFiles = contentFiles.map((file: any) => ({
        id: file.id,
        url: file.file_path,
        name: file.file_name,
        type: file.file_type,
        size: file.file_size,
        isWatermarked: !file.is_original,
        thumbnailUrl: file.thumbnail_path,
        previewUrl: file.preview_path
      }));

      const totalTime = Date.now() - startTime;
      console.log(`✅ [DASHBOARD] Total load time: ${totalTime}ms`);
      console.log('✅ [DASHBOARD] Formatted files:', formattedFiles);

      // Store editing context in sessionStorage
      const editingData = {
        submissionId: submission.id,
        title: submission.title,
        description: submission.description,
        category: submission.category_id,
        tags: submission.tags || [],
        price: submission.price,
        status: submission.status
      };
      
      console.log('💾 Storing editing data:', editingData);
      sessionStorage.setItem('editingSubmission', JSON.stringify(editingData));
      sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(formattedFiles));

      // Navigate to product management
      navigate('/product-management');
      toast.success('Loading product for editing...');
    } catch (error) {
      console.error('❌ Error loading submission for edit:', error);
      toast.error('Error loading product');
    }
  };
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    url: string;
    name: string;
    type: string;
    size: number;
    isWatermarked?: boolean;
    thumbnailUrl?: string;
    previewUrl?: string;
  }>>([]);
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    url: string;
    name: string;
    type: string;
    previewUrl?: string;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);


  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <AlertCircle className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Unauthorized Access</h1>
          <p className="text-muted-foreground mb-8">
            You must be logged in to access the seller dashboard
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const handleFilesUploaded = (files: Array<{
    id: string;
    url: string;
    name: string;
    type: string;
    size: number;
    isWatermarked?: boolean;
    thumbnailUrl?: string;
    previewUrl?: string;
  }>) => {
    setUploadedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) uploaded successfully`);
  };

  const handleContinueToProducts = () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file before continuing");
      return;
    }

    sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(uploadedFiles));
    navigate('/product-management');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openAudioPreview = async (file: { id: string; file_path: string; file_name: string; file_type: string }) => {
    // For audio files, generate a signed URL
    if (file.file_type === 'audio') {
      try {
        console.log('🔐 Generating signed URL for audio file:', file.file_path);
        
        // Extract bucket and file path from the full path
        // file_path format: "user_id/audios/filename.mp3"
        const filePath = file.file_path;
        
        const { data, error } = await supabase.storage
          .from('uploads')
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) {
          console.error('Error generating signed URL:', error);
          toast.error('Error generating preview URL');
          return;
        } else if (data?.signedUrl) {
          console.log('✅ Signed URL generated:', data.signedUrl);
          setPreviewFile({ 
            id: file.id, 
            url: data.signedUrl, 
            name: file.file_name, 
            type: file.file_type,
            previewUrl: data.signedUrl 
          });
          setIsPreviewOpen(true);
          return;
        }
      } catch (error) {
        console.error('Error processing audio URL:', error);
        toast.error('Error processing audio file');
        return;
      }
    }
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your content and track your performance
            </p>
          </div>
          <Button 
            className="flex items-center gap-2"
            asChild
          >
            <Link to="/file-upload">
              <Plus className="h-4 w-4" />
              Add Content
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">My Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue?.toFixed(2) || '0.00'}€</div>
                  <p className="text-xs text-muted-foreground">
                    Earnings from completed sales
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Downloads</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDownloads || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Content downloaded by buyers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Content</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.approvedSubmissions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Out of {stats.totalSubmissions || 0} submitted
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingSubmissions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Content under review
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Content</CardTitle>
                <CardDescription>
                  Your latest uploads and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">No content uploaded yet</p>
                    <Button asChild>
                      <Link to="/file-upload">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Your First Content
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{submission.title}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{submission.content_files?.length || 0} file(s)</span>
                            <span>{submission.price ? `$${submission.price}` : 'Free'}</span>
                            <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                          </div>
                          {submission.rejection_reason && (
                            <p className="text-sm text-red-600 mt-1">
                              Rejection reason: {submission.rejection_reason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(submission.status)}
                          <Badge
                            variant={
                              submission.status === "approved" ? "default" :
                              submission.status === "rejected" ? "destructive" : "secondary"
                            }
                          >
                            {getStatusLabel(submission.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {/* Unsubmitted Files Section */}
            {unsubmittedFiles && unsubmittedFiles.length > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <CardTitle>Unsubmitted Files ({unsubmittedFiles.length})</CardTitle>
                  </div>
                  <CardDescription>
                    These files have been uploaded but not yet submitted for validation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {unsubmittedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                        <div className="flex items-center gap-3 flex-1">
                          {file.file_type.startsWith('image') ? (
                            <Image className="h-5 w-5 text-muted-foreground" />
                          ) : file.file_type.startsWith('video') ? (
                            <Film className="h-5 w-5 text-muted-foreground" />
                          ) : file.file_type.startsWith('audio') ? (
                            <Music className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            const fileData = [{
                              id: file.id,
                              url: file.file_url,
                              name: file.file_name,
                              type: file.file_type,
                              size: file.file_size,
                              thumbnailUrl: file.thumbnail_url,
                              previewUrl: file.preview_url,
                              isWatermarked: file.is_watermarked
                            }];
                            
                            sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(fileData));
                            navigate('/product-management');
                          }}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Submit
                        </Button>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const allFiles = unsubmittedFiles.map(file => ({
                            id: file.id,
                            url: file.file_url,
                            name: file.file_name,
                            type: file.file_type,
                            size: file.file_size,
                            thumbnailUrl: file.thumbnail_url,
                            previewUrl: file.preview_url,
                            isWatermarked: file.is_watermarked
                          }));
                          
                          sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(allFiles));
                          navigate('/product-management');
                        }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Submit All Files ({unsubmittedFiles.length})
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submitted Content Section */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Submitted Content</CardTitle>
                  <CardDescription>
                    Manage your creations and track their status
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link to="/file-upload">
                    <Plus className="h-4 w-4 mr-2" />
                    New Content
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading...</p>
                  </div>
                ) : submissions.length === 0 && (!unsubmittedFiles || unsubmittedFiles.length === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Upload className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Content</h3>
                    <p className="mb-4">Start by creating your first content</p>
                    <Button asChild>
                      <Link to="/file-upload">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Content
                      </Link>
                    </Button>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No submitted content yet</p>
                    <p className="text-sm mt-2">Submit the files above to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {submissions.map((submission) => (
                      <Card key={submission.id} className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-lg">{submission.title}</h4>
                              {getStatusIcon(submission.status)}
                              <Badge
                                variant={
                                  submission.status === "approved" ? "default" :
                                  submission.status === "rejected" ? "destructive" : "secondary"
                                }
                              >
                                {getStatusLabel(submission.status)}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground mb-2">{submission.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{submission.content_files?.length || 0} file(s)</span>
                              <span>{submission.price ? `$${submission.price}` : 'Free'}</span>
                              <span>Created on {new Date(submission.created_at).toLocaleDateString()}</span>
                            </div>
                            {submission.tags && submission.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {submission.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {submission.rejection_reason && (
                              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                <p className="text-sm text-destructive font-medium">Rejection reason:</p>
                                <p className="text-sm text-destructive">{submission.rejection_reason}</p>
                              </div>
                            )}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSubmission(submission.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
                                    await deleteSubmission(submission.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Files Grid */}
                        {submission.content_files && submission.content_files.length > 0 && (
                          <div className="border-t pt-4">
                            <h5 className="font-medium mb-3">Associated Files ({submission.content_files.length})</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {submission.content_files.slice(0, 4).map((file) => (
                                <div key={file.id} className="relative bg-muted rounded-lg p-3 group">
                                  <div className="flex items-center justify-center h-16 mb-2">
                                    {file.file_type === 'image' && <Image className="h-8 w-8 text-muted-foreground" />}
                                    {file.file_type === 'video' && <Film className="h-8 w-8 text-muted-foreground" />}
                                    {file.file_type === 'audio' && <Music className="h-8 w-8 text-muted-foreground" />}
                                    {!['image', 'video', 'audio'].includes(file.file_type) && <FileText className="h-8 w-8 text-muted-foreground" />}
                                  </div>
                                  {file.file_type === 'audio' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openAudioPreview(file)}
                                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <p className="text-xs text-center truncate">{file.file_name}</p>
                                  <Badge variant="secondary" className="text-xs mt-1 w-full justify-center">
                                    {file.file_type}
                                  </Badge>
                                </div>
                              ))}
                              {submission.content_files.length > 4 && (
                                <div className="relative bg-muted/50 rounded-lg p-3 flex items-center justify-center">
                                  <div className="text-center">
                                    <Plus className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                                    <p className="text-xs text-muted-foreground">
                                      +{submission.content_files.length - 4} more
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Overall Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Approval Rate</span>
                    <span className="font-medium">
                      {stats.totalSubmissions > 0 
                        ? `${((stats.approvedSubmissions / stats.totalSubmissions) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Revenue per Content</span>
                    <span className="font-medium">
                      {stats.approvedSubmissions > 0 
                        ? `$${(stats.totalRevenue / stats.approvedSubmissions).toFixed(2)}`
                        : '$0'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Popularity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Downloads per Content</span>
                    <span className="font-medium">
                      {stats.approvedSubmissions > 0 
                        ? `${Math.round(stats.totalDownloads / stats.approvedSubmissions)}`
                        : '0'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="mb-6">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">1</span>
                <span>File Upload</span>
                <ArrowRight className="h-4 w-4" />
                <span className="px-3 py-1 rounded-full bg-muted">2</span>
                <span>Product Management</span>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Upload Your Files</h2>
              <p className="text-muted-foreground">
                Start by uploading all your digital files. You can then configure each product individually.
              </p>
            </div>

            {/* File Upload Section */}
            <Card className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Upload Zone</h3>
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
                      {file.previewUrl && file.type.startsWith('image/') ? (
                        <img 
                          src={file.previewUrl} 
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                          <Upload className="h-5 w-5 text-primary" />
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
                    onClick={() => setUploadedFiles([])}
                  >
                    Cancel
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <StoreSettingsCard />
          </TabsContent>
        </Tabs>

        {/* Audio Preview Modal */}
        {isPreviewOpen && previewFile && previewFile.type === 'audio' && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closePreview}
          >
            <div 
              className="bg-background rounded-lg p-6 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Audio Preview - {previewFile.name}</h3>
                <Button variant="ghost" size="sm" onClick={closePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="w-48 h-48 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Music className="h-16 w-16 text-primary" />
                </div>
                <div className="w-full">
                  <AudioPlayer
                    src={previewFile.previewUrl || previewFile.url}
                    autoPlay={false}
                    showJumpControls={false}
                    customAdditionalControls={[]}
                    style={{
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;