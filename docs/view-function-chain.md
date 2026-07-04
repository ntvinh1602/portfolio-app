```mermaid
---
config:
  theme: redux
  look: handDrawn
  layout: dagre
---
flowchart LR
    A3[stock_pnl_yearly] --> B3[stock_pnl_all]
    A1[daily_snapshots] --> C4[pnl_expense_yearly pnl_expense_last1y pnl_expense_all]
    A1[daily_snapshots] --> C2[benchmark_yearly benchmark_all]
    A1[daily_snapshots] --> C3[cashflow_yearly cashflow_all]
    A1[daily_snapshots] -.-> B4("calculate_twr()")
    A1[daily_snapshots] -.-> B5("calculate_pnl()")
    A1[daily_snapshots] -.-> B6("get_return_chart()")
    B4("calculate_twr()") --> C1[equity_return_data]
    B6("get_return_chart()") --> C1[equity_return_data]
    B6("get_return_chart()") --> C1[benchmark_yearly benchmark_all]
    B4("calculate_twr()") --> C2[benchmark_yearly benchmark_all]
    B5("calculate_pnl()") --> C1[equity_return_data]

    A1@{ shape: internal-storage}
    A3@{ shape: internal-storage}
    C1@{ shape: internal-storage}
    C2@{ shape: internal-storage}
    C3@{ shape: internal-storage}
    C4@{ shape: internal-storage}