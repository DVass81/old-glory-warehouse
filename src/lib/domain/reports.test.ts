import { describe, expect, it } from "vitest";

describe("report export queue contract", () => {
  it("builds real inventory and needs-review exports from the active snapshot", async () => {
    const reportsModule = await importModule("./reports");
    const createRealReportExport = getFunction(reportsModule, "createRealReportExport");
    const serializeRowsToCsv = getFunction(reportsModule, "serializeRowsToCsv");
    const snapshot = {
      inventory: [
        {
          id: "icc-0001",
          boxNumber: "ICC-C-01-L3",
          partNumber: ".1875 X 3.0",
          copperSize: ".1875 X 3.0",
          sku: ".1875 X 3.0",
          alloy: "C116",
          copperForm: "other",
          weightLbs: 2169,
          countryOfOrigin: "Needs Review",
          receivedAt: "9999-12-31T00:00:00.000Z",
          warehouseZone: "C",
          warehouseLocation: "C-01-L3",
          row: "C",
          position: "01",
          level: 3,
          status: "needsReview",
          ftzStatus: "needsReview",
          unitValueUsd: 0,
          tariffRate: 0,
          supplier: "Needs Review",
          poNumber: "Needs Review",
          reviewStatus: "needsReview",
          reviewIssues: ["Missing Supplier", "Missing PO Number"],
        },
      ],
      movements: [],
      overrides: [],
    };

    const exportResult = createRealReportExport(
      { reportId: "report-needs-review", format: "csv" },
      snapshot,
    ) as { fileName: string; rows: Array<Record<string, unknown>>; source: string };
    const csv = serializeRowsToCsv(exportResult.rows) as string;

    expect(exportResult.fileName).toMatch(/report-needs-review-\d{4}-\d{2}-\d{2}\.csv/);
    expect(exportResult.source).toBe("browserStorage");
    expect(exportResult.rows).toHaveLength(1);
    expect(csv).toContain("ICC-C-01-L3");
    expect(csv).toContain("Missing Supplier; Missing PO Number");
  });

  it("creates queued exports and preserves request/result payloads through processing states", async () => {
    const reportsModule = await importModule("./reports");
    const createReportExportQueueItem = getFunction(reportsModule, "createReportExportQueueItem");
    const markReportExportProcessing = getFunction(reportsModule, "markReportExportProcessing");
    const markReportExportCompleted = getFunction(reportsModule, "markReportExportCompleted");
    const markReportExportFailed = getFunction(reportsModule, "markReportExportFailed");

    const queued = createReportExportQueueItem({
      reportId: "inventory-aging",
      format: "csv",
      filters: [{ key: "status", value: "available" }]
    }, {
      id: "export-001",
      requestedBy: "ops@example.com",
      requestedAt: "2026-06-12T12:00:00.000Z"
    }) as QueuedExport;

    expect(queued).toEqual(
      expect.objectContaining({
        id: "export-001",
        status: "queued",
        attempts: 0,
        requestedAt: "2026-06-12T12:00:00.000Z",
        requestedBy: "ops@example.com"
      })
    );
    expect(queued.request).toEqual(
      expect.objectContaining({
        reportId: "inventory-aging",
        format: "csv",
        filters: [{ key: "status", value: "available" }]
      })
    );

    const processing = markReportExportProcessing(queued) as QueuedExport;
    expect(processing).toEqual(
      expect.objectContaining({
        id: "export-001",
        status: "processing",
        attempts: 1
      })
    );

    const completed = markReportExportCompleted(processing, {
      fileName: "inventory-aging-2026-06-12.csv",
      mimeType: "text/csv",
      generatedAt: "2026-06-12T12:02:00.000Z",
      source: "mock"
    }) as QueuedExport;
    expect(completed).toEqual(
      expect.objectContaining({
        id: "export-001",
        status: "completed",
        attempts: 1,
        result: expect.objectContaining({
          fileName: "inventory-aging-2026-06-12.csv",
          mimeType: "text/csv",
          source: "mock"
        }),
        errorMessage: undefined
      })
    );

    expect(markReportExportFailed(processing, "network timeout")).toEqual(
      expect.objectContaining({
        id: "export-001",
        status: "failed",
        attempts: 1,
        errorMessage: "network timeout"
      })
    );
  });
});

async function importModule(path: string): Promise<Record<string, unknown>> {
  try {
    return await import(path);
  } catch (error) {
    throw new Error(`Expected implementation module "${path}" to exist for report export queue tests. ${String(error)}`);
  }
}

function getFunction(moduleExports: Record<string, unknown>, exportName: string): (...args: unknown[]) => unknown {
  const maybeFunction = moduleExports[exportName];
  if (typeof maybeFunction !== "function") {
    throw new Error(`Expected export "${exportName}" to be a function.`);
  }
  return maybeFunction as (...args: unknown[]) => unknown;
}

type QueuedExport = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;
  requestedAt: string;
  requestedBy?: string;
  request: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
};
