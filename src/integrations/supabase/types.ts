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
      ai_video_generations: {
        Row: {
          aspect_ratio: string
          audio: boolean
          created_at: string
          credits_spent: number
          duration: number
          error_message: string | null
          id: string
          model: string
          prompt: string
          resolution: number
          status: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio: string
          audio?: boolean
          created_at?: string
          credits_spent: number
          duration: number
          error_message?: string | null
          id?: string
          model: string
          prompt: string
          resolution: number
          status?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string
          audio?: boolean
          created_at?: string
          credits_spent?: number
          duration?: number
          error_message?: string | null
          id?: string
          model?: string
          prompt?: string
          resolution?: number
          status?: string
          user_id?: string
          video_url?: string | null
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
          preview_attempts: number
          preview_failure_reason: string | null
          preview_last_attempt_at: string | null
          preview_last_error: string | null
          preview_path: string | null
          preview_quality: string | null
          preview_status: string | null
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
          preview_attempts?: number
          preview_failure_reason?: string | null
          preview_last_attempt_at?: string | null
          preview_last_error?: string | null
          preview_path?: string | null
          preview_quality?: string | null
          preview_status?: string | null
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
          preview_attempts?: number
          preview_failure_reason?: string | null
          preview_last_attempt_at?: string | null
          preview_last_error?: string | null
          preview_path?: string | null
          preview_quality?: string | null
          preview_status?: string | null
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
      content_likes: {
        Row: {
          created_at: string | null
          id: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_likes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reporter_email: string | null
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reporter_email?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_email?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_submission_id_fkey"
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
          ai_declaration: string | null
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
          slug: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          ai_declaration?: string | null
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
          slug?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          ai_declaration?: string | null
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
          slug?: string | null
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
      detection_results: {
        Row: {
          ai_score: number | null
          content_submission_id: string
          created_at: string
          deepfake_score: number | null
          detection_score: number
          detection_status: string
          final_confidence: number
          id: string
          indicators: string[] | null
          model_used: string
          quality_score: number | null
          raw_response: Json | null
          reasoning: string | null
        }
        Insert: {
          ai_score?: number | null
          content_submission_id: string
          created_at?: string
          deepfake_score?: number | null
          detection_score: number
          detection_status?: string
          final_confidence: number
          id?: string
          indicators?: string[] | null
          model_used?: string
          quality_score?: number | null
          raw_response?: Json | null
          reasoning?: string | null
        }
        Update: {
          ai_score?: number | null
          content_submission_id?: string
          created_at?: string
          deepfake_score?: number | null
          detection_score?: number
          detection_status?: string
          final_confidence?: number
          id?: string
          indicators?: string[] | null
          model_used?: string
          quality_score?: number | null
          raw_response?: Json | null
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detection_results_content_submission_id_fkey"
            columns: ["content_submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
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
      integrity_issues: {
        Row: {
          age_hours: number | null
          bucket_name: string | null
          created_at: string
          description: string
          detected_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          issue_type: string
          record_id: string | null
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          scan_id: string | null
          severity: string
          status: string
          table_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          age_hours?: number | null
          bucket_name?: string | null
          created_at?: string
          description: string
          detected_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          issue_type: string
          record_id?: string | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_id?: string | null
          severity?: string
          status?: string
          table_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          age_hours?: number | null
          bucket_name?: string | null
          created_at?: string
          description?: string
          detected_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          issue_type?: string
          record_id?: string | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_id?: string | null
          severity?: string
          status?: string
          table_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrity_issues_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "integrity_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_scanner_config: {
        Row: {
          admin_email_notifications: boolean
          enabled: boolean
          id: string
          max_issues_before_alert: number
          notify_on_critical: boolean
          scan_interval_minutes: number
          stuck_upload_timeout_hours: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_email_notifications?: boolean
          enabled?: boolean
          id?: string
          max_issues_before_alert?: number
          notify_on_critical?: boolean
          scan_interval_minutes?: number
          stuck_upload_timeout_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_email_notifications?: boolean
          enabled?: boolean
          id?: string
          max_issues_before_alert?: number
          notify_on_critical?: boolean
          scan_interval_minutes?: number
          stuck_upload_timeout_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      integrity_scans: {
        Row: {
          admin_id: string | null
          broken_records_count: number | null
          buckets_scanned: string[] | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          orphaned_files_count: number | null
          scan_duration_ms: number | null
          started_at: string
          status: string
          stuck_uploads_count: number | null
          total_db_records: number | null
          total_storage_files: number | null
          triggered_by: string | null
        }
        Insert: {
          admin_id?: string | null
          broken_records_count?: number | null
          buckets_scanned?: string[] | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          orphaned_files_count?: number | null
          scan_duration_ms?: number | null
          started_at?: string
          status?: string
          stuck_uploads_count?: number | null
          total_db_records?: number | null
          total_storage_files?: number | null
          triggered_by?: string | null
        }
        Update: {
          admin_id?: string | null
          broken_records_count?: number | null
          buckets_scanned?: string[] | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          orphaned_files_count?: number | null
          scan_duration_ms?: number | null
          started_at?: string
          status?: string
          stuck_uploads_count?: number | null
          total_db_records?: number | null
          total_storage_files?: number | null
          triggered_by?: string | null
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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
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
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          earnings_count: number
          id: string
          paid_at: string | null
          paypal_email: string
          paypal_payout_batch_id: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          earnings_count?: number
          id?: string
          paid_at?: string | null
          paypal_email: string
          paypal_payout_batch_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          earnings_count?: number
          id?: string
          paid_at?: string | null
          paypal_email?: string
          paypal_payout_batch_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      paypal_orders: {
        Row: {
          amount: number
          cart_items: Json | null
          created_at: string
          credits_amount: number | null
          currency: string
          id: string
          order_type: string
          pack_type: string | null
          paypal_order_id: string
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          cart_items?: Json | null
          created_at?: string
          credits_amount?: number | null
          currency?: string
          id?: string
          order_type: string
          pack_type?: string | null
          paypal_order_id: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cart_items?: Json | null
          created_at?: string
          credits_amount?: number | null
          currency?: string
          id?: string
          order_type?: string
          pack_type?: string | null
          paypal_order_id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      paypal_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          paypal_event_id: string
          processed_at: string | null
          resource_id: string | null
          resource_type: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          paypal_event_id: string
          processed_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          paypal_event_id?: string
          processed_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string
        }
        Relationships: []
      }
      pexels_downloads: {
        Row: {
          author: string | null
          downloaded_at: string
          id: string
          media_type: string
          pexels_id: number
          user_id: string
        }
        Insert: {
          author?: string | null
          downloaded_at?: string
          id?: string
          media_type: string
          pexels_id: number
          user_id: string
        }
        Update: {
          author?: string | null
          downloaded_at?: string
          id?: string
          media_type?: string
          pexels_id?: number
          user_id?: string
        }
        Relationships: []
      }
      pexels_seo_content: {
        Row: {
          about_section: Json | null
          created_at: string
          h1: string | null
          internal_links: Json | null
          intro: string | null
          keywords: string[] | null
          main_content: string | null
          meta_description: string | null
          pexels_id: number
          seo_title: string | null
          type: string
          use_cases: string[] | null
          visual_style: string[] | null
        }
        Insert: {
          about_section?: Json | null
          created_at?: string
          h1?: string | null
          internal_links?: Json | null
          intro?: string | null
          keywords?: string[] | null
          main_content?: string | null
          meta_description?: string | null
          pexels_id: number
          seo_title?: string | null
          type?: string
          use_cases?: string[] | null
          visual_style?: string[] | null
        }
        Update: {
          about_section?: Json | null
          created_at?: string
          h1?: string | null
          internal_links?: Json | null
          intro?: string | null
          keywords?: string[] | null
          main_content?: string | null
          meta_description?: string | null
          pexels_id?: number
          seo_title?: string | null
          type?: string
          use_cases?: string[] | null
          visual_style?: string[] | null
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
          creator_integrity_score: number
          creator_mismatch_count: number
          display_name: string | null
          email: string
          id: string
          paypal_email: string | null
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
          creator_integrity_score?: number
          creator_mismatch_count?: number
          display_name?: string | null
          email: string
          id?: string
          paypal_email?: string | null
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
          creator_integrity_score?: number
          creator_mismatch_count?: number
          display_name?: string | null
          email?: string
          id?: string
          paypal_email?: string | null
          store_name?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          content: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified_purchase: boolean | null
          rating: number
          submission_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          rating: number
          submission_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          rating?: number
          submission_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      seller_earnings: {
        Row: {
          available_at: string | null
          buyer_id: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          currency: string
          gross_amount: number
          id: string
          net_amount: number
          payout_id: string | null
          payout_request_id: string | null
          paypal_order_id: string | null
          seller_id: string
          source: string
          status: string
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          available_at?: string | null
          buyer_id?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string
          currency?: string
          gross_amount: number
          id?: string
          net_amount: number
          payout_id?: string | null
          payout_request_id?: string | null
          paypal_order_id?: string | null
          seller_id: string
          source?: string
          status?: string
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          available_at?: string | null
          buyer_id?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          payout_id?: string | null
          payout_request_id?: string | null
          paypal_order_id?: string | null
          seller_id?: string
          source?: string
          status?: string
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_earnings_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audit_log: {
        Row: {
          action_type: string
          admin_id: string
          after_state: Json | null
          before_state: Json | null
          changes_summary: string | null
          created_at: string | null
          credits_used: number | null
          id: string
          ip_address: unknown
          page_id: string | null
          page_path: string | null
          scan_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          after_state?: Json | null
          before_state?: Json | null
          changes_summary?: string | null
          created_at?: string | null
          credits_used?: number | null
          id?: string
          ip_address?: unknown
          page_id?: string | null
          page_path?: string | null
          scan_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          after_state?: Json | null
          before_state?: Json | null
          changes_summary?: string | null
          created_at?: string | null
          credits_used?: number | null
          id?: string
          ip_address?: unknown
          page_id?: string | null
          page_path?: string | null
          scan_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_log_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "seo_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_metadata: {
        Row: {
          created_at: string | null
          faq_schema: Json | null
          id: string
          internal_links: Json | null
          is_active: boolean | null
          optimization_mode: string | null
          optimized_by: string | null
          page_id: string | null
          page_path: string
          page_type: string
          previous_version: Json | null
          seo_content: string | null
          seo_description: string | null
          seo_h1: string | null
          seo_title: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          faq_schema?: Json | null
          id?: string
          internal_links?: Json | null
          is_active?: boolean | null
          optimization_mode?: string | null
          optimized_by?: string | null
          page_id?: string | null
          page_path: string
          page_type: string
          previous_version?: Json | null
          seo_content?: string | null
          seo_description?: string | null
          seo_h1?: string | null
          seo_title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          faq_schema?: Json | null
          id?: string
          internal_links?: Json | null
          is_active?: boolean | null
          optimization_mode?: string | null
          optimized_by?: string | null
          page_id?: string | null
          page_path?: string
          page_type?: string
          previous_version?: Json | null
          seo_content?: string | null
          seo_description?: string | null
          seo_h1?: string | null
          seo_title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      seo_scans: {
        Row: {
          admin_id: string
          average_score: number | null
          completed_at: string | null
          created_at: string | null
          credits_estimated: number | null
          credits_used: number | null
          error_message: string | null
          id: string
          issues_found: number | null
          pages_scanned: number | null
          results: Json | null
          scan_type: string
          scope: string
          scope_filter: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          admin_id: string
          average_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          credits_estimated?: number | null
          credits_used?: number | null
          error_message?: string | null
          id?: string
          issues_found?: number | null
          pages_scanned?: number | null
          results?: Json | null
          scan_type: string
          scope: string
          scope_filter?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          admin_id?: string
          average_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          credits_estimated?: number | null
          credits_used?: number | null
          error_message?: string | null
          id?: string
          issues_found?: number | null
          pages_scanned?: number | null
          results?: Json | null
          scan_type?: string
          scope?: string
          scope_filter?: string | null
          started_at?: string | null
          status?: string | null
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
      support_tickets: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          priority: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          priority?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string | null
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
          draft_id: string | null
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
          draft_id?: string | null
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
          draft_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "uploaded_files_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      user_subscriptions: {
        Row: {
          created_at: string
          credits_per_month: number
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_yearly: boolean
          monthly_price: number
          next_billing_date: string | null
          paypal_subscription_id: string
          plan_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_per_month?: number
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_yearly?: boolean
          monthly_price?: number
          next_billing_date?: string | null
          paypal_subscription_id: string
          plan_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_per_month?: number
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_yearly?: boolean
          monthly_price?: number
          next_billing_date?: string | null
          paypal_subscription_id?: string
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videoai_credits: {
        Row: {
          credits_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          credits_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          credits_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videoai_transactions: {
        Row: {
          created_at: string
          credits_delta: number
          generation_id: string | null
          id: string
          pack_id: string | null
          paypal_order_id: string | null
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_delta: number
          generation_id?: string | null
          id?: string
          pack_id?: string | null
          paypal_order_id?: string | null
          reason?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_delta?: number
          generation_id?: string | null
          id?: string
          pack_id?: string | null
          paypal_order_id?: string | null
          reason?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      watermark_exports: {
        Row: {
          admin_id: string
          created_at: string
          export_batch_id: string
          exported_at: string
          file_hash: string | null
          file_name: string | null
          file_size: number | null
          format: string
          id: string
          platform: string
          video_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          export_batch_id: string
          exported_at?: string
          file_hash?: string | null
          file_name?: string | null
          file_size?: number | null
          format?: string
          id?: string
          platform?: string
          video_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          export_batch_id?: string
          exported_at?: string
          file_hash?: string | null
          file_name?: string | null
          file_size?: number | null
          format?: string
          id?: string
          platform?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watermark_exports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "content_files"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      content_like_counts: {
        Row: {
          like_count: number | null
          submission_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_likes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      add_videoai_credits: {
        Args: {
          p_amount: number
          p_generation_id?: string
          p_pack_id?: string
          p_paypal_order_id?: string
          p_reason?: string
          p_type?: string
          p_user_id: string
        }
        Returns: number
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
      admin_mark_payout_paid: {
        Args: {
          p_admin_notes?: string
          p_paypal_batch_id?: string
          p_request_id: string
        }
        Returns: undefined
      }
      admin_reject_payout: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
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
      check_and_insert_file: {
        Args: {
          p_file_format: string
          p_file_hash: string
          p_file_name: string
          p_file_path: string
          p_file_size: number
          p_file_type: string
          p_submission_id: string
        }
        Returns: {
          is_new: boolean
          message: string
          owner_id: string
        }[]
      }
      check_file_duplicate: {
        Args: { file_type_param?: string; hash_value: string }
        Returns: {
          duplicate_file_name: string
          duplicate_user_id: string
          exists_in_content: boolean
          exists_in_uploaded: boolean
        }[]
      }
      check_file_duplicate_by_size: {
        Args: { p_file_size: number; p_file_type?: string; p_user_id: string }
        Returns: {
          duplicate_file_name: string
          duplicate_user_id: string
          exists_in_content: boolean
          exists_in_uploaded: boolean
        }[]
      }
      clean_for_slug: { Args: { text_input: string }; Returns: string }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
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
      expire_ended_subscriptions: { Args: never; Returns: number }
      generate_product_slug: {
        Args: { tags_input: string[]; title_input: string }
        Returns: string
      }
      generate_slugified_filename: {
        Args: { original_filename: string; title_input: string }
        Returns: string
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
      get_content_likes_count: { Args: { content_id: string }; Returns: number }
      get_content_rating: {
        Args: { content_id: string }
        Returns: {
          average_rating: number
          review_count: number
        }[]
      }
      get_creator_profiles_public:
        | {
            Args: never
            Returns: {
              avatar_url: string
              display_name: string
              store_name: string
              user_id: string
            }[]
          }
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
      get_creator_public_info: {
        Args: { creator_ids?: string[] }
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
      get_safe_profile_info: {
        Args: { p_user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          store_name: string
          user_id: string
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
      get_seller_earnings_summary: {
        Args: { p_seller_id: string }
        Returns: {
          available_amount: number
          lifetime_commission: number
          lifetime_gross: number
          paid_amount: number
          pending_amount: number
          refunded_amount: number
          requested_amount: number
          total_sales: number
        }[]
      }
      get_seo_metadata: {
        Args: { path_param: string }
        Returns: {
          faq_schema: Json
          internal_links: Json
          seo_content: string
          seo_description: string
          seo_h1: string
          seo_title: string
        }[]
      }
      get_unexported_watermarked_previews: {
        Args: never
        Returns: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          preview_path: string
          submission_id: string
        }[]
      }
      get_watermark_export_history: {
        Args: never
        Returns: {
          admin_id: string
          export_batch_id: string
          exported_at: string
          platform: string
          total_size: number
          video_count: number
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
      log_watermark_export: {
        Args: {
          p_batch_id: string
          p_format?: string
          p_platform?: string
          p_video_ids: string[]
        }
        Returns: number
      }
      mark_download_token_used: {
        Args: { token_param: string }
        Returns: boolean
      }
      mature_seller_earnings: { Args: never; Returns: number }
      process_scan_result: {
        Args: {
          p_ai_declaration: string
          p_detection_score: number
          p_submission_id: string
        }
        Returns: string
      }
      request_seller_payout: {
        Args: { p_min_amount?: number; p_paypal_email: string }
        Returns: string
      }
      retry_failed_preview: { Args: { _file_id: string }; Returns: undefined }
      search_marketplace:
        | {
            Args: {
              p_ai_generated?: boolean
              p_category_id?: string
              p_color_tags?: string[]
              p_effect_tags?: string[]
              p_free_only?: boolean
              p_limit?: number
              p_offset?: number
              p_orientation_tags?: string[]
              p_platform_tags?: string[]
              p_price_max?: number
              p_price_min?: number
              p_search?: string
              p_sort?: string
              p_style_tags?: string[]
              p_subject_tags?: string[]
              p_use_case_tags?: string[]
              p_with_people?: boolean
            }
            Returns: {
              ai_declaration: string
              category_id: string
              created_at: string
              creator_id: string
              description: string
              id: string
              price: number
              slug: string
              tags: string[]
              title: string
              total_count: number
            }[]
          }
        | {
            Args: {
              p_ai_generated?: boolean
              p_category_id?: string
              p_color_tags?: string[]
              p_effect_tags?: string[]
              p_free_only?: boolean
              p_limit?: number
              p_offset?: number
              p_optimal_only?: boolean
              p_orientation_tags?: string[]
              p_platform_tags?: string[]
              p_price_max?: number
              p_price_min?: number
              p_search?: string
              p_sort?: string
              p_style_tags?: string[]
              p_subject_tags?: string[]
              p_use_case_tags?: string[]
              p_with_people?: boolean
            }
            Returns: {
              ai_declaration: string
              category_id: string
              created_at: string
              creator_id: string
              description: string
              id: string
              preview_quality: string
              price: number
              slug: string
              tags: string[]
              title: string
              total_count: number
            }[]
          }
      spend_videoai_credits: {
        Args: {
          p_amount: number
          p_generation_id?: string
          p_reason?: string
          p_user_id: string
        }
        Returns: number
      }
      unaccent: { Args: { "": string }; Returns: string }
      user_can_access_profile: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      user_has_liked: {
        Args: { checking_user_id: string; content_id: string }
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
