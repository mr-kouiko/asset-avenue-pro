import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  author_role: string;
  author_avatar: string | null;
  author_bio: string | null;
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

export const useBlogPosts = () => {
  return useQuery({
    queryKey: ["blog-posts"],
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useBlogPost = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["blog-post", slug],
    enabled: !!slug,
    queryFn: async (): Promise<BlogPost | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return (data as BlogPost) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
};
