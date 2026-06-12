import type {
  IccImportValidationIssue,
  IccPoSupplierEnrichmentRecord,
  IccPoSupplierEnrichmentResult,
  IccPoSupplierEnrichmentSpreadsheetRow,
  IccWarehouseRecord,
  IsoDateTime,
  OldGloryLabelFieldDefinition,
  OldGloryLabelFieldSection,
  OldGloryLocationLabelRule,
  OldGloryRowPlacardDefinition,
  WarehouseReviewStatus,
  WarehouseRow,
} from "@/types/domain";

export const OLD_GLORY_IMPORT_TEMPLATE_HEADERS = [
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
] as const;

export const OLD_GLORY_PO_SUPPLIER_ENRICHMENT_HEADERS = [
  "Box ID",
  "Box Number",
  "Warehouse Location",
  "Part Number",
  "Copper Size",
  "Supplier",
  "PO Number",
  "FTZ Lot ID",
  "HTS Code",
  "Country of Origin",
] as const;

export type OldGloryWorkbookSheetRows = Array<Array<string | number | null | undefined>>;
export type OldGloryImportTemplateHeader = (typeof OLD_GLORY_IMPORT_TEMPLATE_HEADERS)[number];
export type OldGloryPoSupplierEnrichmentHeader = (typeof OLD_GLORY_PO_SUPPLIER_ENRICHMENT_HEADERS)[number];

type SheetObjectRow = Record<string, unknown>;

export function sheetRowsToObjects(rows: OldGloryWorkbookSheetRows, headerRowIndex = 1): SheetObjectRow[] {
  const headerRow = rows[headerRowIndex] ?? [];
  const headers = headerRow.map((header) => text(header));

  return rows.slice(headerRowIndex + 1).flatMap((row) => {
    const objectRow = headers.reduce<SheetObjectRow>((accumulator, header, index) => {
      if (header) {
        accumulator[header] = row[index];
      }
      return accumulator;
    }, {});

    return hasAnyValue(objectRow) ? [objectRow] : [];
  });
}

export function parseRowPlacards(rows: SheetObjectRow[]): OldGloryRowPlacardDefinition[] {
  return rows.flatMap((row) => {
    const rowCode = text(row.Row).toUpperCase();
    const maxStackLevel = parseMaxStackLevel(row["Max Stack Level"]);
    const boxLengthFt = text(row["Copper Length"]).includes("6") ? 6 : 12;

    if (!rowCode || !text(row["Placard ID"])) {
      return [];
    }

    return [
      {
        placardId: text(row["Placard ID"]),
        row: rowCode as WarehouseRow | string,
        warehouseSide: text(row["Warehouse Side"]),
        storageSide: boxLengthFt === 12 ? "left12ft" : "right6ft",
        copperLength: text(row["Copper Length"]),
        boxLengthFt,
        maxStackLevel,
        placardText: text(row["Placard Text"]),
        codexUsage: optionalText(row["Codex Usage"]),
      },
    ];
  });
}

export function parseLocationLabelRules(rows: SheetObjectRow[]): OldGloryLocationLabelRule[] {
  return rows.flatMap((row) => {
    const ruleId = text(row["Rule ID"]);
    if (!ruleId) {
      return [];
    }

    return [
      {
        ruleId,
        rows: text(row.Rows),
        positionPattern: text(row["Position Pattern"]),
        levels: text(row.Levels),
        copperLength: text(row["Copper Length"]),
        labelFormat: text(row["Label Format"]),
        validationRule: text(row["Validation Rule"]),
        placementRule: text(row["3D Placement Rule"]),
      },
    ];
  });
}

export function parseLabelFieldDefinitions(
  rows: SheetObjectRow[],
  section: OldGloryLabelFieldSection,
): OldGloryLabelFieldDefinition[] {
  return rows.flatMap((row) => {
    const fieldLabel = text(row.Field);
    const fieldName = text(row["Codex Field Name"]);
    if (!fieldLabel || !fieldName) {
      return [];
    }

    return [
      {
        fieldLabel,
        required: text(row.Required),
        source: text(row.Source),
        displayOnLabel: text(row["Display on Label"]),
        includeInQr: text(row["Include in QR"]).toLowerCase() === "yes",
        exampleFormat: optionalText(row["Example / Format"]),
        fieldName,
        validation: text(row.Validation),
        notes: optionalText(row.Notes),
        section,
      },
    ];
  });
}

export function validateOldGloryImportTemplateHeaders(headers: string[]): {
  missingHeaders: OldGloryImportTemplateHeader[];
  extraHeaders: string[];
  isValid: boolean;
} {
  const normalized = new Set(headers.map((header) => header.trim()));
  const missingHeaders = OLD_GLORY_IMPORT_TEMPLATE_HEADERS.filter((header) => !normalized.has(header));
  const extraHeaders = headers
    .map((header) => header.trim())
    .filter((header) => header && !OLD_GLORY_IMPORT_TEMPLATE_HEADERS.includes(header as OldGloryImportTemplateHeader));

  return {
    missingHeaders,
    extraHeaders,
    isValid: missingHeaders.length === 0,
  };
}

