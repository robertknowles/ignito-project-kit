export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Type definition for property instance data stored in scenarios
export interface PropertyInstanceDetails {
  // Section A: Property Overview (6 fields)
  state: string;
  purchasePrice: number;
  valuationAtPurchase: number;
  rentPerWeek: number;
  growthAssumption: 'High' | 'Medium' | 'Low';

  // Section B: Contract & Loan Details (5 fields)
  lvr: number;
  lmiWaiver: boolean;
  loanProduct: 'IO' | 'PI';
  interestRate: number;
  loanTerm: number;

  // Section D: One-Off Purchase Costs (10 fields)
  engagementFee: number;
  conditionalHoldingDeposit: number;
  buildingInsuranceUpfront: number;
  buildingPestInspection: number;
  plumbingElectricalInspections: number;
  independentValuation: number;
  mortgageFees: number;
  conveyancing: number;
  maintenanceAllowancePostSettlement: number;
  stampDutyOverride: number | null;

  // Section E: Cashflow (6 fields)
  propertyManagementPercent: number;
  buildingInsuranceAnnual: number;
  councilRatesWater: number;
  strata: number;
  maintenanceAllowanceAnnual: number;
  landTaxOverride: number | null;
}

// Type definition for scenario data stored in scenarios.data column
export interface ScenarioData {
  propertySelections: { [propertyId: string]: number };
  propertyOrder?: string[];
  investmentProfile: {
    depositPool: number;
    borrowingCapacity: number;
    portfolioValue: number;
    currentDebt: number;
    annualSavings: number;
    timelineYears: number;
    equityGoal: number;
    cashflowGoal: number;
    // Enhanced dynamic features
    equityFactor: number;
    // Dual serviceability model
    baseSalary: number;
    salaryServiceabilityMultiplier: number;
    serviceabilityRatio: number;
    // Engine fine-tuning parameters
    equityReleaseFactor: number;
    depositBuffer: number;
    rentFactor: number;
    // Growth curve
    growthCurve: {
      year1: number;
      years2to3: number;
      year4: number;
      year5plus: number;
    };
    // Advanced portfolio settings
    useExistingEquity: boolean;
    maxPurchasesPerYear: number;
    existingPortfolioGrowthRate: number;
  };
  propertyInstances?: Record<string, PropertyInstanceDetails>;
  timelineSnapshot?: unknown[];
  chartData?: {
    portfolioGrowthData: Array<{
      year: string;
      portfolioValue: number;
      equity: number;
      properties?: string[];
    }>;
    cashflowData: Array<{
      year: string;
      cashflow: number;
      rentalIncome: number;
      loanRepayments: number;
      expenses: number;
      highlight?: boolean;
    }>;
    equityGoalYear: number | null;
    incomeGoalYear: number | null;
  };
  comparisonMode?: boolean;
  lastSaved: string;
}

// User role enum type
export type UserRole = 'owner' | 'agent' | 'client';

