import type {
  FtzStatus,
  IccImportResult,
  IccImportValidationIssue,
  IccWarehouseRecord,
  IccWarehouseSpreadsheetRow,
  InventoryBoxId,
  InventoryStatus,
  IsoDateTime,
  StorageLocationId,
  WarehouseId,
  WarehouseRow,
  WarehouseStorageSide,
} from "@/types/domain";

export const ICC_IMPORT_HEADERS = [
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
  "Status",
] as const;

export const ICC_LOCATION_LAYOUT_HEADERS = ["Part", "Alloy", "Row", "Position", "Level", "Weight"] as const;

const LEFT_12FT_ROWS = new Set(["A", "B", "C", "D"]);
const RIGHT_6FT_ROWS = new Set(["E", "F", "G", "H", "I", "J"]);
const NEEDS_REVIEW = "Needs Review";

export type IccRequiredImportHeader = (typeof ICC_IMPORT_HEADERS)[number];
export type IccLocationLayoutHeader = (typeof ICC_LOCATION_LAYOUT_HEADERS)[number];
export type IccImportProfile = "fullTemplate" | "locationLayout" | "unknown";

export type IccHeaderValidationResult = {
  missingHeaders: string[];
  extraHeaders: string[];
  isValid: boolean;
  profile: IccImportProfile;
  acceptedHeaders: readonly string[];
};

export type WarehouseSlot = {
  warehouseLocation: string;
  row: string;
  position: string;
  level: number;
  storageSide: WarehouseStorageSide;
  boxLengthFt: 6 | 12;
  occupied: boolean;
  displayStatus: InventoryStatus | "empty";
  source: "icc-spreadsheet" | "empty";
  box?: IccWarehouseRecord;
};

export function validateIccImportHeaders(headers: string[]): IccHeaderValidationResult {
  const normalizedHeaders = new Set(headers.map((header) => header.trim()));
  const profile = detectIccImportProfile(headers);
  const acceptedHeaders: readonly string[] = profile === "locationLayout" ? ICC_LOCATION_LAYOUT_HEADERS : ICC_IMPORT_HEADERS;
  const missingHeaders = acceptedHeaders.filter((header) => !normalizedHeaders.has(header));
  const extraHeaders = headers
    .map((header) => header.trim())
    .filter((header) => header.length > 0 && !acceptedHeaders.includes(header));

  return {
    missingHeaders,
    extraHeaders,
    isValid: profile !== "unknown" && missingHeaders.length === 0,
    profile,
    acceptedHeaders,
  };
}

export function detectIccImportProfile(headers: string[]): IccImportProfile {
  const normalizedHeaders = new Set(headers.map((header) => header.trim()));
  const hasFullTemplate = ICC_IMPORT_HEADERS.every((header) => normalizedHeaders.has(header));
  if (hasFullTemplate) {
    return "fullTemplate";
  }
  const hasLocationLayout = ICC_LOCATION_LAYOUT_HEADERS.every((header) => normalizedHeaders.has(header));
  if (hasLocationLayout) {
    return "locationLayout";
  }
  return "unknown";
}

export function validateIccWarehouseRows(
  rows: IccWarehouseSpreadsheetRow[],
  sourceFileName?: string,
): IccImportResult {
  const issues: IccImportValidationIssue[] = [];
  const locationCounts = new Map<string, number>();
  const records = rows.map((row, index) => {
    const rowNumber = index + 2;
    const record = mapIccSpreadsheetRow(row, rowNumber, sourceFileName);
    for (const issue of record.reviewIssues) {
      issues.push({
        rowNumber,
        field: issue.includes("Duplicate") ? "duplicate" : "location",
        severity: issue.includes("Missing") ? "warning" : "error",
        message: issue,
      });
    }

    const locationKey = normalizeWarehouseLocation(record.row, record.position, record.level);
    locationCounts.set(locationKey, (locationCounts.get(locationKey) ?? 0) + 1);
    return record;
  });

  const duplicateLocations = [...locationCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([location]) => location);

  if (duplicateLocations.length > 0) {
    for (const record of records) {
      if (duplicateLocations.includes(normalizeWarehouseLocation(record.row, record.position, record.level))) {
        record.reviewStatus = "needsReview";
        record.reviewIssues.push(`Duplicate location ${record.warehouseLocation}`);
        issues.push({
          rowNumber: record.sourceRowNumber ?? 0,
          field: "duplicate",
          severity: "error",
          message: `Duplicate location ${record.warehouseLocation}`,
          value: record.warehouseLocation,
        });
      }
    }
  }

  return {
    records,
    validRecords: records.filter((record) => record.reviewStatus === "valid"),
    needsReviewRecords: records.filter((record) => record.reviewStatus === "needsReview"),
    duplicateLocations,
    issues,
    importedAt: new Date().toISOString() as IsoDateTime,
    sourceFileName,
  };
}

