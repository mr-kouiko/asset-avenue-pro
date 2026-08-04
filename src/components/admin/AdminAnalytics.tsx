import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Download, ImageIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Bucket = { today: number; week: number; month: number; total: number };

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfWeek = () => {
  const d = startOfToday();
  d.setDate(d.getDate() - 7);
  return d;
};
const startOfMonth = () => {
  const d = startOfToday();
  d.setDate(d.getDate() - 30);
  return d;
};

const bucketize = <T extends { created_at?: string | null; downloaded_at?: string | null }>(
  rows: T[],
  dateKey: "created_at" | "downloaded_at"
): Bucket => {
  const today = startOfToday().getTime();
  const week = startOfWeek().getTime();
  const month = startOfMonth().getTime();
  const b: Bucket = { today: 0, week: 0, month: 0, total: rows.length };
  for (const r of rows) {
    const raw = r[dateKey] as string | null | undefined;
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (t >= today) b.today++;
    if (t >= week) b.week++;
    if (t >= month) b.month++;
  }
  return b;
};

const StatCard = ({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

// ============ AI EDIT ============
type AiRow = {
  id: string;
  user_id: string;
  prompt: string;
  image_url: string | null;
  source_image_url: string | null;
  action: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

const AiEditAnalytics = () => {
  const [rows, setRows] = useState<AiRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { email: string; name: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("ai_image_generations")
        .select("id,user_id,prompt,image_url,source_image_url,action,status,error_message,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) {
        console.error("[analytics] ai_image_generations read failed", error);
        setLoadError(`${error.message}${error.code ? ` (${error.code})` : ""}`);
      }
      const list = (data as AiRow[]) || [];
      console.info("[analytics] ai_image_generations rows loaded:", list.length);
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
      if (ids.length) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("user_id,email,display_name")
          .in("user_id", ids);
        if (profErr) console.warn("[analytics] profiles read failed", profErr);
        const map: Record<string, { email: string; name: string | null }> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = { email: p.email, name: p.display_name };
        });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [reloadKey]);

  const stats = useMemo(() => bucketize(rows, "created_at"), [rows]);
  const successCount = rows.filter((r) => r.status === "success").length;
  const failureCount = rows.filter((r) => r.status === "failure").length;
  const blockedCount = rows.filter((r) => r.status === "blocked").length;


  const topUsers = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      counts[r.user_id] = (counts[r.user_id] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const p = profiles[r.user_id];
      return (
        (p?.email || "").toLowerCase().includes(q) ||
        (p?.name || "").toLowerCase().includes(q) ||
        (r.prompt || "").toLowerCase().includes(q) ||
        (r.action || "").toLowerCase().includes(q)
      );
    });
  }, [rows, profiles, search, statusFilter]);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Could not read AI edit events</CardTitle>
            <CardDescription>{loadError} — check that your account has the admin role.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total uses" value={stats.total} icon={Sparkles} />
        <StatCard label="Today" value={stats.today} icon={Sparkles} />
        <StatCard label="Last 7 days" value={stats.week} icon={Sparkles} />
        <StatCard label="Last 30 days" value={stats.month} icon={Sparkles} />
        <StatCard label="Success" value={successCount} icon={CheckCircle2} />
        <StatCard label="Failure" value={failureCount} icon={XCircle} />
        <StatCard label="Blocked (no credits)" value={blockedCount} icon={XCircle} />
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Most active users</CardTitle>
          <CardDescription>Top 10 users by AI edits</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Uses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsers.map(([uid, count]) => (
                <TableRow key={uid}>
                  <TableCell>{profiles[uid]?.email || uid}</TableCell>
                  <TableCell>{profiles[uid]?.name || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full history</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Input
              placeholder="Search email, name, prompt, action…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success only</SelectItem>
                <SelectItem value="failure">Failure only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 300).map((r) => {
                  const p = profiles[r.user_id];
                  const thumb = r.image_url || r.source_image_url;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>{p?.name || "—"}</TableCell>
                      <TableCell className="text-xs">{p?.email || r.user_id.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="outline">{r.action || "prompt"}</Badge></TableCell>
                      <TableCell>
                        {thumb ? (
                          <a href={thumb} target="_blank" rel="noreferrer">
                            <img src={thumb} alt="" className="h-10 w-10 object-cover rounded" />
                          </a>
                        ) : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        {r.status === "success" ? (
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">Success</Badge>
                        ) : (
                          <Badge variant="destructive" title={r.error_message || undefined}>Failure</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length > 300 && (
              <p className="text-xs text-muted-foreground mt-2">Showing 300 of {filtered.length} rows.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ MARKETPLACE DOWNLOADS ============
type DlRow = {
  id: string;
  user_id: string;
  submission_id: string | null;
  downloaded_at: string | null;
  created_at: string;
};

const MarketplaceDownloadsAnalytics = () => {
  const [rows, setRows] = useState<DlRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { email: string; name: string | null }>>({});
  const [products, setProducts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("downloads")
        .select("id,user_id,submission_id,downloaded_at,created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      const list = (data as DlRow[]) || [];
      setRows(list);

      const uids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
      const sids = Array.from(new Set(list.map((r) => r.submission_id).filter(Boolean))) as string[];
      if (uids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("user_id,email,display_name").in("user_id", uids);
        const map: Record<string, { email: string; name: string | null }> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = { email: p.email, name: p.display_name }; });
        setProfiles(map);
      }
      if (sids.length) {
        const { data: subs } = await supabase
          .from("content_submissions").select("id,title").in("id", sids);
        const map: Record<string, string> = {};
        (subs || []).forEach((s: any) => { map[s.id] = s.title; });
        setProducts(map);
      }
      setLoading(false);
    })();
  }, []);

  const dated = useMemo(() => rows.map((r) => ({ ...r, ts: r.downloaded_at || r.created_at })), [rows]);
  const stats = useMemo(() => bucketize(dated as any, "ts" as any), [dated]);

  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { if (r.submission_id) counts[r.submission_id] = (counts[r.submission_id] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  const topUsers = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total downloads" value={stats.total} icon={Download} />
        <StatCard label="Today" value={stats.today} icon={Download} />
        <StatCard label="Last 7 days" value={stats.week} icon={Download} />
        <StatCard label="Last 30 days" value={stats.month} icon={Download} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Most downloaded products</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Downloads</TableHead></TableRow></TableHeader>
              <TableBody>
                {topProducts.map(([sid, count]) => (
                  <TableRow key={sid}>
                    <TableCell className="text-sm">{products[sid] || sid.slice(0, 8)}</TableCell>
                    <TableCell className="text-right font-medium">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Most active users</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead className="text-right">Downloads</TableHead></TableRow></TableHeader>
              <TableBody>
                {topUsers.map(([uid, count]) => (
                  <TableRow key={uid}>
                    <TableCell className="text-sm">{profiles[uid]?.email || uid.slice(0, 8)}</TableCell>
                    <TableCell className="text-right font-medium">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ============ PEXELS DOWNLOADS ============
type PexRow = {
  id: string;
  user_id: string;
  pexels_id: number;
  media_type: string;
  author: string | null;
  downloaded_at: string;
};

const PexelsDownloadsAnalytics = () => {
  const [rows, setRows] = useState<PexRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { email: string; name: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pexels_downloads")
        .select("id,user_id,pexels_id,media_type,author,downloaded_at")
        .order("downloaded_at", { ascending: false })
        .limit(2000);
      const list = (data as PexRow[]) || [];
      setRows(list);
      const uids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
      if (uids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("user_id,email,display_name").in("user_id", uids);
        const map: Record<string, { email: string; name: string | null }> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = { email: p.email, name: p.display_name }; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => bucketize(rows, "downloaded_at"), [rows]);

  const topAssets = useMemo(() => {
    const counts: Record<string, { count: number; author: string | null; type: string }> = {};
    rows.forEach((r) => {
      const key = String(r.pexels_id);
      if (!counts[key]) counts[key] = { count: 0, author: r.author, type: r.media_type };
      counts[key].count++;
    });
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  }, [rows]);

  const topUsers = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total downloads" value={stats.total} icon={Download} />
        <StatCard label="Today" value={stats.today} icon={Download} />
        <StatCard label="Last 7 days" value={stats.week} icon={Download} />
        <StatCard label="Last 30 days" value={stats.month} icon={Download} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Most downloaded Pexels assets</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pexels ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAssets.map(([pid, info]) => (
                  <TableRow key={pid}>
                    <TableCell className="text-sm">
                      <a href={`https://www.pexels.com/${info.type === "video" ? "video" : "photo"}/${pid}`} target="_blank" rel="noreferrer" className="underline">
                        {pid}
                      </a>
                    </TableCell>
                    <TableCell><Badge variant="outline">{info.type}</Badge></TableCell>
                    <TableCell className="text-sm">{info.author || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{info.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Most active users</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead className="text-right">Downloads</TableHead></TableRow></TableHeader>
              <TableBody>
                {topUsers.map(([uid, count]) => (
                  <TableRow key={uid}>
                    <TableCell className="text-sm">{profiles[uid]?.email || uid.slice(0, 8)}</TableCell>
                    <TableCell className="text-right font-medium">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ============ MAIN ============
export const AdminAnalytics = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-muted-foreground text-sm">Usage insights for AI edits and downloads.</p>
      </div>

      <Tabs defaultValue="ai-edit">
        <TabsList>
          <TabsTrigger value="ai-edit"><Sparkles className="h-4 w-4 mr-1" /> AI Edit</TabsTrigger>
          <TabsTrigger value="marketplace"><Download className="h-4 w-4 mr-1" /> Marketplace</TabsTrigger>
          <TabsTrigger value="pexels"><Download className="h-4 w-4 mr-1" /> Pexels</TabsTrigger>
        </TabsList>
        <TabsContent value="ai-edit" className="mt-4"><AiEditAnalytics /></TabsContent>
        <TabsContent value="marketplace" className="mt-4"><MarketplaceDownloadsAnalytics /></TabsContent>
        <TabsContent value="pexels" className="mt-4"><PexelsDownloadsAnalytics /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;
