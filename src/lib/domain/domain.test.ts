import { describe, expect, it } from "vitest";
import { recommendFifoPick } from "./fifo";
import { deriveFtzLedger } from "./ftz";
import { calculateDashboardMetrics } from "./inventory";
import { createQrPayload } from "./qr";
import { calculateTariffExposure } from "./tariffs";
import type { InventoryBox, Movement } from "@/data/mock/warehouse-data";

const inventoryBoxes: InventoryBox[] = [
  {
    id: "box-001",
    boxNumber: "OGW-0001",
    sku: "CU-CATH-A",
    copperForm: "cathode",
    weightLbs: 1000,
    countryOfOrigin: "Chile",
    receivedAt: "2026-01-05T08:00:00.000Z",
    warehouseZone: "A-01",
    status: "available",
    ftzStatus: "foreignPrivileged",
    unitValueUsd: 4.1,
    tariffRate: 0.065
  },
  {
    id: "box-002",
    boxNumber: "OGW-0002",
    sku: "CU-CATH-A",
    copperForm: "cathode",
    weightLbs: 750,
    countryOfOrigin: "Peru",
    receivedAt: "2026-02-10T08:00:00.000Z",
    warehouseZone: "B-03",
    status: "available",
    ftzStatus: "nonPrivilegedForeign",
    unitValueUsd: 4.25,
    tariffRate: 0.05
  },
  {
    id: "box-003",
    boxNumber: "OGW-0003",
    sku: "CU-CATH-A",
    copperForm: "cathode",
    weightLbs: 500,
    countryOfOrigin: "United States",
    receivedAt: "2025-12-15T08:00:00.000Z",
    warehouseZone: "H-02",
    status: "held",
    ftzStatus: "domestic",
    unitValueUsd: 4,
    tariffRate: 0
  },
  {
    id: "box-004",
    boxNumber: "OGW-0004",
    sku: "CU-ROD-B",
    copperForm: "rod",
    weightLbs: 1200,
    countryOfOrigin: "Canada",
    receivedAt: "2026-01-12T08:00:00.000Z",
    warehouseZone: "E-01",
    status: "available",
    ftzStatus: "domestic",
    unitValueUsd: 4.4,
    tariffRate: 0.02
  }
];

const movements: Movement[] = [
  {
    id: "move-001",
    boxId: "box-001",
    type: "receive",
    toZone: "A-01",
    occurredAt: "2026-01-05T08:00:00.000Z",
    actor: "warehouse"
  },
  {
    id: "move-002",
    boxId: "box-001",
    type: "transfer",
    fromZone: "A-01",
    toZone: "C-01",
    occurredAt: "2026-02-01T08:00:00.000Z",
    actor: "warehouse"
  },
  {
    id: "move-003",
    boxId: "box-001",
    type: "ship",
    fromZone: "C-01",
    occurredAt: "2026-03-01T08:00:00.000Z",
    actor: "shipping"
  }
];

