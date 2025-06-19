# Plan: Intuitive & Comprehensive Transaction Form

This document outlines the technical design for a dynamic and intuitive transaction input form. The primary goal is to minimize user input and automate complex database operations, translating a simple UI into the robust double-entry accounting system defined in the `db_schema.md`.

---

## 1. Core Design Philosophy

The user experience is centered around a single, intelligent form that conditionally renders fields based on the user's selection of "Transaction Type". This approach abstracts the underlying database complexity, such as the creation of transaction legs, tax lots, and debt records.

---

## 2. Component & Data Flow

### Core Component (`src/components/transaction-form.tsx`)

The form component is enhanced to support the dynamic rendering of fields.

-   **State Management**: The component uses controlled components to manage the state for the selected `transactionType` and all other input fields.
-   **Data Fetching**: On load, the component fetches necessary data from the Supabase backend to populate dropdowns:
    -   User's `accounts` from the `accounts` table.
    -   User's `assets` from the `assets` table.
    -   User's active `debts` from the `debts` table.
-   **Primary Control**: The "Transaction Type" `Select` input is the main driver of the form's structure. Its value determines which fields are displayed.

### Backend API

A single, robust API endpoint (e.g., `/api/transactions`) will be created. It will accept a simplified JSON object from the frontend form. This endpoint will be responsible for handling all the complex database logic based on the `transactionType` provided in the payload.

---

## 3. Detailed Transaction Workflows

### Simple Transactions (`Deposit`, `Withdraw`, `Income`, `Expense`, `Dividend`)

These common transaction types share a unified and simple UI.

-   **User Inputs**:
    -   `Date`
    -   `Account` (Dynamically labeled "To Account" or "From Account")
    -   `Amount`
    -   `Asset` (For `Dividend` transactions only, to link the income to the specific stock that generated it).
-   **Automation**: The backend will create the appropriate two-legged transaction (e.g., for a dividend, it will debit the cash account and credit Retained Earnings).

### `Buy` (Stock vs. Crypto)

The form intelligently adapts based on the selected asset's `asset_class`.

-   **User Inputs**: `Date`, `Account`, `Asset`, `Quantity`, `Price per share`, `Fees` (optional).
-   **Intelligent Filtering**: After the user selects an `Asset`, the `Account` dropdown is filtered to show the most relevant account types (e.g., `'brokerage'` for stocks, `'crypto_exchange'` for crypto).
-   **Automation**: System calculates total cost, creates `transaction_legs` (debit asset, credit cash), and generates a new `tax_lot`.

### `Sell`

-   **User Inputs**: `Date`, `Account`, `Asset`, `Quantity`, `Price per share`, `Fees` (optional).
-   **Automation**: The backend executes the full FIFO logic based on the `equity_tracking_plan.md`. It identifies lots, calculates cost basis and realized gain/loss, and creates the 3-legged `sell` transaction.

### `Borrow`

-   **User Inputs**: `Date`, `Lender Name`, `Principal Amount`, `Currency`, `Interest Rate`, `Deposit Account` (where the cash is received).
-   **Automation**: System creates a new record in the `debts` table and a corresponding `borrow` transaction with two legs: debiting cash in the deposit account and crediting a liability asset.

### `Debt Payment`

-   **User Inputs**: `Date`, `Debt` to pay, `From Account`, `Principal` payment amount, `Interest` payment amount.
-   **Automation**: The backend creates a transaction that debits the liability and Retained Earnings (for the interest portion) and credits the cash account.

### `Split`

-   **User Inputs**: `Date`, `Account`, `Asset` (stock), `New Shares Quantity`, `Tax Paid` (which serves as the cost basis).
-   **Automation**: As per the `equity_tracking_plan.md`, the system creates a new `tax_lot` for the new shares with a cost basis equal to the tax paid.