// New enum types for client lifecycle
export type ClientStage = 'onboarding' | 'review';
export type PortalStatus = 'not_invited' | 'invited' | 'active';
export type RoadmapStatus = 'not_started' | 'draft' | 'in_review' | 'finalised';

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          actor_id: string | null
          client_id: number
          company_id: string | null
          created_at: string
          event_type: string
          id: number
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          client_id: number
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: number
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          client_id?: number
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: number
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_properties: {
        Row: {
          address: string | null
          client_id: number
          company_id: string | null
          created_at: string
          current_value: number | null
          id: number
          loan_balance: number | null
          notes: string | null
          postcode: string | null
          property_type: string | null
          purchase_date: string | null
          purchase_price: number | null
          rental_income_weekly: number | null
          state: string | null
          suburb: string | null
          tenanted_until: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_id: number
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: number
          loan_balance?: number | null
          notes?: string | null
          postcode?: string | null
          property_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          rental_income_weekly?: number | null
          state?: string | null
          suburb?: string | null
          tenanted_until?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_id?: number
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: number
          loan_balance?: number | null
          notes?: string | null
          postcode?: string | null
          property_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          rental_income_weekly?: number | null
          state?: string | null
          suburb?: string | null
          tenanted_until?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          annual_income: number | null
          available_savings: number | null
          borrowing_capacity: number | null
          company_id: string | null
          created_at: string
          date_of_birth: string | null
          dependants: number | null
          email: string | null
          employment: string | null
          id: number
          last_active_at: string | null
          marital_status: string | null
          name: string | null
          next_review_date: string | null
          notes: string | null
          partner_income: number | null
          phone: string | null
          portal_status: PortalStatus
          pre_approval_expiry: string | null
          pre_approval_status: string | null
          preferred_locations: string | null
          preferred_property_type: string | null
          primary_goal: string | null
          purchase_timeline: string | null
          risk_tolerance: string | null
          roadmap_status: RoadmapStatus
          stage: ClientStage
          strategy_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          annual_income?: number | null
          available_savings?: number | null
          borrowing_capacity?: number | null
          company_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          dependants?: number | null
          email?: string | null
          employment?: string | null
          id?: number
          last_active_at?: string | null
          marital_status?: string | null
          name?: string | null
          next_review_date?: string | null
          notes?: string | null
          partner_income?: number | null
          phone?: string | null
          portal_status?: PortalStatus
          pre_approval_expiry?: string | null
          pre_approval_status?: string | null
          preferred_locations?: string | null
          preferred_property_type?: string | null
          primary_goal?: string | null
          purchase_timeline?: string | null
          risk_tolerance?: string | null
          roadmap_status?: RoadmapStatus
          stage?: ClientStage
          strategy_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          annual_income?: number | null
          available_savings?: number | null
          borrowing_capacity?: number | null
          company_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          dependants?: number | null
          email?: string | null
          employment?: string | null
          id?: number
          last_active_at?: string | null
          marital_status?: string | null
          name?: string | null
          next_review_date?: string | null
          notes?: string | null
          partner_income?: number | null
          phone?: string | null
          portal_status?: PortalStatus
          pre_approval_expiry?: string | null
          pre_approval_status?: string | null
          preferred_locations?: string | null
          preferred_property_type?: string | null
          primary_goal?: string | null
          purchase_timeline?: string | null
          risk_tolerance?: string | null
          roadmap_status?: RoadmapStatus
          stage?: ClientStage
          strategy_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          is_client_interactive_enabled: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          primary_color: string | null
          seat_limit: number | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_client_interactive_enabled?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          primary_color?: string | null
          seat_limit?: number | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_client_interactive_enabled?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          primary_color?: string | null
          seat_limit?: number | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          client_id: number
          company_id: string | null
          completed_at: string | null
          created_at: string
          form_type: string
          id: number
          opened_at: string | null
          questions: Json | null
          responses: Json | null
          sent_at: string
          sent_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          client_id: number
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          form_type: string
          id?: number
          opened_at?: string | null
          questions?: Json | null
          responses?: Json | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          client_id?: number
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          form_type?: string
          id?: number
          opened_at?: string | null
          questions?: Json | null
          responses?: Json | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          client_roadmaps_limit: number | null
          client_roadmaps_used: number | null
          company_id: string | null
          company_name: string | null
          created_at: string
          data: Json | null
          full_name: string | null
          has_completed_clients_tour: boolean | null
          has_completed_property_onboarding: boolean | null
          has_completed_tour: boolean | null
          id: string
          role: UserRole | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          client_roadmaps_limit?: number | null
          client_roadmaps_used?: number | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          data?: Json | null
          full_name?: string | null
          has_completed_clients_tour?: boolean | null
          has_completed_property_onboarding?: boolean | null
          has_completed_tour?: boolean | null
          id?: string
          role?: UserRole | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          client_roadmaps_limit?: number | null
          client_roadmaps_used?: number | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          data?: Json | null
          full_name?: string | null
          has_completed_clients_tour?: boolean | null
          has_completed_property_onboarding?: boolean | null
          has_completed_tour?: boolean | null
          id?: string
          role?: UserRole | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          agent_display_name: string | null
          client_display_name: string | null
          client_id: number
          client_user_id: string | null
          company_display_name: string | null
          company_id: string | null
          created_at: string
          data: Json | null
          id: number
          name: string | null
          onboarding_id: string | null
          share_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_display_name?: string | null
          client_display_name?: string | null
          client_id: number
          client_user_id?: string | null
          company_display_name?: string | null
          company_id?: string | null
          created_at?: string
          data?: Json | null
          id?: number
          name?: string | null
          onboarding_id?: string | null
          share_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_display_name?: string | null
          client_display_name?: string | null
          client_id?: number
          client_user_id?: string | null
          company_display_name?: string | null
          company_id?: string | null
          created_at?: string
          data?: Json | null
          id?: number
          name?: string | null
          onboarding_id?: string | null
          share_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: never; Returns: string }
      get_user_role_and_company: {
        Args: never
        Returns: {
          user_company_id: string
          user_role: UserRole
        }[]
      }
      is_company_owner: { Args: { check_company_id: string }; Returns: boolean }
    }
    Enums: {
      client_stage: ClientStage
      portal_status: PortalStatus
      roadmap_status: RoadmapStatus
      user_role: UserRole
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
      client_stage: ['onboarding', 'review'] as const,
      portal_status: ['not_invited', 'invited', 'active'] as const,
      roadmap_status: ['not_started', 'draft', 'in_review', 'finalised'] as const,
      user_role: ['owner', 'agent', 'client'] as const,
    },
  },
} as const
