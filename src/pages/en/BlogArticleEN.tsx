import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, Clock, User, ArrowLeft, Share2, Bookmark, 
  ThumbsUp, MessageCircle, Twitter, Facebook, Linkedin, Link as LinkIcon,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

// This would typically come from an API/database
const articleContent = {
  "mastering-stock-photography-2024": {
    id: "1",
    slug: "mastering-stock-photography-2024",
    title: "Mastering Stock Photography in 2024: A Complete Guide for Creators",
    excerpt: "Learn the essential techniques and strategies to create compelling stock images that sell.",
    category: "Photography",
    author: "Sarah Chen",
    authorRole: "Senior Photography Editor",
    authorBio: "Sarah has been curating and creating stock photography for over 15 years. She's helped thousands of photographers improve their craft and increase their sales.",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    publishDate: "2024-01-10",
    updatedDate: "2024-01-10",
    readTime: 12,
    image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&h=600&fit=crop",
    tags: ["Photography", "Tips", "Beginners", "Composition"],
    content: `
## Introduction

Stock photography has evolved dramatically over the past decade. What once worked may no longer resonate with today's buyers. In this comprehensive guide, we'll explore the techniques and strategies that successful stock photographers use to create compelling, sellable images.

## Understanding the Modern Stock Market

The demand for authentic, diverse, and technically excellent images has never been higher. Buyers are looking for content that:

- **Feels genuine** - Staged, overly polished images are being replaced by authentic moments
- **Represents diversity** - Inclusive content that reflects our global society
- **Tells a story** - Images that convey emotion and narrative

## Technical Excellence: The Foundation

### Composition Fundamentals

Great stock photography starts with solid composition. The rule of thirds, leading lines, and negative space remain essential tools in your arsenal.

**Pro Tip:** Leave space for text overlay. Many buyers use stock images for marketing materials where they need to add headlines or copy.

### Lighting Mastery

Natural light remains king for most stock photography, but understanding how to work with and modify light is crucial.

1. **Golden hour** - The soft, warm light of early morning and late afternoon
2. **Overcast days** - Perfect diffused light for portraits and product shots
3. **Window light** - Ideal for indoor lifestyle and food photography

### Technical Settings

- Shoot at the lowest ISO possible for clean images
- Use apertures that provide appropriate depth of field for your subject
- Ensure sharp focus, especially on key elements like eyes in portraits

## Content That Sells

### Trending Themes for 2024

Based on our market research, these themes are experiencing high demand:

- **Remote work and hybrid lifestyles** - Authentic home office setups, video calls, work-life balance
- **Sustainability and eco-consciousness** - Green living, renewable energy, environmental themes
- **Mental health and wellness** - Mindfulness, therapy, self-care practices
- **Diverse families and relationships** - Multi-generational, LGBTQ+, multicultural families
- **Technology integration** - AI, smart devices, digital transformation

### Keyword Strategy

Your images are only valuable if buyers can find them. Develop a strong keywording strategy:

- Use 25-50 relevant keywords per image
- Include both specific and broad terms
- Think about how buyers search - what problems are they trying to solve?
- Update keywords based on performance data

## Building Your Portfolio

### Quality Over Quantity

It's better to have 100 exceptional images than 1,000 mediocre ones. Each image should:

- Be technically perfect
- Have commercial appeal
- Add something unique to the marketplace

### Consistency Matters

Develop a recognizable style while maintaining variety in subject matter. Buyers often purchase multiple images from the same contributor for cohesive projects.

## Practical Exercise

This week, challenge yourself to:

1. Identify three trending themes relevant to your niche
2. Plan and execute a mini-shoot addressing one theme
3. Process your best 5-10 images with commercial buyers in mind
4. Write descriptive, search-optimized keywords for each

## Conclusion

Success in stock photography requires a combination of technical skill, market awareness, and consistent effort. By focusing on authenticity, diversity, and quality, you'll be well-positioned to thrive in the evolving stock market.

Remember: Every expert was once a beginner. Start where you are, use what you have, and do what you can. Your unique perspective has value in the marketplace.
    `,
    relatedArticles: [
      { slug: "color-psychology-visual-content", title: "Color Psychology in Visual Content" },
      { slug: "building-passive-income-stock-content", title: "Building Passive Income Through Stock Content" },
    ]
  },
  "video-content-trends-driving-sales": {
    id: "2",
    slug: "video-content-trends-driving-sales",
    title: "Video Content Trends Driving Sales in the Stock Market",
    excerpt: "Discover the hottest video trends that buyers are searching for.",
    category: "Video",
    author: "Marcus Johnson",
    authorRole: "Video Content Strategist",
    authorBio: "Marcus leads video content strategy at VisuStock, helping creators understand market demands and optimize their video portfolios.",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    publishDate: "2024-01-08",
    updatedDate: "2024-01-08",
    readTime: 8,
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&h=600&fit=crop",
    tags: ["Video", "Trends", "Strategy", "Marketing"],
    content: `
## The Video Content Revolution

Video content consumption has exploded, and with it, the demand for high-quality stock footage. Understanding current trends is essential for creators who want to maximize their earnings.

## Top Video Trends for 2024

### 1. Vertical Video Dominance

With TikTok, Instagram Reels, and YouTube Shorts leading social media engagement, vertical video (9:16 aspect ratio) is no longer optional—it's essential.

**Action Item:** When shooting, frame your content to work in both horizontal and vertical formats.

### 2. Authentic Lifestyle Content

Gone are the days of obviously staged scenarios. Buyers want footage that feels real, relatable, and organic.

### 3. Drone and Aerial Footage

Establishing shots, real estate, travel, and nature content benefit enormously from aerial perspectives.

### 4. Slow Motion and Time-Lapse

These techniques add production value and are highly sought after for commercials and social media content.

## Technical Requirements

- **Resolution:** 4K is now the standard; 8K for premium content
- **Frame Rates:** 24fps for cinematic, 60fps for slow-motion capability
- **Color:** Shoot in LOG profiles for maximum post-production flexibility
- **Audio:** Clean ambient sound or complete silence

## Maximizing Your Video Sales

Focus on evergreen content that remains relevant regardless of trends. Combine this with timely, trend-responsive content for optimal portfolio performance.
    `,
    relatedArticles: [
      { slug: "mastering-stock-photography-2024", title: "Mastering Stock Photography in 2024" },
      { slug: "audio-content-revolution", title: "The Audio Content Revolution" },
    ]
  },
  "ai-in-creative-industry": {
    id: "3",
    slug: "ai-in-creative-industry",
    title: "How AI is Transforming the Creative Industry: Opportunities & Challenges",
    excerpt: "Explore the impact of artificial intelligence on stock content creation.",
    category: "Industry Insights",
    author: "Dr. Elena Rodriguez",
    authorRole: "Technology Analyst",
    authorBio: "Dr. Rodriguez researches the intersection of AI and creative industries, advising companies on ethical technology integration.",
    authorAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
    publishDate: "2024-01-05",
    updatedDate: "2024-01-05",
    readTime: 15,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop",
    tags: ["AI", "Technology", "Future", "Innovation"],
    content: `
## The AI Revolution in Creative Content

Artificial intelligence is reshaping how we create, distribute, and consume visual content. For stock content creators, this presents both unprecedented opportunities and significant challenges.

## Current AI Applications

### Content Creation Tools

- **AI-assisted editing:** Automated color correction, object removal, and enhancement
- **Generative AI:** Text-to-image models creating novel visual content
- **Upscaling technology:** Enhancing resolution and quality of existing content

### Content Discovery

AI powers better search, recommendation systems, and trend prediction, helping buyers find exactly what they need.

## Opportunities for Creators

### Enhanced Productivity

AI tools can handle tedious tasks, freeing creators to focus on creative vision and strategy.

### New Creative Possibilities

Generative AI can serve as a creative partner, helping visualize concepts and explore new directions.

## Challenges to Navigate

### Authenticity Questions

As AI-generated content becomes more prevalent, buyers increasingly value genuine human-created work.

### Ethical Considerations

- Copyright and ownership of AI-assisted works
- Disclosure requirements for AI-generated content
- Impact on traditional creative employment

## The Path Forward

The creators who will thrive are those who view AI as a tool rather than a threat—using it to enhance their capabilities while maintaining the authentic human perspective that buyers value.
    `,
    relatedArticles: [
      { slug: "video-content-trends-driving-sales", title: "Video Content Trends Driving Sales" },
      { slug: "licensing-101-protect-your-work", title: "Licensing 101: Protect Your Work" },
    ]
  },
};

