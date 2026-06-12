import {
  ReportDefinition,
  ReportExportRequest,
  ReportExportResult,
  reportDefinitions
} from "@/data/mock/warehouse-data";
import type { InventoryBox, Movement } from "@/data/mock/warehouse-data";
import { recommendFifoPick } from "./fifo";
import { deriveFtzLedger } from "./ftz";
import type { InventorySnapshot } from "./inventory";
import { calculateInventoryValue } from "./inventory";
import { deriveTariffLedger } from "./tariffs";
import type {
  ExportQueueItem,
  ExportQueueItemId,
  IsoDateTime,
  ReportExportRequest as DomainReportExportRequest,
  ReportExportResult as DomainReportExportResult,
  UserId
} from "@/types/domain";

const mimeTypes: Record<ReportExportRequest["format"], string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf"
};

export type RealReportExport = {
  fileName: string;
  mimeType: string;
  byteLength: number;
  generatedAt: string;
  rows: Array<Record<string, string | number | boolean | null | undefined>>;
  source: "browserStorage" | "realIccSeed";
};

export function listReportDefinitions(): ReportDefinition[] {
  return reportDefinitions;
}

export function getReportDefinition(reportId: string): ReportDefinition | undefined {
  return reportDefinitions.find((report) => report.id === reportId);
}

export function createMockReportExport(request: ReportExportRequest): ReportExportResult {
  const definition = getReportDefinition(request.reportId);
  if (!definition) {
    throw new Error(`Unknown report: ${request.reportId}`);
  }

  const generatedAt = new Date().toISOString();
  const filterLength = JSON.stringify(request.filters ?? {}).length;
  const byteLength = 1024 + definition.columns.length * 128 + filterLength;

  return {
    fileName: `${definition.id}-${generatedAt.slice(0, 10)}.${request.format}`,
    mimeType: mimeTypes[request.format],
    byteLength,
    generatedAt,
    source: "mock"
  };
}

export function buildRealReportRows(
  reportId: string,
  snapshot: InventorySnapshot,
): Array<Record<string, string | number | boolean | null | undefined>> {
  switch (reportId) {
    case "report-inventory-valuation":
      return snapshot.inventory.map(inventoryRow);
    case "report-fifo-audit":
      return buildFifoRows(snapshot);
    case "report-ftz-compliance":
      return deriveFtzLedger(snapshot).map((entry) => ({
        ledgerId: entry.id,
        boxId: entry.boxId,
        boxNumber: findBox(snapshot.inventory, entry.boxId)?.boxNumber,
        ftzStatus: entry.ftzStatus,
        eventType: entry.eventType,
        occurredAt: entry.occurredAt,
        referenceMovementId: entry.referenceMovementId,
      }));
    case "report-tariff-exposure":
      return deriveTariffLedger(snapshot).map((entry) => ({
        ledgerId: entry.id,
        boxId: entry.boxId,
        boxNumber: findBox(snapshot.inventory, entry.boxId)?.boxNumber,
        countryOfOrigin: findBox(snapshot.inventory, entry.boxId)?.countryOfOrigin,
        dutiableValueUsd: entry.dutiableValueUsd,
        tariffRate: entry.tariffRate,
        estimatedDutyUsd: entry.estimatedDutyUsd,
        eventType: entry.eventType,
        occurredAt: entry.occurredAt,
      }));
    case "report-executive-summary":
      return buildExecutiveRows(snapshot);
    case "report-movement-audit":
      return snapshot.movements.map(movementRow);
    case "report-needs-review":
      return snapshot.inventory.filter((box) => box.reviewStatus === "needsReview" || box.status === "needsReview").map(inventoryRow);
    default:
      throw new Error(`Unknown report: ${reportId}`);
  }
}

export function createRealReportExport(
  request: Pick<ReportExportRequest, "reportId" | "format">,
  snapshot: InventorySnapshot,
): RealReportExport {
  const rows = buildRealReportRows(request.reportId, snapshot);
  const generatedAt = new Date().toISOString();
  const definition = getReportDefinition(request.reportId) ?? extraReportDefinitions.find((report) => report.id === request.reportId);
  const title = definition?.id ?? request.reportId;
  const byteLength = new Blob([serializeRowsToCsv(rows)]).size;

  return {
    fileName: `${title}-${generatedAt.slice(0, 10)}.${request.format}`,
    mimeType: mimeTypes[request.format],
    byteLength,
    generatedAt,
    rows,
    source: "browserStorage",
  };
}

