```mermaid
---
config:
  theme: redux
  look: handDrawn
  layout: dagre
---
flowchart LR
    A[daily_snapshots] --> B1[monthly_snapshots]
    A[daily_snapshots] --> C3[performance_data]
    A[daily_snapshots] --> B2[yearly_snapshots]
    B1[monthly_snapshots] --> C2[last_1y_profit]
    B1[monthly_snapshots] --> C1[equity_return_data]
    B1[monthly_snapshots] --> C3[performance_data]
    B6(get_return_chart) --> C1[equity_return_data]
    B6(get_return_chart) --> C3[performance_data]
    B4("calculate_twr()") --> C1[equity_return_data]
    B5("calculate_pnl()") --> C1[equity_return_data]
    B2[yearly_snapshots] --> C3[performance_data]