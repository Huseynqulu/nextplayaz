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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          is_active: boolean
          label_az: string
          label_en: string
          label_ru: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          is_active?: boolean
          label_az: string
          label_en: string
          label_ru: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          is_active?: boolean
          label_az?: string
          label_en?: string
          label_ru?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          order_id: string | null
          product_id: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          order_id?: string | null
          product_id?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          order_id?: string | null
          product_id?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          percent: number
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          percent: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          percent?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          auto_confirm_at: string | null
          buyer_id: string
          buyer_notes: string | null
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_payload: string | null
          disputed_at: string | null
          disputed_reason: string | null
          id: string
          product_id: string
          quantity: number
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          auto_confirm_at?: string | null
          buyer_id: string
          buyer_notes?: string | null
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_payload?: string | null
          disputed_at?: string | null
          disputed_reason?: string | null
          id?: string
          product_id: string
          quantity?: number
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          auto_confirm_at?: string | null
          buyer_id?: string
          buyer_notes?: string | null
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_payload?: string | null
          disputed_at?: string | null
          disputed_reason?: string | null
          id?: string
          product_id?: string
          quantity?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          instructions: string
          is_active: boolean
          label: string
          method: Database["public"]["Enums"]["topup_method"]
          updated_at: string
        }
        Insert: {
          instructions: string
          is_active?: boolean
          label: string
          method: Database["public"]["Enums"]["topup_method"]
          updated_at?: string
        }
        Update: {
          instructions?: string
          is_active?: boolean
          label?: string
          method?: Database["public"]["Enums"]["topup_method"]
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          delivery: Database["public"]["Enums"]["delivery_type"]
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          old_price: number | null
          platform: string
          price: number
          rating: number
          reviews_count: number
          seller_id: string
          slug: string
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          delivery?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          old_price?: number | null
          platform: string
          price: number
          rating?: number
          reviews_count?: number
          seller_id: string
          slug: string
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          delivery?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          old_price?: number | null
          platform?: string
          price?: number
          rating?: number
          reviews_count?: number
          seller_id?: string
          slug?: string
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_seen_at: string | null
          updated_at: string
          username: string | null
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_seen_at?: string | null
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_applications: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          email: string
          first_name: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          last_name: string
          phone: string
          selfie_url: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          last_name: string
          phone: string
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          last_name?: string
          phone?: string
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          is_admin: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: string
          message: string
          order_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          message: string
          order_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          message?: string
          order_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      wallet_topups: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["topup_method"]
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_note: string | null
          status: Database["public"]["Enums"]["topup_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["topup_method"]
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_note?: string | null
          status?: Database["public"]["Enums"]["topup_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["topup_method"]
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_note?: string | null
          status?: Database["public"]["Enums"]["topup_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_topup: {
        Args: { p_notes?: string; p_topup_id: string }
        Returns: undefined
      }
      admin_delete_category: { Args: { p_slug: string }; Returns: undefined }
      admin_grant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          roles: Database["public"]["Enums"]["app_role"][]
          username: string
          wallet_balance: number
        }[]
      }
      admin_partial_refund: {
        Args: { p_notes?: string; p_order_id: string; p_refund_amount: number }
        Returns: undefined
      }
      admin_reject_topup: {
        Args: { p_notes?: string; p_topup_id: string }
        Returns: undefined
      }
      admin_resolve_dispute: {
        Args: { p_notes?: string; p_order_id: string; p_refund: boolean }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_set_wallet_balance: {
        Args: { p_balance: number; p_user_id: string }
        Returns: undefined
      }
      admin_upsert_category: {
        Args: {
          p_icon?: string
          p_is_active?: boolean
          p_label_az: string
          p_label_en: string
          p_label_ru: string
          p_slug: string
          p_sort_order?: number
        }
        Returns: undefined
      }
      auto_confirm_orders: { Args: never; Returns: number }
      confirm_order: { Args: { p_order_id: string }; Returns: undefined }
      create_order:
        | {
            Args: { p_product_id: string; p_quantity?: number }
            Returns: string
          }
        | {
            Args: {
              p_discount_code?: string
              p_product_id: string
              p_quantity?: number
            }
            Returns: string
          }
      dispute_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_order_delivered: {
        Args: { p_order_id: string; p_payload: string }
        Returns: undefined
      }
      staff_cancel_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      start_conversation: {
        Args: { p_other_user: string; p_product_id?: string }
        Returns: string
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "user" | "seller" | "admin" | "support"
      application_status: "pending" | "approved" | "rejected"
      delivery_type: "Instant" | "Manual"
      order_status:
        | "pending"
        | "payment_received"
        | "delivered"
        | "completed"
        | "dispute"
        | "cancelled"
        | "paid"
        | "refunded"
        | "disputed"
      ticket_category:
        | "order"
        | "payment"
        | "account"
        | "seller"
        | "general"
        | "other"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status: "open" | "pending" | "answered" | "closed"
      topup_method:
        | "m10"
        | "kapital"
        | "birbank"
        | "pasha"
        | "bank_transfer"
        | "card"
        | "other"
      topup_status: "pending" | "approved" | "rejected"
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
      app_role: ["user", "seller", "admin", "support"],
      application_status: ["pending", "approved", "rejected"],
      delivery_type: ["Instant", "Manual"],
      order_status: [
        "pending",
        "payment_received",
        "delivered",
        "completed",
        "dispute",
        "cancelled",
        "paid",
        "refunded",
        "disputed",
      ],
      ticket_category: [
        "order",
        "payment",
        "account",
        "seller",
        "general",
        "other",
      ],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["open", "pending", "answered", "closed"],
      topup_method: [
        "m10",
        "kapital",
        "birbank",
        "pasha",
        "bank_transfer",
        "card",
        "other",
      ],
      topup_status: ["pending", "approved", "rejected"],
    },
  },
} as const