export function serializeRowsToCsv(rows: Array<Record<string, unknown>>): string {
  const columns = collectColumns(rows);
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];
  return lines.join("\r\n");
}

export const extraReportDefinitions: ReportDefinition[] = [
  {
    id: "report-movement-audit",
    title: "Movement Audit",
    category: "inventory",
    description: "Receive, pull, move, reserve, hold, release, and edit history.",
    defaultFormat: "csv",
    columns: ["movementId", "boxId", "type", "fromLocation", "toLocation", "occurredAt", "actor", "reason"],
  },
  {
    id: "report-needs-review",
    title: "Needs Review",
    category: "inventory",
    description: "Rows with missing supplier, PO, FTZ, HTS, origin, cost, weight, or invalid location data.",
    defaultFormat: "xlsx",
    columns: ["boxNumber", "partNumber", "warehouseLocation", "weightLbs", "reviewIssues"],
  },
];

export function listExportableReportDefinitions(): ReportDefinition[] {
  return [...reportDefinitions, ...extraReportDefinitions].filter((report) => report.defaultFormat !== "pdf");
}

export function createReportExportQueueItem(
  request: DomainReportExportRequest,
  options: {
    id?: ExportQueueItemId | string;
    requestedAt?: IsoDateTime | string;
    requestedBy?: UserId | string;
  } = {}
): ExportQueueItem {
  const requestedAt = (options.requestedAt ?? new Date().toISOString()) as IsoDateTime;

  return {
    id: (options.id ?? `export-${request.reportId}-${requestedAt}`) as ExportQueueItemId,
    request,
    status: "queued",
    requestedAt,
    requestedBy: options.requestedBy,
    attempts: 0
  };
}

export function markReportExportProcessing(item: ExportQueueItem): ExportQueueItem {
  return {
    ...item,
    status: "processing",
    attempts: item.attempts + 1,
    errorMessage: undefined
  };
}

export function markReportExportCompleted(
  item: ExportQueueItem,
  result: DomainReportExportResult
): ExportQueueItem {
  return {
    ...item,
    status: "completed",
    result,
    errorMessage: undefined
  };
}

export function markReportExportFailed(item: ExportQueueItem, errorMessage: string): ExportQueueItem {
  return {
    ...item,
    status: "failed",
    errorMessage
  };
}

type LegacyQueuedReportExportRequest = {
  reportId: string;
  format: ReportExportRequest["format"];
  filters?: Record<string, string | number | boolean>;
  requestedBy?: string;
  requestedAt?: string;
};

type LegacyQueuedReportExport = LegacyQueuedReportExportRequest & {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  position: number;
  result?: ReportExportResult;
  completedAt?: string;
  errorMessage?: string;
};

const legacyExportQueue: LegacyQueuedReportExport[] = [];

export function queueReportExport(request: LegacyQueuedReportExportRequest): LegacyQueuedReportExport {
  const item: LegacyQueuedReportExport = {
    ...request,
    id: `export-${legacyExportQueue.length + 1}`,
    status: "pending",
    position: getPendingQueueLength() + 1,
    requestedAt: request.requestedAt ?? new Date().toISOString()
  };

  legacyExportQueue.push(item);
  return item;
}

export function getQueuedReportExport(id: string): LegacyQueuedReportExport | undefined {
  const item = legacyExportQueue.find((queuedItem) => queuedItem.id === id);
  return item ? withCurrentPosition(item) : undefined;
}

export function processNextReportExport(completedAt = new Date().toISOString()): LegacyQueuedReportExport | undefined {
  const item = legacyExportQueue.find((queuedItem) => queuedItem.status === "pending");
  if (!item) {
    return undefined;
  }

  item.status = "completed";
  item.completedAt = completedAt;
  item.result = createLegacyReportExportResult(item, completedAt);
  item.position = 0;

  return { ...item };
}

function createLegacyReportExportResult(
  item: LegacyQueuedReportExport,
  generatedAt: string
): ReportExportResult {
  return {
    fileName: `${item.reportId}-${generatedAt.slice(0, 10)}.${item.format}`,
    mimeType: mimeTypes[item.format],
    byteLength: 1024 + JSON.stringify(item.filters ?? {}).length,
    generatedAt,
    source: "mock"
  };
}

function getPendingQueueLength(): number {
  return legacyExportQueue.filter((item) => item.status === "pending").length;
}

