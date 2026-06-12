import { describe, expect, it } from "vitest";

import {
  enrichIccWarehouseRecords,
  parseLabelFieldDefinitions,
  parseLocationLabelRules,
  parsePoSupplierEnrichmentRows,
  parseRowPlacards,
  sheetRowsToObjects,
  validateOldGloryImportTemplateHeaders,
} from "./old-glory-label-import";
import { createOldGloryBoxQrLabelPayload, OLD_GLORY_LABEL_CONFIG } from "@/lib/domain/labels";
import {
  createReportExportQueueItem,
  markReportExportCompleted,
  markReportExportProcessing,
} from "@/lib/domain/reports";
import type { IccWarehouseRecord, ReportExportRequest, ReportExportResult } from "@/types/domain";

describe("Old Glory workbook label and enrichment contracts", () => {
  it("parses workbook-style sheet rows after the title row", () => {
    const rows = sheetRowsToObjects([
      ["Old Glory Warehouse - Row Placards"],
      ["Placard ID", "Row", "Warehouse Side", "Copper Length", "Max Stack Level", "Placard Text", "Codex Usage"],
      ["ROW-A", "A", "Left Side", "12 ft copper", "3", "ROW A - 12' COPPER - MAX 3 HIGH", "Render label"],
      ["ROW-E", "E", "Right Side", "6 ft copper", "4", "ROW E - 6' COPPER - MAX 4 HIGH", "Render label"],
    ]);
    const placards = parseRowPlacards(rows);

    expect(placards).toEqual([
      expect.objectContaining({
        placardId: "ROW-A",
        row: "A",
        storageSide: "left12ft",
        boxLengthFt: 12,
        maxStackLevel: 3,
      }),
      expect.objectContaining({
        placardId: "ROW-E",
        row: "E",
        storageSide: "right6ft",
        boxLengthFt: 6,
        maxStackLevel: 4,
      }),
    ]);
  });

  it("parses location rules and label QR field definitions from workbook columns", () => {
    const locationRules = parseLocationLabelRules([
      {
        "Rule ID": "LOC-12FT",
        Rows: "A-D",
        "Position Pattern": "01, 02, 03... from spreadsheet",
        Levels: "L1-L3",
        "Copper Length": "12 ft",
        "Label Format": "{Row}-{Position}-L{Level}",
        "Validation Rule": "Rows A-D cannot exceed Level 3",
        "3D Placement Rule": "Place on left side in 12-foot storage zone",
      },
    ]);
    const fields = parseLabelFieldDefinitions(
      [
        {
          Field: "FTZ Lot ID",
          Required: "Yes for FTZ",
          Source: "Import/app",
          "Display on Label": "Yes - prominent",
          "Include in QR": "Yes",
          "Example / Format": "FTZ-20250626-001",
          "Codex Field Name": "ftzLotId",
          Validation: "Unique",
          Notes: "Key to tariff ledger",
        },
      ],
      "ftzTariff",
    );

    expect(locationRules[0]).toEqual(
      expect.objectContaining({
        ruleId: "LOC-12FT",
        labelFormat: "{Row}-{Position}-L{Level}",
      }),
    );
    expect(fields[0]).toEqual(
      expect.objectContaining({
        fieldLabel: "FTZ Lot ID",
        includeInQr: true,
        fieldName: "ftzLotId",
        section: "ftzTariff",
      }),
    );
  });

  it("validates the richer Codex import template headers from the workbook", () => {
    const validation = validateOldGloryImportTemplateHeaders([
      "Box ID",
      "Part Number",
      "Copper Size",
      "Alloy",
      "Supplier",
      "PO Number",
      "Box Number",
      "Length Type",
      "Weight Lbs",
      "Cost Per Lb",
      "Extended Value",
      "Date Received",
      "Row",
      "Position",
      "Level",
      "Warehouse Location",
      "FTZ Status",
      "FTZ Lot ID",
      "HTS Code",
      "Country of Origin",
      "Status",
    ]);

    expect(validation).toEqual({
      missingHeaders: [],
      extraHeaders: [],
      isValid: true,
    });
  });

  it("imports PO and supplier enrichment without inventing missing match keys", () => {
    const result = parsePoSupplierEnrichmentRows([
      {
        "Warehouse Location": "A-01-L1",
        Supplier: "Maverick",
        "PO Number": "PO028944",
        "HTS Code": "8503.00.9520",
        "Country of Origin": "Peru",
      },
      {
        Supplier: "Tecnofil",
      },
    ]);

    expect(result.records[0]).toEqual(
      expect.objectContaining({
        warehouseLocation: "A-01-L1",
        supplier: "Maverick",
        poNumber: "PO028944",
        reviewStatus: "valid",
      }),
    );
    expect(result.records[1]).toEqual(
      expect.objectContaining({
        reviewStatus: "needsReview",
        reviewIssues: expect.arrayContaining([expect.stringMatching(/match key/i), expect.stringMatching(/po/i)]),
      }),
    );
  });

  it("enriches existing warehouse records by location and removes resolved missing-field review issues", () => {
    const record = makeWarehouseRecord();
    const [enriched] = enrichIccWarehouseRecords(record, [
      {
        warehouseLocation: "A-01-L1",
        supplier: "Maverick",
        poNumber: "PO028944",
        htsCode: "8503.00.9520",
        countryOfOrigin: "Peru",
        sourceRowNumber: 2,
        reviewStatus: "valid",
        reviewIssues: [],
      },
    ]);

    expect(enriched).toEqual(
      expect.objectContaining({
        supplier: "Maverick",
        poNumber: "PO028944",
        htsCode: "8503.00.9520",
        countryOfOrigin: "Peru",
        reviewStatus: "valid",
        reviewIssues: [],
      }),
    );
  });

  it("builds the shared box QR label payload and export queue item contracts", () => {
    const record = {
      ...makeWarehouseRecord()[0],
      supplier: "Maverick",
      poNumber: "PO028944",
      ftzLotId: "FTZ-20250626-001",
      fifoRank: 4,
      reviewIssues: [],
      reviewStatus: "valid",
    } satisfies IccWarehouseRecord;
    const payload = createOldGloryBoxQrLabelPayload(record, "2026-06-12T12:00:00.000Z");
    const request: ReportExportRequest = {
      reportId: "report-inventory-valuation",
      format: "xlsx",
      filters: [{ key: "status", value: "available" }],
      columns: ["boxNumber", "supplier", "poNumber"],
    };
    const queued = createReportExportQueueItem(request, {
      id: "export-001",
      requestedAt: "2026-06-12T12:00:00.000Z",
      requestedBy: "warehouse-user",
    });
    const processing = markReportExportProcessing(queued);
    const completed = markReportExportCompleted(processing, {
      fileName: "inventory.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      generatedAt: "2026-06-12T12:01:00.000Z",
      source: "mock",
    } satisfies ReportExportResult);

    expect(OLD_GLORY_LABEL_CONFIG.labelStock).toEqual(
      expect.objectContaining({
        name: "ULINE S-5962",
        labelWidthIn: 4,
        labelHeightIn: 2,
        labelsPerPage: 10,
      }),
    );
    expect(payload).toEqual(
      expect.objectContaining({
        type: "oldGloryBoxLabel",
        boxId: "icc-a-01-l1",
        boxNumber: "BOX-A1",
        urlPath: "/inventory/icc-a-01-l1",
        display: expect.objectContaining({
          primary: "12 ft",
          location: "A-01-L1",
        }),
      }),
    );
    expect(payload.data).toEqual(
      expect.objectContaining({
        supplier: "Maverick",
        poNumber: "PO028944",
        ftzLotId: "FTZ-20250626-001",
        fifoRank: 4,
      }),
    );
    expect(completed).toEqual(
      expect.objectContaining({
        id: "export-001",
        status: "completed",
        attempts: 1,
        result: expect.objectContaining({ fileName: "inventory.xlsx" }),
      }),
    );
  });
});

function makeWarehouseRecord(): IccWarehouseRecord[] {
  return [
    {
      id: "icc-a-01-l1",
      boxNumber: "BOX-A1",
      lotNumber: "FTZ-A1",
      sku: "CU-12",
      copperForm: "other",
      copperGrade: "mixed",
      weightLbs: 1500,
      unitOfMeasure: "lb",
      countryOfOrigin: "Needs Review",
      receivedAt: "2026-01-01T00:00:00.000Z",
      warehouseId: "old-glory-main",
      locationId: "loc-A-01-L1",
      warehouseZone: "left12ft",
      status: "available",
      ftzStatus: "foreignPrivileged",
      unitValueUsd: 0,
      tariffRate: 0,
      partNumber: "CU-12",
      copperSize: "12 ft",
      supplier: "Needs Review",
      poNumber: "Needs Review",
      row: "A",
      position: "01",
      level: 1,
      warehouseLocation: "A-01-L1",
      ftzLotId: "FTZ-A1",
      htsCode: "Needs Review",
      storageSide: "left12ft",
      boxLengthFt: 12,
      reviewStatus: "needsReview",
      reviewIssues: ["Missing Supplier", "Missing PO Number", "Missing HTS Code", "Missing Country of Origin"],
    },
  ];
}
