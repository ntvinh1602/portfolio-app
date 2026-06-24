# Transactions Page Review & Action Plan

> Scope: `src/app/fund/transactions` (`page.tsx`, `client.tsx`, `txn-item.tsx`, `txn-filter.tsx`, `labels.tsx`, `form/*`) plus shared infra it depends on (`src/hooks/use-infinite-query.ts`, `src/components/infinite-list.tsx`, `src/components/form/dialog-form-wrapper.tsx`, `src/features/fund/hooks/use-transaction-filters.ts`).
>
> Verdict: well-architected and largely follows the canonical pattern in `CLAUDE.md` (fully client-driven page -> no Suspense, filter state hook split into `features/fund/hooks/`, shared `useInfiniteQuery`/`InfiniteList`, schema -> RHF -> field components). Items below are improvements, ordered by impact.

---

## Correctness / bugs

### [ ] 2. Stock `tax` not cleared when switching side buy<->sell
- File: `src/app/fund/transactions/form/stockForm.tsx`
- Problem: Tax field is `disabled` when `side === "buy"`, but a value entered during "sell" stays in form state and is submitted via `p_tax: data.tax ?? 0`.
- Fix: reset tax on side change, e.g. `useEffect(() => { if (side === "buy") form.resetField("tax") }, [side])`.

### [ ] 4. Preset range recomputes `now` on every render (low risk)
- File: `src/features/fund/hooks/use-transaction-filters.ts`
- Note: `getDateRangeFromPreset(preset, now ?? new Date())` recomputes; safe today because `now` is set once in `useEffect`. Leave as-is unless touched; just be aware `endISO` feeds `trailingQueryKey`.

---

## Best-practice / consistency

### [ ] 5. `tableName: "tx_summary" as any` defeats type safety
- File: `src/app/fund/transactions/client.tsx`
- Problem: `as any` bypasses `useInfiniteQuery` generics; `Transaction` type is hand-maintained in `txn-item.tsx` separately from DB types. Biggest type-safety hole on the page.
- Fix: if `tx_summary` is a view, run `npm run sb-gen` so it lands in `src/types/database.types.ts`, then drop the cast and derive the row type.

### [ ] 6. Memo search has no debounce (most visible perf issue)
- Files: `src/app/fund/transactions/txn-filter.tsx`, `src/features/fund/hooks/use-transaction-filters.ts`
- Problem: `search` feeds `trailingQueryKey` directly, so every keystroke recreates the infinite-query store and fires a new Supabase `ilike` request.
- Fix: debounce the search term (~300ms) before it enters `trailingQueryKey`.

### [ ] 7. Per-keystroke store recreation resets scroll / loaded pages
- Same root cause as #6; fixed by the same debounce.

### [ ] 8. `Transaction` row type lives in the leaf component
- File: `src/app/fund/transactions/txn-item.tsx`
- Fix: move the shared row type next to the data layer (or derive from generated DB types per #5). Minor.

### [ ] 9. Empty state can show on a failed first fetch
- Files: `src/app/fund/transactions/client.tsx`, `src/components/infinite-list.tsx`
- Problem: on a failed first fetch, error banner + empty state can render together (`error` set, `isLoading` false, `count === 0`).
- Fix: gate the empty state on `!error`.

---

## Minor / cosmetic

### [ ] 10. Untyped label arrays
- File: `src/app/fund/transactions/labels.tsx`
- Fix: add a `LabelConfig` type for `category`/`operation` so `txn-item`'s `.find()` is typed.

### [ ] 11. Cashflow suffix hardcoded `VND` regardless of currency
- File: `src/app/fund/transactions/form/cashflowForm.tsx`
- Problem: Quantity/FX `suffix="VND"` even when `selectedAsset.currency !== "VND"` (only FX disable uses `isVND`).
- Fix: show the actual `selectedAsset.currency`.

---

## Keep (done well)
- Correct Layer-3 client-only pattern; page shell does no data fetching.
- `[content-visibility:auto]` + `contain-intrinsic-size` on the list grid for render perf.
- Scroll-based infinite loading using refs to avoid stale closures + "page not filled" auto-fetch effect.
- `cacheComponents`-safe deferral of `new Date()` into `useEffect` in the filter hook.
- Centralized `formConfig` map for the four form types.

---

## Suggested execution order
1. High-impact: #2, #4, #5, #6
2. Consistency: #7 (with #6), #8, #9
3. Cosmetic sweep: #3, #10, #11
