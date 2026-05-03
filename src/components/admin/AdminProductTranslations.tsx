import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Languages, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LANGS: Array<{ code: 'fr' | 'es' | 'de' | 'pt'; label: string; flag: string }> = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

export const AdminProductTranslations = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [running, setRunning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const { count: approved } = await supabase
      .from('content_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');
    setApprovedCount(approved ?? 0);

    const next: Record<string, number> = {};
    for (const l of LANGS) {
      const { count } = await supabase
        .from('product_translations')
        .select('id', { count: 'exact', head: true })
        .eq('language', l.code);
      next[l.code] = count ?? 0;
    }
    setCounts(next);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const runBatch = async (lang: string) => {
    setRunning(lang);
    try {
      let totalTranslated = 0;
      let totalFailed = 0;
      // Loop in small chunks to stay within edge function time limits
      for (let i = 0; i < 200; i++) {
        const { data, error } = await supabase.functions.invoke('batch-translate-products', {
          body: { languages: [lang], limit: 15 },
        });
        if (error) throw error;
        const s = (data as any)?.summary?.[lang];
        if (!s) break;
        totalTranslated += s.translated;
        totalFailed += s.failed;
        toast.info(`[${lang}] +${s.translated} translated (total ${totalTranslated})`);
        if (s.translated === 0) break;
      }
      toast.success(`Done [${lang}]: ${totalTranslated} translated, ${totalFailed} failed`);
      await loadStats();
    } catch (e: any) {
      toast.error(e?.message ?? 'Translation failed');
    } finally {
      setRunning(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" /> Product Translations
        </CardTitle>
        <CardDescription>
          Translate approved products into FR / ES / DE / PT using free LibreTranslate (no AI credits used).
          Approved products: <strong>{approvedCount}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        {LANGS.map((l) => {
          const have = counts[l.code] ?? 0;
          const missing = Math.max(0, approvedCount - have);
          const isRunning = running === l.code;
          return (
            <div key={l.code} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{l.flag}</span>
                <div>
                  <p className="font-medium">{l.label}</p>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant="secondary">{have} translated</Badge>{' '}
                    {missing > 0 && <Badge variant="outline">{missing} missing</Badge>}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => runBatch(l.code)}
                disabled={!!running || missing === 0}
                size="sm"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Translating...
                  </>
                ) : missing === 0 ? (
                  'Up to date'
                ) : (
                  `Translate ${missing}`
                )}
              </Button>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground pt-2">
          Tip: translation runs in chunks of 100. The button auto-loops until all approved products are translated.
        </p>
      </CardContent>
    </Card>
  );
};
