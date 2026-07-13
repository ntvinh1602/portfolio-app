"use client"

import { useEffect, useMemo, useSyncExternalStore } from "react"

import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

const supabase = createClient()

type SupabaseSchemaName = keyof Database

type DatabaseSchema<TSchema extends SupabaseSchemaName> = Database[TSchema]

type SupabaseRelationName<TSchema extends SupabaseSchemaName> = keyof (
  DatabaseSchema<TSchema>["Tables"] & DatabaseSchema<TSchema>["Views"]
) &
  string

type SupabaseRelation<
  TSchema extends SupabaseSchemaName,
  TRelation extends SupabaseRelationName<TSchema>,
> = (
  DatabaseSchema<TSchema>["Tables"] & DatabaseSchema<TSchema>["Views"]
)[TRelation]

type SupabaseTableData<
  TSchema extends SupabaseSchemaName,
  TRelation extends SupabaseRelationName<TSchema>,
> = SupabaseRelation<TSchema, TRelation> extends { Row: infer TRow }
  ? TRow
  : never

type ComparableValue = string | number | boolean

type ComparableColumnName<TData> = {
  [TKey in keyof TData]: NonNullable<TData[TKey]> extends ComparableValue
    ? TKey
    : never
}[keyof TData] &
  string

type StringColumnName<TData> = {
  [TKey in keyof TData]: NonNullable<TData[TKey]> extends string ? TKey : never
}[keyof TData] &
  string

type SupabaseSelectBuilder<
  TSchema extends SupabaseSchemaName,
  TRelation extends SupabaseRelationName<TSchema>,
> = {
  gte: <TKey extends ComparableColumnName<SupabaseTableData<TSchema, TRelation>>>(
    column: TKey,
    value: ComparableValue,
  ) => SupabaseSelectBuilder<TSchema, TRelation>
  lte: <TKey extends ComparableColumnName<SupabaseTableData<TSchema, TRelation>>>(
    column: TKey,
    value: ComparableValue,
  ) => SupabaseSelectBuilder<TSchema, TRelation>
  eq: <TKey extends ComparableColumnName<SupabaseTableData<TSchema, TRelation>>>(
    column: TKey,
    value: ComparableValue,
  ) => SupabaseSelectBuilder<TSchema, TRelation>
  ilike: <TKey extends StringColumnName<SupabaseTableData<TSchema, TRelation>>>(
    column: TKey,
    value: string,
  ) => SupabaseSelectBuilder<TSchema, TRelation>
  order: (column: keyof SupabaseTableData<TSchema, TRelation> & string, opts: {
    ascending: boolean
  }) => SupabaseSelectBuilder<TSchema, TRelation>
  range: (
    from: number,
    to: number,
  ) => Promise<{
    data: SupabaseTableData<TSchema, TRelation>[] | null
    count: number | null
    error: Error | null
  }>
}

// A function that modifies the query. Can be used to sort, filter, etc. If .range is used, it will be overwritten.
type SupabaseQueryHandler<
  TRelation extends SupabaseRelationName<TSchema>,
  TSchema extends SupabaseSchemaName = "public",
> = (
  query: SupabaseSelectBuilder<TSchema, TRelation>,
) => SupabaseSelectBuilder<TSchema, TRelation>

interface UseInfiniteQueryProps<
  TSchema extends SupabaseSchemaName = "public",
  TRelation extends SupabaseRelationName<TSchema> =
    SupabaseRelationName<TSchema>,
> {
  // The table name to query
  tableName: TRelation
  // The columns to select, defaults to `*`
  columns?: string
  // The number of items to fetch per page, defaults to `20`
  pageSize?: number
  // Optional database schema name (e.g. "flight"). Defaults to "public".
  schema?: TSchema
  // A function that modifies the query. Can be used to sort, filter, etc. If .range is used, it will be overwritten.
  trailingQuery?: SupabaseQueryHandler<TRelation, TSchema>
  // Optional key that identifies the current trailing query shape (e.g. filters/sort/search).
  // When this changes, the internal store is recreated so stale paginated rows are discarded.
  trailingQueryKey?: unknown
}

interface StoreState<TData> {
  data: TData[]
  count: number
  isSuccess: boolean
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  hasInitialFetch: boolean
}

