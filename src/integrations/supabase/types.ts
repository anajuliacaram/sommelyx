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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      consumption_log: {
        Row: {
          consumed_at: string
          country: string | null
          created_at: string
          grape: string | null
          id: string
          location: string | null
          producer: string | null
          rating: number | null
          region: string | null
          source: string
          style: string | null
          tasting_notes: string | null
          user_id: string
          vintage: number | null
          wine_id: string | null
          wine_name: string
        }
        Insert: {
          consumed_at?: string
          country?: string | null
          created_at?: string
          grape?: string | null
          id?: string
          location?: string | null
          producer?: string | null
          rating?: number | null
          region?: string | null
          source?: string
          style?: string | null
          tasting_notes?: string | null
          user_id: string
          vintage?: number | null
          wine_id?: string | null
          wine_name: string
        }
        Update: {
          consumed_at?: string
          country?: string | null
          created_at?: string
          grape?: string | null
          id?: string
          location?: string | null
          producer?: string | null
          rating?: number | null
          region?: string | null
          source?: string
          style?: string | null
          tasting_notes?: string | null
          user_id?: string
          vintage?: number | null
          wine_id?: string | null
          wine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumption_log_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_info: string | null
          created_at: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      edge_function_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          function_name: string
          id: string
          metadata: Json | null
          outcome: string
          status_code: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          function_name: string
          id?: string
          metadata?: Json | null
          outcome: string
          status_code: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          function_name?: string
          id?: string
          metadata?: Json | null
          outcome?: string
          status_code?: number
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          profile_type: Database["public"]["Enums"]["profile_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          quantity: number
          user_id: string
          wine_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          quantity?: number
          user_id: string
          wine_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          quantity?: number
          user_id?: string
          wine_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wine_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          notes: string | null
          quantity: number
          user_id: string
          wine_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          quantity?: number
          user_id: string
          wine_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          quantity?: number
          user_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_events_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_location_events: {
        Row: {
          action_type: string
          created_at: string
          created_by_user_id: string | null
          from_location_id: string | null
          id: string
          new_label: string | null
          notes: string | null
          previous_label: string | null
          profile_type: string | null
          quantity_moved: number | null
          reason: string | null
          responsible_name: string | null
          to_location_id: string | null
          user_id: string
          wine_id: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          created_by_user_id?: string | null
          from_location_id?: string | null
          id?: string
          new_label?: string | null
          notes?: string | null
          previous_label?: string | null
          profile_type?: string | null
          quantity_moved?: number | null
          reason?: string | null
          responsible_name?: string | null
          to_location_id?: string | null
          user_id: string
          wine_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by_user_id?: string | null
          from_location_id?: string | null
          id?: string
          new_label?: string | null
          notes?: string | null
          previous_label?: string | null
          profile_type?: string | null
          quantity_moved?: number | null
          reason?: string | null
          responsible_name?: string | null
          to_location_id?: string | null
          user_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_location_events_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_locations: {
        Row: {
          created_at: string
          formatted_label: string | null
          id: string
          level: string | null
          manual_label: string | null
          position: string | null
          profile_type: string | null
          quantity: number
          sector: string | null
          updated_at: string
          user_id: string
          wine_id: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          formatted_label?: string | null
          id?: string
          level?: string | null
          manual_label?: string | null
          position?: string | null
          profile_type?: string | null
          quantity?: number
          sector?: string | null
          updated_at?: string
          user_id: string
          wine_id: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          formatted_label?: string | null
          id?: string
          level?: string | null
          manual_label?: string | null
          position?: string | null
          profile_type?: string | null
          quantity?: number
          sector?: string | null
          updated_at?: string
          user_id?: string
          wine_id?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wine_locations_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wines: {
        Row: {
          cellar_location: string | null
          country: string | null
          created_at: string
          current_value: number | null
          drink_from: number | null
          drink_until: number | null
          food_pairing: string | null
          grape: string | null
          id: string
          image_url: string | null
          last_price_date: string | null
          name: string
          producer: string | null
          purchase_price: number | null
          quantity: number
          rating: number | null
          region: string | null
          style: string | null
          tasting_notes: string | null
          updated_at: string
          user_id: string
          vintage: number | null
        }
        Insert: {
          cellar_location?: string | null
          country?: string | null
          created_at?: string
          current_value?: number | null
          drink_from?: number | null
          drink_until?: number | null
          food_pairing?: string | null
          grape?: string | null
          id?: string
          image_url?: string | null
          last_price_date?: string | null
          name: string
          producer?: string | null
          purchase_price?: number | null
          quantity?: number
          rating?: number | null
          region?: string | null
          style?: string | null
          tasting_notes?: string | null
          updated_at?: string
          user_id: string
          vintage?: number | null
        }
        Update: {
          cellar_location?: string | null
          country?: string | null
          created_at?: string
          current_value?: number | null
          drink_from?: number | null
          drink_until?: number | null
          food_pairing?: string | null
          grape?: string | null
          id?: string
          image_url?: string | null
          last_price_date?: string | null
          name?: string
          producer?: string | null
          purchase_price?: number | null
          quantity?: number
          rating?: number | null
          region?: string | null
          style?: string | null
          tasting_notes?: string | null
          updated_at?: string
          user_id?: string
          vintage?: number | null
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          ai_summary: string | null
          country: string | null
          created_at: string
          grape: string | null
          id: string
          image_url: string | null
          notes: string | null
          producer: string | null
          region: string | null
          source: string
          style: string | null
          target_price: number | null
          updated_at: string
          user_id: string
          vintage: number | null
          wine_name: string
        }
        Insert: {
          ai_summary?: string | null
          country?: string | null
          created_at?: string
          grape?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          producer?: string | null
          region?: string | null
          source?: string
          style?: string | null
          target_price?: number | null
          updated_at?: string
          user_id: string
          vintage?: number | null
          wine_name: string
        }
        Update: {
          ai_summary?: string | null
          country?: string | null
          created_at?: string
          grape?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          producer?: string | null
          region?: string | null
          source?: string
          style?: string | null
          target_price?: number | null
          updated_at?: string
          user_id?: string
          vintage?: number | null
          wine_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_wine_quantity: {
        Args: {
          _event_type: string
          _notes?: string
          _quantity: number
          _user_id: string
          _wine_id: string
        }
        Returns: number
      }
      build_location_label: {
        Args: {
          _level: string
          _manual_label: string
          _position: string
          _sector: string
          _zone: string
        }
        Returns: string
      }
      create_wine_location: {
        Args: {
          _level?: string
          _manual_label?: string
          _notes?: string
          _position?: string
          _quantity?: number
          _reason?: string
          _responsible_name?: string
          _sector?: string
          _wine_id: string
          _zone?: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      transfer_wine_location_quantity: {
        Args: {
          _from_location_id: string
          _notes?: string
          _quantity: number
          _reason?: string
          _responsible_name?: string
          _to_location_id: string
          _wine_id: string
        }
        Returns: undefined
      }
      update_wine_location_meta: {
        Args: {
          _level?: string
          _location_id: string
          _manual_label?: string
          _notes?: string
          _position?: string
          _reason?: string
          _responsible_name?: string
          _sector?: string
          _zone?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager"
      profile_type: "personal" | "commercial"
      subscription_plan: "free" | "pro" | "business"
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
      app_role: ["admin", "user", "manager"],
      profile_type: ["personal", "commercial"],
      subscription_plan: ["free", "pro", "business"],
    },
  },
} as const
