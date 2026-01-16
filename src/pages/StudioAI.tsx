import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSEO } from '@/hooks/useSEO';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  Music, 
  Wand2, 
  ArrowRight,
  Zap,
  Globe,
  Award,
  Users,
  Play,
  Upload,
  Download,
  Scissors,
  Mic,
  Palette,
  ArrowUpRight
} from 'lucide-react';

interface AITool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
  badge?: string;
}

const videoTools: AITool[] = [
  {
    id: 'image-to-video',
    title: 'Image to Video',
    description: 'Bring any image to life by transforming it into smooth, engaging video content.',
    icon: <Play className="w-6 h-6" />,
    href: '/studio-ai/image-to-video',
    available: false,
    badge: 'Coming Soon'
  },
  {
    id: 'text-to-video',
    title: 'Text to Video',
    description: 'Generate cinematic videos directly from text prompts, ready for ads, social media or presentations.',
    icon: <Video className="w-6 h-6" />,
    href: '/studio-ai/text-to-video',
    available: false,
    badge: 'Coming Soon'
  },
  {
    id: 'video-upscale',
    title: 'Video Upscale',
    description: 'Enhance video quality and upscale footage to HD or 4K using AI.',
    icon: <ArrowUpRight className="w-6 h-6" />,
    href: '/studio-ai/video-upscale',
    available: true,
    badge: 'Available'
  }
];

const imageTools: AITool[] = [
  {
    id: 'ai-image-generator',
    title: 'AI Image Generator',
    description: 'Generate high-quality images and illustrations using AI.',
    icon: <Sparkles className="w-6 h-6" />,
    href: '/ai-image-generator',
    available: true,
    badge: 'Available'
  },
  {
    id: 'remove-background',
    title: 'Remove Background',
    description: 'Instantly remove backgrounds from images with clean, professional results.',
    icon: <Scissors className="w-6 h-6" />,
    href: '/studio-ai/remove-background',
    available: true,
    badge: 'Available'
  },
  {
    id: 'create-variations',
    title: 'Create Variations',
    description: 'Generate multiple creative variations from a single image.',
    icon: <Palette className="w-6 h-6" />,
    href: '/studio-ai/create-variations',
    available: false,
    badge: 'Coming Soon'
  }
];

const audioTools: AITool[] = [
  {
    id: 'text-to-speech',
    title: 'Text to Speech',
    description: 'Convert text into natural-sounding voiceovers for videos, ads and presentations.',
    icon: <Mic className="w-6 h-6" />,
    href: '/studio-ai/text-to-speech',
    available: true,
    badge: 'Available'
  }
];

const steps = [
  {
    number: '01',
    title: 'Choose an AI tool',
    description: 'Browse our collection of AI-powered creative tools and select the one that fits your needs.',
    icon: <Wand2 className="w-8 h-8" />
  },
  {
    number: '02',
    title: 'Upload or enter your content',
    description: 'Provide your input — whether it\'s text, an image, or a video file.',
    icon: <Upload className="w-8 h-8" />
  },
  {
    number: '03',
    title: 'Generate and download',
    description: 'Let AI work its magic, then download your professional-quality result.',
    icon: <Download className="w-8 h-8" />
  }
];

const benefits = [
  {
    title: 'Fast & Easy to Use',
    description: 'Get results in seconds with intuitive interfaces.',
    icon: <Zap className="w-6 h-6" />
  },
  {
    title: 'No Software Required',
    description: 'Everything runs in your browser — no downloads needed.',
    icon: <Globe className="w-6 h-6" />
  },
  {
    title: 'Commercial-Ready Results',
    description: 'High-quality outputs licensed for commercial use.',
    icon: <Award className="w-6 h-6" />
  },
  {
    title: 'Built for Creators & Businesses',
    description: 'Professional tools designed for real-world workflows.',
    icon: <Users className="w-6 h-6" />
  }
];

function ToolCard({ tool }: { tool: AITool }) {
  const navigate = useNavigate();
  
  return (
    <Card 
      className={`group relative overflow-hidden border-slate-700/50 bg-slate-900/50 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-800/50 ${tool.available ? 'cursor-pointer' : 'opacity-75'}`}
      onClick={() => tool.available && navigate(tool.href)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30">
            {tool.icon}
          </div>
          {tool.badge && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              tool.available 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
            }`}>
              {tool.badge}
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
          {tool.title}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          {tool.description}
        </p>
        
        <Button 
          variant={tool.available ? "default" : "secondary"}
          size="sm"
          className={`w-full ${tool.available ? 'bg-blue-600 hover:bg-blue-500' : ''}`}
          disabled={!tool.available}
        >
          {tool.available ? 'Try Now' : 'Coming Soon'}
          {tool.available && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </CardContent>
    </Card>
  );
}

function ToolSection({ title, icon, tools }: { title: string; icon: React.ReactNode; tools: AITool[] }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30">
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}

export default function StudioAI() {
  const navigate = useNavigate();

  useSEO({
    title: 'Studio AI - All-in-One AI Creative Tools',
    description: 'Studio AI helps creators, marketers and businesses generate professional content faster — no technical skills required. Create videos, images, and audio with AI.',
    type: 'website'
  });

  const scrollToTools = () => {
    document.getElementById('ai-tools')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Animated background effects */}
          <div className="absolute inset-0">
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          
          <div className="relative container mx-auto px-4 py-20 md:py-28 max-w-6xl">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-8">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">AI-Powered Creative Suite</span>
              </div>
              
              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Studio{' '}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  AI
                </span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
                All-in-one AI tools to create, enhance and transform visual, video and audio content.
              </p>
              
              {/* Description */}
              <p className="text-base text-slate-400 mb-10 max-w-2xl mx-auto">
                Studio AI helps creators, marketers and businesses generate professional content faster — no technical skills required.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 text-lg rounded-xl"
                  onClick={() => navigate('/ai-image-generator')}
                >
                  Start Creating
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-xl"
                  onClick={scrollToTools}
                >
                  Explore AI Tools
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* AI Tools Section */}
        <section id="ai-tools" className="container mx-auto px-4 py-16 max-w-6xl">
          <ToolSection 
            title="Video Tools" 
            icon={<Video className="w-5 h-5" />} 
            tools={videoTools} 
          />
          
          <ToolSection 
            title="Image Tools" 
            icon={<ImageIcon className="w-5 h-5" />} 
            tools={imageTools} 
          />
          
          <ToolSection 
            title="Audio Tools" 
            icon={<Music className="w-5 h-5" />} 
            tools={audioTools} 
          />
        </section>

        {/* How It Works Section */}
        <section className="relative py-20 bg-slate-900/50">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                How Studio AI Works
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Create professional content in three simple steps
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={step.number} className="relative">
                  {/* Connection line for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent" />
                  )}
                  
                  <div className="relative bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50 hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30">
                        {step.icon}
                      </div>
                      <span className="text-4xl font-bold text-slate-700">{step.number}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Studio AI Section */}
        <section className="container mx-auto px-4 py-20 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Studio AI
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Everything you need to create stunning content
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div 
                key={benefit.title}
                className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/30 transition-all text-center"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30 mx-auto mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-slate-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative py-20 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative container mx-auto px-4 max-w-4xl">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-10 md:p-14 border border-slate-700/50 text-center backdrop-blur-sm">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Create Faster with Studio AI
              </h2>
              <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                Join thousands of creators using AI to produce professional content in minutes.
              </p>
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-6 text-lg rounded-xl"
                onClick={scrollToTools}
              >
                Explore Studio AI
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
