import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, Calendar, Clock, User, ArrowRight, TrendingUp, 
  Camera, Video, Lightbulb, Palette, BookOpen, Star
} from "lucide-react";
import { Link } from "react-router-dom";

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
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

const blogArticles: BlogArticle[] = [
  {
    id: "1",
    slug: "stock-photography-tips-composition-lighting-guide-2024",
    title: "Mastering Stock Photography in 2024: A Complete Guide for Creators",
    excerpt: "Learn the essential techniques and strategies to create compelling stock images that sell. From composition to lighting, we cover everything you need to know.",
    content: "",
    category: "Photography",
    author: "Sarah Chen",
    authorRole: "Senior Photography Editor",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    publishDate: "2024-01-10",
    readTime: 12,
    image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=450&fit=crop",
    tags: ["Photography", "Tips", "Beginners", "Composition"],
    featured: true,
  },
  {
    id: "2",
    slug: "stock-video-trends-4k-drone-footage-vertical-content",
    title: "Video Content Trends Driving Sales in the Stock Market",
    excerpt: "Discover the hottest video trends that buyers are searching for. Stay ahead of the curve and maximize your earnings with trending content.",
    content: "",
    category: "Video",
    author: "Marcus Johnson",
    authorRole: "Video Content Strategist",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    publishDate: "2024-01-08",
    readTime: 8,
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=450&fit=crop",
    tags: ["Video", "Trends", "Strategy", "Marketing"],
    featured: true,
  },
  {
    id: "3",
    slug: "ai-creative-tools-generative-art-future-content-creation",
    title: "How AI is Transforming the Creative Industry: Opportunities & Challenges",
    excerpt: "Explore the impact of artificial intelligence on stock content creation. Learn how to leverage AI tools while maintaining authenticity.",
    content: "",
    category: "Industry Insights",
    author: "Dr. Elena Rodriguez",
    authorRole: "Technology Analyst",
    authorAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
    publishDate: "2024-01-05",
    readTime: 15,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop",
    tags: ["AI", "Technology", "Future", "Innovation"],
    featured: true,
  },
  {
    id: "4",
    slug: "color-psychology-marketing-visual-design-branding",
    title: "Color Psychology in Visual Content: Creating Emotional Connections",
    excerpt: "Understand how color choices influence buyer decisions and learn to create visually compelling content that resonates emotionally.",
    content: "",
    category: "Design",
    author: "Yuki Tanaka",
    authorRole: "Creative Director",
    authorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    publishDate: "2024-01-03",
    readTime: 10,
    image: "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=800&h=450&fit=crop",
    tags: ["Design", "Color Theory", "Psychology", "Branding"],
    featured: false,
  },
  {
    id: "5",
    slug: "passive-income-stock-photography-success-stories-earnings",
    title: "Building Passive Income Through Stock Content: Success Stories",
    excerpt: "Real stories from creators who turned their passion into profitable careers. Learn from their journeys and apply their strategies.",
    content: "",
    category: "Success Stories",
    author: "James Mitchell",
    authorRole: "Community Manager",
    authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    publishDate: "2024-01-01",
    readTime: 14,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop",
    tags: ["Success", "Income", "Inspiration", "Career"],
    featured: false,
  },
  {
    id: "6",
    slug: "stock-audio-music-sound-effects-podcast-production",
    title: "The Audio Content Revolution: Why Sound Design Matters More Than Ever",
    excerpt: "From podcasts to video production, audio content demand is soaring. Learn how to create professional audio that sells.",
    content: "",
    category: "Audio",
    author: "Alex Rivera",
    authorRole: "Audio Production Lead",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    publishDate: "2023-12-28",
    readTime: 9,
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=450&fit=crop",
    tags: ["Audio", "Sound Design", "Music", "Production"],
    featured: false,
  },
  {
    id: "7",
    slug: "creative-workflow-productivity-burnout-prevention-tips",
    title: "Creating a Sustainable Creative Workflow: Avoiding Burnout",
    excerpt: "Maintain your creative momentum without burning out. Practical tips for managing your time and energy as a content creator.",
    content: "",
    category: "Lifestyle",
    author: "Priya Sharma",
    authorRole: "Wellness Coach",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    publishDate: "2023-12-25",
    readTime: 7,
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=450&fit=crop",
    tags: ["Wellness", "Productivity", "Lifestyle", "Mental Health"],
    featured: false,
  },
  {
    id: "8",
    slug: "stock-content-licensing-copyright-royalty-free-guide",
    title: "Licensing 101: Understanding and Protecting Your Creative Work",
    excerpt: "Navigate the complex world of content licensing with confidence. Know your rights and maximize the value of your creations.",
    content: "",
    category: "Legal",
    author: "Michael Torres",
    authorRole: "Legal Advisor",
    authorAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
    publishDate: "2023-12-22",
    readTime: 11,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=450&fit=crop",
    tags: ["Legal", "Licensing", "Copyright", "Business"],
    featured: false,
  },
];