function withCurrentPosition(item: LegacyQueuedReportExport): LegacyQueuedReportExport {
  if (item.status !== "pending") {
    return { ...item };
  }

  const pendingItems = legacyExportQueue.filter((queuedItem) => queuedItem.status === "pending");
  return {
    ...item,
    position: pendingItems.findIndex((queuedItem) => queuedItem.id === item.id) + 1
  };
}

function inventoryRow(box: InventoryBox): Record<string, string | number | null | undefined> {
  return {
    boxId: box.id,
    boxNumber: box.boxNumber,
    partNumber: box.partNumber,
    copperSize: box.copperSize,
    alloy: box.alloy ?? box.grade,
    supplier: box.supplier,
    poNumber: box.poNumber,
    warehouseLocation: box.warehouseLocation,
    row: box.row,
    position: box.position,
    level: box.level,
    weightLbs: box.weightLbs,
    fifoRank: box.fifoRank,
    status: box.status,
    ftzStatus: box.ftzStatus,
    ftzLotId: box.ftzLotId,
    htsCode: box.htsCode,
    countryOfOrigin: box.countryOfOrigin,
    costUsd: box.costUsd,
    inventoryValueUsd: calculateInventoryValue(box),
    reviewStatus: box.reviewStatus,
    reviewIssues: box.reviewIssues?.join("; "),
  };
}

function movementRow(movement: Movement): Record<string, string | number | undefined> {
  return {
    movementId: movement.id,
    boxId: movement.boxId,
    type: movement.type,
    fromLocation: movement.fromLocation ?? movement.previousLocation,
    toLocation: movement.toLocation ?? movement.newLocation,
    previousWeightLbs: movement.previousWeightLbs,
    newWeightLbs: movement.newWeightLbs,
    pulledWeightLbs: movement.pulledWeightLbs,
    previousStatus: movement.previousStatus,
    newStatus: movement.newStatus,
    occurredAt: movement.occurredAt,
    actor: movement.actor,
    reason: movement.reason,
  };
}

function buildFifoRows(snapshot: InventorySnapshot): Array<Record<string, string | number>> {
  const skus = Array.from(new Set(snapshot.inventory.map((box) => box.sku))).sort((a, b) => a.localeCompare(b));
  return skus.flatMap((sku) => {
    const requestedWeightLbs = snapshot.inventory
      .filter((box) => box.sku === sku && box.status === "available")
      .reduce((total, box) => total + box.weightLbs, 0);
    if (requestedWeightLbs <= 0) {
      return [];
    }
    const recommendation = recommendFifoPick({ sku, requestedWeightLbs }, snapshot);
    return recommendation.selectedBoxIds.map((boxId, index) => {
      const box = findBox(snapshot.inventory, boxId);
      return {
        sku,
        fifoSequence: index + 1,
        boxId,
        boxNumber: box?.boxNumber ?? "",
        warehouseLocation: box?.warehouseLocation ?? "",
        weightLbs: box?.weightLbs ?? 0,
        requestedWeightLbs,
        shortageLbs: recommendation.shortageLbs,
        rationale: recommendation.rationale.join("; "),
      };
    });
  });
}

function buildExecutiveRows(snapshot: InventorySnapshot): Array<Record<string, string | number>> {
  const totalWeight = snapshot.inventory.reduce((total, box) => total + box.weightLbs, 0);
  const totalValue = snapshot.inventory.reduce((total, box) => total + calculateInventoryValue(box), 0);
  const needsReview = snapshot.inventory.filter((box) => box.reviewStatus === "needsReview" || box.status === "needsReview").length;
  return [
    { metric: "Total boxes", value: snapshot.inventory.length, risk: needsReview ? "Needs Review records exist" : "OK" },
    { metric: "Total weight lbs", value: totalWeight, risk: "OK" },
    { metric: "Inventory value USD", value: totalValue, risk: "Cost missing where value is 0" },
    { metric: "Needs Review boxes", value: needsReview, risk: needsReview ? "Review missing fields" : "OK" },
    { metric: "Movement count", value: snapshot.movements.length, risk: "OK" },
  ];
}

function findBox(inventory: InventoryBox[], boxId: string): InventoryBox | undefined {
  return inventory.find((box) => box.id === boxId);
}

function collectColumns(rows: Array<Record<string, unknown>>): string[] {
  return Array.from(rows.reduce<Set<string>>((columns, row) => {
    Object.keys(row).forEach((column) => columns.add(column));
    return columns;
  }, new Set()));
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
