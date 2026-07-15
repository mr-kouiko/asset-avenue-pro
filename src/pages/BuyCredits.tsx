import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Check, Zap, Wallet, Video } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';

interface Pack {
  id: string;
  name: string;
  credits: number;
  price: number; // USD
  popular?: boolean;
  features: string[];
  badge?: string;
}

const IMAGE_PACKS: Pack[] = [
  { id: 'starter', name: 'Starter Pack', credits: 10, price: 1.99, features: ['10 image generations', 'Standard quality', 'Email support'] },
  { id: 'pro', name: 'Pro Pack', credits: 50, price: 7.99, popular: true, badge: 'Most Popular', features: ['50 image generations', 'Professional quality', 'Priority support', 'Save 20%'] },
  { id: 'premium', name: 'Premium Pack', credits: 100, price: 12.99, features: ['100 image generations', 'Top quality', 'Dedicated support', 'Save 35%'] },
  { id: 'ultimate', name: 'Ultimate Pack', credits: 500, price: 49.99, features: ['500 image generations', 'Premium quality', '24/7 VIP support', 'Best value — 50% off'] },
];

const VIDEO_PACKS: Pack[] = [
  { id: 'starter', name: 'Starter', credits: 500, price: 20, features: ['~5 video generations', 'Text-to-video', 'Native audio', 'Credits valid 1 year'] },
  { id: 'popular', name: 'Popular', credits: 2000, price: 75, popular: true, badge: '6% off', features: ['~20 video generations', 'Text-to-video', 'Native audio', 'Credits valid 1 year'] },
  { id: 'pro', name: 'Pro', credits: 6000, price: 220, badge: '8% off', features: ['~60 video generations', 'Text-to-video', 'Native audio', 'Credits valid 1 year'] },
];

export default function BuyCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') === 'videoai' ? 'videoai' : 'image';
  const [tab, setTab] = useState<'image' | 'videoai'>(initialTab);

  const [imageBalance, setImageBalance] = useState<number | null>(null);
  const [videoBalance, setVideoBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useSEO({
    title: 'Buy Credits — AI Images & VideoAI | VisuStock',
    description: 'Buy AI Image credits or VideoAI credits. No subscription, pay only for what you create. Powered by Google Veo 3 and the Lovable AI Gateway.',
    type: 'website',
  });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchBalances();
  }, [user]);

  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Payment canceled', description: 'No amount was charged.', variant: 'destructive' });
    }
  }, [searchParams, toast]);

  const fetchBalances = async () => {
    if (!user) return;
    const [{ data: img }, { data: vid }] = await Promise.all([
      supabase.from('user_credits').select('credits_balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('videoai_credits').select('credits_balance').eq('user_id', user.id).maybeSingle(),
    ]);
    setImageBalance(img?.credits_balance ?? 0);
    setVideoBalance(vid?.credits_balance ?? 0);
  };

  const handlePurchase = async (pack: Pack, type: 'image' | 'videoai') => {
    if (!user) { navigate('/auth'); return; }
    setIsLoading(`${type}-${pack.id}`);
    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          order_type: type === 'image' ? 'credits' : 'videoai_credits',
          pack: pack.id,
          credits: pack.credits,
          amount: pack.price,
          success_url: `${window.location.origin}/payment-success?type=${type === 'image' ? 'credits' : 'videoai_credits'}`,
          cancel_url: `${window.location.origin}/buy-credits?tab=${type === 'image' ? 'image' : 'videoai'}&canceled=true`,
        },
      });
      if (error) throw error;
      if (data?.approval_url) {
        toast({ title: 'Redirecting to PayPal', description: 'Complete your payment to receive credits.' });
        window.location.href = data.approval_url;
      } else {
        throw new Error('No PayPal checkout URL received');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Unable to create payment session.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  };

  const renderPacks = (packs: Pack[], type: 'image' | 'videoai') => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {packs.map((pack) => {
        const Icon = type === 'image' ? (pack.popular ? Zap : Sparkles) : Video;
        const loading = isLoading === `${type}-${pack.id}`;
        return (
          <Card key={pack.id} className={`relative ${pack.popular ? 'border-primary shadow-lg lg:scale-105' : ''}`}>
            {pack.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">{pack.badge}</span>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-8 h-8 text-primary" />
                <div className="text-right">
                  <div className="text-3xl font-bold">${pack.price}</div>
                </div>
              </div>
              <CardTitle className="text-xl">{pack.name}</CardTitle>
              <CardDescription className="text-lg font-semibold text-foreground">
                {pack.credits.toLocaleString()} credits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pack.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full ${pack.popular ? 'bg-[#0070ba] hover:bg-[#003087]' : ''}`}
                variant={pack.popular ? 'default' : 'outline'}
                onClick={() => handlePurchase(pack, type)}
                disabled={isLoading !== null}
              >
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>) : (<><Wallet className="w-4 h-4 mr-2" /> Buy Now</>)}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Buy Credits
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No subscription. Pay only for what you create. Choose AI Image credits or VideoAI credits below.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'image' | 'videoai')} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList>
              <TabsTrigger value="image" className="gap-2"><Sparkles className="w-4 h-4" /> AI Image Credits</TabsTrigger>
              <TabsTrigger value="videoai" className="gap-2"><Video className="w-4 h-4" /> VideoAI Credits</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="image" className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                Current balance: <span className="font-semibold">{imageBalance ?? '…'} credits</span>
              </div>
            </div>
            {renderPacks(IMAGE_PACKS, 'image')}
          </TabsContent>

          <TabsContent value="videoai" className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
                <Video className="w-4 h-4 text-primary" />
                VideoAI balance: <span className="font-semibold">{videoBalance ?? '…'} credits</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
                Powered by Google Veo 3. A typical 8s 1080p video with audio uses 100 credits, and an 8s 720p Veo 3 Fast video uses about 32 credits.
              </p>
            </div>
            {renderPacks(VIDEO_PACKS, 'videoai')}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
