import { describe, expect, it } from "vitest";

const REQUIRED_HEADERS = [
  "Part Number / Copper Size",
  "Supplier",
  "PO Number",
  "Box Number",
  "Row",
  "Position",
  "Level",
  "Warehouse Location",
  "Weight",
  "Date Received",
  "FTZ Lot ID",
  "HTS Code",
  "Country of Origin",
  "Cost",
  "Status"
];

describe("ICC warehouse spreadsheet import contract", () => {
  it("exports the exact required template headers", async () => {
    const importModule = await loadImportModule();

    expect(importModule.ICC_IMPORT_HEADERS).toEqual(REQUIRED_HEADERS);
  });

  it("accepts the real Copper Layout spreadsheet headers as a dedicated layout profile", async () => {
    const importModule = await loadImportModule();
    const validateHeaders = getFunction(importModule, "validateIccImportHeaders");
    const detectProfile = getFunction(importModule, "detectIccImportProfile");
    const headers = ["Part", "Alloy", "Row", "Position", "Level", "Weight"];

    expect(detectProfile(headers)).toBe("locationLayout");
    expect(validateHeaders(headers)).toEqual(
      expect.objectContaining({
        isValid: true,
        profile: "locationLayout",
        missingHeaders: [],
      }),
    );
  });

  it("loads Copper Layout rows without inventing supplier or PO data", async () => {
    const importModule = await loadImportModule();
    const validateRows = getFunction(importModule, "validateIccWarehouseRows");
    const result = validateRows([
      {
        Part: ".1875 X 3.0",
        Alloy: "C116",
        Row: "C",
        Position: "1",
        Level: "3",
        Weight: "2169"
      }
    ], "Copper Layout (2).xlsx") as ImportResult;

    expect(result.records[0]).toEqual(
      expect.objectContaining({
        partNumber: ".1875 X 3.0",
        copperSize: ".1875 X 3.0",
        alloy: "C116",
        supplier: "Needs Review",
        poNumber: "Needs Review",
        warehouseLocation: "C-01-L3",
        weightLbs: 2169,
        importSource: "upload",
      }),
    );
    expect(result.records[0].reviewIssues).toEqual(expect.arrayContaining([expect.stringMatching(/supplier/i), expect.stringMatching(/PO/i)]));
  });

  it("maps spreadsheet rows into real ICC inventory records without inventing missing fields", async () => {
    const importModule = await loadImportModule();
    const validateRows = getFunction(importModule, "validateIccWarehouseRows");
    const result = validateRows([
      {
        "Part Number / Copper Size": "12 FT BAR",
        Supplier: "",
        "PO Number": "",
        "Box Number": "",
        Row: "A",
        Position: "01",
        Level: "1",
        "Warehouse Location": "A-01-L1",
        Weight: "2400",
        "Date Received": "",
        "FTZ Lot ID": "",
        "HTS Code": "",
        "Country of Origin": "",
        Cost: "",
        Status: ""
      }
    ]) as ImportResult;

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual(
      expect.objectContaining({
        partNumber: "12 FT BAR",
        copperSize: "12 FT BAR",
        supplier: "Needs Review",
        poNumber: "Needs Review",
        boxNumber: "Needs Review",
        row: "A",
        position: "01",
        level: 1,
        warehouseLocation: "A-01-L1",
        weightLbs: 2400,
        ftzLotId: "Needs Review",
        htsCode: "Needs Review",
        countryOfOrigin: "Needs Review",
        status: "needsReview",
        reviewStatus: "needsReview",
        storageSide: "left12ft",
        boxLengthFt: 12
      })
    );
    expect(result.records[0].costUsd ?? null).toBeNull();
    expect(result.records[0].reviewIssues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/supplier/i),
        expect.stringMatching(/PO/i),
        expect.stringMatching(/box/i),
        expect.stringMatching(/date/i),
        expect.stringMatching(/FTZ/i),
        expect.stringMatching(/HTS/i),
        expect.stringMatching(/country/i),
        expect.stringMatching(/cost/i),
        expect.stringMatching(/status/i)
      ])
    );
  });

  it("preserves spreadsheet warehouse location exactly and flags row-position-level disagreement", async () => {
    const importModule = await loadImportModule();
    const validateRows = getFunction(importModule, "validateIccWarehouseRows");
    const result = validateRows([
      {
        "Part Number / Copper Size": "6 FT BAR",
        Supplier: "ICC Supplier",
        "PO Number": "PO-100",
        "Box Number": "BOX-100",
        Row: "E",
        Position: "01",
        Level: "2",
        "Warehouse Location": "E-99-L4",
        Weight: "1250",
        "Date Received": "2026-02-01",
        "FTZ Lot ID": "FTZ-100",
        "HTS Code": "7403.11",
        "Country of Origin": "Chile",
        Cost: "5100",
        Status: "Available"
      }
    ]) as ImportResult;

    expect(result.records[0]).toEqual(
      expect.objectContaining({
        row: "E",
        position: "01",
        level: 2,
        warehouseLocation: "E-99-L4",
        reviewStatus: "needsReview"
      })
    );
    expect(result.records[0].reviewIssues.join(" ")).toMatch(/warehouse location/i);
  });

  it("flags duplicate warehouse locations during validation", async () => {
    const importModule = await loadImportModule();
    const validateRows = getFunction(importModule, "validateIccWarehouseRows");
    const result = validateRows([
      makeCompleteRow({ "Box Number": "BOX-1", Row: "B", Position: "02", Level: "1", "Warehouse Location": "B-02-L1" }),
      makeCompleteRow({ "Box Number": "BOX-2", Row: "B", Position: "02", Level: "1", "Warehouse Location": "B-02-L1" })
    ]) as ImportResult;

    expect(result.duplicateLocations).toEqual(["B-02-L1"]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringMatching(/duplicate/i)
        })
      ])
    );
    expect(result.records.every((record: { reviewStatus: string }) => record.reviewStatus === "needsReview")).toBe(true);
  });

  it("enforces left-side and right-side row-level rules", async () => {
    const importModule = await loadImportModule();
    const validateRows = getFunction(importModule, "validateIccWarehouseRows");
    const result = validateRows([
      makeCompleteRow({ "Box Number": "BOX-A4", Row: "A", Position: "01", Level: "4", "Warehouse Location": "A-01-L4" }),
      makeCompleteRow({ "Box Number": "BOX-E5", Row: "E", Position: "01", Level: "5", "Warehouse Location": "E-01-L5" }),
      makeCompleteRow({ "Box Number": "BOX-J4", Row: "J", Position: "01", Level: "4", "Warehouse Location": "J-01-L4" })
    ]) as ImportResult;

    expect(result.records[0]).toEqual(
      expect.objectContaining({
        storageSide: "left12ft",
        boxLengthFt: 12,
        reviewStatus: "needsReview"
      })
    );
    expect(result.records[0].reviewIssues.join(" ")).toMatch(/level 3|A-D|12-foot/i);
    expect(result.records[1]).toEqual(
      expect.objectContaining({
        storageSide: "right6ft",
        boxLengthFt: 6,
        reviewStatus: "needsReview"
      })
    );
    expect(result.records[1].reviewIssues.join(" ")).toMatch(/level 4|E-J|6-foot/i);
    expect(result.records[2]).toEqual(
      expect.objectContaining({
        storageSide: "right6ft",
        boxLengthFt: 6,
        reviewStatus: "valid"
      })
    );
  });

  it("builds empty structural slots separately from occupied spreadsheet boxes", async () => {
    const importModule = await loadImportModule();
    const validateRows = getFunction(importModule, "validateIccWarehouseRows");
    const buildWarehouseSlots = getFunction(importModule, "buildWarehouseSlots");
    const result = validateRows([
      makeCompleteRow({ "Box Number": "BOX-A1", Row: "A", Position: "01", Level: "1", "Warehouse Location": "A-01-L1" })
    ]) as ImportResult;
    const slots = buildWarehouseSlots(result.records) as Array<Record<string, unknown>>;

    expect(slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          warehouseLocation: "A-01-L1",
          occupied: true,
          source: "icc-spreadsheet"
        }),
        expect.objectContaining({
          warehouseLocation: "A-01-L2",
          occupied: false,
          displayStatus: "empty"
        })
      ])
    );
    expect(slots.filter((slot) => slot.occupied === true)).toHaveLength(1);
  });

  it("enriches imported records from purchase orders by PO and part number without overwriting spreadsheet facts", async () => {
    const importModule = await loadImportModule();
    const validateRows = getFunction(importModule, "validateIccWarehouseRows");
    const enrichIccRecordsFromPurchaseOrders = getFunction(importModule, "enrichIccRecordsFromPurchaseOrders");
    const imported = validateRows([
      makeCompleteRow({
        "Part Number / Copper Size": "CU-12",
        Supplier: "",
        "PO Number": "PO-200",
        "Box Number": "BOX-200",
        "Country of Origin": "",
        "HTS Code": "",
        Cost: ""
      }),
      makeCompleteRow({
        "Part Number / Copper Size": "CU-6",
        Supplier: "Spreadsheet Supplier",
        "PO Number": "PO-201",
        "Box Number": "BOX-201",
        Row: "A",
        Position: "02",
        Level: "1",
        "Warehouse Location": "A-02-L1",
        "Country of Origin": "Mexico",
        Cost: "7200"
      })
    ]) as ImportResult;

    const enriched = enrichIccRecordsFromPurchaseOrders(imported.records, [
      {
        poNumber: "PO-200",
        partNumber: "CU-12",
        supplier: "PO Supplier",
        countryOfOrigin: "Chile",
        htsCode: "7403.11.0000",
        unitCostUsd: 5100
      },
      {
        poNumber: "PO-201",
        partNumber: "CU-6",
        supplier: "Do Not Override",
        countryOfOrigin: "Peru",
        htsCode: "7408.19.0000",
        unitCostUsd: 9999
      }
    ]) as Array<Record<string, unknown> & { reviewIssues: string[] }>;

    expect(enriched[0]).toEqual(
      expect.objectContaining({
        supplier: "PO Supplier",
        countryOfOrigin: "Chile",
        htsCode: "7403.11.0000",
        costUsd: 5100,
        poMatchStatus: "matched"
      })
    );
    expect(enriched[0].reviewIssues.join(" ")).not.toMatch(/supplier|country|HTS|cost/i);
    expect(enriched[1]).toEqual(
      expect.objectContaining({
        supplier: "Spreadsheet Supplier",
        countryOfOrigin: "Mexico",
        htsCode: "7403.11",
        costUsd: 7200,
        poMatchStatus: "matched"
      })
    );
  });
});

