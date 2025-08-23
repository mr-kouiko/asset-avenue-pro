export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      content_files: {
        Row: {
          created_at: string
          file_format: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_original: boolean | null
          is_preview: boolean | null
          metadata: Json | null
          preview_path: string | null
          submission_id: string | null
          thumbnail_path: string | null
        }
        Insert: {
          created_at?: string
          file_format: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_original?: boolean | null
          is_preview?: boolean | null
          metadata?: Json | null
          preview_path?: string | null
          submission_id?: string | null
          thumbnail_path?: string | null
        }
        Update: {
          created_at?: string
          file_format?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_original?: boolean | null
          is_preview?: boolean | null
          metadata?: Json | null
          preview_path?: string | null
          submission_id?: string | null
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "marketplace_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "public_file_access"
            referencedColumns: ["content_id"]
          },
        ]
      }
      content_submissions: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          created_at: string
          creator_id: string
          description: string
          id: string
          license_id: string | null
          price: number | null
          rejection_reason: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          creator_id: string
          description: string
          id?: string
          license_id?: string | null
          price?: number | null
          rejection_reason?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          license_id?: string | null
          price?: number | null
          rejection_reason?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_submissions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_watermarked: boolean | null
          preview_url: string | null
          price: number | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          is_watermarked?: boolean | null
          preview_url?: string | null
          price?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_watermarked?: boolean | null
          preview_url?: string | null
          price?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      downloads: {
        Row: {
          created_at: string
          download_url: string | null
          downloaded_at: string | null
          expires_at: string | null
          id: string
          license_id: string | null
          submission_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          download_url?: string | null
          downloaded_at?: string | null
          expires_at?: string | null
          id?: string
          license_id?: string | null
          submission_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          download_url?: string | null
          downloaded_at?: string | null
          expires_at?: string | null
          id?: string
          license_id?: string | null
          submission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "marketplace_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "public_file_access"
            referencedColumns: ["content_id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price: number | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number | null
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          store_name: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          store_name?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          store_name?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_audit: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      secure_downloads: {
        Row: {
          content_file_id: string
          created_at: string
          download_token: string
          downloaded_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          content_file_id: string
          created_at?: string
          download_token: string
          downloaded_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          content_file_id?: string
          created_at?: string
          download_token?: string
          downloaded_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_downloads_content_file_id_fkey"
            columns: ["content_file_id"]
            isOneToOne: false
            referencedRelation: "content_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_downloads_content_file_id_fkey"
            columns: ["content_file_id"]
            isOneToOne: false
            referencedRelation: "public_file_access"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_profiles_safe: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          email_masked: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          store_name: string | null
          subscribed: boolean | null
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      marketplace_content: {
        Row: {
          category_id: string | null
          created_at: string | null
          creator_display_name: string | null
          creator_hash: string | null
          creator_store_name: string | null
          description: string | null
          id: string | null
          price_range: string | null
          tags: string[] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      public_creator_profiles: {
        Row: {
          avatar_url: string | null
          creator_hash: string | null
          display_name: string | null
          store_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          creator_hash?: never
          display_name?: string | null
          store_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          creator_hash?: never
          display_name?: string | null
          store_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_file_access: {
        Row: {
          content_id: string | null
          file_format: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          has_thumbnail: boolean | null
          id: string | null
          is_preview: boolean | null
          metadata: Json | null
          public_file_url: string | null
        }
        Relationships: []
      }
      security_audit_summary: {
        Row: {
          event_count: number | null
          event_type: string | null
          first_occurrence: string | null
          last_occurrence: string | null
          target_table: string | null
          unique_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_access_profile_secure: {
        Args: {
          access_reason?: string
          include_sensitive_data?: boolean
          profile_user_id: string
        }
        Returns: {
          avatar_url: string
          country: string
          created_at: string
          display_name: string
          email_masked: string
          id: string
          store_name: string
          subscribed: boolean
          subscription_end: string
          subscription_tier: string
          updated_at: string
          user_id: string
        }[]
      }
      admin_get_full_email: {
        Args: { business_justification: string; profile_user_id: string }
        Returns: string
      }
      check_admin_access_patterns: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_secure_download_token: {
        Args: { content_file_id_param: string; user_id_param?: string }
        Returns: {
          download_token: string
          expires_at: string
        }[]
      }
      generate_secure_download_url: {
        Args: { submission_id_param: string; user_id_param?: string }
        Returns: {
          download_url: string
          expires_at: string
        }[]
      }
      get_creator_public_info: {
        Args: { creator_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          store_name: string
          user_id: string
        }[]
      }
      get_product_detail: {
        Args: { product_id: string }
        Returns: {
          category_id: string
          category_name: string
          created_at: string
          creator_display_name: string
          creator_store_name: string
          description: string
          id: string
          price: number
          tags: string[]
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_admin_profile_access: {
        Args: { accessed_profile_user_id: string; admin_user_id: string }
        Returns: boolean
      }
      user_can_access_profile: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "creator", "client"],
    },
  },
} as const
