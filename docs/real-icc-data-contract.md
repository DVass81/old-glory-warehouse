# Real ICC Warehouse Data Contract

## Source Of Truth

The real ICC warehouse spreadsheet is the initial source of truth for Old Glory Warehouse. After import, the active editable dataset can be stored locally in the browser and later replaced by Supabase through the repository contracts.

Demo/mock data must stay separate from the active ICC dataset.

## Required Import Headers

The import template is `public/templates/old-glory-warehouse-import-template.csv` and contains:

- Part Number / Copper Size
- Supplier
- PO Number
- Box Number
- Row
- Position
- Level
- Warehouse Location
- Weight
- Date Received
- FTZ Lot ID
- HTS Code
- Country of Origin
- Cost
- Status

The current provided spreadsheet can still be mapped if it contains a narrower set such as `Part`, `Alloy`, `Row`, `Position`, `Level`, and `Weight`. Missing business fields are review issues, not generated values.

## Location Rules

- Row, Position, and Level are required for every box.
- Rows A-D are left-side 12-foot copper storage and cannot exceed level 3.
- Rows E-J are right-side 6-foot copper storage and cannot exceed level 4.
- The warehouse location format is `Row-Position-Level`, for example `A-01-L1`.
- Duplicate normalized locations must be flagged.
- Spreadsheet warehouse locations must be preserved exactly when provided. If the provided warehouse location conflicts with Row, Position, and Level, the row is marked `Needs Review`.

## Review Rules

Missing values are marked as `Needs Review`; they are never invented.

Fields that may remain under review until edited:

- Supplier
- PO Number
- Box Number
- Date Received
- FTZ Lot ID
- HTS Code
- Country of Origin
- Cost
- Status

Invalid row, level, weight, duplicate location, or conflicting warehouse location also marks the record `Needs Review`.

## Editable Operations

Warehouse edits must use repository contracts rather than direct UI mutation. Supported operations are:

- `receiveBox`
- `updateBox`
- `moveBox`
- `reserveBox`
- `holdBox`
- `releaseBox`
- `consumeBox`
- `deleteOrArchiveBox`

Every edit creates an audit record with actor, timestamp, operation type, previous location/status, new location/status, and reason/comment. The default actor for local MVP edits is `Warehouse User`.

## Persistence Boundary

The app should load data in this order:

1. Active edited browser dataset.
2. `icc-real-warehouse-seed.ts`.
3. Demo/mock data only if explicitly selected as demo mode.

Future Supabase persistence should implement the same `IccWarehouseDataRepository` interface without changing UI components.
