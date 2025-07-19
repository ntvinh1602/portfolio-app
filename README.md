# Portfolio App

This is a comprehensive portfolio management application built with Next.js on Supabase, designed to help users track their financial assets, liabilities, and performance. It provides robust tools for managing various transaction types, visualizing financial data, and integrating with external market data.

An experiment project to try out coding ability of Gemini 2.5 Pro.

## Features

- **Double-entry Accounting**: Record and categorize transactions based on double-entry accounting method with FIFO cost-basis tracking for both tradable securities and foreign currencies.
- **Consolidated Portfolio Tracking**: Monitor your asset holdings, debts, and overall portfolio performance across many asset types (stocks, crypto, cash, funds)
- **Financial Reporting & Analytics**:
    - Real-time balance sheet (Total assets, total liabilities)
    - Monthly Profit & Loss (P&L) and Time-Weighted Returns (TWR)
    - Analyze Monthly Expenses
    - Visualize data with various charts (Area, Bar, Line, Pie, Stacked Bar)
- **Market Data Integration**: Fetch and save real-time stock prices and indices through Yahoo-finance2 library.
- **User Authentication**: Secure login system.
- **Multi-layered Caching**: Both server-side and client-side caching supported for fast and responsive use. 
- **Mobile-oriented Design**: Built with PWA to enable a native-like experience on mobile. while the app is responsive, it is recommended to use with dark mode on mobile.
