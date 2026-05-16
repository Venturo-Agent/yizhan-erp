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
      accounting_period_closings: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_voucher_id: string | null
          created_at: string | null
          id: string
          net_income: number
          period_end: string
          period_start: string
          period_type: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_voucher_id?: string | null
          created_at?: string | null
          id?: string
          net_income?: number
          period_end: string
          period_start: string
          period_type: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_voucher_id?: string | null
          created_at?: string | null
          id?: string
          net_income?: number
          period_end?: string
          period_start?: string
          period_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_closings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closings_closing_voucher_id_fkey"
            columns: ["closing_voucher_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          avatar_url: string | null
          capabilities: Json
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          scope: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          capabilities?: Json
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          scope?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          capabilities?: Json
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          scope?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      airport_images: {
        Row: {
          airport_code: string
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_default: boolean | null
          label: string | null
          season: string | null
          updated_at: string | null
          uploaded_by: string | null
          workspace_id: string | null
        }
        Insert: {
          airport_code: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_default?: boolean | null
          label?: string | null
          season?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          airport_code?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_default?: boolean | null
          label?: string | null
          season?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airport_images_airport_code_fkey"
            columns: ["airport_code"]
            isOneToOne: false
            referencedRelation: "ref_airports"
            referencedColumns: ["iata_code"]
          },
          {
            foreignKeyName: "airport_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_name: string
          id: string
          month: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          api_name: string
          id?: string
          month: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          api_name?: string
          id?: string
          month?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      attractions: {
        Row: {
          address: string | null
          category: string | null
          city_id: string | null
          contact_name: string | null
          country_code: string | null
          country_id: string
          created_at: string | null
          created_by: string | null
          data_verified: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          english_name: string | null
          fax: string | null
          google_maps_url: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          opening_hours: Json | null
          phone: string | null
          region_id: string | null
          tags: string[] | null
          ticket_price: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          city_id?: string | null
          contact_name?: string | null
          country_code?: string | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          data_verified?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          english_name?: string | null
          fax?: string | null
          google_maps_url?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          region_id?: string | null
          tags?: string[] | null
          ticket_price?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          category?: string | null
          city_id?: string | null
          contact_name?: string | null
          country_code?: string | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          data_verified?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          english_name?: string | null
          fax?: string | null
          google_maps_url?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          region_id?: string | null
          tags?: string[] | null
          ticket_price?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attractions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attractions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "attractions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attractions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attractions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attractions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attractions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attractions_workspace"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          ip: unknown
          reason: string | null
          request_id: string | null
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: number
          ip?: unknown
          reason?: string | null
          request_id?: string | null
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          ip?: unknown
          reason?: string | null
          request_id?: string | null
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      background_tasks: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          max_attempts: number
          payload: Json
          priority: Database["public"]["Enums"]["task_priority"]
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          priority?: Database["public"]["Enums"]["task_priority"]
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          priority?: Database["public"]["Enums"]["task_priority"]
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_id: string | null
          account_number: string | null
          bank_code: string | null
          bank_name: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletins: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          priority: number | null
          title: string
          type: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: number | null
          title: string
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: number | null
          title?: string
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletins_author_id_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletins_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          attendees: string[] | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end: string
          id: string
          owner_id: string
          recurring: string | null
          recurring_until: string | null
          related_order_id: string | null
          related_tour_id: string | null
          reminder_minutes: number | null
          start: string
          title: string
          type: string
          updated_at: string | null
          updated_by: string | null
          visibility: string
          workspace_id: string | null
        }
        Insert: {
          all_day?: boolean | null
          attendees?: string[] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end: string
          id?: string
          owner_id: string
          recurring?: string | null
          recurring_until?: string | null
          related_order_id?: string | null
          related_tour_id?: string | null
          reminder_minutes?: number | null
          start: string
          title: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string
          workspace_id?: string | null
        }
        Update: {
          all_day?: boolean | null
          attendees?: string[] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end?: string
          id?: string
          owner_id?: string
          recurring?: string | null
          recurring_until?: string | null
          related_order_id?: string | null
          related_tour_id?: string | null
          reminder_minutes?: number | null
          start?: string
          title?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_favorite: boolean | null
          is_system_locked: boolean | null
          last_used_at: string | null
          name: string
          parent_id: string | null
          updated_at: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          is_system_locked?: boolean | null
          last_used_at?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          is_system_locked?: boolean | null
          last_used_at?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checks: {
        Row: {
          amount: number
          check_date: string
          check_number: string
          created_at: string | null
          due_date: string
          id: string
          memo: string | null
          payee_name: string
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          check_date: string
          check_number: string
          created_at?: string | null
          due_date: string
          id?: string
          memo?: string | null
          payee_name: string
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          check_date?: string
          check_number?: string
          created_at?: string | null
          due_date?: string
          id?: string
          memo?: string | null
          payee_name?: string
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cis_clients: {
        Row: {
          address: string | null
          code: string
          company_name: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          status: string
          tags: string[]
          travel_types: string[]
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          code: string
          company_name: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[]
          travel_types?: string[]
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          code?: string
          company_name?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[]
          travel_types?: string[]
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cis_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cis_pricing_items: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          match_keywords: string[]
          name: string
          notes: string | null
          price_high: number | null
          price_low: number | null
          sort_order: number
          unit: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          match_keywords?: string[]
          name: string
          notes?: string | null
          price_high?: number | null
          price_low?: number | null
          sort_order?: number
          unit?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          match_keywords?: string[]
          name?: string
          notes?: string | null
          price_high?: number | null
          price_low?: number | null
          sort_order?: number
          unit?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cis_pricing_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_pricing_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_pricing_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cis_visits: {
        Row: {
          audio_url: string | null
          brand_card: Json
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          stage: string
          summary: string | null
          updated_at: string
          updated_by: string | null
          visited_at: string
          workspace_id: string
        }
        Insert: {
          audio_url?: string | null
          brand_card?: Json
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          stage?: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
          visited_at?: string
          workspace_id: string
        }
        Update: {
          audio_url?: string | null
          brand_card?: Json
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          stage?: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
          visited_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cis_visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "cis_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_visits_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_visits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          airport_code: string | null
          background_image_url: string | null
          background_image_url_2: string | null
          country_code: string | null
          country_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_major: boolean | null
          name: string
          name_en: string | null
          parent_city_id: string | null
          primary_image: number | null
          region_id: string | null
          timezone: string | null
          updated_at: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          airport_code?: string | null
          background_image_url?: string | null
          background_image_url_2?: string | null
          country_code?: string | null
          country_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id: string
          is_active?: boolean | null
          is_major?: boolean | null
          name: string
          name_en?: string | null
          parent_city_id?: string | null
          primary_image?: number | null
          region_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          airport_code?: string | null
          background_image_url?: string | null
          background_image_url_2?: string | null
          country_code?: string | null
          country_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_major?: boolean | null
          name?: string
          name_en?: string | null
          parent_city_id?: string | null
          primary_image?: number | null
          region_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_parent_city_id_fkey"
            columns: ["parent_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clock_records: {
        Row: {
          clock_at: string
          clock_date: string
          clock_type: string
          created_at: string
          created_by: string | null
          employee_id: string
          gps_accuracy_meters: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          is_remote: boolean
          is_within_geofence: boolean | null
          late_minutes: number
          missed_clock_request_id: string | null
          note: string | null
          source: string
          status: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          clock_at?: string
          clock_date?: string
          clock_type: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          gps_accuracy_meters?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          is_remote?: boolean
          is_within_geofence?: boolean | null
          late_minutes?: number
          missed_clock_request_id?: string | null
          note?: string | null
          source?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          clock_at?: string
          clock_date?: string
          clock_type?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          gps_accuracy_meters?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          is_remote?: boolean
          is_within_geofence?: boolean | null
          late_minutes?: number
          missed_clock_request_id?: string | null
          note?: string | null
          source?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clock_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_records_missed_clock_request_id_fkey"
            columns: ["missed_clock_request_id"]
            isOneToOne: false
            referencedRelation: "missed_clock_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          company_name: string
          created_at: string
          created_by: string | null
          credit_limit: number | null
          email: string | null
          id: string
          invoice_address: string | null
          invoice_email: string | null
          invoice_title: string | null
          is_active: boolean
          mailing_address: string | null
          notes: string | null
          payment_method: string | null
          payment_terms: number | null
          phone: string | null
          registered_address: string | null
          tax_id: string | null
          updated_at: string
          updated_by: string | null
          vip_level: number
          website: string | null
          workspace_id: string
        }
        Insert: {
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          invoice_address?: string | null
          invoice_email?: string | null
          invoice_title?: string | null
          is_active?: boolean
          mailing_address?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_terms?: number | null
          phone?: string | null
          registered_address?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vip_level?: number
          website?: string | null
          workspace_id: string
        }
        Update: {
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          invoice_address?: string | null
          invoice_email?: string | null
          invoice_title?: string | null
          is_active?: boolean
          mailing_address?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_terms?: number | null
          phone?: string | null
          registered_address?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vip_level?: number
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          english_name: string | null
          id: string
          is_active: boolean
          is_primary: boolean | null
          line_id: string | null
          mobile: string | null
          name: string
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          english_name?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean | null
          line_id?: string | null
          mobile?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          english_name?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean | null
          line_id?: string | null
          mobile?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          code: string
          company_address: string | null
          company_name: string | null
          company_representative: string | null
          company_tax_id: string | null
          contract_data: Json | null
          created_at: string | null
          created_by: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          id: string
          include_itinerary: boolean | null
          include_member_list: boolean | null
          member_ids: string[] | null
          order_id: string | null
          sent_at: string | null
          sent_to: string | null
          sent_via: string | null
          signature_image: string | null
          signature_ip: string | null
          signature_user_agent: string | null
          signed_at: string | null
          signer_address: string | null
          signer_id_number: string | null
          signer_name: string | null
          signer_phone: string | null
          signer_type: string | null
          status: string | null
          template: string
          tour_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          company_address?: string | null
          company_name?: string | null
          company_representative?: string | null
          company_tax_id?: string | null
          contract_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          id?: string
          include_itinerary?: boolean | null
          include_member_list?: boolean | null
          member_ids?: string[] | null
          order_id?: string | null
          sent_at?: string | null
          sent_to?: string | null
          sent_via?: string | null
          signature_image?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signer_address?: string | null
          signer_id_number?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_type?: string | null
          status?: string | null
          template: string
          tour_id: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          company_address?: string | null
          company_name?: string | null
          company_representative?: string | null
          company_tax_id?: string | null
          contract_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          id?: string
          include_itinerary?: boolean | null
          include_member_list?: boolean | null
          member_ids?: string[] | null
          order_id?: string | null
          sent_at?: string | null
          sent_to?: string | null
          sent_via?: string | null
          signature_image?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signer_address?: string | null
          signer_id_number?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_type?: string | null
          status?: string | null
          template?: string
          tour_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_templates: {
        Row: {
          attraction_id: string | null
          base_distance_km: number | null
          base_hours: number | null
          capacity: number | null
          category: string
          city_id: string
          cost_price: number
          created_at: string | null
          created_by: string | null
          currency: string
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          extra_km_rate: number | null
          id: string
          is_active: boolean | null
          item_name: string
          item_name_en: string | null
          max_quantity: number | null
          min_quantity: number | null
          notes: string | null
          overtime_rate: number | null
          route_destination: string | null
          route_origin: string | null
          season: string | null
          selling_price: number | null
          supplier_id: string
          trip_type: string | null
          unit: string
          updated_at: string | null
          updated_by: string | null
          valid_from: string | null
          valid_until: string | null
          vehicle_type: string | null
          workspace_id: string
        }
        Insert: {
          attraction_id?: string | null
          base_distance_km?: number | null
          base_hours?: number | null
          capacity?: number | null
          category: string
          city_id: string
          cost_price: number
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          extra_km_rate?: number | null
          id?: string
          is_active?: boolean | null
          item_name: string
          item_name_en?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          notes?: string | null
          overtime_rate?: number | null
          route_destination?: string | null
          route_origin?: string | null
          season?: string | null
          selling_price?: number | null
          supplier_id: string
          trip_type?: string | null
          unit: string
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vehicle_type?: string | null
          workspace_id: string
        }
        Update: {
          attraction_id?: string | null
          base_distance_km?: number | null
          base_hours?: number | null
          capacity?: number | null
          category?: string
          city_id?: string
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          extra_km_rate?: number | null
          id?: string
          is_active?: boolean | null
          item_name?: string
          item_name_en?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          notes?: string | null
          overtime_rate?: number | null
          route_destination?: string | null
          route_origin?: string | null
          season?: string | null
          selling_price?: number | null
          supplier_id?: string
          trip_type?: string | null
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vehicle_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_templates_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_templates_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_templates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string | null
          created_at: string | null
          display_order: number | null
          emoji: string | null
          has_regions: boolean | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string
          region: string | null
          updated_at: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          emoji?: string | null
          has_regions?: boolean | null
          id: string
          is_active?: boolean | null
          name: string
          name_en: string
          region?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          emoji?: string | null
          has_regions?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string
          region?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "countries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_execution_logs: {
        Row: {
          error_message: string | null
          executed_at: string | null
          id: string
          job_name: string
          result: Json | null
          success: boolean | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name: string
          result?: Json | null
          success?: boolean | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name?: string
          result?: Json | null
          success?: boolean | null
        }
        Relationships: []
      }
      cron_heartbeats: {
        Row: {
          attempts: number
          duration_ms: number | null
          finished_at: string | null
          job_name: string
          last_error: string | null
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          duration_ms?: number | null
          finished_at?: string | null
          job_name: string
          last_error?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          duration_ms?: number | null
          finished_at?: string | null
          job_name?: string
          last_error?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          alternative_phone: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          code: string
          company: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          dietary_restrictions: string | null
          email: string | null
          emergency_contact: Json | null
          english_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_vip: boolean | null
          last_order_date: string | null
          line_user_id: string | null
          linked_at: string | null
          linked_method: string | null
          member_type: string
          name: string
          national_id: string | null
          nationality: string | null
          nickname: string | null
          notes: string | null
          online_user_id: string | null
          passport_expiry: string | null
          passport_image_url: string | null
          passport_name: string | null
          passport_name_print: string | null
          passport_number: string | null
          phone: string | null
          referred_by: string | null
          sex: string | null
          source: string | null
          tax_id: string | null
          total_orders: number | null
          total_points: number | null
          total_spent: number | null
          updated_at: string
          updated_by: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          vip_level: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          alternative_phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          code: string
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          dietary_restrictions?: string | null
          email?: string | null
          emergency_contact?: Json | null
          english_name?: string | null
          gender?: string | null
          id: string
          is_active?: boolean | null
          is_vip?: boolean | null
          last_order_date?: string | null
          line_user_id?: string | null
          linked_at?: string | null
          linked_method?: string | null
          member_type?: string
          name: string
          national_id?: string | null
          nationality?: string | null
          nickname?: string | null
          notes?: string | null
          online_user_id?: string | null
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_name?: string | null
          passport_name_print?: string | null
          passport_number?: string | null
          phone?: string | null
          referred_by?: string | null
          sex?: string | null
          source?: string | null
          tax_id?: string | null
          total_orders?: number | null
          total_points?: number | null
          total_spent?: number | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          vip_level?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          alternative_phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          code?: string
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          dietary_restrictions?: string | null
          email?: string | null
          emergency_contact?: Json | null
          english_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_vip?: boolean | null
          last_order_date?: string | null
          line_user_id?: string | null
          linked_at?: string | null
          linked_method?: string | null
          member_type?: string
          name?: string
          national_id?: string | null
          nationality?: string | null
          nickname?: string | null
          notes?: string | null
          online_user_id?: string | null
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_name?: string | null
          passport_name_print?: string | null
          passport_number?: string | null
          phone?: string | null
          referred_by?: string | null
          sex?: string | null
          source?: string | null
          tax_id?: string | null
          total_orders?: number | null
          total_points?: number | null
          total_spent?: number | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          vip_level?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      disbursement_orders: {
        Row: {
          accounting_voucher_id: string | null
          amount: number
          bank_account_id: string | null
          code: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          disbursement_date: string | null
          disbursement_type: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          notes: string | null
          order_number: string | null
          payment_method: string | null
          pdf_url: string | null
          refund_id: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          accounting_voucher_id?: string | null
          amount: number
          bank_account_id?: string | null
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          disbursement_date?: string | null
          disbursement_type?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          refund_id?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          accounting_voucher_id?: string | null
          amount?: number
          bank_account_id?: string | null
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          disbursement_date?: string | null
          disbursement_type?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          refund_id?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disbursement_orders_accounting_voucher_id_fkey"
            columns: ["accounting_voucher_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursement_orders_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursement_orders_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursement_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_eligibilities: {
        Row: {
          employee_id: string
          eligibility_code: string
          workspace_id: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          employee_id: string
          eligibility_code: string
          workspace_id: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          employee_id?: string
          eligibility_code?: string
          workspace_id?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_eligibilities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_eligibilities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          amadeus_totp_account_name: string | null
          amadeus_totp_secret: string | null
          attendance: Json | null
          avatar_url: string | null
          birth_date: string | null
          birthday: string | null
          chinese_name: string | null
          contracts: Json | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          display_name: string | null
          email: string | null
          employee_number: string
          employee_type: string | null
          english_name: string | null
          hidden_menu_items: string[] | null
          id: string
          id_number: string | null
          job_info: Json | null
          job_title: string | null
          login_failed_count: number
          login_locked_until: string | null
          monthly_salary: number | null
          must_change_password: boolean | null
          password_hash: string | null
          personal_info: Json | null
          pinyin: string | null
          role_id: string | null
          salary_info: Json | null
          status: string | null
          terminated_at: string | null
          terminated_by: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          amadeus_totp_account_name?: string | null
          amadeus_totp_secret?: string | null
          attendance?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          birthday?: string | null
          chinese_name?: string | null
          contracts?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          display_name?: string | null
          email?: string | null
          employee_number: string
          employee_type?: string | null
          english_name?: string | null
          hidden_menu_items?: string[] | null
          id?: string
          id_number?: string | null
          job_info?: Json | null
          job_title?: string | null
          login_failed_count?: number
          login_locked_until?: string | null
          monthly_salary?: number | null
          must_change_password?: boolean | null
          password_hash?: string | null
          personal_info?: Json | null
          pinyin?: string | null
          role_id?: string | null
          salary_info?: Json | null
          status?: string | null
          terminated_at?: string | null
          terminated_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          amadeus_totp_account_name?: string | null
          amadeus_totp_secret?: string | null
          attendance?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          birthday?: string | null
          chinese_name?: string | null
          contracts?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          display_name?: string | null
          email?: string | null
          employee_number?: string
          employee_type?: string | null
          english_name?: string | null
          hidden_menu_items?: string[] | null
          id?: string
          id_number?: string | null
          job_info?: Json | null
          job_title?: string | null
          login_failed_count?: number
          login_locked_until?: string | null
          monthly_salary?: number | null
          must_change_password?: boolean | null
          password_hash?: string | null
          personal_info?: Json | null
          pinyin?: string | null
          role_id?: string | null
          salary_info?: Json | null
          status?: string | null
          terminated_at?: string | null
          terminated_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_terminated_by_fkey"
            columns: ["terminated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          icon: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_accounting_subject_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_status_subscriptions: {
        Row: {
          airline_code: string
          created_at: string | null
          external_provider: string | null
          external_subscription_id: string | null
          flight_date: string
          flight_number: string
          id: string
          is_active: boolean | null
          last_checked_at: string | null
          notify_channel_id: string | null
          notify_employee_ids: string[] | null
          notify_on: string[] | null
          pnr_id: string | null
          segment_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          airline_code: string
          created_at?: string | null
          external_provider?: string | null
          external_subscription_id?: string | null
          flight_date: string
          flight_number: string
          id?: string
          is_active?: boolean | null
          last_checked_at?: string | null
          notify_channel_id?: string | null
          notify_employee_ids?: string[] | null
          notify_on?: string[] | null
          pnr_id?: string | null
          segment_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          airline_code?: string
          created_at?: string | null
          external_provider?: string | null
          external_subscription_id?: string | null
          flight_date?: string
          flight_number?: string
          id?: string
          is_active?: boolean | null
          last_checked_at?: string | null
          notify_channel_id?: string | null
          notify_employee_ids?: string[] | null
          notify_on?: string[] | null
          pnr_id?: string | null
          segment_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_status_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          address_en: string | null
          airport_transfer: boolean | null
          amenities: string[] | null
          avg_price_per_night: number | null
          awards: string[] | null
          best_seasons: string[] | null
          booking_contact: string | null
          booking_email: string | null
          booking_phone: string | null
          brand: string | null
          butler_service: boolean | null
          category: string | null
          certifications: string[] | null
          city_id: string | null
          commission_rate: number | null
          concierge_service: boolean | null
          country_code: string | null
          country_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          data_verified: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          description: string | null
          description_en: string | null
          dining_options: string[] | null
          display_order: number | null
          english_name: string | null
          facilities: Json | null
          fax: string | null
          google_maps_url: string | null
          group_friendly: boolean | null
          group_rate_available: boolean | null
          has_michelin_restaurant: boolean | null
          highlights: string[] | null
          hotel_class: string | null
          id: string
          images: string[] | null
          internal_notes: string | null
          is_active: boolean | null
          is_featured: boolean | null
          latitude: number | null
          longitude: number | null
          max_group_size: number | null
          min_rooms_for_group: number | null
          name: string
          name_local: string | null
          notes: string | null
          phone: string | null
          price_range: string | null
          region_id: string | null
          restaurants_count: number | null
          room_types: Json | null
          star_rating: number | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          address_en?: string | null
          airport_transfer?: boolean | null
          amenities?: string[] | null
          avg_price_per_night?: number | null
          awards?: string[] | null
          best_seasons?: string[] | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_phone?: string | null
          brand?: string | null
          butler_service?: boolean | null
          category?: string | null
          certifications?: string[] | null
          city_id?: string | null
          commission_rate?: number | null
          concierge_service?: boolean | null
          country_code?: string | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          data_verified?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          description_en?: string | null
          dining_options?: string[] | null
          display_order?: number | null
          english_name?: string | null
          facilities?: Json | null
          fax?: string | null
          google_maps_url?: string | null
          group_friendly?: boolean | null
          group_rate_available?: boolean | null
          has_michelin_restaurant?: boolean | null
          highlights?: string[] | null
          hotel_class?: string | null
          id?: string
          images?: string[] | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          min_rooms_for_group?: number | null
          name: string
          name_local?: string | null
          notes?: string | null
          phone?: string | null
          price_range?: string | null
          region_id?: string | null
          restaurants_count?: number | null
          room_types?: Json | null
          star_rating?: number | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
          workspace_id?: string
        }
        Update: {
          address?: string | null
          address_en?: string | null
          airport_transfer?: boolean | null
          amenities?: string[] | null
          avg_price_per_night?: number | null
          awards?: string[] | null
          best_seasons?: string[] | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_phone?: string | null
          brand?: string | null
          butler_service?: boolean | null
          category?: string | null
          certifications?: string[] | null
          city_id?: string | null
          commission_rate?: number | null
          concierge_service?: boolean | null
          country_code?: string | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          data_verified?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          description_en?: string | null
          dining_options?: string[] | null
          display_order?: number | null
          english_name?: string | null
          facilities?: Json | null
          fax?: string | null
          google_maps_url?: string | null
          group_friendly?: boolean | null
          group_rate_available?: boolean | null
          has_michelin_restaurant?: boolean | null
          highlights?: string[] | null
          hotel_class?: string | null
          id?: string
          images?: string[] | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          min_rooms_for_group?: number | null
          name?: string
          name_local?: string | null
          notes?: string | null
          phone?: string | null
          price_range?: string | null
          region_id?: string | null
          restaurants_count?: number | null
          room_types?: Json | null
          star_rating?: number | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "hotels_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luxury_hotels_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luxury_hotels_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luxury_hotels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luxury_hotels_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luxury_hotels_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      image_library: {
        Row: {
          attraction_id: string | null
          category: string | null
          city_id: string | null
          country_code: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          public_url: string
          tags: string[] | null
          updated_at: string
          width: number | null
          workspace_id: string
        }
        Insert: {
          attraction_id?: string | null
          category?: string | null
          city_id?: string | null
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          public_url: string
          tags?: string[] | null
          updated_at?: string
          width?: number | null
          workspace_id: string
        }
        Update: {
          attraction_id?: string | null
          category?: string | null
          city_id?: string | null
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          public_url?: string
          tags?: string[] | null
          updated_at?: string
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_library_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "image_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_library_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          archived_at: string | null
          author_name: string | null
          cancellation_policy: string[] | null
          city: string | null
          closed_at: string | null
          code: string | null
          country: string | null
          cover_image: string | null
          cover_style: string | null
          created_at: string
          created_by: string | null
          daily_itinerary: Json | null
          departure_date: string | null
          description: string | null
          duration_days: number | null
          erp_itinerary_id: string | null
          faqs: Json | null
          features: Json | null
          features_style: string | null
          flight_style: string | null
          focus_cards: Json | null
          hidden_items_for_brochure: Json | null
          hidden_items_for_web: Json | null
          hotel_style: string | null
          hotels: Json | null
          id: string
          is_latest: boolean | null
          is_template: boolean | null
          itinerary_style: string | null
          itinerary_subtitle: string | null
          leader: Json | null
          leader_style: string | null
          meeting_info: Json | null
          notices: string[] | null
          outbound_flight: Json | null
          parent_id: string | null
          price_note: string | null
          price_tiers: Json | null
          pricing_style: string | null
          return_flight: Json | null
          show_cancellation_policy: boolean | null
          show_faqs: boolean | null
          show_features: boolean | null
          show_hotels: boolean | null
          show_leader_meeting: boolean | null
          show_notices: boolean | null
          show_price_tiers: boolean | null
          show_pricing_details: boolean | null
          status: string | null
          subtitle: string | null
          summary: string | null
          tagline: string | null
          template_code: string | null
          template_id: string | null
          template_name: string | null
          title: string | null
          tour_code: string | null
          tour_id: string | null
          updated_at: string
          updated_by: string | null
          version: number | null
          version_records: Json | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          author_name?: string | null
          cancellation_policy?: string[] | null
          city?: string | null
          closed_at?: string | null
          code?: string | null
          country?: string | null
          cover_image?: string | null
          cover_style?: string | null
          created_at?: string
          created_by?: string | null
          daily_itinerary?: Json | null
          departure_date?: string | null
          description?: string | null
          duration_days?: number | null
          erp_itinerary_id?: string | null
          faqs?: Json | null
          features?: Json | null
          features_style?: string | null
          flight_style?: string | null
          focus_cards?: Json | null
          hidden_items_for_brochure?: Json | null
          hidden_items_for_web?: Json | null
          hotel_style?: string | null
          hotels?: Json | null
          id?: string
          is_latest?: boolean | null
          is_template?: boolean | null
          itinerary_style?: string | null
          itinerary_subtitle?: string | null
          leader?: Json | null
          leader_style?: string | null
          meeting_info?: Json | null
          notices?: string[] | null
          outbound_flight?: Json | null
          parent_id?: string | null
          price_note?: string | null
          price_tiers?: Json | null
          pricing_style?: string | null
          return_flight?: Json | null
          show_cancellation_policy?: boolean | null
          show_faqs?: boolean | null
          show_features?: boolean | null
          show_hotels?: boolean | null
          show_leader_meeting?: boolean | null
          show_notices?: boolean | null
          show_price_tiers?: boolean | null
          show_pricing_details?: boolean | null
          status?: string | null
          subtitle?: string | null
          summary?: string | null
          tagline?: string | null
          template_code?: string | null
          template_id?: string | null
          template_name?: string | null
          title?: string | null
          tour_code?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          version_records?: Json | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          author_name?: string | null
          cancellation_policy?: string[] | null
          city?: string | null
          closed_at?: string | null
          code?: string | null
          country?: string | null
          cover_image?: string | null
          cover_style?: string | null
          created_at?: string
          created_by?: string | null
          daily_itinerary?: Json | null
          departure_date?: string | null
          description?: string | null
          duration_days?: number | null
          erp_itinerary_id?: string | null
          faqs?: Json | null
          features?: Json | null
          features_style?: string | null
          flight_style?: string | null
          focus_cards?: Json | null
          hidden_items_for_brochure?: Json | null
          hidden_items_for_web?: Json | null
          hotel_style?: string | null
          hotels?: Json | null
          id?: string
          is_latest?: boolean | null
          is_template?: boolean | null
          itinerary_style?: string | null
          itinerary_subtitle?: string | null
          leader?: Json | null
          leader_style?: string | null
          meeting_info?: Json | null
          notices?: string[] | null
          outbound_flight?: Json | null
          parent_id?: string | null
          price_note?: string | null
          price_tiers?: Json | null
          pricing_style?: string | null
          return_flight?: Json | null
          show_cancellation_policy?: boolean | null
          show_faqs?: boolean | null
          show_features?: boolean | null
          show_hotels?: boolean | null
          show_leader_meeting?: boolean | null
          show_notices?: boolean | null
          show_price_tiers?: boolean | null
          show_pricing_details?: boolean | null
          status?: string | null
          subtitle?: string | null
          summary?: string | null
          tagline?: string | null
          template_code?: string | null
          template_id?: string | null
          template_name?: string | null
          title?: string | null
          tour_code?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          version_records?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_itineraries_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_itineraries_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_itineraries_workspace"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itineraries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itineraries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itineraries_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itineraries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itineraries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string | null
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          line_no: number
          subledger_id: string | null
          subledger_type: Database["public"]["Enums"]["subledger_type"] | null
          voucher_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          line_no: number
          subledger_id?: string | null
          subledger_type?: Database["public"]["Enums"]["subledger_type"] | null
          voucher_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          line_no?: number
          subledger_id?: string | null
          subledger_type?: Database["public"]["Enums"]["subledger_type"] | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_vouchers: {
        Row: {
          company_unit: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          memo: string | null
          reversed_by_id: string | null
          reversed_from_id: string | null
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["voucher_status"] | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string | null
          voucher_date: string
          voucher_no: string
          workspace_id: string | null
        }
        Insert: {
          company_unit?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          memo?: string | null
          reversed_by_id?: string | null
          reversed_from_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["voucher_status"] | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
          voucher_date: string
          voucher_no: string
          workspace_id?: string | null
        }
        Update: {
          company_unit?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          memo?: string | null
          reversed_by_id?: string | null
          reversed_from_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["voucher_status"] | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
          voucher_date?: string
          voucher_no?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_vouchers_reversed_by_id_fkey"
            columns: ["reversed_by_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_vouchers_reversed_from_id_fkey"
            columns: ["reversed_from_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_vouchers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          pending_days: number
          total_days: number
          updated_at: string
          used_days: number
          workspace_id: string
          year: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          pending_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          workspace_id: string
          year: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          pending_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          approver_note: string | null
          attachments: Json
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          end_at: string
          estimated_deduction_amount: number | null
          id: string
          leave_type_id: string
          reason: string
          reject_reason: string | null
          start_at: string
          status: string
          total_days: number
          total_minutes: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          approver_note?: string | null
          attachments?: Json
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          end_at: string
          estimated_deduction_amount?: number | null
          id?: string
          leave_type_id: string
          reason: string
          reject_reason?: string | null
          start_at: string
          status?: string
          total_days: number
          total_minutes: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          approver_note?: string | null
          attachments?: Json
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          end_at?: string
          estimated_deduction_amount?: number | null
          id?: string
          leave_type_id?: string
          reason?: string
          reject_reason?: string | null
          start_at?: string
          status?: string
          total_days?: number
          total_minutes?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          attachment_threshold_days: number | null
          attendance_bonus_flag: string
          code: string
          created_at: string
          default_days_per_year: number | null
          id: string
          is_active: boolean
          legal_basis: string | null
          name: string
          pay_type: string
          quota_type: string
          requires_attachment: boolean
          sort_order: number
          supports_hourly: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attachment_threshold_days?: number | null
          attendance_bonus_flag?: string
          code: string
          created_at?: string
          default_days_per_year?: number | null
          id?: string
          is_active?: boolean
          legal_basis?: string | null
          name: string
          pay_type?: string
          quota_type?: string
          requires_attachment?: boolean
          sort_order?: number
          supports_hourly?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attachment_threshold_days?: number | null
          attendance_bonus_flag?: string
          code?: string
          created_at?: string
          default_days_per_year?: number | null
          id?: string
          is_active?: boolean
          legal_basis?: string | null
          name?: string
          pay_type?: string
          quota_type?: string
          requires_attachment?: boolean
          sort_order?: number
          supports_hourly?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      line_conversation_messages: {
        Row: {
          content: string | null
          created_at: string
          direction: string
          id: number
          line_user_id: string
          message_type: string
          raw_event: Json | null
          related_order_id: string | null
          reply_token: string | null
          sender: string
          workspace_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          direction: string
          id?: number
          line_user_id: string
          message_type?: string
          raw_event?: Json | null
          related_order_id?: string | null
          reply_token?: string | null
          sender: string
          workspace_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          direction?: string
          id?: number
          line_user_id?: string
          message_type?: string
          raw_event?: Json | null
          related_order_id?: string | null
          reply_token?: string | null
          sender?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_conversation_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      missed_clock_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          clock_type: string
          created_at: string
          created_by: string | null
          date: string
          employee_id: string
          id: string
          reason: string
          reject_reason: string | null
          requested_time: string
          status: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          clock_type: string
          created_at?: string
          created_by?: string | null
          date: string
          employee_id: string
          id?: string
          reason: string
          reject_reason?: string | null
          requested_time: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          clock_type?: string
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string
          id?: string
          reason?: string
          reject_reason?: string | null
          requested_time?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missed_clock_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missed_clock_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missed_clock_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missed_clock_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missed_clock_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          tab_id: string
          tab_name: string
          tab_order: number
          updated_at: string | null
          updated_by: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tab_id: string
          tab_name?: string
          tab_order?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tab_id?: string
          tab_name?: string
          tab_order?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      order_members: {
        Row: {
          age: number | null
          balance_amount: number | null
          balance_receipt_no: string | null
          birth_date: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          chinese_name: string | null
          contract_created_at: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          custom_costs: Json | null
          customer_id: string | null
          deposit_amount: number | null
          deposit_receipt_no: string | null
          dietary_requirements: string | null
          flight_cost: number | null
          flight_self_arranged: boolean | null
          gender: string | null
          hotel_1_checkin: string | null
          hotel_1_checkout: string | null
          hotel_1_name: string | null
          hotel_2_checkin: string | null
          hotel_2_checkout: string | null
          hotel_2_name: string | null
          id: string
          id_number: string | null
          identity: string | null
          member_type: string
          misc_cost: number | null
          order_id: string
          passport_expiry: string | null
          passport_image_url: string | null
          passport_name: string | null
          passport_name_print: string | null
          passport_number: string | null
          pnr: string | null
          profit: number | null
          remarks: string | null
          room_type: string | null
          roommate_id: string | null
          selling_price: number | null
          sort_order: number | null
          special_meal: string | null
          special_requests: string | null
          ticket_number: string | null
          ticketing_deadline: string | null
          total_payable: number | null
          tour_id: string | null
          transport_cost: number | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          age?: number | null
          balance_amount?: number | null
          balance_receipt_no?: string | null
          birth_date?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          chinese_name?: string | null
          contract_created_at?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_costs?: Json | null
          customer_id?: string | null
          deposit_amount?: number | null
          deposit_receipt_no?: string | null
          dietary_requirements?: string | null
          flight_cost?: number | null
          flight_self_arranged?: boolean | null
          gender?: string | null
          hotel_1_checkin?: string | null
          hotel_1_checkout?: string | null
          hotel_1_name?: string | null
          hotel_2_checkin?: string | null
          hotel_2_checkout?: string | null
          hotel_2_name?: string | null
          id?: string
          id_number?: string | null
          identity?: string | null
          member_type?: string
          misc_cost?: number | null
          order_id: string
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_name?: string | null
          passport_name_print?: string | null
          passport_number?: string | null
          pnr?: string | null
          profit?: number | null
          remarks?: string | null
          room_type?: string | null
          roommate_id?: string | null
          selling_price?: number | null
          sort_order?: number | null
          special_meal?: string | null
          special_requests?: string | null
          ticket_number?: string | null
          ticketing_deadline?: string | null
          total_payable?: number | null
          tour_id?: string | null
          transport_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          age?: number | null
          balance_amount?: number | null
          balance_receipt_no?: string | null
          birth_date?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          chinese_name?: string | null
          contract_created_at?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_costs?: Json | null
          customer_id?: string | null
          deposit_amount?: number | null
          deposit_receipt_no?: string | null
          dietary_requirements?: string | null
          flight_cost?: number | null
          flight_self_arranged?: boolean | null
          gender?: string | null
          hotel_1_checkin?: string | null
          hotel_1_checkout?: string | null
          hotel_1_name?: string | null
          hotel_2_checkin?: string | null
          hotel_2_checkout?: string | null
          hotel_2_name?: string | null
          id?: string
          id_number?: string | null
          identity?: string | null
          member_type?: string
          misc_cost?: number | null
          order_id?: string
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_name?: string | null
          passport_name_print?: string | null
          passport_number?: string | null
          pnr?: string | null
          profit?: number | null
          remarks?: string | null
          room_type?: string | null
          roommate_id?: string | null
          selling_price?: number | null
          sort_order?: number | null
          special_meal?: string | null
          special_requests?: string | null
          ticket_number?: string | null
          ticketing_deadline?: string | null
          total_payable?: number | null
          tour_id?: string | null
          transport_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_members_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_members_roommate_id_fkey"
            columns: ["roommate_id"]
            isOneToOne: false
            referencedRelation: "order_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_members_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          adult_count: number | null
          assistant: string | null
          assistant_id: string | null
          code: string
          contact_email: string | null
          contact_person: string
          contact_phone: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          departure_date: string | null
          id: string
          identity_options: Json | null
          is_active: boolean | null
          member_count: number | null
          notes: string | null
          order_number: string | null
          paid_amount: number | null
          payment_status: string | null
          remaining_amount: number | null
          sales_id: string | null
          sales_person: string | null
          status: string
          total_amount: number | null
          tour_id: string | null
          tour_name: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          adult_count?: number | null
          assistant?: string | null
          assistant_id?: string | null
          code: string
          contact_email?: string | null
          contact_person: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          departure_date?: string | null
          id?: string
          identity_options?: Json | null
          is_active?: boolean | null
          member_count?: number | null
          notes?: string | null
          order_number?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          remaining_amount?: number | null
          sales_id?: string | null
          sales_person?: string | null
          status?: string
          total_amount?: number | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          adult_count?: number | null
          assistant?: string | null
          assistant_id?: string | null
          code?: string
          contact_email?: string | null
          contact_person?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          departure_date?: string | null
          id?: string
          identity_options?: Json | null
          is_active?: boolean | null
          member_count?: number | null
          notes?: string | null
          order_number?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          remaining_amount?: number | null
          sales_id?: string | null
          sales_person?: string | null
          status?: string
          total_amount?: number | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          date: string
          employee_id: string
          end_time: string
          hours: number
          id: string
          overtime_type: string
          reason: string | null
          reject_reason: string | null
          start_time: string
          status: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          employee_id: string
          end_time: string
          hours: number
          id?: string
          overtime_type?: string
          reason?: string | null
          reject_reason?: string | null
          start_time: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string
          end_time?: string
          hours?: number
          id?: string
          overtime_type?: string
          reason?: string | null
          reject_reason?: string | null
          start_time?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string | null
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          fee_account_id: string | null
          fee_fixed: number
          fee_percent: number
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          placeholder: string | null
          sort_order: number | null
          type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          fee_account_id?: string | null
          fee_fixed?: number
          fee_percent?: number
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          placeholder?: string | null
          sort_order?: number | null
          type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          fee_account_id?: string | null
          fee_fixed?: number
          fee_percent?: number
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          placeholder?: string | null
          sort_order?: number | null
          type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_fee_account_id_fkey"
            columns: ["fee_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_request_items: {
        Row: {
          advanced_by: string | null
          advanced_by_name: string | null
          category: string | null
          confirmation_item_id: string | null
          created_at: string | null
          created_by: string | null
          custom_request_date: string | null
          description: string
          id: string
          item_number: string | null
          notes: string | null
          payment_method: string | null
          payment_method_id: string | null
          quantity: number | null
          request_id: string | null
          sort_order: number | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          tour_id: string | null
          transferred_at: string | null
          transferred_by: string | null
          transferred_from_tour_id: string | null
          unit_price: number | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          advanced_by?: string | null
          advanced_by_name?: string | null
          category?: string | null
          confirmation_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_request_date?: string | null
          description: string
          id?: string
          item_number?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          quantity?: number | null
          request_id?: string | null
          sort_order?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          tour_id?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          transferred_from_tour_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          advanced_by?: string | null
          advanced_by_name?: string | null
          category?: string | null
          confirmation_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_request_date?: string | null
          description?: string
          id?: string
          item_number?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          quantity?: number | null
          request_id?: string | null
          sort_order?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          tour_id?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          transferred_from_tour_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_request_items_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_request_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_request_items_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          accounting_subject_id: string | null
          accounting_voucher_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          budget_warning: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          disbursement_order_id: string | null
          expense_type: string | null
          id: string
          is_special_billing: boolean | null
          notes: string | null
          order_id: string | null
          order_number: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method_id: string | null
          request_category: string | null
          request_date: string | null
          request_number: string | null
          request_type: string
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number | null
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          transferred_pair_id: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          accounting_subject_id?: string | null
          accounting_voucher_id?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          budget_warning?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          disbursement_order_id?: string | null
          expense_type?: string | null
          id?: string
          is_special_billing?: boolean | null
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method_id?: string | null
          request_category?: string | null
          request_date?: string | null
          request_number?: string | null
          request_type: string
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          transferred_pair_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          accounting_subject_id?: string | null
          accounting_voucher_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          budget_warning?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          disbursement_order_id?: string | null
          expense_type?: string | null
          id?: string
          is_special_billing?: boolean | null
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method_id?: string | null
          request_category?: string | null
          request_date?: string | null
          request_number?: string | null
          request_type?: string
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          transferred_pair_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_accounting_subject_id_fkey"
            columns: ["accounting_subject_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_accounting_voucher_id_fkey"
            columns: ["accounting_voucher_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_disbursement_order_id_fkey"
            columns: ["disbursement_order_id"]
            isOneToOne: false
            referencedRelation: "disbursement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          created_by: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          law_version: string | null
          note: string | null
          period_month: number
          period_year: number
          status: string
          total_deduction_amount: number
          total_employees: number
          total_gross_amount: number
          total_net_amount: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          law_version?: string | null
          note?: string | null
          period_month: number
          period_year: number
          status?: string
          total_deduction_amount?: number
          total_employees?: number
          total_gross_amount?: number
          total_net_amount?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          law_version?: string | null
          note?: string | null
          period_month?: number
          period_year?: number
          status?: string
          total_deduction_amount?: number
          total_employees?: number
          total_gross_amount?: number
          total_net_amount?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          attendance_bonus: number
          attendance_bonus_deduction: number
          base_salary: number
          calc_breakdown: Json
          created_at: string
          created_by: string | null
          employee_id: string
          employee_snapshot: Json
          gross_amount: number
          has_warnings: boolean
          health_insurance_employee: number
          health_insurance_employer: number
          id: string
          income_tax: number
          labor_insurance_employee: number
          labor_insurance_employer: number
          leave_deduction: number
          net_amount: number
          note: string | null
          other_allowances: number
          other_deductions: number
          overtime_pay: number
          payroll_run_id: string
          pension_employer: number
          pension_voluntary: number
          period_month: number
          period_year: number
          sent_to_employee_at: string | null
          updated_at: string
          updated_by: string | null
          warnings: Json
          workspace_id: string
        }
        Insert: {
          attendance_bonus?: number
          attendance_bonus_deduction?: number
          base_salary?: number
          calc_breakdown?: Json
          created_at?: string
          created_by?: string | null
          employee_id: string
          employee_snapshot?: Json
          gross_amount?: number
          has_warnings?: boolean
          health_insurance_employee?: number
          health_insurance_employer?: number
          id?: string
          income_tax?: number
          labor_insurance_employee?: number
          labor_insurance_employer?: number
          leave_deduction?: number
          net_amount?: number
          note?: string | null
          other_allowances?: number
          other_deductions?: number
          overtime_pay?: number
          payroll_run_id: string
          pension_employer?: number
          pension_voluntary?: number
          period_month: number
          period_year: number
          sent_to_employee_at?: string | null
          updated_at?: string
          updated_by?: string | null
          warnings?: Json
          workspace_id: string
        }
        Update: {
          attendance_bonus?: number
          attendance_bonus_deduction?: number
          base_salary?: number
          calc_breakdown?: Json
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employee_snapshot?: Json
          gross_amount?: number
          has_warnings?: boolean
          health_insurance_employee?: number
          health_insurance_employer?: number
          id?: string
          income_tax?: number
          labor_insurance_employee?: number
          labor_insurance_employer?: number
          leave_deduction?: number
          net_amount?: number
          note?: string | null
          other_allowances?: number
          other_deductions?: number
          overtime_pay?: number
          payroll_run_id?: string
          pension_employer?: number
          pension_voluntary?: number
          period_month?: number
          period_year?: number
          sent_to_employee_at?: string | null
          updated_at?: string
          updated_by?: string | null
          warnings?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pnr_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_date: string | null
          id: string
          is_ticketed: boolean | null
          notes: string | null
          office_id: string | null
          raw_content: string | null
          record_locator: string
          ticket_numbers: string[] | null
          ticketing_deadline: string | null
          ticketing_status: string | null
          tour_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          id?: string
          is_ticketed?: boolean | null
          notes?: string | null
          office_id?: string | null
          raw_content?: string | null
          record_locator: string
          ticket_numbers?: string[] | null
          ticketing_deadline?: string | null
          ticketing_status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          id?: string
          is_ticketed?: boolean | null
          notes?: string | null
          office_id?: string | null
          raw_content?: string | null
          record_locator?: string
          ticket_numbers?: string[] | null
          ticketing_deadline?: string | null
          ticketing_status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pnr_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pnr_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_experiences: {
        Row: {
          advance_booking_days: number | null
          available_seasons: string[] | null
          awards: string[] | null
          best_for_age_group: string | null
          best_time_of_day: string | null
          booking_contact: string | null
          booking_email: string | null
          booking_phone: string | null
          cancellation_policy: string | null
          category: string
          certifications: string[] | null
          city_id: string
          combine_with: string[] | null
          commission_rate: number | null
          country_code: string | null
          country_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string
          description_en: string | null
          difficulty_level: string | null
          display_order: number | null
          dress_code: string | null
          duration_hours: number | null
          eco_friendly: boolean | null
          english_name: string | null
          exclusivity_level: string
          expert_credentials: string[] | null
          expert_name: string | null
          expert_profile: string | null
          expert_title: string | null
          group_size_max: number | null
          group_size_min: number | null
          highlights: string[] | null
          id: string
          images: string[] | null
          inclusions: Json | null
          internal_notes: string | null
          is_active: boolean | null
          is_featured: boolean | null
          language_support: string[] | null
          latitude: number | null
          longitude: number | null
          media_features: string[] | null
          meeting_point: string | null
          meeting_point_coords: Json | null
          minimum_participants: number | null
          name: string
          name_local: string | null
          net_price_per_person: number | null
          physical_requirement: string | null
          pickup_service: boolean | null
          price_excludes: string[] | null
          price_includes: string[] | null
          price_per_person_max: number | null
          price_per_person_min: number | null
          ratings: Json | null
          recommended_for: string[] | null
          region_id: string | null
          related_attractions: string[] | null
          restrictions: string[] | null
          review_count: number | null
          specific_location: string | null
          sub_category: string[] | null
          suitable_for_children: boolean | null
          supports_local_community: boolean | null
          sustainability_practices: string[] | null
          tagline: string | null
          thumbnail: string | null
          transportation_included: boolean | null
          updated_at: string | null
          updated_by: string | null
          video_url: string | null
          what_makes_it_special: string | null
          what_to_bring: string[] | null
          workspace_id: string
        }
        Insert: {
          advance_booking_days?: number | null
          available_seasons?: string[] | null
          awards?: string[] | null
          best_for_age_group?: string | null
          best_time_of_day?: string | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_phone?: string | null
          cancellation_policy?: string | null
          category: string
          certifications?: string[] | null
          city_id: string
          combine_with?: string[] | null
          commission_rate?: number | null
          country_code?: string | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description: string
          description_en?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          dress_code?: string | null
          duration_hours?: number | null
          eco_friendly?: boolean | null
          english_name?: string | null
          exclusivity_level: string
          expert_credentials?: string[] | null
          expert_name?: string | null
          expert_profile?: string | null
          expert_title?: string | null
          group_size_max?: number | null
          group_size_min?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          inclusions?: Json | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          language_support?: string[] | null
          latitude?: number | null
          longitude?: number | null
          media_features?: string[] | null
          meeting_point?: string | null
          meeting_point_coords?: Json | null
          minimum_participants?: number | null
          name: string
          name_local?: string | null
          net_price_per_person?: number | null
          physical_requirement?: string | null
          pickup_service?: boolean | null
          price_excludes?: string[] | null
          price_includes?: string[] | null
          price_per_person_max?: number | null
          price_per_person_min?: number | null
          ratings?: Json | null
          recommended_for?: string[] | null
          region_id?: string | null
          related_attractions?: string[] | null
          restrictions?: string[] | null
          review_count?: number | null
          specific_location?: string | null
          sub_category?: string[] | null
          suitable_for_children?: boolean | null
          supports_local_community?: boolean | null
          sustainability_practices?: string[] | null
          tagline?: string | null
          thumbnail?: string | null
          transportation_included?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          video_url?: string | null
          what_makes_it_special?: string | null
          what_to_bring?: string[] | null
          workspace_id: string
        }
        Update: {
          advance_booking_days?: number | null
          available_seasons?: string[] | null
          awards?: string[] | null
          best_for_age_group?: string | null
          best_time_of_day?: string | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_phone?: string | null
          cancellation_policy?: string | null
          category?: string
          certifications?: string[] | null
          city_id?: string
          combine_with?: string[] | null
          commission_rate?: number | null
          country_code?: string | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string
          description_en?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          dress_code?: string | null
          duration_hours?: number | null
          eco_friendly?: boolean | null
          english_name?: string | null
          exclusivity_level?: string
          expert_credentials?: string[] | null
          expert_name?: string | null
          expert_profile?: string | null
          expert_title?: string | null
          group_size_max?: number | null
          group_size_min?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          inclusions?: Json | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          language_support?: string[] | null
          latitude?: number | null
          longitude?: number | null
          media_features?: string[] | null
          meeting_point?: string | null
          meeting_point_coords?: Json | null
          minimum_participants?: number | null
          name?: string
          name_local?: string | null
          net_price_per_person?: number | null
          physical_requirement?: string | null
          pickup_service?: boolean | null
          price_excludes?: string[] | null
          price_includes?: string[] | null
          price_per_person_max?: number | null
          price_per_person_min?: number | null
          ratings?: Json | null
          recommended_for?: string[] | null
          region_id?: string | null
          related_attractions?: string[] | null
          restrictions?: string[] | null
          review_count?: number | null
          specific_location?: string | null
          sub_category?: string[] | null
          suitable_for_children?: boolean | null
          supports_local_community?: boolean | null
          sustainability_practices?: string[] | null
          tagline?: string | null
          thumbnail?: string | null
          transportation_included?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          video_url?: string | null
          what_makes_it_special?: string | null
          what_to_bring?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_experiences_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_experiences_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "premium_experiences_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_experiences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_experiences_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_experiences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_experiences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          customer_id: string | null
          display_name: string | null
          email: string | null
          employee_id: string | null
          id: string
          identity_verified_at: string | null
          is_beta_tester: boolean | null
          is_employee: boolean | null
          is_traveler: boolean | null
          linked_birthday: string | null
          linked_id_number: string | null
          name: string | null
          nickname: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          display_name?: string | null
          email?: string | null
          employee_id?: string | null
          id: string
          identity_verified_at?: string | null
          is_beta_tester?: boolean | null
          is_employee?: boolean | null
          is_traveler?: boolean | null
          linked_birthday?: string | null
          linked_id_number?: string | null
          name?: string | null
          nickname?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          display_name?: string | null
          email?: string | null
          employee_id?: string | null
          id?: string
          identity_verified_at?: string | null
          is_beta_tester?: boolean | null
          is_employee?: boolean | null
          is_traveler?: boolean | null
          linked_birthday?: string | null
          linked_id_number?: string | null
          name?: string | null
          nickname?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      quote_confirmation_logs: {
        Row: {
          action: string
          confirmed_by_email: string | null
          confirmed_by_name: string | null
          confirmed_by_phone: string | null
          confirmed_by_staff_id: string | null
          confirmed_by_type: string | null
          confirmed_version: number | null
          created_at: string | null
          id: string
          ip_address: string | null
          notes: string | null
          quote_id: string
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          confirmed_by_email?: string | null
          confirmed_by_name?: string | null
          confirmed_by_phone?: string | null
          confirmed_by_staff_id?: string | null
          confirmed_by_type?: string | null
          confirmed_version?: number | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          quote_id: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          confirmed_by_email?: string | null
          confirmed_by_name?: string | null
          confirmed_by_phone?: string | null
          confirmed_by_staff_id?: string | null
          confirmed_by_type?: string | null
          confirmed_version?: number | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          quote_id?: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_confirmation_logs_confirmed_by_staff_id_fkey"
            columns: ["confirmed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_confirmation_logs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_confirmation_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accommodation_days: number | null
          adult_count: number | null
          airport_code: string | null
          balance_amount: number | null
          categories: Json | null
          child_count: number | null
          code: string | null
          confirmation_ip: string | null
          confirmation_notes: string | null
          confirmation_status: string | null
          confirmation_token: string | null
          confirmation_token_expires_at: string | null
          confirmation_user_agent: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_by_email: string | null
          confirmed_by_name: string | null
          confirmed_by_phone: string | null
          confirmed_by_staff_id: string | null
          confirmed_by_type: string | null
          confirmed_version: number | null
          contact_address: string | null
          contact_phone: string | null
          converted_to_tour: boolean | null
          cost_structure: Json | null
          country_code: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          current_version_index: number | null
          customer_confirmed_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          days: number | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          destination: string | null
          display_price: number | null
          end_date: string | null
          expense_description: string | null
          group_size: number | null
          handler_name: string | null
          id: string
          infant_count: number | null
          is_active: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          issue_date: string | null
          itinerary_id: string | null
          locked_at: string | null
          locked_by: string | null
          name: string | null
          nights: number | null
          notes: string | null
          number_of_people: number | null
          other_city_ids: string[] | null
          overall_margin_percent: number | null
          participant_counts: Json | null
          profit_margin: number | null
          quick_quote_items: Json | null
          quote_type: string | null
          received_amount: number | null
          selling_prices: Json | null
          shared_with_workspaces: string[] | null
          start_date: string | null
          status: string
          tier_pricings: Json | null
          total_amount: number | null
          total_cost: number | null
          tour_code: string | null
          tour_id: string | null
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          version: number | null
          versions: Json | null
          workspace_id: string
        }
        Insert: {
          accommodation_days?: number | null
          adult_count?: number | null
          airport_code?: string | null
          balance_amount?: number | null
          categories?: Json | null
          child_count?: number | null
          code?: string | null
          confirmation_ip?: string | null
          confirmation_notes?: string | null
          confirmation_status?: string | null
          confirmation_token?: string | null
          confirmation_token_expires_at?: string | null
          confirmation_user_agent?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_email?: string | null
          confirmed_by_name?: string | null
          confirmed_by_phone?: string | null
          confirmed_by_staff_id?: string | null
          confirmed_by_type?: string | null
          confirmed_version?: number | null
          contact_address?: string | null
          contact_phone?: string | null
          converted_to_tour?: boolean | null
          cost_structure?: Json | null
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          current_version_index?: number | null
          customer_confirmed_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          days?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          destination?: string | null
          display_price?: number | null
          end_date?: string | null
          expense_description?: string | null
          group_size?: number | null
          handler_name?: string | null
          id: string
          infant_count?: number | null
          is_active?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          issue_date?: string | null
          itinerary_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          name?: string | null
          nights?: number | null
          notes?: string | null
          number_of_people?: number | null
          other_city_ids?: string[] | null
          overall_margin_percent?: number | null
          participant_counts?: Json | null
          profit_margin?: number | null
          quick_quote_items?: Json | null
          quote_type?: string | null
          received_amount?: number | null
          selling_prices?: Json | null
          shared_with_workspaces?: string[] | null
          start_date?: string | null
          status?: string
          tier_pricings?: Json | null
          total_amount?: number | null
          total_cost?: number | null
          tour_code?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          version?: number | null
          versions?: Json | null
          workspace_id: string
        }
        Update: {
          accommodation_days?: number | null
          adult_count?: number | null
          airport_code?: string | null
          balance_amount?: number | null
          categories?: Json | null
          child_count?: number | null
          code?: string | null
          confirmation_ip?: string | null
          confirmation_notes?: string | null
          confirmation_status?: string | null
          confirmation_token?: string | null
          confirmation_token_expires_at?: string | null
          confirmation_user_agent?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_email?: string | null
          confirmed_by_name?: string | null
          confirmed_by_phone?: string | null
          confirmed_by_staff_id?: string | null
          confirmed_by_type?: string | null
          confirmed_version?: number | null
          contact_address?: string | null
          contact_phone?: string | null
          converted_to_tour?: boolean | null
          cost_structure?: Json | null
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          current_version_index?: number | null
          customer_confirmed_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          days?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          destination?: string | null
          display_price?: number | null
          end_date?: string | null
          expense_description?: string | null
          group_size?: number | null
          handler_name?: string | null
          id?: string
          infant_count?: number | null
          is_active?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          issue_date?: string | null
          itinerary_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          name?: string | null
          nights?: number | null
          notes?: string | null
          number_of_people?: number | null
          other_city_ids?: string[] | null
          overall_margin_percent?: number | null
          participant_counts?: Json | null
          profit_margin?: number | null
          quick_quote_items?: Json | null
          quote_type?: string | null
          received_amount?: number | null
          selling_prices?: Json | null
          shared_with_workspaces?: string[] | null
          start_date?: string | null
          status?: string
          tier_pricings?: Json | null
          total_amount?: number | null
          total_cost?: number | null
          tour_code?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          version?: number | null
          versions?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quotes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          accounting_subject_id: string | null
          actual_amount: number | null
          batch_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          fees: number | null
          id: string
          is_active: boolean
          notes: string | null
          order_id: string | null
          order_number: string | null
          payment_date: string
          payment_method: string
          payment_method_id: string
          receipt_account: string | null
          receipt_amount: number
          receipt_date: string | null
          receipt_number: string
          receipt_type: number
          refund_amount: number | null
          refund_notes: string | null
          refund_voucher_id: string | null
          refunded_at: string | null
          refunded_by: string | null
          rejected_reason: string | null
          status: string
          tour_id: string | null
          tour_name: string | null
          transferred_pair_id: string | null
          updated_at: string | null
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
          workspace_id: string
        }
        Insert: {
          accounting_subject_id?: string | null
          actual_amount?: number | null
          batch_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          fees?: number | null
          id?: string
          is_active?: boolean
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          payment_date: string
          payment_method: string
          payment_method_id: string
          receipt_account?: string | null
          receipt_amount: number
          receipt_date?: string | null
          receipt_number: string
          receipt_type?: number
          refund_amount?: number | null
          refund_notes?: string | null
          refund_voucher_id?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          rejected_reason?: string | null
          status?: string
          tour_id?: string | null
          tour_name?: string | null
          transferred_pair_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          workspace_id: string
        }
        Update: {
          accounting_subject_id?: string | null
          actual_amount?: number | null
          batch_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          fees?: number | null
          id?: string
          is_active?: boolean
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          payment_date?: string
          payment_method?: string
          payment_method_id?: string
          receipt_account?: string | null
          receipt_amount?: number
          receipt_date?: string | null
          receipt_number?: string
          receipt_type?: number
          refund_amount?: number | null
          refund_notes?: string | null
          refund_voucher_id?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          rejected_reason?: string | null
          status?: string
          tour_id?: string | null
          tour_name?: string | null
          transferred_pair_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_receipts_payment_method"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_accounting_subject_id_fkey"
            columns: ["accounting_subject_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_refund_voucher_id_fkey"
            columns: ["refund_voucher_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_airlines: {
        Row: {
          alliance: string | null
          country: string | null
          created_at: string | null
          iata_code: string
          icao_code: string | null
          is_active: boolean | null
          name_en: string | null
          name_zh: string | null
        }
        Insert: {
          alliance?: string | null
          country?: string | null
          created_at?: string | null
          iata_code: string
          icao_code?: string | null
          is_active?: boolean | null
          name_en?: string | null
          name_zh?: string | null
        }
        Update: {
          alliance?: string | null
          country?: string | null
          created_at?: string | null
          iata_code?: string
          icao_code?: string | null
          is_active?: boolean | null
          name_en?: string | null
          name_zh?: string | null
        }
        Relationships: []
      }
      ref_airports: {
        Row: {
          city_code: string | null
          city_name_en: string | null
          city_name_zh: string | null
          country_code: string | null
          created_at: string | null
          iata_code: string
          icao_code: string | null
          is_favorite: boolean | null
          latitude: number | null
          longitude: number | null
          name_en: string | null
          name_zh: string | null
          timezone: string | null
          usage_count: number | null
        }
        Insert: {
          city_code?: string | null
          city_name_en?: string | null
          city_name_zh?: string | null
          country_code?: string | null
          created_at?: string | null
          iata_code: string
          icao_code?: string | null
          is_favorite?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name_en?: string | null
          name_zh?: string | null
          timezone?: string | null
          usage_count?: number | null
        }
        Update: {
          city_code?: string | null
          city_name_en?: string | null
          city_name_zh?: string | null
          country_code?: string | null
          created_at?: string | null
          iata_code?: string
          icao_code?: string | null
          is_favorite?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name_en?: string | null
          name_zh?: string | null
          timezone?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      ref_booking_classes: {
        Row: {
          cabin_type: string | null
          code: string
          created_at: string | null
          description: string | null
          priority: number | null
        }
        Insert: {
          cabin_type?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          priority?: number | null
        }
        Update: {
          cabin_type?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          priority?: number | null
        }
        Relationships: []
      }
      ref_cities: {
        Row: {
          code: string
          country_code: string
          created_at: string | null
          display_order: number | null
          iata_city_code: string | null
          is_active: boolean | null
          is_major: boolean | null
          name_en: string | null
          name_zh: string
          primary_airport_iata: string | null
          unlocode: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          country_code: string
          created_at?: string | null
          display_order?: number | null
          iata_city_code?: string | null
          is_active?: boolean | null
          is_major?: boolean | null
          name_en?: string | null
          name_zh: string
          primary_airport_iata?: string | null
          unlocode?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          country_code?: string
          created_at?: string | null
          display_order?: number | null
          iata_city_code?: string | null
          is_active?: boolean | null
          is_major?: boolean | null
          name_en?: string | null
          name_zh?: string
          primary_airport_iata?: string | null
          unlocode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_cities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_countries: {
        Row: {
          code: string
          continent: string | null
          created_at: string | null
          is_active: boolean
          name_en: string
          name_zh: string
          sub_region: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          continent?: string | null
          created_at?: string | null
          is_active?: boolean
          name_en: string
          name_zh: string
          sub_region?: string | null
          workspace_id?: string
        }
        Update: {
          code?: string
          continent?: string | null
          created_at?: string | null
          is_active?: boolean
          name_en?: string
          name_zh?: string
          sub_region?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      ref_destinations: {
        Row: {
          code: string
          country_code: string
          created_at: string | null
          default_airport: string | null
          google_maps_url: string | null
          google_place_id: string | null
          latitude: number | null
          longitude: number | null
          name_en: string | null
          name_ja: string | null
          name_ko: string | null
          name_th: string | null
          name_zh: string | null
          name_zh_cn: string | null
          name_zh_tw: string | null
          parent_code: string | null
          short_alias: string | null
          type: string | null
        }
        Insert: {
          code: string
          country_code: string
          created_at?: string | null
          default_airport?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          latitude?: number | null
          longitude?: number | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_th?: string | null
          name_zh?: string | null
          name_zh_cn?: string | null
          name_zh_tw?: string | null
          parent_code?: string | null
          short_alias?: string | null
          type?: string | null
        }
        Update: {
          code?: string
          country_code?: string
          created_at?: string | null
          default_airport?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          latitude?: number | null
          longitude?: number | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_th?: string | null
          name_zh?: string | null
          name_zh_cn?: string | null
          name_zh_tw?: string | null
          parent_code?: string | null
          short_alias?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_destinations_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "ref_destinations"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_ssr_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description_en: string | null
          description_zh: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description_en?: string | null
          description_zh?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description_en?: string | null
          description_zh?: string | null
        }
        Relationships: []
      }
      ref_status_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description_en: string | null
          description_zh: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description_en?: string | null
          description_zh?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description_en?: string | null
          description_zh?: string | null
        }
        Relationships: []
      }
      regions: {
        Row: {
          country_code: string | null
          country_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          country_code?: string | null
          country_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          country_code?: string | null
          country_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          address_en: string | null
          avg_price_dinner: number | null
          avg_price_lunch: number | null
          awards: string[] | null
          best_season: string[] | null
          bib_gourmand: boolean | null
          booking_contact: string | null
          booking_email: string | null
          booking_notes: string | null
          booking_phone: string | null
          category: string | null
          chef_name: string | null
          chef_profile: string | null
          city_id: string | null
          commission_rate: number | null
          country_code: string | null
          country_id: string
          created_at: string | null
          created_by: string | null
          cuisine_type: string[] | null
          currency: string | null
          data_verified: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          description: string | null
          description_en: string | null
          dietary_options: string[] | null
          dining_restrictions: Json | null
          dining_style: string | null
          display_order: number | null
          dress_code: string | null
          english_name: string | null
          facilities: Json | null
          fax: string | null
          google_maps_url: string | null
          green_star: boolean | null
          group_friendly: boolean | null
          group_menu_available: boolean | null
          group_menu_options: Json | null
          group_menu_price: number | null
          highlights: string[] | null
          id: string
          images: string[] | null
          internal_notes: string | null
          is_active: boolean | null
          is_featured: boolean | null
          latitude: number | null
          longitude: number | null
          max_group_size: number | null
          meal_type: string[] | null
          menu_images: string[] | null
          michelin_guide_year: number | null
          michelin_plate: boolean | null
          michelin_stars: number | null
          min_group_size: number | null
          name: string
          name_local: string | null
          notes: string | null
          opening_hours: Json | null
          phone: string | null
          price_range: string | null
          private_room: boolean | null
          private_room_capacity: number | null
          rating: number | null
          ratings: Json | null
          recommended_for: string[] | null
          region_id: string | null
          reservation_required: boolean | null
          reservation_url: string | null
          review_count: number | null
          signature_dishes: string[] | null
          specialties: string[] | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          address_en?: string | null
          avg_price_dinner?: number | null
          avg_price_lunch?: number | null
          awards?: string[] | null
          best_season?: string[] | null
          bib_gourmand?: boolean | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_notes?: string | null
          booking_phone?: string | null
          category?: string | null
          chef_name?: string | null
          chef_profile?: string | null
          city_id?: string | null
          commission_rate?: number | null
          country_code?: string | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          cuisine_type?: string[] | null
          currency?: string | null
          data_verified?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          description_en?: string | null
          dietary_options?: string[] | null
          dining_restrictions?: Json | null
          dining_style?: string | null
          display_order?: number | null
          dress_code?: string | null
          english_name?: string | null
          facilities?: Json | null
          fax?: string | null
          google_maps_url?: string | null
          green_star?: boolean | null
          group_friendly?: boolean | null
          group_menu_available?: boolean | null
          group_menu_options?: Json | null
          group_menu_price?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          meal_type?: string[] | null
          menu_images?: string[] | null
          michelin_guide_year?: number | null
          michelin_plate?: boolean | null
          michelin_stars?: number | null
          min_group_size?: number | null
          name: string
          name_local?: string | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          price_range?: string | null
          private_room?: boolean | null
          private_room_capacity?: number | null
          rating?: number | null
          ratings?: Json | null
          recommended_for?: string[] | null
          region_id?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          review_count?: number | null
          signature_dishes?: string[] | null
          specialties?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
          workspace_id?: string
        }
        Update: {
          address?: string | null
          address_en?: string | null
          avg_price_dinner?: number | null
          avg_price_lunch?: number | null
          awards?: string[] | null
          best_season?: string[] | null
          bib_gourmand?: boolean | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_notes?: string | null
          booking_phone?: string | null
          category?: string | null
          chef_name?: string | null
          chef_profile?: string | null
          city_id?: string | null
          commission_rate?: number | null
          country_code?: string | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          cuisine_type?: string[] | null
          currency?: string | null
          data_verified?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          description_en?: string | null
          dietary_options?: string[] | null
          dining_restrictions?: Json | null
          dining_style?: string | null
          display_order?: number | null
          dress_code?: string | null
          english_name?: string | null
          facilities?: Json | null
          fax?: string | null
          google_maps_url?: string | null
          green_star?: boolean | null
          group_friendly?: boolean | null
          group_menu_available?: boolean | null
          group_menu_options?: Json | null
          group_menu_price?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          meal_type?: string[] | null
          menu_images?: string[] | null
          michelin_guide_year?: number | null
          michelin_plate?: boolean | null
          michelin_stars?: number | null
          min_group_size?: number | null
          name?: string
          name_local?: string | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          price_range?: string | null
          private_room?: boolean | null
          private_room_capacity?: number | null
          rating?: number | null
          ratings?: Json | null
          recommended_for?: string[] | null
          region_id?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          review_count?: number | null
          signature_dishes?: string[] | null
          specialties?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "restaurants_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      rich_documents: {
        Row: {
          canvas_id: string
          content: string
          created_at: string | null
          created_by: string | null
          format_data: Json | null
          id: string
          is_favorite: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          canvas_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          format_data?: Json | null
          id?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          canvas_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          format_data?: Json | null
          id?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rich_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rich_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rich_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_capabilities: {
        Row: {
          capability_code: string
          created_at: string
          enabled: boolean
          role_id: string
        }
        Insert: {
          capability_code: string
          created_at?: string
          enabled?: boolean
          role_id: string
        }
        Update: {
          capability_code?: string
          created_at?: string
          enabled?: boolean
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_capabilities_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      selector_field_roles: {
        Row: {
          field_id: string
          role_id: string
        }
        Insert: {
          field_id: string
          role_id: string
        }
        Update: {
          field_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selector_field_roles_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "workspace_selector_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selector_field_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_categories: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_branch: string | null
          bank_code_legacy: string | null
          bank_name: string | null
          category_id: string | null
          code: string
          contact: Json | null
          contact_person: string | null
          country: string | null
          country_code: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          display_order: number | null
          email: string | null
          english_name: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          region: string | null
          status: string
          tax_id: string | null
          total_orders: number | null
          total_spent: number | null
          type: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code_legacy?: string | null
          bank_name?: string | null
          category_id?: string | null
          code: string
          contact?: Json | null
          contact_person?: string | null
          country?: string | null
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          display_order?: number | null
          email?: string | null
          english_name?: string | null
          fax?: string | null
          id: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          region?: string | null
          status?: string
          tax_id?: string | null
          total_orders?: number | null
          total_spent?: number | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code_legacy?: string | null
          bank_name?: string | null
          category_id?: string | null
          code?: string
          contact?: Json | null
          contact_person?: string | null
          country?: string | null
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          display_order?: number | null
          email?: string | null
          english_name?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          region?: string | null
          status?: string
          tax_id?: string | null
          total_orders?: number | null
          total_spent?: number | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "suppliers_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          created_at: string | null
          due_date: string | null
          id: number
          name: string
          notes: string | null
          progress: number | null
          status: string | null
          task_type: string
          updated_at: string | null
          workflow_template: string | null
          workspace_id: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: number
          name: string
          notes?: string | null
          progress?: number | null
          status?: string | null
          task_type?: string
          updated_at?: string | null
          workflow_template?: string | null
          workspace_id?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: number
          name?: string
          notes?: string | null
          progress?: number | null
          status?: string | null
          task_type?: string
          updated_at?: string | null
          workflow_template?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      todo_columns: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_system: boolean | null
          mapped_status: string | null
          name: string
          sort_order: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          mapped_status?: string | null
          name: string
          sort_order?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          mapped_status?: string | null
          name?: string
          sort_order?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          assignee: string | null
          column_id: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          enabled_quick_actions: string[] | null
          id: string
          is_public: boolean | null
          needs_creator_notification: boolean | null
          notes: Json | null
          priority: number
          related_items: Json | null
          status: string
          sub_tasks: Json | null
          task_type: string | null
          title: string
          tour_id: string | null
          updated_at: string | null
          updated_by: string | null
          visibility: string[] | null
          workspace_id: string
        }
        Insert: {
          assignee?: string | null
          column_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          enabled_quick_actions?: string[] | null
          id?: string
          is_public?: boolean | null
          needs_creator_notification?: boolean | null
          notes?: Json | null
          priority?: number
          related_items?: Json | null
          status?: string
          sub_tasks?: Json | null
          task_type?: string | null
          title: string
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string[] | null
          workspace_id: string
        }
        Update: {
          assignee?: string | null
          column_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          enabled_quick_actions?: string[] | null
          id?: string
          is_public?: boolean | null
          needs_creator_notification?: boolean | null
          notes?: Json | null
          priority?: number
          related_items?: Json | null
          status?: string
          sub_tasks?: Json | null
          task_type?: string | null
          title?: string
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "todo_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_bonus_settings: {
        Row: {
          bonus: number
          bonus_type: number
          created_at: string
          created_by: string | null
          description: string | null
          disbursement_date: string | null
          employee_id: string | null
          id: string
          payment_request_id: string | null
          tour_id: string
          type: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          bonus?: number
          bonus_type: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          disbursement_date?: string | null
          employee_id?: string | null
          id?: string
          payment_request_id?: string | null
          tour_id: string
          type: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          bonus?: number
          bonus_type?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          disbursement_date?: string | null
          employee_id?: string | null
          id?: string
          payment_request_id?: string | null
          tour_id?: string
          type?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_bonus_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_bonus_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_bonus_settings_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_bonus_settings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_bonus_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_bonus_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_custom_cost_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_name: string
          id: string
          tour_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_name: string
          id?: string
          tour_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_name?: string
          id?: string
          tour_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_custom_cost_fields_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_departure_data: {
        Row: {
          bus_info: Json | null
          created_at: string | null
          created_by: string | null
          emergency_contact: Json | null
          flight_info: Json | null
          guide_info: Json | null
          hotel_info: Json | null
          id: string
          notes: string | null
          tour_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bus_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          emergency_contact?: Json | null
          flight_info?: Json | null
          guide_info?: Json | null
          hotel_info?: Json | null
          id?: string
          notes?: string | null
          tour_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bus_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          emergency_contact?: Json | null
          flight_info?: Json | null
          guide_info?: Json | null
          hotel_info?: Json | null
          id?: string
          notes?: string | null
          tour_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_departure_data_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: true
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_destinations: {
        Row: {
          airport_code: string
          city: string
          country: string
          created_at: string | null
          id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          airport_code: string
          city: string
          country: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          airport_code?: string
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      tour_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          public_url: string
          tour_id: string
          updated_at: string | null
          updated_by: string | null
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          public_url: string
          tour_id: string
          updated_at?: string | null
          updated_by?: string | null
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          public_url?: string
          tour_id?: string
          updated_at?: string | null
          updated_by?: string | null
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_itinerary_items: {
        Row: {
          actual_expense: number | null
          adult_price: number | null
          adult_price_formula: string | null
          assigned_at: string | null
          assigned_by: string | null
          assignee_id: string | null
          booking_confirmed_at: string | null
          booking_reference: string | null
          booking_status: string | null
          breakfast_preset: string | null
          category: string | null
          child_price: number | null
          child_price_formula: string | null
          confirmation_date: string | null
          confirmation_item_id: string | null
          confirmation_note: string | null
          confirmation_status: string | null
          confirmed_cost: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          day_blocks: Json | null
          day_note: string | null
          day_number: number | null
          day_route: string | null
          day_title: string | null
          description: string | null
          dinner_preset: string | null
          driver_name: string | null
          driver_phone: string | null
          estimated_cost: number | null
          expense_at: string | null
          expense_note: string | null
          google_maps_url: string | null
          handled_by: string | null
          id: string
          infant_price: number | null
          infant_price_formula: string | null
          is_reserved: boolean | null
          is_same_accommodation: boolean
          itinerary_id: string | null
          latitude: number | null
          leader_status: string | null
          longitude: number | null
          lunch_preset: string | null
          override_at: string | null
          override_by: string | null
          override_description: string | null
          override_title: string | null
          pricing_type: string | null
          quantity: number | null
          quantity_formula: string | null
          quote_item_id: string | null
          quote_note: string | null
          quote_status: string | null
          quoted_cost: number | null
          receipt_images: string[] | null
          reply_content: Json | null
          reply_cost: number | null
          request_id: string | null
          request_reply_at: string | null
          request_sent_at: string | null
          request_status: string | null
          reserved_at: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          room_details: Json | null
          service_date: string | null
          service_date_end: string | null
          show_on_brochure: boolean
          show_on_quote: boolean | null
          show_on_web: boolean
          sort_order: number | null
          sub_category: string | null
          supplier_id: string | null
          supplier_name: string | null
          title: string | null
          total_cost: number | null
          tour_id: string | null
          unit_price: number | null
          unit_price_formula: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
          workspace_id: string
        }
        Insert: {
          actual_expense?: number | null
          adult_price?: number | null
          adult_price_formula?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignee_id?: string | null
          booking_confirmed_at?: string | null
          booking_reference?: string | null
          booking_status?: string | null
          breakfast_preset?: string | null
          category?: string | null
          child_price?: number | null
          child_price_formula?: string | null
          confirmation_date?: string | null
          confirmation_item_id?: string | null
          confirmation_note?: string | null
          confirmation_status?: string | null
          confirmed_cost?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          day_blocks?: Json | null
          day_note?: string | null
          day_number?: number | null
          day_route?: string | null
          day_title?: string | null
          description?: string | null
          dinner_preset?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_cost?: number | null
          expense_at?: string | null
          expense_note?: string | null
          google_maps_url?: string | null
          handled_by?: string | null
          id?: string
          infant_price?: number | null
          infant_price_formula?: string | null
          is_reserved?: boolean | null
          is_same_accommodation?: boolean
          itinerary_id?: string | null
          latitude?: number | null
          leader_status?: string | null
          longitude?: number | null
          lunch_preset?: string | null
          override_at?: string | null
          override_by?: string | null
          override_description?: string | null
          override_title?: string | null
          pricing_type?: string | null
          quantity?: number | null
          quantity_formula?: string | null
          quote_item_id?: string | null
          quote_note?: string | null
          quote_status?: string | null
          quoted_cost?: number | null
          receipt_images?: string[] | null
          reply_content?: Json | null
          reply_cost?: number | null
          request_id?: string | null
          request_reply_at?: string | null
          request_sent_at?: string | null
          request_status?: string | null
          reserved_at?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          room_details?: Json | null
          service_date?: string | null
          service_date_end?: string | null
          show_on_brochure?: boolean
          show_on_quote?: boolean | null
          show_on_web?: boolean
          sort_order?: number | null
          sub_category?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          title?: string | null
          total_cost?: number | null
          tour_id?: string | null
          unit_price?: number | null
          unit_price_formula?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          workspace_id: string
        }
        Update: {
          actual_expense?: number | null
          adult_price?: number | null
          adult_price_formula?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignee_id?: string | null
          booking_confirmed_at?: string | null
          booking_reference?: string | null
          booking_status?: string | null
          breakfast_preset?: string | null
          category?: string | null
          child_price?: number | null
          child_price_formula?: string | null
          confirmation_date?: string | null
          confirmation_item_id?: string | null
          confirmation_note?: string | null
          confirmation_status?: string | null
          confirmed_cost?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          day_blocks?: Json | null
          day_note?: string | null
          day_number?: number | null
          day_route?: string | null
          day_title?: string | null
          description?: string | null
          dinner_preset?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_cost?: number | null
          expense_at?: string | null
          expense_note?: string | null
          google_maps_url?: string | null
          handled_by?: string | null
          id?: string
          infant_price?: number | null
          infant_price_formula?: string | null
          is_reserved?: boolean | null
          is_same_accommodation?: boolean
          itinerary_id?: string | null
          latitude?: number | null
          leader_status?: string | null
          longitude?: number | null
          lunch_preset?: string | null
          override_at?: string | null
          override_by?: string | null
          override_description?: string | null
          override_title?: string | null
          pricing_type?: string | null
          quantity?: number | null
          quantity_formula?: string | null
          quote_item_id?: string | null
          quote_note?: string | null
          quote_status?: string | null
          quoted_cost?: number | null
          receipt_images?: string[] | null
          reply_content?: Json | null
          reply_cost?: number | null
          request_id?: string | null
          request_reply_at?: string | null
          request_sent_at?: string | null
          request_status?: string | null
          reserved_at?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          room_details?: Json | null
          service_date?: string | null
          service_date_end?: string | null
          show_on_brochure?: boolean
          show_on_quote?: boolean | null
          show_on_web?: boolean
          sort_order?: number | null
          sub_category?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          title?: string | null
          total_cost?: number | null
          tour_id?: string | null
          unit_price?: number | null
          unit_price_formula?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_itinerary_items_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_itinerary_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_itinerary_items_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_itinerary_items_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_itinerary_items_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_itinerary_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_meal_settings: {
        Row: {
          created_at: string | null
          day_number: number
          display_order: number | null
          enabled: boolean | null
          id: string
          meal_type: string
          restaurant_name: string | null
          tour_id: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_number: number
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          meal_type: string
          restaurant_name?: string | null
          tour_id: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          meal_type?: string
          restaurant_name?: string | null
          tour_id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_meal_settings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_meal_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_member_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_name: string
          field_value: string | null
          id: string
          order_member_id: string
          tour_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_name: string
          field_value?: string | null
          id?: string
          order_member_id: string
          tour_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_name?: string
          field_value?: string | null
          id?: string
          order_member_id?: string
          tour_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_member_fields_order_member_id_fkey"
            columns: ["order_member_id"]
            isOneToOne: false
            referencedRelation: "order_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_member_fields_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_role_assignments: {
        Row: {
          created_at: string
          employee_id: string
          field_id: string | null
          id: string
          order_id: string | null
          role_id: string | null
          tour_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          field_id?: string | null
          id?: string
          order_id?: string | null
          role_id?: string | null
          tour_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          field_id?: string | null
          id?: string
          order_id?: string | null
          role_id?: string | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_role_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_role_assignments_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "workspace_selector_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_role_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_role_assignments_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          airport_code: string | null
          archive_reason: string | null
          archived: boolean | null
          checkin_qrcode: string | null
          closed_by: string | null
          closing_date: string | null
          code: string
          confirmed_requirements: Json | null
          contract_archived_date: string | null
          contract_completed: boolean | null
          contract_content: string | null
          contract_created_at: string | null
          contract_notes: string | null
          contract_status: string
          contract_template: string | null
          country_code: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          current_participants: number | null
          custom_cost_fields: Json | null
          days_count: number | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          departure_date: string | null
          description: string | null
          enable_checkin: boolean | null
          envelope_records: string | null
          features: Json | null
          id: string
          is_active: boolean
          itinerary_id: string | null
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          liability_insurance_coverage: number | null
          location: string | null
          locked_at: string | null
          locked_by: string | null
          locked_itinerary_id: string | null
          locked_itinerary_version: number | null
          locked_quote_id: string | null
          locked_quote_version: number | null
          max_participants: number | null
          medical_insurance_coverage: number | null
          modification_reason: string | null
          name: string
          outbound_flight: Json | null
          price: number | null
          profit: number
          quote_cost_structure: Json | null
          return_date: string | null
          return_flight: Json | null
          selling_price_per_person: number | null
          status: string
          total_cost: number
          total_revenue: number
          tour_service_type: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          airport_code?: string | null
          archive_reason?: string | null
          archived?: boolean | null
          checkin_qrcode?: string | null
          closed_by?: string | null
          closing_date?: string | null
          code: string
          confirmed_requirements?: Json | null
          contract_archived_date?: string | null
          contract_completed?: boolean | null
          contract_content?: string | null
          contract_created_at?: string | null
          contract_notes?: string | null
          contract_status?: string
          contract_template?: string | null
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          custom_cost_fields?: Json | null
          days_count?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          departure_date?: string | null
          description?: string | null
          enable_checkin?: boolean | null
          envelope_records?: string | null
          features?: Json | null
          id: string
          is_active?: boolean
          itinerary_id?: string | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          liability_insurance_coverage?: number | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_itinerary_id?: string | null
          locked_itinerary_version?: number | null
          locked_quote_id?: string | null
          locked_quote_version?: number | null
          max_participants?: number | null
          medical_insurance_coverage?: number | null
          modification_reason?: string | null
          name: string
          outbound_flight?: Json | null
          price?: number | null
          profit?: number
          quote_cost_structure?: Json | null
          return_date?: string | null
          return_flight?: Json | null
          selling_price_per_person?: number | null
          status?: string
          total_cost?: number
          total_revenue?: number
          tour_service_type?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          airport_code?: string | null
          archive_reason?: string | null
          archived?: boolean | null
          checkin_qrcode?: string | null
          closed_by?: string | null
          closing_date?: string | null
          code?: string
          confirmed_requirements?: Json | null
          contract_archived_date?: string | null
          contract_completed?: boolean | null
          contract_content?: string | null
          contract_created_at?: string | null
          contract_notes?: string | null
          contract_status?: string
          contract_template?: string | null
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          custom_cost_fields?: Json | null
          days_count?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          departure_date?: string | null
          description?: string | null
          enable_checkin?: boolean | null
          envelope_records?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          itinerary_id?: string | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          liability_insurance_coverage?: number | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_itinerary_id?: string | null
          locked_itinerary_version?: number | null
          locked_quote_id?: string | null
          locked_quote_version?: number | null
          max_participants?: number | null
          medical_insurance_coverage?: number | null
          modification_reason?: string | null
          name?: string
          outbound_flight?: Json | null
          price?: number | null
          profit?: number
          quote_cost_structure?: Json | null
          return_date?: string | null
          return_flight?: Json | null
          selling_price_per_person?: number | null
          status?: string
          total_cost?: number
          total_revenue?: number
          tour_service_type?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tours_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tours_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_last_unlocked_by_fkey"
            columns: ["last_unlocked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preference_key: string
          preference_value: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preference_key: string
          preference_value: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preference_key?: string
          preference_value?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_costs: {
        Row: {
          cost: number
          created_at: string | null
          id: string
          updated_at: string | null
          vendor_name: string
          visa_type: string
          workspace_id: string
        }
        Insert: {
          cost?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          vendor_name: string
          visa_type: string
          workspace_id?: string
        }
        Update: {
          cost?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          vendor_name?: string
          visa_type?: string
          workspace_id?: string
        }
        Relationships: []
      }
      webhook_idempotency_keys: {
        Row: {
          idempotency_key: string
          processed_at: string
          source: string
        }
        Insert: {
          idempotency_key: string
          processed_at?: string
          source: string
        }
        Update: {
          idempotency_key?: string
          processed_at?: string
          source?: string
        }
        Relationships: []
      }
      workspace_attendance_settings: {
        Row: {
          allow_missed_clock_request: boolean
          created_at: string
          early_leave_threshold_minutes: number
          enable_web_clock: boolean
          gps_latitude: number | null
          gps_longitude: number | null
          gps_radius_meters: number | null
          late_threshold_minutes: number
          require_gps: boolean
          standard_work_hours: number
          updated_at: string
          work_end_time: string
          work_start_time: string
          workspace_id: string
        }
        Insert: {
          allow_missed_clock_request?: boolean
          created_at?: string
          early_leave_threshold_minutes?: number
          enable_web_clock?: boolean
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_radius_meters?: number | null
          late_threshold_minutes?: number
          require_gps?: boolean
          standard_work_hours?: number
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
          workspace_id: string
        }
        Update: {
          allow_missed_clock_request?: boolean
          created_at?: string
          early_leave_threshold_minutes?: number
          enable_web_clock?: boolean
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_radius_meters?: number | null
          late_threshold_minutes?: number
          require_gps?: boolean
          standard_work_hours?: number
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_attendance_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_bonus_defaults: {
        Row: {
          bonus: number
          bonus_type: number
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string | null
          id: string
          type: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          bonus?: number
          bonus_type: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          type: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          bonus?: number
          bonus_type?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          type?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_bonus_defaults_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_bonus_defaults_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_bonus_defaults_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_bonus_defaults_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_countries: {
        Row: {
          country_code: string
          created_at: string | null
          is_enabled: boolean
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          country_code: string
          created_at?: string | null
          is_enabled?: boolean
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          country_code?: string
          created_at?: string | null
          is_enabled?: boolean
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_countries_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "workspace_countries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_settings: {
        Row: {
          created_at: string
          data_sources: string[]
          prompt_template: string | null
          response_mode: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data_sources?: string[]
          prompt_template?: string | null
          response_mode?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data_sources?: string[]
          prompt_template?: string | null
          response_mode?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_billing_records: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_billing_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_features: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          enabled_at: string | null
          enabled_by: string | null
          feature_code: string
          id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          enabled_at?: string | null
          enabled_by?: string | null
          feature_code: string
          id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          enabled_at?: string | null
          enabled_by?: string | null
          feature_code?: string
          id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_features_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_facebook_settings: {
        Row: {
          id: string
          workspace_id: string
          page_id: string
          page_name: string | null
          page_access_token_encrypted: string
          app_secret_encrypted: string | null
          webhook_verify_token: string | null
          bot_greeting: string | null
          handoff_enabled: boolean
          handoff_target: string | null
          effective_from: string
          effective_to: string | null
          bot_employee_id: string | null
          is_active: boolean
          webhook_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          page_id: string
          page_name?: string | null
          page_access_token_encrypted: string
          app_secret_encrypted?: string | null
          webhook_verify_token?: string | null
          bot_greeting?: string | null
          handoff_enabled?: boolean
          handoff_target?: string | null
          effective_from?: string
          effective_to?: string | null
          bot_employee_id?: string | null
          is_active?: boolean
          webhook_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          page_id?: string
          page_name?: string | null
          page_access_token_encrypted?: string
          app_secret_encrypted?: string | null
          webhook_verify_token?: string | null
          bot_greeting?: string | null
          handoff_enabled?: boolean
          handoff_target?: string | null
          effective_from?: string
          effective_to?: string | null
          bot_employee_id?: string | null
          is_active?: boolean
          webhook_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_line_settings: {
        Row: {
          bot_employee_id: string | null
          bot_greeting: string | null
          channel_access_token: string
          channel_id: string
          channel_secret: string
          created_at: string
          daily_order_limit: number | null
          effective_from: string
          effective_to: string | null
          handoff_enabled: boolean
          handoff_target: string | null
          id: string
          is_active: boolean
          updated_at: string
          webhook_verified_at: string | null
          workspace_id: string
        }
        Insert: {
          bot_employee_id?: string | null
          bot_greeting?: string | null
          channel_access_token: string
          channel_id: string
          channel_secret: string
          created_at?: string
          daily_order_limit?: number | null
          effective_from?: string
          effective_to?: string | null
          handoff_enabled?: boolean
          handoff_target?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_verified_at?: string | null
          workspace_id: string
        }
        Update: {
          bot_employee_id?: string | null
          bot_greeting?: string | null
          channel_access_token?: string
          channel_id?: string
          channel_secret?: string
          created_at?: string
          daily_order_limit?: number | null
          effective_from?: string
          effective_to?: string | null
          handoff_enabled?: boolean
          handoff_target?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_line_settings_bot_employee_id_fkey"
            columns: ["bot_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_line_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_admin: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_admin?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_admin?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_selector_fields: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          level: string
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          level: string
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          level?: string
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_selector_fields_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_branch: string | null
          bank_name: string | null
          brand_primary_hex: string | null
          code: string
          company_seal_url: string | null
          contract_seal_image_url: string | null
          created_at: string | null
          created_by: string | null
          custom_domain: string | null
          default_billing_day_of_week: number | null
          default_password: string | null
          description: string | null
          email: string | null
          employee_number_prefix: string | null
          enabled_tour_categories: string[] | null
          fax: string | null
          home_country_code: string | null
          icon: string | null
          id: string
          invoice_seal_image_url: string | null
          is_active: boolean | null
          legal_name: string | null
          logo_url: string | null
          max_employees: number | null
          name: string
          payment_config: Json | null
          personal_seal_url: string | null
          phone: string | null
          premium_enabled: boolean | null
          print_accent_hex: string | null
          setup_state: Json | null
          subscription_period_end: string | null
          subscription_plan: string | null
          subtitle: string | null
          tax_id: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          brand_primary_hex?: string | null
          code?: string
          company_seal_url?: string | null
          contract_seal_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_domain?: string | null
          default_billing_day_of_week?: number | null
          default_password?: string | null
          description?: string | null
          email?: string | null
          employee_number_prefix?: string | null
          enabled_tour_categories?: string[] | null
          fax?: string | null
          home_country_code?: string | null
          icon?: string | null
          id?: string
          invoice_seal_image_url?: string | null
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          max_employees?: number | null
          name: string
          payment_config?: Json | null
          personal_seal_url?: string | null
          phone?: string | null
          premium_enabled?: boolean | null
          print_accent_hex?: string | null
          setup_state?: Json | null
          subscription_period_end?: string | null
          subscription_plan?: string | null
          subtitle?: string | null
          tax_id?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          brand_primary_hex?: string | null
          code?: string
          company_seal_url?: string | null
          contract_seal_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_domain?: string | null
          default_billing_day_of_week?: number | null
          default_password?: string | null
          description?: string | null
          email?: string | null
          employee_number_prefix?: string | null
          enabled_tour_categories?: string[] | null
          fax?: string | null
          home_country_code?: string | null
          icon?: string | null
          id?: string
          invoice_seal_image_url?: string | null
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          max_employees?: number | null
          name?: string
          payment_config?: Json | null
          personal_seal_url?: string | null
          phone?: string | null
          premium_enabled?: boolean | null
          print_accent_hex?: string | null
          setup_state?: Json | null
          subscription_period_end?: string | null
          subscription_plan?: string | null
          subtitle?: string | null
          tax_id?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_home_country_code_fkey"
            columns: ["home_country_code"]
            isOneToOne: false
            referencedRelation: "ref_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "workspaces_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_attendance_daily: {
        Row: {
          abnormal_count: number | null
          clock_date: string | null
          employee_id: string | null
          first_clock_in: string | null
          has_remote_clock: boolean | null
          last_clock_out: string | null
          late_minutes: number | null
          work_hours: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clock_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_employee_to_tour_conversation: {
        Args: { p_employee_id: string; p_role?: string; p_tour_id: string }
        Returns: undefined
      }
      auto_open_tour_conversations: { Args: never; Returns: number }
      auto_open_tour_conversations_with_logging: {
        Args: never
        Returns: undefined
      }
      can_manage_workspace: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      check_leader_schedule_conflict: {
        Args: {
          p_end_date: string
          p_exclude_id?: string
          p_leader_id: string
          p_start_date: string
        }
        Returns: boolean
      }
      check_my_tours_updates: {
        Args: { p_last_synced_at?: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      check_vehicle_schedule_conflict: {
        Args: {
          p_end_date: string
          p_exclude_id?: string
          p_start_date: string
          p_vehicle_id: string
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      compute_period_balances: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_workspace_id: string
        }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          account_type: string
          balance: number
          total_credit: number
          total_debit: number
        }[]
      }
      compute_tour_pl: {
        Args: { p_tour_id: string }
        Returns: {
          confirmed_revenue: number
          cost: number
          estimated_profit: number
          estimated_revenue: number
          gross_profit: number
          margin: number
          order_count: number
        }[]
      }
      compute_treasury_summary: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_workspace_id: string
        }
        Returns: {
          balance: number
          pending_disbursements: number
          pending_payments: number
          pending_receipts: number
          total_payments: number
          total_receipts: number
        }[]
      }
      confirm_quote_by_customer: {
        Args: {
          p_email?: string
          p_ip_address?: string
          p_name: string
          p_notes?: string
          p_phone?: string
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      confirm_quote_by_staff: {
        Args: {
          p_notes?: string
          p_quote_id: string
          p_staff_id: string
          p_staff_name: string
        }
        Returns: Json
      }
      create_atomic_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_description: string
          p_transaction_date: string
          p_transaction_type: string
        }
        Returns: undefined
      }
      create_default_leave_types: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      ensure_conversation_exists: {
        Args: {
          p_conversation_type: string
          p_target_id: string
          p_target_name?: string
          p_workspace_id: string
        }
        Returns: string
      }
      generate_confirmation_token: { Args: never; Returns: string }
      generate_disbursement_no: {
        Args: { p_disbursement_date?: string; p_workspace_id: string }
        Returns: string
      }
      generate_account_child_code: {
        Args: { p_workspace_id: string; p_parent_code: string }
        Returns: string
      }
      generate_employee_number: { Args: { p_workspace_id: string }; Returns: string }
      generate_order_number: { Args: { p_tour_id: string }; Returns: string }
      generate_receipt_no: { Args: { p_tour_id: string }; Returns: string }
      generate_request_no: { Args: { p_tour_code: string }; Returns: string }
      next_payment_request_item_number: { Args: { p_request_id: string }; Returns: string }
      generate_supplier_code: { Args: { p_workspace_id: string }; Returns: string }
      generate_tour_code: {
        Args: {
          p_city_code: string
          p_departure_date: string
          p_workspace_id: string
        }
        Returns: string
      }
      generate_voucher_no: {
        Args: { p_voucher_date?: string; p_workspace_id: string }
        Returns: string
      }
      generate_quote_code: {
        Args: { p_tour_id: string; p_quote_type?: string }
        Returns: string
      }
      generate_company_payment_request_code: {
        Args: {
          p_workspace_id: string
          p_expense_type: string
          p_request_date?: string
        }
        Returns: string
      }
      get_account_id_by_code: {
        Args: { p_code: string; p_workspace_id: string }
        Returns: string
      }
      get_cron_job_status: {
        Args: never
        Returns: {
          job_name: string
          last_run: string
          next_run: string
          schedule: string
          status: string
        }[]
      }
      get_current_employee_id: { Args: never; Returns: string }
      get_current_user_workspace: { Args: never; Returns: string }
      get_my_tour_details: { Args: { p_tour_code: string }; Returns: Json }
      get_or_create_direct_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_person_workload: {
        Args: { person_name: string }
        Returns: {
          in_progress_tasks: number
          total_projects: number
          total_tasks: number
          urgent_tasks: number
        }[]
      }
      get_projects_overview: {
        Args: never
        Returns: {
          completed_projects: number
          in_progress_projects: number
          pending_projects: number
          total_projects: number
          urgent_projects: number
        }[]
      }
      get_tour_conversations: {
        Args: { p_workspace_id: string }
        Returns: {
          conversation_id: string
          conversation_type: string
          departure_date: string
          is_open: boolean
          last_message_at: string
          last_message_preview: string
          member_count: number
          open_at: string
          tour_code: string
          tour_id: string
          tour_name: string
          traveler_count: number
          unread_count: number
        }[]
      }
      get_tour_pnl: {
        Args: {
          p_workspace_id: string
          p_year_end: string
          p_year_start: string
        }
        Returns: {
          actual_cost: number
          actual_profit: number
          actual_revenue: number
          closing_date: string
          code: string
          cost_diff: number
          departure_date: string
          estimated_cost: number
          estimated_profit: number
          estimated_revenue: number
          id: string
          max_participants: number
          name: string
          return_date: string
          revenue_diff: number
          status: string
        }[]
      }
      get_unread_count: { Args: { p_conversation_id: string }; Returns: number }
      get_unread_counts_batch: {
        Args: { p_conversation_ids: string[] }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      get_user_permission: {
        Args: { p_itinerary_id: string; p_user_id: string }
        Returns: string
      }
      get_user_project_ids: { Args: { uid: string }; Returns: string[] }
      get_user_workspace_id: { Args: never; Returns: string }
      has_attraction_license: {
        Args: { p_kind?: string; p_source_workspace: string }
        Returns: boolean
      }
      has_capability: { Args: { _code: string }; Returns: boolean }
      has_capability_for_workspace: {
        Args: { _code: string; _workspace_id: string }
        Returns: boolean
      }
      has_permission: { Args: { permission_name: string }; Returns: boolean }
      increment_points: {
        Args: { customer_id_param: string; points_param: number }
        Returns: undefined
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean }
      is_country_enabled: {
        Args: { p_code: string; p_workspace: string }
        Returns: boolean
      }
      is_employee: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_file_download: { Args: { p_file_id: string }; Returns: undefined }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      recalculate_order_totals: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      refresh_all_region_stats: { Args: never; Returns: undefined }
      revoke_quote_confirmation: {
        Args: {
          p_quote_id: string
          p_reason: string
          p_staff_id: string
          p_staff_name: string
        }
        Returns: Json
      }
      run_auto_open_now: {
        Args: never
        Returns: {
          executed_at: string
          opened_count: number
        }[]
      }
      seed_default_roles_for_workspace: {
        Args: { p_workspace_id: string }
        Returns: {
          action: string
          role_id: string
          role_name: string
        }[]
      }
      seed_tenant_base_data: {
        Args: { source_workspace_id: string; target_workspace_id: string }
        Returns: undefined
      }
      send_quote_confirmation: {
        Args: {
          p_expires_in_days?: number
          p_quote_id: string
          p_staff_id?: string
        }
        Returns: Json
      }
      send_tour_message: {
        Args: {
          p_attachments?: Json
          p_content: string
          p_conversation_id: string
          p_type?: string
        }
        Returns: string
      }
      set_audit_context: {
        Args: { p_actor_id: string; p_reason?: string; p_request_id?: string }
        Returns: undefined
      }
      set_current_workspace: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      sync_my_tours: { Args: never; Returns: Json }
      sync_passport_to_order_members: {
        Args: {
          p_birth_date?: string
          p_customer_id: string
          p_gender?: string
          p_id_number?: string
          p_passport_expiry?: string
          p_passport_image_url?: string
          p_passport_name?: string
          p_passport_number?: string
        }
        Returns: number
      }
      toggle_tour_conversation: {
        Args: {
          p_is_open: boolean
          p_send_welcome?: boolean
          p_tour_id: string
        }
        Returns: undefined
      }
      update_city_stats: { Args: { p_city_id: string }; Returns: undefined }
      verify_auth_password: {
        Args: { p_password: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      accounting_event_status: "posted" | "reversed"
      accounting_event_type:
        | "customer_receipt_posted"
        | "supplier_payment_posted"
        | "group_settlement_posted"
        | "bonus_paid"
        | "tax_paid"
        | "manual_voucher"
      calendar_visibility: "private" | "workspace" | "company_wide"
      channel_visibility: "private" | "public"
      confirmation_type: "accommodation" | "flight"
      file_action:
        | "create"
        | "update"
        | "rename"
        | "move"
        | "star"
        | "archive"
        | "delete"
        | "restore"
        | "download"
        | "version"
      file_category:
        | "contract"
        | "quote"
        | "itinerary"
        | "passport"
        | "visa"
        | "ticket"
        | "voucher"
        | "invoice"
        | "insurance"
        | "photo"
        | "email_attachment"
        | "other"
        | "request"
        | "cancellation"
        | "confirmation"
      folder_type:
        | "root"
        | "tour"
        | "customer"
        | "supplier"
        | "template"
        | "custom"
      subledger_type: "customer" | "supplier" | "bank" | "group" | "employee"
      task_priority: "low" | "normal" | "high" | "critical"
      task_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      verification_status: "verified" | "unverified" | "rejected"
      voucher_status: "draft" | "posted" | "reversed" | "locked"
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
      accounting_event_status: ["posted", "reversed"],
      accounting_event_type: [
        "customer_receipt_posted",
        "supplier_payment_posted",
        "group_settlement_posted",
        "bonus_paid",
        "tax_paid",
        "manual_voucher",
      ],
      calendar_visibility: ["private", "workspace", "company_wide"],
      channel_visibility: ["private", "public"],
      confirmation_type: ["accommodation", "flight"],
      file_action: [
        "create",
        "update",
        "rename",
        "move",
        "star",
        "archive",
        "delete",
        "restore",
        "download",
        "version",
      ],
      file_category: [
        "contract",
        "quote",
        "itinerary",
        "passport",
        "visa",
        "ticket",
        "voucher",
        "invoice",
        "insurance",
        "photo",
        "email_attachment",
        "other",
        "request",
        "cancellation",
        "confirmation",
      ],
      folder_type: [
        "root",
        "tour",
        "customer",
        "supplier",
        "template",
        "custom",
      ],
      subledger_type: ["customer", "supplier", "bank", "group", "employee"],
      task_priority: ["low", "normal", "high", "critical"],
      task_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      verification_status: ["verified", "unverified", "rejected"],
      voucher_status: ["draft", "posted", "reversed", "locked"],
    },
  },
} as const