async function loadImportModule(): Promise<Record<string, unknown>> {
  const modulePath = "../import/icc-warehouse-import";

  return importModulePath(modulePath);
}

async function importModulePath(modulePath: string): Promise<Record<string, unknown>> {
  try {
    return await import(modulePath);
  } catch (error) {
    throw new Error(`Expected ${modulePath} to exist for ICC spreadsheet import tests. ${String(error)}`);
  }
}

function getFunction(moduleExports: Record<string, unknown>, exportName: string): (...args: unknown[]) => unknown {
  const maybeFunction = moduleExports[exportName];
  if (typeof maybeFunction !== "function") {
    throw new Error(`Expected export "${exportName}" to be a function.`);
  }
  return maybeFunction as (...args: unknown[]) => unknown;
}

type ImportResult = {
  records: Array<Record<string, unknown> & { reviewIssues: string[]; reviewStatus: string }>;
  duplicateLocations: string[];
  issues: Array<Record<string, unknown>>;
};

function makeCompleteRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    "Part Number / Copper Size": "12 FT BAR",
    Supplier: "ICC Supplier",
    "PO Number": "PO-100",
    "Box Number": "BOX-100",
    Row: "A",
    Position: "01",
    Level: "1",
    "Warehouse Location": "A-01-L1",
    Weight: "2400",
    "Date Received": "2026-02-01",
    "FTZ Lot ID": "FTZ-100",
    "HTS Code": "7403.11",
    "Country of Origin": "Chile",
    Cost: "5100",
    Status: "Available",
    ...overrides
  };
}