export function mapIccSpreadsheetRow(
  row: IccWarehouseSpreadsheetRow,
  rowNumber: number,
  sourceFileName?: string,
): IccWarehouseRecord {
  const reviewIssues: string[] = [];
  const rowCode = normalizeRow(row.Row);
  const position = normalizePosition(row.Position);
  const level = normalizeLevel(row.Level);
  const warehouseLocation = text(row["Warehouse Location"]) || normalizeWarehouseLocation(rowCode, position, level);
  const weightLbs = numberOrZero(row.Weight);
  const costUsd = optionalNumber(row.Cost);
  const status = normalizeStatus(row.Status);
  const ftzStatus = normalizeFtzStatus(row["FTZ Lot ID"]);
  const partNumber = text(row["Part Number / Copper Size"]) || text(row.Part) || NEEDS_REVIEW;
  const copperSize = text(row["Part Number / Copper Size"]) || text(row.Part) || NEEDS_REVIEW;
  const countryOfOrigin = text(row["Country of Origin"]) || NEEDS_REVIEW;
  const receivedAt = text(row["Date Received"]) || "";
  const storageSide = getStorageSide(rowCode);
  const boxLengthFt = storageSide === "left12ft" ? 12 : 6;

  addMissingIssue(reviewIssues, "Row", rowCode);
  addMissingIssue(reviewIssues, "Position", position);
  addMissingIssue(reviewIssues, "Level", level > 0 ? String(level) : "");
  addMissingIssue(reviewIssues, "Supplier", row.Supplier);
  addMissingIssue(reviewIssues, "PO Number", row["PO Number"]);
  addMissingIssue(reviewIssues, "Box Number", row["Box Number"]);
  addMissingIssue(reviewIssues, "Date Received", row["Date Received"]);
  addMissingIssue(reviewIssues, "FTZ Lot ID", row["FTZ Lot ID"]);
  addMissingIssue(reviewIssues, "HTS Code", row["HTS Code"]);
  addMissingIssue(reviewIssues, "Country of Origin", row["Country of Origin"]);
  addMissingIssue(reviewIssues, "Cost", row.Cost);
  addMissingIssue(reviewIssues, "Status", row.Status);

  if (!isWarehouseRow(rowCode)) {
    reviewIssues.push(`Unknown row ${rowCode || NEEDS_REVIEW}`);
  }

  if (rowCode && LEFT_12FT_ROWS.has(rowCode) && level > 3) {
    reviewIssues.push(`Rows A-D cannot exceed level 3: ${warehouseLocation}`);
  }

  if (rowCode && RIGHT_6FT_ROWS.has(rowCode) && level > 4) {
    reviewIssues.push(`Rows E-J cannot exceed level 4: ${warehouseLocation}`);
  }

  if (text(row["Warehouse Location"]) && warehouseLocation !== normalizeWarehouseLocation(rowCode, position, level)) {
    reviewIssues.push("Warehouse Location does not match Row-Position-Level");
  }

  if (weightLbs <= 0) {
    reviewIssues.push("Missing or invalid Weight");
  }

  return {
    id: `icc-box-${rowNumber}` as InventoryBoxId,
    boxNumber: text(row["Box Number"]) || NEEDS_REVIEW,
    lotNumber: text(row["FTZ Lot ID"]) || `ICC-${rowNumber}`,
    sku: partNumber,
    copperForm: "other",
    copperGrade: "mixed",
    weightLbs,
    unitOfMeasure: "lb",
    countryOfOrigin,
    receivedAt: (receivedAt || new Date(0).toISOString()) as IsoDateTime,
    warehouseId: "old-glory-main" as WarehouseId,
    locationId: `loc-${warehouseLocation}` as StorageLocationId,
    warehouseZone: storageSide,
    status,
    ftzStatus,
    unitValueUsd: costUsd ?? 0,
    tariffRate: 0,
    tariffClassCode: text(row["HTS Code"]) || undefined,
    partNumber,
    copperSize,
    supplier: text(row.Supplier) || NEEDS_REVIEW,
    poNumber: text(row["PO Number"]) || NEEDS_REVIEW,
    row: rowCode,
    position,
    level,
    warehouseLocation,
    dateReceived: receivedAt || NEEDS_REVIEW,
    ftzLotId: text(row["FTZ Lot ID"]) || NEEDS_REVIEW,
    htsCode: text(row["HTS Code"]) || NEEDS_REVIEW,
    costUsd,
    originalStatus: text(row.Status) || NEEDS_REVIEW,
    alloy: text(row.Alloy) || undefined,
    sourceRowNumber: rowNumber,
    sourceFileName,
    importSource: sourceFileName ? "upload" : "seed",
    storageSide,
    boxLengthFt,
    tariffExposureUsd: null,
    reviewStatus: reviewIssues.length > 0 ? "needsReview" : "valid",
    reviewIssues,
  };
}