describe("Old Glory Warehouse domain services", () => {
  it("recommends available FIFO boxes by oldest received date and skips held inventory", () => {
    const recommendation = recommendFifoPick({
      inventory: inventoryBoxes,
      sku: "CU-CATH-A",
      requestedWeightLbs: 1300,
      createdAt: "2026-04-01T08:00:00.000Z"
    });

    expect(recommendation.sku).toBe("CU-CATH-A");
    expect(recommendation.requestedWeightLbs).toBe(1300);
    expect(recommendation.selectedBoxIds).toEqual(["box-001", "box-002"]);
    expect(recommendation.selectedBoxIds).not.toContain("box-003");
    expect(recommendation.totalWeightLbs).toBe(1750);
    expect(recommendation.rationale.join(" ").toLowerCase()).toContain("oldest received date");
  });

  it("reports FIFO shortages without selecting unavailable boxes", () => {
    const recommendation = recommendFifoPick({
      inventory: inventoryBoxes,
      sku: "CU-CATH-A",
      requestedWeightLbs: 3000,
      createdAt: "2026-04-01T08:00:00.000Z"
    });

    expect(recommendation.selectedBoxIds).toEqual(["box-001", "box-002"]);
    expect(recommendation.totalWeightLbs).toBe(1750);
    expect(recommendation.shortageWeightLbs).toBe(1250);
    expect(recommendation.rationale.join(" ").toLowerCase()).toContain("shortage");
  });

  it("calculates tariff exposure from dutiable value and rate", () => {
    const exposure = calculateTariffExposure(inventoryBoxes);

    expect(exposure.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          boxId: "box-001",
          dutiableValueUsd: 4100,
          tariffRate: 0.065,
          estimatedDutyUsd: 266.5
        }),
        expect.objectContaining({
          boxId: "box-002",
          dutiableValueUsd: 3187.5,
          tariffRate: 0.05,
          estimatedDutyUsd: 159.38
        })
      ])
    );
    expect(exposure.totalEstimatedDutyUsd).toBe(531.48);
  });

  it("derives FTZ ledger entries from receiving, transfer, and withdrawal movements", () => {
    const ledger = deriveFtzLedger(movements, inventoryBoxes);

    expect(ledger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          boxId: "box-001",
          eventType: "admit",
          referenceMovementId: "move-001"
        }),
        expect.objectContaining({
          boxId: "box-001",
          eventType: "transfer",
          referenceMovementId: "move-002"
        }),
        expect.objectContaining({
          boxId: "box-001",
          eventType: "withdraw",
          referenceMovementId: "move-003"
        })
      ])
    );
  });

  it("aggregates dashboard metrics from inventory, movements, and overrides", () => {
    const metrics = calculateDashboardMetrics({
      inventory: inventoryBoxes,
      movements,
      overrides: [
        {
          id: "override-001",
          recommendationId: "fifo-001",
          removedBoxIds: ["box-001"],
          addedBoxIds: ["box-002"],
          reason: "Customer hold released newer lot first",
          actor: "ops-manager",
          createdAt: "2026-04-02T08:00:00.000Z"
        }
      ]
    });

    expect(metrics.availableWeightLbs).toBe(2950);
    expect(metrics.heldWeightLbs).toBe(500);
    expect(metrics.estimatedTariffLiabilityUsd).toBe(531.48);
    expect(metrics.recentMovementCount).toBe(0);
    expect(metrics.overrideCount).toBe(1);
  });

  it("creates a stable QR payload for lot lookup and audit scanning", () => {
    const payload = createQrPayload({
      boxId: "box-001",
      boxNumber: "OGW-0001",
      sku: "CU-CATH-A",
      warehouseZone: "A-01",
      generatedAt: "2026-04-01T08:00:00.000Z"
    });

    expect(payload).toMatchObject({
      version: 1,
      type: "inventory_box",
      boxId: "box-001",
      boxNumber: "OGW-0001",
      sku: "CU-CATH-A",
      warehouseZone: "A-01"
    });
    expect(payload.urlPath).toBe("/inventory/box-001");
    expect(payload.generatedAt).toBe("2026-04-01T08:00:00.000Z");
  });
});

