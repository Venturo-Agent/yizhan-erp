export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
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
        Relationships: []
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
            foreignKeyName: 'ai_agents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
        Relationships: []
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
      ai_products: {
        Row: {
          contents: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean
          is_published: boolean
          knowledge_chunk_id: string | null
          name: string
          price: number | null
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
          validity_note: string | null
          workspace_id: string
        }
        Insert: {
          contents?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          knowledge_chunk_id?: string | null
          name: string
          price?: number | null
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
          validity_note?: string | null
          workspace_id: string
        }
        Update: {
          contents?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          knowledge_chunk_id?: string | null
          name?: string
          price?: number | null
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
          validity_note?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_products_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_products_knowledge_chunk_id_fkey'
            columns: ['knowledge_chunk_id']
            isOneToOne: false
            referencedRelation: 'knowledge_chunks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_products_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_products_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      application_service_types: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type_id: string
          estimated_business_days: number | null
          id: string
          is_active: boolean
          is_urgent: boolean
          label: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type_id: string
          estimated_business_days?: number | null
          id?: string
          is_active?: boolean
          is_urgent?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type_id?: string
          estimated_business_days?: number | null
          id?: string
          is_active?: boolean
          is_urgent?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'application_service_types_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'application_service_types_document_type_id_fkey'
            columns: ['document_type_id']
            isOneToOne: false
            referencedRelation: 'document_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'application_service_types_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'application_service_types_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          payload: Json
          request_reason: string | null
          request_type: string
          requester_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          target_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          payload?: Json
          request_reason?: string | null
          request_type: string
          requester_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          target_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          payload?: Json
          request_reason?: string | null
          request_type?: string
          requester_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          target_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'approval_requests_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'approval_requests_reviewer_id_fkey'
            columns: ['reviewer_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'approval_requests_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
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
          created_by_user_id: string | null
          created_by_workspace_id: string | null
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
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
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
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: 'attractions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
            foreignKeyName: 'audit_logs_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
          priority: Database['public']['Enums']['task_priority']
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database['public']['Enums']['task_status']
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
          priority?: Database['public']['Enums']['task_priority']
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database['public']['Enums']['task_status']
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
          priority?: Database['public']['Enums']['task_priority']
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database['public']['Enums']['task_status']
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'background_tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
          cross_bank_fee: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_disbursement_eligible: boolean
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
          cross_bank_fee?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_disbursement_eligible?: boolean
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
          cross_bank_fee?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_disbursement_eligible?: boolean
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      bonus_pending: {
        Row: {
          amount: number
          bonus_kind: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          employee_name: string
          id: string
          reason: string | null
          settled_at: string | null
          settled_in_payment_request_id: string | null
          status: string
          tour_code: string | null
          tour_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          bonus_kind?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          employee_name: string
          id?: string
          reason?: string | null
          settled_at?: string | null
          settled_in_payment_request_id?: string | null
          status?: string
          tour_code?: string | null
          tour_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          bonus_kind?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employee_name?: string
          id?: string
          reason?: string | null
          settled_at?: string | null
          settled_in_payment_request_id?: string | null
          status?: string
          tour_code?: string | null
          tour_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bonus_pending_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bonus_pending_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bonus_pending_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bonus_pending_settled_in_payment_request_id_fkey'
            columns: ['settled_in_payment_request_id']
            isOneToOne: false
            referencedRelation: 'payment_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bonus_pending_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bonus_pending_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          parent_branch_id: string | null
          phone: string | null
          tax_id: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          parent_branch_id?: string | null
          phone?: string | null
          tax_id: string
          type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          parent_branch_id?: string | null
          phone?: string | null
          tax_id?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'branches_parent_branch_id_fkey'
            columns: ['parent_branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'branches_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      brands: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'brands_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brands_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
            foreignKeyName: 'calendar_events_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          employee_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          role: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          employee_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          employee_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channel_members_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_members_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      channel_messages: {
        Row: {
          attachments: Json
          body: string | null
          channel_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_active: boolean
          is_pinned: boolean
          last_reply_at: string | null
          message_type: string
          payload: Json | null
          reactions: Json
          recipient_employee_id: string | null
          reply_count: number
          reply_to_id: string | null
          revoked_at: string | null
          scheduled_at: string | null
          sender_agent_id: string | null
          sender_employee_id: string | null
        }
        Insert: {
          attachments?: Json
          body?: string | null
          channel_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          last_reply_at?: string | null
          message_type?: string
          payload?: Json | null
          reactions?: Json
          recipient_employee_id?: string | null
          reply_count?: number
          reply_to_id?: string | null
          revoked_at?: string | null
          scheduled_at?: string | null
          sender_agent_id?: string | null
          sender_employee_id?: string | null
        }
        Update: {
          attachments?: Json
          body?: string | null
          channel_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          last_reply_at?: string | null
          message_type?: string
          payload?: Json | null
          reactions?: Json
          recipient_employee_id?: string | null
          reply_count?: number
          reply_to_id?: string | null
          revoked_at?: string | null
          scheduled_at?: string | null
          sender_agent_id?: string | null
          sender_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'channel_messages_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_messages_recipient_employee_id_fkey'
            columns: ['recipient_employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_messages_reply_to_id_fkey'
            columns: ['reply_to_id']
            isOneToOne: false
            referencedRelation: 'channel_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_messages_sender_agent_id_fkey'
            columns: ['sender_agent_id']
            isOneToOne: false
            referencedRelation: 'ai_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_messages_sender_employee_id_fkey'
            columns: ['sender_employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      channels: {
        Row: {
          agent_id: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          is_official: boolean
          is_system: boolean
          name: string | null
          post_permission: string
          tour_id: string | null
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_official?: boolean
          is_system?: boolean
          name?: string | null
          post_permission?: string
          tour_id?: string | null
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_official?: boolean
          is_system?: boolean
          name?: string | null
          post_permission?: string
          tour_id?: string | null
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channels_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'ai_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channels_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channels_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channels_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
        Relationships: []
      }
      checks: {
        Row: {
          amount: number
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: 'checks_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
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
        Relationships: []
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
            foreignKeyName: 'companies_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
            foreignKeyName: 'company_contacts_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      contracts: {
        Row: {
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: 'contracts_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contracts_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      conversation_retrospectives: {
        Row: {
          conversation_id: string
          conversation_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          generated_by: string | null
          id: string
          message_count_at_generation: number
          notes: string | null
          status: string
          summary_text: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          conversation_id: string
          conversation_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          generated_by?: string | null
          id?: string
          message_count_at_generation?: number
          notes?: string | null
          status?: string
          summary_text: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          conversation_id?: string
          conversation_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          generated_by?: string | null
          id?: string
          message_count_at_generation?: number
          notes?: string | null
          status?: string
          summary_text?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_retrospectives_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'inbox_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_retrospectives_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_retrospectives_generated_by_fkey'
            columns: ['generated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_retrospectives_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_retrospectives_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
        Relationships: []
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
      customer_document_application_history: {
        Row: {
          application_id: string
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          reason: string | null
          to_status: string
          workspace_id: string
        }
        Insert: {
          application_id: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          to_status: string
          workspace_id: string
        }
        Update: {
          application_id?: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          to_status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_document_application_history_application_id_fkey'
            columns: ['application_id']
            isOneToOne: false
            referencedRelation: 'customer_document_applications'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_application_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_application_history_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customer_document_applications: {
        Row: {
          actual_price: number | null
          application_service_type_id: string
          collected_at: string | null
          created_at: string
          created_by: string | null
          customer_document_id: string
          deleted_at: string | null
          fee_charged: number | null
          id: string
          notes: string | null
          order_id: string | null
          order_member_id: string | null
          rejected_at: string | null
          returned_to_customer_at: string | null
          reverses_application_id: string | null
          standard_price: number | null
          status: string
          submitted_at: string | null
          supplier_id: string | null
          tour_id: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          actual_price?: number | null
          application_service_type_id: string
          collected_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_document_id: string
          deleted_at?: string | null
          fee_charged?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_member_id?: string | null
          rejected_at?: string | null
          returned_to_customer_at?: string | null
          reverses_application_id?: string | null
          standard_price?: number | null
          status?: string
          submitted_at?: string | null
          supplier_id?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          actual_price?: number | null
          application_service_type_id?: string
          collected_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_document_id?: string
          deleted_at?: string | null
          fee_charged?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_member_id?: string | null
          rejected_at?: string | null
          returned_to_customer_at?: string | null
          reverses_application_id?: string | null
          standard_price?: number | null
          status?: string
          submitted_at?: string | null
          supplier_id?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_document_applications_application_service_type_id_fkey'
            columns: ['application_service_type_id']
            isOneToOne: false
            referencedRelation: 'application_service_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_customer_document_id_fkey'
            columns: ['customer_document_id']
            isOneToOne: false
            referencedRelation: 'customer_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_reverses_application_id_fkey'
            columns: ['reverses_application_id']
            isOneToOne: false
            referencedRelation: 'customer_document_applications'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_document_applications_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          document_name: string | null
          document_name_print: string | null
          document_number: string | null
          document_type_id: string
          expires_on: string | null
          id: string
          image_url: string | null
          is_primary: boolean
          notes: string | null
          status: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          document_name?: string | null
          document_name_print?: string | null
          document_number?: string | null
          document_type_id: string
          expires_on?: string | null
          id?: string
          image_url?: string | null
          is_primary?: boolean
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          document_name?: string | null
          document_name_print?: string | null
          document_number?: string | null
          document_type_id?: string
          expires_on?: string | null
          id?: string
          image_url?: string | null
          is_primary?: boolean
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_documents_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_documents_document_type_id_fkey'
            columns: ['document_type_id']
            isOneToOne: false
            referencedRelation: 'document_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_documents_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customer_memories: {
        Row: {
          conversation_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          failed_attempts: number
          id: string
          last_error: string | null
          last_summarized_at: string | null
          last_summarized_message_count: number
          memory_json: Json
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          failed_attempts?: number
          id?: string
          last_error?: string | null
          last_summarized_at?: string | null
          last_summarized_message_count?: number
          memory_json?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          failed_attempts?: number
          id?: string
          last_error?: string | null
          last_summarized_at?: string | null
          last_summarized_message_count?: number
          memory_json?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_memories_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'inbox_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_memories_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_memories_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_memories_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_memories_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customer_service_conversations: {
        Row: {
          ai_response: string
          created_at: string | null
          id: string
          intent: string | null
          is_potential_lead: boolean | null
          lead_score: number | null
          mentioned_tours: string[] | null
          platform: string
          platform_user_id: string
          sentiment: string | null
          user_display_name: string | null
          user_message: string
        }
        Insert: {
          ai_response: string
          created_at?: string | null
          id?: string
          intent?: string | null
          is_potential_lead?: boolean | null
          lead_score?: number | null
          mentioned_tours?: string[] | null
          platform: string
          platform_user_id: string
          sentiment?: string | null
          user_display_name?: string | null
          user_message: string
        }
        Update: {
          ai_response?: string
          created_at?: string | null
          id?: string
          intent?: string | null
          is_potential_lead?: boolean | null
          lead_score?: number | null
          mentioned_tours?: string[] | null
          platform?: string
          platform_user_id?: string
          sentiment?: string | null
          user_display_name?: string | null
          user_message?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          alternative_phone: string | null
          avatar_url: string | null
          birth_date: string | null
          branch_id: string | null
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
          verification_status: Database['public']['Enums']['verification_status']
          vip_level: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          alternative_phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          branch_id?: string | null
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
          verification_status?: Database['public']['Enums']['verification_status']
          vip_level?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          alternative_phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          branch_id?: string | null
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
          verification_status?: Database['public']['Enums']['verification_status']
          vip_level?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customers_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customers_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customers_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customers_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customers_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      disbursement_order_items: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          disbursement_order_id: string
          fee_amount: number | null
          from_bank_account_id: string | null
          has_cross_bank_fee: boolean | null
          id: string
          payment_request_item_id: string
          supplier_bank_code: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          disbursement_order_id: string
          fee_amount?: number | null
          from_bank_account_id?: string | null
          has_cross_bank_fee?: boolean | null
          id?: string
          payment_request_item_id: string
          supplier_bank_code?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          disbursement_order_id?: string
          fee_amount?: number | null
          from_bank_account_id?: string | null
          has_cross_bank_fee?: boolean | null
          id?: string
          payment_request_item_id?: string
          supplier_bank_code?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'disbursement_order_items_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disbursement_order_items_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disbursement_order_items_disbursement_order_id_fkey'
            columns: ['disbursement_order_id']
            isOneToOne: false
            referencedRelation: 'disbursement_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disbursement_order_items_from_bank_account_id_fkey'
            columns: ['from_bank_account_id']
            isOneToOne: false
            referencedRelation: 'bank_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disbursement_order_items_payment_request_item_id_fkey'
            columns: ['payment_request_item_id']
            isOneToOne: true
            referencedRelation: 'payment_request_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disbursement_order_items_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      disbursement_orders: {
        Row: {
          accounting_voucher_id: string | null
          amount: number
          bank_account_id: string | null
          batch_uuid: string | null
          branch_id: string | null
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
          payment_method_id: string | null
          pdf_url: string | null
          refund_id: string | null
          status: string
          total_fee: number
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          accounting_voucher_id?: string | null
          amount: number
          bank_account_id?: string | null
          batch_uuid?: string | null
          branch_id?: string | null
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
          payment_method_id?: string | null
          pdf_url?: string | null
          refund_id?: string | null
          status?: string
          total_fee?: number
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          accounting_voucher_id?: string | null
          amount?: number
          bank_account_id?: string | null
          batch_uuid?: string | null
          branch_id?: string | null
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
          payment_method_id?: string | null
          pdf_url?: string | null
          refund_id?: string | null
          status?: string
          total_fee?: number
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'disbursement_orders_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disbursement_orders_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disbursement_orders_payment_method_fk'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
        ]
      }
      document_types: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          group_label: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          group_label?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          group_label?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'document_types_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'document_types_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'document_types_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      driver_tasks: {
        Row: {
          accepted_at: string | null
          agency_contact_name: string | null
          agency_contact_phone: string | null
          assigned_at: string | null
          branch_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          driver_id: string | null
          driver_name: string | null
          driver_note: string | null
          driver_phone: string | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_location: string
          dropoff_note: string | null
          estimated_cost: number | null
          final_cost: number | null
          id: string
          internal_note: string | null
          passenger_count: number | null
          passenger_name: string | null
          passenger_note: string | null
          passenger_phone: string | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          pickup_note: string | null
          pickup_time: string
          service_date: string
          source_workspace_id: string | null
          started_at: string | null
          status: string | null
          stops: Json | null
          supplier_id: string
          supplier_name: string | null
          task_code: string
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          tour_request_id: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_info: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          assigned_at?: string | null
          branch_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_note?: string | null
          driver_phone?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_location: string
          dropoff_note?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          internal_note?: string | null
          passenger_count?: number | null
          passenger_name?: string | null
          passenger_note?: string | null
          passenger_phone?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          pickup_note?: string | null
          pickup_time: string
          service_date: string
          source_workspace_id?: string | null
          started_at?: string | null
          status?: string | null
          stops?: Json | null
          supplier_id: string
          supplier_name?: string | null
          task_code: string
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          tour_request_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_info?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          assigned_at?: string | null
          branch_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_note?: string | null
          driver_phone?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_location?: string
          dropoff_note?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          internal_note?: string | null
          passenger_count?: number | null
          passenger_name?: string | null
          passenger_note?: string | null
          passenger_phone?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          pickup_note?: string | null
          pickup_time?: string
          service_date?: string
          source_workspace_id?: string | null
          started_at?: string | null
          status?: string | null
          stops?: Json | null
          supplier_id?: string
          supplier_name?: string | null
          task_code?: string
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          tour_request_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_info?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'driver_tasks_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'driver_tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'driver_tasks_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      employee_branches: {
        Row: {
          branch_id: string
          created_at: string
          employee_id: string
          is_primary: boolean
        }
        Insert: {
          branch_id: string
          created_at?: string
          employee_id: string
          is_primary?: boolean
        }
        Update: {
          branch_id?: string
          created_at?: string
          employee_id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'employee_branches_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_branches_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      employee_brands: {
        Row: {
          brand_id: string
          created_at: string
          employee_id: string
          is_primary: boolean
        }
        Insert: {
          brand_id: string
          created_at?: string
          employee_id: string
          is_primary?: boolean
        }
        Update: {
          brand_id?: string
          created_at?: string
          employee_id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'employee_brands_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_brands_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      employee_eligibilities: {
        Row: {
          created_at: string
          created_by: string | null
          eligibility_code: string
          employee_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          eligibility_code: string
          employee_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          eligibility_code?: string
          employee_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employee_eligibilities_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_eligibilities_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_eligibilities_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      employees: {
        Row: {
          accessible_branch_ids: string[]
          accessible_department_ids: string[]
          amadeus_totp_account_name: string | null
          amadeus_totp_secret: string | null
          attendance: Json | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          bank_name: string | null
          birth_date: string | null
          birthday: string | null
          branch_id: string | null
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
          encrypted_bank_account_number: string | null
          encrypted_id_number: string | null
          english_name: string | null
          hidden_menu_items: string[] | null
          id: string
          id_number: string | null
          is_dept_manager: boolean
          job_info: Json | null
          job_title: string | null
          labor_insurance_date: string | null
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
          tourism_join_date: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          accessible_branch_ids?: string[]
          accessible_department_ids?: string[]
          amadeus_totp_account_name?: string | null
          amadeus_totp_secret?: string | null
          attendance?: Json | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          birth_date?: string | null
          birthday?: string | null
          branch_id?: string | null
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
          encrypted_bank_account_number?: string | null
          encrypted_id_number?: string | null
          english_name?: string | null
          hidden_menu_items?: string[] | null
          id?: string
          id_number?: string | null
          is_dept_manager?: boolean
          job_info?: Json | null
          job_title?: string | null
          labor_insurance_date?: string | null
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
          tourism_join_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          accessible_branch_ids?: string[]
          accessible_department_ids?: string[]
          amadeus_totp_account_name?: string | null
          amadeus_totp_secret?: string | null
          attendance?: Json | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          birth_date?: string | null
          birthday?: string | null
          branch_id?: string | null
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
          encrypted_bank_account_number?: string | null
          encrypted_id_number?: string | null
          english_name?: string | null
          hidden_menu_items?: string[] | null
          id?: string
          id_number?: string | null
          is_dept_manager?: boolean
          job_info?: Json | null
          job_title?: string | null
          labor_insurance_date?: string | null
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
          tourism_join_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'employees_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'workspace_roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_terminated_by_fkey'
            columns: ['terminated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string | null
          color: string
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          icon: string
          id: string
          is_active: boolean | null
          is_system: boolean
          name: string
          sort_order: number | null
          type: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          code?: string | null
          color: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name: string
          sort_order?: number | null
          type?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          code?: string | null
          color?: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name?: string
          sort_order?: number | null
          type?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'expense_categories_credit_account_id_fkey'
            columns: ['credit_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expense_categories_debit_account_id_fkey'
            columns: ['debit_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
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
          created_by_user_id: string | null
          created_by_workspace_id: string | null
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
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
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
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: 'hotels_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
            foreignKeyName: 'image_library_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      inbox_conversation_notes: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          employee_id: string
          id: number
          workspace_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          employee_id: string
          id?: number
          workspace_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          employee_id?: string
          id?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inbox_conversation_notes_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'inbox_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inbox_conversation_notes_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inbox_conversation_notes_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      inbox_conversations: {
        Row: {
          bot_paused: boolean
          bot_paused_until: string | null
          channel_type: string
          created_at: string
          customer_id: string | null
          display_name: string | null
          external_user_id: string
          id: string
          is_archived: boolean
          last_message_at: string | null
          last_message_direction: string | null
          last_message_preview: string | null
          picture_url: string | null
          unread_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bot_paused?: boolean
          bot_paused_until?: string | null
          channel_type: string
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          external_user_id: string
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          picture_url?: string | null
          unread_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bot_paused?: boolean
          bot_paused_until?: string | null
          channel_type?: string
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          external_user_id?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          picture_url?: string | null
          unread_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inbox_conversations_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inbox_conversations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      inbox_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: number
          media_url: string | null
          message_type: string
          raw_event: Json | null
          sender_employee_id: string | null
          sender_type: string
          source_id: string | null
          workspace_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: number
          media_url?: string | null
          message_type?: string
          raw_event?: Json | null
          sender_employee_id?: string | null
          sender_type: string
          source_id?: string | null
          workspace_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: number
          media_url?: string | null
          message_type?: string
          raw_event?: Json | null
          sender_employee_id?: string | null
          sender_type?: string
          source_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inbox_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'inbox_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inbox_messages_sender_employee_id_fkey'
            columns: ['sender_employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inbox_messages_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      integration_usage_log: {
        Row: {
          called_at: string
          created_at: string
          error_message: string | null
          id: string
          integration_code: string
          metadata: Json | null
          success: boolean
          triggered_by: string | null
          workspace_id: string
        }
        Insert: {
          called_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          integration_code: string
          metadata?: Json | null
          success: boolean
          triggered_by?: string | null
          workspace_id: string
        }
        Update: {
          called_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          integration_code?: string
          metadata?: Json | null
          success?: boolean
          triggered_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'integration_usage_log_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      invoice_batches: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          public_token: string
          status: string
          token_expires_at: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          public_token?: string
          status?: string
          token_expires_at?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          public_token?: string
          status?: string
          token_expires_at?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoice_batches_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoice_batches_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoice_batches_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoice_batches_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoice_batches_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          batch_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string | null
          id: string
          member_id: string | null
          notes: string | null
          order_id: string
          paid_amount: number
          public_token: string
          status: string
          token_expires_at: string
          total_amount: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          batch_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          order_id: string
          paid_amount?: number
          public_token?: string
          status?: string
          token_expires_at?: string
          total_amount: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          batch_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          order_id?: string
          paid_amount?: number
          public_token?: string
          status?: string
          token_expires_at?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'invoice_batches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      itineraries: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          archived_at: string | null
          author_name: string
          branch_id: string | null
          cancellation_policy: string[] | null
          city: string
          closed_at: string | null
          code: string
          country: string
          cover_image: string
          cover_style: string | null
          cover_template_id: string | null
          created_at: string | null
          created_by: string | null
          daily_itinerary: Json
          daily_template_id: string | null
          departure_date: string
          description: string
          duration_days: number | null
          faqs: Json | null
          features: Json
          features_style: string | null
          flight_style: string | null
          flight_template_id: string | null
          focus_cards: Json
          hidden_items_for_brochure: Json | null
          hidden_items_for_web: Json | null
          hotel_style: string | null
          hotels: Json
          id: string
          is_latest: boolean
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
          show_hotels: boolean
          show_leader_meeting: boolean
          show_notices: boolean | null
          show_price_tiers: boolean | null
          show_pricing_details: boolean | null
          status: string
          subtitle: string
          tagline: string
          template_code: string | null
          template_id: string | null
          template_name: string | null
          title: string
          tour_code: string
          tour_id: string | null
          updated_at: string | null
          updated_by: string | null
          version: number
          version_records: Json | null
          workspace_id: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          archived_at?: string | null
          author_name?: string
          branch_id?: string | null
          cancellation_policy?: string[] | null
          city: string
          closed_at?: string | null
          code: string
          country: string
          cover_image: string
          cover_style?: string | null
          cover_template_id?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_itinerary?: Json
          daily_template_id?: string | null
          departure_date: string
          description: string
          duration_days?: number | null
          faqs?: Json | null
          features?: Json
          features_style?: string | null
          flight_style?: string | null
          flight_template_id?: string | null
          focus_cards?: Json
          hidden_items_for_brochure?: Json | null
          hidden_items_for_web?: Json | null
          hotel_style?: string | null
          hotels?: Json
          id?: string
          is_latest?: boolean
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
          show_hotels?: boolean
          show_leader_meeting?: boolean
          show_notices?: boolean | null
          show_price_tiers?: boolean | null
          show_pricing_details?: boolean | null
          status?: string
          subtitle: string
          tagline: string
          template_code?: string | null
          template_id?: string | null
          template_name?: string | null
          title: string
          tour_code: string
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number
          version_records?: Json | null
          workspace_id?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          archived_at?: string | null
          author_name?: string
          branch_id?: string | null
          cancellation_policy?: string[] | null
          city?: string
          closed_at?: string | null
          code?: string
          country?: string
          cover_image?: string
          cover_style?: string | null
          cover_template_id?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_itinerary?: Json
          daily_template_id?: string | null
          departure_date?: string
          description?: string
          duration_days?: number | null
          faqs?: Json | null
          features?: Json
          features_style?: string | null
          flight_style?: string | null
          flight_template_id?: string | null
          focus_cards?: Json
          hidden_items_for_brochure?: Json | null
          hidden_items_for_web?: Json | null
          hotel_style?: string | null
          hotels?: Json
          id?: string
          is_latest?: boolean
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
          show_hotels?: boolean
          show_leader_meeting?: boolean
          show_notices?: boolean | null
          show_price_tiers?: boolean | null
          show_pricing_details?: boolean | null
          status?: string
          subtitle?: string
          tagline?: string
          template_code?: string | null
          template_id?: string | null
          template_name?: string | null
          title?: string
          tour_code?: string
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number
          version_records?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_itineraries_parent'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'itineraries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_itineraries_workspace'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
          subledger_type: Database['public']['Enums']['subledger_type'] | null
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
          subledger_type?: Database['public']['Enums']['subledger_type'] | null
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
          subledger_type?: Database['public']['Enums']['subledger_type'] | null
          voucher_id?: string | null
        }
        Relationships: []
      }
      journal_vouchers: {
        Row: {
          branch_id: string | null
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
          status: Database['public']['Enums']['voucher_status'] | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string | null
          voucher_date: string
          voucher_no: string
          workspace_id: string | null
        }
        Insert: {
          branch_id?: string | null
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
          status?: Database['public']['Enums']['voucher_status'] | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
          voucher_date: string
          voucher_no: string
          workspace_id?: string | null
        }
        Update: {
          branch_id?: string | null
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
          status?: Database['public']['Enums']['voucher_status'] | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
          voucher_date?: string
          voucher_no?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'journal_vouchers_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journal_vouchers_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      kb_agencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name_en: string | null
          name_zh: string
          notes: string | null
          type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_zh: string
          notes?: string | null
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_zh?: string
          notes?: string | null
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      kb_cabin_types: {
        Row: {
          cabin_code: string | null
          capacity: number
          category: string
          created_at: string
          description: string | null
          features: string[] | null
          has_balcony: boolean | null
          has_bathtub: boolean | null
          has_bidet: boolean | null
          has_window: boolean | null
          id: string
          max_capacity: number | null
          name_en: string | null
          name_zh: string
          notes: string | null
          ship_id: string
          size_ping: number | null
          size_sqm: number | null
          updated_at: string
        }
        Insert: {
          cabin_code?: string | null
          capacity?: number
          category: string
          created_at?: string
          description?: string | null
          features?: string[] | null
          has_balcony?: boolean | null
          has_bathtub?: boolean | null
          has_bidet?: boolean | null
          has_window?: boolean | null
          id?: string
          max_capacity?: number | null
          name_en?: string | null
          name_zh: string
          notes?: string | null
          ship_id: string
          size_ping?: number | null
          size_sqm?: number | null
          updated_at?: string
        }
        Update: {
          cabin_code?: string | null
          capacity?: number
          category?: string
          created_at?: string
          description?: string | null
          features?: string[] | null
          has_balcony?: boolean | null
          has_bathtub?: boolean | null
          has_bidet?: boolean | null
          has_window?: boolean | null
          id?: string
          max_capacity?: number | null
          name_en?: string | null
          name_zh?: string
          notes?: string | null
          ship_id?: string
          size_ping?: number | null
          size_sqm?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kb_cabin_types_ship_id_fkey'
            columns: ['ship_id']
            isOneToOne: false
            referencedRelation: 'kb_cruise_ships'
            referencedColumns: ['id']
          },
        ]
      }
      kb_cancellation_policies: {
        Row: {
          applies_to: string | null
          created_at: string
          cruise_line_id: string
          days_before_departure_max: number | null
          days_before_departure_min: number
          id: string
          notes: string | null
          penalty_percent: number | null
          policy_label: string | null
          refund_percent: number
          source_url: string | null
          updated_at: string
        }
        Insert: {
          applies_to?: string | null
          created_at?: string
          cruise_line_id: string
          days_before_departure_max?: number | null
          days_before_departure_min: number
          id?: string
          notes?: string | null
          penalty_percent?: number | null
          policy_label?: string | null
          refund_percent: number
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          applies_to?: string | null
          created_at?: string
          cruise_line_id?: string
          days_before_departure_max?: number | null
          days_before_departure_min?: number
          id?: string
          notes?: string | null
          penalty_percent?: number | null
          policy_label?: string | null
          refund_percent?: number
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kb_cancellation_policies_cruise_line_id_fkey'
            columns: ['cruise_line_id']
            isOneToOne: false
            referencedRelation: 'kb_cruise_lines'
            referencedColumns: ['id']
          },
        ]
      }
      kb_cruise_agency_relations: {
        Row: {
          agency_id: string
          created_at: string
          cruise_line_id: string
          effective_from: string | null
          effective_to: string | null
          id: string
          notes: string | null
          relationship_type: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          cruise_line_id: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          notes?: string | null
          relationship_type: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          cruise_line_id?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          notes?: string | null
          relationship_type?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kb_cruise_agency_relations_agency_id_fkey'
            columns: ['agency_id']
            isOneToOne: false
            referencedRelation: 'kb_agencies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'kb_cruise_agency_relations_cruise_line_id_fkey'
            columns: ['cruise_line_id']
            isOneToOne: false
            referencedRelation: 'kb_cruise_lines'
            referencedColumns: ['id']
          },
        ]
      }
      kb_cruise_lines: {
        Row: {
          created_at: string
          description: string | null
          founded_year: number | null
          headquarters: string | null
          id: string
          is_active: boolean
          name_en: string | null
          name_zh: string
          notes: string | null
          parent_company: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_zh: string
          notes?: string | null
          parent_company?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_zh?: string
          notes?: string | null
          parent_company?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      kb_cruise_ships: {
        Row: {
          built_year: number | null
          cabin_count: number | null
          created_at: string
          crew_count: number | null
          cruise_line_id: string
          decks: number | null
          description: string | null
          flag: string | null
          highlights: string[] | null
          id: string
          is_active: boolean
          language_support: string[] | null
          last_refurbished_year: number | null
          length_meters: number | null
          max_passenger_capacity: number | null
          name_en: string | null
          name_zh: string
          notes: string | null
          passenger_capacity: number | null
          power_voltage: string | null
          ship_class: string | null
          source_url: string | null
          speed_knots: number | null
          tonnage: number | null
          updated_at: string
          width_meters: number | null
        }
        Insert: {
          built_year?: number | null
          cabin_count?: number | null
          created_at?: string
          crew_count?: number | null
          cruise_line_id: string
          decks?: number | null
          description?: string | null
          flag?: string | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean
          language_support?: string[] | null
          last_refurbished_year?: number | null
          length_meters?: number | null
          max_passenger_capacity?: number | null
          name_en?: string | null
          name_zh: string
          notes?: string | null
          passenger_capacity?: number | null
          power_voltage?: string | null
          ship_class?: string | null
          source_url?: string | null
          speed_knots?: number | null
          tonnage?: number | null
          updated_at?: string
          width_meters?: number | null
        }
        Update: {
          built_year?: number | null
          cabin_count?: number | null
          created_at?: string
          crew_count?: number | null
          cruise_line_id?: string
          decks?: number | null
          description?: string | null
          flag?: string | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean
          language_support?: string[] | null
          last_refurbished_year?: number | null
          length_meters?: number | null
          max_passenger_capacity?: number | null
          name_en?: string | null
          name_zh?: string
          notes?: string | null
          passenger_capacity?: number | null
          power_voltage?: string | null
          ship_class?: string | null
          source_url?: string | null
          speed_knots?: number | null
          tonnage?: number | null
          updated_at?: string
          width_meters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'kb_cruise_ships_cruise_line_id_fkey'
            columns: ['cruise_line_id']
            isOneToOne: false
            referencedRelation: 'kb_cruise_lines'
            referencedColumns: ['id']
          },
        ]
      }
      kb_fees: {
        Row: {
          amount: number | null
          applies_to_cabin_categories: string[] | null
          child_age_max: number | null
          child_age_min: number | null
          created_at: string
          cruise_line_id: string | null
          currency: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          fee_type: string
          id: string
          is_optional: boolean | null
          notes: string | null
          per_unit: string
          ship_id: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          applies_to_cabin_categories?: string[] | null
          child_age_max?: number | null
          child_age_min?: number | null
          created_at?: string
          cruise_line_id?: string | null
          currency?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fee_type: string
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          per_unit: string
          ship_id?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          applies_to_cabin_categories?: string[] | null
          child_age_max?: number | null
          child_age_min?: number | null
          created_at?: string
          cruise_line_id?: string | null
          currency?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fee_type?: string
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          per_unit?: string
          ship_id?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kb_fees_cruise_line_id_fkey'
            columns: ['cruise_line_id']
            isOneToOne: false
            referencedRelation: 'kb_cruise_lines'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'kb_fees_ship_id_fkey'
            columns: ['ship_id']
            isOneToOne: false
            referencedRelation: 'kb_cruise_ships'
            referencedColumns: ['id']
          },
        ]
      }
      kb_pricing: {
        Row: {
          cabin_type_id: string
          child_free_quota: number | null
          child_free_under_age: number | null
          created_at: string
          early_bird_deadline: string | null
          early_bird_discount_per_cabin: number | null
          early_bird_price_twd: number | null
          effective_from: string | null
          effective_to: string | null
          fourth_person_free: boolean | null
          group_discount_per_person_twd: number | null
          group_discount_threshold: number | null
          id: string
          notes: string | null
          price_currency: string
          price_per_person_twd: number | null
          price_per_person_usd: number | null
          sailing_id: string
          source_platform: string | null
          source_url: string | null
          third_person_free: boolean | null
          third_person_price_twd: number | null
          updated_at: string
        }
        Insert: {
          cabin_type_id: string
          child_free_quota?: number | null
          child_free_under_age?: number | null
          created_at?: string
          early_bird_deadline?: string | null
          early_bird_discount_per_cabin?: number | null
          early_bird_price_twd?: number | null
          effective_from?: string | null
          effective_to?: string | null
          fourth_person_free?: boolean | null
          group_discount_per_person_twd?: number | null
          group_discount_threshold?: number | null
          id?: string
          notes?: string | null
          price_currency?: string
          price_per_person_twd?: number | null
          price_per_person_usd?: number | null
          sailing_id: string
          source_platform?: string | null
          source_url?: string | null
          third_person_free?: boolean | null
          third_person_price_twd?: number | null
          updated_at?: string
        }
        Update: {
          cabin_type_id?: string
          child_free_quota?: number | null
          child_free_under_age?: number | null
          created_at?: string
          early_bird_deadline?: string | null
          early_bird_discount_per_cabin?: number | null
          early_bird_price_twd?: number | null
          effective_from?: string | null
          effective_to?: string | null
          fourth_person_free?: boolean | null
          group_discount_per_person_twd?: number | null
          group_discount_threshold?: number | null
          id?: string
          notes?: string | null
          price_currency?: string
          price_per_person_twd?: number | null
          price_per_person_usd?: number | null
          sailing_id?: string
          source_platform?: string | null
          source_url?: string | null
          third_person_free?: boolean | null
          third_person_price_twd?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kb_pricing_cabin_type_id_fkey'
            columns: ['cabin_type_id']
            isOneToOne: false
            referencedRelation: 'kb_cabin_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'kb_pricing_sailing_id_fkey'
            columns: ['sailing_id']
            isOneToOne: false
            referencedRelation: 'kb_sailings'
            referencedColumns: ['id']
          },
        ]
      }
      kb_sailing_agencies: {
        Row: {
          agency_id: string
          cabin_block_type: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          early_bird_deadline: string | null
          early_bird_price_twd: number | null
          id: string
          includes_meals_full: boolean | null
          includes_shore_excursion: boolean | null
          includes_tour_leader: boolean | null
          includes_transfer: boolean | null
          includes_visa_arrange: boolean | null
          list_price_twd: number | null
          notes: string | null
          sailing_id: string
          source_url: string | null
          updated_at: string | null
          verification_level: string | null
          verified_at: string | null
        }
        Insert: {
          agency_id: string
          cabin_block_type?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          early_bird_deadline?: string | null
          early_bird_price_twd?: number | null
          id?: string
          includes_meals_full?: boolean | null
          includes_shore_excursion?: boolean | null
          includes_tour_leader?: boolean | null
          includes_transfer?: boolean | null
          includes_visa_arrange?: boolean | null
          list_price_twd?: number | null
          notes?: string | null
          sailing_id: string
          source_url?: string | null
          updated_at?: string | null
          verification_level?: string | null
          verified_at?: string | null
        }
        Update: {
          agency_id?: string
          cabin_block_type?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          early_bird_deadline?: string | null
          early_bird_price_twd?: number | null
          id?: string
          includes_meals_full?: boolean | null
          includes_shore_excursion?: boolean | null
          includes_tour_leader?: boolean | null
          includes_transfer?: boolean | null
          includes_visa_arrange?: boolean | null
          list_price_twd?: number | null
          notes?: string | null
          sailing_id?: string
          source_url?: string | null
          updated_at?: string | null
          verification_level?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'kb_sailing_agencies_agency_id_fkey'
            columns: ['agency_id']
            isOneToOne: false
            referencedRelation: 'kb_agencies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'kb_sailing_agencies_sailing_id_fkey'
            columns: ['sailing_id']
            isOneToOne: false
            referencedRelation: 'kb_sailings'
            referencedColumns: ['id']
          },
        ]
      }
      kb_sailings: {
        Row: {
          created_at: string
          departure_date: string
          departure_port: string
          destinations: string[]
          duration_days: number | null
          duration_nights: number | null
          id: string
          itinerary_summary: string | null
          notes: string | null
          return_date: string | null
          return_port: string | null
          route_type: string | null
          ship_id: string
          source_url: string | null
          status: string
          updated_at: string
          verification_level: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          departure_date: string
          departure_port: string
          destinations: string[]
          duration_days?: number | null
          duration_nights?: number | null
          id?: string
          itinerary_summary?: string | null
          notes?: string | null
          return_date?: string | null
          return_port?: string | null
          route_type?: string | null
          ship_id: string
          source_url?: string | null
          status?: string
          updated_at?: string
          verification_level?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          departure_date?: string
          departure_port?: string
          destinations?: string[]
          duration_days?: number | null
          duration_nights?: number | null
          id?: string
          itinerary_summary?: string | null
          notes?: string | null
          return_date?: string | null
          return_port?: string | null
          route_type?: string | null
          ship_id?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          verification_level?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'kb_sailings_ship_id_fkey'
            columns: ['ship_id']
            isOneToOne: false
            referencedRelation: 'kb_cruise_ships'
            referencedColumns: ['id']
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chunk_type: string
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          chunk_type: string
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          chunk_type?: string
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'knowledge_chunks_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'knowledge_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'knowledge_chunks_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      knowledge_documents: {
        Row: {
          country: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          metadata: Json
          positioning: string | null
          region: string
          region_en: string | null
          source_file: string | null
          source_version: string | null
          title: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          country: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          positioning?: string | null
          region: string
          region_en?: string | null
          source_file?: string | null
          source_version?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          country?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          positioning?: string | null
          region?: string
          region_en?: string | null
          source_file?: string | null
          source_version?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'knowledge_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'knowledge_documents_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'knowledge_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      line_bot_reply_debounce: {
        Row: {
          accumulated_text: string
          created_at: string
          id: number
          is_expired: boolean
          last_message_at: string
          line_user_id: string
          reply_token: string | null
          sent_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accumulated_text?: string
          created_at?: string
          id?: number
          is_expired?: boolean
          last_message_at?: string
          line_user_id: string
          reply_token?: string | null
          sent_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accumulated_text?: string
          created_at?: string
          id?: number
          is_expired?: boolean
          last_message_at?: string
          line_user_id?: string
          reply_token?: string | null
          sent_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'line_bot_reply_debounce_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
            foreignKeyName: 'line_conversation_messages_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      line_conversation_overrides: {
        Row: {
          bot_paused: boolean
          created_at: string
          id: string
          line_user_id: string
          notes: string | null
          paused_at: string | null
          paused_by: string | null
          paused_until: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bot_paused?: boolean
          created_at?: string
          id?: string
          line_user_id: string
          notes?: string | null
          paused_at?: string | null
          paused_by?: string | null
          paused_until?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bot_paused?: boolean
          created_at?: string
          id?: string
          line_user_id?: string
          notes?: string | null
          paused_at?: string | null
          paused_by?: string | null
          paused_until?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'line_conversation_overrides_paused_by_fkey'
            columns: ['paused_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'line_conversation_overrides_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      line_postback_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          postback_data: string
          response_text: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          postback_data: string
          response_text: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          postback_data?: string
          response_text?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'line_postback_templates_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      line_user_profiles: {
        Row: {
          created_at: string
          customer_id: string | null
          display_name: string | null
          first_seen_at: string
          id: string
          language: string | null
          last_seen_at: string
          line_user_id: string
          picture_url: string | null
          status_message: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          first_seen_at?: string
          id?: string
          language?: string | null
          last_seen_at?: string
          line_user_id: string
          picture_url?: string | null
          status_message?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          first_seen_at?: string
          id?: string
          language?: string | null
          last_seen_at?: string
          line_user_id?: string
          picture_url?: string | null
          status_message?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'line_user_profiles_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'line_user_profiles_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      llm_usage_logs: {
        Row: {
          caller: string | null
          completion_tokens: number
          cost_usd: number
          created_at: string
          created_by: string | null
          error_code: string | null
          id: string
          latency_ms: number | null
          model: string
          prompt_tokens: number
          provider: string
          success: boolean
          total_tokens: number | null
          workspace_id: string
        }
        Insert: {
          caller?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          id?: string
          latency_ms?: number | null
          model: string
          prompt_tokens?: number
          provider: string
          success?: boolean
          total_tokens?: number | null
          workspace_id: string
        }
        Update: {
          caller?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          id?: string
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number
          provider?: string
          success?: boolean
          total_tokens?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'llm_usage_logs_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'llm_usage_logs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
            foreignKeyName: 'notes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      order_members: {
        Row: {
          age: number | null
          balance_amount: number | null
          balance_receipt_no: string | null
          birth_date: string | null
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: 'order_members_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_roommate_id_fkey'
            columns: ['roommate_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      order_status_logs: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
          workspace_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
          workspace_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_status_logs_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          adult_count: number | null
          assistant: string | null
          assistant_id: string | null
          branch_id: string | null
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
          source: string
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
          branch_id?: string | null
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
          source?: string
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
          branch_id?: string | null
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
          source?: string
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
            foreignKeyName: 'orders_assistant_id_fkey'
            columns: ['assistant_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_sales_id_fkey'
            columns: ['sales_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          fee_account_id: string | null
          fee_fixed: number | null
          fee_percent: number | null
          id: string
          is_active: boolean | null
          is_customer_visible: boolean
          is_system: boolean | null
          kind: string | null
          name: string
          placeholder: string | null
          provider: string
          sort_order: number | null
          type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          fee_account_id?: string | null
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_customer_visible?: boolean
          is_system?: boolean | null
          kind?: string | null
          name: string
          placeholder?: string | null
          provider?: string
          sort_order?: number | null
          type: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          fee_account_id?: string | null
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_customer_visible?: boolean
          is_system?: boolean | null
          kind?: string | null
          name?: string
          placeholder?: string | null
          provider?: string
          sort_order?: number | null
          type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payment_methods_credit_account_id_fkey'
            columns: ['credit_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_methods_debit_account_id_fkey'
            columns: ['debit_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_methods_fee_account_id_fkey'
            columns: ['fee_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_methods_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payment_request_items: {
        Row: {
          advanced_by: string | null
          advanced_by_name: string | null
          amount: number
          branch_id: string | null
          category: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_request_date: string | null
          description: string
          id: string
          item_number: string | null
          notes: string | null
          payee_employee_id: string | null
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
          unit_price: number
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          advanced_by?: string | null
          advanced_by_name?: string | null
          amount?: number
          branch_id?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_request_date?: string | null
          description: string
          id?: string
          item_number?: string | null
          notes?: string | null
          payee_employee_id?: string | null
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
          unit_price?: number
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          advanced_by?: string | null
          advanced_by_name?: string | null
          amount?: number
          branch_id?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_request_date?: string | null
          description?: string
          id?: string
          item_number?: string | null
          notes?: string | null
          payee_employee_id?: string | null
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
          unit_price?: number
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payment_request_items_advanced_by_fkey'
            columns: ['advanced_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'expense_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_payee_employee_id_fkey'
            columns: ['payee_employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'payment_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_transferred_by_fkey'
            columns: ['transferred_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_transferred_from_tour_id_fkey'
            columns: ['transferred_from_tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
          branch_id: string | null
          budget_warning: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          disbursement_order_id: string | null
          expense_category_id: string | null
          expense_type: string | null
          id: string
          is_special_billing: boolean | null
          list_sort_group: number | null
          list_sort_key: number | null
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
          source_id: string | null
          source_type: string | null
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
          branch_id?: string | null
          budget_warning?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          disbursement_order_id?: string | null
          expense_category_id?: string | null
          expense_type?: string | null
          id?: string
          is_special_billing?: boolean | null
          list_sort_group?: number | null
          list_sort_key?: number | null
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
          source_id?: string | null
          source_type?: string | null
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
          branch_id?: string | null
          budget_warning?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          disbursement_order_id?: string | null
          expense_category_id?: string | null
          expense_type?: string | null
          id?: string
          is_special_billing?: boolean | null
          list_sort_group?: number | null
          list_sort_key?: number | null
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
          source_id?: string | null
          source_type?: string | null
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
            foreignKeyName: 'payment_requests_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_expense_category_id_fkey'
            columns: ['expense_category_id']
            isOneToOne: false
            referencedRelation: 'expense_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          external_approve_code: string | null
          external_order_no: string | null
          external_trans_no: string | null
          id: string
          invoice_ids: string[] | null
          payment_link: string | null
          payment_link_expires_at: string | null
          payment_link_token: string | null
          payment_method_id: string | null
          provider: string
          raw_webhook_payload: Json | null
          receipt_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          external_approve_code?: string | null
          external_order_no?: string | null
          external_trans_no?: string | null
          id?: string
          invoice_ids?: string[] | null
          payment_link?: string | null
          payment_link_expires_at?: string | null
          payment_link_token?: string | null
          payment_method_id?: string | null
          provider: string
          raw_webhook_payload?: Json | null
          receipt_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          external_approve_code?: string | null
          external_order_no?: string | null
          external_trans_no?: string | null
          id?: string
          invoice_ids?: string[] | null
          payment_link?: string | null
          payment_link_expires_at?: string | null
          payment_link_token?: string | null
          payment_method_id?: string | null
          provider?: string
          raw_webhook_payload?: Json | null
          receipt_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_transactions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_transactions_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_transactions_provider_fkey'
            columns: ['provider']
            isOneToOne: false
            referencedRelation: 'platform_payment_providers'
            referencedColumns: ['code']
          },
          {
            foreignKeyName: 'payment_transactions_receipt_id_fkey'
            columns: ['receipt_id']
            isOneToOne: false
            referencedRelation: 'receipts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_transactions_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      personal_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          currency: string | null
          description: string | null
          exchange_rate: number | null
          expense_date: string
          expense_time: string | null
          id: string
          is_foreign_transaction: boolean | null
          is_settled: boolean | null
          is_split: boolean | null
          location: string | null
          payment_method: string | null
          receipt_url: string | null
          settlement_amount: number | null
          settlement_currency: string | null
          split_expense_id: string | null
          split_group_id: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          expense_date?: string
          expense_time?: string | null
          id?: string
          is_foreign_transaction?: boolean | null
          is_settled?: boolean | null
          is_split?: boolean | null
          location?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          settlement_amount?: number | null
          settlement_currency?: string | null
          split_expense_id?: string | null
          split_group_id?: string | null
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          expense_date?: string
          expense_time?: string | null
          id?: string
          is_foreign_transaction?: boolean | null
          is_settled?: boolean | null
          is_split?: boolean | null
          location?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          settlement_amount?: number | null
          settlement_currency?: string | null
          split_expense_id?: string | null
          split_group_id?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_payment_providers: {
        Row: {
          code: string
          created_at: string
          description: string | null
          enabled: boolean
          provider_kind: string
          provider_name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          provider_kind: string
          provider_name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          provider_kind?: string
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          accommodation_days: number | null
          adult_count: number | null
          airport_code: string | null
          balance_amount: number | null
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: 'quotes_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      rag_topic_queue: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          example_conversation_ids: string[]
          example_questions: string[]
          generated_at: string | null
          generated_run_id: string | null
          id: string
          notes: string | null
          occurrence_count: number
          status: string
          topic_summary: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          example_conversation_ids?: string[]
          example_questions?: string[]
          generated_at?: string | null
          generated_run_id?: string | null
          id?: string
          notes?: string | null
          occurrence_count?: number
          status?: string
          topic_summary: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          example_conversation_ids?: string[]
          example_questions?: string[]
          generated_at?: string | null
          generated_run_id?: string | null
          id?: string
          notes?: string | null
          occurrence_count?: number
          status?: string
          topic_summary?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rag_topic_queue_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rag_topic_queue_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rag_topic_queue_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      receipt_invoice_allocations: {
        Row: {
          allocated_amount: number
          branch_id: string | null
          created_at: string
          id: string
          invoice_id: string
          receipt_id: string
          workspace_id: string
        }
        Insert: {
          allocated_amount: number
          branch_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          receipt_id: string
          workspace_id: string
        }
        Update: {
          allocated_amount?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          receipt_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'receipt_invoice_allocations_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipt_invoice_allocations_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipt_invoice_allocations_receipt_id_fkey'
            columns: ['receipt_id']
            isOneToOne: false
            referencedRelation: 'receipts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipt_invoice_allocations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      receipts: {
        Row: {
          accounting_subject_id: string | null
          actual_amount: number | null
          bank_account_last5: string | null
          batch_id: string | null
          branch_id: string | null
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
          invoice_id: string | null
          is_active: boolean
          list_sort_group: number | null
          list_sort_key: number | null
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
          bank_account_last5?: string | null
          batch_id?: string | null
          branch_id?: string | null
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
          invoice_id?: string | null
          is_active?: boolean
          list_sort_group?: number | null
          list_sort_key?: number | null
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
          bank_account_last5?: string | null
          batch_id?: string | null
          branch_id?: string | null
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
          invoice_id?: string | null
          is_active?: boolean
          list_sort_group?: number | null
          list_sort_key?: number | null
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
            foreignKeyName: 'fk_receipts_payment_method'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_verified_by_fkey'
            columns: ['verified_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
          created_by_user_id: string | null
          created_by_workspace_id: string | null
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
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
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
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
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
      ref_banks: {
        Row: {
          bank_code: string
          bank_name: string
          created_at: string
          created_by_user_id: string | null
          created_by_workspace_id: string | null
          display_order: number
          english_name: string | null
          is_active: boolean
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          bank_code: string
          bank_name: string
          created_at?: string
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
          display_order?: number
          english_name?: string | null
          is_active?: boolean
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          bank_code?: string
          bank_name?: string
          created_at?: string
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
          display_order?: number
          english_name?: string | null
          is_active?: boolean
          swift_code?: string | null
          updated_at?: string
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
      ref_countries: {
        Row: {
          code: string
          continent: string | null
          created_at: string | null
          created_by_user_id: string | null
          created_by_workspace_id: string | null
          is_active: boolean
          name_en: string
          name_zh: string
          sub_region: string | null
        }
        Insert: {
          code: string
          continent?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
          is_active?: boolean
          name_en: string
          name_zh: string
          sub_region?: string | null
        }
        Update: {
          code?: string
          continent?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
          is_active?: boolean
          name_en?: string
          name_zh?: string
          sub_region?: string | null
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
        Relationships: []
      }
      ref_insurance_salary_grades: {
        Row: {
          created_at: string
          effective_from: string
          effective_until: string | null
          grade_number: number
          id: string
          kind: string
          monthly_amount: number
          notes: string | null
          source_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_until?: string | null
          grade_number: number
          id?: string
          kind: string
          monthly_amount: number
          notes?: string | null
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          grade_number?: number
          id?: string
          kind?: string
          monthly_amount?: number
          notes?: string | null
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
        Relationships: []
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
          created_by_user_id: string | null
          created_by_workspace_id: string | null
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
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
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
          created_by_user_id?: string | null
          created_by_workspace_id?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: 'restaurants_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      role_capabilities: {
        Row: {
          can_write_others: boolean
          capability_code: string
          created_at: string
          enabled: boolean
          id: string
          role_id: string
        }
        Insert: {
          can_write_others?: boolean
          capability_code: string
          created_at?: string
          enabled?: boolean
          id?: string
          role_id: string
        }
        Update: {
          can_write_others?: boolean
          capability_code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'role_capabilities_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'workspace_roles'
            referencedColumns: ['id']
          },
        ]
      }
      salary_settlement_items: {
        Row: {
          allowances: number
          attendance_bonus: number
          base_salary: number
          branch_id: string | null
          breakdown: Json | null
          created_at: string
          deductions: number
          employee_id: string
          employee_name: string
          employee_number: string | null
          id: string
          other_allowances: number
          settlement_id: string
          total_amount: number
          workspace_id: string
        }
        Insert: {
          allowances?: number
          attendance_bonus?: number
          base_salary?: number
          branch_id?: string | null
          breakdown?: Json | null
          created_at?: string
          deductions?: number
          employee_id: string
          employee_name: string
          employee_number?: string | null
          id?: string
          other_allowances?: number
          settlement_id: string
          total_amount: number
          workspace_id: string
        }
        Update: {
          allowances?: number
          attendance_bonus?: number
          base_salary?: number
          branch_id?: string | null
          breakdown?: Json | null
          created_at?: string
          deductions?: number
          employee_id?: string
          employee_name?: string
          employee_number?: string | null
          id?: string
          other_allowances?: number
          settlement_id?: string
          total_amount?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'salary_settlement_items_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'salary_settlement_items_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'salary_settlement_items_settlement_id_fkey'
            columns: ['settlement_id']
            isOneToOne: false
            referencedRelation: 'salary_settlements'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'salary_settlement_items_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      salary_settlements: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          employee_count: number
          id: string
          notes: string | null
          payment_request_id: string | null
          period: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_count?: number
          id?: string
          notes?: string | null
          payment_request_id?: string | null
          period: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_count?: number
          id?: string
          notes?: string | null
          payment_request_id?: string | null
          period?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'salary_settlements_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'salary_settlements_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'salary_settlements_payment_request_id_fkey'
            columns: ['payment_request_id']
            isOneToOne: false
            referencedRelation: 'payment_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'salary_settlements_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
            foreignKeyName: 'selector_field_roles_field_id_fkey'
            columns: ['field_id']
            isOneToOne: false
            referencedRelation: 'workspace_selector_fields'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'selector_field_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'workspace_roles'
            referencedColumns: ['id']
          },
        ]
      }
      setup_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          integration_code: string
          token: string
          updated_at: string
          used_at: string | null
          used_by_ip: string | null
          used_by_user_agent: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          integration_code: string
          token: string
          updated_at?: string
          used_at?: string | null
          used_by_ip?: string | null
          used_by_user_agent?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          integration_code?: string
          token?: string
          updated_at?: string
          used_at?: string | null
          used_by_ip?: string | null
          used_by_user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'setup_tokens_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'setup_tokens_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
          workspace_id: string
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
        Relationships: [
          {
            foreignKeyName: 'supplier_categories_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      supplier_pricing: {
        Row: {
          application_service_type_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_from: string
          id: string
          notes: string | null
          price: number
          superseded_at: string | null
          supplier_id: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          application_service_type_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string
          id?: string
          notes?: string | null
          price: number
          superseded_at?: string | null
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          application_service_type_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string
          id?: string
          notes?: string | null
          price?: number
          superseded_at?: string | null
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_pricing_application_service_type_id_fkey'
            columns: ['application_service_type_id']
            isOneToOne: false
            referencedRelation: 'application_service_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplier_pricing_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplier_pricing_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplier_pricing_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplier_pricing_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_branch: string | null
          bank_code: string | null
          bank_name: string | null
          city: string | null
          code: string
          contact_person: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          english_name: string | null
          id: string
          is_active: boolean | null
          is_domestic: boolean
          line_id: string | null
          mobile: string | null
          name: string
          notes: string | null
          password_hash: string | null
          phone: string | null
          short_name: string | null
          supplier_type_code: string | null
          swift_code: string | null
          tax_id: string | null
          updated_at: string | null
          updated_by: string | null
          usage_count: number
          wechat_id: string | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_name?: string | null
          city?: string | null
          code: string
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          english_name?: string | null
          id?: string
          is_active?: boolean | null
          is_domestic?: boolean
          line_id?: string | null
          mobile?: string | null
          name: string
          notes?: string | null
          password_hash?: string | null
          phone?: string | null
          short_name?: string | null
          supplier_type_code?: string | null
          swift_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number
          wechat_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_name?: string | null
          city?: string | null
          code?: string
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          english_name?: string | null
          id?: string
          is_active?: boolean | null
          is_domestic?: boolean
          line_id?: string | null
          mobile?: string | null
          name?: string
          notes?: string | null
          password_hash?: string | null
          phone?: string | null
          short_name?: string | null
          supplier_type_code?: string | null
          swift_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number
          wechat_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'suppliers_bank_code_fkey'
            columns: ['bank_code']
            isOneToOne: false
            referencedRelation: 'ref_banks'
            referencedColumns: ['bank_code']
          },
          {
            foreignKeyName: 'suppliers_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      timebox_scheduled_boxes: {
        Row: {
          box_id: string
          completed: boolean
          created_at: string
          data: Json | null
          day_of_week: number
          duration: number
          id: string
          start_time: string
          updated_at: string
          user_id: string
          week_id: string
        }
        Insert: {
          box_id: string
          completed?: boolean
          created_at?: string
          data?: Json | null
          day_of_week: number
          duration: number
          id?: string
          start_time: string
          updated_at?: string
          user_id: string
          week_id: string
        }
        Update: {
          box_id?: string
          completed?: boolean
          created_at?: string
          data?: Json | null
          day_of_week?: number
          duration?: number
          id?: string
          start_time?: string
          updated_at?: string
          user_id?: string
          week_id?: string
        }
        Relationships: []
      }
      todo_columns: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'todo_columns_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
            foreignKeyName: 'fk_todos_column_id'
            columns: ['column_id']
            isOneToOne: false
            referencedRelation: 'todo_columns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'todos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      tour_bonus_settings: {
        Row: {
          bonus: number
          bonus_type: number
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: 'tour_bonus_settings_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_bonus_settings_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
        Relationships: []
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
            foreignKeyName: 'tour_departure_data_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
        }
        Insert: {
          airport_code: string
          city: string
          country: string
          created_at?: string | null
          id?: string
        }
        Update: {
          airport_code?: string
          city?: string
          country?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      tour_display_overrides: {
        Row: {
          canvas: Json
          created_at: string
          created_by: string | null
          published: boolean
          published_at: string | null
          published_by: string | null
          published_canvas: Json | null
          theme: string
          tour_id: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          canvas?: Json
          created_at?: string
          created_by?: string | null
          published?: boolean
          published_at?: string | null
          published_by?: string | null
          published_canvas?: Json | null
          theme?: string
          tour_id: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          canvas?: Json
          created_at?: string
          created_by?: string | null
          published?: boolean
          published_at?: string | null
          published_by?: string | null
          published_canvas?: Json | null
          theme?: string
          tour_id?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_display_overrides_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_display_overrides_published_by_fkey'
            columns: ['published_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_display_overrides_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: true
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_display_overrides_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_display_overrides_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_documents: {
        Row: {
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: 'tour_documents_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
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
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: 'tour_itinerary_items_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_itinerary_items_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      tour_meal_settings: {
        Row: {
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: 'tour_meal_settings_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
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
        Relationships: []
      }
      tour_registrations: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          passenger_count: number | null
          sales_ref_code: string | null
          status: string | null
          tour_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          passenger_count?: number | null
          sales_ref_code?: string | null
          status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          passenger_count?: number | null
          sales_ref_code?: string | null
          status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_registrations_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_registrations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
        Relationships: []
      }
      tours: {
        Row: {
          airport_code: string | null
          archive_reason: string | null
          archived: boolean | null
          branch_id: string | null
          brand_id: string | null
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
          controller_id: string | null
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
          fee_cost: number
          hero_image_url: string | null
          id: string
          is_active: boolean
          is_public_listed: boolean
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
          marketing_body: string | null
          marketing_subtitle: string | null
          marketing_title: string | null
          max_participants: number | null
          medical_insurance_coverage: number | null
          modification_reason: string | null
          name: string
          outbound_flight: Json | null
          price: number | null
          profit: number
          published_at: string | null
          published_by: string | null
          quote_cost_structure: Json | null
          return_date: string | null
          return_flight: Json | null
          selling_price_per_person: number | null
          seo_description: string | null
          seo_title: string | null
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
          branch_id?: string | null
          brand_id?: string | null
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
          controller_id?: string | null
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
          fee_cost?: number
          hero_image_url?: string | null
          id: string
          is_active?: boolean
          is_public_listed?: boolean
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
          marketing_body?: string | null
          marketing_subtitle?: string | null
          marketing_title?: string | null
          max_participants?: number | null
          medical_insurance_coverage?: number | null
          modification_reason?: string | null
          name: string
          outbound_flight?: Json | null
          price?: number | null
          profit?: number
          published_at?: string | null
          published_by?: string | null
          quote_cost_structure?: Json | null
          return_date?: string | null
          return_flight?: Json | null
          selling_price_per_person?: number | null
          seo_description?: string | null
          seo_title?: string | null
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
          branch_id?: string | null
          brand_id?: string | null
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
          controller_id?: string | null
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
          fee_cost?: number
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          is_public_listed?: boolean
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
          marketing_body?: string | null
          marketing_subtitle?: string | null
          marketing_title?: string | null
          max_participants?: number | null
          medical_insurance_coverage?: number | null
          modification_reason?: string | null
          name?: string
          outbound_flight?: Json | null
          price?: number | null
          profit?: number
          published_at?: string | null
          published_by?: string | null
          quote_cost_structure?: Json | null
          return_date?: string | null
          return_flight?: Json | null
          selling_price_per_person?: number | null
          seo_description?: string | null
          seo_title?: string | null
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
            foreignKeyName: 'tours_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_closed_by_fkey'
            columns: ['closed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_controller_id_fkey'
            columns: ['controller_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_last_unlocked_by_fkey'
            columns: ['last_unlocked_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_locked_by_fkey'
            columns: ['locked_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_published_by_fkey'
            columns: ['published_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      travel_allowances: {
        Row: {
          allowance_amount: number
          allowance_date: string | null
          allowance_number: string | null
          branch_id: string | null
          created_at: string
          id: string
          invoice_id: string
          issued_at: string | null
          issued_by: string | null
          provider_allowance_id: string | null
          provider_response: Json | null
          reason: string | null
          status: string
          tax_amount: number
          total_amount: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allowance_amount?: number
          allowance_date?: string | null
          allowance_number?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          issued_at?: string | null
          issued_by?: string | null
          provider_allowance_id?: string | null
          provider_response?: Json | null
          reason?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allowance_amount?: number
          allowance_date?: string | null
          allowance_number?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          issued_at?: string | null
          issued_by?: string | null
          provider_allowance_id?: string | null
          provider_response?: Json | null
          reason?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'travel_allowances_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_allowances_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'travel_invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_allowances_issued_by_fkey'
            columns: ['issued_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_allowances_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      travel_invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          item_amount: number
          item_count: number
          item_name: string
          item_price: number
          item_unit: string | null
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          item_amount?: number
          item_count?: number
          item_name: string
          item_price?: number
          item_unit?: string | null
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          item_amount?: number
          item_count?: number
          item_name?: string
          item_price?: number
          item_unit?: string | null
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'travel_invoice_items_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'travel_invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoice_items_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      travel_invoice_paper_tracks: {
        Row: {
          created_at: string
          created_by: string | null
          current_no: number
          end_no: number
          id: string
          is_active: boolean
          note: string | null
          start_no: number
          track_code: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_no?: number
          end_no: number
          id?: string
          is_active?: boolean
          note?: string | null
          start_no: number
          track_code: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_no?: number
          end_no?: number
          id?: string
          is_active?: boolean
          note?: string | null
          start_no?: number
          track_code?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'travel_invoice_paper_tracks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoice_paper_tracks_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      travel_invoice_voids: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          invoice_id: string
          provider_response: Json | null
          void_reason: string
          voided_at: string
          voided_by: string | null
          workspace_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          provider_response?: Json | null
          void_reason: string
          voided_at?: string
          voided_by?: string | null
          workspace_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          provider_response?: Json | null
          void_reason?: string
          voided_at?: string
          voided_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'travel_invoice_voids_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoice_voids_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'travel_invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoice_voids_voided_by_fkey'
            columns: ['voided_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoice_voids_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      travel_invoices: {
        Row: {
          branch_id: string | null
          buyer_address: string | null
          buyer_ban: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          carrier_number: string | null
          carrier_type: string
          created_at: string
          deleted_at: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          issued_at: string | null
          issued_by: string | null
          medium: string
          note: string | null
          paper_serial: number | null
          paper_track: string | null
          provider_invoice_id: string | null
          provider_response: Json | null
          seller_ban: string
          seller_name: string
          source_id: string | null
          source_type: string | null
          status: string
          tax_amount: number
          tax_type: string
          taxable_amount: number
          total_amount: number
          tour_date: string | null
          tour_id: string | null
          tour_name: string | null
          tour_no: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          branch_id?: string | null
          buyer_address?: string | null
          buyer_ban?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          carrier_number?: string | null
          carrier_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          issued_at?: string | null
          issued_by?: string | null
          medium?: string
          note?: string | null
          paper_serial?: number | null
          paper_track?: string | null
          provider_invoice_id?: string | null
          provider_response?: Json | null
          seller_ban: string
          seller_name: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          tax_amount?: number
          tax_type?: string
          taxable_amount?: number
          total_amount?: number
          tour_date?: string | null
          tour_id?: string | null
          tour_name?: string | null
          tour_no?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          branch_id?: string | null
          buyer_address?: string | null
          buyer_ban?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          carrier_number?: string | null
          carrier_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          issued_at?: string | null
          issued_by?: string | null
          medium?: string
          note?: string | null
          paper_serial?: number | null
          paper_track?: string | null
          provider_invoice_id?: string | null
          provider_response?: Json | null
          seller_ban?: string
          seller_name?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          tax_amount?: number
          tax_type?: string
          taxable_amount?: number
          total_amount?: number
          tour_date?: string | null
          tour_id?: string | null
          tour_name?: string | null
          tour_no?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'travel_invoices_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_issued_by_fkey'
            columns: ['issued_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
      workspace_ai_agents: {
        Row: {
          brand_description: string | null
          channel_type: string
          created_at: string
          data_sources: Json
          id: string
          is_active: boolean
          system_prompt_override: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_description?: string | null
          channel_type?: string
          created_at?: string
          data_sources?: Json
          id?: string
          is_active?: boolean
          system_prompt_override?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_description?: string | null
          channel_type?: string
          created_at?: string
          data_sources?: Json
          id?: string
          is_active?: boolean
          system_prompt_override?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_ai_agents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_ai_settings: {
        Row: {
          api_token_encrypted: string | null
          created_at: string
          created_by: string | null
          data_sources: string[]
          is_active: boolean
          last_used_at: string | null
          model: string | null
          prompt_template: string | null
          provider: string | null
          response_mode: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          api_token_encrypted?: string | null
          created_at?: string
          created_by?: string | null
          data_sources?: string[]
          is_active?: boolean
          last_used_at?: string | null
          model?: string | null
          prompt_template?: string | null
          provider?: string | null
          response_mode?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          api_token_encrypted?: string | null
          created_at?: string
          created_by?: string | null
          data_sources?: string[]
          is_active?: boolean
          last_used_at?: string | null
          model?: string | null
          prompt_template?: string | null
          provider?: string | null
          response_mode?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_ai_settings_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_ai_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_ai_settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
            foreignKeyName: 'workspace_billing_records_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_bonus_defaults: {
        Row: {
          bonus: number
          bonus_type: number
          created_at: string | null
          created_by: string | null
          description: string | null
          employee_id: string | null
          id: string
          type: number
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          bonus?: number
          bonus_type?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          type: number
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          bonus?: number
          bonus_type?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          type?: number
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_bonus_defaults_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_bonus_defaults_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_bonus_defaults_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_bonus_defaults_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_code_counters: {
        Row: {
          code_type: string
          next_value: number
          scope: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          code_type: string
          next_value?: number
          scope?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          code_type?: string
          next_value?: number
          scope?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_code_counters_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
        Relationships: []
      }
      workspace_documents: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          file_type: string
          id: string
          name: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_type: string
          id?: string
          name: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_type?: string
          id?: string
          name?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_employee_quota_logs: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_quota: number | null
          old_quota: number | null
          reason: string | null
          workspace_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_quota?: number | null
          old_quota?: number | null
          reason?: string | null
          workspace_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_quota?: number | null
          old_quota?: number | null
          reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_employee_quota_logs_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_employee_quota_logs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_facebook_settings: {
        Row: {
          app_secret_encrypted: string | null
          bot_employee_id: string | null
          bot_greeting: string | null
          created_at: string
          effective_from: string
          effective_to: string | null
          handoff_enabled: boolean
          handoff_target: string | null
          id: string
          is_active: boolean
          page_access_token_encrypted: string
          page_id: string
          page_name: string | null
          updated_at: string
          webhook_verified_at: string | null
          webhook_verify_token: string | null
          workspace_id: string
        }
        Insert: {
          app_secret_encrypted?: string | null
          bot_employee_id?: string | null
          bot_greeting?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          handoff_enabled?: boolean
          handoff_target?: string | null
          id?: string
          is_active?: boolean
          page_access_token_encrypted: string
          page_id: string
          page_name?: string | null
          updated_at?: string
          webhook_verified_at?: string | null
          webhook_verify_token?: string | null
          workspace_id: string
        }
        Update: {
          app_secret_encrypted?: string | null
          bot_employee_id?: string | null
          bot_greeting?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          handoff_enabled?: boolean
          handoff_target?: string | null
          id?: string
          is_active?: boolean
          page_access_token_encrypted?: string
          page_id?: string
          page_name?: string | null
          updated_at?: string
          webhook_verified_at?: string | null
          webhook_verify_token?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_facebook_settings_bot_employee_id_fkey'
            columns: ['bot_employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_facebook_settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
            foreignKeyName: 'workspace_features_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_instagram_settings: {
        Row: {
          app_secret_encrypted: string | null
          bot_employee_id: string | null
          bot_greeting: string | null
          created_at: string
          effective_from: string
          effective_to: string | null
          handoff_enabled: boolean
          handoff_target: string | null
          id: string
          ig_business_account_id: string
          ig_username: string | null
          is_active: boolean
          linked_fb_page_id: string | null
          page_access_token_encrypted: string
          updated_at: string
          webhook_verified_at: string | null
          webhook_verify_token: string | null
          workspace_id: string
        }
        Insert: {
          app_secret_encrypted?: string | null
          bot_employee_id?: string | null
          bot_greeting?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          handoff_enabled?: boolean
          handoff_target?: string | null
          id?: string
          ig_business_account_id: string
          ig_username?: string | null
          is_active?: boolean
          linked_fb_page_id?: string | null
          page_access_token_encrypted: string
          updated_at?: string
          webhook_verified_at?: string | null
          webhook_verify_token?: string | null
          workspace_id: string
        }
        Update: {
          app_secret_encrypted?: string | null
          bot_employee_id?: string | null
          bot_greeting?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          handoff_enabled?: boolean
          handoff_target?: string | null
          id?: string
          ig_business_account_id?: string
          ig_username?: string | null
          is_active?: boolean
          linked_fb_page_id?: string | null
          page_access_token_encrypted?: string
          updated_at?: string
          webhook_verified_at?: string | null
          webhook_verify_token?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_instagram_settings_bot_employee_id_fkey'
            columns: ['bot_employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_instagram_settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_integrations: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          integration_code: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          integration_code: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          integration_code?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_integrations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_integrations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_kb_agency_relations: {
        Row: {
          agency_id: string
          created_at: string | null
          created_by: string | null
          credit_limit_twd: number | null
          id: string
          internal_notes: string | null
          last_collaboration_date: string | null
          last_collaboration_notes: string | null
          our_discount_percent: number | null
          payment_terms: string | null
          primary_contact_email: string | null
          primary_contact_line_id: string | null
          primary_contact_person: string | null
          primary_contact_phone: string | null
          relationship_quality: string | null
          total_collaboration_count: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          created_by?: string | null
          credit_limit_twd?: number | null
          id?: string
          internal_notes?: string | null
          last_collaboration_date?: string | null
          last_collaboration_notes?: string | null
          our_discount_percent?: number | null
          payment_terms?: string | null
          primary_contact_email?: string | null
          primary_contact_line_id?: string | null
          primary_contact_person?: string | null
          primary_contact_phone?: string | null
          relationship_quality?: string | null
          total_collaboration_count?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          created_by?: string | null
          credit_limit_twd?: number | null
          id?: string
          internal_notes?: string | null
          last_collaboration_date?: string | null
          last_collaboration_notes?: string | null
          our_discount_percent?: number | null
          payment_terms?: string | null
          primary_contact_email?: string | null
          primary_contact_line_id?: string | null
          primary_contact_person?: string | null
          primary_contact_phone?: string | null
          relationship_quality?: string | null
          total_collaboration_count?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_kb_agency_relations_agency_id_fkey'
            columns: ['agency_id']
            isOneToOne: false
            referencedRelation: 'kb_agencies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_kb_agency_relations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_kb_agency_relations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_line_settings: {
        Row: {
          bot_employee_id: string | null
          bot_greeting: string | null
          channel_access_token: string | null
          channel_access_token_encrypted: string | null
          channel_id: string
          channel_secret: string | null
          channel_secret_encrypted: string | null
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
          channel_access_token?: string | null
          channel_access_token_encrypted?: string | null
          channel_id: string
          channel_secret?: string | null
          channel_secret_encrypted?: string | null
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
          channel_access_token?: string | null
          channel_access_token_encrypted?: string | null
          channel_id?: string
          channel_secret?: string | null
          channel_secret_encrypted?: string | null
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
            foreignKeyName: 'workspace_line_settings_bot_employee_id_fkey'
            columns: ['bot_employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_line_settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_admin: boolean | null
          is_system_bot: boolean
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
          is_system_bot?: boolean
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
          is_system_bot?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_roles_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_seals: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_seals_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
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
        Relationships: []
      }
      workspace_travel_invoice_configs: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          default_carrier_type: string
          default_seller_ban: string | null
          default_seller_name: string | null
          id: string
          is_active: boolean
          merchant_id: string | null
          provider: string
          sandbox_mode: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          default_carrier_type?: string
          default_seller_ban?: string | null
          default_seller_name?: string | null
          id?: string
          is_active?: boolean
          merchant_id?: string | null
          provider?: string
          sandbox_mode?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          default_carrier_type?: string
          default_seller_ban?: string | null
          default_seller_name?: string | null
          id?: string
          is_active?: boolean
          merchant_id?: string | null
          provider?: string
          sandbox_mode?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_travel_invoice_configs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_worldmove_configs: {
        Row: {
          api_key_encrypted: string | null
          auto_sync_products: boolean
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          partner_code: string | null
          sandbox_mode: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          auto_sync_products?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          partner_code?: string | null
          sandbox_mode?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          auto_sync_products?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          partner_code?: string | null
          sandbox_mode?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_worldmove_configs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspaces: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_branch: string | null
          bank_code: string | null
          bank_name: string | null
          bonus_calculation_order: string
          brand_primary_hex: string | null
          canvas: Json | null
          canvas_published_at: string | null
          canvas_published_by: string | null
          canvas_updated_at: string | null
          canvas_updated_by: string | null
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
          finance_centralized: boolean
          home_country_code: string | null
          icon: string | null
          id: string
          industry: string | null
          invoice_seal_image_url: string | null
          is_active: boolean | null
          is_multi_branch: boolean
          leave_policy: string
          legal_name: string | null
          logo_offset_x: number
          logo_offset_y: number
          logo_scale: number
          logo_url: string | null
          max_employees: number | null
          name: string
          payment_config: Json | null
          pension_system: string
          personal_seal_url: string | null
          phone: string | null
          premium_enabled: boolean | null
          print_accent_hex: string | null
          setup_banner_dismissed_at: string | null
          setup_completed_at: string | null
          setup_state: Json | null
          sub_industry: string | null
          subdomain: string | null
          subscription_period_end: string | null
          subscription_plan: string | null
          subtitle: string | null
          tax_id: string | null
          transfer_fee_mode: string | null
          transfer_fee_overflow_account_id: string | null
          transfer_fee_unified_amount: number | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_name?: string | null
          bonus_calculation_order?: string
          brand_primary_hex?: string | null
          canvas?: Json | null
          canvas_published_at?: string | null
          canvas_published_by?: string | null
          canvas_updated_at?: string | null
          canvas_updated_by?: string | null
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
          finance_centralized?: boolean
          home_country_code?: string | null
          icon?: string | null
          id?: string
          industry?: string | null
          invoice_seal_image_url?: string | null
          is_active?: boolean | null
          is_multi_branch?: boolean
          leave_policy?: string
          legal_name?: string | null
          logo_offset_x?: number
          logo_offset_y?: number
          logo_scale?: number
          logo_url?: string | null
          max_employees?: number | null
          name: string
          payment_config?: Json | null
          pension_system?: string
          personal_seal_url?: string | null
          phone?: string | null
          premium_enabled?: boolean | null
          print_accent_hex?: string | null
          setup_banner_dismissed_at?: string | null
          setup_completed_at?: string | null
          setup_state?: Json | null
          sub_industry?: string | null
          subdomain?: string | null
          subscription_period_end?: string | null
          subscription_plan?: string | null
          subtitle?: string | null
          tax_id?: string | null
          transfer_fee_mode?: string | null
          transfer_fee_overflow_account_id?: string | null
          transfer_fee_unified_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_name?: string | null
          bonus_calculation_order?: string
          brand_primary_hex?: string | null
          canvas?: Json | null
          canvas_published_at?: string | null
          canvas_published_by?: string | null
          canvas_updated_at?: string | null
          canvas_updated_by?: string | null
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
          finance_centralized?: boolean
          home_country_code?: string | null
          icon?: string | null
          id?: string
          industry?: string | null
          invoice_seal_image_url?: string | null
          is_active?: boolean | null
          is_multi_branch?: boolean
          leave_policy?: string
          legal_name?: string | null
          logo_offset_x?: number
          logo_offset_y?: number
          logo_scale?: number
          logo_url?: string | null
          max_employees?: number | null
          name?: string
          payment_config?: Json | null
          pension_system?: string
          personal_seal_url?: string | null
          phone?: string | null
          premium_enabled?: boolean | null
          print_accent_hex?: string | null
          setup_banner_dismissed_at?: string | null
          setup_completed_at?: string | null
          setup_state?: Json | null
          sub_industry?: string | null
          subdomain?: string | null
          subscription_period_end?: string | null
          subscription_plan?: string | null
          subtitle?: string | null
          tax_id?: string | null
          transfer_fee_mode?: string | null
          transfer_fee_overflow_account_id?: string | null
          transfer_fee_unified_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workspaces_bank_code_fkey'
            columns: ['bank_code']
            isOneToOne: false
            referencedRelation: 'ref_banks'
            referencedColumns: ['bank_code']
          },
          {
            foreignKeyName: 'workspaces_canvas_published_by_fkey'
            columns: ['canvas_published_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspaces_canvas_updated_by_fkey'
            columns: ['canvas_updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspaces_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspaces_transfer_fee_overflow_account_id_fkey'
            columns: ['transfer_fee_overflow_account_id']
            isOneToOne: false
            referencedRelation: 'bank_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspaces_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      worldmove_esim_items: {
        Row: {
          activation_code: string | null
          branch_id: string | null
          created_at: string
          data_limit_mb: number | null
          data_used_mb: number
          iccid: string | null
          id: string
          last_usage_synced_at: string | null
          order_id: string
          product_code: string
          product_id: string | null
          product_name: string
          provider_item_id: string | null
          provider_response: Json | null
          qr_code_url: string | null
          sm_dp_address: string | null
          status: string
          unit_price: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          workspace_id: string
        }
        Insert: {
          activation_code?: string | null
          branch_id?: string | null
          created_at?: string
          data_limit_mb?: number | null
          data_used_mb?: number
          iccid?: string | null
          id?: string
          last_usage_synced_at?: string | null
          order_id: string
          product_code: string
          product_id?: string | null
          product_name: string
          provider_item_id?: string | null
          provider_response?: Json | null
          qr_code_url?: string | null
          sm_dp_address?: string | null
          status?: string
          unit_price?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          workspace_id: string
        }
        Update: {
          activation_code?: string | null
          branch_id?: string | null
          created_at?: string
          data_limit_mb?: number | null
          data_used_mb?: number
          iccid?: string | null
          id?: string
          last_usage_synced_at?: string | null
          order_id?: string
          product_code?: string
          product_id?: string | null
          product_name?: string
          provider_item_id?: string | null
          provider_response?: Json | null
          qr_code_url?: string | null
          sm_dp_address?: string | null
          status?: string
          unit_price?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'worldmove_esim_items_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'worldmove_esim_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'worldmove_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'worldmove_esim_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'worldmove_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'worldmove_esim_items_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      worldmove_orders: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          deleted_at: string | null
          discount: number
          id: string
          note: string | null
          provider_response: Json | null
          source_id: string | null
          source_type: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          workspace_id: string
          worldmove_order_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          discount?: number
          id?: string
          note?: string | null
          provider_response?: Json | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          workspace_id: string
          worldmove_order_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          discount?: number
          id?: string
          note?: string | null
          provider_response?: Json | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          workspace_id?: string
          worldmove_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'worldmove_orders_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'worldmove_orders_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'worldmove_orders_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      worldmove_products: {
        Row: {
          cost_price: number | null
          coverage_countries: string[] | null
          coverage_regions: string[] | null
          created_at: string
          currency: string
          data_limit_mb: number | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          product_code: string
          raw_data: Json | null
          roaming_type: string
          selling_price: number | null
          stock_status: string
          synced_at: string
          updated_at: string
          validity_days: number
          workspace_id: string
          worldmove_product_id: string
        }
        Insert: {
          cost_price?: number | null
          coverage_countries?: string[] | null
          coverage_regions?: string[] | null
          created_at?: string
          currency?: string
          data_limit_mb?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_code: string
          raw_data?: Json | null
          roaming_type?: string
          selling_price?: number | null
          stock_status?: string
          synced_at?: string
          updated_at?: string
          validity_days: number
          workspace_id: string
          worldmove_product_id: string
        }
        Update: {
          cost_price?: number | null
          coverage_countries?: string[] | null
          coverage_regions?: string[] | null
          created_at?: string
          currency?: string
          data_limit_mb?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_code?: string
          raw_data?: Json | null
          roaming_type?: string
          selling_price?: number | null
          stock_status?: string
          synced_at?: string
          updated_at?: string
          validity_days?: number
          workspace_id?: string
          worldmove_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'worldmove_products_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_disbursement_full: {
        Row: {
          batch_uuid: string | null
          disbursement_code: string | null
          disbursement_date: string | null
          disbursement_order_id: string | null
          disbursement_status: string | null
          expense_type: string | null
          from_bank_account_id: string | null
          has_cross_bank_fee: boolean | null
          item_amount: number | null
          item_category: string | null
          item_description: string | null
          item_fee: number | null
          link_id: string | null
          link_mode: string | null
          payment_request_code: string | null
          payment_request_id: string | null
          payment_request_item_id: string | null
          payment_request_total: number | null
          snapshot_supplier_bank_code: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_fee: number | null
          tour_id: string | null
          tour_name: string | null
          workspace_id: string | null
        }
        Relationships: []
      }
      v_llm_usage_monthly: {
        Row: {
          call_count: number | null
          fail_count: number | null
          model: string | null
          month: string | null
          provider: string | null
          total_cost_usd: number | null
          total_in_tokens: number | null
          total_out_tokens: number | null
          total_tokens: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'llm_usage_logs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      _recalc_one_batch: { Args: { p_batch_id: string }; Returns: undefined }
      _recalc_one_invoice: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      auto_advance_tour_status: {
        Args: never
        Returns: {
          advanced_to_ongoing: number
          advanced_to_returned: number
        }[]
      }
      auto_open_tour_conversations_with_logging: {
        Args: never
        Returns: undefined
      }
      can_access_branch: {
        Args: { p_cap?: string; row_branch_id: string }
        Returns: boolean
      }
      can_access_branch_finance: {
        Args: { p_cap?: string; row_branch_id: string }
        Returns: boolean
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
      ensure_traveler_profile: {
        Args: {
          p_avatar_url?: string
          p_email?: string
          p_full_name?: string
          p_user_id: string
        }
        Returns: string
      }
      fork_payment_request_for_partial_billing: {
        Args: {
          p_actor_id?: string
          p_item_ids: string[]
          p_request_id: string
        }
        Returns: string
      }
      generate_account_child_code: {
        Args: { p_parent_code: string; p_workspace_id: string }
        Returns: string
      }
      generate_company_payment_request_code: {
        Args: {
          p_expense_type: string
          p_request_date?: string
          p_workspace_id: string
        }
        Returns: string
      }
      generate_confirmation_token: { Args: never; Returns: string }
      generate_disbursement_no: {
        Args: { p_disbursement_date?: string; p_workspace_id: string }
        Returns: string
      }
      generate_employee_number: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      generate_order_number: { Args: { p_tour_id: string }; Returns: string }
      generate_paper_track_serial: {
        Args: { p_track_id: string; p_workspace_id: string }
        Returns: number
      }
      generate_quote_code: {
        Args: { p_quote_type?: string; p_tour_id: string }
        Returns: string
      }
      generate_receipt_no: { Args: { p_tour_id: string }; Returns: string }
      generate_request_no: { Args: { p_tour_code: string }; Returns: string }
      generate_supplier_code: {
        Args: { p_workspace_id: string }
        Returns: string
      }
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
      get_or_create_direct_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_unread_count: { Args: { p_conversation_id: string }; Returns: number }
      get_unread_counts_batch: {
        Args: { p_conversation_ids: string[] }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      has_capability_for_workspace: {
        Args: { _code: string; _workspace_id: string }
        Returns: boolean
      }
      increment_line_usage: {
        Args: {
          p_workspace_id: string
          p_billing_month: string
          p_success: boolean
          p_error_code?: string | null
        }
        Returns: undefined
      }
      increment_points: {
        Args: { customer_id_param: string; points_param: number }
        Returns: undefined
      }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_channel_member: {
        Args: { p_channel_id: string; p_employee_id: string }
        Returns: boolean
      }
      is_channel_owner: {
        Args: { p_channel_id: string; p_employee_id: string }
        Returns: boolean
      }
      is_row_editable: {
        Args: { p_module: string; p_row_id: string }
        Returns: boolean
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      next_payment_request_item_number: {
        Args: { p_request_id: string }
        Returns: string
      }
      next_payment_request_item_numbers: {
        Args: { p_count: number; p_request_id: string }
        Returns: string[]
      }
      recalculate_order_totals: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      refresh_traveler_tour_cache: {
        Args: { p_traveler_id?: string }
        Returns: number
      }
      run_auto_open_now: {
        Args: never
        Returns: {
          executed_at: string
          opened_count: number
        }[]
      }
      scope_branch_match: {
        Args: { p_my_branch: string; p_row_branch: string }
        Returns: boolean
      }
      scope_visible: {
        Args: { p_module: string; p_row_id: string }
        Returns: boolean
      }
      send_quote_confirmation: {
        Args: {
          p_expires_in_days?: number
          p_quote_id: string
          p_staff_id?: string
        }
        Returns: Json
      }
      set_audit_context: {
        Args: { p_actor_id: string; p_reason?: string; p_request_id?: string }
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
      verify_auth_password: {
        Args: { p_password: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      file_action:
        | 'create'
        | 'update'
        | 'rename'
        | 'move'
        | 'star'
        | 'archive'
        | 'delete'
        | 'restore'
        | 'download'
        | 'version'
      file_category:
        | 'contract'
        | 'quote'
        | 'itinerary'
        | 'passport'
        | 'visa'
        | 'ticket'
        | 'voucher'
        | 'invoice'
        | 'insurance'
        | 'photo'
        | 'email_attachment'
        | 'other'
      folder_type: 'root' | 'tour' | 'customer' | 'supplier' | 'template' | 'custom'
      subledger_type: 'customer' | 'supplier' | 'bank' | 'group' | 'employee'
      task_priority: 'low' | 'normal' | 'high' | 'critical'
      task_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
      verification_status: 'verified' | 'unverified' | 'rejected'
      voucher_status: 'draft' | 'posted' | 'reversed' | 'locked'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      file_action: [
        'create',
        'update',
        'rename',
        'move',
        'star',
        'archive',
        'delete',
        'restore',
        'download',
        'version',
      ],
      file_category: [
        'contract',
        'quote',
        'itinerary',
        'passport',
        'visa',
        'ticket',
        'voucher',
        'invoice',
        'insurance',
        'photo',
        'email_attachment',
        'other',
      ],
      folder_type: ['root', 'tour', 'customer', 'supplier', 'template', 'custom'],
      subledger_type: ['customer', 'supplier', 'bank', 'group', 'employee'],
      task_priority: ['low', 'normal', 'high', 'critical'],
      task_status: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      verification_status: ['verified', 'unverified', 'rejected'],
      voucher_status: ['draft', 'posted', 'reversed', 'locked'],
    },
  },
} as const
