# Old Glory Warehouse Contracts

## Contract Boundaries

The Enterprise MVP uses typed mock data now and keeps future Supabase access behind repository interfaces. UI components consume repositories, selectors, and view models. UI components must not calculate FIFO picks, tariff duties, FTZ ledger events, or advisor reasoning.

## Public Type Groups

- Inventory: `Warehouse`, `StorageLocation`, `InventoryBox`, `InventoryQuery`, `PaginatedResult`.
- Movements: `InventoryMovement`, `MovementQuery`, `MovementType`.
- FIFO: `FifoRecommendation`, `FifoOverride`, `FifoRecommendationInput`, `FifoOverrideInput`.
- Compliance: `FtzLedgerEntry`, `TariffLedgerEntry`.
- Advisor: `AdvisorInput`, `AdvisorInsight`, `AdvisorService`.
- Reports: `ReportDefinition`, `ReportExportRequest`, `ReportExportResult`.

## Runtime Validation

Runtime schemas live in `src/schemas/domain.ts`. Mock data, user input, route parameters, repository responses, and report export requests should be parsed through these schemas before the app relies on them.

Dates are ISO strings at contract boundaries. Domain code may convert to `Date` locally, but repository and UI contracts should pass ISO strings.

## Environment

The app reads public Next.js environment variables through `src/config/env.ts`.

- `NEXT_PUBLIC_APP_ENV`: `development`, `test`, or `production`.
- `NEXT_PUBLIC_DATA_PROVIDER`: `mock` or `supabase`; defaults to `mock`.
- `NEXT_PUBLIC_SUPABASE_URL`: required only when provider is `supabase`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: required only when provider is `supabase`.
- `NEXT_PUBLIC_ENABLE_REPORT_EXPORT`: boolean feature flag.
- `NEXT_PUBLIC_ENABLE_AUDIT_LOG`: boolean feature flag.

## Repository Rule

Feature code depends on `RepositoryBundle` and related interfaces from `src/contracts/repositories.ts`. It should not import Supabase row types or call Supabase directly from UI components.
