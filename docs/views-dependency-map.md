````mermaid
---
config:
  theme: redux
  look: handDrawn
  layout: dagre
---
flowchart LR
    A3[stock_pnl_yearly] --> B3[stock_pnl_all]
    A1[daily_snapshots] --> C4[pnl_expense_yearly pnl_expense_last1y pnl_expense_all]
    A1[daily_snapshots] --> C3[cashflow_yearly cashflow_all]
    A1[daily_snapshots] -.-> B1("get_equity_chart()")
    A1[daily_snapshots] -.-> B4("calculate_twr()")
    A1[daily_snapshots] -.-> B5("calculate_pnl()")
    A1[daily_snapshots] -.-> B6("get_return_chart()")
    A1[daily_snapshots] --> C1[equity_rollings]
    B1("get_equity_chart()") --> C1[equity_rollings]
    B5("calculate_pnl()") --> C1[equity_rollings]
    A1[daily_snapshots] --> C2[benchmark_yearly benchmark_all benchmark_rollings]
    B4("calculate_twr()") --> C2[benchmark_yearly benchmark_all benchmark_rollings]
    B6("get_return_chart()") --> C2[benchmark_yearly benchmark_all benchmark_rollings]

    A1@{ shape: internal-storage}
    A3@{ shape: internal-storage}
    C1@{ shape: internal-storage}
    C2@{ shape: internal-storage}
    C3@{ shape: internal-storage}
    C4@{ shape: internal-storage}