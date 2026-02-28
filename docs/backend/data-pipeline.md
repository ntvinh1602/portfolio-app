```mermaid
---
config:
  theme: redux
  look: handDrawn
  layout: dagre
---
flowchart TB
    A(["upsert_dnse_order"]) -- INSERT --> B["dnse_orders"]
    B -- TRIGGER --> D(["process_dnse_order"])
    D --> n1(["add_stock_event"])
    n1 -- INSERT --> n2["tx_stock"]
    n2 -- "TRIGGER" --> n3(["process_tx_stock"])
    n3 -- INSERT --> n4["tx_legs"]
    n4 -- "TRIGGER" --> n5(["enqueue_refresh_data"])
    n5 -- INSERT --> n6["refresh_queue"]
    n8["historical_prices"] -- "TRIGGER" --> n5
    n9(["fetch-yahoofinance"]) -- UPSERT --> n8
    n11(["fetch-exchange-rates"]) -- UPSERT --> n10["historical_fxrate"]
    n10 -- "TRIGGER" --> n5
    n13["cron.job"] -- POST --> n9 & A & n11
    n13 -- SELECT --> n7(["process_refresh_queue"])
    n7 -- SELECT/DELETE --> n6
    n14(["add_cashflow_event"]) -- INSERT --> n15["tx_cashflow"]
    n15 -- "TRIGGER" --> n16(["process_tx_cashflow"])
    n16 -- INSERT --> n4
    n17(["add_borrow_event"]) -- INSERT --> n18["tx_debt"]
    n18 -- "TRIGGER" --> n19(["process_tx_debt"])
    n19 -- INSERT --> n4
    n20(["add_repay_event"]) -- INSERT --> n18
    n7 -- REFRESH --> n21["materialized views"]
    n7 -- POST --> n22(["api/revalidate"])
    n13 -- DELETE --> B

    B@{ shape: rect}
    n8@{ shape: rect}
    n10@{ shape: rect}
    n13@{ shape: rect}
    n15@{ shape: rect}
    n18@{ shape: rect}
    n21@{ shape: rect}
     A:::Aqua
     D:::Peach
     n1:::Peach
     n3:::Peach
     n5:::Peach
     n9:::Aqua
     n11:::Aqua
     n7:::Peach
     n14:::Peach
     n16:::Peach
     n17:::Peach
     n19:::Peach
     n20:::Peach
     n21:::Rose
     n22:::Sky
    classDef Aqua stroke-width:1px, stroke-dasharray:none, stroke:#46EDC8, fill:#DEFFF8, color:#378E7A
    classDef Peach stroke-width:1px, stroke-dasharray:none, stroke:#FBB35A, fill:#FFEFDB, color:#8F632D
    classDef Rose stroke-width:1px, stroke-dasharray:none, stroke:#FF5978, fill:#FFDFE5, color:#8E2236
    classDef Ash stroke-width:1px, stroke-dasharray:none, stroke:#999999, fill:#EEEEEE, color:#000000
    classDef Sky stroke-width:1px, stroke-dasharray:none, stroke:#374D7C, fill:#E2EBFF, color:#374D7C