describe("Real ICC editable warehouse operations contract", () => {
  it("loads the real ICC seed as the active source instead of demo inventory", async () => {
    const dataModule = await importModule("@/data/real/icc-real-warehouse-seed");
    const seed = dataModule.iccRealWarehouseSeed as Array<Record<string, unknown>>;

    expect(Array.isArray(seed)).toBe(true);
    expect(seed).toHaveLength(70);
    expect(seed.every((record: Record<string, unknown>) => String(record.source).startsWith("icc"))).toBe(true);
    expect(seed.map((record: Record<string, unknown>) => record.row)).toEqual(
      expect.arrayContaining(["A", "B", "C", "D", "E", "F", "J"])
    );
  });

  it("flags known real seed review facts without inventing missing values", async () => {
    const dataModule = await importModule("@/data/real/icc-real-warehouse-seed");
    const seed = dataModule.iccRealWarehouseSeed as Array<Record<string, unknown>>;
    const levelFourLeftSide = seed.find((record) => record.warehouseLocation === "A-01-L4");

    expect(levelFourLeftSide).toEqual(
      expect.objectContaining({
        row: "A",
        position: "01",
        level: 4,
        reviewStatus: "needsReview"
      })
    );
    expect(String((levelFourLeftSide?.reviewIssues as string[]).join(" ")).toLowerCase()).toContain(
      "level"
    );

    const recordsWithMissingBusinessFields = seed.filter((record) =>
      ["supplier", "poNumber", "boxNumber", "ftzLotId", "htsCode", "countryOfOrigin", "costUsd", "status"].some(
        (field) => record[field] === "Needs Review" || record[field] === null
      )
    );

    expect(recordsWithMissingBusinessFields.length).toBeGreaterThan(0);
    expect(recordsWithMissingBusinessFields.every((record) => record.reviewStatus === "needsReview")).toBe(true);
  });

  it("receives a new box into a valid empty location and creates an audit movement", async () => {
    const operations = await importModule("./inventory");
    const receiveBox = getFunction(operations, "receiveBox");
    const seedSnapshot = makeEditableSnapshot();

    const result = receiveBox(seedSnapshot, {
      box: {
        partNumber: "CU-NEW-12",
        copperSize: "12 ft",
        row: "B",
        position: "02",
        level: 2,
        weightLbs: 2400,
        status: "available"
      },
      actor: "Warehouse User",
      reason: "Inbound copper receipt"
    }) as EditableOperationResult;

    expect(result.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partNumber: "CU-NEW-12",
          row: "B",
          position: "02",
          level: 2,
          warehouseLocation: "B-02-L2",
          reviewStatus: "needsReview"
        })
      ])
    );
    expect(result.movements.at(-1)).toEqual(
      expect.objectContaining({
        type: "receiveBox",
        actor: "Warehouse User",
        toZone: "B-02-L2"
      })
    );
  });

  it("moves a box, frees its old location, and blocks duplicate destination locations", async () => {
    const operations = await importModule("./inventory");
    const moveBox = getFunction(operations, "moveBox");
    const seedSnapshot = makeEditableSnapshot();

    const moved = moveBox(seedSnapshot, {
      boxId: "icc-a-01-l1",
      row: "B",
      position: "02",
      level: 2,
      actor: "Warehouse User",
      reason: "Make room for inbound 12 ft stock"
    }) as EditableOperationResult;

    expect(moved.inventory.find((box: Record<string, unknown>) => box.id === "icc-a-01-l1")).toEqual(
      expect.objectContaining({
        warehouseLocation: "B-02-L2",
        row: "B",
        position: "02",
        level: 2
      })
    );
    expect(moved.movements.at(-1)).toEqual(
      expect.objectContaining({
        type: "transfer",
        fromZone: "A-01-L1",
        toZone: "B-02-L2"
      })
    );

    const duplicateMove = captureOperationResult(() =>
      moveBox(seedSnapshot, {
        boxId: "icc-a-01-l1",
        row: "A",
        position: "01",
        level: 2,
        actor: "Warehouse User",
        reason: "Invalid duplicate move"
      })
    );
    const duplicateMessage =
      duplicateMove.thrown?.message ??
      duplicateMove.result?.inventory.find((box) => box.id === "icc-a-01-l1")?.reviewIssues?.join(" ");
    expect(duplicateMessage).toMatch(/duplicate|occupied/i);
  });

  it("marks invalid row-level editable operations as Needs Review", async () => {
    const operations = await importModule("./inventory");
    const receiveBox = getFunction(operations, "receiveBox");
    const seedSnapshot = makeEditableSnapshot();

    const leftSideResult = receiveBox(seedSnapshot, {
      box: {
        partNumber: "CU-BAD-12",
        copperSize: "12 ft",
        row: "A",
        position: "04",
        level: 4,
        weightLbs: 2000,
        status: "available"
      },
      actor: "Warehouse User",
      reason: "Invalid left-side level"
    }) as EditableOperationResult;

    expect(leftSideResult.inventory.at(-1)).toEqual(
      expect.objectContaining({
        warehouseLocation: "A-04-L4",
        reviewStatus: "needsReview"
      })
    );
    expect(leftSideResult.inventory.at(-1)?.reviewIssues?.join(" ")).toMatch(/level|A-D|12-foot|max level 3/i);

    const rightSideResult = receiveBox(seedSnapshot, {
      box: {
        partNumber: "CU-BAD-6",
        copperSize: "6 ft",
        row: "E",
        position: "04",
        level: 5,
        weightLbs: 1200,
        status: "available"
      },
      actor: "Warehouse User",
      reason: "Invalid right-side level"
    }) as EditableOperationResult;

    expect(rightSideResult.inventory.at(-1)).toEqual(
      expect.objectContaining({
        warehouseLocation: "E-04-L5",
        reviewStatus: "needsReview"
      })
    );
    expect(rightSideResult.inventory.at(-1)?.reviewIssues?.join(" ")).toMatch(/level|E-J|6-foot|max level 4/i);
  });

  it("status operations update inventory, audit movements, and FIFO eligibility", async () => {
    const operations = await importModule("./inventory");
    const holdBox = getFunction(operations, "holdBox");
    const fifoModule = await importModule("./fifo");
    const recommendFifoPickFromModule = getFunction(fifoModule, "recommendFifoPick");
    const seedSnapshot = makeEditableSnapshot();

    const held = holdBox(
      seedSnapshot,
      "icc-a-01-l1",
      {
        actor: "Warehouse User",
        reason: "Quality hold"
      }
    ) as EditableOperationResult;

    expect(held.inventory.find((box: Record<string, unknown>) => box.id === "icc-a-01-l1")).toEqual(
      expect.objectContaining({ status: "held" })
    );
    expect(held.movements.at(-1)).toEqual(
      expect.objectContaining({ type: "hold", reason: "Quality hold" })
    );

    const recommendation = recommendFifoPickFromModule({
      inventory: held.inventory,
      sku: "CU-12",
      requestedWeightLbs: 1000,
      createdAt: "2026-06-12T12:00:00.000Z"
    }) as { selectedBoxIds: string[] };

    expect(recommendation.selectedBoxIds).not.toContain("icc-a-01-l1");
  });

  it("partially pulls copper from a box without depleting the remaining balance", async () => {
    const operations = await importModule("./inventory");
    const consumeBox = getFunction(operations, "consumeBox");
    const seedSnapshot = makeEditableSnapshot();

    const result = consumeBox(
      seedSnapshot,
      "icc-a-01-l1",
      {
        consumedWeightLbs: 600,
        actor: "Warehouse User",
        reason: "Partial customer pull",
        occurredAt: "2026-06-12T12:00:00.000Z"
      }
    ) as EditableOperationResult;
    const pulledBox = result.inventory.find((box) => box.id === "icc-a-01-l1");

    expect(pulledBox).toEqual(
      expect.objectContaining({
        weightLbs: 1800,
        status: "available"
      })
    );
    expect(result.movements.at(-1)).toEqual(
      expect.objectContaining({
        type: "consumeBox",
        boxId: "icc-a-01-l1",
        fromZone: "A-01-L1",
        reason: "Partial customer pull",
        consumedWeightLbs: 600,
        remainingWeightLbs: 1800
      })
    );
  });

  it("fully depletes a box when the pull consumes the available balance", async () => {
    const operations = await importModule("./inventory");
    const consumeBox = getFunction(operations, "consumeBox");
    const seedSnapshot = makeEditableSnapshot();

    const result = consumeBox(
      seedSnapshot,
      "icc-a-01-l1",
      {
        consumedWeightLbs: 2400,
        actor: "Warehouse User",
        reason: "Full depletion",
        occurredAt: "2026-06-12T12:00:00.000Z"
      }
    ) as EditableOperationResult;
    const depletedBox = result.inventory.find((box) => box.id === "icc-a-01-l1");

    expect(depletedBox).toEqual(
      expect.objectContaining({
        weightLbs: 0,
        status: "picked"
      })
    );
    expect(result.movements.at(-1)).toEqual(
      expect.objectContaining({
        type: "consumeBox",
        consumedWeightLbs: 2400,
        remainingWeightLbs: 0
      })
    );
  });

  it("builds inventory label layout payloads with printable stock dimensions and QR data", async () => {
    const labelsModule = await importModule("./labels");
    const createOldGloryBoxQrLabelPayload = getFunction(labelsModule, "createOldGloryBoxQrLabelPayload");
    const [box] = makeEditableSnapshot().inventory;

    const payload = createOldGloryBoxQrLabelPayload(
      box,
      "2026-06-12T12:00:00.000Z",
      "/warehouse/inventory"
    ) as Record<string, unknown> & {
      display: Record<string, unknown>;
      data: Record<string, unknown>;
    };

    expect(payload).toEqual(
      expect.objectContaining({
        version: 1,
        type: "oldGloryBoxLabel",
        boxId: "icc-a-01-l1",
        boxNumber: "BOX-A1",
        urlPath: "/warehouse/inventory/icc-a-01-l1",
        generatedAt: "2026-06-12T12:00:00.000Z",
        display: expect.objectContaining({
          primary: "12 ft",
          secondary: "ICC Supplier",
          location: "A-01-L1"
        }),
        data: expect.objectContaining({
          supplier: "ICC Supplier",
          poNumber: "PO-100",
          warehouseLocation: "A-01-L1",
          weightLbs: 2400
        })
      })
    );
    expect(labelsModule.OLD_GLORY_LABEL_CONFIG).toEqual(
      expect.objectContaining({
        labelStock: expect.objectContaining({
          labelWidthIn: 4,
          labelHeightIn: 2,
          labelsPerPage: 10
        })
      })
    );
  });

  it("flags missing business fields and duplicate active locations for review", async () => {
    const qualityModule = await importModule("./warehouse-quality");
    const getNeedsReviewRows = getFunction(qualityModule, "getNeedsReviewRows");
    const snapshot = makeEditableSnapshot();
    snapshot.inventory[1].warehouseLocation = "A-01-L1";
    snapshot.inventory[1].supplier = "Needs Review";

    const rows = getNeedsReviewRows(snapshot) as Array<{ box: { id: string }; issues: string[]; locationConflict: boolean }>;

    expect(rows.some((row) => row.box.id === "icc-a-01-l1" && row.locationConflict)).toBe(true);
    expect(rows.some((row) => row.box.id === "icc-a-01-l2" && row.issues.includes("Missing Supplier"))).toBe(true);
  });

  it("keeps point-in-time value and job context for tariff-tracked pulls", async () => {
    const inventoryModule = await importModule("./inventory");
    const tariffsModule = await importModule("./tariffs");
    const pullBox = getFunction(inventoryModule, "pullBox");
    const deriveJobTariffLedger = getFunction(tariffsModule, "deriveJobTariffLedger");
    const snapshot = makeEditableSnapshot();
    snapshot.inventory[0].unitValueUsd = 4;
    snapshot.inventory[0].tariffRate = 0.1;

    const pulled = pullBox(snapshot, {
      boxId: "icc-a-01-l1",
      pulledWeightLbs: 500,
      jobNumber: "JOB-42",
      tariffTracked: true,
      actor: "Warehouse User",
    });
    const ledger = deriveJobTariffLedger(pulled) as Array<{ jobNumber: string; dutiableValueUsd: number; estimatedDutyUsd: number }>;

    expect(ledger[0]).toEqual(expect.objectContaining({
      jobNumber: "JOB-42",
      dutiableValueUsd: 2000,
      estimatedDutyUsd: 200,
    }));
  });
});

