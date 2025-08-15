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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          current_quantity: number
          id: string
          security_id: string | null
          user_id: string
        }
        Insert: {
          current_quantity?: number
          id?: string
          security_id?: string | null
          user_id: string
        }
        Update: {
          current_quantity?: number
          id?: string
          security_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
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
      daily_crypto_prices: {
        Row: {
          date: string
          price: number
          security_id: string
        }
        Insert: {
          date: string
          price: number
          security_id: string
        }
        Update: {
          date?: string
          price?: number
          security_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_crypto_prices_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_exchange_rates: {
        Row: {
          currency_code: string
          date: string
          rate: number
        }
        Insert: {
          currency_code: string
          date: string
          rate: number
        }
        Update: {
          currency_code?: string
          date?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      daily_market_indices: {
        Row: {
          close: number | null
          date: string
          symbol: string
        }
        Insert: {
          close?: number | null
          date: string
          symbol: string
        }
        Update: {
          close?: number | null
          date?: string
          symbol?: string
        }
        Relationships: []
      }
      daily_performance_snapshots: {
        Row: {
          date: string
          equity_index: number | null
          id: string
          net_cash_flow: number
          net_equity_value: number
          user_id: string
        }
        Insert: {
          date: string
          equity_index?: number | null
          id?: string
          net_cash_flow: number
          net_equity_value: number
          user_id: string
        }
        Update: {
          date?: string
          equity_index?: number | null
          id?: string
          net_cash_flow?: number
          net_equity_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_performance_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stock_prices: {
        Row: {
          date: string
          price: number
          security_id: string
        }
        Insert: {
          date: string
          price: number
          security_id: string
        }
        Update: {
          date?: string
          price?: number
          security_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_daily_prices_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
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
      dnse_orders: {
        Row: {
          average_price: number | null
          fee: number | null
          fill_quantity: number | null
          id: number
          modified_date: string | null
          order_status: string | null
          side: string
          symbol: string
          tax: number | null
          txn_created: boolean | null
        }
        Insert: {
          average_price?: number | null
          fee?: number | null
          fill_quantity?: number | null
          id: number
          modified_date?: string | null
          order_status?: string | null
          side: string
          symbol: string
          tax?: number | null
          txn_created?: boolean | null
        }
        Update: {
          average_price?: number | null
          fee?: number | null
          fill_quantity?: number | null
          id?: number
          modified_date?: string | null
          order_status?: string | null
          side?: string
          symbol?: string
          tax?: number | null
          txn_created?: boolean | null
        }
        Relationships: []
      }
      live_securities_data: {
        Row: {
          asset: Database["public"]["Enums"]["asset_class"]
          price: number
          symbol: string
          trade_time: string
        }
        Insert: {
          asset: Database["public"]["Enums"]["asset_class"]
          price: number
          symbol: string
          trade_time?: string
        }
        Update: {
          asset?: Database["public"]["Enums"]["asset_class"]
          price?: number
          symbol?: string
          trade_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_securities_data_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
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
        ]
      }
      securities: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          currency_code: string | null
          id: string
          logo_url: string | null
          name: string
          ticker: string
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          currency_code?: string | null
          id?: string
          logo_url?: string | null
          name: string
          ticker: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          currency_code?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "securities_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
          origin: Database["public"]["Enums"]["tax_lot_origin"]
          original_quantity: number
          remaining_quantity: number
          user_id: string
        }
        Insert: {
          asset_id: string
          cost_basis?: number
          creation_date: string
          creation_transaction_id: string
          id?: string
          origin: Database["public"]["Enums"]["tax_lot_origin"]
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
          origin?: Database["public"]["Enums"]["tax_lot_origin"]
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
      transaction_legs: {
        Row: {
          amount: number
          asset_id: string
          currency_code: string
          id: string
          quantity: number
          transaction_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          currency_code: string
          id?: string
          quantity: number
          transaction_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          currency_code?: string
          id?: string
          quantity?: number
          transaction_id?: string
        }
        Relationships: [
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
          created_at: string | null
          description: string | null
          id: string
          price: number | null
          related_debt_id: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          price?: number | null
          related_debt_id?: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          price?: number | null
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
      add_borrow_transaction: {
        Args: {
          p_cash_asset_id: string
          p_created_at?: string
          p_description: string
          p_interest_rate: number
          p_lender_name: string
          p_principal_amount: number
          p_transaction_date: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_buy_transaction: {
        Args: {
          p_asset_id: string
          p_cash_asset_id: string
          p_created_at?: string
          p_description: string
          p_price: number
          p_quantity: number
          p_transaction_date: string
          p_user_id: string
        }
        Returns: string
      }
      add_debt_payment_transaction: {
        Args: {
          p_cash_asset_id: string
          p_created_at?: string
          p_debt_id: string
          p_description: string
          p_interest_payment: number
          p_principal_payment: number
          p_transaction_date: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_deposit_transaction: {
        Args: {
          p_asset_id: string
          p_created_at?: string
          p_description: string
          p_quantity: number
          p_transaction_date: string
          p_user_id: string
        }
        Returns: Json
      }
      add_expense_transaction: {
        Args: {
          p_asset_id: string
          p_created_at?: string
          p_description: string
          p_quantity: number
          p_transaction_date: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_income_transaction: {
        Args: {
          p_asset_id: string
          p_created_at?: string
          p_description: string
          p_quantity: number
          p_transaction_date: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_sell_transaction: {
        Args: {
          p_asset_id: string
          p_cash_asset_id: string
          p_created_at?: string
          p_description: string
          p_price: number
          p_quantity_to_sell: number
          p_transaction_date: string
          p_user_id: string
        }
        Returns: string
      }
      add_split_transaction: {
        Args: {
          p_asset_id: string
          p_created_at?: string
          p_description: string
          p_quantity: number
          p_transaction_date: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_withdraw_transaction: {
        Args: {
          p_asset_id: string
          p_created_at?: string
          p_description: string
          p_quantity: number
          p_transaction_date: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_pnl: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: number
      }
      calculate_twr: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: number
      }
      generate_performance_snapshots: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: undefined
      }
      get_active_debts: {
        Args: { p_user_id: string }
        Returns: {
          currency_code: string
          id: string
          interest_rate: number
          lender_name: string
          principal_amount: number
          start_date: string
          status: Database["public"]["Enums"]["debt_status"]
          user_id: string
        }[]
      }
      get_asset_balance: {
        Args: { p_asset_id: string; p_user_id: string }
        Returns: number
      }
      get_asset_currency: {
        Args: { p_asset_id: string; p_user_id: string }
        Returns: string
      }
      get_asset_data: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_asset_id_from_ticker: {
        Args: { p_ticker: string; p_user_id: string }
        Returns: string
      }
      get_asset_summary: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_benchmark_chart_data: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_threshold: number
          p_user_id: string
        }
        Returns: {
          date: string
          portfolio_value: number
          vni_value: number
        }[]
      }
      get_crypto_holdings: {
        Args: { p_user_id: string }
        Returns: {
          cost_basis: number
          latest_price: number
          latest_usd_rate: number
          logo_url: string
          name: string
          quantity: number
          ticker: string
        }[]
      }
      get_equity_chart_data: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_threshold: number
          p_user_id: string
        }
        Returns: {
          date: string
          net_equity_value: number
        }[]
      }
      get_latest_crypto_price: {
        Args: { p_security_id: string }
        Returns: number
      }
      get_latest_exchange_rate: {
        Args: { p_currency_code: string }
        Returns: number
      }
      get_latest_stock_price: {
        Args: { p_security_id: string }
        Returns: number
      }
      get_monthly_expenses: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          interest: number
          month: string
          taxes: number
          trading_fees: number
        }[]
      }
      get_monthly_pnl: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          month: string
          pnl: number
        }[]
      }
      get_monthly_twr: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          month: string
          twr: number
        }[]
      }
      get_stock_holdings: {
        Args: { p_user_id: string }
        Returns: {
          cost_basis: number
          latest_price: number
          logo_url: string
          name: string
          quantity: number
          ticker: string
        }[]
      }
      get_transaction_feed: {
        Args: {
          asset_class_filter?: string
          end_date?: string
          p_user_id: string
          page_number: number
          page_size: number
          start_date?: string
        }
        Returns: {
          amount: number
          currency_code: string
          description: string
          logo_url: string
          name: string
          quantity: number
          ticker: string
          transaction_date: string
          transaction_id: string
          type: string
        }[]
      }
      import_transactions: {
        Args: {
          p_start_date: string
          p_transactions_data: Json
          p_user_id: string
        }
        Returns: undefined
      }
      process_dnse_orders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      upsert_daily_crypto_price: {
        Args: { p_price: number; p_ticker: string }
        Returns: undefined
      }
      upsert_daily_stock_price: {
        Args: { p_price: number; p_ticker: string }
        Returns: undefined
      }
    }
    Enums: {
      asset_class: "cash" | "stock" | "crypto" | "epf" | "equity" | "liability"
      currency_type: "fiat" | "crypto"
      debt_status: "active" | "paid_off"
      tax_lot_origin: "purchase" | "split" | "deposit"
      transaction_type:
        | "buy"
        | "sell"
        | "deposit"
        | "withdraw"
        | "expense"
        | "income"
        | "dividend"
        | "debt_payment"
        | "split"
        | "borrow"
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
      asset_class: ["cash", "stock", "crypto", "epf", "equity", "liability"],
      currency_type: ["fiat", "crypto"],
      debt_status: ["active", "paid_off"],
      tax_lot_origin: ["purchase", "split", "deposit"],
      transaction_type: [
        "buy",
        "sell",
        "deposit",
        "withdraw",
        "expense",
        "income",
        "dividend",
        "debt_payment",
        "split",
        "borrow",
      ],
    },
  },
} as const
