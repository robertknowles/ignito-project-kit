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
  minimumYield: number;
  
  // Section B: Contract & Loan Details (8 fields)
  daysToUnconditional: number;
  daysForSettlement: number;
  lvr: number;
  lmiWaiver: boolean;
  loanProduct: 'IO' | 'PI';
  interestRate: number;
  loanTerm: number;
  loanOffsetAccount: number;
  
  // Section D: One-Off Purchase Costs (12 fields)
  engagementFee: number;
  conditionalHoldingDeposit: number;
  buildingInsuranceUpfront: number;
  buildingPestInspection: number;
  plumbingElectricalInspections: number;
  independentValuation: number;
  unconditionalHoldingDeposit: number;
  mortgageFees: number;
  conveyancing: number;
  ratesAdjustment: number;
  maintenanceAllowancePostSettlement: number;
  stampDutyOverride: number | null;
  
  // Section E: Cashflow (8 fields)
  vacancyRate: number;
  propertyManagementPercent: number;
  buildingInsuranceAnnual: number;
  councilRatesWater: number;
  strata: number;
  maintenanceAllowanceAnnual: number;
  landTaxOverride: number | null;
  potentialDeductionsRebates: number;
}

// Type definition for scenario data stored in scenarios.data column
export interface ScenarioData {
  propertySelections: { [propertyId: string]: number };
  investmentProfile: {
    depositPool: number;
    borrowingCapacity: number;
    portfolioValue: number;
    currentDebt: number;
    annualSavings: number;
    timelineYears: number;
    equityGrowth: number;
    cashflow: number;
  };
  propertyInstances?: Record<string, PropertyInstanceDetails>;
  lastSaved: string;
}

// User role enum type
export type UserRole = 'owner' | 'agent' | 'client';

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          owner_id: string | null
          seat_limit: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          owner_id?: string | null
          seat_limit?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          owner_id?: string | null
          seat_limit?: number
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: number
          name: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
          company_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          company_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          data: Json | null
          full_name: string | null
          id: string
          updated_at: string | null
          company_id: string | null
          role: UserRole | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          data?: Json | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          company_id?: string | null
          role?: UserRole | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          data?: Json | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          company_id?: string | null
          role?: UserRole | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      scenarios: {
        Row: {
          client_id: number
          created_at: string
          data: Json | null
          id: number
          name: string | null
          updated_at: string | null
          client_display_name: string | null
          agent_display_name: string | null
          company_display_name: string | null
          share_id: string | null
          company_id: string | null
          client_user_id: string | null
        }
        Insert: {
          client_id: number
          created_at?: string
          data?: Json | null
          id?: number
          name?: string | null
          updated_at?: string | null
          client_display_name?: string | null
          agent_display_name?: string | null
          company_display_name?: string | null
          share_id?: string | null
          company_id?: string | null
          client_user_id?: string | null
        }
        Update: {
          client_id?: number
          created_at?: string
          data?: Json | null
          id?: number
          name?: string | null
          updated_at?: string | null
          client_display_name?: string | null
          agent_display_name?: string | null
          company_display_name?: string | null
          share_id?: string | null
          company_id?: string | null
          client_user_id?: string | null
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
            foreignKeyName: "scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
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
      [_ in never]: never
    }
    Enums: {
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
      user_role: ['owner', 'agent', 'client'] as const,
    },
  },
} as const