export function normalizeWarehouseLocation(row: string, position: string, level: number): string {
  const normalizedPosition = position.padStart(2, "0");
  return `${row || NEEDS_REVIEW}-${normalizedPosition || NEEDS_REVIEW}-L${level || NEEDS_REVIEW}`;
}

export function getStorageSide(row: string): WarehouseStorageSide {
  return LEFT_12FT_ROWS.has(row) ? "left12ft" : "right6ft";
}

export function buildWarehouseSlots(records: IccWarehouseRecord[]): WarehouseSlot[] {
  const positions = Array.from({ length: 8 }, (_, index) => String(index + 1).padStart(2, "0"));
  const boxesByLocation = new Map(records.map((record) => [record.warehouseLocation, record]));

  return ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].flatMap((row) => {
    const storageSide = getStorageSide(row);
    const boxLengthFt = storageSide === "left12ft" ? 12 : 6;
    const maxLevel = storageSide === "left12ft" ? 3 : 4;

    return positions.flatMap((position) =>
      Array.from({ length: maxLevel }, (_, levelIndex) => {
        const level = levelIndex + 1;
        const warehouseLocation = normalizeWarehouseLocation(row, position, level);
        const box = boxesByLocation.get(warehouseLocation);

        return {
          warehouseLocation,
          row,
          position,
          level,
          storageSide,
          boxLengthFt,
          occupied: Boolean(box),
          displayStatus: box?.status ?? "empty",
          source: box ? "icc-spreadsheet" : "empty",
          box,
        };
      }),
    );
  });
}

export type PurchaseOrderEnrichmentRow = {
  boxId?: string;
  boxNumber?: string;
  warehouseLocation?: string;
  partNumber?: string;
  copperSize?: string;
  poNumber?: string;
  supplier?: string;
  countryOfOrigin?: string;
  htsCode?: string;
  unitCostUsd?: number;
  costUsd?: number;
};

