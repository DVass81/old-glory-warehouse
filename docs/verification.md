# Verification Plan

Test Pilot Nova owns repeatable verification for the Old Glory Warehouse MVP.
Run these checks after the scaffold, domain services, UI, and integration work are
available.

## Required Commands

```powershell
node --version
npm --version
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Record the Node and npm versions in the final handoff. Treat TypeScript errors,
lint failures, failed tests, and failed production builds as blocking until the
coordinator explicitly accepts the limitation.

## Unit Test Coverage

`src/lib/domain/domain.test.ts` covers the planned domain service contract:

- FIFO recommendations select available inventory by oldest `receivedAt`.
- FIFO recommendations skip held inventory.
- FIFO shortages report remaining unfilled weight.
- Tariff exposure uses `weightLbs * unitValueUsd * tariffRate`.
- Tariff totals round currency values to cents.
- FTZ ledger entries are derived from receive, transfer, and ship/withdraw
  movements.
- Dashboard metrics aggregate available weight, held weight, tariff liability,
  movement count, and override count.
- QR payloads provide stable lot lookup data and an inventory route path.

If implementation names differ, update imports and field names only; keep these
behavioral assertions unless the coordinator changes the business contract.

## Browser Smoke Checklist

Start the app with `npm run dev`, then open `http://localhost:3100`.

Check desktop `1440x900`, tablet `768x1024`, and mobile `390x844`:

- Initial route renders without a blank screen.
- Browser console has no high-severity runtime errors.
- Primary navigation reaches Dashboard, Inventory, FIFO, FTZ, Tariffs, Advisor,
  Reports, and Warehouse View.
- Tables stay readable and do not overflow the viewport incoherently.
- Filters, tabs, drawers, dialogs, and theme toggle respond to interaction.
- Charts render with legible labels in light and dark mode.
- Loading, empty, and error states render without crashing.
- 3D warehouse canvas exists, is nonblank, is framed on each viewport size, and
  supports the expected hover, selection, camera, or animation behavior.
- Text does not overlap controls, charts, tables, or the 3D scene.

## Real ICC Data And Editable Operations Coverage

The real-data build adds spreadsheet/import and editable warehouse-operation
tests. These tests are expected to fail until the corresponding implementation
lands, and then become the regression suite for the ICC source-of-truth flow.

`src/lib/import/icc-warehouse-import.test.ts` covers:

- Import template headers exactly match the required ICC warehouse columns.
- Spreadsheet rows map into app records without invented values.
- Missing business fields become `Needs Review` values and review issues.
- Spreadsheet `Warehouse Location` is preserved exactly.
- Row/Position/Level disagreement with `Warehouse Location` is flagged.
- Duplicate locations are flagged.
- Rows A-D are left-side 12-foot storage with max level 3.
- Rows E-J are right-side 6-foot storage with max level 4.
- Empty structural slots are separate from occupied spreadsheet boxes.

`src/lib/domain/domain.test.ts` additionally covers:

- The real ICC seed module is the active source and contains 70 spreadsheet
  records.
- Known seed facts are preserved, including rows A, B, C, D, E, F, and J.
- `A-01-L4` is imported and flagged `Needs Review` because A-D max at level 3.
- Receiving a new box adds inventory and creates an audit movement.
- Moving a box updates location, records from/to locations, and blocks duplicate
  destinations.
- Editable operations enforce A-D and E-J level rules.
- Hold/status operations update FIFO eligibility.
- Partial copper pulls reduce `weightLbs`, keep the box active while material
  remains, and write depletion audit fields.
- Full depletion drives the box to picked status with zero remaining weight.
- Old Glory inventory label payloads include stable scan URLs, display fields,
  QR data, and printable stock dimensions.

`src/lib/build/app-routes.test.ts` covers:

- The separate App Router page build has one page file for each primary
  warehouse workspace route under the warehouse route group.

`src/lib/domain/reports.test.ts` covers:

- Report export queue items are created as queued, transition through processing,
  preserve completed result payloads, and record failure messages.

`src/lib/import/icc-warehouse-import.test.ts` additionally covers:

- Purchase-order enrichment matches by PO and part/copper size.
- Enrichment fills missing supplier, country, HTS, and cost fields.
- Enrichment does not overwrite spreadsheet facts that are already populated.

## Latest Verification Run

Run on 2026-06-12 with `C:\Program Files\nodejs` prepended to `PATH` because
`node` and `npm` were not available on the default shell path.

- `npm test`: passed, 5 test files and 30 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.

## Final Report

The closeout report should include:

- Commands run and pass/fail status.
- Test scenarios covered.
- Browser sizes checked.
- 3D canvas verification result.
- Console errors or warnings that matter.
- Skipped checks and why they were skipped.
- Residual risks and final readiness recommendation.
