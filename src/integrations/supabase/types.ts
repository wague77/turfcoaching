
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          device_id: string | null
          device_id_2: string | null
          device_info: Json | null
          expires_at: string
          id: string
          is_blocked: boolean
          is_used: boolean
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          device_id?: string | null
          device_id_2?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          is_blocked?: boolean
          is_used?: boolean
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          device_id?: string | null
          device_id_2?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          is_blocked?: boolean
          is_used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      access_codes_history: {
        Row: {
          code: string
          created_at: string
          deleted_at: string
          deleted_by: string | null
          deletion_reason: string | null
          device_id: string | null
          device_info: Json | null
          expires_at: string
          id: string
          original_code_id: string
          was_blocked: boolean
          was_used: boolean
        }
        Insert: {
          code: string
          created_at: string
          deleted_at?: string
          deleted_by?: string | null
          deletion_reason?: string | null
          device_id?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          original_code_id: string
          was_blocked?: boolean
          was_used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          deletion_reason?: string | null
          device_id?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          original_code_id?: string
          was_blocked?: boolean
          was_used?: boolean
        }
        Relationships: []
      }
      ai_sessions: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          device_id: string
          device_info: Json | null
          id: string
          is_blocked: boolean
          last_used_at: string
          session_expiry: string
          session_start: string
          session_token: string | null
          updated_at: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          device_id: string
          device_info?: Json | null
          id?: string
          is_blocked?: boolean
          last_used_at?: string
          session_expiry: string
          session_start?: string
          session_token?: string | null
          updated_at?: string
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          device_id?: string
          device_info?: Json | null
          id?: string
          is_blocked?: boolean
          last_used_at?: string
          session_expiry?: string
          session_start?: string
          session_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          max_devices_per_code: number
          multi_device_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_devices_per_code?: number
          multi_device_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_devices_per_code?: number
          multi_device_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bet_distributor_history: {
        Row: {
          created_at: string
          device_id: string
          history_data: Json
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          history_data?: Json
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          history_data?: Json
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      combination_history: {
        Row: {
          bet_type: string
          combination_count: number
          combinations: Json
          created_at: string
          filters: Json
          horse_count: number
          id: string
        }
        Insert: {
          bet_type: string
          combination_count: number
          combinations: Json
          created_at?: string
          filters: Json
          horse_count: number
          id?: string
        }
        Update: {
          bet_type?: string
          combination_count?: number
          combinations?: Json
          created_at?: string
          filters?: Json
          horse_count?: number
          id?: string
        }
        Relationships: []
      }
      email_history: {
        Row: {
          delivered_at: string | null
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          resend_id: string | null
          sent_at: string
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          resend_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          access_code_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_approved: boolean | null
          unsubscribed_at: string | null
        }
        Insert: {
          access_code_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_approved?: boolean | null
          unsubscribed_at?: string | null
        }
        Update: {
          access_code_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_subscribers_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_messages: {
        Row: {
          audio_url: string | null
          author_name: string
          created_at: string
          device_id: string
          id: string
          image_url: string | null
          message: string
          parent_id: string | null
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          author_name: string
          created_at?: string
          device_id: string
          id?: string
          image_url?: string | null
          message: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          author_name?: string
          created_at?: string
          device_id?: string
          id?: string
          image_url?: string | null
          message?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_messages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reactions: {
        Row: {
          created_at: string
          device_id: string
          emoji: string
          id: string
          message_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          emoji: string
          id?: string
          message_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "forum_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "forum_messages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          link_text: string | null
          link_url: string | null
          message: string
          reappear_after_minutes: number | null
          target_audience: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          message: string
          reappear_after_minutes?: number | null
          target_audience?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          message?: string
          reappear_after_minutes?: number | null
          target_audience?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      promo_banner_settings: {
        Row: {
          africa_price: string
          bottom_banner_accent_color: string | null
          bottom_banner_active: boolean
          bottom_banner_countdown_end: string | null
          bottom_banner_gradient_end: string | null
          bottom_banner_gradient_middle: string | null
          bottom_banner_gradient_start: string | null
          bottom_banner_text: string
          bottom_banner_text_color: string | null
          created_at: string
          europe_price: string
          id: string
          is_active: boolean
          link_url: string | null
          promo_text: string
          promo_video_active: boolean | null
          promo_video_position: string | null
          promo_video_url: string | null
          updated_at: string
        }
        Insert: {
          africa_price?: string
          bottom_banner_accent_color?: string | null
          bottom_banner_active?: boolean
          bottom_banner_countdown_end?: string | null
          bottom_banner_gradient_end?: string | null
          bottom_banner_gradient_middle?: string | null
          bottom_banner_gradient_start?: string | null
          bottom_banner_text?: string
          bottom_banner_text_color?: string | null
          created_at?: string
          europe_price?: string
          id?: string
          is_active?: boolean
          link_url?: string | null
          promo_text?: string
          promo_video_active?: boolean | null
          promo_video_position?: string | null
          promo_video_url?: string | null
          updated_at?: string
        }
        Update: {
          africa_price?: string
          bottom_banner_accent_color?: string | null
          bottom_banner_active?: boolean
          bottom_banner_countdown_end?: string | null
          bottom_banner_gradient_end?: string | null
          bottom_banner_gradient_middle?: string | null
          bottom_banner_gradient_start?: string | null
          bottom_banner_text?: string
          bottom_banner_text_color?: string | null
          created_at?: string
          europe_price?: string
          id?: string
          is_active?: boolean
          link_url?: string | null
          promo_text?: string
          promo_video_active?: boolean | null
          promo_video_position?: string | null
          promo_video_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      turf_coaching_settings: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          session_duration_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          session_duration_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          session_duration_days?: number
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      forum_messages_public: {
        Row: {
          audio_url: string | null
          author_name: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          message: string | null
          parent_id: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          message?: string | null
          parent_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          message?: string | null
          parent_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_messages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reactions_public: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string | null
          message_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string | null
          message_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string | null
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "forum_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "forum_messages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      turf_coaching_settings_public: {
        Row: {
          created_at: string | null
          id: string | null
          session_duration_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          session_duration_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          session_duration_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_ai_password: { Args: { new_password: string }; Returns: undefined }
      set_turf_password: {
        Args: { new_duration_days?: number; new_password: string }
        Returns: undefined
      }
      validate_access_code: {
        Args: { input_code: string; input_device_id?: string }
        Returns: {
          device_bound: boolean
          device_mismatch: boolean
          expires_at: string
          valid: boolean
        }[]
      }
      verify_ai_password: { Args: { input_password: string }; Returns: boolean }
      verify_turf_password: {
        Args: { input_password: string }
        Returns: {
          session_duration_days: number
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const

