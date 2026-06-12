# Supabase Migration Boundary

## Current MVP State

The first build uses mock repositories that satisfy the same TypeScript interfaces intended for Supabase-backed repositories. This allows the app to ship with deterministic data while keeping the backend migration path explicit.

## Future Tables

Recommended Supabase tables:

- `warehouses`
- `storage_locations`
- `inventory_boxes`
- `inventory_movements`
- `fifo_recommendations`
- `fifo_overrides`
- `ftz_ledger_entries`
- `tariff_ledger_entries`
- `advisor_insights`
- `report_definitions`
- `audit_events`

## Mapping Rule

Domain types are app-facing. Supabase row types are database-facing. Mapper functions should translate Supabase rows into domain models before data reaches services or UI components.

```text
Supabase row -> mapper -> domain model -> service or selector -> UI
```

Do not expose generated Supabase table types as component props.

## Provider Switch

`NEXT_PUBLIC_DATA_PROVIDER=mock` selects mock repositories. A future `supabase` provider should use the same `RepositoryBundle` shape. When the provider is `supabase`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be present.

## Migration Checks

- Repository methods return schema-validated domain objects.
- FIFO, tariff, FTZ, and advisor services keep their public behavior when the data source changes.
- Supabase row names may differ from UI labels, but mapper output must match `src/types/domain.ts`.
