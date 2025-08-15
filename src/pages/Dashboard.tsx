import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data
  const stats = {
    totalEarnings: 2456.78,
    totalDownloads: 1234,
    totalViews: 45678,
    totalUploads: 89,
  };

  const recentUploads = [
    {
      id: "1",
      title: "Coucher de soleil montagneux",
      status: "approved",
      uploads: 245,
      earnings: 123.45,
      views: 1234,
    },
    {
      id: "2",
      title: "Architecture moderne",
      status: "pending",
      uploads: 0,
      earnings: 0,
      views: 89,
    },
    {
      id: "3",
      title: "Illustration abstraite",
      status: "approved",
      uploads: 67,
      earnings: 45.60,
      views: 567,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord vendeur</h1>
            <p className="text-muted-foreground">
              Gérez votre contenu et suivez vos performances
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter du contenu
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="content">Mon contenu</TabsTrigger>
            <TabsTrigger value="analytics">Statistiques</TabsTrigger>
            <TabsTrigger value="upload">Uploader</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEarnings.toFixed(2)}€</div>
                  <p className="text-xs text-muted-foreground">
                    +12.5% par rapport au mois dernier
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Téléchargements</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDownloads}</div>
                  <p className="text-xs text-muted-foreground">
                    +8.2% par rapport au mois dernier
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vues totales</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +15.3% par rapport au mois dernier
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contenus uploadés</CardTitle>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUploads}</div>
                  <p className="text-xs text-muted-foreground">
                    +3 ce mois-ci
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
                <CardDescription>
                  Vos derniers uploads et leurs performances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUploads.map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{upload.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{upload.views} vues</span>
                          <span>{upload.uploads} téléchargements</span>
                          <span>{upload.earnings.toFixed(2)}€ générés</span>
                        </div>
                      </div>
                      <Badge
                        variant={upload.status === "approved" ? "default" : "secondary"}
                      >
                        {upload.status === "approved" ? "Approuvé" : "En attente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mon contenu</CardTitle>
                <CardDescription>
                  Gérez tous vos uploads en un seul endroit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUploads.map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{upload.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <Badge
                            variant={upload.status === "approved" ? "default" : "secondary"}
                          >
                            {upload.status === "approved" ? "Approuvé" : "En attente"}
                          </Badge>
                          <span>{upload.views} vues</span>
                          <span>{upload.uploads} téléchargements</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques détaillées</CardTitle>
                <CardDescription>
                  Analysez les performances de votre contenu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Les statistiques détaillées seront bientôt disponibles</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Uploader du contenu</CardTitle>
                <CardDescription>
                  Ajoutez de nouveaux contenus à votre portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Glissez vos fichiers ici</h3>
                  <p className="text-muted-foreground mb-4">
                    ou cliquez pour sélectionner des fichiers
                  </p>
                  <Button>Choisir des fichiers</Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG, GIF, MP4, MP3, SVG jusqu'à 50MB
                  </p>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre</Label>
                    <Input id="title" placeholder="Donnez un titre à votre contenu" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="photo">Photo</SelectItem>
                        <SelectItem value="video">Vidéo</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="illustration">Illustration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Prix de vente (€)</Label>
                    <Input id="price" type="number" placeholder="15.00" min="0" step="0.01" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license">Type de licence</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une licence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="extended">Étendue</SelectItem>
                        <SelectItem value="exclusive">Exclusive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre contenu..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Mots-clés (séparés par des virgules)</Label>
                  <Input
                    id="tags"
                    placeholder="nature, paysage, montagne, coucher de soleil"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Sauvegarder comme brouillon</Button>
                  <Button>Publier</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;