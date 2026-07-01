import { useMemo, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Calendar, Clock, ArrowRight, TrendingUp,
  Camera, Video, Lightbulb, Palette, BookOpen, Star, Sparkles, Wand2, Package,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useBlogPosts, BlogPost } from "@/hooks/useBlogPosts";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  publishDate: string;
  readTime: number;
  image: string;
  tags: string[];
  featured: boolean;
}

const staticArticles: Article[] = [
  {
    id: "static-9",
    slug: "studio-ai-visustock-all-in-one-creative-ai-platform",
    title: "Studio AI by VisuStock: The All-in-One Creative AI Platform",
    excerpt: "Studio AI is VisuStock's all-in-one creative AI suite to generate, enhance, and transform visual, video, and audio content in just a few clicks.",
    category: "AI Tools",
    author: "VisuStock Team",
    authorRole: "Product Team",
    authorAvatar: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=100&h=100&fit=crop",
    publishDate: "2026-01-18",
    readTime: 6,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop",
    tags: ["AI", "Studio AI", "Content Creation"],
    featured: true,
  },
  {
    id: "static-1",
    slug: "stock-photography-tips-composition-lighting-guide-2026",
    title: "Mastering Stock Photography in 2026: A Complete Guide",
    excerpt: "Essential techniques and strategies to create compelling stock images that sell — from composition to lighting.",
    category: "Photography",
    author: "Sarah Chen",
    authorRole: "Senior Photography Editor",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    publishDate: "2026-01-10",
    readTime: 12,
    image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=450&fit=crop",
    tags: ["Photography", "Tips", "Composition"],
    featured: true,
  },
  {
    id: "static-2",
    slug: "stock-video-trends-4k-drone-footage-vertical-content",
    title: "Video Content Trends Driving Sales in the Stock Market",
    excerpt: "Discover the hottest video trends that buyers are searching for and stay ahead of the curve.",
    category: "Video",
    author: "Marcus Johnson",
    authorRole: "Video Content Strategist",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    publishDate: "2026-01-08",
    readTime: 8,
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=450&fit=crop",
    tags: ["Video", "Trends", "Marketing"],
    featured: true,
  },
];

const categoryIcons: Record<string, typeof BookOpen> = {
  "All": BookOpen,
  "AI Visuals": Sparkles,
  "AI Tools": Lightbulb,
  "Stock Footage": Video,
  "Video": Video,
  "Photography": Camera,
  "Design": Palette,
  "Creative Trends": TrendingUp,
  "Industry Insights": TrendingUp,
  "Success Stories": Star,
  "Prompts": Wand2,
  "Digital Assets": Package,
};

const dbToArticle = (p: BlogPost): Article => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  category: p.category,
  author: p.author,
  authorRole: p.author_role,
  authorAvatar: p.author_avatar ?? "https://visustock.com/favicon.png",
  publishDate: p.published_at,
  readTime: p.read_time,
  image: p.hero_image,
  tags: p.tags ?? [],
  featured: p.featured,
});

const BlogEN = () => {
  useSEO({
    title: "VisuStock Blog — AI Visuals, Stock Footage & Creative Trends",
    description: "Weekly insights on AI visuals, stock footage, prompt engineering, digital assets and creative trends for modern creators and marketers.",
  });

  const { data: dbPosts, isLoading } = useBlogPosts();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const articles: Article[] = useMemo(() => {
    const merged = [
      ...(dbPosts ?? []).map(dbToArticle),
      ...staticArticles,
    ];
    // Dedup by slug (DB wins)
    const seen = new Set<string>();
    return merged.filter(a => (seen.has(a.slug) ? false : (seen.add(a.slug), true)))
      .sort((a, b) => +new Date(b.publishDate) - +new Date(a.publishDate));
  }, [dbPosts]);

  const categories = useMemo(() => {
    const names = new Set<string>(["All"]);
    articles.forEach(a => names.add(a.category));
    return Array.from(names).map(name => ({ name, icon: categoryIcons[name] ?? BookOpen }));
  }, [articles]);

  const filteredArticles = articles.filter(article => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      article.title.toLowerCase().includes(q) ||
      article.excerpt.toLowerCase().includes(q) ||
      article.tags.some(tag => tag.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === "All" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = articles.filter(a => a.featured).slice(0, 3);
  const showFeatured = selectedCategory === "All" && !searchQuery && featuredArticles.length > 0;
  const regularArticles = showFeatured
    ? filteredArticles.filter(a => !featuredArticles.some(f => f.slug === a.slug))
    : filteredArticles;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8 sm:py-12">
        <section className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-powered insights, twice a week
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            The VisuStock Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Fresh takes on AI visuals, stock footage, prompt engineering, creative trends and digital assets — updated every Tuesday and Friday.
          </p>

          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search articles, topics, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg rounded-full border-2"
            />
          </div>
        </section>

        <section className="mb-10">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.name)}
                  className="rounded-full"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {category.name}
                </Button>
              );
            })}
          </div>
        </section>

        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        )}

        {showFeatured && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Featured Articles
            </h2>
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 lg:row-span-2 overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300">
                <Link to={`/blog/${featuredArticles[0]?.slug}`} className="block">
                  <div className="relative h-64 lg:h-full overflow-hidden">
                    <img
                      src={featuredArticles[0]?.image}
                      alt={featuredArticles[0]?.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <Badge className="mb-3 bg-primary/90">{featuredArticles[0]?.category}</Badge>
                      <h3 className="text-2xl lg:text-3xl font-bold mb-3 line-clamp-2">
                        {featuredArticles[0]?.title}
                      </h3>
                      <p className="text-white/80 mb-4 line-clamp-2 hidden sm:block">
                        {featuredArticles[0]?.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-white/70">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(featuredArticles[0]?.publishDate || "")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {featuredArticles[0]?.readTime} min read
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>

              {featuredArticles.slice(1, 3).map((article) => (
                <Card key={article.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300">
                  <Link to={`/blog/${article.slug}`}>
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <Badge className="absolute top-4 left-4 bg-primary/90">{article.category}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{article.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(article.publishDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime} min
                        </span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-6">
            {selectedCategory === "All" ? "Latest Articles" : selectedCategory}
          </h2>
          {regularArticles.length === 0 && !isLoading ? (
            <p className="text-center text-muted-foreground py-12">
              No articles yet in this section — check back soon, new posts land every Tuesday and Friday.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularArticles.map((article) => (
                <Card key={article.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <Link to={`/blog/${article.slug}`} className="flex flex-col h-full">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <Badge className="absolute top-4 left-4 bg-primary/90">{article.category}</Badge>
                    </div>
                    <CardContent className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(article.publishDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.readTime} min
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default BlogEN;
