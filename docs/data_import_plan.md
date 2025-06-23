# Data Import Feature Plan (Simplified)

This document outlines the plan for implementing a CSV-based data import feature for historical transactions.

### 1. Frontend (User Interface)

*   **Instructions & Template:** Provide clear instructions on the import page, specifying the exact column headers and data formats required. A downloadable CSV template will be available to ensure users follow the correct format.
*   **File Upload:** A standard file upload component for the user to select their prepared CSV file.
*   **Client-Side Validation:** Before uploading, the frontend will perform a quick check to ensure the CSV headers match the required template.
*   **Import & Feedback:** The user will initiate the import. The system will process the file, and the UI will display a clear success message upon completion or a specific error message if the import fails. The error will indicate which row caused the problem and why.

### 2. Backend (API Endpoint)

*   **Receive CSV:** A new API endpoint (e.g., `/api/transactions/import`) will be created to accept the CSV file.
*   **Parse & Transform:** The backend will parse the CSV into a structured format (JSON). It will not attempt to find or create missing assets/accounts.
*   **Invoke Database Function:** The entire JSON payload will be passed to a new, single database function for processing.

### 3. Database (New Batch Import Function)

*   **`handle_bulk_transaction_import(p_transactions_data jsonb)`:** A new PostgreSQL function that accepts an array of transaction records.
*   **Transactional Integrity:** The function will process the entire array within a single database transaction.
*   **Strict Error Handling:** It will iterate through the records and call the appropriate existing `handle_*_transaction` function for each one. If any transaction fails (e.g., due to a non-existent asset or account), the function will immediately stop, raise an error, and the entire import transaction will be rolled back. No partial data will be saved.

### Process Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend API
    participant Supabase (PostgreSQL)

    User->>Frontend: 1. Downloads CSV template
    User->>Frontend: 2. Prepares and uploads CSV file
    Frontend->>Backend API: 3. Sends CSV file
    Backend API->>Backend API: 4. Parses CSV to JSON
    Backend API->>Supabase (PostgreSQL): 5. Calls `handle_bulk_transaction_import`
    
    alt Import Fails
        Supabase (PostgreSQL)->>Supabase (PostgreSQL): 6a. Encounters error on a row
        Supabase (PostgreSQL)->>Supabase (PostgreSQL): 7a. Rolls back the entire transaction
        Supabase (PostgreSQL)-->>Backend API: 8a. Returns specific error message
        Backend API-->>Frontend: 9a. Forwards error
        Frontend-->>User: 10a. Displays detailed error (e.g., "Row 15: Asset 'XYZ' not found")
    else Import Succeeds
        Supabase (PostgreSQL)->>Supabase (PostgreSQL): 6b. Processes all rows successfully
        Supabase (PostgreSQL)->>Supabase (PostgreSQL): 7b. Commits the transaction
        Supabase (PostgreSQL)-->>Backend API: 8b. Returns success
        Backend API-->>Frontend: 9b. Forwards success
        Frontend-->>User: 10b. Displays success message
    end