// Default article for unknown slugs
const defaultArticle = {
  id: "0",
  slug: "",
  title: "Article Not Found",
  excerpt: "",
  category: "",
  author: "VisuStock Team",
  authorRole: "",
  authorBio: "",
  authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  publishDate: new Date().toISOString().split('T')[0],
  updatedDate: new Date().toISOString().split('T')[0],
  readTime: 0,
  image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=600&fit=crop",
  tags: [],
  content: "The article you're looking for doesn't exist or has been moved.",
  relatedArticles: []
};

const BlogArticleEN = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = articleContent[slug as keyof typeof articleContent] || defaultArticle;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = article.title;
    
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
      return;
    }

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <main className="container py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{article.category || 'Article'}</span>
        </nav>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <article className="lg:col-span-3">
            {/* Back Button */}
            <Button variant="ghost" size="sm" className="mb-4" asChild>
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Link>
            </Button>

            {/* Article Header */}
            <header className="mb-8">
              <Badge className="mb-4">{article.category}</Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                {article.title}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                {article.excerpt}
              </p>

              {/* Author & Meta */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                  <img
                    src={article.authorAvatar}
                    alt={article.author}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">{article.author}</p>
                    <p className="text-sm text-muted-foreground">{article.authorRole}</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8 hidden sm:block" />
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(article.publishDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {article.readTime} min read
                  </span>
                </div>
              </div>
            </header>

            {/* Featured Image */}
            <div className="relative rounded-xl overflow-hidden mb-8 aspect-video">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none dark:prose-invert mb-12">
              {article.content.split('\n').map((paragraph, index) => {
                if (paragraph.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-bold mt-8 mb-4">{paragraph.replace('## ', '')}</h2>;
                }
                if (paragraph.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-semibold mt-6 mb-3">{paragraph.replace('### ', '')}</h3>;
                }
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return <p key={index} className="font-semibold my-4">{paragraph.replace(/\*\*/g, '')}</p>;
                }
                if (paragraph.startsWith('- ')) {
                  return <li key={index} className="ml-6 my-1">{paragraph.replace('- ', '')}</li>;
                }
                if (paragraph.match(/^\d+\./)) {
                  return <li key={index} className="ml-6 my-1 list-decimal">{paragraph.replace(/^\d+\.\s*/, '')}</li>;
                }
                if (paragraph.trim()) {
                  return <p key={index} className="my-4 text-muted-foreground leading-relaxed">{paragraph}</p>;
                }
                return null;
              })}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Share & Actions */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Share this article:</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleShare('twitter')}>
                        <Twitter className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleShare('facebook')}>
                        <Facebook className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleShare('linkedin')}>
                        <Linkedin className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleShare('copy')}>
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Helpful
                    </Button>
                    <Button variant="outline" size="sm">
                      <Bookmark className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Author Bio */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={article.authorAvatar}
                    alt={article.author}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold mb-1">About {article.author}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{article.authorRole}</p>
                    <p className="text-sm text-muted-foreground">{article.authorBio}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Related Articles */}
              {article.relatedArticles && article.relatedArticles.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Related Articles</h3>
                    <div className="space-y-3">
                      {article.relatedArticles.map((related) => (
                        <Link
                          key={related.slug}
                          to={`/blog/${related.slug}`}
                          className="block p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <p className="text-sm font-medium hover:text-primary transition-colors">
                            {related.title}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CTA */}
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-2">Start Creating Today</h3>
                  <p className="text-sm opacity-90 mb-4">
                    Join thousands of creators earning from their content.
                  </p>
                  <Button variant="secondary" size="sm" asChild>
                    <Link to="/become-seller">Become a Contributor</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default BlogArticleEN;
