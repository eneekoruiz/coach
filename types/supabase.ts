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
      achievements: {
        Row: {
          badge_icon: string | null
          created_at: string
          description: string
          id: string
          title: string
          xp_reward: number
        }
        Insert: {
          badge_icon?: string | null
          created_at?: string
          description: string
          id: string
          title: string
          xp_reward?: number
        }
        Update: {
          badge_icon?: string | null
          created_at?: string
          description?: string
          id?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      achievements_locked: {
        Row: {
          badge_icon: string | null
          created_at: string
          description: string
          id: string
          title: string
          xp_reward: number
        }
        Insert: {
          badge_icon?: string | null
          created_at?: string
          description: string
          id: string
          title: string
          xp_reward?: number
        }
        Update: {
          badge_icon?: string | null
          created_at?: string
          description?: string
          id?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          body_fat_percentage: number | null
          created_at: string
          date: string
          id: string
          muscle_mass: number | null
          notes: string | null
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string
          date: string
          id?: string
          muscle_mass?: number | null
          notes?: string | null
          updated_at?: string
          user_id: string
          weight: number
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string
          date?: string
          id?: string
          muscle_mass?: number | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_diet_overrides: {
        Row: {
          created_at: string
          custom_diet: Json
          date: string
          id: string
          total_carbs: number
          total_fats: number
          total_kcal: number
          total_protein: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_diet?: Json
          date: string
          id?: string
          total_carbs?: number
          total_fats?: number
          total_kcal?: number
          total_protein?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_diet?: Json
          date?: string
          id?: string
          total_carbs?: number
          total_fats?: number
          total_kcal?: number
          total_protein?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          ai_data: Json
          avatar_image_url: string | null
          close_day_data: Json | null
          created_at: string
          date: string
          habit_tracking: Json | null
          health_momentum: number
          id: string
          saved_by_shield: boolean
          user_id: string
        }
        Insert: {
          ai_data?: Json
          avatar_image_url?: string | null
          close_day_data?: Json | null
          created_at?: string
          date: string
          habit_tracking?: Json | null
          health_momentum: number
          id?: string
          saved_by_shield?: boolean
          user_id: string
        }
        Update: {
          ai_data?: Json
          avatar_image_url?: string | null
          close_day_data?: Json | null
          created_at?: string
          date?: string
          habit_tracking?: Json | null
          health_momentum?: number
          id?: string
          saved_by_shield?: boolean
          user_id?: string
        }
        Relationships: []
      }
      diet_program_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          program_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          program_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          program_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "diet_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_program_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_programs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          microcycle_length: number
          name: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          microcycle_length?: number
          name?: string
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          microcycle_length?: number
          name?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diet_templates: {
        Row: {
          created_at: string
          id: string
          meals: Json
          name: string
          parent_template_id: string | null
          target_carbs: number
          target_fats: number
          target_kcal: number
          target_protein: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meals?: Json
          name?: string
          parent_template_id?: string | null
          target_carbs?: number
          target_fats?: number
          target_kcal?: number
          target_protein?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meals?: Json
          name?: string
          parent_template_id?: string | null
          target_carbs?: number
          target_fats?: number
          target_kcal?: number
          target_protein?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          created_at: string
          id: string
          next_review_at: string
          raw_concept: string
          status: string
          streak: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          next_review_at?: string
          raw_concept: string
          status?: string
          streak?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          next_review_at?: string
          raw_concept?: string
          status?: string
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          created_at: string | null
          created_at_timestamp: string | null
          date: string
          id: string
          impact_factors: string[] | null
          impact_tags: string[] | null
          is_daily_summary: boolean | null
          logged_at: string
          mood_score: number
          updated_at: string | null
          user_id: string
          valence_score: number | null
        }
        Insert: {
          created_at?: string | null
          created_at_timestamp?: string | null
          date?: string
          id?: string
          impact_factors?: string[] | null
          impact_tags?: string[] | null
          is_daily_summary?: boolean | null
          logged_at?: string
          mood_score: number
          updated_at?: string | null
          user_id: string
          valence_score?: number | null
        }
        Update: {
          created_at?: string | null
          created_at_timestamp?: string | null
          date?: string
          id?: string
          impact_factors?: string[] | null
          impact_tags?: string[] | null
          is_daily_summary?: boolean | null
          logged_at?: string
          mood_score?: number
          updated_at?: string | null
          user_id?: string
          valence_score?: number | null
        }
        Relationships: []
      }
      nutrition_meal_completions: {
        Row: {
          carbs_g: number
          created_at: string
          date: string
          fats_g: number
          id: string
          kcal: number
          meal_id: string
          meal_name: string
          protein_g: number
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          date: string
          fats_g?: number
          id?: string
          kcal?: number
          meal_id: string
          meal_name: string
          protein_g?: number
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          date?: string
          fats_g?: number
          id?: string
          kcal?: number
          meal_id?: string
          meal_name?: string
          protein_g?: number
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_meal_completions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          shields_available: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          shields_available?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          shields_available?: number
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          ingredients_json: Json
          instructions: string
          name: string
          total_carbs: number
          total_fats: number
          total_kcal: number
          total_protein: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredients_json?: Json
          instructions?: string
          name?: string
          total_carbs?: number
          total_fats?: number
          total_kcal?: number
          total_protein?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredients_json?: Json
          instructions?: string
          name?: string
          total_carbs?: number
          total_fats?: number
          total_kcal?: number
          total_protein?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_logs: {
        Row: {
          completed_date: string
          created_at: string
          id: string
          routine_id: string
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          id?: string
          routine_id: string
          user_id?: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          id?: string
          routine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_templates: {
        Row: {
          created_at: string
          habit_increment_amount: number
          icon: string | null
          id: string
          linked_habit_id: number | null
          time_of_day: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          habit_increment_amount?: number
          icon?: string | null
          id?: string
          linked_habit_id?: number | null
          time_of_day?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          habit_increment_amount?: number
          icon?: string | null
          id?: string
          linked_habit_id?: number | null
          time_of_day?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_templates_linked_habit_id_fkey"
            columns: ["linked_habit_id"]
            isOneToOne: false
            referencedRelation: "user_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_diet_calendar: {
        Row: {
          created_at: string
          date: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_diet_calendar_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_diet_calendar_projections: {
        Row: {
          created_at: string
          date: string
          day_of_week: number
          id: string
          template_id: string
          user_id: string
          weekly_plan_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_of_week: number
          id?: string
          template_id: string
          user_id: string
          weekly_plan_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_of_week?: number
          id?: string
          template_id?: string
          user_id?: string
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_diet_calendar_projections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_diet_calendar_projections_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_diet_plans: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          weekly_schedule: Json
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          weekly_schedule?: Json
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          weekly_schedule?: Json
        }
        Relationships: []
      }
      user_habits: {
        Row: {
          created_at: string
          current_streak: number
          id: number
          is_custom: boolean
          last_relapse_at: string | null
          longest_streak: number
          name: string
          relapse_unit_cost: number
          relapse_unit_minutes: number
          shields: number
          slip_allowance: number
          slip_penalty_hours: number
          slip_window_days: number
          sobriety_started_at: string | null
          target_value: number
          tolerance_threshold: number
          type: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: number
          is_custom?: boolean
          last_relapse_at?: string | null
          longest_streak?: number
          name: string
          relapse_unit_cost?: number
          relapse_unit_minutes?: number
          shields?: number
          slip_allowance?: number
          slip_penalty_hours?: number
          slip_window_days?: number
          sobriety_started_at?: string | null
          target_value?: number
          tolerance_threshold?: number
          type: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: number
          is_custom?: boolean
          last_relapse_at?: string | null
          longest_streak?: number
          name?: string
          relapse_unit_cost?: number
          relapse_unit_minutes?: number
          shields?: number
          slip_allowance?: number
          slip_penalty_hours?: number
          slip_window_days?: number
          sobriety_started_at?: string | null
          target_value?: number
          tolerance_threshold?: number
          type?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_plan_days: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          template_id: string
          user_id: string
          weekly_plan_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          template_id: string
          user_id: string
          weekly_plan_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          template_id?: string
          user_id?: string
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plan_days_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          target_carbs: number
          target_fats: number
          target_kcal: number
          target_protein: number
          updated_at: string
          user_id: string
          water_target_ml: number
          week_start_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          target_carbs?: number
          target_fats?: number
          target_kcal?: number
          target_protein?: number
          updated_at?: string
          user_id: string
          water_target_ml?: number
          week_start_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          target_carbs?: number
          target_fats?: number
          target_kcal?: number
          target_protein?: number
          updated_at?: string
          user_id?: string
          water_target_ml?: number
          week_start_date?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          date: string
          duration_minutes: number
          id: string
          intensity: string
          kcal_burned: number
          notes: string | null
          sport_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          duration_minutes: number
          id?: string
          intensity?: string
          kcal_burned?: number
          notes?: string | null
          sport_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_minutes?: number
          id?: string
          intensity?: string
          kcal_burned?: number
          notes?: string | null
          sport_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      import_scanned_diet_bundle: { Args: { payload: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
