import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Link } from "react-router-dom";
import { Plus, Upload, TrendingUp, Heart, Download } from "lucide-react";

const Portfolio = () => {
  const { user } = useAuth();
  const { submissions, stats, loading, refreshData } = useSellerDashboard();

  // Filter only approved submissions for public portfolio
  const approvedSubmissions = submissions.filter(submission => submission.status === 'approved');

  // Listen for global refresh events to update portfolio when content is deleted
  useEffect(() => {
    const handleGlobalRefresh = () => {
      console.log('Portfolio: Handling global refresh event');
      refreshData();
    };

    window.addEventListener('globalContentRefresh', handleGlobalRefresh);

    return () => {
      window.removeEventListener('globalContentRefresh', handleGlobalRefresh);
    };
  }, [refreshData]);

  return (
    <ProtectedRoute 
      allowedRoles={['creator', 'admin']}
      fallbackMessage="This page is reserved for sellers."
    >
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        
        <div className="container py-8">
          {/* Portfolio Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user?.user_metadata?.display_name?.[0] || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h1 className="text-3xl font-bold">
                    {user?.user_metadata?.store_name || user?.user_metadata?.display_name || 'My Portfolio'}
                  </h1>
                  <p className="text-muted-foreground">
                    VisuStock Creator • Member since {new Date(user?.created_at || '').getFullYear()}
                  </p>
                  <div>
                    <Badge variant="secondary">
                      {approvedSubmissions.length} published contents
                    </Badge>
                    <Badge variant="outline">
                      {stats?.totalDownloads || 0} downloads
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button asChild>
                  <Link to="/file-upload">
                    <Plus className="h-4 w-4 mr-2" />
                    New content
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/seller-dashboard">
                    Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalSubmissions || 0}</div>
                  <div className="text-sm text-muted-foreground">Total contents</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.approvedSubmissions || 0}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Download className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalDownloads || 0}</div>
                  <div className="text-sm text-muted-foreground">Downloads</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">€{stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
                  <div className="text-sm text-muted-foreground">Revenue</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Contents */}
          <Tabs defaultValue="published" className="space-y-6">
            <TabsList>
              <TabsTrigger value="published">Published contents ({approvedSubmissions.length})</TabsTrigger>
              <TabsTrigger value="all">All my contents ({submissions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="published" className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : approvedSubmissions.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="text-muted-foreground mb-4">
                    You don't have any published content yet
                  </div>
                  <Button asChild>
                    <Link to="/file-upload">
                      <Plus className="h-4 w-4 mr-2" />
                      Upload your first content
                    </Link>
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {approvedSubmissions.map((submission) => {
                    const previewFile = submission.content_files?.find(file => file.is_preview);
                    const thumbnailFile = submission.content_files?.find(file => file.thumbnail_path);
                    
                    return (
                      <ContentCard
                        key={submission.id}
                        id={submission.id}
                        title={submission.title}
                        author={user?.user_metadata?.store_name || user?.user_metadata?.display_name || 'You'}
                        price={submission.price || 0}
                        type="photo"
                        thumbnail={previewFile?.file_path || thumbnailFile?.thumbnail_path || '/placeholder.svg'}
                        likes={Math.floor(Math.random() * 200)}
                        downloads={Math.floor(Math.random() * 100)}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : submissions.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="text-muted-foreground mb-4">
                    You haven't created any content yet
                  </div>
                  <Button asChild>
                    <Link to="/file-upload">
                      <Plus className="h-4 w-4 mr-2" />
                      Create your first content
                    </Link>
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => {
                    const previewFile = submission.content_files?.find(file => file.is_preview);
                    const thumbnailFile = submission.content_files?.find(file => file.thumbnail_path);
                    
                    return (
                      <Card key={submission.id} className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                            {(previewFile?.file_path || thumbnailFile?.thumbnail_path) && (
                              <img 
                                src={previewFile?.file_path || thumbnailFile?.thumbnail_path} 
                                alt={submission.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold">{submission.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {submission.description?.slice(0, 100)}...
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={
                                submission.status === 'approved' ? 'default' : 
                                submission.status === 'pending' ? 'secondary' : 
                                'destructive'
                              }>
                                {submission.status === 'approved' ? 'Published' : 
                                 submission.status === 'pending' ? 'Pending' : 
                                 'Rejected'}
                              </Badge>
                              {submission.price && (
                                <Badge variant="outline">€{submission.price}</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/seller-dashboard?tab=content`}>
                                Edit
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Portfolio;
