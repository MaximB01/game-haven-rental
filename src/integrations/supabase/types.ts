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
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf_url: string | null
          order_id: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_invoice_id: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          order_id?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          order_id?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "user_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          cancelled_at: string | null
          created_at: string
          display_id: string | null
          id: string
          next_billing_date: string | null
          plan_name: string
          price: number
          product_name: string
          product_type: string
          pterodactyl_identifier: string | null
          pterodactyl_server_id: number | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          display_id?: string | null
          id?: string
          next_billing_date?: string | null
          plan_name: string
          price: number
          product_name: string
          product_type: string
          pterodactyl_identifier?: string | null
          pterodactyl_server_id?: number | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          display_id?: string | null
          id?: string
          next_billing_date?: string | null
          plan_name?: string
          price?: number
          product_name?: string
          product_type?: string
          pterodactyl_identifier?: string | null
          pterodactyl_server_id?: number | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_plans: {
        Row: {
          backups: number
          billing_period: string | null
          cpu: number
          created_at: string
          databases: number
          disk: number
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price: number
          product_id: string
          ram: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          backups?: number
          billing_period?: string | null
          cpu: number
          created_at?: string
          databases?: number
          disk: number
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price: number
          product_id: string
          ram: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          backups?: number
          billing_period?: string | null
          cpu?: number
          created_at?: string
          databases?: number
          disk?: number
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price?: number
          product_id?: string
          ram?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          description: string | null
          docker_image: string | null
          egg_id: number | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          nest_id: number | null
          product_id: string
          sort_order: number
          startup_command: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          docker_image?: string | null
          egg_id?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          nest_id?: number | null
          product_id: string
          sort_order?: number
          startup_command?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          docker_image?: string | null
          egg_id?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          nest_id?: number | null
          product_id?: string
          sort_order?: number
          startup_command?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          default_port: number | null
          description: string | null
          display_type: string
          docker_image: string | null
          egg_id: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_popular: boolean
          min_cpu: number
          min_disk: number
          min_ram: number
          name: string
          nest_id: number | null
          page_path: string | null
          slug: string
          startup_command: string | null
          stripe_product_id: string | null
          temporarily_unavailable: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_port?: number | null
          description?: string | null
          display_type?: string
          docker_image?: string | null
          egg_id?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          min_cpu?: number
          min_disk?: number
          min_ram?: number
          name: string
          nest_id?: number | null
          page_path?: string | null
          slug: string
          startup_command?: string | null
          stripe_product_id?: string | null
          temporarily_unavailable?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_port?: number | null
          description?: string | null
          display_type?: string
          docker_image?: string | null
          egg_id?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          min_cpu?: number
          min_disk?: number
          min_ram?: number
          name?: string
          nest_id?: number | null
          page_path?: string | null
          slug?: string
          startup_command?: string | null
          stripe_product_id?: string | null
          temporarily_unavailable?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_secret: boolean | null
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_staff: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          display_id: string | null
          id: string
          is_archived: boolean
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          display_id?: string | null
          id?: string
          is_archived?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          display_id?: string | null
          id?: string
          is_archived?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
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
      user_orders: {
        Row: {
          created_at: string | null
          display_id: string | null
          id: string | null
          plan_name: string | null
          price: number | null
          product_name: string | null
          product_type: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string | null
          display_id?: string | null
          id?: string | null
          plan_name?: string | null
          price?: number | null
          product_name?: string | null
          product_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string | null
          display_id?: string | null
          id?: string | null
          plan_name?: string | null
          price?: number | null
          product_name?: string | null
          product_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "awaiting_reply" | "closed"
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
      app_role: ["admin", "moderator", "user"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "awaiting_reply", "closed"],
    },
  },
} as const
