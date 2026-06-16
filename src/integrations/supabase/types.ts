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
      action_items: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          approved_by_id: string | null
          asana_assignee_gid: string | null
          asana_assignee_name: string | null
          asana_completed_at: string | null
          asana_due_on: string | null
          asana_last_synced_at: string | null
          asana_modified_at: string | null
          asana_task_gid: string | null
          asana_task_status: string | null
          asana_task_url: string | null
          assignee: string | null
          assignee_id: string | null
          auto_approve_rule: string | null
          auto_approved: boolean
          bar_id: string
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          created_at_manual: string | null
          created_by_id: string | null
          day_id: string | null
          detail: string | null
          due_date: string | null
          effort_level: string | null
          employee_id: string | null
          estimated_minutes: number | null
          facts: string | null
          feedback: Database["public"]["Enums"]["feedback_vote"] | null
          feedback_note: string | null
          id: string
          insight_id: string | null
          insight_summary: string | null
          insight_title: string | null
          is_manual: boolean
          last_synced_at: string | null
          mention_gids: string[]
          outcome_rating: number | null
          pillar: string | null
          priority: string | null
          problem_detail: string | null
          rejected_at: string | null
          rejected_by_id: string | null
          rejection_reason: string | null
          snoozed_until: string | null
          source: string
          source_insight_id: string | null
          status: string
          suggested_assignee: string | null
          synced_to_asana_at: string | null
          title: string
          venue_id: string | null
          week_id: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          approved_by_id?: string | null
          asana_assignee_gid?: string | null
          asana_assignee_name?: string | null
          asana_completed_at?: string | null
          asana_due_on?: string | null
          asana_last_synced_at?: string | null
          asana_modified_at?: string | null
          asana_task_gid?: string | null
          asana_task_status?: string | null
          asana_task_url?: string | null
          assignee?: string | null
          assignee_id?: string | null
          auto_approve_rule?: string | null
          auto_approved?: boolean
          bar_id: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_at_manual?: string | null
          created_by_id?: string | null
          day_id?: string | null
          detail?: string | null
          due_date?: string | null
          effort_level?: string | null
          employee_id?: string | null
          estimated_minutes?: number | null
          facts?: string | null
          feedback?: Database["public"]["Enums"]["feedback_vote"] | null
          feedback_note?: string | null
          id?: string
          insight_id?: string | null
          insight_summary?: string | null
          insight_title?: string | null
          is_manual?: boolean
          last_synced_at?: string | null
          mention_gids?: string[]
          outcome_rating?: number | null
          pillar?: string | null
          priority?: string | null
          problem_detail?: string | null
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          snoozed_until?: string | null
          source?: string
          source_insight_id?: string | null
          status?: string
          suggested_assignee?: string | null
          synced_to_asana_at?: string | null
          title: string
          venue_id?: string | null
          week_id?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          approved_by_id?: string | null
          asana_assignee_gid?: string | null
          asana_assignee_name?: string | null
          asana_completed_at?: string | null
          asana_due_on?: string | null
          asana_last_synced_at?: string | null
          asana_modified_at?: string | null
          asana_task_gid?: string | null
          asana_task_status?: string | null
          asana_task_url?: string | null
          assignee?: string | null
          assignee_id?: string | null
          auto_approve_rule?: string | null
          auto_approved?: boolean
          bar_id?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_at_manual?: string | null
          created_by_id?: string | null
          day_id?: string | null
          detail?: string | null
          due_date?: string | null
          effort_level?: string | null
          employee_id?: string | null
          estimated_minutes?: number | null
          facts?: string | null
          feedback?: Database["public"]["Enums"]["feedback_vote"] | null
          feedback_note?: string | null
          id?: string
          insight_id?: string | null
          insight_summary?: string | null
          insight_title?: string | null
          is_manual?: boolean
          last_synced_at?: string | null
          mention_gids?: string[]
          outcome_rating?: number | null
          pillar?: string | null
          priority?: string | null
          problem_detail?: string | null
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          snoozed_until?: string | null
          source?: string
          source_insight_id?: string | null
          status?: string
          suggested_assignee?: string | null
          synced_to_asana_at?: string | null
          title?: string
          venue_id?: string | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_items_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_rejected_by_id_fkey"
            columns: ["rejected_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "action_items_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_programs: {
        Row: {
          commission_detail: string | null
          commission_type: string | null
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          name: string
          niche: string | null
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          commission_detail?: string | null
          commission_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          name: string
          niche?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          commission_detail?: string | null
          commission_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          name?: string
          niche?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_call_log: {
        Row: {
          cost_usd: number | null
          created_at: string
          error_message: string | null
          error_state: string
          function_name: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model_id: string
          output_tokens: number | null
          prompt_version: string
          provider: string
          venue_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          error_state?: string
          function_name: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_id: string
          output_tokens?: number | null
          prompt_version?: string
          provider: string
          venue_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          error_state?: string
          function_name?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_id?: string
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          venue_id?: string | null
        }
        Relationships: []
      }
      ai_search_queries: {
        Row: {
          consecutive_failures: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_checked_at: string | null
          priority: string
          query: string
          source_keyword_id: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          priority?: string
          query: string
          source_keyword_id?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          priority?: string
          query?: string
          source_keyword_id?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_search_queries_source_keyword_id_fkey"
            columns: ["source_keyword_id"]
            isOneToOne: false
            referencedRelation: "map_pack_keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_search_queries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_search_run_log: {
        Row: {
          errors: Json
          finished_at: string | null
          id: string
          mentions_found: number
          queries_tested: number
          started_at: string
          trigger_source: string
          venues_processed: number
        }
        Insert: {
          errors?: Json
          finished_at?: string | null
          id?: string
          mentions_found?: number
          queries_tested?: number
          started_at?: string
          trigger_source?: string
          venues_processed?: number
        }
        Update: {
          errors?: Json
          finished_at?: string | null
          id?: string
          mentions_found?: number
          queries_tested?: number
          started_at?: string
          trigger_source?: string
          venues_processed?: number
        }
        Relationships: []
      }
      ai_search_snapshots: {
        Row: {
          checked_at: string
          detection_method: string | null
          engine: string
          id: string
          mentioned: boolean | null
          model: string | null
          position: number | null
          query: string
          query_error: string | null
          query_id: string | null
          response_excerpt: string | null
          top_competitors: Json
          venue_id: string
        }
        Insert: {
          checked_at?: string
          detection_method?: string | null
          engine: string
          id?: string
          mentioned?: boolean | null
          model?: string | null
          position?: number | null
          query: string
          query_error?: string | null
          query_id?: string | null
          response_excerpt?: string | null
          top_competitors?: Json
          venue_id: string
        }
        Update: {
          checked_at?: string
          detection_method?: string | null
          engine?: string
          id?: string
          mentioned?: boolean | null
          model?: string | null
          position?: number | null
          query?: string
          query_error?: string | null
          query_id?: string | null
          response_excerpt?: string | null
          top_competitors?: Json
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_search_snapshots_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_search_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_search_snapshots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_search_trigger_log: {
        Row: {
          last_triggered_at: string
          triggered_by: string | null
          venue_id: string
        }
        Insert: {
          last_triggered_at?: string
          triggered_by?: string | null
          venue_id: string
        }
        Update: {
          last_triggered_at?: string
          triggered_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_search_trigger_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asana_gm_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at_asana: string | null
          due_on: string | null
          gm_asana_gid: string
          id: string
          modified_at_asana: string | null
          name: string | null
          notes: string | null
          permalink_url: string | null
          synced_at: string
          task_gid: string
          venue_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at_asana?: string | null
          due_on?: string | null
          gm_asana_gid: string
          id?: string
          modified_at_asana?: string | null
          name?: string | null
          notes?: string | null
          permalink_url?: string | null
          synced_at?: string
          task_gid: string
          venue_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at_asana?: string | null
          due_on?: string | null
          gm_asana_gid?: string
          id?: string
          modified_at_asana?: string | null
          name?: string | null
          notes?: string | null
          permalink_url?: string | null
          synced_at?: string
          task_gid?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asana_gm_tasks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      asana_sync_cursor: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          last_comment_gid: string | null
          last_synced_at: string | null
          log_type: string
          task_gid: string | null
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          last_comment_gid?: string | null
          last_synced_at?: string | null
          log_type: string
          task_gid?: string | null
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          last_comment_gid?: string | null
          last_synced_at?: string | null
          log_type?: string
          task_gid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asana_sync_cursor_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_approve_log: {
        Row: {
          action_item_id: string
          action_title: string
          bar_id: string
          created_at: string
          id: string
          pillar: string
          revoked_at: string | null
          rule_triggered: string
          status: string
        }
        Insert: {
          action_item_id: string
          action_title: string
          bar_id: string
          created_at?: string
          id?: string
          pillar: string
          revoked_at?: string | null
          rule_triggered: string
          status?: string
        }
        Update: {
          action_item_id?: string
          action_title?: string
          bar_id?: string
          created_at?: string
          id?: string
          pillar?: string
          revoked_at?: string | null
          rule_triggered?: string
          status?: string
        }
        Relationships: []
      }
      bar_targets: {
        Row: {
          bar_id: string
          comps_pct_target: number | null
          id: string
          labor_pct_target: number | null
          splh_target: number | null
          tips_pct_target: number | null
          updated_at: string | null
          updated_by: string | null
          venue_id: string | null
          voids_pct_target: number | null
          weekly_revenue_target: number | null
        }
        Insert: {
          bar_id: string
          comps_pct_target?: number | null
          id?: string
          labor_pct_target?: number | null
          splh_target?: number | null
          tips_pct_target?: number | null
          updated_at?: string | null
          updated_by?: string | null
          venue_id?: string | null
          voids_pct_target?: number | null
          weekly_revenue_target?: number | null
        }
        Update: {
          bar_id?: string
          comps_pct_target?: number | null
          id?: string
          labor_pct_target?: number | null
          splh_target?: number | null
          tips_pct_target?: number | null
          updated_at?: string | null
          updated_by?: string | null
          venue_id?: string | null
          voids_pct_target?: number | null
          weekly_revenue_target?: number | null
        }
        Relationships: []
      }
      brand_kit_assets: {
        Row: {
          asset_type: string | null
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          kit_id: string
          mime_type: string | null
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          asset_type?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          kit_id: string
          mime_type?: string | null
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          asset_type?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          kit_id?: string
          mime_type?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_assets_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_colors: {
        Row: {
          created_at: string
          hex: string
          id: string
          kit_id: string
          label: string | null
          role: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hex: string
          id?: string
          kit_id: string
          label?: string | null
          role?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hex?: string
          id?: string
          kit_id?: string
          label?: string | null
          role?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_colors_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_hashtags: {
        Row: {
          created_at: string
          group_label: string | null
          id: string
          kit_id: string
          sort_order: number
          tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_label?: string | null
          id?: string
          kit_id: string
          sort_order?: number
          tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_label?: string | null
          id?: string
          kit_id?: string
          sort_order?: number
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_hashtags_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_links: {
        Row: {
          category: string | null
          created_at: string
          id: string
          kit_id: string
          label: string | null
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          kit_id: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          kit_id?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_links_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_taglines: {
        Row: {
          context: string | null
          created_at: string
          id: string
          kit_id: string
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          kit_id: string
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          kit_id?: string
          sort_order?: number
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_taglines_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          archive_reason: string | null
          archived: boolean
          archived_at: string | null
          bio_long: string | null
          bio_short: string | null
          brand_voice: string | null
          created_at: string
          created_by: string | null
          do_notes: string | null
          dont_notes: string | null
          id: string
          primary_font: string | null
          project_id: string
          secondary_font: string | null
          updated_at: string
        }
        Insert: {
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          bio_long?: string | null
          bio_short?: string | null
          brand_voice?: string | null
          created_at?: string
          created_by?: string | null
          do_notes?: string | null
          dont_notes?: string | null
          id?: string
          primary_font?: string | null
          project_id: string
          secondary_font?: string | null
          updated_at?: string
        }
        Update: {
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          bio_long?: string | null
          bio_short?: string | null
          brand_voice?: string | null
          created_at?: string
          created_by?: string | null
          do_notes?: string | null
          dont_notes?: string | null
          id?: string
          primary_font?: string | null
          project_id?: string
          secondary_font?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_items: {
        Row: {
          ai_reasoning: string | null
          ai_suggestion_status: Database["public"]["Enums"]["capture_ai_status"]
          created_at: string
          created_by: string
          id: string
          raw_text: string
          routed_at: string | null
          routed_project_id: string | null
          routed_type: Database["public"]["Enums"]["capture_routed_type"] | null
          status: Database["public"]["Enums"]["capture_item_status"]
          suggested_project_id: string | null
          suggested_type:
            | Database["public"]["Enums"]["capture_routed_type"]
            | null
          updated_at: string
        }
        Insert: {
          ai_reasoning?: string | null
          ai_suggestion_status?: Database["public"]["Enums"]["capture_ai_status"]
          created_at?: string
          created_by?: string
          id?: string
          raw_text: string
          routed_at?: string | null
          routed_project_id?: string | null
          routed_type?:
            | Database["public"]["Enums"]["capture_routed_type"]
            | null
          status?: Database["public"]["Enums"]["capture_item_status"]
          suggested_project_id?: string | null
          suggested_type?:
            | Database["public"]["Enums"]["capture_routed_type"]
            | null
          updated_at?: string
        }
        Update: {
          ai_reasoning?: string | null
          ai_suggestion_status?: Database["public"]["Enums"]["capture_ai_status"]
          created_at?: string
          created_by?: string
          id?: string
          raw_text?: string
          routed_at?: string | null
          routed_project_id?: string | null
          routed_type?:
            | Database["public"]["Enums"]["capture_routed_type"]
            | null
          status?: Database["public"]["Enums"]["capture_item_status"]
          suggested_project_id?: string | null
          suggested_type?:
            | Database["public"]["Enums"]["capture_routed_type"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_items_routed_project_id_fkey"
            columns: ["routed_project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_items_suggested_project_id_fkey"
            columns: ["suggested_project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_product_channels: {
        Row: {
          created_at: string
          product_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_product_channels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "channel_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_product_channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_products: {
        Row: {
          created_at: string
          created_by: string | null
          funnel_stage: string | null
          id: string
          lead_magnet: string | null
          monthly_sales: number | null
          name: string
          notes: string | null
          price: number | null
          sales_page_url: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          funnel_stage?: string | null
          id?: string
          lead_magnet?: string | null
          monthly_sales?: number | null
          name: string
          notes?: string | null
          price?: number | null
          sales_page_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          funnel_stage?: string | null
          id?: string
          lead_magnet?: string | null
          monthly_sales?: number | null
          name?: string
          notes?: string | null
          price?: number | null
          sales_page_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      channel_revenue: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          period_month: string
          product_id: string | null
          project_id: string
          revenue_type: string
          source_note: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          period_month: string
          product_id?: string | null
          project_id: string
          revenue_type: string
          source_note?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          period_month?: string
          product_id?: string | null
          project_id?: string
          revenue_type?: string
          source_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_revenue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "channel_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_revenue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          bar_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          topic: string | null
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          bar_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          topic?: string | null
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          bar_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          topic?: string | null
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          is_edited: boolean
          mentions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          mentions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          mentions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_automation_runs: {
        Row: {
          content_item_id: string
          created_at: string
          error: string | null
          id: string
          project_id: string
          rule_key: string
          status: string
          task_ids: string[]
          tasks_created: number
          triggered_by: string | null
          undone_at: string | null
        }
        Insert: {
          content_item_id: string
          created_at?: string
          error?: string | null
          id?: string
          project_id: string
          rule_key?: string
          status?: string
          task_ids?: string[]
          tasks_created?: number
          triggered_by?: string | null
          undone_at?: string | null
        }
        Update: {
          content_item_id?: string
          created_at?: string
          error?: string | null
          id?: string
          project_id?: string
          rule_key?: string
          status?: string
          task_ids?: string[]
          tasks_created?: number
          triggered_by?: string | null
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_automation_runs_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_automation_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          affiliate_link: string | null
          automation_fired_at: string | null
          created_at: string
          created_by: string | null
          cta: string | null
          due_date: string | null
          format: string | null
          hook: string | null
          id: string
          is_monetized: boolean
          is_repurposed: boolean
          performance: Json | null
          primary_keyword: string | null
          product_id: string | null
          project_id: string
          published_at: string | null
          scheduled_at: string | null
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_link?: string | null
          automation_fired_at?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          due_date?: string | null
          format?: string | null
          hook?: string | null
          id?: string
          is_monetized?: boolean
          is_repurposed?: boolean
          performance?: Json | null
          primary_keyword?: string | null
          product_id?: string | null
          project_id: string
          published_at?: string | null
          scheduled_at?: string | null
          stage?: string
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_link?: string | null
          automation_fired_at?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          due_date?: string | null
          format?: string | null
          hook?: string | null
          id?: string
          is_monetized?: boolean
          is_repurposed?: boolean
          performance?: Json | null
          primary_keyword?: string | null
          product_id?: string | null
          project_id?: string
          published_at?: string | null
          scheduled_at?: string | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "channel_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      context_calendar_entries: {
        Row: {
          category: string
          created_at: string
          fixed_date: string | null
          historical_relevance_score: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          recurrence_rule: string | null
          relevance_categories: string[]
          slug: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          fixed_date?: string | null
          historical_relevance_score?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          recurrence_rule?: string | null
          relevance_categories?: string[]
          slug: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          fixed_date?: string | null
          historical_relevance_score?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          recurrence_rule?: string | null
          relevance_categories?: string[]
          slug?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "context_calendar_entries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      context_items: {
        Row: {
          created_at: string
          event_date: string
          id: string
          payload: Json
          relevance_rationale: string | null
          relevance_score: number | null
          source_ref: string
          source_type: string
          updated_at: string
          valid_until: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          payload?: Json
          relevance_rationale?: string | null
          relevance_score?: number | null
          source_ref: string
          source_type: string
          updated_at?: string
          valid_until?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          payload?: Json
          relevance_rationale?: string | null
          relevance_score?: number | null
          source_ref?: string
          source_type?: string
          updated_at?: string
          valid_until?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      context_source_runs: {
        Row: {
          completed_at: string | null
          error_text: string | null
          id: string
          items_fetched: number
          source_type: string
          started_at: string
          status: string
          venue_id: string | null
        }
        Insert: {
          completed_at?: string | null
          error_text?: string | null
          id?: string
          items_fetched?: number
          source_type: string
          started_at?: string
          status?: string
          venue_id?: string | null
        }
        Update: {
          completed_at?: string | null
          error_text?: string | null
          id?: string
          items_fetched?: number
          source_type?: string
          started_at?: string
          status?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "context_source_runs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          archive_reason: string | null
          archived: boolean
          archived_at: string | null
          created_at: string
          created_by: string
          id: string
          industry: string | null
          linked_project_id: string | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["crm_company_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string | null
          linked_project_id?: string | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["crm_company_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string | null
          linked_project_id?: string | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["crm_company_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          archive_reason: string | null
          archived: boolean
          archived_at: string | null
          company_id: string | null
          created_at: string
          created_by: string
          email: string | null
          first_name: string | null
          id: string
          is_primary: boolean
          last_name: string | null
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          archive_reason: string | null
          archived: boolean
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string
          currency: string
          expected_close: string | null
          id: string
          lost_at: string | null
          notes: string | null
          sort_order: number
          stage: Database["public"]["Enums"]["crm_deal_stage"]
          title: string
          updated_at: string
          value: number | null
          won_at: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string
          currency?: string
          expected_close?: string | null
          id?: string
          lost_at?: string | null
          notes?: string | null
          sort_order?: number
          stage?: Database["public"]["Enums"]["crm_deal_stage"]
          title: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          expected_close?: string | null
          id?: string
          lost_at?: string | null
          notes?: string | null
          sort_order?: number
          stage?: Database["public"]["Enums"]["crm_deal_stage"]
          title?: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          follow_up_date: string | null
          id: string
          occurred_at: string
          summary: string | null
          type: Database["public"]["Enums"]["crm_interaction_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          follow_up_date?: string | null
          id?: string
          occurred_at?: string
          summary?: string | null
          type?: Database["public"]["Enums"]["crm_interaction_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          follow_up_date?: string | null
          id?: string
          occurred_at?: string
          summary?: string | null
          type?: Database["public"]["Enums"]["crm_interaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          airtable_synced: boolean | null
          avg_check: number | null
          avg_kds_time_mins: number | null
          avg_turn_time_mins: number | null
          bar_id: string
          bev_sales: number | null
          boh_hours: number | null
          comps: number | null
          comps_amount: number | null
          comps_pct: number | null
          date: string
          day_id: string | null
          discounts: number | null
          discounts_amount: number | null
          discounts_pct: number | null
          foh_hours: number | null
          food_sales: number | null
          gross_sales: number | null
          guests: number | null
          id: string
          kds_over_25_pct: number | null
          kds_over_25_tickets: number | null
          kds_total_tickets: number | null
          labor_cost: number | null
          labor_cost_total: number | null
          labor_hours: number | null
          labor_hours_total: number | null
          labor_pct: number | null
          labor_pct_actual: number | null
          last_synced_at: string | null
          net_sales: number | null
          orders_count: number | null
          overtime_hours: number | null
          overtime_pct: number | null
          refund_pct: number | null
          refunds: number | null
          refunds_amount: number | null
          refunds_count: number | null
          schedule_variance_hours: number | null
          scheduled_cost: number | null
          scheduled_hours: number | null
          source: string | null
          source_import_run_id: string | null
          source_toast_report_date: string | null
          splh: number | null
          synced_at: string | null
          ticket_time_avg_minutes: number | null
          ticket_time_over_20_pct: number | null
          tickets_count: number | null
          tip_data_missing: boolean
          tip_pct: number | null
          tips: number | null
          tips_amount: number | null
          transactions: number | null
          unpaid_amount: number | null
          unpaid_checks_count: number | null
          venue_id: string | null
          void_pct: number | null
          voids: number | null
          voids_amount: number | null
          voids_count: number | null
          worked_hours: number | null
        }
        Insert: {
          airtable_synced?: boolean | null
          avg_check?: number | null
          avg_kds_time_mins?: number | null
          avg_turn_time_mins?: number | null
          bar_id: string
          bev_sales?: number | null
          boh_hours?: number | null
          comps?: number | null
          comps_amount?: number | null
          comps_pct?: number | null
          date: string
          day_id?: string | null
          discounts?: number | null
          discounts_amount?: number | null
          discounts_pct?: number | null
          foh_hours?: number | null
          food_sales?: number | null
          gross_sales?: number | null
          guests?: number | null
          id?: string
          kds_over_25_pct?: number | null
          kds_over_25_tickets?: number | null
          kds_total_tickets?: number | null
          labor_cost?: number | null
          labor_cost_total?: number | null
          labor_hours?: number | null
          labor_hours_total?: number | null
          labor_pct?: number | null
          labor_pct_actual?: number | null
          last_synced_at?: string | null
          net_sales?: number | null
          orders_count?: number | null
          overtime_hours?: number | null
          overtime_pct?: number | null
          refund_pct?: number | null
          refunds?: number | null
          refunds_amount?: number | null
          refunds_count?: number | null
          schedule_variance_hours?: number | null
          scheduled_cost?: number | null
          scheduled_hours?: number | null
          source?: string | null
          source_import_run_id?: string | null
          source_toast_report_date?: string | null
          splh?: number | null
          synced_at?: string | null
          ticket_time_avg_minutes?: number | null
          ticket_time_over_20_pct?: number | null
          tickets_count?: number | null
          tip_data_missing?: boolean
          tip_pct?: number | null
          tips?: number | null
          tips_amount?: number | null
          transactions?: number | null
          unpaid_amount?: number | null
          unpaid_checks_count?: number | null
          venue_id?: string | null
          void_pct?: number | null
          voids?: number | null
          voids_amount?: number | null
          voids_count?: number | null
          worked_hours?: number | null
        }
        Update: {
          airtable_synced?: boolean | null
          avg_check?: number | null
          avg_kds_time_mins?: number | null
          avg_turn_time_mins?: number | null
          bar_id?: string
          bev_sales?: number | null
          boh_hours?: number | null
          comps?: number | null
          comps_amount?: number | null
          comps_pct?: number | null
          date?: string
          day_id?: string | null
          discounts?: number | null
          discounts_amount?: number | null
          discounts_pct?: number | null
          foh_hours?: number | null
          food_sales?: number | null
          gross_sales?: number | null
          guests?: number | null
          id?: string
          kds_over_25_pct?: number | null
          kds_over_25_tickets?: number | null
          kds_total_tickets?: number | null
          labor_cost?: number | null
          labor_cost_total?: number | null
          labor_hours?: number | null
          labor_hours_total?: number | null
          labor_pct?: number | null
          labor_pct_actual?: number | null
          last_synced_at?: string | null
          net_sales?: number | null
          orders_count?: number | null
          overtime_hours?: number | null
          overtime_pct?: number | null
          refund_pct?: number | null
          refunds?: number | null
          refunds_amount?: number | null
          refunds_count?: number | null
          schedule_variance_hours?: number | null
          scheduled_cost?: number | null
          scheduled_hours?: number | null
          source?: string | null
          source_import_run_id?: string | null
          source_toast_report_date?: string | null
          splh?: number | null
          synced_at?: string | null
          ticket_time_avg_minutes?: number | null
          ticket_time_over_20_pct?: number | null
          tickets_count?: number | null
          tip_data_missing?: boolean
          tip_pct?: number | null
          tips?: number | null
          tips_amount?: number | null
          transactions?: number | null
          unpaid_amount?: number | null
          unpaid_checks_count?: number | null
          venue_id?: string | null
          void_pct?: number | null
          voids?: number | null
          voids_amount?: number | null
          voids_count?: number | null
          worked_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: true
            referencedRelation: "days"
            referencedColumns: ["id"]
          },
        ]
      }
      days: {
        Row: {
          bar_id: string
          date: string
          day_id: string
          day_of_week: number
          holiday_name: string | null
          id: string
          is_holiday: boolean | null
          week_id: string
        }
        Insert: {
          bar_id: string
          date: string
          day_id: string
          day_of_week: number
          holiday_name?: string | null
          id?: string
          is_holiday?: boolean | null
          week_id: string
        }
        Update: {
          bar_id?: string
          date?: string
          day_id?: string
          day_of_week?: number
          holiday_name?: string | null
          id?: string
          is_holiday?: boolean | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "days_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_acknowledgements: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          assigned_at: string
          assigned_by: string
          document_id: string
          due_date: string | null
          employee_id: string
          id: string
          notes: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          assigned_at?: string
          assigned_by: string
          document_id: string
          due_date?: string | null
          employee_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          assigned_at?: string
          assigned_by?: string
          document_id?: string
          due_date?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_acknowledgements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_acknowledgements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drink_mix_items: {
        Row: {
          comp_pour_cost_pct: number | null
          comp_price: number | null
          comp_qty: number | null
          comp_theoretical_profit: number | null
          comp_total_profit: number | null
          cost: number | null
          id: string
          period_end: string
          period_start: string
          plu: string
          qty_sold: number | null
          raw_header_hash: string | null
          recipe_name: string | null
          regular_pour_cost_pct: number | null
          regular_price: number | null
          regular_theoretical_profit: number | null
          regular_total_profit: number | null
          sales_2_pour_cost_pct: number | null
          sales_2_price: number | null
          sales_2_qty: number | null
          sales_2_theoretical_profit: number | null
          sales_2_total_profit: number | null
          source_file: string | null
          source_report_type: string
          spill_pour_cost_pct: number | null
          spill_price: number | null
          spill_qty: number | null
          spill_theoretical_profit: number | null
          spill_total_profit: number | null
          tax_discount_pct: number | null
          uploaded_at: string
          uploaded_by: string | null
          venue_id: string
        }
        Insert: {
          comp_pour_cost_pct?: number | null
          comp_price?: number | null
          comp_qty?: number | null
          comp_theoretical_profit?: number | null
          comp_total_profit?: number | null
          cost?: number | null
          id?: string
          period_end: string
          period_start: string
          plu: string
          qty_sold?: number | null
          raw_header_hash?: string | null
          recipe_name?: string | null
          regular_pour_cost_pct?: number | null
          regular_price?: number | null
          regular_theoretical_profit?: number | null
          regular_total_profit?: number | null
          sales_2_pour_cost_pct?: number | null
          sales_2_price?: number | null
          sales_2_qty?: number | null
          sales_2_theoretical_profit?: number | null
          sales_2_total_profit?: number | null
          source_file?: string | null
          source_report_type?: string
          spill_pour_cost_pct?: number | null
          spill_price?: number | null
          spill_qty?: number | null
          spill_theoretical_profit?: number | null
          spill_total_profit?: number | null
          tax_discount_pct?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
          venue_id: string
        }
        Update: {
          comp_pour_cost_pct?: number | null
          comp_price?: number | null
          comp_qty?: number | null
          comp_theoretical_profit?: number | null
          comp_total_profit?: number | null
          cost?: number | null
          id?: string
          period_end?: string
          period_start?: string
          plu?: string
          qty_sold?: number | null
          raw_header_hash?: string | null
          recipe_name?: string | null
          regular_pour_cost_pct?: number | null
          regular_price?: number | null
          regular_theoretical_profit?: number | null
          regular_total_profit?: number | null
          sales_2_pour_cost_pct?: number | null
          sales_2_price?: number | null
          sales_2_qty?: number | null
          sales_2_theoretical_profit?: number | null
          sales_2_total_profit?: number | null
          source_file?: string | null
          source_report_type?: string
          spill_pour_cost_pct?: number | null
          spill_price?: number | null
          spill_qty?: number | null
          spill_theoretical_profit?: number | null
          spill_total_profit?: number | null
          tax_discount_pct?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drink_mix_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          cert_document_url: string | null
          cert_name: string | null
          cert_number: string | null
          cert_type: string | null
          created_at: string
          employee_id: string
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          renewal_reminder_date: string | null
          renewal_reminder_sent: boolean | null
          verified: boolean | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          cert_document_url?: string | null
          cert_name?: string | null
          cert_number?: string | null
          cert_type?: string | null
          created_at?: string
          employee_id: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          renewal_reminder_date?: string | null
          renewal_reminder_sent?: boolean | null
          verified?: boolean | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          cert_document_url?: string | null
          cert_name?: string | null
          cert_number?: string | null
          cert_type?: string | null
          created_at?: string
          employee_id?: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          renewal_reminder_date?: string | null
          renewal_reminder_sent?: boolean | null
          verified?: boolean | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_incidents: {
        Row: {
          action_by: string | null
          action_taken: string | null
          action_type: Database["public"]["Enums"]["action_taken_type"] | null
          ai_action_recommendation: string | null
          ai_incident_summary: string | null
          ai_sentiment_analysis: string | null
          ai_severity_recommendation: string | null
          created_at: string
          description: string
          employee_id: string
          follow_up_date: string | null
          follow_up_needed: boolean | null
          guests_involved: boolean | null
          id: string
          incident_date: string
          incident_time: string | null
          incident_type: Database["public"]["Enums"]["incident_type"]
          outcome: string | null
          related_incident_id: string | null
          reported_by: string
          resolved: boolean | null
          severity: Database["public"]["Enums"]["severity_level"]
          updated_at: string
          venue_id: string
          week_id: string | null
          witnesses: string | null
        }
        Insert: {
          action_by?: string | null
          action_taken?: string | null
          action_type?: Database["public"]["Enums"]["action_taken_type"] | null
          ai_action_recommendation?: string | null
          ai_incident_summary?: string | null
          ai_sentiment_analysis?: string | null
          ai_severity_recommendation?: string | null
          created_at?: string
          description: string
          employee_id: string
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          guests_involved?: boolean | null
          id?: string
          incident_date: string
          incident_time?: string | null
          incident_type: Database["public"]["Enums"]["incident_type"]
          outcome?: string | null
          related_incident_id?: string | null
          reported_by: string
          resolved?: boolean | null
          severity: Database["public"]["Enums"]["severity_level"]
          updated_at?: string
          venue_id: string
          week_id?: string | null
          witnesses?: string | null
        }
        Update: {
          action_by?: string | null
          action_taken?: string | null
          action_type?: Database["public"]["Enums"]["action_taken_type"] | null
          ai_action_recommendation?: string | null
          ai_incident_summary?: string | null
          ai_sentiment_analysis?: string | null
          ai_severity_recommendation?: string | null
          created_at?: string
          description?: string
          employee_id?: string
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          guests_involved?: boolean | null
          id?: string
          incident_date?: string
          incident_time?: string | null
          incident_type?: Database["public"]["Enums"]["incident_type"]
          outcome?: string | null
          related_incident_id?: string | null
          reported_by?: string
          resolved?: boolean | null
          severity?: Database["public"]["Enums"]["severity_level"]
          updated_at?: string
          venue_id?: string
          week_id?: string | null
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_incidents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_incidents_related_incident_id_fkey"
            columns: ["related_incident_id"]
            isOneToOne: false
            referencedRelation: "employee_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_incidents_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_incidents_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "employee_incidents_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_performance_briefs: {
        Row: {
          bar_id: string
          generated_at: string
          is_quiet: boolean
          long_brief: string | null
          short_brief: string | null
          week_id: string
        }
        Insert: {
          bar_id: string
          generated_at?: string
          is_quiet?: boolean
          long_brief?: string | null
          short_brief?: string | null
          week_id: string
        }
        Update: {
          bar_id?: string
          generated_at?: string
          is_quiet?: boolean
          long_brief?: string | null
          short_brief?: string | null
          week_id?: string
        }
        Relationships: []
      }
      employee_profiles: {
        Row: {
          additional_venues: string[] | null
          can_approve_comps: boolean
          can_approve_voids: boolean
          created_at: string
          email: string | null
          employee_name: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          exempt_reason: string | null
          first_name: string | null
          hire_date: string | null
          hourly_wage: number | null
          id: string
          is_active: boolean
          is_exempt: boolean
          is_manager: boolean
          is_vendor_account: boolean
          last_incident_date: string | null
          last_name: string | null
          last_shift_date: string | null
          last_synced_at: string | null
          match_method: string | null
          match_reviewed_at: string | null
          match_reviewed_by: string | null
          match_status: string | null
          notes: string | null
          phone: string | null
          preferred_name: string | null
          rehire_eligible: boolean | null
          role_primary: string | null
          role_secondary: string | null
          seven_shifts_department_ids: number[] | null
          seven_shifts_location_ids: number[] | null
          seven_shifts_role_ids: number[] | null
          sevenshifts_employee_id: string | null
          sevenshifts_punch_id: string | null
          sevenshifts_user_id_int: number | null
          source_systems: string[] | null
          termination_date: string | null
          termination_notes: string | null
          termination_reason:
            | Database["public"]["Enums"]["termination_reason"]
            | null
          toast_employee_guid: string | null
          toast_employee_id: string | null
          toast_external_employee_id: string | null
          toast_job_references: Json | null
          updated_at: string
          user_id: string | null
          venue_id: string
        }
        Insert: {
          additional_venues?: string[] | null
          can_approve_comps?: boolean
          can_approve_voids?: boolean
          created_at?: string
          email?: string | null
          employee_name: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          exempt_reason?: string | null
          first_name?: string | null
          hire_date?: string | null
          hourly_wage?: number | null
          id?: string
          is_active?: boolean
          is_exempt?: boolean
          is_manager?: boolean
          is_vendor_account?: boolean
          last_incident_date?: string | null
          last_name?: string | null
          last_shift_date?: string | null
          last_synced_at?: string | null
          match_method?: string | null
          match_reviewed_at?: string | null
          match_reviewed_by?: string | null
          match_status?: string | null
          notes?: string | null
          phone?: string | null
          preferred_name?: string | null
          rehire_eligible?: boolean | null
          role_primary?: string | null
          role_secondary?: string | null
          seven_shifts_department_ids?: number[] | null
          seven_shifts_location_ids?: number[] | null
          seven_shifts_role_ids?: number[] | null
          sevenshifts_employee_id?: string | null
          sevenshifts_punch_id?: string | null
          sevenshifts_user_id_int?: number | null
          source_systems?: string[] | null
          termination_date?: string | null
          termination_notes?: string | null
          termination_reason?:
            | Database["public"]["Enums"]["termination_reason"]
            | null
          toast_employee_guid?: string | null
          toast_employee_id?: string | null
          toast_external_employee_id?: string | null
          toast_job_references?: Json | null
          updated_at?: string
          user_id?: string | null
          venue_id: string
        }
        Update: {
          additional_venues?: string[] | null
          can_approve_comps?: boolean
          can_approve_voids?: boolean
          created_at?: string
          email?: string | null
          employee_name?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          exempt_reason?: string | null
          first_name?: string | null
          hire_date?: string | null
          hourly_wage?: number | null
          id?: string
          is_active?: boolean
          is_exempt?: boolean
          is_manager?: boolean
          is_vendor_account?: boolean
          last_incident_date?: string | null
          last_name?: string | null
          last_shift_date?: string | null
          last_synced_at?: string | null
          match_method?: string | null
          match_reviewed_at?: string | null
          match_reviewed_by?: string | null
          match_status?: string | null
          notes?: string | null
          phone?: string | null
          preferred_name?: string | null
          rehire_eligible?: boolean | null
          role_primary?: string | null
          role_secondary?: string | null
          seven_shifts_department_ids?: number[] | null
          seven_shifts_location_ids?: number[] | null
          seven_shifts_role_ids?: number[] | null
          sevenshifts_employee_id?: string | null
          sevenshifts_punch_id?: string | null
          sevenshifts_user_id_int?: number | null
          source_systems?: string[] | null
          termination_date?: string | null
          termination_notes?: string | null
          termination_reason?:
            | Database["public"]["Enums"]["termination_reason"]
            | null
          toast_employee_guid?: string | null
          toast_employee_id?: string | null
          toast_external_employee_id?: string | null
          toast_job_references?: Json | null
          updated_at?: string
          user_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_reviews: {
        Row: {
          ai_development_recommendations: string | null
          ai_performance_risk_level: string | null
          ai_review_sentiment: string | null
          ai_summary: string | null
          areas_for_improvement: string | null
          created_at: string
          employee_id: string
          goals_for_next_period: string | null
          id: string
          overall_rating:
            | Database["public"]["Enums"]["performance_rating"]
            | null
          period_end: string | null
          period_start: string | null
          pip_required: boolean | null
          promotion_recommended: boolean | null
          raise_recommended: boolean | null
          review_date: string
          review_type: Database["public"]["Enums"]["review_type"]
          reviewer_id: string
          score_adaptability: number | null
          score_attendance: number | null
          score_communication: number | null
          score_customer_service: number | null
          score_initiative: number | null
          score_job_knowledge: number | null
          score_productivity: number | null
          score_punctuality: number | null
          score_quality_of_work: number | null
          score_teamwork: number | null
          strengths: string | null
          venue_id: string
        }
        Insert: {
          ai_development_recommendations?: string | null
          ai_performance_risk_level?: string | null
          ai_review_sentiment?: string | null
          ai_summary?: string | null
          areas_for_improvement?: string | null
          created_at?: string
          employee_id: string
          goals_for_next_period?: string | null
          id?: string
          overall_rating?:
            | Database["public"]["Enums"]["performance_rating"]
            | null
          period_end?: string | null
          period_start?: string | null
          pip_required?: boolean | null
          promotion_recommended?: boolean | null
          raise_recommended?: boolean | null
          review_date: string
          review_type: Database["public"]["Enums"]["review_type"]
          reviewer_id: string
          score_adaptability?: number | null
          score_attendance?: number | null
          score_communication?: number | null
          score_customer_service?: number | null
          score_initiative?: number | null
          score_job_knowledge?: number | null
          score_productivity?: number | null
          score_punctuality?: number | null
          score_quality_of_work?: number | null
          score_teamwork?: number | null
          strengths?: string | null
          venue_id: string
        }
        Update: {
          ai_development_recommendations?: string | null
          ai_performance_risk_level?: string | null
          ai_review_sentiment?: string | null
          ai_summary?: string | null
          areas_for_improvement?: string | null
          created_at?: string
          employee_id?: string
          goals_for_next_period?: string | null
          id?: string
          overall_rating?:
            | Database["public"]["Enums"]["performance_rating"]
            | null
          period_end?: string | null
          period_start?: string | null
          pip_required?: boolean | null
          promotion_recommended?: boolean | null
          raise_recommended?: boolean | null
          review_date?: string
          review_type?: Database["public"]["Enums"]["review_type"]
          reviewer_id?: string
          score_adaptability?: number | null
          score_attendance?: number | null
          score_communication?: number | null
          score_customer_service?: number | null
          score_initiative?: number | null
          score_job_knowledge?: number | null
          score_productivity?: number | null
          score_punctuality?: number | null
          score_quality_of_work?: number | null
          score_teamwork?: number | null
          strengths?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_weekly_metrics: {
        Row: {
          break_violations: number | null
          callouts: number | null
          coaching_count: number | null
          comps_amount: number | null
          comps_count: number | null
          created_at: string
          employee_id: string
          guest_complaints: number | null
          guest_compliments: number | null
          hours_scheduled: number | null
          hours_worked: number | null
          id: string
          late_arrivals: number | null
          late_minutes_total: number | null
          net_sales: number | null
          no_shows: number | null
          overtime_hours: number | null
          recognition_count: number | null
          secret_shop_mention: boolean | null
          secret_shop_notes: string | null
          secret_shop_score: number | null
          shifts_scheduled: number | null
          shifts_worked: number | null
          tips_total: number | null
          transactions: number | null
          venue_id: string
          voids_amount: number | null
          voids_count: number | null
          week_id: string
        }
        Insert: {
          break_violations?: number | null
          callouts?: number | null
          coaching_count?: number | null
          comps_amount?: number | null
          comps_count?: number | null
          created_at?: string
          employee_id: string
          guest_complaints?: number | null
          guest_compliments?: number | null
          hours_scheduled?: number | null
          hours_worked?: number | null
          id?: string
          late_arrivals?: number | null
          late_minutes_total?: number | null
          net_sales?: number | null
          no_shows?: number | null
          overtime_hours?: number | null
          recognition_count?: number | null
          secret_shop_mention?: boolean | null
          secret_shop_notes?: string | null
          secret_shop_score?: number | null
          shifts_scheduled?: number | null
          shifts_worked?: number | null
          tips_total?: number | null
          transactions?: number | null
          venue_id: string
          voids_amount?: number | null
          voids_count?: number | null
          week_id: string
        }
        Update: {
          break_violations?: number | null
          callouts?: number | null
          coaching_count?: number | null
          comps_amount?: number | null
          comps_count?: number | null
          created_at?: string
          employee_id?: string
          guest_complaints?: number | null
          guest_compliments?: number | null
          hours_scheduled?: number | null
          hours_worked?: number | null
          id?: string
          late_arrivals?: number | null
          late_minutes_total?: number | null
          net_sales?: number | null
          no_shows?: number | null
          overtime_hours?: number | null
          recognition_count?: number | null
          secret_shop_mention?: boolean | null
          secret_shop_notes?: string | null
          secret_shop_score?: number | null
          shifts_scheduled?: number | null
          shifts_worked?: number | null
          tips_total?: number | null
          transactions?: number | null
          venue_id?: string
          voids_amount?: number | null
          voids_count?: number | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_weekly_metrics_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_weekly_metrics_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_weekly_metrics_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "employee_weekly_metrics_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_campaign_links: {
        Row: {
          attribution_tier: number
          campaign_id: string
          confidence: string
          created_at: string
          finding_id: string
          finding_type: string | null
          id: string
          notes: string | null
          outcome: string
          score_delta: number | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          attribution_tier: number
          campaign_id: string
          confidence: string
          created_at?: string
          finding_id: string
          finding_type?: string | null
          id?: string
          notes?: string | null
          outcome: string
          score_delta?: number | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          attribution_tier?: number
          campaign_id?: string
          confidence?: string
          created_at?: string
          finding_id?: string
          finding_type?: string | null
          id?: string
          notes?: string | null
          outcome?: string
          score_delta?: number | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finding_campaign_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_campaign_links_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          field_type: Database["public"]["Enums"]["field_type"]
          id: string
          key: string
          label: string
          options_json: Json | null
          voice_enabled: boolean
        }
        Insert: {
          created_at?: string
          field_type: Database["public"]["Enums"]["field_type"]
          id?: string
          key: string
          label: string
          options_json?: Json | null
          voice_enabled?: boolean
        }
        Update: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          key?: string
          label?: string
          options_json?: Json | null
          voice_enabled?: boolean
        }
        Relationships: []
      }
      gbp_place_mappings: {
        Row: {
          consecutive_fetch_failures: number
          created_at: string
          last_resolve_error: string | null
          last_resolved_at: string | null
          manual_only: boolean
          place_id: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          consecutive_fetch_failures?: number
          created_at?: string
          last_resolve_error?: string | null
          last_resolved_at?: string | null
          manual_only?: boolean
          place_id?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          consecutive_fetch_failures?: number
          created_at?: string
          last_resolve_error?: string | null
          last_resolved_at?: string | null
          manual_only?: boolean
          place_id?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gbp_place_mappings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      gbp_snapshots: {
        Row: {
          attributes: Json | null
          captured_at: string
          created_at: string
          created_by: string | null
          description: string | null
          fetch_error: string | null
          gbp_address: string | null
          gbp_name: string | null
          gbp_phone: string | null
          holiday_hours_set: boolean | null
          hours_complete: boolean | null
          id: string
          last_photo_at: string | null
          last_post_at: string | null
          last_qa_answered_at: string | null
          last_review_response_at: string | null
          nap_match_address: boolean | null
          nap_match_name: boolean | null
          nap_match_phone: boolean | null
          photo_count: number | null
          post_count: number | null
          primary_category: string | null
          qa_total: number | null
          qa_unanswered: number | null
          raw: Json | null
          review_response_rate_30d: number | null
          scope: string
          secondary_categories: string[] | null
          service_area_set: boolean | null
          service_options: Json | null
          source: string
          venue_id: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          attributes?: Json | null
          captured_at?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fetch_error?: string | null
          gbp_address?: string | null
          gbp_name?: string | null
          gbp_phone?: string | null
          holiday_hours_set?: boolean | null
          hours_complete?: boolean | null
          id?: string
          last_photo_at?: string | null
          last_post_at?: string | null
          last_qa_answered_at?: string | null
          last_review_response_at?: string | null
          nap_match_address?: boolean | null
          nap_match_name?: boolean | null
          nap_match_phone?: boolean | null
          photo_count?: number | null
          post_count?: number | null
          primary_category?: string | null
          qa_total?: number | null
          qa_unanswered?: number | null
          raw?: Json | null
          review_response_rate_30d?: number | null
          scope: string
          secondary_categories?: string[] | null
          service_area_set?: boolean | null
          service_options?: Json | null
          source: string
          venue_id: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          attributes?: Json | null
          captured_at?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fetch_error?: string | null
          gbp_address?: string | null
          gbp_name?: string | null
          gbp_phone?: string | null
          holiday_hours_set?: boolean | null
          hours_complete?: boolean | null
          id?: string
          last_photo_at?: string | null
          last_post_at?: string | null
          last_qa_answered_at?: string | null
          last_review_response_at?: string | null
          nap_match_address?: boolean | null
          nap_match_name?: boolean | null
          nap_match_phone?: boolean | null
          photo_count?: number | null
          post_count?: number | null
          primary_category?: string | null
          qa_total?: number | null
          qa_unanswered?: number | null
          raw?: Json | null
          review_response_rate_30d?: number | null
          scope?: string
          secondary_categories?: string[] | null
          service_area_set?: boolean | null
          service_options?: Json | null
          source?: string
          venue_id?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gbp_snapshots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_logs: {
        Row: {
          asana_comment_gid: string | null
          asana_source_id: string | null
          asana_source_label: string | null
          asana_task_gid: string | null
          author_name: string | null
          bar_id: string
          broken_items: Json | null
          cash_handling_notes: string | null
          challenges_and_concerns: string | null
          cleanliness_notes: string | null
          closing_manager: string | null
          coaching_corrections: Json | null
          coaching_given: string | null
          comment_created_at: string | null
          content_captured: boolean | null
          content_notes: string | null
          created_at: string
          date: string
          day_id: string | null
          day_rating: number | null
          expected_close_time: string | null
          for_chad: string | null
          gm_on_duty: string | null
          guest_complaints: Json | null
          guest_compliments: Json | null
          guest_vibe: string | null
          id: string
          incidents: string | null
          inventory_issues: string | null
          is_draft: boolean
          is_parsed: boolean
          items_86d: Json | null
          low_stock_watchlist: Json | null
          maintenance_completed: string | null
          maintenance_pending: string | null
          marketing_activities: string | null
          new_problems: Json | null
          notable_guest_interactions: string | null
          opening_manager: string | null
          orders_placed: string | null
          overall_shift_summary: string | null
          pacing: string | null
          parse_error: string | null
          parsed_at: string | null
          prep_issues: string | null
          raw_text: string | null
          recognition_given: string | null
          review_responses: string | null
          safety_concerns: Json | null
          schedule_changes: string | null
          security_incidents: string | null
          staff_highlights: Json | null
          staff_performance_notes: string | null
          staffing_issues: string | null
          submitted_by: string | null
          summary_notes: string | null
          team_energy: string | null
          tomorrow_events: string | null
          tomorrow_focus: string | null
          tomorrow_staffing_notes: string | null
          training_needs: Json | null
          updated_at: string
          vendor_visits: string | null
          venue_id: string | null
          vip_visits: string | null
          vips_regulars: Json | null
          waste_comps: string | null
          waste_notes: string | null
          week_id: string | null
          week_rating_enum: string | null
          wins: string | null
        }
        Insert: {
          asana_comment_gid?: string | null
          asana_source_id?: string | null
          asana_source_label?: string | null
          asana_task_gid?: string | null
          author_name?: string | null
          bar_id: string
          broken_items?: Json | null
          cash_handling_notes?: string | null
          challenges_and_concerns?: string | null
          cleanliness_notes?: string | null
          closing_manager?: string | null
          coaching_corrections?: Json | null
          coaching_given?: string | null
          comment_created_at?: string | null
          content_captured?: boolean | null
          content_notes?: string | null
          created_at?: string
          date: string
          day_id?: string | null
          day_rating?: number | null
          expected_close_time?: string | null
          for_chad?: string | null
          gm_on_duty?: string | null
          guest_complaints?: Json | null
          guest_compliments?: Json | null
          guest_vibe?: string | null
          id?: string
          incidents?: string | null
          inventory_issues?: string | null
          is_draft?: boolean
          is_parsed?: boolean
          items_86d?: Json | null
          low_stock_watchlist?: Json | null
          maintenance_completed?: string | null
          maintenance_pending?: string | null
          marketing_activities?: string | null
          new_problems?: Json | null
          notable_guest_interactions?: string | null
          opening_manager?: string | null
          orders_placed?: string | null
          overall_shift_summary?: string | null
          pacing?: string | null
          parse_error?: string | null
          parsed_at?: string | null
          prep_issues?: string | null
          raw_text?: string | null
          recognition_given?: string | null
          review_responses?: string | null
          safety_concerns?: Json | null
          schedule_changes?: string | null
          security_incidents?: string | null
          staff_highlights?: Json | null
          staff_performance_notes?: string | null
          staffing_issues?: string | null
          submitted_by?: string | null
          summary_notes?: string | null
          team_energy?: string | null
          tomorrow_events?: string | null
          tomorrow_focus?: string | null
          tomorrow_staffing_notes?: string | null
          training_needs?: Json | null
          updated_at?: string
          vendor_visits?: string | null
          venue_id?: string | null
          vip_visits?: string | null
          vips_regulars?: Json | null
          waste_comps?: string | null
          waste_notes?: string | null
          week_id?: string | null
          week_rating_enum?: string | null
          wins?: string | null
        }
        Update: {
          asana_comment_gid?: string | null
          asana_source_id?: string | null
          asana_source_label?: string | null
          asana_task_gid?: string | null
          author_name?: string | null
          bar_id?: string
          broken_items?: Json | null
          cash_handling_notes?: string | null
          challenges_and_concerns?: string | null
          cleanliness_notes?: string | null
          closing_manager?: string | null
          coaching_corrections?: Json | null
          coaching_given?: string | null
          comment_created_at?: string | null
          content_captured?: boolean | null
          content_notes?: string | null
          created_at?: string
          date?: string
          day_id?: string | null
          day_rating?: number | null
          expected_close_time?: string | null
          for_chad?: string | null
          gm_on_duty?: string | null
          guest_complaints?: Json | null
          guest_compliments?: Json | null
          guest_vibe?: string | null
          id?: string
          incidents?: string | null
          inventory_issues?: string | null
          is_draft?: boolean
          is_parsed?: boolean
          items_86d?: Json | null
          low_stock_watchlist?: Json | null
          maintenance_completed?: string | null
          maintenance_pending?: string | null
          marketing_activities?: string | null
          new_problems?: Json | null
          notable_guest_interactions?: string | null
          opening_manager?: string | null
          orders_placed?: string | null
          overall_shift_summary?: string | null
          pacing?: string | null
          parse_error?: string | null
          parsed_at?: string | null
          prep_issues?: string | null
          raw_text?: string | null
          recognition_given?: string | null
          review_responses?: string | null
          safety_concerns?: Json | null
          schedule_changes?: string | null
          security_incidents?: string | null
          staff_highlights?: Json | null
          staff_performance_notes?: string | null
          staffing_issues?: string | null
          submitted_by?: string | null
          summary_notes?: string | null
          team_energy?: string | null
          tomorrow_events?: string | null
          tomorrow_focus?: string | null
          tomorrow_staffing_notes?: string | null
          training_needs?: Json | null
          updated_at?: string
          vendor_visits?: string | null
          venue_id?: string | null
          vip_visits?: string | null
          vips_regulars?: Json | null
          waste_comps?: string | null
          waste_notes?: string | null
          week_id?: string | null
          week_rating_enum?: string | null
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gm_logs_asana_source_id_fkey"
            columns: ["asana_source_id"]
            isOneToOne: false
            referencedRelation: "venue_asana_log_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gm_logs_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gm_logs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "days"
            referencedColumns: ["id"]
          },
        ]
      }
      google_reviews: {
        Row: {
          author_name: string | null
          bar_id: string
          created_at: string | null
          id: string
          publish_time: string | null
          rating: number
          review_hash: string
          review_text: string | null
          snapshot_date: string
        }
        Insert: {
          author_name?: string | null
          bar_id: string
          created_at?: string | null
          id?: string
          publish_time?: string | null
          rating: number
          review_hash: string
          review_text?: string | null
          snapshot_date: string
        }
        Update: {
          author_name?: string | null
          bar_id?: string
          created_at?: string | null
          id?: string
          publish_time?: string | null
          rating?: number
          review_hash?: string
          review_text?: string | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_reviews_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_action_pack_assets: {
        Row: {
          approval: string
          approval_assignee_id: string | null
          approval_due_date: string | null
          approval_notes: string | null
          body: string
          created_at: string
          edited_at: string | null
          edited_by: string | null
          finding_id: string
          finding_type: string
          id: string
          kind: string
          linked_campaign_id: string | null
          meta: Json
          pack_id: string
          regeneration_count: number
          status: string
          title: string
          variant: number | null
          venue_id: string
        }
        Insert: {
          approval?: string
          approval_assignee_id?: string | null
          approval_due_date?: string | null
          approval_notes?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          finding_id: string
          finding_type: string
          id?: string
          kind: string
          linked_campaign_id?: string | null
          meta?: Json
          pack_id: string
          regeneration_count?: number
          status?: string
          title: string
          variant?: number | null
          venue_id: string
        }
        Update: {
          approval?: string
          approval_assignee_id?: string | null
          approval_due_date?: string | null
          approval_notes?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          finding_id?: string
          finding_type?: string
          id?: string
          kind?: string
          linked_campaign_id?: string | null
          meta?: Json
          pack_id?: string
          regeneration_count?: number
          status?: string
          title?: string
          variant?: number | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_action_pack_assets_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "growth_action_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_action_pack_audit: {
        Row: {
          actor_service: string | null
          actor_user_id: string | null
          asset_id: string | null
          created_at: string
          event: string
          id: string
          new_value: Json | null
          pack_id: string | null
          previous_value: Json | null
          venue_id: string
        }
        Insert: {
          actor_service?: string | null
          actor_user_id?: string | null
          asset_id?: string | null
          created_at?: string
          event: string
          id?: string
          new_value?: Json | null
          pack_id?: string | null
          previous_value?: Json | null
          venue_id: string
        }
        Update: {
          actor_service?: string | null
          actor_user_id?: string | null
          asset_id?: string | null
          created_at?: string
          event?: string
          id?: string
          new_value?: Json | null
          pack_id?: string | null
          previous_value?: Json | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_action_pack_audit_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "growth_action_pack_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_action_pack_audit_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "growth_action_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_action_packs: {
        Row: {
          ad_hoc_brief: string | null
          ad_hoc_category: string | null
          brand_voice: string
          campaign_id: string | null
          context_kind: string
          created_at: string
          engine_model: string | null
          finding_id: string | null
          generated_at: string
          generated_by: string | null
          id: string
          metadata: Json
          source: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          ad_hoc_brief?: string | null
          ad_hoc_category?: string | null
          brand_voice?: string
          campaign_id?: string | null
          context_kind: string
          created_at?: string
          engine_model?: string | null
          finding_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json
          source?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          ad_hoc_brief?: string | null
          ad_hoc_category?: string | null
          brand_voice?: string
          campaign_id?: string | null
          context_kind?: string
          created_at?: string
          engine_model?: string | null
          finding_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json
          source?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_action_packs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_audit_runs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          id: string
          notes: string | null
          status: string
          summary: Json
          triggered_at: string
          triggered_by: string | null
          venue_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          id?: string
          notes?: string | null
          status?: string
          summary?: Json
          triggered_at?: string
          triggered_by?: string | null
          venue_id: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          id?: string
          notes?: string | null
          status?: string
          summary?: Json
          triggered_at?: string
          triggered_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_audit_runs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_finding_status_audit: {
        Row: {
          actor_service: string | null
          actor_user_id: string | null
          created_at: string
          finding_id: string
          id: string
          new_status: string
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          actor_service?: string | null
          actor_user_id?: string | null
          created_at?: string
          finding_id: string
          id?: string
          new_status: string
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          actor_service?: string | null
          actor_user_id?: string | null
          created_at?: string
          finding_id?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_finding_status_audit_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "growth_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_finding_types: {
        Row: {
          action_pack_blueprint: Json
          created_at: string
          default_category: string
          default_traffic_driving: boolean
          diagnosis_pattern: string
          evidence_hints: Json
          is_active: boolean
          label: string
          recommended_action_pattern: string
          type_id: string
          updated_at: string
        }
        Insert: {
          action_pack_blueprint?: Json
          created_at?: string
          default_category: string
          default_traffic_driving?: boolean
          diagnosis_pattern?: string
          evidence_hints?: Json
          is_active?: boolean
          label: string
          recommended_action_pattern?: string
          type_id: string
          updated_at?: string
        }
        Update: {
          action_pack_blueprint?: Json
          created_at?: string
          default_category?: string
          default_traffic_driving?: boolean
          diagnosis_pattern?: string
          evidence_hints?: Json
          is_active?: boolean
          label?: string
          recommended_action_pattern?: string
          type_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      growth_findings: {
        Row: {
          action_pack_id: string | null
          campaign_id: string | null
          category: string
          confidence: number
          created_at: string
          diagnosis: string
          dismiss_reason: string | null
          ease: number
          evidence: Json
          first_detected_at: string
          gate_reason: string | null
          id: string
          is_traffic_driving: boolean
          last_seen_at: string
          metadata: Json
          operational_risk: number
          outcome: string | null
          override_active: boolean
          override_reason: string | null
          priority_score: number
          recommended_action: string
          resolved_at: string | null
          revenue_upside: number
          severity: string
          signal_key: string
          snoozed_until: string | null
          status: string
          title: string
          type_id: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          action_pack_id?: string | null
          campaign_id?: string | null
          category: string
          confidence?: number
          created_at?: string
          diagnosis?: string
          dismiss_reason?: string | null
          ease?: number
          evidence?: Json
          first_detected_at?: string
          gate_reason?: string | null
          id?: string
          is_traffic_driving?: boolean
          last_seen_at?: string
          metadata?: Json
          operational_risk?: number
          outcome?: string | null
          override_active?: boolean
          override_reason?: string | null
          priority_score?: number
          recommended_action?: string
          resolved_at?: string | null
          revenue_upside?: number
          severity: string
          signal_key: string
          snoozed_until?: string | null
          status?: string
          title: string
          type_id: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          action_pack_id?: string | null
          campaign_id?: string | null
          category?: string
          confidence?: number
          created_at?: string
          diagnosis?: string
          dismiss_reason?: string | null
          ease?: number
          evidence?: Json
          first_detected_at?: string
          gate_reason?: string | null
          id?: string
          is_traffic_driving?: boolean
          last_seen_at?: string
          metadata?: Json
          operational_risk?: number
          outcome?: string | null
          override_active?: boolean
          override_reason?: string | null
          priority_score?: number
          recommended_action?: string
          resolved_at?: string | null
          revenue_upside?: number
          severity?: string
          signal_key?: string
          snoozed_until?: string | null
          status?: string
          title?: string
          type_id?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_findings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_score_snapshots: {
        Row: {
          audit_run_id: string | null
          category_scores: Json
          created_at: string
          data_confidence: Json
          findings_critical_count: number
          findings_high_count: number
          findings_open_count: number
          growth_score: number | null
          id: string
          opportunity_dollars_monthly: number | null
          ops_gate: string | null
          snapshot_date: string
          source: string
          venue_id: string
        }
        Insert: {
          audit_run_id?: string | null
          category_scores?: Json
          created_at?: string
          data_confidence?: Json
          findings_critical_count?: number
          findings_high_count?: number
          findings_open_count?: number
          growth_score?: number | null
          id?: string
          opportunity_dollars_monthly?: number | null
          ops_gate?: string | null
          snapshot_date: string
          source?: string
          venue_id: string
        }
        Update: {
          audit_run_id?: string | null
          category_scores?: Json
          created_at?: string
          data_confidence?: Json
          findings_critical_count?: number
          findings_high_count?: number
          findings_open_count?: number
          growth_score?: number | null
          id?: string
          opportunity_dollars_monthly?: number | null
          ops_gate?: string | null
          snapshot_date?: string
          source?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_score_snapshots_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "growth_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_score_snapshots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_leads: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          promoted_company_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["inbound_lead_status"]
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          promoted_company_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["inbound_lead_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          promoted_company_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["inbound_lead_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_leads_promoted_company_id_fkey"
            columns: ["promoted_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_cards: {
        Row: {
          action_detail: string | null
          action_title: string | null
          airtable_record_id: string | null
          approval_status: string | null
          asana_task_gid: string | null
          asana_task_url: string | null
          assignee_id: string | null
          bar_id: string
          created_at: string | null
          due_date: string | null
          effort_minutes: number | null
          generated_at: string | null
          id: string
          insight_type: string | null
          narrative: string | null
          pillar: string
          severity: string
          simple_citation: string | null
          snoozed_until: string | null
          source_refs: Json | null
          status: string | null
          summary: string | null
          title: string
          updated_at: string | null
          venue_id: string | null
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          action_detail?: string | null
          action_title?: string | null
          airtable_record_id?: string | null
          approval_status?: string | null
          asana_task_gid?: string | null
          asana_task_url?: string | null
          assignee_id?: string | null
          bar_id: string
          created_at?: string | null
          due_date?: string | null
          effort_minutes?: number | null
          generated_at?: string | null
          id?: string
          insight_type?: string | null
          narrative?: string | null
          pillar: string
          severity?: string
          simple_citation?: string | null
          snoozed_until?: string | null
          source_refs?: Json | null
          status?: string | null
          summary?: string | null
          title: string
          updated_at?: string | null
          venue_id?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          action_detail?: string | null
          action_title?: string | null
          airtable_record_id?: string | null
          approval_status?: string | null
          asana_task_gid?: string | null
          asana_task_url?: string | null
          assignee_id?: string | null
          bar_id?: string
          created_at?: string | null
          due_date?: string | null
          effort_minutes?: number | null
          generated_at?: string | null
          id?: string
          insight_type?: string | null
          narrative?: string | null
          pillar?: string
          severity?: string
          simple_citation?: string | null
          snoozed_until?: string | null
          source_refs?: Json | null
          status?: string | null
          summary?: string | null
          title?: string
          updated_at?: string | null
          venue_id?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insight_cards_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_employees: {
        Row: {
          created_at: string
          employee_id: string
          employee_name: string | null
          insight_id: string
          role: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employee_name?: string | null
          insight_id: string
          role?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employee_name?: string | null
          insight_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_employees_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          bar_id: string
          confidence: string | null
          created_at: string
          day_id: string | null
          dedupe_hash: string | null
          detail: string | null
          dismiss_note: string | null
          dismiss_reason: string | null
          employee_id: string | null
          employee_name: string | null
          estimated_impact: string | null
          evidence_ids: Json | null
          feedback: Database["public"]["Enums"]["feedback_vote"] | null
          feedback_note: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          insight_mode: string
          insight_type: string
          is_recurring: boolean | null
          metric_name: string | null
          metric_value: string | null
          period_end: string | null
          period_label: string | null
          period_start: string | null
          pillar: string
          rejected_at: string | null
          rejected_by_id: string | null
          rejection_reason: string | null
          related_insight_id: string | null
          sentiment: Database["public"]["Enums"]["insight_sentiment"]
          severity: string
          snoozed_until: string | null
          source_context: string | null
          source_date: string | null
          source_log_id: string | null
          source_log_type: string | null
          source_metric: string | null
          source_type: string | null
          source_value: string | null
          status: string
          streak_weeks: number | null
          summary: string | null
          threshold: string | null
          title: string
          venue_id: string | null
          week_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          bar_id: string
          confidence?: string | null
          created_at?: string
          day_id?: string | null
          dedupe_hash?: string | null
          detail?: string | null
          dismiss_note?: string | null
          dismiss_reason?: string | null
          employee_id?: string | null
          employee_name?: string | null
          estimated_impact?: string | null
          evidence_ids?: Json | null
          feedback?: Database["public"]["Enums"]["feedback_vote"] | null
          feedback_note?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          insight_mode?: string
          insight_type?: string
          is_recurring?: boolean | null
          metric_name?: string | null
          metric_value?: string | null
          period_end?: string | null
          period_label?: string | null
          period_start?: string | null
          pillar: string
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          related_insight_id?: string | null
          sentiment?: Database["public"]["Enums"]["insight_sentiment"]
          severity?: string
          snoozed_until?: string | null
          source_context?: string | null
          source_date?: string | null
          source_log_id?: string | null
          source_log_type?: string | null
          source_metric?: string | null
          source_type?: string | null
          source_value?: string | null
          status?: string
          streak_weeks?: number | null
          summary?: string | null
          threshold?: string | null
          title: string
          venue_id?: string | null
          week_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          bar_id?: string
          confidence?: string | null
          created_at?: string
          day_id?: string | null
          dedupe_hash?: string | null
          detail?: string | null
          dismiss_note?: string | null
          dismiss_reason?: string | null
          employee_id?: string | null
          employee_name?: string | null
          estimated_impact?: string | null
          evidence_ids?: Json | null
          feedback?: Database["public"]["Enums"]["feedback_vote"] | null
          feedback_note?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          insight_mode?: string
          insight_type?: string
          is_recurring?: boolean | null
          metric_name?: string | null
          metric_value?: string | null
          period_end?: string | null
          period_label?: string | null
          period_start?: string | null
          pillar?: string
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          related_insight_id?: string | null
          sentiment?: Database["public"]["Enums"]["insight_sentiment"]
          severity?: string
          snoozed_until?: string | null
          source_context?: string | null
          source_date?: string | null
          source_log_id?: string | null
          source_log_type?: string | null
          source_metric?: string | null
          source_type?: string | null
          source_value?: string | null
          status?: string
          streak_weeks?: number | null
          summary?: string | null
          threshold?: string | null
          title?: string
          venue_id?: string | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_rejected_by_id_fkey"
            columns: ["rejected_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_related_insight_id_fkey"
            columns: ["related_insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "insights_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      insights_sentiment_backup_2026_04: {
        Row: {
          insight_id: string
          sentiment: string | null
          snapshotted_at: string
        }
        Insert: {
          insight_id: string
          sentiment?: string | null
          snapshotted_at?: string
        }
        Update: {
          insight_id?: string
          sentiment?: string | null
          snapshotted_at?: string
        }
        Relationships: []
      }
      inventory_cost_history: {
        Row: {
          difference_pct: number | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          period_end: string
          period_start: string
          price: number | null
          price_difference: number | null
          product_name: string
          raw_header_hash: string | null
          source_file: string | null
          source_report_type: string
          uploaded_at: string
          uploaded_by: string | null
          vendor: string | null
          venue_id: string
        }
        Insert: {
          difference_pct?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          period_end: string
          period_start: string
          price?: number | null
          price_difference?: number | null
          product_name: string
          raw_header_hash?: string | null
          source_file?: string | null
          source_report_type?: string
          uploaded_at?: string
          uploaded_by?: string | null
          vendor?: string | null
          venue_id: string
        }
        Update: {
          difference_pct?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          period_end?: string
          period_start?: string
          price?: number | null
          price_difference?: number | null
          product_name?: string
          raw_header_hash?: string | null
          source_file?: string | null
          source_report_type?: string
          uploaded_at?: string
          uploaded_by?: string | null
          vendor?: string | null
          venue_id?: string
        }
        Relationships: []
      }
      inventory_intelipar: {
        Row: {
          days_remaining: string | null
          excess_stock_onhand: number | null
          historical_usage: number | null
          id: string
          item_name: string | null
          item_size: string | null
          on_hand_cost: number | null
          on_hand_qty: number | null
          order_uom: string | null
          par: number | null
          period_end: string
          period_start: string
          raw_header_hash: string | null
          source_file: string | null
          source_report_type: string
          total_order: number | null
          unit_cost: number | null
          uploaded_at: string
          uploaded_by: string | null
          used: number | null
          vendor: string | null
          venue_id: string
        }
        Insert: {
          days_remaining?: string | null
          excess_stock_onhand?: number | null
          historical_usage?: number | null
          id?: string
          item_name?: string | null
          item_size?: string | null
          on_hand_cost?: number | null
          on_hand_qty?: number | null
          order_uom?: string | null
          par?: number | null
          period_end: string
          period_start: string
          raw_header_hash?: string | null
          source_file?: string | null
          source_report_type?: string
          total_order?: number | null
          unit_cost?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
          used?: number | null
          vendor?: string | null
          venue_id: string
        }
        Update: {
          days_remaining?: string | null
          excess_stock_onhand?: number | null
          historical_usage?: number | null
          id?: string
          item_name?: string | null
          item_size?: string | null
          on_hand_cost?: number | null
          on_hand_qty?: number | null
          order_uom?: string | null
          par?: number | null
          period_end?: string
          period_start?: string
          raw_header_hash?: string | null
          source_file?: string | null
          source_report_type?: string
          total_order?: number | null
          unit_cost?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
          used?: number | null
          vendor?: string | null
          venue_id?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          id: string
          ideal_pour_cost: number | null
          is_category_total: boolean
          item_name: string
          missing: number | null
          missing_cost: number | null
          missing_pct: number | null
          on_hand: number | null
          period_end: string
          period_start: string
          pour_cost: number | null
          purchases: number | null
          report_id: string
          revenue: number | null
          sculpture_rating: number | null
          sold: number | null
          spillage_cost: number | null
          used: number | null
          venue_id: string
        }
        Insert: {
          category?: string | null
          id?: string
          ideal_pour_cost?: number | null
          is_category_total?: boolean
          item_name: string
          missing?: number | null
          missing_cost?: number | null
          missing_pct?: number | null
          on_hand?: number | null
          period_end: string
          period_start: string
          pour_cost?: number | null
          purchases?: number | null
          report_id: string
          revenue?: number | null
          sculpture_rating?: number | null
          sold?: number | null
          spillage_cost?: number | null
          used?: number | null
          venue_id: string
        }
        Update: {
          category?: string | null
          id?: string
          ideal_pour_cost?: number | null
          is_category_total?: boolean
          item_name?: string
          missing?: number | null
          missing_cost?: number | null
          missing_pct?: number | null
          on_hand?: number | null
          period_end?: string
          period_start?: string
          pour_cost?: number | null
          purchases?: number | null
          report_id?: string
          revenue?: number | null
          sculpture_rating?: number | null
          sold?: number | null
          spillage_cost?: number | null
          used?: number | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "inventory_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reports: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          raw_header_hash: string | null
          report_type: string
          sculpture_rating: number | null
          source_file: string | null
          total_missing_cost: number | null
          uploaded_by: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          raw_header_hash?: string | null
          report_type?: string
          sculpture_rating?: number | null
          source_file?: string | null
          total_missing_cost?: number | null
          uploaded_by?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          raw_header_hash?: string | null
          report_type?: string
          sculpture_rating?: number | null
          source_file?: string | null
          total_missing_cost?: number | null
          uploaded_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reports_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_station_stock: {
        Row: {
          id: string
          item_name: string | null
          item_size: string | null
          on_hand_qty: number | null
          on_hand_uom: string | null
          period_end: string
          period_start: string
          raw_header_hash: string | null
          source_file: string | null
          source_report_type: string
          station: string | null
          uploaded_at: string
          uploaded_by: string | null
          venue_id: string
        }
        Insert: {
          id?: string
          item_name?: string | null
          item_size?: string | null
          on_hand_qty?: number | null
          on_hand_uom?: string | null
          period_end: string
          period_start: string
          raw_header_hash?: string | null
          source_file?: string | null
          source_report_type?: string
          station?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          venue_id: string
        }
        Update: {
          id?: string
          item_name?: string | null
          item_size?: string | null
          on_hand_qty?: number | null
          on_hand_uom?: string | null
          period_end?: string
          period_start?: string
          raw_header_hash?: string | null
          source_file?: string | null
          source_report_type?: string
          station?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          venue_id?: string
        }
        Relationships: []
      }
      inventory_summary_variance: {
        Row: {
          category_name: string
          id: string
          ideal_pour_cost_pct: number | null
          is_grand_total: boolean
          missing: number | null
          missing_cost: number | null
          missing_pct: number | null
          on_hand_cost: number | null
          period_end: string
          period_start: string
          pour_cost_pct: number | null
          raw_header_hash: string | null
          revenue: number | null
          revenue_potential: number | null
          sculpture_rating_pct: number | null
          sold: number | null
          source_file: string | null
          source_report_type: string
          spillage_cost: number | null
          uploaded_at: string
          uploaded_by: string | null
          used: number | null
          used_cost: number | null
          venue_id: string
        }
        Insert: {
          category_name: string
          id?: string
          ideal_pour_cost_pct?: number | null
          is_grand_total?: boolean
          missing?: number | null
          missing_cost?: number | null
          missing_pct?: number | null
          on_hand_cost?: number | null
          period_end: string
          period_start: string
          pour_cost_pct?: number | null
          raw_header_hash?: string | null
          revenue?: number | null
          revenue_potential?: number | null
          sculpture_rating_pct?: number | null
          sold?: number | null
          source_file?: string | null
          source_report_type?: string
          spillage_cost?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
          used?: number | null
          used_cost?: number | null
          venue_id: string
        }
        Update: {
          category_name?: string
          id?: string
          ideal_pour_cost_pct?: number | null
          is_grand_total?: boolean
          missing?: number | null
          missing_cost?: number | null
          missing_pct?: number | null
          on_hand_cost?: number | null
          period_end?: string
          period_start?: string
          pour_cost_pct?: number | null
          raw_header_hash?: string | null
          revenue?: number | null
          revenue_potential?: number | null
          sculpture_rating_pct?: number | null
          sold?: number | null
          source_file?: string | null
          source_report_type?: string
          spillage_cost?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
          used?: number | null
          used_cost?: number | null
          venue_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          ai_document_summary: string | null
          ai_extracted_keywords: string[] | null
          ai_suggested_category: string | null
          attachment_url: string | null
          category: Database["public"]["Enums"]["doc_category"]
          content_type: string | null
          created_at: string
          description: string | null
          effective_date: string | null
          expiry_date: string | null
          external_url: string | null
          full_text: string | null
          id: string
          key_points: string | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          owner_id: string | null
          requires_acknowledgment: boolean | null
          scope: Database["public"]["Enums"]["doc_scope"]
          status: Database["public"]["Enums"]["doc_status"]
          subcategory: string | null
          summary: string | null
          superseded_by: string | null
          tags: string[] | null
          title: string
          updated_at: string
          venue_id: string | null
          version: string | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"]
          ai_document_summary?: string | null
          ai_extracted_keywords?: string[] | null
          ai_suggested_category?: string | null
          attachment_url?: string | null
          category: Database["public"]["Enums"]["doc_category"]
          content_type?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          external_url?: string | null
          full_text?: string | null
          id?: string
          key_points?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          owner_id?: string | null
          requires_acknowledgment?: boolean | null
          scope: Database["public"]["Enums"]["doc_scope"]
          status?: Database["public"]["Enums"]["doc_status"]
          subcategory?: string | null
          summary?: string | null
          superseded_by?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          venue_id?: string | null
          version?: string | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          ai_document_summary?: string | null
          ai_extracted_keywords?: string[] | null
          ai_suggested_category?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["doc_category"]
          content_type?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          external_url?: string | null
          full_text?: string | null
          id?: string
          key_points?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          owner_id?: string | null
          requires_acknowledgment?: boolean | null
          scope?: Database["public"]["Enums"]["doc_scope"]
          status?: Database["public"]["Enums"]["doc_status"]
          subcategory?: string | null
          summary?: string | null
          superseded_by?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          venue_id?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_logs: {
        Row: {
          asana_comment_gid: string | null
          asana_source_id: string | null
          asana_source_label: string | null
          asana_task_gid: string | null
          author_name: string | null
          bar_id: string
          bartender_rating: number | null
          business_flow: string | null
          cleaning_issues: string | null
          comment_created_at: string | null
          created_at: string
          customer_issues: string | null
          date: string
          day_id: string | null
          float_rating: number | null
          id: string
          improvement_suggestions: string | null
          is_parsed: boolean
          issues: Json | null
          items_out: Json | null
          lead_rating: number | null
          new_customers: Json | null
          parse_error: string | null
          parsed_at: string | null
          raw_text: string | null
          service_bartender_rating: number | null
          shift: string | null
          shoutouts: Json | null
          staffing_levels: string | null
          toast_computer_issues: string | null
          vibe_rating: number | null
          window_rating: number | null
        }
        Insert: {
          asana_comment_gid?: string | null
          asana_source_id?: string | null
          asana_source_label?: string | null
          asana_task_gid?: string | null
          author_name?: string | null
          bar_id: string
          bartender_rating?: number | null
          business_flow?: string | null
          cleaning_issues?: string | null
          comment_created_at?: string | null
          created_at?: string
          customer_issues?: string | null
          date: string
          day_id?: string | null
          float_rating?: number | null
          id?: string
          improvement_suggestions?: string | null
          is_parsed?: boolean
          issues?: Json | null
          items_out?: Json | null
          lead_rating?: number | null
          new_customers?: Json | null
          parse_error?: string | null
          parsed_at?: string | null
          raw_text?: string | null
          service_bartender_rating?: number | null
          shift?: string | null
          shoutouts?: Json | null
          staffing_levels?: string | null
          toast_computer_issues?: string | null
          vibe_rating?: number | null
          window_rating?: number | null
        }
        Update: {
          asana_comment_gid?: string | null
          asana_source_id?: string | null
          asana_source_label?: string | null
          asana_task_gid?: string | null
          author_name?: string | null
          bar_id?: string
          bartender_rating?: number | null
          business_flow?: string | null
          cleaning_issues?: string | null
          comment_created_at?: string | null
          created_at?: string
          customer_issues?: string | null
          date?: string
          day_id?: string | null
          float_rating?: number | null
          id?: string
          improvement_suggestions?: string | null
          is_parsed?: boolean
          issues?: Json | null
          items_out?: Json | null
          lead_rating?: number | null
          new_customers?: Json | null
          parse_error?: string | null
          parsed_at?: string | null
          raw_text?: string | null
          service_bartender_rating?: number | null
          shift?: string | null
          shoutouts?: Json | null
          staffing_levels?: string | null
          toast_computer_issues?: string | null
          vibe_rating?: number | null
          window_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_logs_asana_source_id_fkey"
            columns: ["asana_source_id"]
            isOneToOne: false
            referencedRelation: "venue_asana_log_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_logs_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_logs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "days"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entries: {
        Row: {
          bar_id: string
          created_at: string
          created_by: string
          id: string
          log_type: Database["public"]["Enums"]["log_type"]
          status: Database["public"]["Enums"]["log_status"]
          submitted_at: string | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          bar_id: string
          created_at?: string
          created_by: string
          id?: string
          log_type: Database["public"]["Enums"]["log_type"]
          status?: Database["public"]["Enums"]["log_status"]
          submitted_at?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          bar_id?: string
          created_at?: string
          created_by?: string
          id?: string
          log_type?: Database["public"]["Enums"]["log_type"]
          status?: Database["public"]["Enums"]["log_status"]
          submitted_at?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: []
      }
      log_entry_values: {
        Row: {
          field_id: string
          id: string
          log_entry_id: string
          updated_at: string
          value_json: Json | null
        }
        Insert: {
          field_id: string
          id?: string
          log_entry_id: string
          updated_at?: string
          value_json?: Json | null
        }
        Update: {
          field_id?: string
          id?: string
          log_entry_id?: string
          updated_at?: string
          value_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "log_entry_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entry_values_log_entry_id_fkey"
            columns: ["log_entry_id"]
            isOneToOne: false
            referencedRelation: "log_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      log_type_fields: {
        Row: {
          condition_json: Json | null
          created_at: string
          field_id: string
          id: string
          log_type: Database["public"]["Enums"]["log_type"]
          required: boolean
          section: string
          sort_order: number
        }
        Insert: {
          condition_json?: Json | null
          created_at?: string
          field_id: string
          id?: string
          log_type: Database["public"]["Enums"]["log_type"]
          required?: boolean
          section: string
          sort_order: number
        }
        Update: {
          condition_json?: Json | null
          created_at?: string
          field_id?: string
          id?: string
          log_type?: Database["public"]["Enums"]["log_type"]
          required?: boolean
          section?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "log_type_fields_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_logs: {
        Row: {
          asana_comment_gid: string | null
          asana_task_gid: string | null
          author_name: string | null
          bar_id: string
          content: string
          created_at: string | null
          date: string
          id: string
          log_type: string
          synced_at: string | null
          venue_id: string | null
        }
        Insert: {
          asana_comment_gid?: string | null
          asana_task_gid?: string | null
          author_name?: string | null
          bar_id: string
          content: string
          created_at?: string | null
          date: string
          id?: string
          log_type: string
          synced_at?: string | null
          venue_id?: string | null
        }
        Update: {
          asana_comment_gid?: string | null
          asana_task_gid?: string | null
          author_name?: string | null
          bar_id?: string
          content?: string
          created_at?: string | null
          date?: string
          id?: string
          log_type?: string
          synced_at?: string | null
          venue_id?: string | null
        }
        Relationships: []
      }
      manual_upload_history: {
        Row: {
          bar_id: string | null
          data_type: string
          date_range_end: string
          date_range_start: string
          file_name: string | null
          id: string
          method: string
          previous_values: Json | null
          record_count: number
          reverted_at: string | null
          uploaded_at: string
          uploaded_by: string | null
          venue_id: string | null
        }
        Insert: {
          bar_id?: string | null
          data_type?: string
          date_range_end: string
          date_range_start: string
          file_name?: string | null
          id?: string
          method?: string
          previous_values?: Json | null
          record_count?: number
          reverted_at?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          venue_id?: string | null
        }
        Update: {
          bar_id?: string | null
          data_type?: string
          date_range_end?: string
          date_range_start?: string
          file_name?: string | null
          id?: string
          method?: string
          previous_values?: Json | null
          record_count?: number
          reverted_at?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_upload_history_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      map_pack_keywords: {
        Row: {
          consecutive_failures: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          keyword: string
          last_checked_at: string | null
          priority: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keyword: string
          last_checked_at?: string | null
          priority?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keyword?: string
          last_checked_at?: string | null
          priority?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_pack_keywords_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      map_pack_run_log: {
        Row: {
          errors: Json
          finished_at: string | null
          id: string
          keywords_queried: number
          started_at: string
          trigger_source: string
          venues_processed: number
        }
        Insert: {
          errors?: Json
          finished_at?: string | null
          id?: string
          keywords_queried?: number
          started_at?: string
          trigger_source?: string
          venues_processed?: number
        }
        Update: {
          errors?: Json
          finished_at?: string | null
          id?: string
          keywords_queried?: number
          started_at?: string
          trigger_source?: string
          venues_processed?: number
        }
        Relationships: []
      }
      map_pack_snapshots: {
        Row: {
          checked_at: string
          created_at: string
          id: string
          in_map_pack: boolean | null
          keyword: string
          keyword_id: string | null
          query_error: string | null
          query_lat: number | null
          query_lng: number | null
          rank: number | null
          top_competitors: Json
          total_results: number
          venue_id: string
        }
        Insert: {
          checked_at?: string
          created_at?: string
          id?: string
          in_map_pack?: boolean | null
          keyword: string
          keyword_id?: string | null
          query_error?: string | null
          query_lat?: number | null
          query_lng?: number | null
          rank?: number | null
          top_competitors?: Json
          total_results?: number
          venue_id: string
        }
        Update: {
          checked_at?: string
          created_at?: string
          id?: string
          in_map_pack?: boolean | null
          keyword?: string
          keyword_id?: string | null
          query_error?: string | null
          query_lat?: number | null
          query_lng?: number | null
          rank?: number | null
          top_competitors?: Json
          total_results?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_pack_snapshots_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "map_pack_keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_pack_snapshots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      map_pack_trigger_log: {
        Row: {
          last_triggered_at: string
          triggered_by: string | null
          venue_id: string
        }
        Insert: {
          last_triggered_at?: string
          triggered_by?: string | null
          venue_id: string
        }
        Update: {
          last_triggered_at?: string
          triggered_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_pack_trigger_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          assigned_to: string | null
          attachments: Json
          auto_analysis_enabled: boolean
          brand_partner: string | null
          brand_partner_contribution: number | null
          budget: number | null
          channels: Json
          created_at: string
          description: string
          end_date: string
          end_time: string | null
          execution_adapter: Json | null
          expected_guest_count: number | null
          expected_revenue_impact: number | null
          external_subsource: string | null
          id: string
          internal_notes: string | null
          last_synced_from: string | null
          linked_menu_items: Json
          linked_toast_promo_code: string | null
          missing_fields: Json
          needs_details: boolean
          objective: string
          origin: string
          originating_finding_id: string | null
          recurrence: string
          results: Json | null
          start_date: string
          start_time: string | null
          status: string
          success_metric: string
          sync_lost: boolean
          target_audience: string
          title: string
          type: string
          updated_at: string
          venue_id: string
          venue_name: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json
          auto_analysis_enabled?: boolean
          brand_partner?: string | null
          brand_partner_contribution?: number | null
          budget?: number | null
          channels?: Json
          created_at?: string
          description?: string
          end_date: string
          end_time?: string | null
          execution_adapter?: Json | null
          expected_guest_count?: number | null
          expected_revenue_impact?: number | null
          external_subsource?: string | null
          id: string
          internal_notes?: string | null
          last_synced_from?: string | null
          linked_menu_items?: Json
          linked_toast_promo_code?: string | null
          missing_fields?: Json
          needs_details?: boolean
          objective?: string
          origin: string
          originating_finding_id?: string | null
          recurrence?: string
          results?: Json | null
          start_date: string
          start_time?: string | null
          status?: string
          success_metric?: string
          sync_lost?: boolean
          target_audience?: string
          title: string
          type: string
          updated_at?: string
          venue_id: string
          venue_name: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json
          auto_analysis_enabled?: boolean
          brand_partner?: string | null
          brand_partner_contribution?: number | null
          budget?: number | null
          channels?: Json
          created_at?: string
          description?: string
          end_date?: string
          end_time?: string | null
          execution_adapter?: Json | null
          expected_guest_count?: number | null
          expected_revenue_impact?: number | null
          external_subsource?: string | null
          id?: string
          internal_notes?: string | null
          last_synced_from?: string | null
          linked_menu_items?: Json
          linked_toast_promo_code?: string | null
          missing_fields?: Json
          needs_details?: boolean
          objective?: string
          origin?: string
          originating_finding_id?: string | null
          recurrence?: string
          results?: Json | null
          start_date?: string
          start_time?: string | null
          status?: string
          success_metric?: string
          sync_lost?: boolean
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string
          venue_id?: string
          venue_name?: string
        }
        Relationships: []
      }
      marketing_events: {
        Row: {
          actual_attendance: number | null
          content_captured: boolean | null
          content_notes: string | null
          content_posted: boolean | null
          created_at: string
          description: string | null
          event_date: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["event_type_enum"] | null
          expected_attendance: number | null
          id: string
          marketing_spend: number | null
          performance_rating:
            | Database["public"]["Enums"]["performance_label"]
            | null
          promoted_channels: string[] | null
          repeat_event: boolean | null
          revenue_estimate: number | null
          venue_id: string
          week_id: string | null
          what_didnt_work: string | null
          what_worked: string | null
        }
        Insert: {
          actual_attendance?: number | null
          content_captured?: boolean | null
          content_notes?: string | null
          content_posted?: boolean | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name: string
          event_type?: Database["public"]["Enums"]["event_type_enum"] | null
          expected_attendance?: number | null
          id?: string
          marketing_spend?: number | null
          performance_rating?:
            | Database["public"]["Enums"]["performance_label"]
            | null
          promoted_channels?: string[] | null
          repeat_event?: boolean | null
          revenue_estimate?: number | null
          venue_id: string
          week_id?: string | null
          what_didnt_work?: string | null
          what_worked?: string | null
        }
        Update: {
          actual_attendance?: number | null
          content_captured?: boolean | null
          content_notes?: string | null
          content_posted?: boolean | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name?: string
          event_type?: Database["public"]["Enums"]["event_type_enum"] | null
          expected_attendance?: number | null
          id?: string
          marketing_spend?: number | null
          performance_rating?:
            | Database["public"]["Enums"]["performance_label"]
            | null
          promoted_channels?: string[] | null
          repeat_event?: boolean | null
          revenue_estimate?: number | null
          venue_id?: string
          week_id?: string | null
          what_didnt_work?: string | null
          what_worked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_events_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "marketing_events_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      online_reviews: {
        Row: {
          avg_rating: number | null
          created_at: string
          id: string
          new_reviews_count: number | null
          notable_quotes: string | null
          platform: Database["public"]["Enums"]["review_platform"]
          response_needed_count: number | null
          themes_top: string | null
          venue_id: string
          week_id: string
        }
        Insert: {
          avg_rating?: number | null
          created_at?: string
          id?: string
          new_reviews_count?: number | null
          notable_quotes?: string | null
          platform: Database["public"]["Enums"]["review_platform"]
          response_needed_count?: number | null
          themes_top?: string | null
          venue_id: string
          week_id: string
        }
        Update: {
          avg_rating?: number | null
          created_at?: string
          id?: string
          new_reviews_count?: number | null
          notable_quotes?: string | null
          platform?: Database["public"]["Enums"]["review_platform"]
          response_needed_count?: number | null
          themes_top?: string | null
          venue_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_reviews_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "online_reviews_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      period_config: {
        Row: {
          bar_id: string
          check_avg_target: number | null
          composite_rating_target: number | null
          comps_pct_target: number | null
          created_at: string
          discount_pct_target: number | null
          effective_end: string | null
          effective_start: string
          employee_logs_target: number | null
          engage_score_target: number | null
          google_rating_target: number | null
          guest_experience_min_score: number | null
          id: string
          labor_pct_target: number | null
          name: string | null
          overtime_rate_target: number | null
          promo_redemptions_target: number | null
          promos_events_target: number | null
          refund_pct_target: number | null
          schedule_variance_target: number | null
          sidework_completion_target: number | null
          splh_target: number | null
          target_content_capture_pct: number | null
          target_events_per_month: number | null
          target_social_posts_week: number | null
          task_completion_target: number | null
          ticket_time_over_20_pct_target: number | null
          tip_pct_target: number | null
          turn_time_target_min: number | null
          unpaid_amount_target: number | null
          updated_at: string
          venue_id: string | null
          void_rate_target: number | null
          weekly_aov_target: number | null
          weekly_guests_target: number | null
          weekly_net_sales_target: number | null
          weekly_orders_target: number | null
          weight_guest: number | null
          weight_labor: number | null
          weight_operations: number | null
          weight_revenue: number | null
        }
        Insert: {
          bar_id: string
          check_avg_target?: number | null
          composite_rating_target?: number | null
          comps_pct_target?: number | null
          created_at?: string
          discount_pct_target?: number | null
          effective_end?: string | null
          effective_start: string
          employee_logs_target?: number | null
          engage_score_target?: number | null
          google_rating_target?: number | null
          guest_experience_min_score?: number | null
          id?: string
          labor_pct_target?: number | null
          name?: string | null
          overtime_rate_target?: number | null
          promo_redemptions_target?: number | null
          promos_events_target?: number | null
          refund_pct_target?: number | null
          schedule_variance_target?: number | null
          sidework_completion_target?: number | null
          splh_target?: number | null
          target_content_capture_pct?: number | null
          target_events_per_month?: number | null
          target_social_posts_week?: number | null
          task_completion_target?: number | null
          ticket_time_over_20_pct_target?: number | null
          tip_pct_target?: number | null
          turn_time_target_min?: number | null
          unpaid_amount_target?: number | null
          updated_at?: string
          venue_id?: string | null
          void_rate_target?: number | null
          weekly_aov_target?: number | null
          weekly_guests_target?: number | null
          weekly_net_sales_target?: number | null
          weekly_orders_target?: number | null
          weight_guest?: number | null
          weight_labor?: number | null
          weight_operations?: number | null
          weight_revenue?: number | null
        }
        Update: {
          bar_id?: string
          check_avg_target?: number | null
          composite_rating_target?: number | null
          comps_pct_target?: number | null
          created_at?: string
          discount_pct_target?: number | null
          effective_end?: string | null
          effective_start?: string
          employee_logs_target?: number | null
          engage_score_target?: number | null
          google_rating_target?: number | null
          guest_experience_min_score?: number | null
          id?: string
          labor_pct_target?: number | null
          name?: string | null
          overtime_rate_target?: number | null
          promo_redemptions_target?: number | null
          promos_events_target?: number | null
          refund_pct_target?: number | null
          schedule_variance_target?: number | null
          sidework_completion_target?: number | null
          splh_target?: number | null
          target_content_capture_pct?: number | null
          target_events_per_month?: number | null
          target_social_posts_week?: number | null
          task_completion_target?: number | null
          ticket_time_over_20_pct_target?: number | null
          tip_pct_target?: number | null
          turn_time_target_min?: number | null
          unpaid_amount_target?: number | null
          updated_at?: string
          venue_id?: string | null
          void_rate_target?: number | null
          weekly_aov_target?: number | null
          weekly_guests_target?: number | null
          weekly_net_sales_target?: number | null
          weekly_orders_target?: number | null
          weight_guest?: number | null
          weight_labor?: number | null
          weight_operations?: number | null
          weight_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "period_config_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      pillar_templates: {
        Row: {
          created_at: string
          data_source: string | null
          id: string
          pillar_key: string
          pillar_label: string
          project_type: Database["public"]["Enums"]["project_type_enum"]
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          id?: string
          pillar_key: string
          pillar_label: string
          project_type: Database["public"]["Enums"]["project_type_enum"]
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          data_source?: string | null
          id?: string
          pillar_key?: string
          pillar_label?: string
          project_type?: Database["public"]["Enums"]["project_type_enum"]
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          asana_gid: string | null
          assigned_bar_id: string | null
          assigned_bar_name: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          asana_gid?: string | null
          assigned_bar_id?: string | null
          assigned_bar_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          asana_gid?: string | null
          assigned_bar_id?: string | null
          assigned_bar_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_pillar_overrides: {
        Row: {
          created_at: string
          data_source: string | null
          id: string
          pillar_key: string
          pillar_label: string
          project_id: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          id?: string
          pillar_key: string
          pillar_label: string
          project_id: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          data_source?: string | null
          id?: string
          pillar_key?: string
          pillar_label?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_pillar_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pillar_scores: {
        Row: {
          created_at: string
          id: string
          note: string | null
          pillar_key: string
          project_id: string
          score: number | null
          updated_at: string
          updated_by: string | null
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          pillar_key: string
          project_id: string
          score?: number | null
          updated_at?: string
          updated_by?: string | null
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          pillar_key?: string
          project_id?: string
          score?: number | null
          updated_at?: string
          updated_by?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_pillar_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_redemptions: {
        Row: {
          created_at: string
          estimated_revenue_lift: number | null
          id: string
          promotion_id: string
          quantity: number | null
          redemption_count: number | null
          redemption_date: string | null
          total_discount_given: number | null
          venue_id: string
          week_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_revenue_lift?: number | null
          id?: string
          promotion_id: string
          quantity?: number | null
          redemption_count?: number | null
          redemption_date?: string | null
          total_discount_given?: number | null
          venue_id: string
          week_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_revenue_lift?: number | null
          id?: string
          promotion_id?: string
          quantity?: number | null
          redemption_count?: number | null
          redemption_date?: string | null
          total_discount_given?: number | null
          venue_id?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "promo_redemptions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          promo_type: Database["public"]["Enums"]["promo_type"] | null
          start_date: string | null
          venue_id: string
          week_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          promo_type?: Database["public"]["Enums"]["promo_type"] | null
          start_date?: string | null
          venue_id: string
          week_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          promo_type?: Database["public"]["Enums"]["promo_type"] | null
          start_date?: string | null
          venue_id?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "promotions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      review_extraction_runs: {
        Row: {
          error: string | null
          model: string | null
          ok: boolean
          processed_at: string
          review_id: string
          venue_id: string
        }
        Insert: {
          error?: string | null
          model?: string | null
          ok?: boolean
          processed_at?: string
          review_id: string
          venue_id: string
        }
        Update: {
          error?: string | null
          model?: string | null
          ok?: boolean
          processed_at?: string
          review_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_extraction_runs_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "google_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_snapshots: {
        Row: {
          bar_id: string
          created_at: string
          google_rating: number | null
          google_review_count: number | null
          id: string
          rating_change: number | null
          snapshot_date: string
          yelp_rating: number | null
          yelp_review_count: number | null
        }
        Insert: {
          bar_id: string
          created_at?: string
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          rating_change?: number | null
          snapshot_date: string
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Update: {
          bar_id?: string
          created_at?: string
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          rating_change?: number | null
          snapshot_date?: string
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_snapshots_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      review_themes: {
        Row: {
          confidence: string
          context: string | null
          created_at: string
          excerpt: string | null
          id: string
          review_id: string
          theme_category: string
          theme_label: string
          theme_sentiment: string
          venue_id: string
        }
        Insert: {
          confidence?: string
          context?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          review_id: string
          theme_category: string
          theme_label: string
          theme_sentiment: string
          venue_id: string
        }
        Update: {
          confidence?: string
          context?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          review_id?: string
          theme_category?: string
          theme_label?: string
          theme_sentiment?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_themes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "google_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      role_page_defaults: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          page_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          page_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          page_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sculpture_site_mappings: {
        Row: {
          created_at: string
          id: string
          site_id: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          site_id: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          site_id?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sculpture_site_mappings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_shop_audits: {
        Row: {
          amount_spent: number | null
          arrival_time: string | null
          business_level: string | null
          created_at: string
          departure_time: string | null
          duration_minutes: number | null
          failed_areas: string | null
          failed_questions: string[] | null
          guest_count_estimate: number | null
          id: string
          notes: string | null
          party_size: number | null
          positives: string | null
          report_pdf_url: string | null
          scores_detail: Json
          server_bartender_name: string | null
          shop_date: string
          shop_day: string | null
          shopper_age: number | null
          shopper_gender: string | null
          summary_narrative: string | null
          top_performers: string[] | null
          total_points_earned: number | null
          total_points_possible: number | null
          total_score_pct: number | null
          venue_id: string
          week_id: string
        }
        Insert: {
          amount_spent?: number | null
          arrival_time?: string | null
          business_level?: string | null
          created_at?: string
          departure_time?: string | null
          duration_minutes?: number | null
          failed_areas?: string | null
          failed_questions?: string[] | null
          guest_count_estimate?: number | null
          id?: string
          notes?: string | null
          party_size?: number | null
          positives?: string | null
          report_pdf_url?: string | null
          scores_detail?: Json
          server_bartender_name?: string | null
          shop_date: string
          shop_day?: string | null
          shopper_age?: number | null
          shopper_gender?: string | null
          summary_narrative?: string | null
          top_performers?: string[] | null
          total_points_earned?: number | null
          total_points_possible?: number | null
          total_score_pct?: number | null
          venue_id: string
          week_id: string
        }
        Update: {
          amount_spent?: number | null
          arrival_time?: string | null
          business_level?: string | null
          created_at?: string
          departure_time?: string | null
          duration_minutes?: number | null
          failed_areas?: string | null
          failed_questions?: string[] | null
          guest_count_estimate?: number | null
          id?: string
          notes?: string | null
          party_size?: number | null
          positives?: string | null
          report_pdf_url?: string | null
          scores_detail?: Json
          server_bartender_name?: string | null
          shop_date?: string
          shop_day?: string | null
          shopper_age?: number | null
          shopper_gender?: string | null
          summary_narrative?: string | null
          top_performers?: string[] | null
          total_points_earned?: number | null
          total_points_possible?: number | null
          total_score_pct?: number | null
          venue_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_shop_audits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_shop_audits_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "secret_shop_audits_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_feedback: {
        Row: {
          bar_id: string
          comment: string | null
          created_at: string | null
          employee_id: number | null
          employee_name: string | null
          feedback_date: string
          id: string
          location_id: number | null
          rating: number
          seven_shifts_id: number | null
          shift_end: string | null
          shift_id: number | null
          shift_start: string | null
        }
        Insert: {
          bar_id: string
          comment?: string | null
          created_at?: string | null
          employee_id?: number | null
          employee_name?: string | null
          feedback_date: string
          id?: string
          location_id?: number | null
          rating: number
          seven_shifts_id?: number | null
          shift_end?: string | null
          shift_id?: number | null
          shift_start?: string | null
        }
        Update: {
          bar_id?: string
          comment?: string | null
          created_at?: string | null
          employee_id?: number | null
          employee_name?: string | null
          feedback_date?: string
          id?: string
          location_id?: number | null
          rating?: number
          seven_shifts_id?: number | null
          shift_end?: string | null
          shift_id?: number | null
          shift_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_feedback_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_logs: {
        Row: {
          ai_auto_tags: Json | null
          ai_sentiment: string | null
          ai_severity: string | null
          ai_summary: string | null
          asana_comment_gid: string | null
          asana_source_id: string | null
          asana_source_label: string | null
          asana_task_gid: string | null
          author_name: string | null
          author_user_id: string | null
          bar_id: string
          boh_rating: number | null
          callout_names: string | null
          callouts: number | null
          coaching_notes: Json | null
          comment_created_at: string | null
          comp_reasons: string | null
          comps_given: number | null
          created_at: string
          date: string
          day_id: string | null
          description: string | null
          foh_rating: number | null
          follow_up_needed: boolean | null
          follow_up_task_id: string | null
          guest_complaints: Json | null
          guest_compliments: Json | null
          guest_vibe: string | null
          handoff_notes: string | null
          headlines: string | null
          hospitality_rating: number | null
          id: string
          improvement_suggestions: string | null
          is_draft: boolean
          is_parsed: boolean
          is_processed: boolean
          items_86d: Json | null
          log_category: string | null
          log_intent: string | null
          log_type: string | null
          low_stock: Json | null
          maintenance_issues: Json | null
          new_customers: Json | null
          pacing: string | null
          processed_at: string | null
          product_rating: number | null
          raw_text: string | null
          safety_concerns: Json | null
          shift: string | null
          shift_challenges: string | null
          shift_summary: string | null
          shift_wins: string | null
          source: string | null
          staff_highlights: Json | null
          staffing_notes: string | null
          submitted_at: string | null
          team_energy: string | null
          tomorrow_focus: string | null
          updated_at: string
          venue_id: string | null
          voice_audio_url: string | null
          voice_transcript: string | null
          week_id: string | null
        }
        Insert: {
          ai_auto_tags?: Json | null
          ai_sentiment?: string | null
          ai_severity?: string | null
          ai_summary?: string | null
          asana_comment_gid?: string | null
          asana_source_id?: string | null
          asana_source_label?: string | null
          asana_task_gid?: string | null
          author_name?: string | null
          author_user_id?: string | null
          bar_id: string
          boh_rating?: number | null
          callout_names?: string | null
          callouts?: number | null
          coaching_notes?: Json | null
          comment_created_at?: string | null
          comp_reasons?: string | null
          comps_given?: number | null
          created_at?: string
          date: string
          day_id?: string | null
          description?: string | null
          foh_rating?: number | null
          follow_up_needed?: boolean | null
          follow_up_task_id?: string | null
          guest_complaints?: Json | null
          guest_compliments?: Json | null
          guest_vibe?: string | null
          handoff_notes?: string | null
          headlines?: string | null
          hospitality_rating?: number | null
          id?: string
          improvement_suggestions?: string | null
          is_draft?: boolean
          is_parsed?: boolean
          is_processed?: boolean
          items_86d?: Json | null
          log_category?: string | null
          log_intent?: string | null
          log_type?: string | null
          low_stock?: Json | null
          maintenance_issues?: Json | null
          new_customers?: Json | null
          pacing?: string | null
          processed_at?: string | null
          product_rating?: number | null
          raw_text?: string | null
          safety_concerns?: Json | null
          shift?: string | null
          shift_challenges?: string | null
          shift_summary?: string | null
          shift_wins?: string | null
          source?: string | null
          staff_highlights?: Json | null
          staffing_notes?: string | null
          submitted_at?: string | null
          team_energy?: string | null
          tomorrow_focus?: string | null
          updated_at?: string
          venue_id?: string | null
          voice_audio_url?: string | null
          voice_transcript?: string | null
          week_id?: string | null
        }
        Update: {
          ai_auto_tags?: Json | null
          ai_sentiment?: string | null
          ai_severity?: string | null
          ai_summary?: string | null
          asana_comment_gid?: string | null
          asana_source_id?: string | null
          asana_source_label?: string | null
          asana_task_gid?: string | null
          author_name?: string | null
          author_user_id?: string | null
          bar_id?: string
          boh_rating?: number | null
          callout_names?: string | null
          callouts?: number | null
          coaching_notes?: Json | null
          comment_created_at?: string | null
          comp_reasons?: string | null
          comps_given?: number | null
          created_at?: string
          date?: string
          day_id?: string | null
          description?: string | null
          foh_rating?: number | null
          follow_up_needed?: boolean | null
          follow_up_task_id?: string | null
          guest_complaints?: Json | null
          guest_compliments?: Json | null
          guest_vibe?: string | null
          handoff_notes?: string | null
          headlines?: string | null
          hospitality_rating?: number | null
          id?: string
          improvement_suggestions?: string | null
          is_draft?: boolean
          is_parsed?: boolean
          is_processed?: boolean
          items_86d?: Json | null
          log_category?: string | null
          log_intent?: string | null
          log_type?: string | null
          low_stock?: Json | null
          maintenance_issues?: Json | null
          new_customers?: Json | null
          pacing?: string | null
          processed_at?: string | null
          product_rating?: number | null
          raw_text?: string | null
          safety_concerns?: Json | null
          shift?: string | null
          shift_challenges?: string | null
          shift_summary?: string | null
          shift_wins?: string | null
          source?: string | null
          staff_highlights?: Json | null
          staffing_notes?: string | null
          submitted_at?: string | null
          team_energy?: string | null
          tomorrow_focus?: string | null
          updated_at?: string
          venue_id?: string | null
          voice_audio_url?: string | null
          voice_transcript?: string | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_logs_asana_source_id_fkey"
            columns: ["asana_source_id"]
            isOneToOne: false
            referencedRelation: "venue_asana_log_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_logs_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_logs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "days"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_posts: {
        Row: {
          boost_spend: number | null
          clicks: number | null
          comments: number | null
          content: string | null
          created_at: string
          description: string | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          is_boosted: boolean | null
          likes: number | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_date: string | null
          post_type: Database["public"]["Enums"]["post_type"] | null
          post_url: string | null
          profile_visits: number | null
          reach: number | null
          saves: number | null
          shares: number | null
          venue_id: string
          video_watch_time: number | null
          views: number | null
          week_id: string | null
        }
        Insert: {
          boost_spend?: number | null
          clicks?: number | null
          comments?: number | null
          content?: string | null
          created_at?: string
          description?: string | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          is_boosted?: boolean | null
          likes?: number | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_date?: string | null
          post_type?: Database["public"]["Enums"]["post_type"] | null
          post_url?: string | null
          profile_visits?: number | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          venue_id: string
          video_watch_time?: number | null
          views?: number | null
          week_id?: string | null
        }
        Update: {
          boost_spend?: number | null
          clicks?: number | null
          comments?: number | null
          content?: string | null
          created_at?: string
          description?: string | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          is_boosted?: boolean | null
          likes?: number | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_date?: string | null
          post_type?: Database["public"]["Enums"]["post_type"] | null
          post_url?: string | null
          profile_visits?: number | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          venue_id?: string
          video_watch_time?: number | null
          views?: number | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "social_media_posts_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_announcements: {
        Row: {
          bar_id: string
          created_at: string
          created_by: string
          departments: string[]
          expires_at: string | null
          id: string
          message: string
          title: string
          urgent: boolean
          venue_id: string | null
        }
        Insert: {
          bar_id: string
          created_at?: string
          created_by: string
          departments?: string[]
          expires_at?: string | null
          id?: string
          message: string
          title: string
          urgent?: boolean
          venue_id?: string | null
        }
        Update: {
          bar_id?: string
          created_at?: string
          created_by?: string
          departments?: string[]
          expires_at?: string | null
          id?: string
          message?: string
          title?: string
          urgent?: boolean
          venue_id?: string | null
        }
        Relationships: []
      }
      suppressed_insights: {
        Row: {
          bar_id: string | null
          created_at: string
          current_value: number | null
          id: string
          original_payload: Json | null
          source_metric: string
          suspected_reason: string
          threshold_used: string | null
          trailing_mean: number | null
          trailing_n: number | null
          trailing_sd: number | null
          venue_id: string | null
          would_have_fired_for_date: string | null
        }
        Insert: {
          bar_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          original_payload?: Json | null
          source_metric: string
          suspected_reason?: string
          threshold_used?: string | null
          trailing_mean?: number | null
          trailing_n?: number | null
          trailing_sd?: number | null
          venue_id?: string | null
          would_have_fired_for_date?: string | null
        }
        Update: {
          bar_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          original_payload?: Json | null
          source_metric?: string
          suspected_reason?: string
          threshold_used?: string | null
          trailing_mean?: number | null
          trailing_n?: number | null
          trailing_sd?: number | null
          venue_id?: string | null
          would_have_fired_for_date?: string | null
        }
        Relationships: []
      }
      suppressed_metrics: {
        Row: {
          bar_id: string | null
          created_at: string
          days_present: number | null
          details: Json | null
          gate: string
          id: string
          metric_key: string
          reason: string
          threshold: number | null
          valid_days: number | null
          venue_id: string | null
          week_start: string
        }
        Insert: {
          bar_id?: string | null
          created_at?: string
          days_present?: number | null
          details?: Json | null
          gate: string
          id?: string
          metric_key: string
          reason: string
          threshold?: number | null
          valid_days?: number | null
          venue_id?: string | null
          week_start: string
        }
        Update: {
          bar_id?: string | null
          created_at?: string
          days_present?: number | null
          details?: Json | null
          gate?: string
          id?: string
          metric_key?: string
          reason?: string
          threshold?: number | null
          valid_days?: number | null
          venue_id?: string | null
          week_start?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          ai_cost_usd: number | null
          ai_latency_ms: number | null
          alert_task_gid: string | null
          bar_id: string
          completed_at: string | null
          completion_tokens: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          notes: string | null
          prompt_tokens: number | null
          records_created: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string
          status: string
          sync_type: string
          week_id: string | null
        }
        Insert: {
          ai_cost_usd?: number | null
          ai_latency_ms?: number | null
          alert_task_gid?: string | null
          bar_id: string
          completed_at?: string | null
          completion_tokens?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          prompt_tokens?: number | null
          records_created?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_type: string
          week_id?: string | null
        }
        Update: {
          ai_cost_usd?: number | null
          ai_latency_ms?: number | null
          alert_task_gid?: string | null
          bar_id?: string
          completed_at?: string | null
          completion_tokens?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          prompt_tokens?: number | null
          records_created?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          mentions: Json | null
          task_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentions?: Json | null
          task_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentions?: Json | null
          task_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_performance_briefs: {
        Row: {
          bar_id: string
          generated_at: string
          long_brief: string | null
          short_brief: string | null
          week_id: string
        }
        Insert: {
          bar_id: string
          generated_at?: string
          long_brief?: string | null
          short_brief?: string | null
          week_id: string
        }
        Update: {
          bar_id?: string
          generated_at?: string
          long_brief?: string | null
          short_brief?: string | null
          week_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          action_card_id: string | null
          assignee_id: string | null
          bar_id: string
          completed_at: string | null
          content_item_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          action_card_id?: string | null
          assignee_id?: string | null
          bar_id: string
          completed_at?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          action_card_id?: string | null
          assignee_id?: string | null
          bar_id?: string
          completed_at?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          auto_clocked_out: boolean | null
          business_date: string
          created_at: string
          deleted: boolean | null
          employee_id: string | null
          hourly_wage: number | null
          id: string
          in_date: string
          modified_date: string | null
          out_date: string | null
          overtime_hours: number | null
          raw: Json | null
          regular_hours: number | null
          toast_employee_guid: string
          toast_entry_guid: string
          toast_job_guid: string | null
          toast_job_title: string | null
          toast_shift_guid: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          auto_clocked_out?: boolean | null
          business_date: string
          created_at?: string
          deleted?: boolean | null
          employee_id?: string | null
          hourly_wage?: number | null
          id?: string
          in_date: string
          modified_date?: string | null
          out_date?: string | null
          overtime_hours?: number | null
          raw?: Json | null
          regular_hours?: number | null
          toast_employee_guid: string
          toast_entry_guid: string
          toast_job_guid?: string | null
          toast_job_title?: string | null
          toast_shift_guid?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          auto_clocked_out?: boolean | null
          business_date?: string
          created_at?: string
          deleted?: boolean | null
          employee_id?: string | null
          hourly_wage?: number | null
          id?: string
          in_date?: string
          modified_date?: string | null
          out_date?: string | null
          overtime_hours?: number | null
          raw?: Json | null
          regular_hours?: number | null
          toast_employee_guid?: string
          toast_entry_guid?: string
          toast_job_guid?: string | null
          toast_job_title?: string | null
          toast_shift_guid?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_breaks: {
        Row: {
          audit_response: boolean | null
          break_type_guid: string | null
          created_at: string
          id: string
          in_date: string | null
          missed: boolean | null
          out_date: string | null
          paid: boolean | null
          time_entry_id: string
          toast_break_guid: string
          waived: boolean | null
        }
        Insert: {
          audit_response?: boolean | null
          break_type_guid?: string | null
          created_at?: string
          id?: string
          in_date?: string | null
          missed?: boolean | null
          out_date?: string | null
          paid?: boolean | null
          time_entry_id: string
          toast_break_guid: string
          waived?: boolean | null
        }
        Update: {
          audit_response?: boolean | null
          break_type_guid?: string | null
          created_at?: string
          id?: string
          in_date?: string | null
          missed?: boolean | null
          out_date?: string | null
          paid?: boolean | null
          time_entry_id?: string
          toast_break_guid?: string
          waived?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_breaks_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      toast_benchmarks: {
        Row: {
          created_at: string
          id: string
          import_date: string | null
          peer_avg_order_value: number | null
          peer_items_per_order: number | null
          peer_net_sales: number | null
          peer_order_count: number | null
          peer_quantity_sold: number | null
          peer_splh: number | null
          period_end: string | null
          period_start: string | null
          venue_id: string
          vs_peer_aov_pct: number | null
          vs_peer_net_sales_pct: number | null
          vs_peer_orders_pct: number | null
          vs_peer_quantity_pct: number | null
          vs_peer_splh_pct: number | null
          week_id: string
          your_avg_order_value: number | null
          your_items_per_order: number | null
          your_net_sales: number | null
          your_order_count: number | null
          your_quantity_sold: number | null
          your_splh: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          import_date?: string | null
          peer_avg_order_value?: number | null
          peer_items_per_order?: number | null
          peer_net_sales?: number | null
          peer_order_count?: number | null
          peer_quantity_sold?: number | null
          peer_splh?: number | null
          period_end?: string | null
          period_start?: string | null
          venue_id: string
          vs_peer_aov_pct?: number | null
          vs_peer_net_sales_pct?: number | null
          vs_peer_orders_pct?: number | null
          vs_peer_quantity_pct?: number | null
          vs_peer_splh_pct?: number | null
          week_id: string
          your_avg_order_value?: number | null
          your_items_per_order?: number | null
          your_net_sales?: number | null
          your_order_count?: number | null
          your_quantity_sold?: number | null
          your_splh?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          import_date?: string | null
          peer_avg_order_value?: number | null
          peer_items_per_order?: number | null
          peer_net_sales?: number | null
          peer_order_count?: number | null
          peer_quantity_sold?: number | null
          peer_splh?: number | null
          period_end?: string | null
          period_start?: string | null
          venue_id?: string
          vs_peer_aov_pct?: number | null
          vs_peer_net_sales_pct?: number | null
          vs_peer_orders_pct?: number | null
          vs_peer_quantity_pct?: number | null
          vs_peer_splh_pct?: number | null
          week_id?: string
          your_avg_order_value?: number | null
          your_items_per_order?: number | null
          your_net_sales?: number | null
          your_order_count?: number | null
          your_quantity_sold?: number | null
          your_splh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "toast_benchmarks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toast_benchmarks_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "toast_benchmarks_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      toast_sync_cursors: {
        Row: {
          id: string
          last_business_date: string | null
          last_modified_at: string | null
          sync_type: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          id?: string
          last_business_date?: string | null
          last_modified_at?: string | null
          sync_type: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          id?: string
          last_business_date?: string | null
          last_modified_at?: string | null
          sync_type?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toast_sync_cursors_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      top_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          item_name: string
          net_sales: number | null
          quantity_sold: number | null
          rank: number | null
          venue_id: string
          week_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          item_name: string
          net_sales?: number | null
          quantity_sold?: number | null
          rank?: number | null
          venue_id: string
          week_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          item_name?: string
          net_sales?: number | null
          quantity_sold?: number | null
          rank?: number | null
          venue_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "top_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "top_items_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "top_items_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bar_assignments: {
        Row: {
          bar_id: string
          created_at: string | null
          id: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          bar_id: string
          created_at?: string | null
          id?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          bar_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: []
      }
      user_checklist_progress: {
        Row: {
          completed_at: string
          item_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          item_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          item_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_help_state: {
        Row: {
          created_at: string
          dismissed_keys: string[]
          help_enabled: boolean
          last_backup_at: string | null
          setup_completed_at: string | null
          setup_skipped_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_keys?: string[]
          help_enabled?: boolean
          last_backup_at?: string | null
          setup_completed_at?: string | null
          setup_skipped_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_keys?: string[]
          help_enabled?: boolean
          last_backup_at?: string | null
          setup_completed_at?: string | null
          setup_skipped_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_page_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          page_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          page_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          page_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_positions: {
        Row: {
          created_at: string
          id: string
          position: Database["public"]["Enums"]["log_position"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: Database["public"]["Enums"]["log_position"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: Database["public"]["Enums"]["log_position"]
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_insight_notifications: boolean | null
          created_at: string | null
          daily_summary_email: boolean | null
          id: string
          labor_threshold_alerts: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
          weekly_report: boolean | null
        }
        Insert: {
          ai_insight_notifications?: boolean | null
          created_at?: string | null
          daily_summary_email?: boolean | null
          id?: string
          labor_threshold_alerts?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
          weekly_report?: boolean | null
        }
        Update: {
          ai_insight_notifications?: boolean | null
          created_at?: string | null
          daily_summary_email?: boolean | null
          id?: string
          labor_threshold_alerts?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_report?: boolean | null
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_venue_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_venue_roles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_asana_log_sources: {
        Row: {
          asana_gid: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          log_type: string
          sort_order: number
          source_type: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          asana_gid: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          log_type?: string
          sort_order?: number
          source_type: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          asana_gid?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          log_type?: string
          sort_order?: number
          source_type?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_asana_log_sources_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_asana_sync_health: {
        Row: {
          consecutive_failures: number
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          consecutive_failures?: number
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          consecutive_failures?: number
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: []
      }
      venue_assignments: {
        Row: {
          context: Database["public"]["Enums"]["staff_context"] | null
          created_at: string
          id: string
          is_primary: boolean
          role_at_venue: string
          user_id: string
          venue_id: string
        }
        Insert: {
          context?: Database["public"]["Enums"]["staff_context"] | null
          created_at?: string
          id?: string
          is_primary?: boolean
          role_at_venue: string
          user_id: string
          venue_id: string
        }
        Update: {
          context?: Database["public"]["Enums"]["staff_context"] | null
          created_at?: string
          id?: string
          is_primary?: boolean
          role_at_venue?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_assignments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          phone: string | null
          role_label: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          phone?: string | null
          role_label: string
          venue_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          phone?: string | null
          role_label?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_contacts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_execution_adapters: {
        Row: {
          adapter_type: string
          asana_custom_field_map: Json
          asana_project_gid: string | null
          asana_section_gid: string | null
          asana_workspace_gid: string | null
          created_at: string
          growth_audit_enabled: boolean
          last_field_setup_at: string | null
          live_writes_enabled: boolean
          updated_at: string
          venue_id: string
        }
        Insert: {
          adapter_type?: string
          asana_custom_field_map?: Json
          asana_project_gid?: string | null
          asana_section_gid?: string | null
          asana_workspace_gid?: string | null
          created_at?: string
          growth_audit_enabled?: boolean
          last_field_setup_at?: string | null
          live_writes_enabled?: boolean
          updated_at?: string
          venue_id: string
        }
        Update: {
          adapter_type?: string
          asana_custom_field_map?: Json
          asana_project_gid?: string | null
          asana_section_gid?: string | null
          asana_workspace_gid?: string | null
          created_at?: string
          growth_audit_enabled?: boolean
          last_field_setup_at?: string | null
          live_writes_enabled?: boolean
          updated_at?: string
          venue_id?: string
        }
        Relationships: []
      }
      venue_leadership_contacts: {
        Row: {
          asana_gid: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          profile_id: string | null
          role_type: string
          venue_id: string
        }
        Insert: {
          asana_gid?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          profile_id?: string | null
          role_type: string
          venue_id: string
        }
        Update: {
          asana_gid?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          profile_id?: string | null
          role_type?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_leadership_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_leadership_contacts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_onboarding_dismissals: {
        Row: {
          dismissed_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          dismissed_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          dismissed_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: []
      }
      venue_profiles: {
        Row: {
          alarm_code: string | null
          bar_seats: number | null
          brunch_hours: string | null
          business_license_expiry: string | null
          business_license_number: string | null
          cross_streets: string | null
          delivery_instructions: string | null
          dumpster_location: string | null
          electrical_panel_location: string | null
          full_address: string | null
          gas_shutoff_location: string | null
          google_maps_link: string | null
          happy_hour_times: string | null
          has_kitchen: boolean | null
          has_patio: boolean | null
          has_private_room: boolean | null
          has_stage: boolean | null
          health_permit_expiry: string | null
          health_permit_number: string | null
          hours_friday: string | null
          hours_monday: string | null
          hours_saturday: string | null
          hours_sunday: string | null
          hours_thursday: string | null
          hours_tuesday: string | null
          hours_wednesday: string | null
          ice_machine_location: string | null
          id: string
          kitchen_close_time: string | null
          kitchen_type: string | null
          late_night_hours: string | null
          liquor_license_expiry: string | null
          liquor_license_number: string | null
          max_occupancy: number | null
          music_system: string | null
          neighborhood: string | null
          num_pos_terminals: number | null
          num_tvs: number | null
          office_location: string | null
          parking_situation: string | null
          pos_system: string | null
          private_event_capacity: number | null
          public_transit: string | null
          quirks_and_notes: string | null
          reservation_system: string | null
          safe_combo: string | null
          scheduling_system: string | null
          seating_capacity_indoor: number | null
          seating_capacity_outdoor: number | null
          security_warning_flag: string | null
          square_footage: number | null
          storage_location: string | null
          updated_at: string
          venue_description: string | null
          venue_id: string
          walk_in_location: string | null
          water_shutoff_location: string | null
          wifi_network: string | null
          wifi_password: string | null
        }
        Insert: {
          alarm_code?: string | null
          bar_seats?: number | null
          brunch_hours?: string | null
          business_license_expiry?: string | null
          business_license_number?: string | null
          cross_streets?: string | null
          delivery_instructions?: string | null
          dumpster_location?: string | null
          electrical_panel_location?: string | null
          full_address?: string | null
          gas_shutoff_location?: string | null
          google_maps_link?: string | null
          happy_hour_times?: string | null
          has_kitchen?: boolean | null
          has_patio?: boolean | null
          has_private_room?: boolean | null
          has_stage?: boolean | null
          health_permit_expiry?: string | null
          health_permit_number?: string | null
          hours_friday?: string | null
          hours_monday?: string | null
          hours_saturday?: string | null
          hours_sunday?: string | null
          hours_thursday?: string | null
          hours_tuesday?: string | null
          hours_wednesday?: string | null
          ice_machine_location?: string | null
          id?: string
          kitchen_close_time?: string | null
          kitchen_type?: string | null
          late_night_hours?: string | null
          liquor_license_expiry?: string | null
          liquor_license_number?: string | null
          max_occupancy?: number | null
          music_system?: string | null
          neighborhood?: string | null
          num_pos_terminals?: number | null
          num_tvs?: number | null
          office_location?: string | null
          parking_situation?: string | null
          pos_system?: string | null
          private_event_capacity?: number | null
          public_transit?: string | null
          quirks_and_notes?: string | null
          reservation_system?: string | null
          safe_combo?: string | null
          scheduling_system?: string | null
          seating_capacity_indoor?: number | null
          seating_capacity_outdoor?: number | null
          security_warning_flag?: string | null
          square_footage?: number | null
          storage_location?: string | null
          updated_at?: string
          venue_description?: string | null
          venue_id: string
          walk_in_location?: string | null
          water_shutoff_location?: string | null
          wifi_network?: string | null
          wifi_password?: string | null
        }
        Update: {
          alarm_code?: string | null
          bar_seats?: number | null
          brunch_hours?: string | null
          business_license_expiry?: string | null
          business_license_number?: string | null
          cross_streets?: string | null
          delivery_instructions?: string | null
          dumpster_location?: string | null
          electrical_panel_location?: string | null
          full_address?: string | null
          gas_shutoff_location?: string | null
          google_maps_link?: string | null
          happy_hour_times?: string | null
          has_kitchen?: boolean | null
          has_patio?: boolean | null
          has_private_room?: boolean | null
          has_stage?: boolean | null
          health_permit_expiry?: string | null
          health_permit_number?: string | null
          hours_friday?: string | null
          hours_monday?: string | null
          hours_saturday?: string | null
          hours_sunday?: string | null
          hours_thursday?: string | null
          hours_tuesday?: string | null
          hours_wednesday?: string | null
          ice_machine_location?: string | null
          id?: string
          kitchen_close_time?: string | null
          kitchen_type?: string | null
          late_night_hours?: string | null
          liquor_license_expiry?: string | null
          liquor_license_number?: string | null
          max_occupancy?: number | null
          music_system?: string | null
          neighborhood?: string | null
          num_pos_terminals?: number | null
          num_tvs?: number | null
          office_location?: string | null
          parking_situation?: string | null
          pos_system?: string | null
          private_event_capacity?: number | null
          public_transit?: string | null
          quirks_and_notes?: string | null
          reservation_system?: string | null
          safe_combo?: string | null
          scheduling_system?: string | null
          seating_capacity_indoor?: number | null
          seating_capacity_outdoor?: number | null
          security_warning_flag?: string | null
          square_footage?: number | null
          storage_location?: string | null
          updated_at?: string
          venue_description?: string | null
          venue_id?: string
          walk_in_location?: string | null
          water_shutoff_location?: string | null
          wifi_network?: string | null
          wifi_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_programming_context: {
        Row: {
          ai_suggested_at: string | null
          ai_suggestion: Json | null
          audience_demographics: string[]
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          primary_category: string | null
          programming_features: string[]
          themes: string[]
          updated_at: string
          venue_id: string
        }
        Insert: {
          ai_suggested_at?: string | null
          ai_suggestion?: Json | null
          audience_demographics?: string[]
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          primary_category?: string | null
          programming_features?: string[]
          themes?: string[]
          updated_at?: string
          venue_id: string
        }
        Update: {
          ai_suggested_at?: string | null
          ai_suggestion?: Json | null
          audience_demographics?: string[]
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          primary_category?: string | null
          programming_features?: string[]
          themes?: string[]
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_programming_context_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_weather_grid_cache: {
        Row: {
          forecast_url: string
          grid_x: number
          grid_y: number
          lat: number
          lng: number
          office: string
          resolved_at: string
          venue_id: string
        }
        Insert: {
          forecast_url: string
          grid_x: number
          grid_y: number
          lat: number
          lng: number
          office: string
          resolved_at?: string
          venue_id: string
        }
        Update: {
          forecast_url?: string
          grid_x?: number
          grid_y?: number
          lat?: number
          lng?: number
          office?: string
          resolved_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_weather_grid_cache_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          asana_gm_log_section_gid: string | null
          asana_gm_log_task_gid: string | null
          asana_lead_log_task_gid: string | null
          asana_log_project_gid: string | null
          asana_log_section_gid: string | null
          asana_project_gid: string | null
          asana_score_assignee_gid: string | null
          asana_score_section_gid: string | null
          asana_write_project_gid: string | null
          asana_write_section_gid: string | null
          bar_code: string | null
          city: string | null
          content_status: string | null
          created_at: string
          current_secret_shop_cleanliness_pct: number | null
          current_secret_shop_date: string | null
          current_secret_shop_score_pct: number | null
          gm_name: string | null
          google_place_id: string | null
          id: string
          is_active: boolean | null
          lat: number | null
          lng: number | null
          monetization_model: string | null
          name: string
          niche: string | null
          owner_name: string | null
          project_type: Database["public"]["Enums"]["project_type_enum"]
          seven_shifts_location_id: string | null
          sevenshifts_api_enabled: boolean
          slug: string | null
          state: string | null
          subscriber_count: number | null
          task_source: string | null
          timezone: string | null
          toast_api_enabled: boolean
          toast_client_id: string | null
          toast_client_secret: string | null
          toast_restaurant_guid: string | null
          updated_at: string
          venue_name: string | null
          weekly_production_goal: number | null
          yelp_business_id: string | null
          youtube_channel_id: string | null
          youtube_channel_url: string | null
        }
        Insert: {
          address?: string | null
          asana_gm_log_section_gid?: string | null
          asana_gm_log_task_gid?: string | null
          asana_lead_log_task_gid?: string | null
          asana_log_project_gid?: string | null
          asana_log_section_gid?: string | null
          asana_project_gid?: string | null
          asana_score_assignee_gid?: string | null
          asana_score_section_gid?: string | null
          asana_write_project_gid?: string | null
          asana_write_section_gid?: string | null
          bar_code?: string | null
          city?: string | null
          content_status?: string | null
          created_at?: string
          current_secret_shop_cleanliness_pct?: number | null
          current_secret_shop_date?: string | null
          current_secret_shop_score_pct?: number | null
          gm_name?: string | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          monetization_model?: string | null
          name: string
          niche?: string | null
          owner_name?: string | null
          project_type?: Database["public"]["Enums"]["project_type_enum"]
          seven_shifts_location_id?: string | null
          sevenshifts_api_enabled?: boolean
          slug?: string | null
          state?: string | null
          subscriber_count?: number | null
          task_source?: string | null
          timezone?: string | null
          toast_api_enabled?: boolean
          toast_client_id?: string | null
          toast_client_secret?: string | null
          toast_restaurant_guid?: string | null
          updated_at?: string
          venue_name?: string | null
          weekly_production_goal?: number | null
          yelp_business_id?: string | null
          youtube_channel_id?: string | null
          youtube_channel_url?: string | null
        }
        Update: {
          address?: string | null
          asana_gm_log_section_gid?: string | null
          asana_gm_log_task_gid?: string | null
          asana_lead_log_task_gid?: string | null
          asana_log_project_gid?: string | null
          asana_log_section_gid?: string | null
          asana_project_gid?: string | null
          asana_score_assignee_gid?: string | null
          asana_score_section_gid?: string | null
          asana_write_project_gid?: string | null
          asana_write_section_gid?: string | null
          bar_code?: string | null
          city?: string | null
          content_status?: string | null
          created_at?: string
          current_secret_shop_cleanliness_pct?: number | null
          current_secret_shop_date?: string | null
          current_secret_shop_score_pct?: number | null
          gm_name?: string | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          monetization_model?: string | null
          name?: string
          niche?: string | null
          owner_name?: string | null
          project_type?: Database["public"]["Enums"]["project_type_enum"]
          seven_shifts_location_id?: string | null
          sevenshifts_api_enabled?: boolean
          slug?: string | null
          state?: string | null
          subscriber_count?: number | null
          task_source?: string | null
          timezone?: string | null
          toast_api_enabled?: boolean
          toast_client_id?: string | null
          toast_client_secret?: string | null
          toast_restaurant_guid?: string | null
          updated_at?: string
          venue_name?: string | null
          weekly_production_goal?: number | null
          yelp_business_id?: string | null
          youtube_channel_id?: string | null
          youtube_channel_url?: string | null
        }
        Relationships: []
      }
      voice_notes: {
        Row: {
          bar_id: string
          created_at: string
          created_by: string
          id: string
          transcript: string
          venue_id: string | null
        }
        Insert: {
          bar_id: string
          created_at?: string
          created_by: string
          id?: string
          transcript: string
          venue_id?: string | null
        }
        Update: {
          bar_id?: string
          created_at?: string
          created_by?: string
          id?: string
          transcript?: string
          venue_id?: string | null
        }
        Relationships: []
      }
      website_mappings: {
        Row: {
          canonical_url: string | null
          cms_detected: string | null
          consecutive_fetch_failures: number
          created_at: string
          js_heavy: boolean
          last_resolve_error: string | null
          last_resolved_at: string | null
          manual_only: boolean
          updated_at: string
          venue_id: string
          website_url: string | null
        }
        Insert: {
          canonical_url?: string | null
          cms_detected?: string | null
          consecutive_fetch_failures?: number
          created_at?: string
          js_heavy?: boolean
          last_resolve_error?: string | null
          last_resolved_at?: string | null
          manual_only?: boolean
          updated_at?: string
          venue_id: string
          website_url?: string | null
        }
        Update: {
          canonical_url?: string | null
          cms_detected?: string | null
          consecutive_fetch_failures?: number
          created_at?: string
          js_heavy?: boolean
          last_resolve_error?: string | null
          last_resolved_at?: string | null
          manual_only?: boolean
          updated_at?: string
          venue_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_mappings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      website_pages: {
        Row: {
          created_at: string
          h1_count: number | null
          h1_text: string | null
          http_status: number | null
          id: string
          image_count: number | null
          images_with_alt: number | null
          internal_link_count: number | null
          last_modified: string | null
          meta_description: string | null
          meta_description_len: number | null
          page_kind: string | null
          schema_types: string[] | null
          snapshot_id: string
          title: string | null
          title_len: number | null
          url: string
          venue_id: string
          word_count: number | null
        }
        Insert: {
          created_at?: string
          h1_count?: number | null
          h1_text?: string | null
          http_status?: number | null
          id?: string
          image_count?: number | null
          images_with_alt?: number | null
          internal_link_count?: number | null
          last_modified?: string | null
          meta_description?: string | null
          meta_description_len?: number | null
          page_kind?: string | null
          schema_types?: string[] | null
          snapshot_id: string
          title?: string | null
          title_len?: number | null
          url: string
          venue_id: string
          word_count?: number | null
        }
        Update: {
          created_at?: string
          h1_count?: number | null
          h1_text?: string | null
          http_status?: number | null
          id?: string
          image_count?: number | null
          images_with_alt?: number | null
          internal_link_count?: number | null
          last_modified?: string | null
          meta_description?: string | null
          meta_description_len?: number | null
          page_kind?: string | null
          schema_types?: string[] | null
          snapshot_id?: string
          title?: string | null
          title_len?: number | null
          url?: string
          venue_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "website_pages_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "website_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_pages_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      website_snapshots: {
        Row: {
          avg_word_count: number | null
          captured_at: string
          cls: number | null
          cms_detected: string | null
          created_at: string
          created_by: string | null
          discovered_page_count: number | null
          email_prominent: boolean | null
          fetch_error: string | null
          has_about_page: boolean | null
          has_contact_form: boolean | null
          has_contact_page: boolean | null
          has_email_signup: boolean | null
          has_events_page: boolean | null
          has_happy_hour_page: boolean | null
          has_localbusiness_schema: boolean | null
          has_menu_page: boolean | null
          has_private_party_page: boolean | null
          has_reservations_page: boolean | null
          has_social_links: boolean | null
          http_status: number | null
          https_enabled: boolean | null
          id: string
          image_alt_coverage_pct: number | null
          inp_ms: number | null
          lcp_ms: number | null
          menu_is_pdf_only: boolean | null
          mobile_friendly: boolean | null
          notes: string | null
          pages_audited: number | null
          pages_with_h1: number | null
          pages_with_meta_desc: number | null
          pages_with_title: number | null
          perf_score: number | null
          phone_prominent: boolean | null
          private_party_has_form: boolean | null
          private_party_linked_from_home: boolean | null
          raw: Json | null
          response_ms: number | null
          robots_allows_crawl: boolean | null
          robots_present: boolean | null
          schema_types_detected: string[] | null
          scope: string
          sitemap_present: boolean | null
          source: string
          venue_id: string
        }
        Insert: {
          avg_word_count?: number | null
          captured_at?: string
          cls?: number | null
          cms_detected?: string | null
          created_at?: string
          created_by?: string | null
          discovered_page_count?: number | null
          email_prominent?: boolean | null
          fetch_error?: string | null
          has_about_page?: boolean | null
          has_contact_form?: boolean | null
          has_contact_page?: boolean | null
          has_email_signup?: boolean | null
          has_events_page?: boolean | null
          has_happy_hour_page?: boolean | null
          has_localbusiness_schema?: boolean | null
          has_menu_page?: boolean | null
          has_private_party_page?: boolean | null
          has_reservations_page?: boolean | null
          has_social_links?: boolean | null
          http_status?: number | null
          https_enabled?: boolean | null
          id?: string
          image_alt_coverage_pct?: number | null
          inp_ms?: number | null
          lcp_ms?: number | null
          menu_is_pdf_only?: boolean | null
          mobile_friendly?: boolean | null
          notes?: string | null
          pages_audited?: number | null
          pages_with_h1?: number | null
          pages_with_meta_desc?: number | null
          pages_with_title?: number | null
          perf_score?: number | null
          phone_prominent?: boolean | null
          private_party_has_form?: boolean | null
          private_party_linked_from_home?: boolean | null
          raw?: Json | null
          response_ms?: number | null
          robots_allows_crawl?: boolean | null
          robots_present?: boolean | null
          schema_types_detected?: string[] | null
          scope: string
          sitemap_present?: boolean | null
          source: string
          venue_id: string
        }
        Update: {
          avg_word_count?: number | null
          captured_at?: string
          cls?: number | null
          cms_detected?: string | null
          created_at?: string
          created_by?: string | null
          discovered_page_count?: number | null
          email_prominent?: boolean | null
          fetch_error?: string | null
          has_about_page?: boolean | null
          has_contact_form?: boolean | null
          has_contact_page?: boolean | null
          has_email_signup?: boolean | null
          has_events_page?: boolean | null
          has_happy_hour_page?: boolean | null
          has_localbusiness_schema?: boolean | null
          has_menu_page?: boolean | null
          has_private_party_page?: boolean | null
          has_reservations_page?: boolean | null
          has_social_links?: boolean | null
          http_status?: number | null
          https_enabled?: boolean | null
          id?: string
          image_alt_coverage_pct?: number | null
          inp_ms?: number | null
          lcp_ms?: number | null
          menu_is_pdf_only?: boolean | null
          mobile_friendly?: boolean | null
          notes?: string | null
          pages_audited?: number | null
          pages_with_h1?: number | null
          pages_with_meta_desc?: number | null
          pages_with_title?: number | null
          perf_score?: number | null
          phone_prominent?: boolean | null
          private_party_has_form?: boolean | null
          private_party_linked_from_home?: boolean | null
          raw?: Json | null
          response_ms?: number | null
          robots_allows_crawl?: boolean | null
          robots_present?: boolean | null
          schema_types_detected?: string[] | null
          scope?: string
          sitemap_present?: boolean | null
          source?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_snapshots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_briefings: {
        Row: {
          coaching_needed: string | null
          created_at: string
          generated_at: string | null
          guest_score: number | null
          guest_summary: string | null
          headline: string | null
          highlights: string | null
          highlights_json: Json | null
          id: string
          labor_score: number | null
          labor_summary: string | null
          marketing_score: number | null
          marketing_summary: string | null
          next_week_focus: string | null
          operations_score: number | null
          operations_summary: string | null
          overall_grade: string | null
          overall_score: number | null
          overall_sentiment: string | null
          priority_actions: string | null
          priority_actions_json: Json | null
          recognition: string | null
          revenue_score: number | null
          revenue_summary: string | null
          talking_points: string | null
          talking_points_json: Json | null
          upcoming_events: string | null
          venue_id: string
          watch_fors: string | null
          watch_fors_json: Json | null
          week_id: string
        }
        Insert: {
          coaching_needed?: string | null
          created_at?: string
          generated_at?: string | null
          guest_score?: number | null
          guest_summary?: string | null
          headline?: string | null
          highlights?: string | null
          highlights_json?: Json | null
          id?: string
          labor_score?: number | null
          labor_summary?: string | null
          marketing_score?: number | null
          marketing_summary?: string | null
          next_week_focus?: string | null
          operations_score?: number | null
          operations_summary?: string | null
          overall_grade?: string | null
          overall_score?: number | null
          overall_sentiment?: string | null
          priority_actions?: string | null
          priority_actions_json?: Json | null
          recognition?: string | null
          revenue_score?: number | null
          revenue_summary?: string | null
          talking_points?: string | null
          talking_points_json?: Json | null
          upcoming_events?: string | null
          venue_id: string
          watch_fors?: string | null
          watch_fors_json?: Json | null
          week_id: string
        }
        Update: {
          coaching_needed?: string | null
          created_at?: string
          generated_at?: string | null
          guest_score?: number | null
          guest_summary?: string | null
          headline?: string | null
          highlights?: string | null
          highlights_json?: Json | null
          id?: string
          labor_score?: number | null
          labor_summary?: string | null
          marketing_score?: number | null
          marketing_summary?: string | null
          next_week_focus?: string | null
          operations_score?: number | null
          operations_summary?: string | null
          overall_grade?: string | null
          overall_score?: number | null
          overall_sentiment?: string | null
          priority_actions?: string | null
          priority_actions_json?: Json | null
          recognition?: string | null
          revenue_score?: number | null
          revenue_summary?: string | null
          talking_points?: string | null
          talking_points_json?: Json | null
          upcoming_events?: string | null
          venue_id?: string
          watch_fors?: string | null
          watch_fors_json?: Json | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_briefings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_briefings_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "weekly_briefings_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_core: {
        Row: {
          actual_hours: number | null
          aov: number | null
          avg_kds_time_mins: number | null
          bar_id: string
          comps_amount: number | null
          computed_at: string | null
          critical_alerts_count: number | null
          discount_amount: number | null
          discount_pct: number | null
          employee_logs_count: number | null
          engage_avg_shift_score: number | null
          engage_avg_tenure: number | null
          engage_composite_score: number | null
          engage_dropped_shifts: number | null
          engage_lates: number | null
          engage_no_shows: number | null
          engage_shift_bids: number | null
          google_rating: number | null
          gross_sales: number | null
          id: string
          kds_over_25_pct: number | null
          kds_over_25_tickets: number | null
          kds_total_tickets: number | null
          labor_cost_total: number | null
          labor_hours_total: number | null
          labor_pct: number | null
          last_year_aov: number | null
          last_year_guests: number | null
          last_year_net_sales: number | null
          last_year_transactions: number | null
          net_sales: number | null
          notes: string | null
          on_time_rate: number | null
          online_reputation_score: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          refund_amount: number | null
          refund_pct: number | null
          schedule_variance_pct: number | null
          scheduled_hours: number | null
          sidework_completion_pct: number | null
          sidework_tasks_completed: number | null
          sidework_tasks_total: number | null
          splh: number | null
          stockout_count: number | null
          task_completion_pct: number | null
          tasks_completed: number | null
          tasks_completed_this_week: number | null
          tasks_due: number | null
          tasks_in_red: number | null
          tasks_on_time: number | null
          tasks_open_backlog: number | null
          tasks_status: string | null
          tasks_total_assigned: number | null
          tasks_total_outstanding: number | null
          tip_pct: number | null
          tips_amount: number | null
          transactions: number | null
          turn_time_avg_min: number | null
          unpaid_checks_amount: number | null
          void_amount: number | null
          void_rate: number | null
          week_id: string
          weekly_guests: number | null
          yelp_rating: number | null
          yoy_aov_pct: number | null
          yoy_change_pct: number | null
          yoy_guests_pct: number | null
          yoy_transactions_pct: number | null
        }
        Insert: {
          actual_hours?: number | null
          aov?: number | null
          avg_kds_time_mins?: number | null
          bar_id: string
          comps_amount?: number | null
          computed_at?: string | null
          critical_alerts_count?: number | null
          discount_amount?: number | null
          discount_pct?: number | null
          employee_logs_count?: number | null
          engage_avg_shift_score?: number | null
          engage_avg_tenure?: number | null
          engage_composite_score?: number | null
          engage_dropped_shifts?: number | null
          engage_lates?: number | null
          engage_no_shows?: number | null
          engage_shift_bids?: number | null
          google_rating?: number | null
          gross_sales?: number | null
          id?: string
          kds_over_25_pct?: number | null
          kds_over_25_tickets?: number | null
          kds_total_tickets?: number | null
          labor_cost_total?: number | null
          labor_hours_total?: number | null
          labor_pct?: number | null
          last_year_aov?: number | null
          last_year_guests?: number | null
          last_year_net_sales?: number | null
          last_year_transactions?: number | null
          net_sales?: number | null
          notes?: string | null
          on_time_rate?: number | null
          online_reputation_score?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          refund_amount?: number | null
          refund_pct?: number | null
          schedule_variance_pct?: number | null
          scheduled_hours?: number | null
          sidework_completion_pct?: number | null
          sidework_tasks_completed?: number | null
          sidework_tasks_total?: number | null
          splh?: number | null
          stockout_count?: number | null
          task_completion_pct?: number | null
          tasks_completed?: number | null
          tasks_completed_this_week?: number | null
          tasks_due?: number | null
          tasks_in_red?: number | null
          tasks_on_time?: number | null
          tasks_open_backlog?: number | null
          tasks_status?: string | null
          tasks_total_assigned?: number | null
          tasks_total_outstanding?: number | null
          tip_pct?: number | null
          tips_amount?: number | null
          transactions?: number | null
          turn_time_avg_min?: number | null
          unpaid_checks_amount?: number | null
          void_amount?: number | null
          void_rate?: number | null
          week_id: string
          weekly_guests?: number | null
          yelp_rating?: number | null
          yoy_aov_pct?: number | null
          yoy_change_pct?: number | null
          yoy_guests_pct?: number | null
          yoy_transactions_pct?: number | null
        }
        Update: {
          actual_hours?: number | null
          aov?: number | null
          avg_kds_time_mins?: number | null
          bar_id?: string
          comps_amount?: number | null
          computed_at?: string | null
          critical_alerts_count?: number | null
          discount_amount?: number | null
          discount_pct?: number | null
          employee_logs_count?: number | null
          engage_avg_shift_score?: number | null
          engage_avg_tenure?: number | null
          engage_composite_score?: number | null
          engage_dropped_shifts?: number | null
          engage_lates?: number | null
          engage_no_shows?: number | null
          engage_shift_bids?: number | null
          google_rating?: number | null
          gross_sales?: number | null
          id?: string
          kds_over_25_pct?: number | null
          kds_over_25_tickets?: number | null
          kds_total_tickets?: number | null
          labor_cost_total?: number | null
          labor_hours_total?: number | null
          labor_pct?: number | null
          last_year_aov?: number | null
          last_year_guests?: number | null
          last_year_net_sales?: number | null
          last_year_transactions?: number | null
          net_sales?: number | null
          notes?: string | null
          on_time_rate?: number | null
          online_reputation_score?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          refund_amount?: number | null
          refund_pct?: number | null
          schedule_variance_pct?: number | null
          scheduled_hours?: number | null
          sidework_completion_pct?: number | null
          sidework_tasks_completed?: number | null
          sidework_tasks_total?: number | null
          splh?: number | null
          stockout_count?: number | null
          task_completion_pct?: number | null
          tasks_completed?: number | null
          tasks_completed_this_week?: number | null
          tasks_due?: number | null
          tasks_in_red?: number | null
          tasks_on_time?: number | null
          tasks_open_backlog?: number | null
          tasks_status?: string | null
          tasks_total_assigned?: number | null
          tasks_total_outstanding?: number | null
          tip_pct?: number | null
          tips_amount?: number | null
          transactions?: number | null
          turn_time_avg_min?: number | null
          unpaid_checks_amount?: number | null
          void_amount?: number | null
          void_rate?: number | null
          week_id?: string
          weekly_guests?: number | null
          yelp_rating?: number | null
          yoy_aov_pct?: number | null
          yoy_change_pct?: number | null
          yoy_guests_pct?: number | null
          yoy_transactions_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_core_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_core_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "weekly_core_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_sales_mix: {
        Row: {
          beer_pct: number | null
          beer_qty: number | null
          beer_sales: number | null
          created_at: string
          food_pct: number | null
          food_qty: number | null
          food_sales: number | null
          id: string
          liquor_pct: number | null
          liquor_qty: number | null
          liquor_sales: number | null
          other_qty: number | null
          other_sales: number | null
          venue_id: string
          week_id: string
          wine_pct: number | null
          wine_qty: number | null
          wine_sales: number | null
        }
        Insert: {
          beer_pct?: number | null
          beer_qty?: number | null
          beer_sales?: number | null
          created_at?: string
          food_pct?: number | null
          food_qty?: number | null
          food_sales?: number | null
          id?: string
          liquor_pct?: number | null
          liquor_qty?: number | null
          liquor_sales?: number | null
          other_qty?: number | null
          other_sales?: number | null
          venue_id: string
          week_id: string
          wine_pct?: number | null
          wine_qty?: number | null
          wine_sales?: number | null
        }
        Update: {
          beer_pct?: number | null
          beer_qty?: number | null
          beer_sales?: number | null
          created_at?: string
          food_pct?: number | null
          food_qty?: number | null
          food_sales?: number | null
          id?: string
          liquor_pct?: number | null
          liquor_qty?: number | null
          liquor_sales?: number | null
          other_qty?: number | null
          other_sales?: number | null
          venue_id?: string
          week_id?: string
          wine_pct?: number | null
          wine_qty?: number | null
          wine_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_sales_mix_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_sales_mix_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "weekly_sales_mix_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_scorecard: {
        Row: {
          bar_id: string
          confidence: number | null
          g1_actual: number | null
          g1_score: number | null
          g2_actual: number | null
          g2_score: number | null
          g3_actual: number | null
          g3_score: number | null
          g4_actual: number | null
          g4_score: number | null
          g5_actual: number | null
          g5_score: number | null
          generated_at: string | null
          guest_experience_drivers: string | null
          guest_score: number | null
          id: string
          key_drivers: string | null
          l1_actual: number | null
          l1_score: number | null
          l2_actual: number | null
          l2_score: number | null
          l3_actual: number | null
          l3_score: number | null
          l4_actual: number | null
          l4_score: number | null
          l5_actual: number | null
          l5_score: number | null
          labor_drivers: string | null
          labor_score: number | null
          marketing_explanation: string | null
          marketing_grade: string | null
          marketing_score: number | null
          marketing_trend: string | null
          monday_briefing: string | null
          o1_actual: number | null
          o1_score: number | null
          o2_actual: number | null
          o2_score: number | null
          o3_actual: number | null
          o3_score: number | null
          o4_actual: number | null
          o4_score: number | null
          o5_actual: number | null
          o5_score: number | null
          operations_drivers: string | null
          operations_score: number | null
          overall_grade: string | null
          overall_score: number | null
          qa_grade_mismatch: boolean | null
          r1_actual: number | null
          r1_score: number | null
          r2_actual: number | null
          r2_score: number | null
          r3_actual: number | null
          r3_score: number | null
          r4_actual: number | null
          r4_score: number | null
          r5_actual: number | null
          r5_score: number | null
          revenue_drivers: string | null
          revenue_score: number | null
          s1_actual: number | null
          s1_score: number | null
          s2_actual: number | null
          s2_score: number | null
          s3_actual: number | null
          s3_score: number | null
          s4_actual: number | null
          s4_score: number | null
          s5_actual: number | null
          s5_score: number | null
          trend_4wk: string | null
          venue_id: string | null
          week_id: string
          wins: string | null
        }
        Insert: {
          bar_id: string
          confidence?: number | null
          g1_actual?: number | null
          g1_score?: number | null
          g2_actual?: number | null
          g2_score?: number | null
          g3_actual?: number | null
          g3_score?: number | null
          g4_actual?: number | null
          g4_score?: number | null
          g5_actual?: number | null
          g5_score?: number | null
          generated_at?: string | null
          guest_experience_drivers?: string | null
          guest_score?: number | null
          id?: string
          key_drivers?: string | null
          l1_actual?: number | null
          l1_score?: number | null
          l2_actual?: number | null
          l2_score?: number | null
          l3_actual?: number | null
          l3_score?: number | null
          l4_actual?: number | null
          l4_score?: number | null
          l5_actual?: number | null
          l5_score?: number | null
          labor_drivers?: string | null
          labor_score?: number | null
          marketing_explanation?: string | null
          marketing_grade?: string | null
          marketing_score?: number | null
          marketing_trend?: string | null
          monday_briefing?: string | null
          o1_actual?: number | null
          o1_score?: number | null
          o2_actual?: number | null
          o2_score?: number | null
          o3_actual?: number | null
          o3_score?: number | null
          o4_actual?: number | null
          o4_score?: number | null
          o5_actual?: number | null
          o5_score?: number | null
          operations_drivers?: string | null
          operations_score?: number | null
          overall_grade?: string | null
          overall_score?: number | null
          qa_grade_mismatch?: boolean | null
          r1_actual?: number | null
          r1_score?: number | null
          r2_actual?: number | null
          r2_score?: number | null
          r3_actual?: number | null
          r3_score?: number | null
          r4_actual?: number | null
          r4_score?: number | null
          r5_actual?: number | null
          r5_score?: number | null
          revenue_drivers?: string | null
          revenue_score?: number | null
          s1_actual?: number | null
          s1_score?: number | null
          s2_actual?: number | null
          s2_score?: number | null
          s3_actual?: number | null
          s3_score?: number | null
          s4_actual?: number | null
          s4_score?: number | null
          s5_actual?: number | null
          s5_score?: number | null
          trend_4wk?: string | null
          venue_id?: string | null
          week_id: string
          wins?: string | null
        }
        Update: {
          bar_id?: string
          confidence?: number | null
          g1_actual?: number | null
          g1_score?: number | null
          g2_actual?: number | null
          g2_score?: number | null
          g3_actual?: number | null
          g3_score?: number | null
          g4_actual?: number | null
          g4_score?: number | null
          g5_actual?: number | null
          g5_score?: number | null
          generated_at?: string | null
          guest_experience_drivers?: string | null
          guest_score?: number | null
          id?: string
          key_drivers?: string | null
          l1_actual?: number | null
          l1_score?: number | null
          l2_actual?: number | null
          l2_score?: number | null
          l3_actual?: number | null
          l3_score?: number | null
          l4_actual?: number | null
          l4_score?: number | null
          l5_actual?: number | null
          l5_score?: number | null
          labor_drivers?: string | null
          labor_score?: number | null
          marketing_explanation?: string | null
          marketing_grade?: string | null
          marketing_score?: number | null
          marketing_trend?: string | null
          monday_briefing?: string | null
          o1_actual?: number | null
          o1_score?: number | null
          o2_actual?: number | null
          o2_score?: number | null
          o3_actual?: number | null
          o3_score?: number | null
          o4_actual?: number | null
          o4_score?: number | null
          o5_actual?: number | null
          o5_score?: number | null
          operations_drivers?: string | null
          operations_score?: number | null
          overall_grade?: string | null
          overall_score?: number | null
          qa_grade_mismatch?: boolean | null
          r1_actual?: number | null
          r1_score?: number | null
          r2_actual?: number | null
          r2_score?: number | null
          r3_actual?: number | null
          r3_score?: number | null
          r4_actual?: number | null
          r4_score?: number | null
          r5_actual?: number | null
          r5_score?: number | null
          revenue_drivers?: string | null
          revenue_score?: number | null
          s1_actual?: number | null
          s1_score?: number | null
          s2_actual?: number | null
          s2_score?: number | null
          s3_actual?: number | null
          s3_score?: number | null
          s4_actual?: number | null
          s4_score?: number | null
          s5_actual?: number | null
          s5_score?: number | null
          trend_4wk?: string | null
          venue_id?: string | null
          week_id?: string
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_scorecard_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_scorecard_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "weekly_scorecard_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_social_metrics: {
        Row: {
          created_at: string
          engagement_rate: number | null
          followers_end: number | null
          followers_net: number | null
          followers_start: number | null
          id: string
          notes: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          posts_count: number | null
          profile_visits: number | null
          total_comments: number | null
          total_impressions: number | null
          total_interactions: number | null
          total_likes: number | null
          total_reach: number | null
          total_shares: number | null
          venue_id: string
          website_clicks: number | null
          week_id: string
        }
        Insert: {
          created_at?: string
          engagement_rate?: number | null
          followers_end?: number | null
          followers_net?: number | null
          followers_start?: number | null
          id?: string
          notes?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          posts_count?: number | null
          profile_visits?: number | null
          total_comments?: number | null
          total_impressions?: number | null
          total_interactions?: number | null
          total_likes?: number | null
          total_reach?: number | null
          total_shares?: number | null
          venue_id: string
          website_clicks?: number | null
          week_id: string
        }
        Update: {
          created_at?: string
          engagement_rate?: number | null
          followers_end?: number | null
          followers_net?: number | null
          followers_start?: number | null
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          posts_count?: number | null
          profile_visits?: number | null
          total_comments?: number | null
          total_impressions?: number | null
          total_interactions?: number | null
          total_likes?: number | null
          total_reach?: number | null
          total_shares?: number | null
          venue_id?: string
          website_clicks?: number | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_social_metrics_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_social_metrics_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_core_computed"
            referencedColumns: ["week_id"]
          },
          {
            foreignKeyName: "weekly_social_metrics_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          is_locked: boolean
          notes: string | null
          period_config_id: string | null
          status: string | null
          week_end: string
          week_id: string
          week_start: string
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          is_locked?: boolean
          notes?: string | null
          period_config_id?: string | null
          status?: string | null
          week_end: string
          week_id: string
          week_start: string
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          notes?: string | null
          period_config_id?: string | null
          status?: string | null
          week_end?: string
          week_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weeks_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weeks_period_config_id_fkey"
            columns: ["period_config_id"]
            isOneToOne: false
            referencedRelation: "period_config"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      finding_outcome_stats: {
        Row: {
          attempts: number | null
          avg_score_delta: number | null
          failed: number | null
          finding_type: string | null
          inconclusive: number | null
          resolved: number | null
          resolved_pct: number | null
        }
        Relationships: []
      }
      v_ai_call_log_rollup_7d: {
        Row: {
          avg_latency_ms: number | null
          calls: number | null
          cost_usd: number | null
          errors: number | null
          function_name: string | null
          input_tokens: number | null
          output_tokens: number | null
          provider: string | null
        }
        Relationships: []
      }
      v_ai_call_log_totals_7d: {
        Row: {
          calls: number | null
          cost_usd: number | null
          error_rate_pct: number | null
        }
        Relationships: []
      }
      venue_sync_status: {
        Row: {
          bar_id: string | null
          completed_at: string | null
          error_message: string | null
          records_created: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string | null
          sync_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_core_computed: {
        Row: {
          check_avg: number | null
          comps_amount: number | null
          comps_pct: number | null
          days_with_data: number | null
          discounts_amount: number | null
          gross_sales: number | null
          labor_cost_total: number | null
          labor_hours_total: number | null
          labor_pct: number | null
          net_sales: number | null
          overtime_hours: number | null
          refunds_amount: number | null
          scheduled_hours: number | null
          splh: number | null
          ticket_time_avg_minutes: number | null
          tips_amount: number | null
          tips_pct: number | null
          transactions: number | null
          venue_id: string | null
          voids_amount: number | null
          voids_pct: number | null
          week_end: string | null
          week_id: string | null
          week_start: string | null
          weekly_guests: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weeks_bar_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_log_type: {
        Args: {
          _log_type: Database["public"]["Enums"]["log_type"]
          _user_id: string
        }
        Returns: boolean
      }
      get_grade: {
        Args: { score: number }
        Returns: Database["public"]["Enums"]["grade_letter"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_venue_role: {
        Args: { _user_id: string; _venue_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      net_http_post: {
        Args: { body_json?: string; headers_json?: string; url: string }
        Returns: number
      }
      toast_submit_lock: {
        Args: { p_key: number; p_spacing_ms: number }
        Returns: undefined
      }
      user_can_access_kit: { Args: { _kit_id: string }; Returns: boolean }
      user_can_access_page: {
        Args: { _page_key: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_project: {
        Args: { _project_id: string }
        Returns: boolean
      }
      user_has_bar_access: {
        Args: { _bar_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_position: {
        Args: {
          _position: Database["public"]["Enums"]["log_position"]
          _user_id: string
        }
        Returns: boolean
      }
      user_venue_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      access_level: "all_staff" | "managers_only" | "gm_only" | "owner_only"
      action_taken_type:
        | "verbal_warning"
        | "written_warning"
        | "final_warning"
        | "suspension"
        | "termination"
        | "coaching"
        | "recognition"
        | "other"
      app_role: "admin" | "manager" | "staff" | "owner" | "gm" | "shift_lead"
      approval_status:
        | "unreviewed"
        | "approved"
        | "dismissed"
        | "snoozed"
        | "modified"
      capture_ai_status:
        | "none"
        | "pending"
        | "suggested"
        | "accepted"
        | "rejected"
      capture_item_status: "inbox" | "routed" | "archived"
      capture_routed_type:
        | "task"
        | "idea"
        | "note"
        | "brand_asset"
        | "crm_lead"
        | "content_idea"
      chat_channel_type: "team" | "dm"
      confidence_level: "high" | "medium" | "low"
      crm_company_status: "prospect" | "active" | "past" | "archived"
      crm_deal_stage: "lead" | "pitch" | "proposal" | "won" | "lost"
      crm_interaction_type: "call" | "email" | "meeting" | "note"
      dismiss_reason:
        | "already_addressed"
        | "not_relevant"
        | "will_address_later"
        | "other"
      doc_category:
        | "sop"
        | "policy"
        | "training"
        | "menu"
        | "recipe"
        | "safety"
        | "compliance"
        | "onboarding"
        | "reference"
        | "other"
      doc_scope: "company_wide" | "venue_specific"
      doc_status:
        | "draft"
        | "active"
        | "under_review"
        | "archived"
        | "superseded"
      effort_level_enum: "quick" | "short" | "medium" | "long" | "project"
      employment_status:
        | "active"
        | "inactive"
        | "terminated"
        | "on_leave"
        | "suspended"
      employment_type: "full_time" | "part_time" | "seasonal" | "temporary"
      event_type_enum:
        | "live_music"
        | "trivia"
        | "sports_viewing"
        | "holiday"
        | "private_event"
        | "community"
        | "promotion"
        | "other"
      execution_status:
        | "todo"
        | "in_progress"
        | "done"
        | "blocked"
        | "cancelled"
      feedback_vote: "up" | "down"
      field_type:
        | "short_text"
        | "long_text"
        | "number"
        | "boolean"
        | "select"
        | "date"
        | "time"
        | "rating_1_10"
      grade_letter: "A" | "B" | "C" | "D" | "F"
      inbound_lead_status: "new" | "reviewed" | "promoted" | "archived"
      incident_type:
        | "late_arrival"
        | "no_show"
        | "callout"
        | "early_leave"
        | "policy_violation"
        | "guest_complaint"
        | "cash_handling"
        | "insubordination"
        | "dress_code"
        | "safety"
        | "positive"
        | "other"
      ingestion_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "partial"
      insight_sentiment: "positive" | "neutral" | "negative"
      insight_source: "ai_daily" | "ai_weekly" | "system" | "manual"
      insight_type_enum:
        | "anomaly"
        | "trend"
        | "comparison"
        | "prediction"
        | "threshold"
        | "correlation"
        | "recommendation"
        | "celebration"
      log_intent:
        | "incident"
        | "accident"
        | "maintenance"
        | "guest_issue"
        | "shift_notes"
        | "shoutout"
        | "end_of_shift"
        | "voice_note"
      log_position: "general_manager" | "shift_lead" | "staff"
      log_severity: "critical" | "high" | "medium" | "low" | "positive" | "info"
      log_status: "draft" | "submitted"
      log_type: "gm_log" | "lead_log" | "staff_quick_log"
      pacing_type: "above" | "at" | "below"
      performance_label:
        | "excellent"
        | "good"
        | "average"
        | "below_average"
        | "poor"
      performance_rating: "exceeds" | "meets" | "below" | "unsatisfactory"
      pillar_type: "revenue" | "labor" | "operations" | "guest_experience"
      post_type:
        | "photo"
        | "video"
        | "reel"
        | "story"
        | "carousel"
        | "text"
        | "other"
      project_type_enum:
        | "client"
        | "content_channel"
        | "internal_brand"
        | "app_build"
        | "service_offer"
      promo_type:
        | "happy_hour"
        | "special"
        | "seasonal"
        | "event_based"
        | "loyalty"
        | "other"
      review_platform:
        | "google"
        | "yelp"
        | "tripadvisor"
        | "facebook"
        | "opentable"
        | "other"
      review_type:
        | "30_day"
        | "60_day"
        | "90_day"
        | "annual"
        | "promotion"
        | "pip"
        | "exit"
        | "other"
      run_type:
        | "toast_daily"
        | "toast_weekly"
        | "sevenshifts_daily"
        | "asana_sync"
        | "ai_daily"
        | "ai_weekly"
        | "manual_import"
        | "migration"
      sales_vs_forecast: "above" | "at" | "below"
      severity_level: "critical" | "high" | "medium" | "low"
      shift_rating: "great" | "good" | "okay" | "rough" | "disaster"
      shift_type_enum: "am" | "pm" | "night" | "double"
      social_platform:
        | "instagram"
        | "facebook"
        | "tiktok"
        | "google"
        | "yelp"
        | "x"
        | "other"
      staff_context: "foh" | "boh"
      staffing_level: "overstaffed" | "adequate" | "understaffed" | "critical"
      task_priority: "Critical" | "High" | "Medium" | "Low"
      task_status: "Todo" | "In Progress" | "Done"
      termination_reason:
        | "voluntary_resignation"
        | "involuntary_termination"
        | "job_abandonment"
        | "end_of_season"
        | "mutual_agreement"
        | "layoff"
        | "retirement"
        | "other"
      trend_direction: "up" | "down" | "flat"
      weather_type: "sunny" | "cloudy" | "rainy" | "stormy" | "cold" | "hot"
      week_rating: "excellent" | "good" | "average" | "below_average" | "poor"
      week_status: "open" | "closed" | "locked" | "in_review"
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
      access_level: ["all_staff", "managers_only", "gm_only", "owner_only"],
      action_taken_type: [
        "verbal_warning",
        "written_warning",
        "final_warning",
        "suspension",
        "termination",
        "coaching",
        "recognition",
        "other",
      ],
      app_role: ["admin", "manager", "staff", "owner", "gm", "shift_lead"],
      approval_status: [
        "unreviewed",
        "approved",
        "dismissed",
        "snoozed",
        "modified",
      ],
      capture_ai_status: [
        "none",
        "pending",
        "suggested",
        "accepted",
        "rejected",
      ],
      capture_item_status: ["inbox", "routed", "archived"],
      capture_routed_type: [
        "task",
        "idea",
        "note",
        "brand_asset",
        "crm_lead",
        "content_idea",
      ],
      chat_channel_type: ["team", "dm"],
      confidence_level: ["high", "medium", "low"],
      crm_company_status: ["prospect", "active", "past", "archived"],
      crm_deal_stage: ["lead", "pitch", "proposal", "won", "lost"],
      crm_interaction_type: ["call", "email", "meeting", "note"],
      dismiss_reason: [
        "already_addressed",
        "not_relevant",
        "will_address_later",
        "other",
      ],
      doc_category: [
        "sop",
        "policy",
        "training",
        "menu",
        "recipe",
        "safety",
        "compliance",
        "onboarding",
        "reference",
        "other",
      ],
      doc_scope: ["company_wide", "venue_specific"],
      doc_status: ["draft", "active", "under_review", "archived", "superseded"],
      effort_level_enum: ["quick", "short", "medium", "long", "project"],
      employment_status: [
        "active",
        "inactive",
        "terminated",
        "on_leave",
        "suspended",
      ],
      employment_type: ["full_time", "part_time", "seasonal", "temporary"],
      event_type_enum: [
        "live_music",
        "trivia",
        "sports_viewing",
        "holiday",
        "private_event",
        "community",
        "promotion",
        "other",
      ],
      execution_status: ["todo", "in_progress", "done", "blocked", "cancelled"],
      feedback_vote: ["up", "down"],
      field_type: [
        "short_text",
        "long_text",
        "number",
        "boolean",
        "select",
        "date",
        "time",
        "rating_1_10",
      ],
      grade_letter: ["A", "B", "C", "D", "F"],
      inbound_lead_status: ["new", "reviewed", "promoted", "archived"],
      incident_type: [
        "late_arrival",
        "no_show",
        "callout",
        "early_leave",
        "policy_violation",
        "guest_complaint",
        "cash_handling",
        "insubordination",
        "dress_code",
        "safety",
        "positive",
        "other",
      ],
      ingestion_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "partial",
      ],
      insight_sentiment: ["positive", "neutral", "negative"],
      insight_source: ["ai_daily", "ai_weekly", "system", "manual"],
      insight_type_enum: [
        "anomaly",
        "trend",
        "comparison",
        "prediction",
        "threshold",
        "correlation",
        "recommendation",
        "celebration",
      ],
      log_intent: [
        "incident",
        "accident",
        "maintenance",
        "guest_issue",
        "shift_notes",
        "shoutout",
        "end_of_shift",
        "voice_note",
      ],
      log_position: ["general_manager", "shift_lead", "staff"],
      log_severity: ["critical", "high", "medium", "low", "positive", "info"],
      log_status: ["draft", "submitted"],
      log_type: ["gm_log", "lead_log", "staff_quick_log"],
      pacing_type: ["above", "at", "below"],
      performance_label: [
        "excellent",
        "good",
        "average",
        "below_average",
        "poor",
      ],
      performance_rating: ["exceeds", "meets", "below", "unsatisfactory"],
      pillar_type: ["revenue", "labor", "operations", "guest_experience"],
      post_type: [
        "photo",
        "video",
        "reel",
        "story",
        "carousel",
        "text",
        "other",
      ],
      project_type_enum: [
        "client",
        "content_channel",
        "internal_brand",
        "app_build",
        "service_offer",
      ],
      promo_type: [
        "happy_hour",
        "special",
        "seasonal",
        "event_based",
        "loyalty",
        "other",
      ],
      review_platform: [
        "google",
        "yelp",
        "tripadvisor",
        "facebook",
        "opentable",
        "other",
      ],
      review_type: [
        "30_day",
        "60_day",
        "90_day",
        "annual",
        "promotion",
        "pip",
        "exit",
        "other",
      ],
      run_type: [
        "toast_daily",
        "toast_weekly",
        "sevenshifts_daily",
        "asana_sync",
        "ai_daily",
        "ai_weekly",
        "manual_import",
        "migration",
      ],
      sales_vs_forecast: ["above", "at", "below"],
      severity_level: ["critical", "high", "medium", "low"],
      shift_rating: ["great", "good", "okay", "rough", "disaster"],
      shift_type_enum: ["am", "pm", "night", "double"],
      social_platform: [
        "instagram",
        "facebook",
        "tiktok",
        "google",
        "yelp",
        "x",
        "other",
      ],
      staff_context: ["foh", "boh"],
      staffing_level: ["overstaffed", "adequate", "understaffed", "critical"],
      task_priority: ["Critical", "High", "Medium", "Low"],
      task_status: ["Todo", "In Progress", "Done"],
      termination_reason: [
        "voluntary_resignation",
        "involuntary_termination",
        "job_abandonment",
        "end_of_season",
        "mutual_agreement",
        "layoff",
        "retirement",
        "other",
      ],
      trend_direction: ["up", "down", "flat"],
      weather_type: ["sunny", "cloudy", "rainy", "stormy", "cold", "hot"],
      week_rating: ["excellent", "good", "average", "below_average", "poor"],
      week_status: ["open", "closed", "locked", "in_review"],
    },
  },
} as const
