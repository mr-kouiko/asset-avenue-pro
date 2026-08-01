import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ArrowLeft, Save, Upload, ExternalLink, Loader2 } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";

const BUCKET = "thumbnails";

interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  author_role: string;
  author_bio: string | null;
  author_avatar: string | null;
  hero_image: string;
  read_time: number;
  seo_title: string | null;
  meta_description: string | null;
  keywords: string[];
  featured: boolean;
  status: string;
  published_at: string;
  updated_at: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const emptyDraft = () => ({
  id: null as string | null,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "General",
  tags: "",
  author: "VisuStock Team",
  author_role: "Editorial Team",
  hero_image: "",
  seo_title: "",
  meta_description: "",
  status: "draft",
  featured: false,
});

type Draft = ReturnType<typeof emptyDraft>;

const estimateReadTime = (html: string) => {
  const words = html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

export const AdminBlogManagement = () => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const inlineResolver = useRef<((url: string | null) => void) | null>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PostRow[];
    },
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `blog/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  const handleHeroUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) setDraft((d) => (d ? { ...d, hero_image: url } : d));
  };

  const requestInlineImage = () =>
    new Promise<string | null>((resolve) => {
      inlineResolver.current = resolve;
      inlineInputRef.current?.click();
    });

  const handleInlineFile = async (file: File | undefined) => {
    const resolve = inlineResolver.current;
    inlineResolver.current = null;
    if (!file) return resolve?.(null);
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    resolve?.(url);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ d, status }: { d: Draft; status: string }) => {
      const payload = {
        title: d.title.trim(),
        slug: (d.slug || slugify(d.title)).trim(),
        excerpt: d.excerpt.trim() || d.meta_description.trim() || d.title.trim(),
        content: d.content,
        category: d.category.trim() || "General",
        tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
        keywords: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
        author: d.author.trim() || "VisuStock Team",
        author_role: d.author_role.trim() || "Editorial Team",
        hero_image: d.hero_image,
        read_time: estimateReadTime(d.content),
        seo_title: d.seo_title.trim() || null,
        meta_description: d.meta_description.trim() || null,
        featured: d.featured,
        status,
        updated_at: new Date().toISOString(),
      };

      if (d.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", d.id);
        if (error) throw error;
        return d.id;
      }
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({ ...payload, published_at: new Date().toISOString() })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.success(vars.status === "published" ? "Article published" : "Draft saved");
      setDraft((d) => (d ? { ...d, id, status: vars.status } : d));
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.success("Article deleted");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  const openEditor = (post?: PostRow) => {
    setSlugTouched(!!post);
    setDraft(
      post
        ? {
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt ?? "",
            content: post.content ?? "",
            category: post.category ?? "General",
            tags: (post.tags ?? []).join(", "),
            author: post.author ?? "VisuStock Team",
            author_role: post.author_role ?? "Editorial Team",
            hero_image: post.hero_image ?? "",
            seo_title: post.seo_title ?? "",
            meta_description: post.meta_description ?? "",
            status: post.status,
            featured: post.featured,
          }
        : emptyDraft()
    );
  };

  const canSave = useMemo(
    () => !!draft && draft.title.trim().length > 2 && draft.content.replace(/<[^>]*>/g, "").trim().length > 0,
    [draft]
  );

  const hiddenInputs = (
    <>
      <input
        ref={heroInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) handleHeroUpload(f);
        }}
      />
      <input
        ref={inlineInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          handleInlineFile(f);
        }}
      />
    </>
  );

  // ---------- Editor view ----------
  if (draft) {
    return (
      <div className="space-y-6">
        {hiddenInputs}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setDraft(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to articles
          </Button>
          <div className="flex items-center gap-2">
            {draft.id && (
              <Button variant="outline" asChild>
                <a href={`/blog/${draft.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> View
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              disabled={!canSave || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ d: draft, status: "draft" })}
            >
              <Save className="mr-2 h-4 w-4" /> Save draft
            </Button>
            <Button
              disabled={!canSave || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ d: draft, status: "published" })}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                value={draft.title}
                placeholder="How to license stock footage"
                onChange={(e) => {
                  const title = e.target.value;
                  setDraft((d) =>
                    d ? { ...d, title, slug: slugTouched ? d.slug : slugify(title) } : d
                  );
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-slug">Slug</Label>
              <Input
                id="post-slug"
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setDraft((d) => (d ? { ...d, slug: slugify(e.target.value) } : d));
                }}
              />
              <p className="text-xs text-muted-foreground">https://visustock.com/blog/{draft.slug || "…"}</p>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                value={draft.content}
                onChange={(html) => setDraft((d) => (d ? { ...d, content: html } : d))}
                onRequestImage={requestInlineImage}
              />
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Featured image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.hero_image ? (
                  <img
                    src={draft.hero_image}
                    alt="Featured image preview"
                    className="aspect-video w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    No image
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => heroInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload image
                </Button>
                <Input
                  value={draft.hero_image}
                  placeholder="or paste an image URL"
                  onChange={(e) => setDraft((d) => (d ? { ...d, hero_image: e.target.value } : d))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SEO</CardTitle>
                <CardDescription>Canonical, Open Graph, BlogPosting schema, sitemap and prerendering are handled automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="seo-title">SEO title</Label>
                  <Input
                    id="seo-title"
                    value={draft.seo_title}
                    maxLength={70}
                    onChange={(e) => setDraft((d) => (d ? { ...d, seo_title: e.target.value } : d))}
                  />
                  <p className="text-xs text-muted-foreground">{draft.seo_title.length}/60 recommended</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-desc">Meta description</Label>
                  <Textarea
                    id="meta-desc"
                    rows={3}
                    maxLength={200}
                    value={draft.meta_description}
                    onChange={(e) => setDraft((d) => (d ? { ...d, meta_description: e.target.value } : d))}
                  />
                  <p className="text-xs text-muted-foreground">{draft.meta_description.length}/155 recommended</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    rows={3}
                    value={draft.excerpt}
                    onChange={(e) => setDraft((d) => (d ? { ...d, excerpt: e.target.value } : d))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={draft.category}
                    onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={draft.tags}
                    onChange={(e) => setDraft((d) => (d ? { ...d, tags: e.target.value } : d))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={draft.author}
                    onChange={(e) => setDraft((d) => (d ? { ...d, author: e.target.value } : d))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author-role">Author role</Label>
                  <Input
                    id="author-role"
                    value={draft.author_role}
                    onChange={(e) => setDraft((d) => (d ? { ...d, author_role: e.target.value } : d))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------- List view ----------
  return (
    <div className="space-y-6">
      {hiddenInputs}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Blog management</CardTitle>
            <CardDescription>Create, edit and publish articles on /blog</CardDescription>
          </div>
          <Button onClick={() => openEditor()}>
            <Plus className="mr-2 h-4 w-4" /> New article
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !posts?.length ? (
            <p className="py-10 text-center text-muted-foreground">No articles yet. Create your first one.</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
                  {post.hero_image ? (
                    <img src={post.hero_image} alt={post.title} className="h-14 w-24 rounded object-cover" />
                  ) : (
                    <div className="h-14 w-24 rounded bg-muted" />
                  )}
                  <div className="min-w-[200px] flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{post.title}</h4>
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>
                        {post.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      /blog/{post.slug} · {new Date(post.published_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditor(post)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleteId(post.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the article and its /blog page. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBlogManagement;
