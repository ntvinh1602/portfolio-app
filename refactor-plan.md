# Refactoring Plan: Remove Anonymous Sign-In

This document outlines the steps to refactor the application to remove the anonymous sign-in feature.

## Task Breakdown

### 1. Decommission Anonymous Login Endpoint
- **Action**: Delete the directory and its contents.
- **File Path**: `src/app/api/auth/anonymous/`

### 2. Refactor Login Page
- **Action**: Remove the `handleAnonymousLogin` function and the `onGuestLogin` prop from the `LoginForm` component.
- **File Path**: `src/app/login/page.tsx`

### 3. Refactor Login Form Component
- **Action**: Remove the `handleAnonymousLogin` function, the `isGuestLoading` state, the `onGuestLogin` prop, and the 'Login as a Guest' button.
- **File Path**: `src/components/forms/login.tsx`

### 4. Refactor `useAuth` Hook
- **Action**: Remove the `isAnonymous` state and all associated logic from the hook.
- **File Path**: `src/hooks/useAuth.tsx`

### 5. Remove Anonymous User Checks in Components
- **Action**: Remove the conditional logic that checks for `isAnonymous` and displays an alert.
- **File Paths**:
    - `src/components/forms/transaction/add-transaction.tsx`
    - `src/components/forms/import-data.tsx`

### 6. Remove Demo User Logic from API Routes
- **Action**: Go through all files in the specified directories. In each route handler, remove any logic that checks for an anonymous user and substitutes a demo user ID. The API should only serve data for authenticated users.
- **Directory Paths**:
    - `src/app/api/gateway/[userId]/`
    - `src/app/api/query/[userId]/`

### 7. Delete Unused Components
- **Action**: Delete the file as it is no longer needed.
- **File Path**: `src/components/anon-alert.tsx`

### 8. Final Code Cleanup
- **Action**: Removed all remaining references to `isAnonymous`, `signInAnonymously`, or `guest` login to ensure all dead code related to the old feature is gone.