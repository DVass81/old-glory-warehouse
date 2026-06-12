import {
  DashboardMetrics,
  FifoOverride,
  InventoryBox,
  InventoryStatus,
  Movement,
  fifoOverrides
} from "@/data/mock/warehouse-data";
import { iccRealWarehouseSeed } from "@/data/real/icc-real-warehouse-seed";

export type InventoryFilters = {
  sku?: string;
  zone?: string;
  status?: InventoryStatus;
  ftzStatus?: InventoryBox["ftzStatus"];
  countryOfOrigin?: string;
  receivedFrom?: string;
  receivedTo?: string;
  search?: string;
};

export type InventorySnapshot = {
  inventory: InventoryBox[];
  movements: Movement[];
  overrides: FifoOverride[];
  fifoOverrides?: FifoOverride[];
};

export const defaultInventorySnapshot: InventorySnapshot = {
  inventory: iccRealWarehouseSeed,
  movements: createSeedMovements(iccRealWarehouseSeed),
  overrides: fifoOverrides
};

export type WarehouseOperationInput = {
  actor?: string;
  reason?: string;
  occurredAt?: string;
  jobNumber?: string;
  tariffTracked?: boolean;
};

export type ReceiveBoxInput = WarehouseOperationInput & {
  box: Partial<InventoryBox> &
    Pick<InventoryBox, "partNumber" | "copperSize" | "row" | "position" | "level" | "weightLbs" | "status">;
};

export type UpdateBoxInput = WarehouseOperationInput & {
  boxId: string;
  changes: Partial<InventoryBox>;
};

export type MoveBoxInput = WarehouseOperationInput & {
  boxId: string;
  row: string;
  position: string;
  level: number;
};

export type PullBoxInput = WarehouseOperationInput & {
  boxId: string;
  pulledWeightLbs: number;
};

export type ConsumeBoxInput = WarehouseOperationInput & {
  consumedWeightLbs?: number;
};

export function getAvailableInventory(
  filters: InventoryFilters = {},
  snapshot: InventorySnapshot = defaultInventorySnapshot
): InventoryBox[] {
  return snapshot.inventory
    .filter((box) => box.status === "available")
    .filter((box) => matchesInventoryFilters(box, filters))
    .sort(sortByReceivedAtThenBoxNumber);
}

export function listInventory(
  filters: InventoryFilters = {},
  snapshot: InventorySnapshot = defaultInventorySnapshot
): InventoryBox[] {
  return snapshot.inventory
    .filter((box) => matchesInventoryFilters(box, filters))
    .sort(sortByReceivedAtThenBoxNumber);
}

export function calculateInventoryValue(box: InventoryBox): number {
  if (typeof box.costUsd === "number" && box.costUsd > 0) {
    return roundCurrency(box.costUsd);
  }
  return roundCurrency(box.weightLbs * box.unitValueUsd);
}

export function calculateDashboardMetrics(
  snapshot: InventorySnapshot = defaultInventorySnapshot,
  nowIso = "2026-06-12T12:00:00.000Z"
): DashboardMetrics {
  const overrides = snapshot.overrides ?? snapshot.fifoOverrides ?? [];
  const totalValueUsd = snapshot.inventory.reduce(
    (total, box) => total + calculateInventoryValue(box),
    0
  );
  const estimatedTariffLiabilityUsd = snapshot.inventory.reduce(
    (total, box) => total + calculateInventoryValue(box) * box.tariffRate,
    0
  );
  const ftzExposureUsd = snapshot.inventory
    .filter((box) => box.ftzStatus === "foreignPrivileged" || box.ftzStatus === "nonPrivilegedForeign")
    .reduce((total, box) => total + calculateInventoryValue(box), 0);
  const fifoRiskCount = snapshot.inventory.filter(
    (box) => box.status === "available" && ageInDays(box.receivedAt, nowIso) >= 120
  ).length;

  return {
    totalBoxes: snapshot.inventory.length,
    availableBoxes: snapshot.inventory.filter((box) => box.status === "available").length,
    availableWeightLbs: sumWeight(snapshot.inventory, "available"),
    heldWeightLbs: sumWeight(snapshot.inventory, "held"),
    reservedWeightLbs: sumWeight(snapshot.inventory, "reserved"),
    totalValueUsd: roundCurrency(totalValueUsd),
    estimatedTariffLiabilityUsd: roundCurrency(estimatedTariffLiabilityUsd),
    ftzExposureUsd: roundCurrency(ftzExposureUsd),
    fifoRiskCount,
    overrideCount: overrides.length,
    needsReviewCount: snapshot.inventory.filter((box) => box.reviewStatus === "needsReview" || box.status === "needsReview").length,
    recentMovementCount: snapshot.movements.filter(
      (movement) => ageInDays(movement.occurredAt, nowIso) <= 30
    ).length
  };
}

