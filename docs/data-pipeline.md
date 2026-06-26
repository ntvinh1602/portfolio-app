```mermaid
---
config:
  theme: redux
  look: handDrawn
  layout: dagre
---
flowchart TB
 subgraph s1["Analytics Data Pipeline"]
        A(["upsert_dnse_order"])
        B["dnse_orders"]
        D(["process_dnse_order"])
        n1(["add_stock_event"])
        n2["tx_stock"]
        n3(["process_tx_stock"])
        n4["tx_legs"]
        n5(["enqueue_refresh_data"])
        n6["refresh_queue"]
        n8["historical_prices"]
        n9(["fetch-yahoofinance"])
        n11(["fetch-exchange-rates"])
        n10["historical_fxrate"]
        n7(["process_refresh_queue"])
        n14(["add_cashflow_event"])
        n15["tx_cashflow"]
        n16(["process_tx_cashflow"])
        n17(["add_borrow_event"])
        n18["tx_debt"]
        n19(["process_tx_debt"])
        n20(["add_repay_event"])
        n21["daily_snapshots"]
        n28["dashboard_data"]
        n23["stockForm"]
        n24["cashflowForm"]
        n25["borrowForm"]
        n26["repayForm"]
        n27["RefreshButton"]
        n29["cron: */5 2-7 * * 1-5"]
        n30["cron: 0 9 * * 1-5"]
        n31["cron: 0 12 * * 1-5"]
        n32["cron: * * * * 1-5"]
  end
 subgraph s2["News Pipeline"]
        n33["cron: 0 0-16 * * *"]
        n34["api/rss"]
        n35["news_articles"]
        n36(["revalidate_news"])
  end
    A -- INSERT --> B
    B -- TRIGGER --> D
    D -- PERFORM --> n1
    n1 -- INSERT --> n2
    n2 -- TRIGGER --> n3
    n3 -- INSERT --> n4
    n4 -- TRIGGER --> n5
    n5 -- INSERT --> n6
    n8 -- TRIGGER --> n5
    n9 -- UPSERT --> n8
    n11 -- UPSERT --> n10
    n10 -- TRIGGER --> n5
    n7 -- SELECT/DELETE --> n6
    n14 -- INSERT --> n15
    n15 -- TRIGGER --> n16
    n16 -- INSERT --> n4
    n17 -- INSERT --> n18
    n18 -- TRIGGER --> n19
    n19 -- INSERT --> n4
    n7 -- REFRESH --> n21 & n28
    n23 -- SUBMIT --> n1
    n24 -- SUBMIT --> n14
    n25 -- SUBMIT --> n17
    n26 -- SUBMIT --> n20
    n27 -- INVOKE --> n9
    n7 -- POST --> n22["api/revalidate"]
    n29 -- INVOKE --> A
    n30 -- INVOKE --> n9
    n31 -- INVOKE --> n11
    n32 -- SELECT --> n7
    n33 -- POST --> n34
    n34 -- INSERT --> n35
    n20 -- INSERT --> n18
    n35 -- TRIGGER --> n36
    n36 -- POST --> n22

    B@{ shape: internal-storage}
    n2@{ shape: internal-storage}
    n4@{ shape: internal-storage}
    n6@{ shape: internal-storage}
    n8@{ shape: internal-storage}
    n10@{ shape: internal-storage}
    n15@{ shape: internal-storage}
    n18@{ shape: internal-storage}
    n21@{ shape: internal-storage}
    n28@{ shape: internal-storage}
    n23@{ shape: doc}
    n24@{ shape: doc}
    n25@{ shape: doc}
    n26@{ shape: doc}
    n27@{ shape: doc}
    n29@{ shape: div-proc}
    n30@{ shape: div-proc}
    n31@{ shape: div-proc}
    n32@{ shape: div-proc}
    n33@{ shape: div-proc}
    n34@{ shape: doc}
    n35@{ shape: internal-storage}
    n22@{ shape: doc}
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
     n28:::Rose
     n23:::Ash
     n24:::Ash
     n25:::Ash
     n26:::Ash
     n27:::Ash
     n29:::Sky
     n30:::Sky
     n31:::Sky
     n32:::Sky
     n33:::Sky
     n34:::Ash
     n36:::Peach
     n22:::Ash
    classDef Aqua stroke-width:1px, stroke-dasharray:none, stroke:#46EDC8, fill:#DEFFF8, color:#378E7A
    classDef Rose stroke-width:1px, stroke-dasharray:none, stroke:#FF5978, fill:#FFDFE5, color:#8E2236
    classDef Pine stroke-width:1px, stroke-dasharray:none, stroke:#254336, fill:#27654A, color:#FFFFFF
    classDef Sky stroke-width:1px, stroke-dasharray:none, stroke:#374D7C, fill:#E2EBFF, color:#374D7C
    classDef Ash stroke-width:1px, stroke-dasharray:none, stroke:#999999, fill:#EEEEEE, color:#000000
    classDef Peach stroke-width:1px, stroke-dasharray:none, stroke:#FBB35A, fill:#FFEFDB, color:#8F632D