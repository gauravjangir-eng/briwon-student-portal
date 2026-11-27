
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "academy_settings": {
                  Row: {
                    "academy_name": string,"campus_latitude": number | null,"campus_longitude": number | null,"campus_radius_m": number,"certificate_signatory_name": string,"certificate_signatory_title": string,"checkin_opens_before_min": number,"grade_distinction_pct": number,"grade_merit_pct": number,"grade_pass_pct": number,"id": number,"late_attendance_weight": number,"late_submission_grace_days": number,"late_until_min": number,"late_within_grace_counts": boolean,"max_gps_accuracy_m": number,"min_assignment_score_pct": number,"min_attendance_pct": number,"min_capstone_score_pct": number,"min_final_assessment_pct": number,"min_on_time_assignments_pct": number,"present_until_min": number,"required_mini_projects": number,"support_email": string | null,"timezone": string,"updated_at": string,"updated_by": string | null,"weight_assignments": number,"weight_final_assessment": number,"weight_projects": number
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_name"?: string,"campus_latitude"?: number | null,"campus_longitude"?: number | null,"campus_radius_m"?: number,"certificate_signatory_name"?: string,"certificate_signatory_title"?: string,"checkin_opens_before_min"?: number,"grade_distinction_pct"?: number,"grade_merit_pct"?: number,"grade_pass_pct"?: number,"id"?: number,"late_attendance_weight"?: number,"late_submission_grace_days"?: number,"late_until_min"?: number,"late_within_grace_counts"?: boolean,"max_gps_accuracy_m"?: number,"min_assignment_score_pct"?: number,"min_attendance_pct"?: number,"min_capstone_score_pct"?: number,"min_final_assessment_pct"?: number,"min_on_time_assignments_pct"?: number,"present_until_min"?: number,"required_mini_projects"?: number,"support_email"?: string | null,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null,"weight_assignments"?: number,"weight_final_assessment"?: number,"weight_projects"?: number
                  }
                  Update: {
                    "academy_name"?: string,"campus_latitude"?: number | null,"campus_longitude"?: number | null,"campus_radius_m"?: number,"certificate_signatory_name"?: string,"certificate_signatory_title"?: string,"checkin_opens_before_min"?: number,"grade_distinction_pct"?: number,"grade_merit_pct"?: number,"grade_pass_pct"?: number,"id"?: number,"late_attendance_weight"?: number,"late_submission_grace_days"?: number,"late_until_min"?: number,"late_within_grace_counts"?: boolean,"max_gps_accuracy_m"?: number,"min_assignment_score_pct"?: number,"min_attendance_pct"?: number,"min_capstone_score_pct"?: number,"min_final_assessment_pct"?: number,"min_on_time_assignments_pct"?: number,"present_until_min"?: number,"required_mini_projects"?: number,"support_email"?: string | null,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null,"weight_assignments"?: number,"weight_final_assessment"?: number,"weight_projects"?: number
                  }
                  Relationships: [
                    
                  ]
                },"academy_settings_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": number,"settings": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"settings": NonNullable<Json>
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"settings"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"announcements": {
                  Row: {
                    "audience": string,"batch_id": string | null,"body": string,"created_at": string,"created_by": string | null,"expires_at": string | null,"id": string,"is_pinned": boolean,"published_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: string,"batch_id"?: string | null,"body": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"is_pinned"?: boolean,"published_at"?: string,"title": string
                  }
                  Update: {
                    "audience"?: string,"batch_id"?: string | null,"body"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"is_pinned"?: boolean,"published_at"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"assessment_results": {
                  Row: {
                    "assessment_id": string,"feedback": string | null,"graded_at": string,"graded_by": string | null,"id": string,"score": number,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assessment_id": string,"feedback"?: string | null,"graded_at"?: string,"graded_by"?: string | null,"id"?: string,"score": number,"student_id": string
                  }
                  Update: {
                    "assessment_id"?: string,"feedback"?: string | null,"graded_at"?: string,"graded_by"?: string | null,"id"?: string,"score"?: number,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_results_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "assessments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_results_graded_by_fkey"
      columns: ["graded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_results_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"assessments": {
                  Row: {
                    "assessment_date": string,"batch_id": string,"created_at": string,"id": string,"is_final": boolean,"max_marks": number,"pass_pct": number,"title": string,"trainer_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assessment_date": string,"batch_id": string,"created_at"?: string,"id"?: string,"is_final"?: boolean,"max_marks": number,"pass_pct"?: number,"title": string,"trainer_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "assessment_date"?: string,"batch_id"?: string,"created_at"?: string,"id"?: string,"is_final"?: boolean,"max_marks"?: number,"pass_pct"?: number,"title"?: string,"trainer_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessments_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessments_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"assignments": {
                  Row: {
                    "assigned_on": string,"attachment_paths": (string)[],"batch_id": string,"course_id": string,"created_at": string,"created_by": string | null,"deadline": string,"description": string | null,"id": string,"instructions": string | null,"is_required": boolean,"late_policy": string,"max_marks": number,"module_id": string | null,"status": string,"submission_types": (string)[],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_on"?: string,"attachment_paths"?: (string)[],"batch_id": string,"course_id": string,"created_at"?: string,"created_by"?: string | null,"deadline": string,"description"?: string | null,"id"?: string,"instructions"?: string | null,"is_required"?: boolean,"late_policy"?: string,"max_marks"?: number,"module_id"?: string | null,"status"?: string,"submission_types"?: (string)[],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_on"?: string,"attachment_paths"?: (string)[],"batch_id"?: string,"course_id"?: string,"created_at"?: string,"created_by"?: string | null,"deadline"?: string,"description"?: string | null,"id"?: string,"instructions"?: string | null,"is_required"?: boolean,"late_policy"?: string,"max_marks"?: number,"module_id"?: string | null,"status"?: string,"submission_types"?: (string)[],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance": {
                  Row: {
                    "accuracy_m": number | null,"check_in_at": string | null,"created_at": string,"distance_m": number | null,"id": string,"latitude": number | null,"longitude": number | null,"marked_by": string | null,"session_id": string,"source": string,"status": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy_m"?: number | null,"check_in_at"?: string | null,"created_at"?: string,"distance_m"?: number | null,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"marked_by"?: string | null,"session_id": string,"source": string,"status": string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "accuracy_m"?: number | null,"check_in_at"?: string | null,"created_at"?: string,"distance_m"?: number | null,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"marked_by"?: string | null,"session_id"?: string,"source"?: string,"status"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_marked_by_fkey"
      columns: ["marked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance_correction_requests": {
                  Row: {
                    "created_at": string,"id": string,"reason": string,"requested_by": string,"requested_status": string,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"session_id": string,"status": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"reason": string,"requested_by": string,"requested_status": string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"session_id": string,"status"?: string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"reason"?: string,"requested_by"?: string,"requested_status"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"session_id"?: string,"status"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_correction_requests_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_correction_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_correction_requests_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_correction_requests_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance_history": {
                  Row: {
                    "attendance_id": string,"changed_at": string,"changed_by": string | null,"id": number,"new_status": string,"old_status": string | null,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attendance_id": string,"changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_status": string,"old_status"?: string | null,"reason"?: string | null
                  }
                  Update: {
                    "attendance_id"?: string,"changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_status"?: string,"old_status"?: string | null,"reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_history_attendance_id_fkey"
      columns: ["attendance_id"]
isOneToOne: false
      referencedRelation: "attendance"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity": string,"entity_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"batch_trainers": {
                  Row: {
                    "assigned_at": string,"batch_id": string,"is_primary": boolean,"trainer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string,"batch_id": string,"is_primary"?: boolean,"trainer_id": string
                  }
                  Update: {
                    "assigned_at"?: string,"batch_id"?: string,"is_primary"?: boolean,"trainer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "batch_trainers_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batch_trainers_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"batches": {
                  Row: {
                    "capacity": number,"class_end_time": string,"class_start_time": string,"code": string,"course_id": string,"created_at": string,"end_date": string,"id": string,"location": string | null,"name": string,"schedule_days": (number)[],"start_date": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity"?: number,"class_end_time"?: string,"class_start_time"?: string,"code": string,"course_id": string,"created_at"?: string,"end_date": string,"id"?: string,"location"?: string | null,"name": string,"schedule_days"?: (number)[],"start_date": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "capacity"?: number,"class_end_time"?: string,"class_start_time"?: string,"code"?: string,"course_id"?: string,"created_at"?: string,"end_date"?: string,"id"?: string,"location"?: string | null,"name"?: string,"schedule_days"?: (number)[],"start_date"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "batches_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"certificates": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"certificate_number": string | null,"completion_date": string | null,"course_id": string,"created_at": string,"eligibility_snapshot": NonNullable<Json>,"enrollment_id": string,"grade": string | null,"id": string,"overall_pct": number | null,"requested_by": string | null,"revoked_reason": string | null,"signatory_name": string | null,"signatory_title": string | null,"status": string,"student_id": string,"updated_at": string,"verification_token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"certificate_number"?: string | null,"completion_date"?: string | null,"course_id": string,"created_at"?: string,"eligibility_snapshot"?: NonNullable<Json>,"enrollment_id": string,"grade"?: string | null,"id"?: string,"overall_pct"?: number | null,"requested_by"?: string | null,"revoked_reason"?: string | null,"signatory_name"?: string | null,"signatory_title"?: string | null,"status"?: string,"student_id": string,"updated_at"?: string,"verification_token"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"certificate_number"?: string | null,"completion_date"?: string | null,"course_id"?: string,"created_at"?: string,"eligibility_snapshot"?: NonNullable<Json>,"enrollment_id"?: string,"grade"?: string | null,"id"?: string,"overall_pct"?: number | null,"requested_by"?: string | null,"revoked_reason"?: string | null,"signatory_name"?: string | null,"signatory_title"?: string | null,"status"?: string,"student_id"?: string,"updated_at"?: string,"verification_token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificates_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_enrollment_id_fkey"
      columns: ["enrollment_id"]
isOneToOne: true
      referencedRelation: "enrollments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"check_in_attempts": {
                  Row: {
                    "accuracy_m": number | null,"attempted_at": string,"distance_m": number | null,"id": number,"result": string,"session_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy_m"?: number | null,"attempted_at"?: string,"distance_m"?: number | null,"id"?: never,"result": string,"session_id": string,"student_id": string
                  }
                  Update: {
                    "accuracy_m"?: number | null,"attempted_at"?: string,"distance_m"?: number | null,"id"?: never,"result"?: string,"session_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "check_in_attempts_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "check_in_attempts_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"class_sessions": {
                  Row: {
                    "batch_id": string,"created_at": string,"ends_at": string,"id": string,"location": string | null,"module_id": string | null,"notes": string | null,"starts_at": string,"status": string,"title": string,"trainer_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"ends_at": string,"id"?: string,"location"?: string | null,"module_id"?: string | null,"notes"?: string | null,"starts_at": string,"status"?: string,"title": string,"trainer_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"ends_at"?: string,"id"?: string,"location"?: string | null,"module_id"?: string | null,"notes"?: string | null,"starts_at"?: string,"status"?: string,"title"?: string,"trainer_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_sessions_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"courses": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"duration_weeks": number,"fee_amount": number,"id": string,"name": string,"requirements": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"duration_weeks": number,"fee_amount"?: number,"id"?: string,"name": string,"requirements"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"duration_weeks"?: number,"fee_amount"?: number,"id"?: string,"name"?: string,"requirements"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"enrollments": {
                  Row: {
                    "batch_id": string,"course_id": string,"created_at": string,"created_by": string | null,"ended_on": string | null,"enrolled_on": string,"id": string,"notes": string | null,"status": string,"student_id": string,"transferred_from": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"course_id": string,"created_at"?: string,"created_by"?: string | null,"ended_on"?: string | null,"enrolled_on"?: string,"id"?: string,"notes"?: string | null,"status"?: string,"student_id": string,"transferred_from"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string,"course_id"?: string,"created_at"?: string,"created_by"?: string | null,"ended_on"?: string | null,"enrolled_on"?: string,"id"?: string,"notes"?: string | null,"status"?: string,"student_id"?: string,"transferred_from"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollments_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_transferred_from_fkey"
      columns: ["transferred_from"]
isOneToOne: false
      referencedRelation: "enrollments"
      referencedColumns: ["id"]
    }
                  ]
                },"fees": {
                  Row: {
                    "amount_paid": number,"created_at": string,"due_date": string | null,"enrollment_id": string,"id": string,"status": string,"student_id": string,"total_amount": number,"updated_at": string,"waived_amount": number,"waived_at": string | null,"waived_by": string | null,"waiver_document_path": string | null,"waiver_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paid"?: number,"created_at"?: string,"due_date"?: string | null,"enrollment_id": string,"id"?: string,"status"?: string,"student_id": string,"total_amount": number,"updated_at"?: string,"waived_amount"?: number,"waived_at"?: string | null,"waived_by"?: string | null,"waiver_document_path"?: string | null,"waiver_reason"?: string | null
                  }
                  Update: {
                    "amount_paid"?: number,"created_at"?: string,"due_date"?: string | null,"enrollment_id"?: string,"id"?: string,"status"?: string,"student_id"?: string,"total_amount"?: number,"updated_at"?: string,"waived_amount"?: number,"waived_at"?: string | null,"waived_by"?: string | null,"waiver_document_path"?: string | null,"waiver_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fees_enrollment_id_fkey"
      columns: ["enrollment_id"]
isOneToOne: true
      referencedRelation: "enrollments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fees_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fees_waived_by_fkey"
      columns: ["waived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"id_counters": {
                  Row: {
                    "last_value": number,"scope": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "last_value"?: number,"scope": string,"year": number
                  }
                  Update: {
                    "last_value"?: number,"scope"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"internship_reports": {
                  Row: {
                    "file_path": string | null,"hours_worked": number | null,"id": string,"internship_id": string,"mentor_comment": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"submitted_at": string,"summary": string,"week_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "file_path"?: string | null,"hours_worked"?: number | null,"id"?: string,"internship_id": string,"mentor_comment"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submitted_at"?: string,"summary": string,"week_number": number
                  }
                  Update: {
                    "file_path"?: string | null,"hours_worked"?: number | null,"id"?: string,"internship_id"?: string,"mentor_comment"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submitted_at"?: string,"summary"?: string,"week_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "internship_reports_internship_id_fkey"
      columns: ["internship_id"]
isOneToOne: false
      referencedRelation: "internships"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internship_reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"internship_tasks": {
                  Row: {
                    "created_at": string,"description": string | null,"due_date": string | null,"id": string,"internship_id": string,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"internship_id": string,"status"?: string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"internship_id"?: string,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "internship_tasks_internship_id_fkey"
      columns: ["internship_id"]
isOneToOne: false
      referencedRelation: "internships"
      referencedColumns: ["id"]
    }
                  ]
                },"internships": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"completion_status": string,"created_at": string,"end_date": string | null,"feedback": string | null,"id": string,"mentor_id": string | null,"organization": string | null,"progress_pct": number,"start_date": string,"status": string,"student_id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"completion_status"?: string,"created_at"?: string,"end_date"?: string | null,"feedback"?: string | null,"id"?: string,"mentor_id"?: string | null,"organization"?: string | null,"progress_pct"?: number,"start_date": string,"status"?: string,"student_id": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"completion_status"?: string,"created_at"?: string,"end_date"?: string | null,"feedback"?: string | null,"id"?: string,"mentor_id"?: string | null,"organization"?: string | null,"progress_pct"?: number,"start_date"?: string,"status"?: string,"student_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "internships_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internships_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internships_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"leave_requests": {
                  Row: {
                    "created_at": string,"end_date": string,"id": string,"reason": string,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"start_date": string,"status": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_date": string,"id"?: string,"reason": string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"start_date": string,"status"?: string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"end_date"?: string,"id"?: string,"reason"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"start_date"?: string,"status"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leave_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leave_requests_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"modules": {
                  Row: {
                    "course_id": string,"created_at": string,"description": string | null,"id": string,"position": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"position": number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"position"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "modules_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"link": string | null,"read_at": string | null,"recipient_id": string,"title": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"recipient_id": string,"title": string,"type": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"title"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_records": {
                  Row: {
                    "amount": number,"created_at": string,"fee_id": string,"id": string,"is_void": boolean,"method": string,"notes": string | null,"paid_on": string,"receipt_number": string | null,"recorded_by": string | null,"reference_number": string | null,"void_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"fee_id": string,"id"?: string,"is_void"?: boolean,"method": string,"notes"?: string | null,"paid_on"?: string,"receipt_number"?: string | null,"recorded_by"?: string | null,"reference_number"?: string | null,"void_reason"?: string | null
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"fee_id"?: string,"id"?: string,"is_void"?: boolean,"method"?: string,"notes"?: string | null,"paid_on"?: string,"receipt_number"?: string | null,"recorded_by"?: string | null,"reference_number"?: string | null,"void_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_records_fee_id_fkey"
      columns: ["fee_id"]
isOneToOne: false
      referencedRelation: "fees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_records_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"placement_interviews": {
                  Row: {
                    "created_at": string,"feedback": string | null,"id": string,"placement_id": string,"round_name": string,"round_number": number,"scheduled_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback"?: string | null,"id"?: string,"placement_id": string,"round_name": string,"round_number"?: number,"scheduled_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"feedback"?: string | null,"id"?: string,"placement_id"?: string,"round_name"?: string,"round_number"?: number,"scheduled_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "placement_interviews_placement_id_fkey"
      columns: ["placement_id"]
isOneToOne: false
      referencedRelation: "placements"
      referencedColumns: ["id"]
    }
                  ]
                },"placements": {
                  Row: {
                    "applied_on": string | null,"company": string,"created_at": string,"created_by": string | null,"id": string,"job_role": string,"notes": string | null,"offer_details": string | null,"outcome": string | null,"status": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_on"?: string | null,"company": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"job_role": string,"notes"?: string | null,"offer_details"?: string | null,"outcome"?: string | null,"status"?: string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "applied_on"?: string | null,"company"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"job_role"?: string,"notes"?: string | null,"offer_details"?: string | null,"outcome"?: string | null,"status"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "placements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placements_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"is_active": boolean,"phone": string | null,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"email": string,"full_name"?: string,"id": string,"is_active"?: boolean,"phone"?: string | null,"role"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_submissions": {
                  Row: {
                    "created_at": string,"feedback": string | null,"file_path": string | null,"id": string,"marks": number | null,"notes": string | null,"presentation_at": string | null,"presentation_status": string,"project_id": string,"project_url": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"student_id": string,"submitted_at": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback"?: string | null,"file_path"?: string | null,"id"?: string,"marks"?: number | null,"notes"?: string | null,"presentation_at"?: string | null,"presentation_status"?: string,"project_id": string,"project_url"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"student_id": string,"submitted_at"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"feedback"?: string | null,"file_path"?: string | null,"id"?: string,"marks"?: number | null,"notes"?: string | null,"presentation_at"?: string | null,"presentation_status"?: string,"project_id"?: string,"project_url"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"student_id"?: string,"submitted_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_submissions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_submissions_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_submissions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "batch_id": string,"created_at": string,"created_by": string | null,"deadline": string,"id": string,"instructions": string | null,"kind": string,"max_marks": number,"requires_presentation": boolean,"sequence": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"created_by"?: string | null,"deadline": string,"id"?: string,"instructions"?: string | null,"kind": string,"max_marks"?: number,"requires_presentation"?: boolean,"sequence"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"created_by"?: string | null,"deadline"?: string,"id"?: string,"instructions"?: string | null,"kind"?: string,"max_marks"?: number,"requires_presentation"?: boolean,"sequence"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"student_documents": {
                  Row: {
                    "created_at": string,"doc_type": string,"file_name": string,"file_path": string,"id": string,"mime_type": string,"size_bytes": number,"student_id": string,"uploaded_by": string | null,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doc_type": string,"file_name": string,"file_path": string,"id"?: string,"mime_type": string,"size_bytes": number,"student_id": string,"uploaded_by"?: string | null,"verified"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"doc_type"?: string,"file_name"?: string,"file_path"?: string,"id"?: string,"mime_type"?: string,"size_bytes"?: number,"student_id"?: string,"uploaded_by"?: string | null,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_documents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "address": string | null,"admission_date": string,"archived_at": string | null,"created_at": string,"created_by": string | null,"date_of_birth": string | null,"email": string,"emergency_contact_name": string | null,"emergency_contact_phone": string | null,"full_name": string,"id": string,"invited_at": string | null,"phone": string,"photo_path": string | null,"portfolio_url": string | null,"profile_id": string | null,"resume_path": string | null,"skills": (string)[],"status": string,"student_code": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"admission_date"?: string,"archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"email": string,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"full_name": string,"id"?: string,"invited_at"?: string | null,"phone": string,"photo_path"?: string | null,"portfolio_url"?: string | null,"profile_id"?: string | null,"resume_path"?: string | null,"skills"?: (string)[],"status"?: string,"student_code"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"admission_date"?: string,"archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"email"?: string,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"full_name"?: string,"id"?: string,"invited_at"?: string | null,"phone"?: string,"photo_path"?: string | null,"portfolio_url"?: string | null,"profile_id"?: string | null,"resume_path"?: string | null,"skills"?: (string)[],"status"?: string,"student_code"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"submission_history": {
                  Row: {
                    "attempt": number,"content_text": string | null,"external_url": string | null,"feedback": string | null,"file_path": string | null,"id": number,"is_late": boolean | null,"marks": number | null,"recorded_at": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"submission_id": string,"submitted_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt": number,"content_text"?: string | null,"external_url"?: string | null,"feedback"?: string | null,"file_path"?: string | null,"id"?: never,"is_late"?: boolean | null,"marks"?: number | null,"recorded_at"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status": string,"submission_id": string,"submitted_at"?: string | null
                  }
                  Update: {
                    "attempt"?: number,"content_text"?: string | null,"external_url"?: string | null,"feedback"?: string | null,"file_path"?: string | null,"id"?: never,"is_late"?: boolean | null,"marks"?: number | null,"recorded_at"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submission_id"?: string,"submitted_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_history_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "assignment_id": string,"attempt": number,"content_text": string | null,"created_at": string,"external_url": string | null,"feedback": string | null,"file_path": string | null,"first_submitted_at": string | null,"id": string,"is_late": boolean,"marks": number | null,"original_deadline": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"student_id": string,"submitted_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"attempt"?: number,"content_text"?: string | null,"created_at"?: string,"external_url"?: string | null,"feedback"?: string | null,"file_path"?: string | null,"first_submitted_at"?: string | null,"id"?: string,"is_late"?: boolean,"marks"?: number | null,"original_deadline": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"student_id": string,"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "assignment_id"?: string,"attempt"?: number,"content_text"?: string | null,"created_at"?: string,"external_url"?: string | null,"feedback"?: string | null,"file_path"?: string | null,"first_submitted_at"?: string | null,"id"?: string,"is_late"?: boolean,"marks"?: number | null,"original_deadline"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"student_id"?: string,"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"trainers": {
                  Row: {
                    "created_at": string,"email": string,"full_name": string,"id": string,"phone": string | null,"profile_id": string | null,"specialization": string | null,"status": string,"trainer_code": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"full_name": string,"id"?: string,"phone"?: string | null,"profile_id"?: string | null,"specialization"?: string | null,"status"?: string,"trainer_code"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"phone"?: string | null,"profile_id"?: string | null,"specialization"?: string | null,"status"?: string,"trainer_code"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trainers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admit_student":
{ Args: { "p_address": string,"p_admission_date": string,"p_batch": string,"p_course": string,"p_date_of_birth"?: string,"p_email": string,"p_emergency_name": string,"p_emergency_phone": string,"p_fee_amount": number,"p_fee_due"?: string,"p_full_name": string,"p_phone": string,"p_status"?: string }; Returns: Json
                           },
"approve_certificate":
{ Args: { "p_completion_date"?: string,"p_enrollment": string }; Returns: string
                           },
"assert_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"attendance_status_for":
{ Args: { "p_late_until": number,"p_minutes_after_start": number,"p_present_until": number }; Returns: string
                           },
"attendance_summary":
{ Args: { "p_batch": string,"p_student": string }; Returns: Json
                           },
"can_manage_batch":
{ Args: { "p_batch": string }; Returns: boolean
                           },
"can_mentor_internship":
{ Args: { "p_internship": string }; Returns: boolean
                           },
"can_view_internship":
{ Args: { "p_internship": string }; Returns: boolean
                           },
"certificate_eligibility":
{ Args: { "p_enrollment": string }; Returns: Json
                           },
"enroll_student":
{ Args: { "p_batch": string,"p_fee_amount": number,"p_fee_due"?: string,"p_student": string }; Returns: string
                           },
"fee_status":
{ Args: { "p_due": string,"p_paid": number,"p_total": number,"p_waived": number }; Returns: string
                           },
"generate_batch_sessions":
{ Args: { "p_batch": string,"p_from"?: string,"p_to"?: string }; Returns: number
                           },
"haversine_m":
{ Args: { "lat1": number,"lat2": number,"lon1": number,"lon2": number }; Returns: number
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_service_call":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_action":
{ Args: { "p_action": string,"p_details"?: Json,"p_entity": string,"p_entity_id": string }; Returns: undefined
                           },
"mark_notifications_read":
{ Args: { "p_ids"?: (string)[] }; Returns: undefined
                           },
"my_placements":
{ Args: Record<PropertyKey, never>; Returns: {
              "applied_on": string,"company": string,"id": string,"job_role": string,"offer_details": string,"outcome": string,"status": string,"updated_at": string
            }[]
                           },
"my_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_student_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_trainer_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"next_code":
{ Args: { "p_prefix": string,"p_scope": string,"p_year"?: number }; Returns: string
                           },
"notify":
{ Args: { "p_body"?: string,"p_link"?: string,"p_recipient": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"notify_batch_students":
{ Args: { "p_batch": string,"p_body": string,"p_link": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"placement_student":
{ Args: { "p_placement": string }; Returns: string
                           },
"record_assessment_result":
{ Args: { "p_assessment": string,"p_feedback": string,"p_score": number,"p_student": string }; Returns: undefined
                           },
"review_attendance_correction":
{ Args: { "p_approve": boolean,"p_note"?: string,"p_request": string }; Returns: undefined
                           },
"review_project":
{ Args: { "p_decision": string,"p_feedback": string,"p_marks": number,"p_presentation_at"?: string,"p_presentation_status"?: string,"p_submission": string }; Returns: undefined
                           },
"review_submission":
{ Args: { "p_decision": string,"p_feedback": string,"p_marks": number,"p_submission": string }; Returns: undefined
                           },
"revoke_certificate":
{ Args: { "p_certificate": string,"p_reason": string }; Returns: undefined
                           },
"run_daily_alerts":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"staff_mark_attendance":
{ Args: { "p_entries": Json,"p_reason"?: string,"p_session": string }; Returns: number
                           },
"student_check_in":
{ Args: { "p_accuracy": number,"p_lat": number,"p_lng": number,"p_session": string }; Returns: Json
                           },
"student_in_batch":
{ Args: { "p_batch": string,"p_student": string }; Returns: boolean
                           },
"submit_assignment":
{ Args: { "p_assignment": string,"p_file_path": string,"p_text": string,"p_url": string }; Returns: Json
                           },
"submit_project":
{ Args: { "p_file_path": string,"p_notes": string,"p_project": string,"p_url": string }; Returns: string
                           },
"trainer_placement_overview":
{ Args: Record<PropertyKey, never>; Returns: {
              "company": string,"job_role": string,"placement_id": string,"status": string,"student_id": string,"student_name": string,"updated_at": string
            }[]
                           },
"trainer_teaches_batch":
{ Args: { "p_batch": string }; Returns: boolean
                           },
"trainer_teaches_student":
{ Args: { "p_student": string }; Returns: boolean
                           },
"transfer_student":
{ Args: { "p_enrollment": string,"p_new_batch": string,"p_reason": string }; Returns: string
                           },
"try_uuid":
{ Args: { "p": string }; Returns: string
                           },
"verify_certificate":
{ Args: { "p_token": string }; Returns: {
              "certificate_number": string,"completion_date": string,"course_name": string,"grade": string,"status": string,"student_name": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