export function applyMovementToInventory(
  inventory: InventoryBox[],
  movement: Movement
): InventoryBox[] {
  return inventory.map((box) => {
    if (box.id !== movement.boxId) {
      return box;
    }

    const nextStatus = statusForMovement(movement.type, box.status);
    return {
      ...box,
      status: nextStatus,
      warehouseZone: movement.toZone && movement.toZone !== "Domestic" ? movement.toZone : box.warehouseZone
    };
  });
}

export function receiveBox(
  snapshot: InventorySnapshot,
  input: ReceiveBoxInput
): InventorySnapshot {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const actor = input.actor ?? "Warehouse User";
  const normalized = normalizeInventoryBox({
    ...input.box,
    id: input.box.id ?? `manual-${Date.now()}`,
    source: "manual",
    boxNumber: input.box.boxNumber ?? `Needs Review-${Date.now()}`,
    sku: input.box.sku ?? input.box.partNumber ?? input.box.copperSize ?? "Needs Review",
    copperForm: input.box.copperForm ?? "other",
    grade: input.box.grade ?? input.box.alloy ?? "Needs Review",
    countryOfOrigin: input.box.countryOfOrigin ?? "Needs Review",
    receivedAt: input.box.receivedAt ?? input.box.dateReceived ?? occurredAt,
    dateReceived: input.box.dateReceived ?? occurredAt,
    warehouseZone: input.box.row,
    ftzStatus: input.box.ftzStatus ?? "needsReview",
    unitValueUsd: input.box.unitValueUsd ?? 0,
    tariffRate: input.box.tariffRate ?? 0
  } as InventoryBox, snapshot.inventory);

  return {
    ...snapshot,
    inventory: recalculateFifoRanks([...snapshot.inventory, normalized]),
    movements: [
      ...snapshot.movements,
      createMovement("receiveBox", normalized.id, actor, occurredAt, input.reason, undefined, normalized.warehouseLocation)
    ]
  };
}

export function updateBox(
  snapshot: InventorySnapshot,
  input: UpdateBoxInput
): InventorySnapshot {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const actor = input.actor ?? "Warehouse User";
  let updatedBox: InventoryBox | undefined;
  const inventory = snapshot.inventory.map((box) => {
    if (box.id !== input.boxId) {
      return box;
    }
    updatedBox = normalizeInventoryBox({ ...box, ...input.changes }, snapshot.inventory, box.id);
    return updatedBox;
  });

  return {
    ...snapshot,
    inventory: recalculateFifoRanks(inventory),
    movements: updatedBox
      ? [
          ...snapshot.movements,
          createMovement("edit", updatedBox.id, actor, occurredAt, input.reason, undefined, updatedBox.warehouseLocation)
        ]
      : snapshot.movements
  };
}

