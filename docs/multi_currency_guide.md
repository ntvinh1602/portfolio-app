# Multi-Currency Accounting Guide

This document clarifies the methodology for handling multiple currencies within the personal investment tracker, ensuring data integrity and flexible reporting.

## Core Principle: Three Levels of Currency

The database schema is designed around a three-tiered approach to currency, which separates user preferences, asset characteristics, and transactional facts. This ensures maximum accuracy and flexibility.

### 1. `profiles.display_currency` (The "What I Want to See" Currency)
-   **Purpose:** This is a user-level setting purely for **reporting**. It tells the application, "When you show me my total net worth or portfolio-wide reports, convert everything into this single currency."
-   **Example:** A user in Europe might set this to `EUR`. Their US stocks (priced in USD) and Japanese stocks (priced in JPY) will all be converted to EUR for the dashboard's "Total Value" display.

### 2. `assets.currency_code` (The "Asset's Native" Currency)
-   **Purpose:** This defines the **primary or native currency** in which an asset is priced, traded, and typically valued. It is a fundamental characteristic of the asset itself.
-   **Key Functions:**
    -   **Valuation & Market Data:** For a stock like "Hoa Phat Group" (HPG) which trades on the Ho Chi Minh Stock Exchange, its native currency is `VND`. When the application fetches the latest stock price, it knows to look for the `VND` price.
    -   **Performance Analysis:** It allows for analyzing an asset's performance in its own currency, separate from the user's display currency. This is critical for understanding if the asset itself went up in value, or if the change was just due to exchange rate fluctuations (e.g., "How did my `EUR`-denominated stock perform in `EUR` terms this year?").
    -   **Conceptual Grouping:** For abstract assets like `Paid-in Capital`, it sets a base currency for that conceptual bucket, even if contributions arrive in different currencies. It answers the question, "What is the primary currency of my capital base?"
    -   **UI Defaulting:** It provides a sensible default when creating new transactions for an asset, improving the user experience.

### 3. `transaction_legs.currency_code` (The "What Actually Happened" Currency)
-   **Purpose:** This is the **source of truth** for a specific financial event. It immutably records the currency in which a transaction was *actually executed*.
-   **Function:** It ensures that every financial movement is recorded with perfect fidelity, preserving the original currency and amount. This is the most granular level of data and forms the basis for all higher-level calculations.

## How It Works: A Practical Example

This design allows a single asset, like `Paid-in Capital`, to be affected by transactions in multiple currencies without conflict.

Let's assume:
-   The `Paid-in Capital` asset is denominated in `VND` (`assets.currency_code = 'VND'`).
-   The user's preferred display currency is `USD` (`profiles.display_currency = 'USD'`).

*   **Scenario 1: Employer Contribution (MYR)**
    *   An employer contributes **1,200 MYR** to an EPF account.
    *   The corresponding transaction leg credits `Paid-in Capital`.
    *   The entry in `transaction_legs` will have `amount: -1200` and **`currency_code: 'MYR'`**.

*   **Scenario 2: Salary Deposit (VND)**
    *   The user deposits **10,000,000 VND** from their salary.
    *   The corresponding transaction leg credits `Paid-in Capital`.
    *   The entry in `transaction_legs` will have `amount: -10000000` and **`currency_code: 'VND'`**.

The resulting `transaction_legs` for the `Paid-in Capital` asset would look like this:

| transaction_id | account_id | asset_id (Paid-in Capital) | amount      | currency_code |
| :------------- | :--------- | :------------------------- | :---------- | :------------ |
| `uuid-1`       | `equity-acct` | `pic-asset`                | -1200       | `MYR`         |
| `uuid-2`       | `equity-acct` | `pic-asset`                | -10000000   | `VND`         |

## Calculating Total Asset Value for Reporting

To calculate the total value of `Paid-in Capital` in the user's preferred display currency (`USD`), the application logic must:

1.  **Fetch all `transaction_legs`** associated with the `Paid-in Capital` asset.
2.  **Group the legs by `currency_code`** and sum the `amount` for each currency.
    *   *Resulting Subtotals:* `{ MYR: -1200, VND: -10000000 }`
3.  **Fetch the necessary conversion rates** from the `exchange_rates` table (e.g., `MYR` to `USD` and `VND` to `USD`).
4.  **Convert each subtotal** into the desired display currency.
5.  **Sum all converted values** to get the final, aggregated total in `USD`.

This method ensures that all calculations are based on the original, unaltered transaction data, providing maximum accuracy and transparency.