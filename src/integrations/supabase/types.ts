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
      brands: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          brand_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_distributions: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          distributed_by: string
          id: string
          proposal_id: string
          status: string
          store_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          distributed_by: string
          id?: string
          proposal_id: string
          status?: string
          store_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          distributed_by?: string
          id?: string
          proposal_id?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_distributions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distributions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          performed_by: string | null
          proposal_id: string | null
          store_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          proposal_id?: string | null
          store_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          proposal_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      model_optionals: {
        Row: {
          active: boolean | null
          cost: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          margin_percent: number | null
          model_id: string
          name: string
          price: number
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          margin_percent?: number | null
          model_id: string
          name: string
          price?: number
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          margin_percent?: number | null
          model_id?: string
          name?: string
          price?: number
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_optionals_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "pool_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_optionals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          alert_type: string
          created_at: string
          hash: string
          id: string
          message: string
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          hash: string
          id?: string
          message: string
          priority?: string
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          hash?: string
          id?: string
          message?: string
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      optional_groups: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          selection_type: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          selection_type: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          selection_type?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optional_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      optionals: {
        Row: {
          active: boolean | null
          cost: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          group_id: string | null
          id: string
          margin_percent: number | null
          name: string
          price: number
          store_id: string | null
          updated_at: string | null
          warning_note: string | null
        }
        Insert: {
          active?: boolean | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_id?: string | null
          id?: string
          margin_percent?: number | null
          name: string
          price: number
          store_id?: string | null
          updated_at?: string | null
          warning_note?: string | null
        }
        Update: {
          active?: boolean | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_id?: string | null
          id?: string
          margin_percent?: number | null
          name?: string
          price?: number
          store_id?: string | null
          updated_at?: string | null
          warning_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optionals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "optional_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optionals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_order: number | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_date: string | null
          period_end: string | null
          period_start: string | null
          plan_id: string | null
          status: string
          store_id: string
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          status?: string
          store_id: string
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          status?: string
          store_id?: string
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          label: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          label?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          label?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      pool_models: {
        Row: {
          active: boolean | null
          base_price: number
          category_id: string | null
          cost: number | null
          created_at: string | null
          delivery_days: number | null
          depth: number | null
          differentials: string[] | null
          display_order: number | null
          id: string
          included_items: string[] | null
          installation_days: number | null
          length: number | null
          margin_percent: number | null
          name: string
          not_included_items: string[] | null
          notes: string | null
          payment_terms: string | null
          photo_url: string | null
          store_id: string | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          active?: boolean | null
          base_price: number
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          delivery_days?: number | null
          depth?: number | null
          differentials?: string[] | null
          display_order?: number | null
          id?: string
          included_items?: string[] | null
          installation_days?: number | null
          length?: number | null
          margin_percent?: number | null
          name: string
          not_included_items?: string[] | null
          notes?: string | null
          payment_terms?: string | null
          photo_url?: string | null
          store_id?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          active?: boolean | null
          base_price?: number
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          delivery_days?: number | null
          depth?: number | null
          differentials?: string[] | null
          display_order?: number | null
          id?: string
          included_items?: string[] | null
          installation_days?: number | null
          length?: number | null
          margin_percent?: number | null
          name?: string
          not_included_items?: string[] | null
          notes?: string | null
          payment_terms?: string | null
          photo_url?: string | null
          store_id?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_models_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_models_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string | null
          customer_city: string
          customer_name: string
          customer_whatsapp: string
          id: string
          model_id: string | null
          selected_optionals: Json | null
          status: Database["public"]["Enums"]["proposal_status"]
          store_id: string | null
          total_price: number
        }
        Insert: {
          created_at?: string | null
          customer_city: string
          customer_name: string
          customer_whatsapp: string
          id?: string
          model_id?: string | null
          selected_optionals?: Json | null
          status?: Database["public"]["Enums"]["proposal_status"]
          store_id?: string | null
          total_price: number
        }
        Update: {
          created_at?: string | null
          customer_city?: string
          customer_name?: string
          customer_whatsapp?: string
          id?: string
          model_id?: string | null
          selected_optionals?: Json | null
          status?: Database["public"]["Enums"]["proposal_status"]
          store_id?: string | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "pool_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          onesignal_player_id: string | null
          onesignal_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          onesignal_player_id?: string | null
          onesignal_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          onesignal_player_id?: string | null
          onesignal_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          city: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          latitude: number | null
          lead_limit_monthly: number | null
          lead_plan_active: boolean | null
          lead_price_excess: number | null
          longitude: number | null
          name: string
          nome_fantasia: string | null
          plan_expires_at: string | null
          plan_id: string | null
          plan_started_at: string | null
          plan_status: string | null
          razao_social: string | null
          slug: string
          state: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          lead_limit_monthly?: number | null
          lead_plan_active?: boolean | null
          lead_price_excess?: number | null
          longitude?: number | null
          name: string
          nome_fantasia?: string | null
          plan_expires_at?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          plan_status?: string | null
          razao_social?: string | null
          slug: string
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          lead_limit_monthly?: number | null
          lead_plan_active?: boolean | null
          lead_price_excess?: number | null
          longitude?: number | null
          name?: string
          nome_fantasia?: string | null
          plan_expires_at?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          plan_status?: string | null
          razao_social?: string | null
          slug?: string
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_order: number | null
          id: string
          max_proposals_per_month: number
          max_users: number | null
          name: string
          price_monthly: number
          slug: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          max_proposals_per_month?: number
          max_users?: number | null
          name: string
          price_monthly?: number
          slug: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          max_proposals_per_month?: number
          max_users?: number | null
          name?: string
          price_monthly?: number
          slug?: string
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_store_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "seller" | "super_admin"
      proposal_status:
        | "nova"
        | "enviada"
        | "em_negociacao"
        | "fechada"
        | "perdida"
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
      app_role: ["owner", "seller", "super_admin"],
      proposal_status: [
        "nova",
        "enviada",
        "em_negociacao",
        "fechada",
        "perdida",
      ],
    },
  },
} as const