export function moveBox(
  snapshot: InventorySnapshot,
  input: MoveBoxInput
): InventorySnapshot {
  const warehouseLocation = formatWarehouseLocation(input.row, input.position, input.level);
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const actor = input.actor ?? "Warehouse User";
  let previousLocation: string | undefined;
  let movedBox: InventoryBox | undefined;
  const inventory = snapshot.inventory.map((box) => {
    if (box.id !== input.boxId) {
      return box;
    }
    previousLocation = box.warehouseLocation;
    movedBox = normalizeInventoryBox(
      {
        ...box,
        row: input.row.toUpperCase(),
        position: normalizePosition(input.position),
        level: input.level,
        warehouseLocation,
        warehouseZone: warehouseLocation,
        locationId: warehouseLocation.toLowerCase(),
        boxLengthFt: isLongRow(input.row) ? 12 : 6,
        storageSide: isLongRow(input.row) ? "left12ft" : "right6ft"
      },
      snapshot.inventory,
      box.id
    );
    return movedBox;
  });

  return {
    ...snapshot,
    inventory: recalculateFifoRanks(inventory),
    movements: movedBox
      ? [
          ...snapshot.movements,
          createMovement(
            "transfer",
            movedBox.id,
            actor,
            occurredAt,
            input.reason ?? `Moved to ${warehouseLocation}`,
            previousLocation,
            warehouseLocation
          )
        ]
      : snapshot.movements
  };
}

export function pullBox(
  snapshot: InventorySnapshot,
  input: PullBoxInput
): InventorySnapshot {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const actor = input.actor ?? "Warehouse User";
  const pulledWeightLbs = normalizePulledWeight(input.pulledWeightLbs);
  let previousBox: InventoryBox | undefined;
  let updatedBox: InventoryBox | undefined;

  if (pulledWeightLbs <= 0) {
    throw new Error("Pulled weight must be greater than zero");
  }

  const inventory = snapshot.inventory.map((box) => {
    if (box.id !== input.boxId) {
      return box;
    }

    previousBox = box;
    if (box.status === "archived") {
      throw new Error(`Cannot pull from archived box ${box.boxNumber}`);
    }
    if (pulledWeightLbs > box.weightLbs) {
      throw new Error(`Pulled weight ${pulledWeightLbs} exceeds available box weight ${box.weightLbs}`);
    }

    const remainingWeightLbs = roundWeight(box.weightLbs - pulledWeightLbs);
    const depleted = remainingWeightLbs <= 0;
    const normalized = normalizeInventoryBox(
      {
        ...box,
        weightLbs: depleted ? 0 : remainingWeightLbs,
        status: depleted ? "archived" : box.status
      },
      snapshot.inventory,
      box.id
    );
    updatedBox = {
      ...normalized,
      status: depleted ? "archived" : box.status
    };
    return updatedBox;
  });

  if (!previousBox || !updatedBox) {
    throw new Error(`Inventory box ${input.boxId} was not found`);
  }

  return {
    ...snapshot,
    inventory: recalculateFifoRanks(inventory),
    movements: [
      ...snapshot.movements,
      createMovement(
        updatedBox.status === "archived" ? "consumeBox" : "deplete",
        updatedBox.id,
        actor,
        occurredAt,
        input.reason ?? `Pulled ${pulledWeightLbs} lb from ${updatedBox.boxNumber}`,
        previousBox.warehouseLocation,
        updatedBox.warehouseLocation,
        {
          previousWeightLbs: previousBox.weightLbs,
          newWeightLbs: updatedBox.weightLbs,
          pulledWeightLbs,
          consumedWeightLbs: pulledWeightLbs,
          remainingWeightLbs: updatedBox.weightLbs,
          previousStatus: previousBox.status,
          newStatus: updatedBox.status,
          previousLocation: previousBox.warehouseLocation,
          newLocation: updatedBox.warehouseLocation,
          jobNumber: input.jobNumber,
          tariffTracked: input.tariffTracked
        }
      )
    ]
  };
}

export const depleteBox = pullBox;

export function setBoxStatus(
  snapshot: InventorySnapshot,
  boxId: string,
  status: InventoryStatus,
  input: WarehouseOperationInput = {}
): InventorySnapshot {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const actor = input.actor ?? "Warehouse User";
  let updatedBox: InventoryBox | undefined;
  const inventory = snapshot.inventory.map((box) => {
    if (box.id !== boxId) {
      return box;
    }
    updatedBox = normalizeInventoryBox({ ...box, status }, snapshot.inventory, box.id);
    return updatedBox;
  });

  return {
    ...snapshot,
    inventory: recalculateFifoRanks(inventory),
    movements: updatedBox
      ? [
          ...snapshot.movements,
          createMovement(
            movementTypeForStatus(status),
            updatedBox.id,
            actor,
            occurredAt,
            input.reason ?? `Status changed to ${status}`,
            updatedBox.warehouseLocation,
            updatedBox.warehouseLocation
          )
        ]
      : snapshot.movements
  };
}

