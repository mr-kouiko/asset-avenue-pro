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
      ai_image_generations: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          prompt: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      album_photos: {
        Row: {
          album_id: string
          created_at: string
          id: string
          order_index: number | null
          photo_name: string
          photo_url: string
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: string
          order_index?: number | null
          photo_name: string
          photo_url: string
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: string
          order_index?: number | null
          photo_name?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          price: number | null
          price_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          price?: number | null
          price_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          price?: number | null
          price_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          file_hash: string | null
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
          file_hash?: string | null
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
          file_hash?: string | null
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
          original_language: string | null
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
          original_language?: string | null
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
          original_language?: string | null
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
        ]
      }
      file_uploads: {
        Row: {
          bucket_name: string | null
          created_at: string
          file_name: string
          file_path: string | null
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          public_url: string
          storage_location: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bucket_name?: string | null
          created_at?: string
          file_name: string
          file_path?: string | null
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          public_url: string
          storage_location: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bucket_name?: string | null
          created_at?: string
          file_name?: string
          file_path?: string | null
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          public_url?: string
          storage_location?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      payments: {
        Row: {
          album_id: string
          amount: number
          buyer_email: string
          buyer_name: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          id: string
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          album_id: string
          amount: number
          buyer_email: string
          buyer_name?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          album_id?: string
          amount?: number
          buyer_email?: string
          buyer_name?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          status?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          arrival_date: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          method: string | null
          seller_id: string
          status: string
          stripe_account_id: string
          stripe_payout_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          arrival_date?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          method?: string | null
          seller_id: string
          status?: string
          stripe_account_id: string
          stripe_payout_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          arrival_date?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          method?: string | null
          seller_id?: string
          status?: string
          stripe_account_id?: string
          stripe_payout_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          ai_auto_generate_enabled: boolean
          ai_model: string
          ai_provider: string
          commission_rate: number
          created_at: string
          id: string
          stripe_application_fee_rate: number
          updated_at: string
        }
        Insert: {
          ai_auto_generate_enabled?: boolean
          ai_model?: string
          ai_provider?: string
          commission_rate?: number
          created_at?: string
          id?: string
          stripe_application_fee_rate?: number
          updated_at?: string
        }
        Update: {
          ai_auto_generate_enabled?: boolean
          ai_model?: string
          ai_provider?: string
          commission_rate?: number
          created_at?: string
          id?: string
          stripe_application_fee_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_translations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          language: string
          product_id: string
          tags: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          language: string
          product_id: string
          tags?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          language?: string
          product_id?: string
          tags?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      stripe_accounts: {
        Row: {
          account_type: string
          charges_enabled: boolean
          created_at: string
          id: string
          onboarding_completed: boolean
          payouts_enabled: boolean
          requirements: Json | null
          stripe_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          charges_enabled?: boolean
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          payouts_enabled?: boolean
          requirements?: Json | null
          stripe_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          charges_enabled?: boolean
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          payouts_enabled?: boolean
          requirements?: Json | null
          stripe_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_commission: number
          amount_seller: number
          amount_total: number
          buyer_id: string
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_method_types: string[]
          seller_id: string
          status: string
          stripe_account_id: string
          stripe_payment_intent_id: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          amount_commission: number
          amount_seller: number
          amount_total: number
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method_types?: string[]
          seller_id: string
          status?: string
          stripe_account_id: string
          stripe_payment_intent_id: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          amount_commission?: number
          amount_seller?: number
          amount_total?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method_types?: string[]
          seller_id?: string
          status?: string
          stripe_account_id?: string
          stripe_payment_intent_id?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          created_at: string
          file_hash: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_watermarked: boolean | null
          preview_url: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_hash?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          is_watermarked?: boolean | null
          preview_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_hash?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_watermarked?: boolean | null
          preview_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          credits_balance: number
          id: string
          total_purchased: number
          total_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_balance?: number
          id?: string
          total_purchased?: number
          total_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_balance?: number
          id?: string
          total_purchased?: number
          total_used?: number
          updated_at?: string
          user_id?: string
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
      creator_profiles_public: {
        Row: {
          avatar_url: string | null
          creator_hash: string | null
          display_name: string | null
          store_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_user_credits: {
        Args: { amount_param: number; user_id_param: string }
        Returns: boolean
      }
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
      admin_get_dashboard_stats: {
        Args: never
        Returns: {
          approved_submissions: number
          pending_submissions: number
          rejected_submissions: number
          total_revenue: number
          total_submissions: number
          total_users: number
        }[]
      }
      admin_get_full_email: {
        Args: { business_justification: string; profile_user_id: string }
        Returns: string
      }
      admin_get_platform_settings: {
        Args: never
        Returns: {
          ai_auto_generate_enabled: boolean
          ai_model: string
          ai_provider: string
          commission_rate: number
          created_at: string
          id: string
          stripe_application_fee_rate: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_settings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_profile_email_emergency: {
        Args: {
          business_justification: string
          emergency_reason: string
          profile_user_id: string
        }
        Returns: string
      }
      admin_get_profile_safe: {
        Args: { profile_user_id: string }
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
      admin_update_platform_settings: {
        Args: {
          new_commission_rate?: number
          new_stripe_application_fee_rate?: number
          new_stripe_publishable_key?: string
          new_stripe_secret_key?: string
          new_stripe_webhook_secret?: string
        }
        Returns: boolean
      }
      check_admin_access_patterns: { Args: never; Returns: undefined }
      check_file_duplicate: {
        Args: { hash_value: string }
        Returns: {
          duplicate_file_name: string
          duplicate_user_id: string
          exists_in_content: boolean
          exists_in_uploaded: boolean
        }[]
      }
      create_secure_download_token: {
        Args: { content_file_id_param: string; user_id_param?: string }
        Returns: {
          download_token: string
          expires_at: string
        }[]
      }
      deduct_user_credit: {
        Args: { cost_param?: number; user_id_param: string }
        Returns: boolean
      }
      get_admin_profiles_safe: {
        Args: never
        Returns: {
          avatar_url: string
          country: string
          created_at: string
          display_name: string
          email_masked: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          store_name: string
          subscribed: boolean
          subscription_end: string
          subscription_tier: string
          updated_at: string
          user_id: string
        }[]
      }
      get_creator_profiles_public:
        | {
            Args: { creator_ids: string[] }
            Returns: {
              avatar_url: string
              creator_hash: string
              display_name: string
              store_name: string
              user_id: string
            }[]
          }
        | {
            Args: never
            Returns: {
              avatar_url: string
              creator_hash: string
              display_name: string
              store_name: string
              user_id: string
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
      get_marketplace_content: {
        Args: never
        Returns: {
          category_id: string
          category_name: string
          content_type: string
          created_at: string
          creator_display_name: string
          creator_hash: string
          creator_store_name: string
          description: string
          id: string
          price: number
          tags: string[]
          title: string
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
      get_product_files: {
        Args: { content_id: string }
        Returns: {
          created_at: string
          file_format: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_original: boolean
          is_preview: boolean
          metadata: Json
          preview_path: string
          submission_id: string
          thumbnail_path: string
        }[]
      }
      get_public_file_access: {
        Args: never
        Returns: {
          content_id: string
          file_format: string
          file_name: string
          file_size: number
          file_type: string
          has_thumbnail: boolean
          id: string
          is_preview: boolean
          metadata: Json
          public_file_url: string
        }[]
      }
      get_security_audit_summary: {
        Args: never
        Returns: {
          event_count: number
          event_type: string
          first_occurrence: string
          last_occurrence: string
          target_table: string
          unique_users: number
        }[]
      }
      get_security_audit_summary_admin: {
        Args: never
        Returns: {
          event_count: number
          event_type: string
          first_occurrence: string
          last_occurrence: string
          target_table: string
          unique_users: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      log_admin_profile_access: {
        Args: { accessed_profile_user_id: string; admin_user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: { details_param?: Json; event_type_param: string }
        Returns: undefined
      }
      log_sensitive_access: {
        Args: { access_type: string; details?: Json; target_resource: string }
        Returns: boolean
      }
      mark_download_token_used: {
        Args: { token_param: string }
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
