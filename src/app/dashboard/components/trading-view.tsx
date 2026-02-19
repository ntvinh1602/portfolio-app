"use client"

import React, { useEffect, useRef, memo } from "react"

function TradingViewWidgetComponent() {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    // Clear old scripts/widgets (important during hot reload)
    container.current.innerHTML = ""

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      "lineWidth": 1.5,
      "lineType": 2,
      "chartType": "area",
      "fontColor": "rgb(106, 109, 120)",
      "gridLineColor": "rgba(242, 242, 242, 0.06)",
      "volumeUpColor": "rgba(34, 171, 148, 0.5)",
      "volumeDownColor": "rgba(247, 82, 95, 0.5)",
      "backgroundColor": "#171717",
      "widgetFontColor": "#DBDBDB",
      "upColor": "#22ab94",
      "downColor": "#f7525f",
      "borderUpColor": "#22ab94",
      "borderDownColor": "#f7525f",
      "wickUpColor": "#22ab94",
      "wickDownColor": "#f7525f",
      "colorTheme": "dark",
      "isTransparent": true,
      "locale": "en",
      "chartOnly": false,
      "scalePosition": "right",
      "scaleMode": "Normal",
      "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      "valuesTracking": "1",
      "changeMode": "price-and-percent",
      symbols: [
        ["Bitcoin", "BINANCE:BTCUSDT|1D"],
        ["Gold", "CAPITALCOM:GOLD|1M"],
        ["Silver", "CAPITALCOM:SILVER|1M"],
      ],
      dateRanges: [
        "1d|5",
        "1w|30",
        "1m|240",
        "6m|1D",
        "12m|1D",
        "60m|1W",
        "all|1M",
      ],
      fontSize: "10",
      headerFontSize: "small",
      autosize: true,
      width: "100%",
      height: "100%",
      noTimeScale: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
    })

    container.current.appendChild(script)
  }, [])

  return (
    <div className="border rounded-2xl shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-linear-to-r before:from-transparent before:via-ring/40 before:to-transparent before:rounded-t-2xl tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent)