export function reserveBox(snapshot: InventorySnapshot, boxId: string, input?: WarehouseOperationInput): InventorySnapshot {
  return setBoxStatus(snapshot, boxId, "reserved", input);
}

export function holdBox(snapshot: InventorySnapshot, boxId: string, input?: WarehouseOperationInput): InventorySnapshot {
  return setBoxStatus(snapshot, boxId, "held", input);
}

export function releaseBox(snapshot: InventorySnapshot, boxId: string, input?: WarehouseOperationInput): InventorySnapshot {
  return setBoxStatus(snapshot, boxId, "available", input);
}

export function consumeBox(snapshot: InventorySnapshot, boxId: string, input?: ConsumeBoxInput): InventorySnapshot {
  if (typeof input?.consumedWeightLbs === "number") {
    return consumeBoxWeight(snapshot, boxId, input);
  }
  return setBoxStatus(snapshot, boxId, "picked", input);
}

export function deleteOrArchiveBox(snapshot: InventorySnapshot, boxId: string, input: WarehouseOperationInput = {}): InventorySnapshot {
  return setBoxStatus(snapshot, boxId, "archived", {
    ...input,
    reason: input.reason ?? "Archived from active warehouse"
  });
}

export function validateWarehouseLocation(
  row: string,
  position: string,
  level: number,
  inventory: InventoryBox[],
  currentBoxId?: string
): string[] {
  const issues: string[] = [];
  const normalizedRow = row.trim().toUpperCase();
  const normalizedPosition = normalizePosition(position);
  const location = formatWarehouseLocation(normalizedRow, normalizedPosition, level);
  if (!normalizedRow) {
    issues.push("Missing row");
  }
  if (!position) {
    issues.push("Missing position");
  }
  if (!level) {
    issues.push("Missing level");
  }
  if (!"ABCDEFGHIJ".includes(normalizedRow)) {
    issues.push(`Invalid row: ${normalizedRow || "Needs Review"}`);
  }
  const maxLevel = isLongRow(normalizedRow) ? 3 : 4;
  if (level > maxLevel) {
    issues.push(`Level ${level} exceeds row ${normalizedRow} max level ${maxLevel}`);
  }
  const duplicate = inventory.find((box) => box.id !== currentBoxId && box.warehouseLocation === location && box.status !== "archived");
  if (duplicate) {
    issues.push(`Duplicate location occupied by ${duplicate.boxNumber}`);
  }
  return issues;
}

export function sortByReceivedAtThenBoxNumber(a: InventoryBox, b: InventoryBox): number {
  const receivedDelta = new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
  return receivedDelta === 0 ? a.boxNumber.localeCompare(b.boxNumber) : receivedDelta;
}

export function recalculateFifoRanks(inventory: InventoryBox[]): InventoryBox[] {
  const sortedIds = [...inventory]
    .sort(sortByReceivedAtThenBoxNumber)
    .map((box) => box.id);
  return inventory.map((box) => ({
    ...box,
    fifoRank: sortedIds.indexOf(box.id) + 1
  }));
}

export function formatWarehouseLocation(row: string, position: string, level: number): string {
  return `${row.trim().toUpperCase()}-${normalizePosition(position)}-L${level}`;
}

export function normalizePosition(position: string | number): string {
  const value = String(position).trim();
  return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
}

function createSeedMovements(inventory: InventoryBox[]): Movement[] {
  return inventory.map((box) => ({
    id: `seed-${box.id}-receive`,
    boxId: box.id,
    type: "receive",
    toZone: box.warehouseZone,
    toLocation: box.warehouseLocation,
    occurredAt: box.receivedAt,
    actor: "ICC spreadsheet import",
    reason: `Seeded from ${box.source ?? "spreadsheet"} row ${box.sourceRow ?? "Needs Review"}`
  }));
}

