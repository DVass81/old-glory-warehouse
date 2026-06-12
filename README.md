# Old Glory Warehouse

AI-powered copper inventory, FIFO, FTZ, tariff, labels, exports, and warehouse
visualization for ICC copper warehouse operations.

## Commands

Double-click `START_OLD_GLORY.bat` to start the app and open it in your browser.

```powershell
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

Old Glory Warehouse runs at:

```text
http://localhost:3100
```

Port `3000` is intentionally left available for the CBS FieldOps AI app. Use
`npm run dev:3000` only when you intentionally want Old Glory on port `3000`.

## Real ICC Data

The app now seeds from `Copper Layout (2).xlsx` through
`src/data/real/icc-real-warehouse-seed.ts`. The Real ICC Data Import screen
accepts either:

- the real location layout headers: `Part`, `Alloy`, `Row`, `Position`, `Level`, `Weight`
- the full ICC import template in `public/templates/old-glory-warehouse-import-template.csv`

Missing supplier, PO, FTZ, HTS, country, cost, date, box number, or weight fields
are marked `Needs Review` instead of being invented.

Use the PO / sticker enrichment upload on the import page when the full
supplier/PO sticker export is available. It merges by Box ID, Box Number, or
Warehouse Location without changing warehouse locations.

## Exports And Labels

The Reports page creates real CSV/XLSX downloads from the active browser dataset
for inventory, FIFO, FTZ, tariff, movement audit, and Needs Review records.

The Labels page can print or export label sheets from the active inventory by PO
or across all records, including boxes still marked `Needs Review`.

## Streamlit Cloud

This repository is primarily a Next.js app. If deploying to Streamlit Cloud, set
the main file to:

```text
streamlit_app.py
```

Do not use `scripts/generate_icc_seed.py` as the Streamlit entrypoint. That file
is only a local maintenance script for regenerating the committed seed from an
Excel workbook.

## Full App Deployment

Use **DigitalOcean App Platform** for the full Next.js app. GoDaddy should be
used for the domain/DNS after the DigitalOcean app is live.

DigitalOcean setup:

1. Create an App Platform app from the GitHub repository:
   `DVass81/old-glory-warehouse`
2. Select branch: `main`
3. Use the app spec in `.do/app.yaml`, or configure:
   - Build command: `npm run build`
   - Run command: `npm start`
   - HTTP port: `8080`
4. Deploy the app.
5. In GoDaddy DNS, point your domain to the DigitalOcean App Platform domain
   using DigitalOcean's custom domain instructions.

The production server uses DigitalOcean's `PORT` value automatically, while the
local development app still runs on `http://localhost:3100`.
