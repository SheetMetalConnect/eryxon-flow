# Hook Map — Eryxon Flow

> Which hooks query which tables, and their real-time subscription status.

## Hooks with Real-Time Subscriptions

| Hook | Table | Subscription Type |
|------|-------|-------------------|
| `useNotifications` | notifications | postgres_changes (direct) |
| `useJobIssues` | issues | useTableSubscription |
| `useOperationIssues` | issues | useEntitySubscription |
| `usePartIssues` | issues | useTableSubscription |
| `usePendingIssuesCount` | issues | postgres_changes (status=pending) |
| `usePMI` | parts | postgres_changes (metadata field) |

## Data Hooks (TanStack Query)

| Hook | Tables | QueryKey Pattern | Type |
|------|--------|-----------------|------|
| `useBatches` | operation_batches, cells, profiles | `batches.all()` | useQuery |
| `useBatch` | operation_batches, cells, profiles | `batches.detail()` | useQuery |
| `useSubBatches` | operation_batches, cells | `batches.subBatches()` | useQuery |
| `useBatchOperations` | batch_operations, operations, parts, jobs | `batches.operations()` | useQuery |
| `useBatchRequirements` | batch_requirements | `batches.requirements()` | useQuery |
| `useBatchActiveTimer` | batch_operations, time_entries | `batches.activeTimer()` | useQuery (poll 5s) |
| `useExceptions` | exceptions, expectations, profiles | `exceptions.all()` | useQuery |
| `useException` | exceptions, expectations, profiles | `exceptions.detail()` | useQuery |
| `useFeatureFlags` | tenants | `config.featureFlags()` | useQuery |
| `useOEEMetrics` | (TODO) | `['oee-metrics', days]` | useQuery |
| `useReliabilityMetrics` | (TODO) | `['reliability-metrics', days]` | useQuery |
| `useQualityMetrics` | operation_quantities, scrap_reasons, issues | `quality.metrics()` | useQuery |
| `useScrapReasonUsage` | scrap_reasons, operation_quantities | `quality.scrapUsage()` | useQuery |
| `useJobQualityMetrics` | parts, operations, operation_quantities, issues | `quality.byJob()` | useQuery |
| `usePartQualityMetrics` | operations, operation_quantities, scrap_reasons, issues | `quality.byPart()` | useQuery |
| `useOperationProductionMetrics` | operations, operation_quantities, scrap_reasons | `operations.production()` | useQuery |
| `useJobProductionMetrics` | parts, operations, operation_quantities, scrap_reasons | `production.byJob()` | useQuery |
| `useCachedGeometry` | parts | `pmi.geometry()` | useQuery |
| `usePMI` | parts | `pmi.byPart()` | useQuery |

## Mutation Hooks

| Hook | Tables | Invalidates |
|------|--------|-------------|
| `useCreateBatch` | operation_batches, batch_operations | `["batches"]` |
| `useUpdateBatch` | operation_batches | batches |
| `useUpdateBatchStatus` | operation_batches | batches (optimistic) |
| `useAddOperationsToBatch` | batch_operations | batches |
| `useRemoveOperationFromBatch` | batch_operations | `["batches"]` |
| `useDeleteBatch` | batch_operations, operation_batches | `["batches"]` |
| `useCreateBatchRequirement` | batch_requirements | batches.requirements |
| `useStartBatchTimer` | (RPC) | `["batches"]` |
| `useStopBatchTimer` | (RPC) | `["batches"]` |
| `useFeatureFlags.updateFlags` | tenants | featureFlags |
| `useRecordProduction` | operation_quantities | (manual) |

## Utility Hooks (no DB)

| Hook | Purpose |
|------|---------|
| `useDebounce` | Debounce a value |
| `useDebouncedCallback` | Debounce a callback |
| `useThrottle` | Throttle a value |
| `useMediaQuery` | CSS media query |
| `useIsMobile` | Mobile detection |
| `useResponsiveColumns` | Column count by breakpoint |
| `useServerPagination` | Pagination state management |
| `useInfinitePagination` | Infinite scroll state |

## Realtime Infrastructure

```
useRealtimeSubscription    — Low-level: subscribe to any postgres_changes channel
useTableSubscription       — Subscribe to all changes on a table (tenant-filtered)
useTenantSubscription      — Subscribe to tenant-scoped changes
useEntitySubscription      — Subscribe to changes for a specific entity (by ID)
```

## Global Search

`useGlobalSearch` queries across: jobs, parts, operations, profiles, issues, resources, materials