const categories = [
  { name: "All", icon: BookOpen },
  { name: "Photography", icon: Camera },
  { name: "Video", icon: Video },
  { name: "Design", icon: Palette },
  { name: "Industry Insights", icon: TrendingUp },
  { name: "Success Stories", icon: Star },
];

const BlogEN = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredArticles = blogArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = blogArticles.filter(a => a.featured);
  const regularArticles = filteredArticles.filter(a => !a.featured || selectedCategory !== "All" || searchQuery);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <main className="container py-8 sm:py-12">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Lightbulb className="w-3 h-3 mr-1" />
            Insights & Inspiration
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            The VisuStock Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Expert tips, industry trends, and inspiring stories from the world of digital content creation.
          </p>
          
          {/* Search Bar */}
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

        {/* Category Filters */}
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

        {/* Featured Articles - Only show when no filter */}
        {selectedCategory === "All" && !searchQuery && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Featured Articles
            </h2>
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Featured */}
              <Card className="lg:col-span-2 lg:row-span-2 overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300">
                <Link to={`/blog/${featuredArticles[0]?.slug}`} className="block">
                  <div className="relative h-64 lg:h-full overflow-hidden">
                    <img
                      src={featuredArticles[0]?.image}
                      alt={featuredArticles[0]?.title}
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
                          {formatDate(featuredArticles[0]?.publishDate || '')}
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

              {/* Secondary Featured */}
              {featuredArticles.slice(1, 3).map((article) => (
                <Card key={article.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300">
                  <Link to={`/blog/${article.slug}`}>
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <Badge className="absolute top-4 left-4 bg-primary/90">{article.category}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime} min
                        </span>
                        <span>{formatDate(article.publishDate)}</span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* All Articles Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {selectedCategory === "All" && !searchQuery ? "Latest Articles" : `${filteredArticles.length} Articles Found`}
            </h2>
          </div>

          {regularArticles.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {regularArticles.map((article) => (
                <Card key={article.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col">
                  <Link to={`/blog/${article.slug}`} className="flex flex-col h-full">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <Badge className="absolute top-3 left-3 text-xs">{article.category}</Badge>
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <img
                            src={article.authorAvatar}
                            alt={article.author}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span>{article.author}</span>
                        </div>
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
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No articles found matching your criteria.</p>
              <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>
                Clear Filters
              </Button>
            </Card>
          )}
        </section>

        {/* Newsletter Section */}
        <section className="mt-16">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground overflow-hidden">
            <CardContent className="p-8 sm:p-12 text-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
              <div className="relative z-10">
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">Stay Inspired</h3>
                <p className="text-lg opacity-90 mb-6 max-w-xl mx-auto">
                  Get weekly insights, tips, and inspiration delivered straight to your inbox.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="bg-white/20 border-white/30 placeholder:text-white/60 text-white"
                  />
                  <Button variant="secondary" className="shrink-0">
                    Subscribe
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <p className="text-xs opacity-70 mt-4">
                  No spam, unsubscribe anytime. Read our privacy policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tags Cloud */}
        <section className="mt-12">
          <h3 className="text-lg font-semibold mb-4 text-center">Popular Topics</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from(new Set(blogArticles.flatMap(a => a.tags))).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setSearchQuery(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default BlogEN;