function normalizeInventoryBox(
  box: InventoryBox,
  inventory: InventoryBox[],
  currentBoxId?: string
): InventoryBox {
  const row = (box.row ?? box.warehouseZone ?? "").trim().toUpperCase();
  const position = normalizePosition(box.position ?? "");
  const level = Number(box.level ?? 0);
  const location = row && position && level ? formatWarehouseLocation(row, position, level) : box.warehouseLocation ?? "Needs Review";
  const locationIssues = validateWarehouseLocation(row, position, level, inventory, currentBoxId);
  const reviewIssues = [
    ...(box.reviewIssues ?? []).filter((issue) => !issue.startsWith("Duplicate location") && !issue.startsWith("Level ")),
    ...locationIssues,
    ...businessFieldReviewIssues(box)
  ];
  const needsReview = reviewIssues.length > 0 || box.status === "needsReview";
  return {
    ...box,
    row,
    position,
    level,
    warehouseLocation: location,
    warehouseZone: row || box.warehouseZone,
    locationId: location.toLowerCase(),
    boxLengthFt: isLongRow(row) ? 12 : 6,
    storageSide: isLongRow(row) ? "left12ft" : "right6ft",
    reviewIssues,
    reviewStatus: needsReview ? "needsReview" : "valid",
    status: box.status
  };
}

function businessFieldReviewIssues(box: InventoryBox): string[] {
  const fields: Array<[string, unknown]> = [
    ["Supplier", box.supplier],
    ["PO Number", box.poNumber],
    ["Box Number", box.boxNumber],
    ["Date Received", box.dateReceived ?? box.receivedAt],
    ["FTZ Lot ID", box.ftzLotId],
    ["HTS Code", box.htsCode],
    ["Country of Origin", box.countryOfOrigin],
    ["Cost", box.costUsd]
  ];

  return fields
    .filter(([, value]) => value === undefined || value === null || value === "" || value === "Needs Review")
    .map(([field]) => `Missing ${field}`);
}

function isLongRow(row: string): boolean {
  return ["A", "B", "C", "D"].includes(row.trim().toUpperCase());
}

