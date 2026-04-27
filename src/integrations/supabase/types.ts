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
      accidents: {
        Row: {
          accident_date: string
          checklist: Json | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          driver_name: string | null
          driver_type: string
          id: string
          incident_type: string | null
          judgment_result: string | null
          location: string | null
          notes: string | null
          severity: string | null
          soldier_id: string | null
          source_safety_content_id: string | null
          status: string
          updated_at: string
          vehicle_number: string | null
          was_judged: boolean | null
        }
        Insert: {
          accident_date: string
          checklist?: Json | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver_name?: string | null
          driver_type: string
          id?: string
          incident_type?: string | null
          judgment_result?: string | null
          location?: string | null
          notes?: string | null
          severity?: string | null
          soldier_id?: string | null
          source_safety_content_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
          was_judged?: boolean | null
        }
        Update: {
          accident_date?: string
          checklist?: Json | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver_name?: string | null
          driver_type?: string
          id?: string
          incident_type?: string | null
          judgment_result?: string | null
          location?: string | null
          notes?: string | null
          severity?: string | null
          soldier_id?: string | null
          source_safety_content_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
          was_judged?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "accidents_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accidents_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accidents_source_safety_content_id_fkey"
            columns: ["source_safety_content_id"]
            isOneToOne: false
            referencedRelation: "safety_content"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_holidays: {
        Row: {
          category: string
          created_at: string
          event_date: string
          id: string
          is_recurring: boolean | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          event_date: string
          id?: string
          is_recurring?: boolean | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          event_date?: string
          id?: string
          is_recurring?: boolean | null
          title?: string
        }
        Relationships: []
      }
      cleaning_checklist_completions: {
        Row: {
          checklist_item_id: string
          completed_at: string
          id: string
          photo_url: string
          submission_id: string
        }
        Insert: {
          checklist_item_id: string
          completed_at?: string
          id?: string
          photo_url: string
          submission_id: string
        }
        Update: {
          checklist_item_id?: string
          completed_at?: string
          id?: string
          photo_url?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_checklist_completions_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "cleaning_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_checklist_completions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cleaning_parade_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_checklist_items: {
        Row: {
          created_at: string
          deadline_time: string | null
          default_shift_type: string | null
          id: string
          is_active: boolean
          item_name: string
          item_order: number
          outpost: string
          responsibility_area_id: string | null
          responsible_soldier_id: string | null
          shift_day: string | null
          shift_type: string | null
          source_schedule_day: number | null
          source_schedule_shift: string | null
        }
        Insert: {
          created_at?: string
          deadline_time?: string | null
          default_shift_type?: string | null
          id?: string
          is_active?: boolean
          item_name: string
          item_order?: number
          outpost: string
          responsibility_area_id?: string | null
          responsible_soldier_id?: string | null
          shift_day?: string | null
          shift_type?: string | null
          source_schedule_day?: number | null
          source_schedule_shift?: string | null
        }
        Update: {
          created_at?: string
          deadline_time?: string | null
          default_shift_type?: string | null
          id?: string
          is_active?: boolean
          item_name?: string
          item_order?: number
          outpost?: string
          responsibility_area_id?: string | null
          responsible_soldier_id?: string | null
          shift_day?: string | null
          shift_type?: string | null
          source_schedule_day?: number | null
          source_schedule_shift?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_checklist_items_responsibility_area_id_fkey"
            columns: ["responsibility_area_id"]
            isOneToOne: false
            referencedRelation: "cleaning_responsibility_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_checklist_items_responsible_soldier_id_fkey"
            columns: ["responsible_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_checklist_items_responsible_soldier_id_fkey"
            columns: ["responsible_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_item_assignments: {
        Row: {
          created_at: string
          deadline_time: string | null
          id: string
          item_id: string
          manual_soldier_id: string | null
          outpost: string
          parade_day: number
          shift_type: string
        }
        Insert: {
          created_at?: string
          deadline_time?: string | null
          id?: string
          item_id: string
          manual_soldier_id?: string | null
          outpost: string
          parade_day: number
          shift_type: string
        }
        Update: {
          created_at?: string
          deadline_time?: string | null
          id?: string
          item_id?: string
          manual_soldier_id?: string | null
          outpost?: string
          parade_day?: number
          shift_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_item_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cleaning_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_item_assignments_manual_soldier_id_fkey"
            columns: ["manual_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_item_assignments_manual_soldier_id_fkey"
            columns: ["manual_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_manual_assignments: {
        Row: {
          created_at: string
          day_of_week: string
          id: string
          outpost: string
          soldier_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          id?: string
          outpost: string
          soldier_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          id?: string
          outpost?: string
          soldier_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_manual_assignments_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_manual_assignments_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_notifications_log: {
        Row: {
          day_of_week: string
          id: string
          notification_type: string
          outpost: string
          sent_at: string
          soldier_id: string | null
          week_start_date: string
        }
        Insert: {
          day_of_week: string
          id?: string
          notification_type?: string
          outpost: string
          sent_at?: string
          soldier_id?: string | null
          week_start_date: string
        }
        Update: {
          day_of_week?: string
          id?: string
          notification_type?: string
          outpost?: string
          sent_at?: string
          soldier_id?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_notifications_log_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_notifications_log_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_parade_config: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          outpost: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          outpost: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          outpost?: string
        }
        Relationships: []
      }
      cleaning_parade_submissions: {
        Row: {
          completed_at: string | null
          created_at: string
          day_of_week: string
          id: string
          is_completed: boolean
          outpost: string
          parade_date: string
          soldier_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_of_week: string
          id?: string
          is_completed?: boolean
          outpost: string
          parade_date: string
          soldier_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_of_week?: string
          id?: string
          is_completed?: boolean
          outpost?: string
          parade_date?: string
          soldier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_parade_submissions_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_parade_submissions_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_parades: {
        Row: {
          created_at: string
          day_of_week: string
          id: string
          outpost: string
          parade_date: string
          parade_time: string
          photos: string[] | null
          responsible_driver: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          id?: string
          outpost: string
          parade_date?: string
          parade_time?: string
          photos?: string[] | null
          responsible_driver: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          id?: string
          outpost?: string
          parade_date?: string
          parade_time?: string
          photos?: string[] | null
          responsible_driver?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cleaning_reference_photos: {
        Row: {
          checklist_item_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string
          outpost: string
        }
        Insert: {
          checklist_item_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          outpost: string
        }
        Update: {
          checklist_item_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          outpost?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_reference_photos_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "cleaning_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_responsibility_areas: {
        Row: {
          created_at: string
          deadline_time: string | null
          id: string
          manual_soldier_id: string | null
          name: string
          outpost: string
          shift_day: string | null
          shift_type: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_time?: string | null
          id?: string
          manual_soldier_id?: string | null
          name: string
          outpost: string
          shift_day?: string | null
          shift_type?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_time?: string | null
          id?: string
          manual_soldier_id?: string | null
          name?: string
          outpost?: string
          shift_day?: string | null
          shift_type?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_responsibility_areas_manual_soldier_id_fkey"
            columns: ["manual_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_responsibility_areas_manual_soldier_id_fkey"
            columns: ["manual_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      commander_weekly_schedule: {
        Row: {
          commander_id: string
          completed: boolean | null
          created_at: string
          description: string | null
          id: string
          scheduled_day: number
          scheduled_time: string | null
          title: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          commander_id: string
          completed?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          scheduled_day: number
          scheduled_time?: string | null
          title: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          commander_id?: string
          completed?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          scheduled_day?: number
          scheduled_time?: string | null
          title?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: []
      }
      content_cycle_overrides: {
        Row: {
          absence_reason: string | null
          completion_date: string | null
          content_cycle: string
          created_at: string
          created_by: string | null
          id: string
          override_type: string
          soldier_id: string
        }
        Insert: {
          absence_reason?: string | null
          completion_date?: string | null
          content_cycle: string
          created_at?: string
          created_by?: string | null
          id?: string
          override_type: string
          soldier_id: string
        }
        Update: {
          absence_reason?: string | null
          completion_date?: string | null
          content_cycle?: string
          created_at?: string
          created_by?: string | null
          id?: string
          override_type?: string
          soldier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_cycle_overrides_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cycle_overrides_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_days: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dangerous_routes: {
        Row: {
          created_at: string
          created_by: string | null
          danger_type: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          route_points: Json
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          danger_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          route_points?: Json
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          danger_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          route_points?: Json
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      drill_locations: {
        Row: {
          created_at: string
          description: string | null
          drill_type: Database["public"]["Enums"]["drill_type"]
          id: string
          image_url: string | null
          instructions: string | null
          latitude: number | null
          longitude: number | null
          name: string
          outpost: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          drill_type: Database["public"]["Enums"]["drill_type"]
          id?: string
          image_url?: string | null
          instructions?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          outpost: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          drill_type?: Database["public"]["Enums"]["drill_type"]
          id?: string
          image_url?: string | null
          instructions?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          outpost?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_interviews: {
        Row: {
          additional_notes: string | null
          battalion: string
          civilian_license_expiry: string | null
          created_at: string
          defensive_driving_passed: boolean | null
          driver_name: string
          family_status: string | null
          financial_status: string | null
          id: string
          interview_date: string
          interviewer_name: string
          interviewer_summary: string | null
          license_type: string | null
          military_accidents: string | null
          military_license_expiry: string | null
          outpost: string
          permits: string | null
          region: string
          signature: string
          soldier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          battalion: string
          civilian_license_expiry?: string | null
          created_at?: string
          defensive_driving_passed?: boolean | null
          driver_name: string
          family_status?: string | null
          financial_status?: string | null
          id?: string
          interview_date?: string
          interviewer_name: string
          interviewer_summary?: string | null
          license_type?: string | null
          military_accidents?: string | null
          military_license_expiry?: string | null
          outpost: string
          permits?: string | null
          region: string
          signature: string
          soldier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          battalion?: string
          civilian_license_expiry?: string | null
          created_at?: string
          defensive_driving_passed?: boolean | null
          driver_name?: string
          family_status?: string | null
          financial_status?: string | null
          id?: string
          interview_date?: string
          interviewer_name?: string
          interviewer_summary?: string | null
          license_type?: string | null
          military_accidents?: string | null
          military_license_expiry?: string | null
          outpost?: string
          permits?: string | null
          region?: string
          signature?: string
          soldier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_interviews_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_interviews_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_tracking: {
        Row: {
          actual_quantity: number
          created_at: string
          created_by: string | null
          expected_quantity: number
          id: string
          item_type: string
          notes: string | null
          outpost: string
          serial_numbers: string[] | null
          tracking_date: string
          updated_at: string
        }
        Insert: {
          actual_quantity?: number
          created_at?: string
          created_by?: string | null
          expected_quantity?: number
          id?: string
          item_type: string
          notes?: string | null
          outpost: string
          serial_numbers?: string[] | null
          tracking_date?: string
          updated_at?: string
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          created_by?: string | null
          expected_quantity?: number
          id?: string
          item_type?: string
          notes?: string | null
          outpost?: string
          serial_numbers?: string[] | null
          tracking_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_attendance: {
        Row: {
          absence_reason: string | null
          attended: boolean | null
          completed: boolean | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          soldier_id: string
          status: string
        }
        Insert: {
          absence_reason?: string | null
          attended?: boolean | null
          completed?: boolean | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          soldier_id: string
          status?: string
        }
        Update: {
          absence_reason?: string | null
          attended?: boolean | null
          completed?: boolean | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          soldier_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "work_plan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      hagmar_certifications: {
        Row: {
          cert_type: string
          certified_date: string | null
          created_at: string
          id: string
          last_refresh_date: string | null
          soldier_id: string
          updated_at: string
        }
        Insert: {
          cert_type: string
          certified_date?: string | null
          created_at?: string
          id?: string
          last_refresh_date?: string | null
          soldier_id: string
          updated_at?: string
        }
        Update: {
          cert_type?: string
          certified_date?: string | null
          created_at?: string
          id?: string
          last_refresh_date?: string | null
          soldier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hagmar_certifications_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "hagmar_soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      hagmar_defense_files: {
        Row: {
          created_at: string | null
          description: string | null
          file_type: string | null
          file_url: string | null
          id: string
          settlement: string
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          settlement: string
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          settlement?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      hagmar_equipment: {
        Row: {
          actual_quantity: number
          created_at: string
          created_by: string | null
          expected_quantity: number
          id: string
          item_name: string
          item_type: string
          notes: string | null
          serial_numbers: string[] | null
          settlement: string
          updated_at: string
        }
        Insert: {
          actual_quantity?: number
          created_at?: string
          created_by?: string | null
          expected_quantity?: number
          id?: string
          item_name: string
          item_type: string
          notes?: string | null
          serial_numbers?: string[] | null
          settlement: string
          updated_at?: string
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          created_by?: string | null
          expected_quantity?: number
          id?: string
          item_name?: string
          item_type?: string
          notes?: string | null
          serial_numbers?: string[] | null
          settlement?: string
          updated_at?: string
        }
        Relationships: []
      }
      hagmar_equipment_expected: {
        Row: {
          created_at: string | null
          created_by: string | null
          expected_quantity: number | null
          id: string
          item_name: string
          settlement: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expected_quantity?: number | null
          id?: string
          item_name: string
          settlement: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expected_quantity?: number | null
          id?: string
          item_name?: string
          settlement?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hagmar_equipment_reports: {
        Row: {
          actual_quantity: number | null
          created_at: string | null
          id: string
          is_functional: boolean | null
          item_name: string
          item_subtype: string | null
          malfunction_description: string | null
          notes: string | null
          report_date: string | null
          reported_by: string | null
          reported_to: string | null
          settlement: string
          updated_at: string | null
        }
        Insert: {
          actual_quantity?: number | null
          created_at?: string | null
          id?: string
          is_functional?: boolean | null
          item_name: string
          item_subtype?: string | null
          malfunction_description?: string | null
          notes?: string | null
          report_date?: string | null
          reported_by?: string | null
          reported_to?: string | null
          settlement: string
          updated_at?: string | null
        }
        Update: {
          actual_quantity?: number | null
          created_at?: string | null
          id?: string
          is_functional?: boolean | null
          item_name?: string
          item_subtype?: string | null
          malfunction_description?: string | null
          notes?: string | null
          report_date?: string | null
          reported_by?: string | null
          reported_to?: string | null
          settlement?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hagmar_professional_development: {
        Row: {
          attendees: string[] | null
          content: string | null
          created_at: string | null
          created_by: string | null
          dev_type: string
          event_date: string
          id: string
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          attendees?: string[] | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          dev_type: string
          event_date: string
          id?: string
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          attendees?: string[] | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          dev_type?: string
          event_date?: string
          id?: string
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hagmar_readiness_weights: {
        Row: {
          components_weight: number
          created_at: string
          id: string
          personnel_weight: number
          priority_readiness_weight: number
          priority_risk_weight: number
          risk_incidents_weight: number
          risk_infra_weight: number
          risk_response_weight: number
          risk_threat_weight: number
          training_weight: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          components_weight?: number
          created_at?: string
          id?: string
          personnel_weight?: number
          priority_readiness_weight?: number
          priority_risk_weight?: number
          risk_incidents_weight?: number
          risk_infra_weight?: number
          risk_response_weight?: number
          risk_threat_weight?: number
          training_weight?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          components_weight?: number
          created_at?: string
          id?: string
          personnel_weight?: number
          priority_readiness_weight?: number
          priority_risk_weight?: number
          risk_incidents_weight?: number
          risk_infra_weight?: number
          risk_response_weight?: number
          risk_threat_weight?: number
          training_weight?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      hagmar_safety_investigations: {
        Row: {
          company: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_url: string | null
          findings: string | null
          id: string
          investigation_date: string
          photos: string[] | null
          recommendations: string | null
          region: string | null
          settlement: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          findings?: string | null
          id?: string
          investigation_date: string
          photos?: string[] | null
          recommendations?: string | null
          region?: string | null
          settlement?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          findings?: string | null
          id?: string
          investigation_date?: string
          photos?: string[] | null
          recommendations?: string | null
          region?: string | null
          settlement?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hagmar_security_components: {
        Row: {
          armored_vehicle: boolean | null
          armory: boolean | null
          cameras_data: Json | null
          command_center_type: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          defensive_security_type: string | null
          fence_type: string | null
          hailkis: boolean | null
          id: string
          readiness_weights: Json | null
          region: string | null
          security_gaps: string | null
          sensors_data: Json | null
          settlement: string
          updated_at: string | null
        }
        Insert: {
          armored_vehicle?: boolean | null
          armory?: boolean | null
          cameras_data?: Json | null
          command_center_type?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          defensive_security_type?: string | null
          fence_type?: string | null
          hailkis?: boolean | null
          id?: string
          readiness_weights?: Json | null
          region?: string | null
          security_gaps?: string | null
          sensors_data?: Json | null
          settlement: string
          updated_at?: string | null
        }
        Update: {
          armored_vehicle?: boolean | null
          armory?: boolean | null
          cameras_data?: Json | null
          command_center_type?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          defensive_security_type?: string | null
          fence_type?: string | null
          hailkis?: boolean | null
          id?: string
          readiness_weights?: Json | null
          region?: string | null
          security_gaps?: string | null
          sensors_data?: Json | null
          settlement?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hagmar_security_incidents: {
        Row: {
          company: string | null
          created_at: string
          description: string | null
          id: string
          incident_date: string
          incident_type: string
          location_details: string | null
          photos: string[] | null
          region: string | null
          reported_by: string | null
          reported_by_user_id: string | null
          resolution: string | null
          settlement: string
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incident_date?: string
          incident_type?: string
          location_details?: string | null
          photos?: string[] | null
          region?: string | null
          reported_by?: string | null
          reported_by_user_id?: string | null
          resolution?: string | null
          settlement: string
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incident_date?: string
          incident_type?: string
          location_details?: string | null
          photos?: string[] | null
          region?: string | null
          reported_by?: string | null
          reported_by_user_id?: string | null
          resolution?: string | null
          settlement?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hagmar_settlement_drills: {
        Row: {
          company: string | null
          created_at: string | null
          created_by: string | null
          drill_content: string | null
          drill_date: string
          full_activation_drill: boolean | null
          id: string
          participants: string[] | null
          region: string | null
          regional_force_participated: boolean | null
          settlement: string
          settlement_command_activated: boolean | null
          settlement_commander_name: string | null
          summary: string | null
          tzahi_activated: boolean | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          drill_content?: string | null
          drill_date: string
          full_activation_drill?: boolean | null
          id?: string
          participants?: string[] | null
          region?: string | null
          regional_force_participated?: boolean | null
          settlement: string
          settlement_command_activated?: boolean | null
          settlement_commander_name?: string | null
          summary?: string | null
          tzahi_activated?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          drill_content?: string | null
          drill_date?: string
          full_activation_drill?: boolean | null
          id?: string
          participants?: string[] | null
          region?: string | null
          regional_force_participated?: boolean | null
          settlement?: string
          settlement_command_activated?: boolean | null
          settlement_commander_name?: string | null
          summary?: string | null
          tzahi_activated?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hagmar_settlement_inspections: {
        Row: {
          created_at: string
          created_by: string | null
          findings: string | null
          id: string
          inspection_date: string
          inspection_type: string
          inspector_name: string | null
          score: number | null
          settlement: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          findings?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_name?: string | null
          score?: number | null
          settlement: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          findings?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_name?: string | null
          score?: number | null
          settlement?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hagmar_shooting_ranges: {
        Row: {
          company: string | null
          created_at: string | null
          created_by: string | null
          exercises: string[] | null
          id: string
          range_date: string
          region: string | null
          settlement: string
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          exercises?: string[] | null
          id?: string
          range_date: string
          region?: string | null
          settlement: string
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          exercises?: string[] | null
          id?: string
          range_date?: string
          region?: string | null
          settlement?: string
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hagmar_shooting_scores: {
        Row: {
          attended: boolean | null
          created_at: string | null
          exercise_name: string | null
          hits: number | null
          id: string
          notes: string | null
          range_id: string
          score: number | null
          soldier_id: string
          total_shots: number | null
        }
        Insert: {
          attended?: boolean | null
          created_at?: string | null
          exercise_name?: string | null
          hits?: number | null
          id?: string
          notes?: string | null
          range_id: string
          score?: number | null
          soldier_id: string
          total_shots?: number | null
        }
        Update: {
          attended?: boolean | null
          created_at?: string | null
          exercise_name?: string | null
          hits?: number | null
          id?: string
          notes?: string | null
          range_id?: string
          score?: number | null
          soldier_id?: string
          total_shots?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hagmar_shooting_scores_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "hagmar_shooting_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hagmar_shooting_scores_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "hagmar_soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      hagmar_simulator_training: {
        Row: {
          commander_name: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          id: string
          participants: string[] | null
          region: string | null
          settlement: string | null
          summary: string | null
          training_content: string | null
          training_date: string
          updated_at: string | null
        }
        Insert: {
          commander_name?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          participants?: string[] | null
          region?: string | null
          settlement?: string | null
          summary?: string | null
          training_content?: string | null
          training_date: string
          updated_at?: string | null
        }
        Update: {
          commander_name?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          participants?: string[] | null
          region?: string | null
          settlement?: string | null
          summary?: string | null
          training_content?: string | null
          training_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hagmar_soldiers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          id_number: string
          is_active: boolean
          last_shooting_range_date: string | null
          notes: string | null
          phone: string | null
          settlement: string
          shoe_size: string | null
          uniform_size_bottom: string | null
          uniform_size_top: string | null
          updated_at: string
          weapon_serial: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          id_number: string
          is_active?: boolean
          last_shooting_range_date?: string | null
          notes?: string | null
          phone?: string | null
          settlement: string
          shoe_size?: string | null
          uniform_size_bottom?: string | null
          uniform_size_top?: string | null
          updated_at?: string
          weapon_serial?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          id_number?: string
          is_active?: boolean
          last_shooting_range_date?: string | null
          notes?: string | null
          phone?: string | null
          settlement?: string
          shoe_size?: string | null
          uniform_size_bottom?: string | null
          uniform_size_top?: string | null
          updated_at?: string
          weapon_serial?: string | null
        }
        Relationships: []
      }
      hagmar_threat_ratings: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          regional_alert_level: number
          road_proximity: number
          settlement: string
          topographic_vulnerability: number
          updated_at: string
          updated_by: string | null
          village_proximity: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          regional_alert_level?: number
          road_proximity?: number
          settlement: string
          topographic_vulnerability?: number
          updated_at?: string
          updated_by?: string | null
          village_proximity?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          regional_alert_level?: number
          road_proximity?: number
          settlement?: string
          topographic_vulnerability?: number
          updated_at?: string
          updated_by?: string | null
          village_proximity?: number
        }
        Relationships: []
      }
      hagmar_training_attendance: {
        Row: {
          attended: boolean | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          soldier_id: string
        }
        Insert: {
          attended?: boolean | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          soldier_id: string
        }
        Update: {
          attended?: boolean | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          soldier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hagmar_training_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hagmar_training_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hagmar_training_attendance_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "hagmar_soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      hagmar_training_events: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          region: string | null
          settlement: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type: string
          id?: string
          region?: string | null
          settlement?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          region?: string | null
          settlement?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hagmar_weapon_authorizations: {
        Row: {
          authorization_date: string
          authorization_file_url: string | null
          created_at: string | null
          created_by: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          signed_by: string | null
          soldier_id: string
          updated_at: string | null
        }
        Insert: {
          authorization_date: string
          authorization_file_url?: string | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          signed_by?: string | null
          soldier_id: string
          updated_at?: string | null
        }
        Update: {
          authorization_date?: string
          authorization_file_url?: string | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          signed_by?: string | null
          soldier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hagmar_weapon_authorizations_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "hagmar_soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          combat_debrief_by: string | null
          combat_driver_in_debrief: boolean | null
          combat_driver_participated: boolean | null
          combat_score: number | null
          commander_name: string
          created_at: string
          created_by: string | null
          general_notes: string | null
          id: string
          inspection_date: string
          inspector_name: string
          platoon: string
          procedures_combat_equipment: boolean | null
          procedures_descent_drill: boolean | null
          procedures_fire_drill: boolean | null
          procedures_rollover_drill: boolean | null
          procedures_score: number | null
          procedures_weapon_present: boolean | null
          routes_familiarity_score: number | null
          routes_notes: string | null
          safety_driver_tools_extinguisher: boolean | null
          safety_driver_tools_jack: boolean | null
          safety_driver_tools_license: boolean | null
          safety_driver_tools_triangle: boolean | null
          safety_driver_tools_vest: boolean | null
          safety_driver_tools_wheel_key: boolean | null
          safety_score: number | null
          safety_ten_commandments: boolean | null
          simulations_questions: Json | null
          simulations_score: number | null
          soldier_id: string
          total_score: number | null
          updated_at: string
          vehicle_clean: boolean | null
          vehicle_equipment_secured: boolean | null
          vehicle_mission_sheet: boolean | null
          vehicle_score: number | null
          vehicle_tlt_nuts: boolean | null
          vehicle_tlt_oil: boolean | null
          vehicle_tlt_pressure: boolean | null
          vehicle_tlt_water: boolean | null
          vehicle_vardim_knowledge: boolean | null
          vehicle_work_card: boolean | null
        }
        Insert: {
          combat_debrief_by?: string | null
          combat_driver_in_debrief?: boolean | null
          combat_driver_participated?: boolean | null
          combat_score?: number | null
          commander_name: string
          created_at?: string
          created_by?: string | null
          general_notes?: string | null
          id?: string
          inspection_date: string
          inspector_name: string
          platoon: string
          procedures_combat_equipment?: boolean | null
          procedures_descent_drill?: boolean | null
          procedures_fire_drill?: boolean | null
          procedures_rollover_drill?: boolean | null
          procedures_score?: number | null
          procedures_weapon_present?: boolean | null
          routes_familiarity_score?: number | null
          routes_notes?: string | null
          safety_driver_tools_extinguisher?: boolean | null
          safety_driver_tools_jack?: boolean | null
          safety_driver_tools_license?: boolean | null
          safety_driver_tools_triangle?: boolean | null
          safety_driver_tools_vest?: boolean | null
          safety_driver_tools_wheel_key?: boolean | null
          safety_score?: number | null
          safety_ten_commandments?: boolean | null
          simulations_questions?: Json | null
          simulations_score?: number | null
          soldier_id: string
          total_score?: number | null
          updated_at?: string
          vehicle_clean?: boolean | null
          vehicle_equipment_secured?: boolean | null
          vehicle_mission_sheet?: boolean | null
          vehicle_score?: number | null
          vehicle_tlt_nuts?: boolean | null
          vehicle_tlt_oil?: boolean | null
          vehicle_tlt_pressure?: boolean | null
          vehicle_tlt_water?: boolean | null
          vehicle_vardim_knowledge?: boolean | null
          vehicle_work_card?: boolean | null
        }
        Update: {
          combat_debrief_by?: string | null
          combat_driver_in_debrief?: boolean | null
          combat_driver_participated?: boolean | null
          combat_score?: number | null
          commander_name?: string
          created_at?: string
          created_by?: string | null
          general_notes?: string | null
          id?: string
          inspection_date?: string
          inspector_name?: string
          platoon?: string
          procedures_combat_equipment?: boolean | null
          procedures_descent_drill?: boolean | null
          procedures_fire_drill?: boolean | null
          procedures_rollover_drill?: boolean | null
          procedures_score?: number | null
          procedures_weapon_present?: boolean | null
          routes_familiarity_score?: number | null
          routes_notes?: string | null
          safety_driver_tools_extinguisher?: boolean | null
          safety_driver_tools_jack?: boolean | null
          safety_driver_tools_license?: boolean | null
          safety_driver_tools_triangle?: boolean | null
          safety_driver_tools_vest?: boolean | null
          safety_driver_tools_wheel_key?: boolean | null
          safety_score?: number | null
          safety_ten_commandments?: boolean | null
          simulations_questions?: Json | null
          simulations_score?: number | null
          soldier_id?: string
          total_score?: number | null
          updated_at?: string
          vehicle_clean?: boolean | null
          vehicle_equipment_secured?: boolean | null
          vehicle_mission_sheet?: boolean | null
          vehicle_score?: number | null
          vehicle_tlt_nuts?: boolean | null
          vehicle_tlt_oil?: boolean | null
          vehicle_tlt_pressure?: boolean | null
          vehicle_tlt_water?: boolean | null
          vehicle_vardim_knowledge?: boolean | null
          vehicle_work_card?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      map_points_of_interest: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          name: string
          point_type: string
          severity: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          name: string
          point_type?: string
          severity?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          point_type?: string
          severity?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_excellence: {
        Row: {
          accidents_count: number | null
          avg_inspection_score: number | null
          calculated_score: number
          cleaning_parades_on_time: boolean | null
          created_at: string
          excellence_month: string
          id: string
          kilometers: number
          punishments_count: number | null
          safety_score: number
          selected_by: string | null
          soldier_id: string
          speed_violations: number | null
        }
        Insert: {
          accidents_count?: number | null
          avg_inspection_score?: number | null
          calculated_score: number
          cleaning_parades_on_time?: boolean | null
          created_at?: string
          excellence_month: string
          id?: string
          kilometers: number
          punishments_count?: number | null
          safety_score: number
          selected_by?: string | null
          soldier_id: string
          speed_violations?: number | null
        }
        Update: {
          accidents_count?: number | null
          avg_inspection_score?: number | null
          calculated_score?: number
          cleaning_parades_on_time?: boolean | null
          created_at?: string
          excellence_month?: string
          id?: string
          kilometers?: number
          punishments_count?: number | null
          safety_score?: number
          selected_by?: string | null
          soldier_id?: string
          speed_violations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_excellence_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_excellence_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_safety_scores: {
        Row: {
          created_at: string
          created_by: string | null
          harsh_accelerations: number | null
          harsh_braking: number | null
          harsh_turns: number | null
          id: string
          illegal_overtakes: number | null
          kilometers: number | null
          notes: string | null
          safety_score: number
          score_month: string
          soldier_id: string
          speed_violations: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          harsh_accelerations?: number | null
          harsh_braking?: number | null
          harsh_turns?: number | null
          id?: string
          illegal_overtakes?: number | null
          kilometers?: number | null
          notes?: string | null
          safety_score: number
          score_month: string
          soldier_id: string
          speed_violations?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          harsh_accelerations?: number | null
          harsh_braking?: number | null
          harsh_turns?: number | null
          id?: string
          illegal_overtakes?: number | null
          kilometers?: number | null
          notes?: string | null
          safety_score?: number
          score_month?: string
          soldier_id?: string
          speed_violations?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_safety_scores_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_safety_scores_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_weekly_notes: {
        Row: {
          created_at: string
          created_by: string | null
          general_notes: string | null
          id: string
          region_emphases: Json | null
          updated_at: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          general_notes?: string | null
          id?: string
          region_emphases?: Json | null
          updated_at?: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          general_notes?: string | null
          id?: string
          region_emphases?: Json | null
          updated_at?: string
          week_start_date?: string
        }
        Relationships: []
      }
      procedure_signatures: {
        Row: {
          created_at: string
          full_name: string
          id: string
          items_checked: string[]
          procedure_type: string
          signature: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          items_checked?: string[]
          procedure_type: string
          signature: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          items_checked?: string[]
          procedure_type?: string
          signature?: string
          user_id?: string
        }
        Relationships: []
      }
      procedures: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          battalion_name: string | null
          created_at: string
          department: string | null
          full_name: string
          id: string
          id_number: string | null
          military_role: string | null
          outpost: string | null
          personal_number: string | null
          platoon: string | null
          region: string | null
          settlement: string | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          battalion_name?: string | null
          created_at?: string
          department?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          military_role?: string | null
          outpost?: string | null
          personal_number?: string | null
          platoon?: string | null
          region?: string | null
          settlement?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          battalion_name?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          military_role?: string | null
          outpost?: string | null
          personal_number?: string | null
          platoon?: string | null
          region?: string | null
          settlement?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      punishments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          judge: string
          notes: string | null
          offense: string
          punishment: string
          punishment_date: string
          soldier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          judge: string
          notes?: string | null
          offense: string
          punishment: string
          punishment_date: string
          soldier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          judge?: string
          notes?: string | null
          offense?: string
          punishment?: string
          punishment_date?: string
          soldier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punishments_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punishments_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications_log: {
        Row: {
          error_message: string | null
          id: string
          outpost: string
          sent_at: string
          shift_date: string
          shift_type: string
          soldier_id: string | null
          soldier_name: string
          status: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          outpost: string
          sent_at?: string
          shift_date: string
          shift_type: string
          soldier_id?: string | null
          soldier_name: string
          status?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          outpost?: string
          sent_at?: string
          shift_date?: string
          shift_type?: string
          soldier_id?: string | null
          soldier_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_log_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notifications_log_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          soldier_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          soldier_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          soldier_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_content: {
        Row: {
          category: string
          created_at: string
          description: string | null
          driver_name: string | null
          driver_type: string | null
          event_date: string | null
          event_type: string | null
          file_url: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          outpost: string | null
          region: string | null
          severity: string | null
          soldier_id: string | null
          title: string
          updated_at: string
          vehicle_number: string | null
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          driver_name?: string | null
          driver_type?: string | null
          event_date?: string | null
          event_type?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          outpost?: string | null
          region?: string | null
          severity?: string | null
          soldier_id?: string | null
          title: string
          updated_at?: string
          vehicle_number?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          driver_name?: string | null
          driver_type?: string | null
          event_date?: string | null
          event_type?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          outpost?: string | null
          region?: string | null
          severity?: string | null
          soldier_id?: string | null
          title?: string
          updated_at?: string
          vehicle_number?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_content_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_content_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_events: {
        Row: {
          category: Database["public"]["Enums"]["safety_event_category"]
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          latitude: number | null
          lessons_learned: string | null
          longitude: number | null
          region: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["safety_event_category"]
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          latitude?: number | null
          lessons_learned?: string | null
          longitude?: number | null
          region?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["safety_event_category"]
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          latitude?: number | null
          lessons_learned?: string | null
          longitude?: number | null
          region?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      safety_files: {
        Row: {
          category: Database["public"]["Enums"]["safety_category"]
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          outpost: string
          region: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["safety_category"]
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          outpost: string
          region?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["safety_category"]
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          outpost?: string
          region?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      safety_followups: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          followup_month: string
          followup_type: string
          id: string
          notes: string | null
          soldier_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          followup_month: string
          followup_type: string
          id?: string
          notes?: string | null
          soldier_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          followup_month?: string
          followup_type?: string
          id?: string
          notes?: string | null
          soldier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_followups_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_followups_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_boundaries: {
        Row: {
          boundary_points: Json
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          boundary_points?: Json
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          boundary_points?: Json
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_reports: {
        Row: {
          commander_briefing_attendance: boolean | null
          created_at: string
          descent_drill_completed: boolean | null
          driver_name: string
          driver_tools_checked: boolean | null
          driver_tools_items_checked: string[] | null
          emergency_procedure_participation: boolean | null
          fire_drill_completed: boolean | null
          has_ammunition: boolean | null
          has_ceramic_vest: boolean | null
          has_helmet: boolean | null
          has_personal_weapon: boolean | null
          id: string
          is_complete: boolean | null
          outpost: string
          photo_back: string | null
          photo_front: string | null
          photo_left: string | null
          photo_right: string | null
          photo_steering_wheel: string | null
          pre_movement_checks_completed: boolean | null
          pre_movement_items_checked: string[] | null
          report_date: string
          report_time: string
          rollover_drill_completed: boolean | null
          safety_vulnerabilities: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at: string
          user_id: string
          vardim_points: string | null
          vardim_procedure_explanation: string | null
          vehicle_notes: string | null
          vehicle_number: string
          work_card_completed: boolean | null
        }
        Insert: {
          commander_briefing_attendance?: boolean | null
          created_at?: string
          descent_drill_completed?: boolean | null
          driver_name: string
          driver_tools_checked?: boolean | null
          driver_tools_items_checked?: string[] | null
          emergency_procedure_participation?: boolean | null
          fire_drill_completed?: boolean | null
          has_ammunition?: boolean | null
          has_ceramic_vest?: boolean | null
          has_helmet?: boolean | null
          has_personal_weapon?: boolean | null
          id?: string
          is_complete?: boolean | null
          outpost: string
          photo_back?: string | null
          photo_front?: string | null
          photo_left?: string | null
          photo_right?: string | null
          photo_steering_wheel?: string | null
          pre_movement_checks_completed?: boolean | null
          pre_movement_items_checked?: string[] | null
          report_date?: string
          report_time?: string
          rollover_drill_completed?: boolean | null
          safety_vulnerabilities?: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          user_id: string
          vardim_points?: string | null
          vardim_procedure_explanation?: string | null
          vehicle_notes?: string | null
          vehicle_number: string
          work_card_completed?: boolean | null
        }
        Update: {
          commander_briefing_attendance?: boolean | null
          created_at?: string
          descent_drill_completed?: boolean | null
          driver_name?: string
          driver_tools_checked?: boolean | null
          driver_tools_items_checked?: string[] | null
          emergency_procedure_participation?: boolean | null
          fire_drill_completed?: boolean | null
          has_ammunition?: boolean | null
          has_ceramic_vest?: boolean | null
          has_helmet?: boolean | null
          has_personal_weapon?: boolean | null
          id?: string
          is_complete?: boolean | null
          outpost?: string
          photo_back?: string | null
          photo_front?: string | null
          photo_left?: string | null
          photo_right?: string | null
          photo_steering_wheel?: string | null
          pre_movement_checks_completed?: boolean | null
          pre_movement_items_checked?: string[] | null
          report_date?: string
          report_time?: string
          rollover_drill_completed?: boolean | null
          safety_vulnerabilities?: string | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          user_id?: string
          vardim_points?: string | null
          vardim_procedure_explanation?: string | null
          vehicle_notes?: string | null
          vehicle_number?: string
          work_card_completed?: boolean | null
        }
        Relationships: []
      }
      sms_notifications_log: {
        Row: {
          error_message: string | null
          id: string
          outpost: string
          phone: string
          sent_at: string
          shift_date: string
          shift_type: string
          soldier_id: string | null
          soldier_name: string
          status: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          outpost: string
          phone: string
          sent_at?: string
          shift_date: string
          shift_type: string
          soldier_id?: string | null
          soldier_name: string
          status?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          outpost?: string
          phone?: string
          sent_at?: string
          shift_date?: string
          shift_type?: string
          soldier_id?: string | null
          soldier_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_notifications_log_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_notifications_log_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      soldier_courses: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          notes: string | null
          soldier_id: string
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          notes?: string | null
          soldier_id: string
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          soldier_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soldier_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soldier_courses_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soldier_courses_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      soldiers: {
        Row: {
          civilian_license_expiry: string | null
          consecutive_low_months: number | null
          correct_driving_in_service_date: string | null
          created_at: string
          current_safety_score: number | null
          defensive_driving_passed: boolean | null
          full_name: string
          id: string
          is_active: boolean | null
          last_shooting_range_date: string | null
          license_type: string | null
          military_license_expiry: string | null
          outpost: string | null
          permits: string[] | null
          personal_number: string
          phone: string | null
          qualified_date: string | null
          release_date: string | null
          rotation_group: string | null
          safety_status: string | null
          updated_at: string
        }
        Insert: {
          civilian_license_expiry?: string | null
          consecutive_low_months?: number | null
          correct_driving_in_service_date?: string | null
          created_at?: string
          current_safety_score?: number | null
          defensive_driving_passed?: boolean | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_shooting_range_date?: string | null
          license_type?: string | null
          military_license_expiry?: string | null
          outpost?: string | null
          permits?: string[] | null
          personal_number: string
          phone?: string | null
          qualified_date?: string | null
          release_date?: string | null
          rotation_group?: string | null
          safety_status?: string | null
          updated_at?: string
        }
        Update: {
          civilian_license_expiry?: string | null
          consecutive_low_months?: number | null
          correct_driving_in_service_date?: string | null
          created_at?: string
          current_safety_score?: number | null
          defensive_driving_passed?: boolean | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_shooting_range_date?: string | null
          license_type?: string | null
          military_license_expiry?: string | null
          outpost?: string | null
          permits?: string[] | null
          personal_number?: string
          phone?: string | null
          qualified_date?: string | null
          release_date?: string | null
          rotation_group?: string | null
          safety_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          created_at: string
          duration: string | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      trip_forms: {
        Row: {
          created_at: string
          exit_briefing_by_officer: boolean
          form_date: string
          id: string
          notes: string | null
          officer_name: string | null
          outpost: string | null
          personal_equipment_checked: boolean
          signature: string
          soldier_name: string
          uniform_class_a: boolean
          updated_at: string
          user_id: string
          vehicle_returned: boolean
          weapon_reset: boolean
        }
        Insert: {
          created_at?: string
          exit_briefing_by_officer?: boolean
          form_date?: string
          id?: string
          notes?: string | null
          officer_name?: string | null
          outpost?: string | null
          personal_equipment_checked?: boolean
          signature: string
          soldier_name: string
          uniform_class_a?: boolean
          updated_at?: string
          user_id: string
          vehicle_returned?: boolean
          weapon_reset?: boolean
        }
        Update: {
          created_at?: string
          exit_briefing_by_officer?: boolean
          form_date?: string
          id?: string
          notes?: string | null
          officer_name?: string | null
          outpost?: string | null
          personal_equipment_checked?: boolean
          signature?: string
          soldier_name?: string
          uniform_class_a?: boolean
          updated_at?: string
          user_id?: string
          vehicle_returned?: boolean
          weapon_reset?: boolean
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
        Relationships: []
      }
      weekend_weapon_holders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_holding_weapon: boolean
          notes: string | null
          settlement: string
          soldier_id: string
          updated_at: string
          weekend_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_holding_weapon?: boolean
          notes?: string | null
          settlement: string
          soldier_id: string
          updated_at?: string
          weekend_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_holding_weapon?: boolean
          notes?: string | null
          settlement?: string
          soldier_id?: string
          updated_at?: string
          weekend_date?: string
        }
        Relationships: []
      }
      weekly_closings: {
        Row: {
          commander_notes: string | null
          created_at: string
          created_by: string | null
          discipline_events_summary: string | null
          id: string
          planning_vs_execution: string | null
          safety_events_summary: string | null
          unresolved_deviations: string | null
          updated_at: string
          weekly_opening_id: string
        }
        Insert: {
          commander_notes?: string | null
          created_at?: string
          created_by?: string | null
          discipline_events_summary?: string | null
          id?: string
          planning_vs_execution?: string | null
          safety_events_summary?: string | null
          unresolved_deviations?: string | null
          updated_at?: string
          weekly_opening_id: string
        }
        Update: {
          commander_notes?: string | null
          created_at?: string
          created_by?: string | null
          discipline_events_summary?: string | null
          id?: string
          planning_vs_execution?: string | null
          safety_events_summary?: string | null
          unresolved_deviations?: string | null
          updated_at?: string
          weekly_opening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_closings_weekly_opening_id_fkey"
            columns: ["weekly_opening_id"]
            isOneToOne: false
            referencedRelation: "weekly_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_commander_summary: {
        Row: {
          action_items: string | null
          created_at: string
          created_by: string | null
          id: string
          summary_text: string | null
          updated_at: string
          weekly_opening_id: string
        }
        Insert: {
          action_items?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          summary_text?: string | null
          updated_at?: string
          weekly_opening_id: string
        }
        Update: {
          action_items?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          summary_text?: string | null
          updated_at?: string
          weekly_opening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_commander_summary_weekly_opening_id_fkey"
            columns: ["weekly_opening_id"]
            isOneToOne: false
            referencedRelation: "weekly_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_fitness_issues: {
        Row: {
          created_at: string
          id: string
          issue_details: string | null
          issue_type: string
          resolved: boolean | null
          soldier_id: string
          weekly_opening_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_details?: string | null
          issue_type: string
          resolved?: boolean | null
          soldier_id: string
          weekly_opening_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_details?: string | null
          issue_type?: string
          resolved?: boolean | null
          soldier_id?: string
          weekly_opening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_fitness_issues_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_fitness_issues_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_fitness_issues_weekly_opening_id_fkey"
            columns: ["weekly_opening_id"]
            isOneToOne: false
            referencedRelation: "weekly_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_manpower: {
        Row: {
          absence_reason: string | null
          created_at: string
          id: string
          notes: string | null
          soldier_id: string
          status: string
          weekly_opening_id: string
        }
        Insert: {
          absence_reason?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          soldier_id: string
          status?: string
          weekly_opening_id: string
        }
        Update: {
          absence_reason?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          soldier_id?: string
          status?: string
          weekly_opening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_manpower_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_manpower_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_manpower_weekly_opening_id_fkey"
            columns: ["weekly_opening_id"]
            isOneToOne: false
            referencedRelation: "weekly_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_openings: {
        Row: {
          commander_help_description: string | null
          commander_id: string | null
          concerns: string | null
          created_at: string
          id: string
          needs_commander_help: boolean | null
          region: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          commander_help_description?: string | null
          commander_id?: string | null
          concerns?: string | null
          created_at?: string
          id?: string
          needs_commander_help?: boolean | null
          region: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          commander_help_description?: string | null
          commander_id?: string | null
          concerns?: string | null
          created_at?: string
          id?: string
          needs_commander_help?: boolean | null
          region?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: []
      }
      weekly_safety_activities: {
        Row: {
          activity_type: string
          commander_help_type: string | null
          completed: boolean | null
          created_at: string
          description: string | null
          id: string
          needs_commander_help: boolean | null
          planned_date: string | null
          soldier_id: string | null
          title: string
          weekly_opening_id: string
        }
        Insert: {
          activity_type: string
          commander_help_type?: string | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          needs_commander_help?: boolean | null
          planned_date?: string | null
          soldier_id?: string | null
          title: string
          weekly_opening_id: string
        }
        Update: {
          activity_type?: string
          commander_help_type?: string | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          needs_commander_help?: boolean | null
          planned_date?: string | null
          soldier_id?: string | null
          title?: string
          weekly_opening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_safety_activities_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_safety_activities_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_safety_activities_weekly_opening_id_fkey"
            columns: ["weekly_opening_id"]
            isOneToOne: false
            referencedRelation: "weekly_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_schedule: {
        Row: {
          completed: boolean | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          schedule_type: string
          scheduled_day: number
          scheduled_time: string | null
          title: string
          weekly_opening_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          schedule_type: string
          scheduled_day: number
          scheduled_time?: string | null
          title: string
          weekly_opening_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          schedule_type?: string
          scheduled_day?: number
          scheduled_time?: string | null
          title?: string
          weekly_opening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_weekly_opening_id_fkey"
            columns: ["weekly_opening_id"]
            isOneToOne: false
            referencedRelation: "weekly_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      work_plan_events: {
        Row: {
          attendees: string[] | null
          category: string | null
          color: string | null
          content_cycle: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          expected_soldiers: string[] | null
          id: string
          is_series: boolean | null
          series_id: string | null
          series_pattern: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          category?: string | null
          color?: string | null
          content_cycle?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          expected_soldiers?: string[] | null
          id?: string
          is_series?: boolean | null
          series_id?: string | null
          series_pattern?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          category?: string | null
          color?: string | null
          content_cycle?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          expected_soldiers?: string[] | null
          id?: string
          is_series?: boolean | null
          series_id?: string | null
          series_pattern?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_schedule: {
        Row: {
          afternoon_soldier_id: string | null
          created_at: string
          created_by: string | null
          day_of_week: number
          evening_soldier_id: string | null
          id: string
          morning_soldier_id: string | null
          outpost: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          afternoon_soldier_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_week: number
          evening_soldier_id?: string | null
          id?: string
          morning_soldier_id?: string | null
          outpost: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          afternoon_soldier_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          evening_soldier_id?: string | null
          id?: string
          morning_soldier_id?: string | null
          outpost?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedule_afternoon_soldier_id_fkey"
            columns: ["afternoon_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedule_afternoon_soldier_id_fkey"
            columns: ["afternoon_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedule_evening_soldier_id_fkey"
            columns: ["evening_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedule_evening_soldier_id_fkey"
            columns: ["evening_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedule_morning_soldier_id_fkey"
            columns: ["morning_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedule_morning_soldier_id_fkey"
            columns: ["morning_soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      soldiers_basic: {
        Row: {
          full_name: string | null
          id: string | null
          is_active: boolean | null
          outpost: string | null
          personal_number: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          outpost?: string | null
          personal_number?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          outpost?: string | null
          personal_number?: string | null
        }
        Relationships: []
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
      app_role:
        | "driver"
        | "admin"
        | "platoon_commander"
        | "battalion_admin"
        | "super_admin"
        | "hagmar_admin"
        | "ravshatz"
      drill_type: "descent" | "rollover" | "fire"
      safety_category: "vardim" | "vulnerability" | "parsa"
      safety_event_category:
        | "fire"
        | "accident"
        | "weapon"
        | "vehicle"
        | "other"
      shift_type: "morning" | "afternoon" | "evening"
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
      app_role: [
        "driver",
        "admin",
        "platoon_commander",
        "battalion_admin",
        "super_admin",
        "hagmar_admin",
        "ravshatz",
      ],
      drill_type: ["descent", "rollover", "fire"],
      safety_category: ["vardim", "vulnerability", "parsa"],
      safety_event_category: ["fire", "accident", "weapon", "vehicle", "other"],
      shift_type: ["morning", "afternoon", "evening"],
    },
  },
} as const