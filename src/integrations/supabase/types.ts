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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ab_test_results: {
        Row: {
          concluded_at: string | null
          confidence_score: number | null
          id: string
          metric_name: string | null
          sample_size_a: number | null
          sample_size_b: number | null
          snippet_id: string
          started_at: string | null
          test_duration_days: number | null
          variant_a_id: string | null
          variant_b_id: string | null
          winner_id: string | null
        }
        Insert: {
          concluded_at?: string | null
          confidence_score?: number | null
          id?: string
          metric_name?: string | null
          sample_size_a?: number | null
          sample_size_b?: number | null
          snippet_id: string
          started_at?: string | null
          test_duration_days?: number | null
          variant_a_id?: string | null
          variant_b_id?: string | null
          winner_id?: string | null
        }
        Update: {
          concluded_at?: string | null
          confidence_score?: number | null
          id?: string
          metric_name?: string | null
          sample_size_a?: number | null
          sample_size_b?: number | null
          snippet_id?: string
          started_at?: string | null
          test_duration_days?: number | null
          variant_a_id?: string | null
          variant_b_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_results_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_results_variant_a_id_fkey"
            columns: ["variant_a_id"]
            isOneToOne: false
            referencedRelation: "snippet_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_results_variant_b_id_fkey"
            columns: ["variant_b_id"]
            isOneToOne: false
            referencedRelation: "snippet_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_achievements: {
        Row: {
          achievement_type: string
          artist_id: string
          id: string
          metadata: Json | null
          unlocked_at: string | null
        }
        Insert: {
          achievement_type: string
          artist_id: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
        }
        Update: {
          achievement_type?: string
          artist_id?: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_achievements_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_profiles: {
        Row: {
          artist_name: string
          banner_url: string | null
          bio_links: Json | null
          created_at: string
          dms_open: boolean | null
          featured_snippet_id: string | null
          genres: Database["public"]["Enums"]["music_genre"][]
          id: string
          total_likes: number
          total_views: number
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          artist_name: string
          banner_url?: string | null
          bio_links?: Json | null
          created_at?: string
          dms_open?: boolean | null
          featured_snippet_id?: string | null
          genres?: Database["public"]["Enums"]["music_genre"][]
          id?: string
          total_likes?: number
          total_views?: number
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          artist_name?: string
          banner_url?: string | null
          bio_links?: Json | null
          created_at?: string
          dms_open?: boolean | null
          featured_snippet_id?: string | null
          genres?: Database["public"]["Enums"]["music_genre"][]
          id?: string
          total_likes?: number
          total_views?: number
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "artist_profiles_featured_snippet_id_fkey"
            columns: ["featured_snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string | null
          id: string
          ms_timestamp: number | null
          parent_comment_id: string | null
          pinned: boolean | null
          snippet_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ms_timestamp?: number | null
          parent_comment_id?: string | null
          pinned?: boolean | null
          snippet_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ms_timestamp?: number | null
          parent_comment_id?: string | null
          pinned?: boolean | null
          snippet_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      engagement_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ms_played: number | null
          session_id: string | null
          snippet_id: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ms_played?: number | null
          session_id?: string | null
          snippet_id: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ms_played?: number | null
          session_id?: string | null
          snippet_id?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "snippet_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          comment_id: string | null
          created_at: string | null
          from_user_id: string | null
          id: string
          playlist_id: string | null
          read: boolean | null
          snippet_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          playlist_id?: string | null
          read?: boolean | null
          snippet_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          playlist_id?: string | null
          read?: boolean | null
          snippet_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          created_at: string | null
          playlist_id: string
          position: number
          snippet_id: string
        }
        Insert: {
          created_at?: string | null
          playlist_id: string
          position?: number
          snippet_id: string
        }
        Update: {
          created_at?: string | null
          playlist_id?: string
          position?: number
          snippet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_path: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          is_public: boolean | null
          likes_count: number | null
          saves_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cover_path?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          saves_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cover_path?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          saves_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          comment_id: string | null
          created_at: string | null
          emoji: string
          id: string
          snippet_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          emoji: string
          id?: string
          snippet_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          emoji?: string
          id?: string
          snippet_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      snippet_variants: {
        Row: {
          audio_path: string
          cover_path: string | null
          created_at: string
          id: string
          is_active: boolean | null
          label: string | null
          parent_snippet_id: string
        }
        Insert: {
          audio_path: string
          cover_path?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          parent_snippet_id: string
        }
        Update: {
          audio_path?: string
          cover_path?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          parent_snippet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snippet_variants_parent_snippet_id_fkey"
            columns: ["parent_snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
        ]
      }
      snippets: {
        Row: {
          approved_at: string | null
          artist_id: string
          audio_url: string
          cover_image_url: string | null
          created_at: string
          cta_type: Database["public"]["Enums"]["cta_type"] | null
          cta_url: string | null
          draft: boolean | null
          duration: number
          genre: Database["public"]["Enums"]["music_genre"]
          hook_start_ms: number | null
          id: string
          likes: number
          rejection_reason: string | null
          scheduled_at: string | null
          search_vector: unknown
          shares: number
          status: Database["public"]["Enums"]["snippet_status"]
          tags: string[] | null
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          approved_at?: string | null
          artist_id: string
          audio_url: string
          cover_image_url?: string | null
          created_at?: string
          cta_type?: Database["public"]["Enums"]["cta_type"] | null
          cta_url?: string | null
          draft?: boolean | null
          duration: number
          genre: Database["public"]["Enums"]["music_genre"]
          hook_start_ms?: number | null
          id?: string
          likes?: number
          rejection_reason?: string | null
          scheduled_at?: string | null
          search_vector?: unknown
          shares?: number
          status?: Database["public"]["Enums"]["snippet_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          approved_at?: string | null
          artist_id?: string
          audio_url?: string
          cover_image_url?: string | null
          created_at?: string
          cta_type?: Database["public"]["Enums"]["cta_type"] | null
          cta_url?: string | null
          draft?: boolean | null
          duration?: number
          genre?: Database["public"]["Enums"]["music_genre"]
          hook_start_ms?: number | null
          id?: string
          likes?: number
          rejection_reason?: string | null
          scheduled_at?: string | null
          search_vector?: unknown
          shares?: number
          status?: Database["public"]["Enums"]["snippet_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "snippets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_scores: {
        Row: {
          artist_id: string
          last_updated: string
          score: number
          snippet_id: string
          tag: string | null
        }
        Insert: {
          artist_id: string
          last_updated?: string
          score?: number
          snippet_id: string
          tag?: string | null
        }
        Update: {
          artist_id?: string
          last_updated?: string
          score?: number
          snippet_id?: string
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trending_scores_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: true
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_templates: {
        Row: {
          artist_id: string
          config: Json
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          artist_id: string
          config: Json
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          artist_id?: string
          config?: Json
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_templates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          allow_messages_from: string
          audio_quality: string
          auto_publish: boolean
          autoplay: boolean
          compact_mode: boolean
          content_language: string
          created_at: string
          default_volume: number
          email_notifications: boolean
          id: string
          notify_comments: boolean
          notify_follows: boolean
          notify_likes: boolean
          notify_mentions: boolean
          notify_messages: boolean
          notify_replies: boolean
          notify_uploads: boolean
          preferred_genres: string[] | null
          profile_visibility: string
          push_notifications: boolean
          show_analytics: boolean
          show_animations: boolean
          show_explicit: boolean
          show_liked_snippets: boolean
          show_playlists: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_messages_from?: string
          audio_quality?: string
          auto_publish?: boolean
          autoplay?: boolean
          compact_mode?: boolean
          content_language?: string
          created_at?: string
          default_volume?: number
          email_notifications?: boolean
          id?: string
          notify_comments?: boolean
          notify_follows?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_replies?: boolean
          notify_uploads?: boolean
          preferred_genres?: string[] | null
          profile_visibility?: string
          push_notifications?: boolean
          show_analytics?: boolean
          show_animations?: boolean
          show_explicit?: boolean
          show_liked_snippets?: boolean
          show_playlists?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_messages_from?: string
          audio_quality?: string
          auto_publish?: boolean
          autoplay?: boolean
          compact_mode?: boolean
          content_language?: string
          created_at?: string
          default_volume?: number
          email_notifications?: boolean
          id?: string
          notify_comments?: boolean
          notify_follows?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_replies?: boolean
          notify_uploads?: boolean
          preferred_genres?: string[] | null
          profile_visibility?: string
          push_notifications?: boolean
          show_analytics?: boolean
          show_animations?: boolean
          show_explicit?: boolean
          show_liked_snippets?: boolean
          show_playlists?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_snippet_interactions: {
        Row: {
          created_at: string
          id: string
          liked: boolean
          saved: boolean
          snippet_id: string
          updated_at: string
          user_id: string
          viewed: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          liked?: boolean
          saved?: boolean
          snippet_id: string
          updated_at?: string
          user_id: string
          viewed?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          liked?: boolean
          saved?: boolean
          snippet_id?: string
          updated_at?: string
          user_id?: string
          viewed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_snippet_interactions_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_snippet_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_artist_metrics_daily: {
        Row: {
          artist_id: string | null
          completions: number | null
          impressions: number | null
          likes: number | null
          metric_date: string | null
          plays: number | null
          retention_15s: number | null
          retention_3s: number | null
          saves: number | null
          shares: number | null
          unique_listeners: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snippets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_creator_metrics_daily: {
        Row: {
          artist_id: string | null
          completes: number | null
          cta_clicks: number | null
          day: string | null
          follows: number | null
          impressions: number | null
          likes: number | null
          play_15s: number | null
          play_3s: number | null
          plays: number | null
          saves: number | null
          skips: number | null
          unique_users: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snippets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_snippet_metrics: {
        Row: {
          avg_ms_played: number | null
          completion_rate: number | null
          snippet_id: string | null
          total_completions: number | null
          total_likes: number | null
          total_plays: number | null
          total_saves: number | null
          total_shares: number | null
          unique_listeners: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_trending_score: {
        Args: { snippet_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "listener" | "artist" | "admin"
      cta_type: "full_track" | "presave" | "merch" | "custom"
      feed_rail: "for_you" | "new_this_week" | "following" | "underground"
      music_genre:
        | "hip-hop"
        | "trap"
        | "indie-pop"
        | "edm"
        | "house"
        | "r&b"
        | "soul"
        | "lo-fi"
        | "pop"
        | "rock"
        | "electronic"
        | "jazz"
        | "classical"
        | "other"
      snippet_status: "pending" | "approved" | "rejected"
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
      app_role: ["listener", "artist", "admin"],
      cta_type: ["full_track", "presave", "merch", "custom"],
      feed_rail: ["for_you", "new_this_week", "following", "underground"],
      music_genre: [
        "hip-hop",
        "trap",
        "indie-pop",
        "edm",
        "house",
        "r&b",
        "soul",
        "lo-fi",
        "pop",
        "rock",
        "electronic",
        "jazz",
        "classical",
        "other",
      ],
      snippet_status: ["pending", "approved", "rejected"],
    },
  },
} as const
