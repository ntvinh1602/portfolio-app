export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          currency_code: string
          id: string
          name: string
          ticker: string
          user_id: string
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          currency_code: string
          id?: string
          name: string
          ticker: string
          user_id: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          currency_code?: string
          id?: string
          name?: string
          ticker?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          name: string
          type: Database["public"]["Enums"]["currency_type"]
        }
        Insert: {
          code: string
          name: string
          type: Database["public"]["Enums"]["currency_type"]
        }
        Update: {
          code?: string
          name?: string
          type?: Database["public"]["Enums"]["currency_type"]
        }
        Relationships: []
      }
      debts: {
        Row: {
          currency_code: string
          id: string
          interest_rate: number
          lender_name: string
          principal_amount: number
          start_date: string
          status: Database["public"]["Enums"]["debt_status"]
          user_id: string
        }
        Insert: {
          currency_code: string
          id?: string
          interest_rate?: number
          lender_name: string
          principal_amount: number
          start_date: string
          status: Database["public"]["Enums"]["debt_status"]
          user_id: string
        }
        Update: {
          currency_code?: string
          id?: string
          interest_rate?: number
          lender_name?: string
          principal_amount?: number
          start_date?: string
          status?: Database["public"]["Enums"]["debt_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "debts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          date: string
          from_currency_code: string
          id: number
          rate: number
          to_currency_code: string
        }
        Insert: {
          date: string
          from_currency_code: string
          id?: number
          rate: number
          to_currency_code: string
        }
        Update: {
          date?: string
          from_currency_code?: string
          id?: number
          rate?: number
          to_currency_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_code_fkey"
            columns: ["from_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_code_fkey"
            columns: ["to_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      lot_consumptions: {
        Row: {
          quantity_consumed: number
          sell_transaction_leg_id: string
          tax_lot_id: string
        }
        Insert: {
          quantity_consumed: number
          sell_transaction_leg_id: string
          tax_lot_id: string
        }
        Update: {
          quantity_consumed?: number
          sell_transaction_leg_id?: string
          tax_lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_consumptions_sell_transaction_leg_id_fkey"
            columns: ["sell_transaction_leg_id"]
            isOneToOne: false
            referencedRelation: "transaction_legs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_consumptions_tax_lot_id_fkey"
            columns: ["tax_lot_id"]
            isOneToOne: false
            referencedRelation: "tax_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          display_currency: string
          display_name: string | null
          id: string
        }
        Insert: {
          display_currency: string
          display_name?: string | null
          id: string
        }
        Update: {
          display_currency?: string
          display_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_display_currency_fkey"
            columns: ["display_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_lots: {
        Row: {
          asset_id: string
          cost_basis: number
          creation_date: string
          creation_transaction_id: string
          id: string
          origin: Database["public"]["Enums"]["transaction_type"]
          original_quantity: number
          remaining_quantity: number
          user_id: string
        }
        Insert: {
          asset_id: string
          cost_basis: number
          creation_date: string
          creation_transaction_id: string
          id?: string
          origin: Database["public"]["Enums"]["transaction_type"]
          original_quantity: number
          remaining_quantity: number
          user_id: string
        }
        Update: {
          asset_id?: string
          cost_basis?: number
          creation_date?: string
          creation_transaction_id?: string
          id?: string
          origin?: Database["public"]["Enums"]["transaction_type"]
          original_quantity?: number
          remaining_quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_lots_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_lots_creation_transaction_id_fkey"
            columns: ["creation_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_lots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_details: {
        Row: {
          fees: number
          price: number
          taxes: number
          transaction_id: string
        }
        Insert: {
          fees?: number
          price: number
          taxes?: number
          transaction_id: string
        }
        Update: {
          fees?: number
          price?: number
          taxes?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_details_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_legs: {
        Row: {
          account_id: string
          amount: number
          asset_id: string
          currency_code: string
          id: string
          quantity: number
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount: number
          asset_id: string
          currency_code: string
          id?: string
          quantity: number
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          asset_id?: string
          currency_code?: string
          id?: string
          quantity?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_legs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_legs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_legs_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transaction_legs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          description: string | null
          id: string
          related_debt_id: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          related_debt_id?: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          description?: string | null
          id?: string
          related_debt_id?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_related_debt_id_fkey"
            columns: ["related_debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      account_type:
        | "brokerage"
        | "crypto_exchange"
        | "epf"
        | "bank"
        | "wallet"
        | "conceptual"
      asset_class: "cash" | "stock" | "crypto" | "epf" | "equity" | "liability"
      currency_type: "fiat" | "crypto"
      debt_status: "active" | "paid_off"
      transaction_type:
        | "buy"
        | "sell"
        | "deposit"
        | "withdraw"
        | "expense"
        | "income"
        | "contribution"
        | "dividend"
        | "debt_payment"
        | "interest_payment"
        | "split"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: [
        "brokerage",
        "crypto_exchange",
        "epf",
        "bank",
        "wallet",
        "conceptual",
      ],
      asset_class: ["cash", "stock", "crypto", "epf", "equity", "liability"],
      currency_type: ["fiat", "crypto"],
      debt_status: ["active", "paid_off"],
      transaction_type: [
        "buy",
        "sell",
        "deposit",
        "withdraw",
        "expense",
        "income",
        "contribution",
        "dividend",
        "debt_payment",
        "interest_payment",
        "split",
      ],
    },
  },
} as const
