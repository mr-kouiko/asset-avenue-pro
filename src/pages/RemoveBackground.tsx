import { useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Download, 
  Loader2, 
  Scissors, 
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RemoveBackground() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  useSEO({
    title: 'Remove Background - AI Background Remover | Studio AI',
    description: 'Instantly remove backgrounds from images with AI. Get clean, professional results with transparent backgrounds in seconds.',
    type: 'website'
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, WebP).',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB.',
        variant: 'destructive'
      });
      return;
    }

    setFileName(file.name);
    setResultImage(null);

    // Convert to base64 for preview and processing
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setOriginalImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) {
      toast({
        title: 'No image selected',
        description: 'Please upload an image first.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    setResultImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('remove-background', {
        body: { imageUrl: originalImage }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.error === 'rate_limited') {
          toast({
            title: 'Rate Limit Reached',
            description: 'Please wait a few minutes before trying again.',
            variant: 'destructive'
          });
        } else if (data.error === 'payment_required') {
          toast({
            title: 'Credits Exhausted',
            description: 'The AI service needs more credits. Please contact support.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Processing Failed',
            description: data.message || 'Unable to remove background. Please try again.',
            variant: 'destructive'
          });
        }
        return;
      }

      if (data?.resultUrl) {
        setResultImage(data.resultUrl);
        toast({
          title: 'Background Removed!',
          description: 'Your image is ready to download.'
        });
      } else {
        throw new Error('No result image returned');
      }
    } catch (error: any) {
      console.error('Error removing background:', error);
      toast({
        title: 'Error',
        description: 'Failed to process image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = fileName.replace(/\.[^/.]+$/, '') + '-no-bg.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setResultImage(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Link */}
        <Link 
          to="/studio-ai" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Studio AI
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
            <Scissors className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">AI-Powered</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Remove{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Background
            </span>
          </h1>
          
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Instantly remove backgrounds from images with clean, professional results. 
            Perfect for product photos, portraits, and more.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload / Original Image Card */}
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-400" />
                Original Image
              </h3>
              
              {!originalImage ? (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/30 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-slate-500 mb-3" />
                    <p className="mb-2 text-sm text-slate-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">PNG, JPG or WebP (max 10MB)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
              ) : (
                <div className="relative">
                  <img 
                    src={originalImage} 
                    alt="Original" 
                    className="w-full h-64 object-contain rounded-xl bg-slate-800"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleReset}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Change
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result Image Card */}
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" />
                Result
              </h3>
              
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/50">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                  <p className="text-sm text-slate-400">Removing background...</p>
                </div>
              ) : resultImage ? (
                <div className="relative">
                  {/* Checkered background to show transparency */}
                  <div 
                    className="w-full h-64 rounded-xl overflow-hidden"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #374151 25%, transparent 25%),
                        linear-gradient(-45deg, #374151 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #374151 75%),
                        linear-gradient(-45deg, transparent 75%, #374151 75%)
                      `,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      backgroundColor: '#1f2937'
                    }}
                  >
                    <img 
                      src={resultImage} 
                      alt="Result" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <Scissors className="w-10 h-10 text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500">Result will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8"
            onClick={handleRemoveBackground}
            disabled={!originalImage || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5 mr-2" />
                Remove Background
              </>
            )}
          </Button>
          
          {resultImage && (
            <Button
              size="lg"
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/10 px-8"
              onClick={handleDownload}
            >
              <Download className="w-5 h-5 mr-2" />
              Download PNG
            </Button>
          )}
        </div>

        {/* Tips Section */}
        <div className="mt-16 text-center">
          <h2 className="text-xl font-semibold text-white mb-6">Tips for Best Results</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: 'Clear Subject',
                description: 'Use images with a distinct subject and clear edges for best results.'
              },
              {
                title: 'Good Lighting',
                description: 'Well-lit images with good contrast produce cleaner cutouts.'
              },
              {
                title: 'High Resolution',
                description: 'Higher resolution images allow for more precise edge detection.'
              }
            ].map((tip) => (
              <div 
                key={tip.title}
                className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50"
              >
                <h3 className="text-white font-medium mb-2">{tip.title}</h3>
                <p className="text-sm text-slate-400">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
