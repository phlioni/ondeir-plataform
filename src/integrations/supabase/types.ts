export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          role: 'admin' | 'partner' | 'user'
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'partner' | 'user'
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'partner' | 'user'
        }
      }
      markets: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          description: string | null
          category: string
          amenities: string[] | null
          address: string | null
          latitude: number
          longitude: number
          cover_image: string | null
          rating: number
          coin_balance: number
          delivery_fee: number | null
          delivery_time_min: number | null
          delivery_time_max: number | null
          slug: string | null
          opening_hours: Json | null
          payment_methods: Json | null
        }
        Insert: {
          owner_id?: string | null
          name: string
          description?: string | null
          category: string
          amenities?: string[] | null
          address?: string | null
          latitude: number
          longitude: number
          cover_image?: string | null
          coin_balance?: number
          delivery_fee?: number | null
          delivery_time_min?: number | null
          delivery_time_max?: number | null
          slug?: string | null
          opening_hours?: Json | null
          payment_methods?: Json | null
        }
        Update: {
          owner_id?: string | null
          name?: string
          description?: string | null
          category?: string
          amenities?: string[] | null
          address?: string | null
          latitude?: number
          longitude?: number
          cover_image?: string | null
          coin_balance?: number
          delivery_fee?: number | null
          delivery_time_min?: number | null
          delivery_time_max?: number | null
          slug?: string | null
          opening_hours?: Json | null
          payment_methods?: Json | null
        }
      }
      menu_items: {
        Row: {
          id: string
          market_id: string
          name: string
          description: string | null
          price: number
          category: string | null
          image_url: string | null
          active: boolean | null
          embedding: string | null
          created_at: string
        }
        Insert: {
          market_id: string
          name: string
          description?: string | null
          price: number
          category?: string | null
          image_url?: string | null
          active?: boolean | null
          embedding?: string | null
          created_at?: string
        }
        Update: {
          market_id?: string
          name?: string
          description?: string | null
          price?: number
          category?: string | null
          image_url?: string | null
          active?: boolean | null
          embedding?: string | null
          created_at?: string
        }
      }
      addon_groups: {
        Row: {
          id: string
          market_id: string | null
          name: string
          min_quantity: number
          max_quantity: number
          required: boolean
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          market_id?: string | null
          name: string
          min_quantity?: number
          max_quantity?: number
          required?: boolean
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string | null
          name?: string
          min_quantity?: number
          max_quantity?: number
          required?: boolean
          active?: boolean
          created_at?: string
        }
      }
      addon_items: {
        Row: {
          id: string
          group_id: string
          name: string
          price: number
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          price?: number
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          price?: number
          description?: string | null
          active?: boolean
          created_at?: string
        }
      }
      menu_item_addons: {
        Row: {
          menu_item_id: string
          addon_group_id: string
          display_order: number
          created_at: string
        }
        Insert: {
          menu_item_id: string
          addon_group_id: string
          display_order?: number
          created_at?: string
        }
        Update: {
          menu_item_id?: string
          addon_group_id?: string
          display_order?: number
          created_at?: string
        }
      }
      coin_transactions: {
        Row: {
          id: string
          market_id: string | null
          amount: number
          transaction_type: 'purchase' | 'bonus' | 'redemption' | 'manual_adjustment'
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          market_id?: string | null
          amount: number
          transaction_type: 'purchase' | 'bonus' | 'redemption' | 'manual_adjustment'
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string | null
          amount?: number
          transaction_type?: 'purchase' | 'bonus' | 'redemption' | 'manual_adjustment'
          description?: string | null
          created_at?: string
        }
      }
      coin_requests: {
        Row: {
          id: string
          market_id: string | null
          amount_coins: number
          amount_brl: number
          status: 'pending' | 'approved' | 'rejected'
          proof_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          market_id?: string | null
          amount_coins: number
          amount_brl: number
          status?: 'pending' | 'approved' | 'rejected'
          proof_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string | null
          amount_coins?: number
          amount_brl?: number
          status?: 'pending' | 'approved' | 'rejected'
          proof_url?: string | null
          created_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          market_id: string
          name: string
          unit: string
        }
        Insert: {
          market_id: string
          name: string
          unit: string
        }
        Update: {
          market_id?: string
          name?: string
          unit?: string
        }
      }
      product_recipes: {
        Row: {
          id: string
          menu_item_id: string
          ingredient_id: string
          quantity_needed: number
        }
        Insert: {
          menu_item_id: string
          ingredient_id: string
          quantity_needed: number
        }
        Update: {
          menu_item_id?: string
          ingredient_id?: string
          quantity_needed?: number
        }
      }
      order_items: {
        Row: {
          menu_item_id: string
        }
      }
    }
  }
}