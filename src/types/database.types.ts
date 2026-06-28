export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  flight: {
    Tables: {
      aircrafts: {
        Row: {
          icao_code: string
          id: string
          model: string | null
        }
        Insert: {
          icao_code: string
          id?: string
          model?: string | null
        }
        Update: {
          icao_code?: string
          id?: string
          model?: string | null
        }
        Relationships: []
      }
      airlines: {
        Row: {
          id: string
          logo: string | null
          name: string
        }
        Insert: {
          id?: string
          logo?: string | null
          name: string
        }
        Update: {
          id?: string
          logo?: string | null
          name?: string
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string
          country: string
          geom: unknown
          iata_code: string
          icao_code: string | null
          id: string
          lat: number
          lng: number
          name: string
          timezone: string
        }
        Insert: {
          city: string
          country: string
          geom?: unknown
          iata_code: string
          icao_code?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          timezone: string
        }
        Update: {
          city?: string
          country?: string
          geom?: unknown
          iata_code?: string
          icao_code?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      flights: {
        Row: {
          aircraft_id: string | null
          airline_id: string | null
          arrival_airport_id: string
          arrival_time: string | null
          departure_airport_id: string
          departure_time: string | null
          flight_number: string | null
          id: string
          notes: string | null
          seat: string | null
          seat_position: Database["flight"]["Enums"]["seat_position"] | null
          seat_type: Database["flight"]["Enums"]["seat_type"] | null
          tail_number: string | null
          user_id: string | null
        }
        Insert: {
          aircraft_id?: string | null
          airline_id?: string | null
          arrival_airport_id: string
          arrival_time?: string | null
          departure_airport_id: string
          departure_time?: string | null
          flight_number?: string | null
          id?: string
          notes?: string | null
          seat?: string | null
          seat_position?: Database["flight"]["Enums"]["seat_position"] | null
          seat_type?: Database["flight"]["Enums"]["seat_type"] | null
          tail_number?: string | null
          user_id?: string | null
        }
        Update: {
          aircraft_id?: string | null
          airline_id?: string | null
          arrival_airport_id?: string
          arrival_time?: string | null
          departure_airport_id?: string
          departure_time?: string | null
          flight_number?: string | null
          id?: string
          notes?: string | null
          seat?: string | null
          seat_position?: Database["flight"]["Enums"]["seat_position"] | null
          seat_type?: Database["flight"]["Enums"]["seat_type"] | null
          tail_number?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flights_aircrafts_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircrafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flights_airlines_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flights_arrival_airport_id_fkey"
            columns: ["arrival_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flights_arrival_airport_id_fkey"
            columns: ["arrival_airport_id"]
            isOneToOne: false
            referencedRelation: "routes_geojson"
            referencedColumns: ["airport_a_id"]
          },
          {
            foreignKeyName: "flights_arrival_airport_id_fkey"
            columns: ["arrival_airport_id"]
            isOneToOne: false
            referencedRelation: "routes_geojson"
            referencedColumns: ["airport_b_id"]
          },
          {
            foreignKeyName: "flights_departure_airport_id_fkey"
            columns: ["departure_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flights_departure_airport_id_fkey"
            columns: ["departure_airport_id"]
            isOneToOne: false
            referencedRelation: "routes_geojson"
            referencedColumns: ["airport_a_id"]
          },
          {
            foreignKeyName: "flights_departure_airport_id_fkey"
            columns: ["departure_airport_id"]
            isOneToOne: false
            referencedRelation: "routes_geojson"
            referencedColumns: ["airport_b_id"]
          },
        ]
      }
    }
    Views: {
      flights_readable: {
        Row: {
          aircraft_model: string | null
          airline_logo: string | null
          airline_name: string | null
          arrival_airport_code: string | null
          arrival_airport_name: string | null
          arrival_time: string | null
          departure_airport_code: string | null
          departure_airport_name: string | null
          departure_time: string | null
          distance_km: number | null
          duration: string | null
          flight_number: string | null
          seat: string | null
          seat_position: Database["flight"]["Enums"]["seat_position"] | null
          seat_type: Database["flight"]["Enums"]["seat_type"] | null
          tail_number: string | null
          user_id: string | null
        }
        Relationships: []
      }
      lifetime_stats: {
        Row: {
          airframe_count: number | null
          airports_count: number | null
          country_count: number | null
          flights_count: number | null
          total_distance: number | null
          total_duration: string | null
          user_id: string | null
        }
        Relationships: []
      }
      routes_geojson: {
        Row: {
          airport_a_city: string | null
          airport_a_country: string | null
          airport_a_iata: string | null
          airport_a_id: string | null
          airport_a_name: string | null
          airport_b_city: string | null
          airport_b_country: string | null
          airport_b_iata: string | null
          airport_b_id: string | null
          airport_b_name: string | null
          distance_km: number | null
          flights_by_direction: Json | null
          geometry: Json | null
          id: string | null
          route_frequency: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      insert_flight_with_timezone: {
        Args: {
          p_aircraft_id: string
          p_airline_id: string
          p_arrival_airport_id: string
          p_arrival_local: string
          p_departure_airport_id: string
          p_departure_local: string
          p_flight_number: string
        }
        Returns: undefined
      }
    }
    Enums: {
      seat_position: "window" | "middle" | "aisle"
      seat_type: "eco" | "biz"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      asset_positions: {
        Row: {
          asset_id: string
          average_cost: number
          quantity: number
        }
        Insert: {
          asset_id: string
          average_cost?: number
          quantity?: number
        }
        Update: {
          asset_id?: string
          average_cost?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_positions_stock_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          currency_code: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          ticker: string
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          currency_code: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          ticker: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          currency_code?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_currency_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "dnse_orders_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "dnse_orders_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "balance_sheet"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "dnse_orders_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "stock_annual_pnl"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "dnse_orders_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "stock_holdings"
            referencedColumns: ["ticker"]
          },
        ]
      }
      historical_fxrate: {
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
      historical_prices: {
        Row: {
          asset_id: string
          close: number
          date: string
        }
        Insert: {
          asset_id: string
          close: number
          date: string
        }
        Update: {
          asset_id?: string
          close?: number
          date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_security_prices_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      news_article_assets: {
        Row: {
          article_id: string
          asset_id: string
          created_at: string | null
        }
        Insert: {
          article_id: string
          asset_id: string
          created_at?: string | null
        }
        Update: {
          article_id?: string
          asset_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_article_assets_article_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_article_assets_asset_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          created_at: string | null
          excerpt: string | null
          id: string
          published_at: string | null
          source: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          source: string
          title: string
          url: string
        }
        Update: {
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      refresh_queue: {
        Row: {
          created_at: string | null
          id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
        }
        Update: {
          created_at?: string | null
          id?: number
        }
        Relationships: []
      }
      tx_cashflow: {
        Row: {
          asset_id: string
          fx_rate: number
          net_proceed: number
          operation: Database["public"]["Enums"]["cashflow_ops"]
          quantity: number
          tx_id: string
        }
        Insert: {
          asset_id: string
          fx_rate?: number
          net_proceed?: number
          operation: Database["public"]["Enums"]["cashflow_ops"]
          quantity: number
          tx_id?: string
        }
        Update: {
          asset_id?: string
          fx_rate?: number
          net_proceed?: number
          operation?: Database["public"]["Enums"]["cashflow_ops"]
          quantity?: number
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tx_cashflow_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tx_cashflow_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: true
            referencedRelation: "tx_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tx_cashflow_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: true
            referencedRelation: "tx_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      tx_debt: {
        Row: {
          interest: number
          lender: string | null
          net_proceed: number
          operation: string
          principal: number
          rate: number | null
          repay_tx: string | null
          tx_id: string
        }
        Insert: {
          interest?: number
          lender?: string | null
          net_proceed?: number
          operation: string
          principal: number
          rate?: number | null
          repay_tx?: string | null
          tx_id?: string
        }
        Update: {
          interest?: number
          lender?: string | null
          net_proceed?: number
          operation?: string
          principal?: number
          rate?: number | null
          repay_tx?: string | null
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tx_debt_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: true
            referencedRelation: "tx_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tx_debt_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: true
            referencedRelation: "tx_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      tx_entries: {
        Row: {
          category: string
          created_at: string
          id: string
          memo: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          memo?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          memo?: string | null
        }
        Relationships: []
      }
      tx_legs: {
        Row: {
          asset_id: string
          credit: number
          debit: number
          quantity: number
          tx_id: string
        }
        Insert: {
          asset_id: string
          credit: number
          debit: number
          quantity: number
          tx_id: string
        }
        Update: {
          asset_id?: string
          credit?: number
          debit?: number
          quantity?: number
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tx_legs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tx_legs_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "tx_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tx_legs_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "tx_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      tx_stock: {
        Row: {
          fee: number
          net_proceed: number
          price: number
          quantity: number
          side: string
          stock_id: string
          tax: number
          tx_id: string
        }
        Insert: {
          fee: number
          net_proceed?: number
          price?: number
          quantity: number
          side: string
          stock_id: string
          tax?: number
          tx_id?: string
        }
        Update: {
          fee?: number
          net_proceed?: number
          price?: number
          quantity?: number
          side?: string
          stock_id?: string
          tax?: number
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tx_stock_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tx_stock_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: true
            referencedRelation: "tx_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tx_stock_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: true
            referencedRelation: "tx_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      balance_sheet: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"] | null
          currency_code: string | null
          logo_url: string | null
          mkt_price: number | null
          name: string | null
          net_profit: number | null
          quantity: number | null
          ticker: string | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_currency_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      daily_snapshots: {
        Row: {
          cumulative_cashflow: number | null
          equity_index: number | null
          net_cashflow: number | null
          net_equity: number | null
          snapshot_date: string | null
          total_assets: number | null
          total_liabilities: number | null
        }
        Relationships: []
      }
      dashboard_data: {
        Row: {
          avg_expense: number | null
          avg_profit: number | null
          cagr: number | null
          cash: number | null
          debts: number | null
          equitychart: Json | null
          fund: number | null
          margin: number | null
          pnl_mtd: number | null
          pnl_ytd: number | null
          profit_chart: Json | null
          returnchart: Json | null
          stock: number | null
          stock_list: Json | null
          total_equity: number | null
          total_liabilities: number | null
          total_pnl: number | null
          twr_all: number | null
          twr_ytd: number | null
        }
        Relationships: []
      }
      monthly_snapshots: {
        Row: {
          fee: number | null
          interest: number | null
          pnl: number | null
          snapshot_date: string | null
          tax: number | null
        }
        Relationships: []
      }
      outstanding_debts: {
        Row: {
          borrow_date: string | null
          duration: number | null
          interest: number | null
          lender: string | null
          principal: number | null
          rate: number | null
          tx_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tx_debt_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: true
            referencedRelation: "tx_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tx_debt_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: true
            referencedRelation: "tx_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      recaps_data: {
        Row: {
          avg_expense: number | null
          avg_profit: number | null
          deposits: number | null
          equity_ret: number | null
          profit_chart: Json | null
          return_chart: Json | null
          stock_pnl: Json | null
          total_pnl: number | null
          vn_ret: number | null
          withdrawals: number | null
          year: number | null
        }
        Relationships: []
      }
      stock_annual_pnl: {
        Row: {
          logo_url: string | null
          name: string | null
          ticker: string | null
          total_pnl: number | null
          year: number | null
        }
        Relationships: []
      }
      stock_holdings: {
        Row: {
          cost_basis: number | null
          logo_url: string | null
          name: string | null
          price: number | null
          quantity: number | null
          ticker: string | null
        }
        Relationships: []
      }
      tx_summary: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          memo: string | null
          operation: string | null
          value: number | null
        }
        Relationships: []
      }
      yearly_snapshots: {
        Row: {
          deposits: number | null
          equity_ret: number | null
          vn_ret: number | null
          withdrawals: number | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_borrow_event: {
        Args: { p_lender: string; p_principal: number; p_rate: number }
        Returns: undefined
      }
      add_cashflow_event: {
        Args: {
          p_asset_id: string
          p_fx_rate: number
          p_memo: string
          p_operation: string
          p_quantity: number
        }
        Returns: undefined
      }
      add_repay_event: {
        Args: { p_interest: number; p_repay_tx: string }
        Returns: undefined
      }
      add_stock_event: {
        Args: {
          p_fee: number
          p_price: number
          p_quantity: number
          p_side: string
          p_tax?: number
          p_ticker: string
        }
        Returns: undefined
      }
      calculate_pnl: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: number
      }
      calculate_twr: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: number
      }
      get_equity_chart: {
        Args: { p_end_date: string; p_start_date: string; p_threshold: number }
        Returns: Json
      }
      get_return_chart: {
        Args: { p_end_date: string; p_start_date: string; p_threshold: number }
        Returns: Json
      }
      process_refresh_queue: { Args: never; Returns: undefined }
      process_tx_cashflow: { Args: { p_tx_id: string }; Returns: undefined }
      process_tx_debt: { Args: { p_tx_id: string }; Returns: undefined }
      process_tx_stock: { Args: { p_tx_id: string }; Returns: undefined }
      rebuild_ledger: { Args: never; Returns: undefined }
    }
    Enums: {
      asset_class:
        | "cash"
        | "stock"
        | "crypto"
        | "fund"
        | "equity"
        | "liability"
        | "index"
      cashflow_ops: "deposit" | "withdraw" | "income" | "expense"
    }
    CompositeTypes: {
      benchmark_point: {
        snapshot_date: string | null
        portfolio_value: number | null
        vni_value: number | null
      }
      equity_point: {
        snapshot_date: string | null
        net_equity: number | null
        cumulative_cashflow: number | null
      }
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
  flight: {
    Enums: {
      seat_position: ["window", "middle", "aisle"],
      seat_type: ["eco", "biz"],
    },
  },
  public: {
    Enums: {
      asset_class: [
        "cash",
        "stock",
        "crypto",
        "fund",
        "equity",
        "liability",
        "index",
      ],
      cashflow_ops: ["deposit", "withdraw", "income", "expense"],
    },
  },
} as const