function createMovement(
  type: Movement["type"],
  boxId: string,
  actor: string,
  occurredAt: string,
  reason?: string,
  fromLocation?: string,
  toLocation?: string,
  audit?: Pick<
    Movement,
    | "previousWeightLbs"
    | "newWeightLbs"
    | "pulledWeightLbs"
    | "consumedWeightLbs"
    | "remainingWeightLbs"
    | "jobNumber"
    | "tariffTracked"
    | "previousStatus"
    | "newStatus"
    | "previousLocation"
    | "newLocation"
  >
): Movement {
  return {
    id: `move-${type}-${boxId}-${occurredAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    boxId,
    type,
    fromLocation,
    toLocation,
    fromZone: fromLocation,
    toZone: toLocation,
    occurredAt,
    actor,
    reason,
    ...audit
  };
}

function movementTypeForStatus(status: InventoryStatus): Movement["type"] {
  const movementByStatus: Partial<Record<InventoryStatus, Movement["type"]>> = {
    reserved: "reserve",
    held: "hold",
    available: "release",
    picked: "pick",
    shipped: "ship",
    archived: "archiveBox"
  };
  return movementByStatus[status] ?? "edit";
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function consumeBoxWeight(
  snapshot: InventorySnapshot,
  boxId: string,
  input: ConsumeBoxInput
): InventorySnapshot {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const actor = input.actor ?? "Warehouse User";
  const consumedWeightLbs = normalizePulledWeight(input.consumedWeightLbs ?? 0);
  let previousBox: InventoryBox | undefined;
  let updatedBox: InventoryBox | undefined;

  if (consumedWeightLbs <= 0) {
    throw new Error("Consumed weight must be greater than zero");
  }

  const inventory = snapshot.inventory.map((box) => {
    if (box.id !== boxId) {
      return box;
    }

    previousBox = box;
    if (box.status === "archived") {
      throw new Error(`Cannot consume archived box ${box.boxNumber}`);
    }
    if (consumedWeightLbs > box.weightLbs) {
      throw new Error(`Consumed weight ${consumedWeightLbs} exceeds available box weight ${box.weightLbs}`);
    }

    const remainingWeightLbs = roundWeight(box.weightLbs - consumedWeightLbs);
    const normalized = normalizeInventoryBox(
      {
        ...box,
        weightLbs: remainingWeightLbs <= 0 ? 0 : remainingWeightLbs,
        status: remainingWeightLbs <= 0 ? "picked" : box.status
      },
      snapshot.inventory,
      box.id
    );
    updatedBox = {
      ...normalized,
      status: remainingWeightLbs <= 0 ? "picked" : box.status
    };
    return updatedBox;
  });

  if (!previousBox || !updatedBox) {
    throw new Error(`Inventory box ${boxId} was not found`);
  }

  return {
    ...snapshot,
    inventory: recalculateFifoRanks(inventory),
    movements: [
      ...snapshot.movements,
      createMovement(
        "consumeBox",
        updatedBox.id,
        actor,
        occurredAt,
        input.reason ?? `Consumed ${consumedWeightLbs} lb from ${updatedBox.boxNumber}`,
        previousBox.warehouseLocation,
        updatedBox.warehouseLocation,
        {
          previousWeightLbs: previousBox.weightLbs,
          newWeightLbs: updatedBox.weightLbs,
          pulledWeightLbs: consumedWeightLbs,
          consumedWeightLbs,
          remainingWeightLbs: updatedBox.weightLbs,
          previousStatus: previousBox.status,
          newStatus: updatedBox.status,
          previousLocation: previousBox.warehouseLocation,
          newLocation: updatedBox.warehouseLocation,
          jobNumber: input.jobNumber,
          tariffTracked: input.tariffTracked
        }
      )
    ]
  };
}

function roundWeight(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function normalizePulledWeight(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Pulled weight must be a finite number");
  }
  return roundWeight(value);
}

function matchesInventoryFilters(box: InventoryBox, filters: InventoryFilters): boolean {
  if (filters.sku && box.sku !== filters.sku) {
    return false;
  }
  if (filters.zone && box.warehouseZone !== filters.zone) {
    return false;
  }
  if (filters.status && box.status !== filters.status) {
    return false;
  }
  if (filters.ftzStatus && box.ftzStatus !== filters.ftzStatus) {
    return false;
  }
  if (filters.countryOfOrigin && box.countryOfOrigin !== filters.countryOfOrigin) {
    return false;
  }
  if (filters.receivedFrom && box.receivedAt < filters.receivedFrom) {
    return false;
  }
  if (filters.receivedTo && box.receivedAt > filters.receivedTo) {
    return false;
  }
  if (filters.search) {
    const query = filters.search.toLowerCase();
    const searchable = `${box.boxNumber} ${box.sku} ${box.grade} ${box.countryOfOrigin} ${box.supplier ?? ""} ${box.poNumber ?? ""} ${box.partNumber ?? ""} ${box.copperSize ?? ""} ${box.warehouseLocation ?? ""} ${box.ftzLotId ?? ""}`.toLowerCase();
    if (!searchable.includes(query)) {
      return false;
    }
  }
  return true;
}

function sumWeight(inventory: InventoryBox[], status: InventoryStatus): number {
  return inventory
    .filter((box) => box.status === status)
    .reduce((total, box) => total + box.weightLbs, 0);
}

function ageInDays(startIso: string, endIso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / msPerDay);
}

function statusForMovement(type: Movement["type"], current: InventoryStatus): InventoryStatus {
  const statusByMovement: Partial<Record<Movement["type"], InventoryStatus>> = {
    reserve: "reserved",
    pick: "picked",
    ship: "shipped",
    hold: "held",
    release: "available",
    receive: "available"
  };

  return statusByMovement[type] ?? current;
}
