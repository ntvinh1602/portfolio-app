import React, { memo } from 'react'
import { TickerTape } from "react-ts-tradingview-widgets"

function TradingViewWidget({ theme }: { theme: string | undefined }) {
  const colorTheme = theme === "dark" ? "dark" : "light";

  return (
    <div className="tradingview-widget-container h-[44px] w-[50vw]">
      <TickerTape
        colorTheme={colorTheme}
        isTransparent={false}
        symbols={[
          {
            proName: "FOREXCOM:SPXUSD",
            title: "S&P 500 Index"
          },
          {
            proName: "FOREXCOM:NSXUSD",
            title: "US 100 Cash CFD"
          },
          {
            proName: "FX_IDC:EURUSD",
            title: "EUR to USD"
          },
          {
            proName: "BITSTAMP:BTCUSD",
            title: "Bitcoin"
          },
          {
            proName: "BITSTAMP:ETHUSD",
            title: "Ethereum"
          }
        ]}
      />
    </div>
  )
}

export default memo(TradingViewWidget)