export function parsePoSupplierEnrichmentRows(
  rows: IccPoSupplierEnrichmentSpreadsheetRow[],
  sourceFileName?: string,
): IccPoSupplierEnrichmentResult {
  const issues: IccImportValidationIssue[] = [];
  const records = rows.map((row, index) => {
    const sourceRowNumber = index + 2;
    const record = mapPoSupplierEnrichmentRow(row, sourceRowNumber);

    for (const issue of record.reviewIssues) {
      issues.push({
        rowNumber: sourceRowNumber,
        field: "location",
        severity: issue.includes("Missing match key") ? "error" : "warning",
        message: issue,
      });
    }

    return record;
  });

  return {
    records,
    issues,
    importedAt: new Date().toISOString() as IsoDateTime,
    sourceFileName,
  };
}

export function mapPoSupplierEnrichmentRow(
  row: IccPoSupplierEnrichmentSpreadsheetRow,
  sourceRowNumber: number,
): IccPoSupplierEnrichmentRecord {
  const reviewIssues: string[] = [];
  const boxId = optionalText(row["Box ID"]);
  const boxNumber = optionalText(row["Box Number"]);
  const warehouseLocation = optionalText(row["Warehouse Location"]);

  if (!boxId && !boxNumber && !warehouseLocation) {
    reviewIssues.push("Missing match key: Box ID, Box Number, or Warehouse Location");
  }

  if (!optionalText(row.Supplier)) {
    reviewIssues.push("Missing Supplier");
  }

  if (!optionalText(row["PO Number"])) {
    reviewIssues.push("Missing PO Number");
  }

  return {
    boxId,
    boxNumber,
    warehouseLocation,
    partNumber: optionalText(row["Part Number"]),
    copperSize: optionalText(row["Copper Size"]),
    supplier: optionalText(row.Supplier),
    poNumber: optionalText(row["PO Number"]),
    ftzLotId: optionalText(row["FTZ Lot ID"]),
    htsCode: optionalText(row["HTS Code"]),
    countryOfOrigin: optionalText(row["Country of Origin"]),
    sourceRowNumber,
    reviewStatus: reviewIssues.length > 0 ? "needsReview" : "valid",
    reviewIssues,
  };
}

export function enrichIccWarehouseRecords(
  records: IccWarehouseRecord[],
  enrichmentRecords: IccPoSupplierEnrichmentRecord[],
): IccWarehouseRecord[] {
  const locationCounts = records.reduce<Map<string, number>>((counts, record) => {
    counts.set(record.warehouseLocation, (counts.get(record.warehouseLocation) ?? 0) + 1);
    return counts;
  }, new Map());

  return records.map((record) => {
    const enrichment = findEnrichment(record, enrichmentRecords, locationCounts);
    if (!enrichment) {
      return record;
    }

    const merged: IccWarehouseRecord = {
      ...record,
      partNumber: fillMissing(record.partNumber, enrichment.partNumber),
      copperSize: fillMissing(record.copperSize, enrichment.copperSize),
      supplier: fillMissing(record.supplier, enrichment.supplier),
      poNumber: fillMissing(record.poNumber, enrichment.poNumber),
      ftzLotId: enrichment.ftzLotId ?? record.ftzLotId,
      htsCode: enrichment.htsCode ?? record.htsCode,
      tariffClassCode: enrichment.htsCode ?? record.tariffClassCode,
      countryOfOrigin: fillMissing(record.countryOfOrigin, enrichment.countryOfOrigin),
    };

    return refreshReviewStatus(merged);
  });
}

function findEnrichment(
  record: IccWarehouseRecord,
  enrichmentRecords: IccPoSupplierEnrichmentRecord[],
  locationCounts: Map<string, number>,
): IccPoSupplierEnrichmentRecord | undefined {
  return enrichmentRecords.find((enrichment) => {
    if (enrichment.boxId && enrichment.boxId === record.id) return true;
    if (enrichment.boxNumber && enrichment.boxNumber === record.boxNumber) return true;
    return Boolean(
      enrichment.warehouseLocation &&
        enrichment.warehouseLocation === record.warehouseLocation &&
        locationCounts.get(record.warehouseLocation) === 1
    );
  });
}

function refreshReviewStatus(record: IccWarehouseRecord): IccWarehouseRecord {
  const missingTerms = new Map([
    ["supplier", record.supplier],
    ["PO Number", record.poNumber],
    ["FTZ Lot ID", record.ftzLotId],
    ["HTS Code", record.htsCode],
    ["country of origin", record.countryOfOrigin],
  ]);
  const reviewIssues = record.reviewIssues.filter((issue) => {
    const normalized = issue.toLowerCase();
    for (const [term, value] of missingTerms) {
      if (normalized.includes(term.toLowerCase()) && value && value !== "Needs Review") {
        return false;
      }
    }
    return true;
  });
  const reviewStatus: WarehouseReviewStatus = reviewIssues.length > 0 ? "needsReview" : "valid";

  return {
    ...record,
    reviewIssues,
    reviewStatus,
  };
}

function fillMissing(current: string | undefined, next: string | undefined): string {
  return !current || current === "Needs Review" ? next ?? current ?? "Needs Review" : current;
}

function parseMaxStackLevel(value: unknown): 3 | 4 {
  return Number(text(value).replace(/\D/g, "")) === 4 ? 4 : 3;
}

function hasAnyValue(row: SheetObjectRow): boolean {
  return Object.values(row).some((value) => text(value));
}

function optionalText(value: unknown): string | undefined {
  const normalized = text(value);
  return normalized || undefined;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}