async function importModule(path: string): Promise<Record<string, unknown>> {
  try {
    return await import(path);
  } catch (error) {
    throw new Error(`Expected implementation module "${path}" to exist for real ICC warehouse tests. ${String(error)}`);
  }
}

function getFunction(moduleExports: Record<string, unknown>, exportName: string): (...args: unknown[]) => unknown {
  const maybeFunction = moduleExports[exportName];
  if (typeof maybeFunction !== "function") {
    throw new Error(`Expected export "${exportName}" to be a function.`);
  }
  return maybeFunction as (...args: unknown[]) => unknown;
}

function captureOperationResult(operation: () => unknown): {
  result?: EditableOperationResult;
  thrown?: Error;
} {
  try {
    return { result: operation() as EditableOperationResult };
  } catch (error) {
    return { thrown: error instanceof Error ? error : new Error(String(error)) };
  }
}

type EditableOperationResult = {
  inventory: Array<Record<string, unknown> & { reviewIssues?: string[] }>;
  movements: Array<Record<string, unknown>>;
};

function makeEditableSnapshot() {
  return {
    inventory: [
      {
        id: "icc-a-01-l1",
        source: "icc-spreadsheet",
        partNumber: "CU-12",
        copperSize: "12 ft",
        supplier: "ICC Supplier",
        poNumber: "PO-100",
        boxNumber: "BOX-A1",
        sku: "CU-12",
        copperForm: "rod",
        row: "A",
        position: "01",
        level: 1,
        warehouseLocation: "A-01-L1",
        warehouseZone: "A-01-L1",
        storageSide: "left12ft",
        boxLengthFt: 12,
        weightLbs: 2400,
        countryOfOrigin: "Chile",
        receivedAt: "2026-01-01T00:00:00.000Z",
        dateReceived: "2026-01-01",
        status: "available",
        ftzStatus: "domestic",
        ftzLotId: "FTZ-A1",
        htsCode: "7403.11",
        costUsd: 9600,
        unitValueUsd: 0,
        tariffRate: 0,
        reviewStatus: "valid",
        reviewIssues: []
      },
      {
        id: "icc-a-01-l2",
        source: "icc-spreadsheet",
        partNumber: "CU-12",
        copperSize: "12 ft",
        supplier: "ICC Supplier",
        poNumber: "PO-100",
        boxNumber: "BOX-A2",
        sku: "CU-12",
        copperForm: "rod",
        row: "A",
        position: "01",
        level: 2,
        warehouseLocation: "A-01-L2",
        warehouseZone: "A-01-L2",
        storageSide: "left12ft",
        boxLengthFt: 12,
        weightLbs: 2300,
        countryOfOrigin: "Chile",
        receivedAt: "2026-02-01T00:00:00.000Z",
        dateReceived: "2026-02-01",
        status: "available",
        ftzStatus: "domestic",
        ftzLotId: "FTZ-A2",
        htsCode: "7403.11",
        costUsd: 9200,
        unitValueUsd: 0,
        tariffRate: 0,
        reviewStatus: "valid",
        reviewIssues: []
      }
    ],
    movements: [],
    overrides: []
  };
}