type Listener = () => void

interface StoreProps<
  TSchema extends SupabaseSchemaName,
  TRelation extends SupabaseRelationName<TSchema>,
> {
  tableName: TRelation
  columns?: string
  pageSize?: number
  schema?: TSchema
  getTrailingQuery: () => SupabaseQueryHandler<TRelation, TSchema> | undefined
}

function createStore<
  TData extends object,
  TSchema extends SupabaseSchemaName,
  TRelation extends SupabaseRelationName<TSchema>,
>(props: StoreProps<TSchema, TRelation>) {
  const {
    tableName,
    columns = "*",
    pageSize = 20,
    schema: schemaName,
    getTrailingQuery,
  } = props

  let state: StoreState<TData> = {
    data: [],
    count: 0,
    isSuccess: false,
    isLoading: false,
    isFetching: false,
    error: null,
    hasInitialFetch: false,
  }

  const listeners = new Set<Listener>()

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const setState = (newState: Partial<StoreState<TData>>) => {
    state = { ...state, ...newState }
    notify()
  }

  const fetchPage = async (skip: number) => {
    if (
      state.hasInitialFetch &&
      (state.isFetching || state.count <= state.data.length)
    )
      return

    setState({ isFetching: true })

    let query = (schemaName
      ? supabase.schema(schemaName).from(tableName)
      : supabase.from(tableName)
    ).select(columns, { count: "exact" }) as unknown as SupabaseSelectBuilder<
      TSchema,
      TRelation
    >

    const trailingQuery = getTrailingQuery()
    if (trailingQuery) {
      query = trailingQuery(query)
    }
    const {
      data: newData,
      count,
      error,
    } = await query.range(skip, skip + pageSize - 1)

    if (error) {
      console.error("An unexpected error occurred:", error)
      setState({ error })
    } else {
      setState({
        data: [...state.data, ...(newData as TData[])],
        count: count || 0,
        isSuccess: true,
        error: null,
      })
    }
    setState({ isFetching: false })
  }

  const fetchNextPage = async () => {
    if (state.isFetching) return
    await fetchPage(state.data.length)
  }

  const initialize = async () => {
    setState({ isLoading: true, isSuccess: false, data: [] })
    await fetchNextPage()
    setState({ isLoading: false, hasInitialFetch: true })
  }

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    fetchNextPage,
    initialize,
  }
}

// Empty initial state to avoid hydration errors.
const initialState: StoreState<unknown> = {
  data: [],
  count: 0,
  isSuccess: false,
  isLoading: false,
  isFetching: false,
  error: null,
  hasInitialFetch: false,
}

function useInfiniteQuery<
  TData extends object,
  TSchema extends SupabaseSchemaName = "public",
  TRelation extends SupabaseRelationName<TSchema> =
    SupabaseRelationName<TSchema>,
>(props: UseInfiniteQueryProps<TSchema, TRelation>) {
  const tableName = props.tableName
  const columns = props.columns ?? "*"
  const pageSize = props.pageSize ?? 20
  const schema = props.schema
  const trailingQuery = props.trailingQuery
  const trailingQueryKey = props.trailingQueryKey

  const store = useMemo(
    () => {
      // Recreate the store when the serialized query shape changes.
      void trailingQueryKey

      return createStore<TData, TSchema, TRelation>({
        tableName,
        columns,
        pageSize,
        schema,
        getTrailingQuery: () => trailingQuery,
      })
    },
    [tableName, columns, pageSize, schema, trailingQuery, trailingQueryKey],
  )

  const state = useSyncExternalStore(
    store.subscribe,
    () => store.getState(),
    () => initialState as StoreState<TData>,
  )

  useEffect(() => {
    if (!state.hasInitialFetch && typeof window !== "undefined") {
      store.initialize()
    }
  }, [state.hasInitialFetch, store])

  return {
    data: state.data,
    count: state.count,
    isSuccess: state.isSuccess,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    hasMore: state.count > state.data.length,
    fetchNextPage: store.fetchNextPage,
  }
}

export {
  useInfiniteQuery,
  type SupabaseQueryHandler,
  type SupabaseTableData,
  type SupabaseRelationName,
  type UseInfiniteQueryProps,
}