export function enrichIccRecordsFromPurchaseOrders<T extends IccWarehouseRecord>(
  records: T[],
  purchaseOrders: PurchaseOrderEnrichmentRow[]
): Array<T & { poMatchStatus: "matched" | "unmatched" }> {
  return records.map((record) => {
    const match = findPurchaseOrderMatch(record, purchaseOrders);
    if (!match) {
      return { ...record, poMatchStatus: "unmatched" };
    }

    const next = {
      ...record,
      supplier: fillMissing(record.supplier, match.supplier),
      countryOfOrigin: fillMissing(record.countryOfOrigin, match.countryOfOrigin),
      htsCode: fillMissing(record.htsCode, match.htsCode),
      costUsd: fillMissingNumber(record.costUsd, match.costUsd ?? match.unitCostUsd),
      poMatchStatus: "matched" as const,
    };

    return {
      ...next,
      reviewIssues: removeResolvedReviewIssues(next.reviewIssues, next),
      reviewStatus: removeResolvedReviewIssues(next.reviewIssues, next).length > 0 ? "needsReview" : "valid",
    };
  });
}

function normalizeRow(value: unknown): WarehouseRow | string {
  return text(value).toUpperCase();
}

function findPurchaseOrderMatch(
  record: IccWarehouseRecord,
  purchaseOrders: PurchaseOrderEnrichmentRow[]
): PurchaseOrderEnrichmentRow | undefined {
  return (
    purchaseOrders.find((po) => po.boxId && po.boxId === record.id) ??
    purchaseOrders.find((po) => po.boxNumber && po.boxNumber === record.boxNumber) ??
    purchaseOrders.find((po) => po.warehouseLocation && po.warehouseLocation === record.warehouseLocation) ??
    purchaseOrders.find(
      (po) =>
        po.poNumber === record.poNumber &&
        (po.partNumber === record.partNumber || po.copperSize === record.copperSize)
    )
  );
}

function fillMissing(current: string | undefined, next: string | undefined): string {
  return !current || current === NEEDS_REVIEW ? next ?? current ?? NEEDS_REVIEW : current;
}

function fillMissingNumber(current: number | null | undefined, next: number | undefined): number | null | undefined {
  return current === undefined || current === null ? next ?? current : current;
}

function removeResolvedReviewIssues(
  issues: string[],
  record: Pick<IccWarehouseRecord, "supplier" | "countryOfOrigin" | "htsCode" | "costUsd">
): string[] {
  return issues.filter((issue) => {
    if (/supplier/i.test(issue) && record.supplier && record.supplier !== NEEDS_REVIEW) return false;
    if (/country/i.test(issue) && record.countryOfOrigin && record.countryOfOrigin !== NEEDS_REVIEW) return false;
    if (/HTS/i.test(issue) && record.htsCode && record.htsCode !== NEEDS_REVIEW) return false;
    if (/cost/i.test(issue) && typeof record.costUsd === "number") return false;
    return true;
  });
}

function normalizePosition(value: unknown): string {
  return text(value).padStart(2, "0");
}

function normalizeLevel(value: unknown): number {
  const normalized = Number(String(value ?? "").replace(/^L/i, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizeStatus(value: unknown): InventoryStatus {
  const normalized = text(value).toLowerCase();
  if (normalized.includes("reserve")) return "reserved";
  if (normalized.includes("ship")) return "shipped";
  if (normalized.includes("pick")) return "picked";
  if (normalized.includes("hold") || normalized.includes("quality")) return "held";
  if (normalized.includes("available")) return "available";
  return "needsReview";
}

function normalizeFtzStatus(ftzLotId: unknown): FtzStatus {
  return text(ftzLotId) ? "foreignPrivileged" : "needsReview";
}

function isWarehouseRow(value: string): value is WarehouseRow {
  return LEFT_12FT_ROWS.has(value) || RIGHT_6FT_ROWS.has(value);
}

function addMissingIssue(reviewIssues: string[], field: string, value: unknown): void {
  if (!text(value)) {
    reviewIssues.push(`Missing ${field}`);
  }
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function numberOrZero(value: unknown): number {
  return optionalNumber(value) ?? 0;
}

function optionalNumber(value: unknown): number | undefined {
  const raw = String(value ?? "").replace(/[$,]/g, "").trim();
  if (!raw) {
    return undefined;
  }
  const normalized = Number(raw);
  return Number.isFinite(normalized) ? normalized : undefined;
}
