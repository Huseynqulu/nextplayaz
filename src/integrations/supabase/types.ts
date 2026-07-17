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
      announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          recipients_count: number
          sent_by: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          recipients_count?: number
          sent_by?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          recipients_count?: number
          sent_by?: string | null
          title?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          bg_color: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          text_color: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          text_color?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      boost_pricing: {
        Row: {
          cost: number
          hours: number
          is_active: boolean
          label: string
          sort_order: number
          sub_label: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          cost: number
          hours: number
          is_active?: boolean
          label: string
          sort_order?: number
          sub_label?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          cost?: number
          hours?: number
          is_active?: boolean
          label?: string
          sort_order?: number
          sub_label?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          note: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gift_denominations: {
        Row: {
          created_at: string
          currency: string
          face_value: number
          id: string
          is_active: boolean
          label: string | null
          platform_id: string
          region: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          face_value: number
          id?: string
          is_active?: boolean
          label?: string | null
          platform_id: string
          region?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          face_value?: number
          id?: string
          is_active?: boolean
          label?: string | null
          platform_id?: string
          region?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_denominations_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "gift_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_platforms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      home_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          link_url: string
          product_count_query: string | null
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string
          product_count_query?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string
          product_count_query?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          notes: string | null
          order_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          notes?: string | null
          order_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          auto_confirm_at: string | null
          buyer_id: string
          buyer_notes: string | null
          commission_amount: number
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_payload: string | null
          dispute_evidence_path: string | null
          dispute_evidence_url: string | null
          disputed_at: string | null
          disputed_reason: string | null
          funds_release_at: string | null
          funds_released_at: string | null
          id: string
          product_id: string
          quantity: number
          reopened_at: string | null
          reopened_by: string | null
          reopened_reason: string | null
          seller_id: string
          seller_net: number
          status: Database["public"]["Enums"]["order_status"]
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          auto_confirm_at?: string | null
          buyer_id: string
          buyer_notes?: string | null
          commission_amount?: number
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_payload?: string | null
          dispute_evidence_path?: string | null
          dispute_evidence_url?: string | null
          disputed_at?: string | null
          disputed_reason?: string | null
          funds_release_at?: string | null
          funds_released_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          reopened_at?: string | null
          reopened_by?: string | null
          reopened_reason?: string | null
          seller_id: string
          seller_net?: number
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          auto_confirm_at?: string | null
          buyer_id?: string
          buyer_notes?: string | null
          commission_amount?: number
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_payload?: string | null
          dispute_evidence_path?: string | null
          dispute_evidence_url?: string | null
          disputed_at?: string | null
          disputed_reason?: string | null
          funds_release_at?: string | null
          funds_released_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          reopened_at?: string | null
          reopened_by?: string | null
          reopened_reason?: string | null
          seller_id?: string
          seller_net?: number
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
      platform_ledger: {
        Row: {
          amount: number
          created_at: string
          entry_type: string
          id: string
          notes: string | null
          order_id: string | null
          user_id: string | null
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          entry_type: string
          id?: string
          notes?: string | null
          order_id?: string | null
          user_id?: string | null
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          entry_type?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          user_id?: string | null
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_subcategories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label_az: string
          label_en: string
          label_ru: string
          platform_slug: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label_az: string
          label_en: string
          label_ru: string
          platform_slug: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label_az?: string
          label_en?: string
          label_ru?: string
          platform_slug?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_subcategories_platform_slug_fkey"
            columns: ["platform_slug"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["slug"]
          },
        ]
      }
      platforms: {
        Row: {
          created_at: string
          icon: string | null
          id: string
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
          id?: string
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
          id?: string
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
      product_stock_items: {
        Row: {
          content: string
          created_at: string
          delivered_at: string | null
          id: string
          order_id: string | null
          product_id: string
        }
        Insert: {
          content: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string | null
          product_id: string
        }
        Update: {
          content?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          auto_message: string | null
          auto_message_enabled: boolean
          boost_expires_at: string | null
          boost_tier: string | null
          category: string
          created_at: string
          delivery: Database["public"]["Enums"]["delivery_type"]
          description: string | null
          gift_denomination_id: string | null
          id: string
          image_url: string | null
          image_urls: string[]
          is_active: boolean
          last_sold_at: string | null
          old_price: number | null
          platform: string
          platform_subcategory: string | null
          price: number
          rating: number
          reviews_count: number
          seller_id: string
          slug: string
          stock: number
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_message?: string | null
          auto_message_enabled?: boolean
          boost_expires_at?: string | null
          boost_tier?: string | null
          category: string
          created_at?: string
          delivery?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          gift_denomination_id?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          last_sold_at?: string | null
          old_price?: number | null
          platform: string
          platform_subcategory?: string | null
          price: number
          rating?: number
          reviews_count?: number
          seller_id: string
          slug: string
          stock?: number
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_message?: string | null
          auto_message_enabled?: boolean
          boost_expires_at?: string | null
          boost_tier?: string | null
          category?: string
          created_at?: string
          delivery?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          gift_denomination_id?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          last_sold_at?: string | null
          old_price?: number | null
          platform?: string
          platform_subcategory?: string | null
          price?: number
          rating?: number
          reviews_count?: number
          seller_id?: string
          slug?: string
          stock?: number
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_gift_denomination_id_fkey"
            columns: ["gift_denomination_id"]
            isOneToOne: false
            referencedRelation: "gift_denominations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          commission_rate_override: number | null
          created_at: string
          display_name: string | null
          id: string
          last_ip: string | null
          last_ip_at: string | null
          last_seen_at: string | null
          loyalty_points: number
          referral_code: string | null
          referred_by: string | null
          sales_count: number
          sales_total: number
          seller_tier: string
          shop_name: string | null
          signup_ip: string | null
          suspend_reason: string | null
          suspended_until: string | null
          updated_at: string
          username: string | null
          verified_at: string | null
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          commission_rate_override?: number | null
          created_at?: string
          display_name?: string | null
          id: string
          last_ip?: string | null
          last_ip_at?: string | null
          last_seen_at?: string | null
          loyalty_points?: number
          referral_code?: string | null
          referred_by?: string | null
          sales_count?: number
          sales_total?: number
          seller_tier?: string
          shop_name?: string | null
          signup_ip?: string | null
          suspend_reason?: string | null
          suspended_until?: string | null
          updated_at?: string
          username?: string | null
          verified_at?: string | null
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          commission_rate_override?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_ip?: string | null
          last_ip_at?: string | null
          last_seen_at?: string | null
          loyalty_points?: number
          referral_code?: string | null
          referred_by?: string | null
          sales_count?: number
          sales_total?: number
          seller_tier?: string
          shop_name?: string | null
          signup_ip?: string | null
          suspend_reason?: string | null
          suspended_until?: string | null
          updated_at?: string
          username?: string | null
          verified_at?: string | null
          wallet_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          qualifying_order_id: string | null
          referee_id: string
          referrer_id: string
          reward_amount: number
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          qualifying_order_id?: string | null
          referee_id: string
          referrer_id: string
          reward_amount?: number
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          qualifying_order_id?: string | null
          referee_id?: string
          referrer_id?: string
          reward_amount?: number
          rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_qualifying_order_id_fkey"
            columns: ["qualifying_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          reviewer_id: string
          seller_replied_at: string | null
          seller_reply: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          reviewer_id: string
          seller_replied_at?: string | null
          seller_reply?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_id?: string
          seller_replied_at?: string | null
          seller_reply?: string | null
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
      subcategories: {
        Row: {
          category_slug: string
          created_at: string
          id: string
          is_active: boolean
          label_az: string
          label_en: string
          label_ru: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_slug: string
          created_at?: string
          id?: string
          is_active?: boolean
          label_az: string
          label_en: string
          label_ru: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_slug?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label_az?: string
          label_en?: string
          label_ru?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
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
      wallet_withdrawals: {
        Row: {
          account_holder: string | null
          admin_notes: string | null
          amount: number
          created_at: string
          destination: string
          fee: number
          id: string
          method: string
          net_amount: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          admin_notes?: string | null
          amount: number
          created_at?: string
          destination: string
          fee?: number
          id?: string
          method: string
          net_amount: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          admin_notes?: string | null
          amount?: number
          created_at?: string
          destination?: string
          fee?: number
          id?: string
          method?: string
          net_amount?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          last_seen_at: string | null
          sales_count: number | null
          seller_tier: string | null
          shop_name: string | null
          suspended_until: string | null
          username: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          last_seen_at?: string | null
          sales_count?: number | null
          seller_tier?: string | null
          shop_name?: string | null
          suspended_until?: string | null
          username?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          last_seen_at?: string | null
          sales_count?: number | null
          seller_tier?: string | null
          shop_name?: string | null
          suspended_until?: string | null
          username?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _gen_gift_code: { Args: never; Returns: string }
      _gen_ref_code: { Args: never; Returns: string }
      admin_analytics: { Args: { p_days?: number }; Returns: Json }
      admin_approve_topup: {
        Args: { p_notes?: string; p_topup_id: string }
        Returns: undefined
      }
      admin_approve_withdrawal: {
        Args: { p_id: string; p_notes?: string }
        Returns: undefined
      }
      admin_broadcast_announcement: {
        Args: { p_body: string; p_link?: string; p_title: string }
        Returns: Json
      }
      admin_create_gift_cards: {
        Args: { p_amount: number; p_note?: string; p_quantity?: number }
        Returns: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          note: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "gift_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_deactivate_gift_card: { Args: { p_id: string }; Returns: undefined }
      admin_delete_banner: { Args: { p_id: string }; Returns: undefined }
      admin_delete_boost_pricing: {
        Args: { p_hours: number }
        Returns: undefined
      }
      admin_delete_category: { Args: { p_slug: string }; Returns: undefined }
      admin_delete_review: { Args: { p_id: string }; Returns: undefined }
      admin_delete_subcategory: {
        Args: { p_category_slug: string; p_slug: string }
        Returns: undefined
      }
      admin_grant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_list_sellers: {
        Args: never
        Returns: {
          active_products: number
          avatar_url: string
          commission_rate_override: number
          created_at: string
          display_name: string
          effective_rate: number
          email: string
          id: string
          last_seen_at: string
          sales_count: number
          sales_total: number
          seller_tier: string
          shop_name: string
          suspend_reason: string
          suspended_until: string
          username: string
          verified_at: string
          wallet_balance: number
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          ban_reason: string
          banned_at: string
          created_at: string
          display_name: string
          email: string
          id: string
          last_ip: string
          last_ip_at: string
          last_seen_at: string
          roles: string[]
          signup_ip: string
          username: string
          verified_at: string
          wallet_balance: number
        }[]
      }
      admin_notify_sellers: {
        Args: {
          p_body: string
          p_link?: string
          p_seller_id: string
          p_title: string
        }
        Returns: number
      }
      admin_partial_refund: {
        Args: { p_notes?: string; p_order_id: string; p_refund_amount: number }
        Returns: undefined
      }
      admin_record_platform_payout: {
        Args: { p_amount: number; p_notes?: string }
        Returns: string
      }
      admin_reject_topup: {
        Args: { p_notes?: string; p_topup_id: string }
        Returns: undefined
      }
      admin_reject_withdrawal: {
        Args: { p_id: string; p_notes?: string }
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
      admin_set_commission_rate: {
        Args: { p_rate: number; p_seller_id: string }
        Returns: undefined
      }
      admin_set_verified: {
        Args: { p_user_id: string; p_verified: boolean }
        Returns: undefined
      }
      admin_set_wallet_balance: {
        Args: { p_balance: number; p_user_id: string }
        Returns: undefined
      }
      admin_suspend_seller: {
        Args: { p_hours: number; p_reason: string; p_seller_id: string }
        Returns: string
      }
      admin_unsuspend_seller: {
        Args: { p_seller_id: string }
        Returns: undefined
      }
      admin_update_review: {
        Args: { p_comment: string; p_id: string; p_rating: number }
        Returns: undefined
      }
      admin_upsert_banner: {
        Args: {
          p_bg_color: string
          p_ends_at: string
          p_id: string
          p_image_url: string
          p_is_active: boolean
          p_link_url: string
          p_sort_order: number
          p_starts_at: string
          p_subtitle: string
          p_text_color: string
          p_title: string
        }
        Returns: string
      }
      admin_upsert_boost_pricing: {
        Args: {
          p_cost: number
          p_hours: number
          p_is_active: boolean
          p_label: string
          p_sort_order: number
          p_sub_label: string
          p_tier: string
        }
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
      admin_upsert_subcategory: {
        Args: {
          p_category_slug: string
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
      boost_product: {
        Args: { _hours: number; _product_id: string }
        Returns: Json
      }
      close_support_ticket: {
        Args: { p_ticket_id: string }
        Returns: undefined
      }
      compute_seller_tier: {
        Args: { _avg_rating: number; _sales_count: number }
        Returns: string
      }
      confirm_order: { Args: { p_order_id: string }; Returns: undefined }
      create_order: {
        Args: {
          p_discount_code?: string
          p_product_id: string
          p_quantity?: number
        }
        Returns: string
      }
      dispute_order:
        | { Args: { p_order_id: string; p_reason: string }; Returns: undefined }
        | {
            Args: {
              p_evidence_path?: string
              p_evidence_url?: string
              p_order_id: string
              p_reason: string
            }
            Returns: undefined
          }
      get_category_counts: {
        Args: never
        Returns: {
          category: string
          count: number
        }[]
      }
      get_homepage_stats: { Args: never; Returns: Json }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          last_seen_at: string
          referral_code: string
          referred_by: string
          shop_name: string
          updated_at: string
          username: string
          wallet_balance: number
        }[]
      }
      get_my_wallet_balance: { Args: never; Returns: number }
      get_recent_sales: {
        Args: { _limit?: number }
        Returns: {
          buyer_name: string
          created_at: string
          order_id: string
          price: number
          product_slug: string
          product_title: string
        }[]
      }
      get_referral_stats: {
        Args: never
        Returns: {
          code: string
          rewarded_count: number
          total_earned: number
          total_invited: number
        }[]
      }
      get_seller_stats: {
        Args: { p_seller_id: string }
        Returns: {
          avg_rating: number
          completed_sales: number
          reviews_count: number
        }[]
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
      mark_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: undefined
      }
      mark_order_delivered: {
        Args: { p_order_id: string; p_payload: string }
        Returns: undefined
      }
      recalc_seller_tier: { Args: { _seller_id: string }; Returns: undefined }
      record_user_ip: { Args: { p_ip: string }; Returns: undefined }
      redeem_gift_card: { Args: { p_code: string }; Returns: number }
      redeem_loyalty_points: { Args: { p_points: number }; Returns: Json }
      redeem_referral_signup: { Args: { p_code: string }; Returns: undefined }
      release_seller_funds: { Args: never; Returns: number }
      reply_to_review: {
        Args: { p_reply: string; p_review_id: string }
        Returns: undefined
      }
      request_withdrawal: {
        Args: {
          p_account_holder?: string
          p_amount: number
          p_destination: string
          p_method: string
        }
        Returns: string
      }
      seller_effective_commission_rate: {
        Args: { _seller_id: string }
        Returns: number
      }
      staff_cancel_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      staff_reopen_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      start_conversation: {
        Args: { p_other_user: string; p_product_id?: string }
        Returns: string
      }
      submit_review: {
        Args: { p_comment?: string; p_product_id: string; p_rating: number }
        Returns: string
      }
      tier_commission_rate: { Args: { _tier: string }; Returns: number }
      toggle_favorite: { Args: { p_product_id: string }; Returns: boolean }
      touch_last_seen: { Args: never; Returns: undefined }
      user_avg_response_minutes: { Args: { p_user: string }; Returns: number }
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
