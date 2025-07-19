# Caching & Data Fetching Architecture

This document outlines the multi-layered caching and data fetching strategy implemented in this application. The primary goals of this architecture are to ensure high performance, reduce database load, minimize API requests, and provide a scalable and maintainable codebase.

## High-Level Overview

We employ a multi-layered caching strategy that combines client-side and server-side techniques to optimize data delivery.

1.  **Client-Side Caching (`swr`):** The browser maintains its own cache of API responses. This makes navigating between pages and re-rendering components that use the same data instantaneous.
2.  **Server-Side Caching (Next.js):** The Next.js server caches the results of expensive database queries. This ensures that even the first request for a piece of data from any user is fast if another user has recently requested it.

Here is a visual representation of the data flow:

```mermaid
graph TD
    subgraph Browser
        A[Client Component] -->|1. Request data| B{SWR Hook};
        B -->|2. Check cache| C{SWR Client-Side Cache <br> (In-memory)};
        C -- Data found --> A;
        C -- Data not found -->|3. Fetch from API| D[Next.js Server];
    end

    subgraph Server/CDN
        D -->|4. Request| E[API Route];
        E -->|5. Check cache| F{Next.js Data Cache};
        F -- Data found -->|7. Return cached data| D;
        F -- Data not found -->|6. Fetch from DB| G[Database];
        G -->|6.1 Return data| F;
        F -->|6.2 Cache data| F;
    end

    D -->|8. Return response| B;
    B -->|9. Update client cache| C;
    B -->|10. Return data| A;
```

---

## 1. Client-Side Caching with `swr`

All client-side data fetching is handled by the `swr` library. This provides a consistent, powerful, and simple API for fetching, caching, and revalidating data.

### Core Concepts:

*   **Hooks:** We primarily use `useSWR` for standard data fetching and `useSWRInfinite` for paginated data (like the transaction feed). Custom hooks like `useDashboardData` or `useExpensesData` are created to encapsulate `swr` logic for specific pages or components.
*   **Fetcher:** A simple, reusable `fetcher` function has been defined in `src/lib/fetcher.ts`. All `swr` hooks use this function to make the actual `fetch` requests.
*   **Automatic Caching:** `swr` automatically caches the results of API requests in memory. If a component re-renders or another component requests the same API endpoint, `swr` will return the cached data instantly.
*   **Revalidation:** `swr` automatically revalidates data in the background when the user re-focuses the window or reconnects to the network, ensuring the UI is always up-to-date without blocking rendering.

### How to Use:

When fetching data in a new component, use the `useSWR` hook, preferably within a custom hook for better organization.

```javascript
// Example from src/hooks/useDashboardData.ts
import useSWR from 'swr';
import { fetcher } from ''lib/fetcher'' (see below for file content);

export function useDashboardData() {
  const { data, error, isLoading } = useSWR('/api/query/dashboard', fetcher);
  // ... return transformed data
}
```

---

## 2. Server-Side Caching (Next.js)

To reduce database load and speed up API responses, we leverage the built-in Next.js Caching mechanisms.

### Core Concepts:

*   **Route Handlers:** All data fetching from the database is now done exclusively within API Route Handlers (e.g., `src/app/api/query/dashboard/route.ts`). **No component should ever call the database directly.**
*   **Caching Strategies:** We use two primary strategies for server-side caching depending on how the data is fetched within the API route:
    1.  **`fetch` with `revalidate`:** For API routes that themselves use `fetch` to call other internal or external APIs (like our consolidated endpoints), we use the `next: { revalidate: 86400 }` option. This instructs Next.js to cache the response for **86,400 seconds (24 hours)**.
    2.  **`Cache-Control` Header:** For API routes that fetch data directly from the database (e.g., calling a Supabase RPC), we set the `Cache-Control` header on the `NextResponse`. This instructs the CDN and browser how to cache the response. We typically use `s-maxage=3600` to cache on the CDN for 1 hour.

*   **Stale-While-Revalidate:** Both caching strategies support a stale-while-revalidate model, ensuring users always get a fast response even when the cache is being updated.

### How to Use:

*   **When using `fetch` in an API route:**
    ```javascript
    // In an API Route Handler like /api/query/dashboard
    const response = await fetch('.../api/query/asset-summary', {
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    ```
*   **When calling the database directly in an API route:**
    ```javascript
    // In an API Route Handler like /api/query/debts
    const { data, error } = await supabase.from("debts").select("*");
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600' } // Cache for 1 hour
    });
    ```

---

## 3. API Architecture & Maintenance

### API Route Structure

All data-querying API routes are located under `src/app/api/query/`.

*   **Consolidated Endpoints:** For pages that require multiple, distinct pieces of data, we have created consolidated API endpoints to minimize client-side network requests.
    *   [`/api/query/dashboard`](src/app/api/query/dashboard/route.ts)
    *   [`/api/query/metrics`](src/app/api/query/metrics/route.ts)
    *   [`/api/query/earnings`](src/app/api/query/earnings/route.ts)
*   **Direct Query Endpoints:** For simpler data needs, we have direct endpoints that map closely to a database query.
    *   [`/api/query/stock-holdings`](src/app/api/query/stock-holdings/route.ts)
    *   [`/api/query/debts`](src/app/api/query/debts/route.ts)
    *   [`/api/query/transaction-feed`](src/app/api/query/transaction-feed/route.ts)
    *   [`/api/query/expense-structure`](src/app/api/query/expense-structure/route.ts)
    *   ...and others.

**Guideline:** If a new page or feature requires data from multiple database tables or existing API endpoints, create a new consolidated endpoint to handle this orchestration.

### Stock Price Refresh

The complex logic for refreshing stock prices has been moved to a single server-side endpoint:
*   **`POST /api/external/refresh-all-stock-prices`**: This endpoint gets all of the user's stock holdings, fetches the latest price for each one from the external API, and saves the new prices to the database.

The client triggers this via a simple `POST` request. To update the UI after the refresh, we use `swr`'s `mutate` function, which programmatically triggers a revalidation of the holdings data:

```javascript
// In StockCardFull.tsx
import { mutate } from 'swr';

const handleRefresh = async () => {
  setIsRefreshing(true);
  // Call the refresh endpoint
  await fetch('/api/external/refresh-all-stock-prices', { method: 'POST' });
  // Tell swr to re-fetch the holdings data
  await mutate('/api/query/stock-holdings');
  setIsRefreshing(false);
};
```

This architecture provides a robust, performant, and maintainable foundation for the application's data layer.