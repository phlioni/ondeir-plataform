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
          // Novos campos
          coin_balance: number
          delivery_fee: number | null
          delivery_time_min: number | null
          delivery_time_max: number | null
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
          // Novos campos
          coin_balance?: number
          delivery_fee?: number | null
          delivery_time_min?: number | null
          delivery_time_max?: number | null
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
        }
        Insert: {
          market_id: string
          name: string
          description?: string | null
          price: number
          category?: string | null
          image_url?: string | null
        }
        Update: {
          market_id?: string
          name?: string
          description?: string | null
          price?: number
          category?: string | null
          image_url?: string | null
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
    }
  }
}