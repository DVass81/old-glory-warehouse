import {
  FtzLedgerEntry,
  InventoryBox,
  Movement
} from "@/data/mock/warehouse-data";
import { InventorySnapshot, defaultInventorySnapshot } from "./inventory";

export function deriveFtzLedger(
  snapshotOrMovements: InventorySnapshot | Movement[] = defaultInventorySnapshot,
  inventory: InventoryBox[] = defaultInventorySnapshot.inventory
): FtzLedgerEntry[] {
  const snapshot = Array.isArray(snapshotOrMovements)
    ? { ...defaultInventorySnapshot, movements: snapshotOrMovements, inventory }
    : snapshotOrMovements;
  const boxById = new Map(snapshot.inventory.map((box) => [box.id, box]));

  return snapshot.movements
    .flatMap((movement) => ftzEntriesForMovement(movement, boxById.get(movement.boxId)))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export function calculateFtzExposure(snapshot: InventorySnapshot = defaultInventorySnapshot): number {
  return snapshot.inventory
    .filter((box) => box.ftzStatus === "foreignPrivileged" || box.ftzStatus === "nonPrivilegedForeign")
    .reduce((total, box) => total + box.weightLbs * box.unitValueUsd, 0);
}

export function summarizeFtzByStatus(
  snapshot: InventorySnapshot = defaultInventorySnapshot
): Record<InventoryBox["ftzStatus"], { boxes: number; weightLbs: number; valueUsd: number }> {
  const summary: Record<InventoryBox["ftzStatus"], { boxes: number; weightLbs: number; valueUsd: number }> = {
    domestic: { boxes: 0, weightLbs: 0, valueUsd: 0 },
    foreignPrivileged: { boxes: 0, weightLbs: 0, valueUsd: 0 },
    nonPrivilegedForeign: { boxes: 0, weightLbs: 0, valueUsd: 0 },
    needsReview: { boxes: 0, weightLbs: 0, valueUsd: 0 }
  };

  for (const box of snapshot.inventory) {
    const bucket = summary[box.ftzStatus];
    bucket.boxes += 1;
    bucket.weightLbs += box.weightLbs;
    bucket.valueUsd = Math.round((bucket.valueUsd + box.weightLbs * box.unitValueUsd) * 100) / 100;
  }

  return summary;
}

function ftzEntriesForMovement(
  movement: Movement,
  box: InventoryBox | undefined
): FtzLedgerEntry[] {
  if (!box) {
    return [];
  }

  if (movement.type === "receive" && box.ftzStatus !== "domestic") {
    return [createEntry("admit", movement, box)];
  }

  if (movement.type === "transfer") {
    return [createEntry("transfer", movement, box)];
  }

  if (movement.type === "withdraw" || movement.type === "ship") {
    return [createEntry("withdraw", movement, box)];
  }

  if (movement.type === "adjust") {
    return [createEntry("adjustment", movement, box)];
  }

  if (movement.type === "hold" || movement.type === "release") {
    return [createEntry("statusChange", movement, box)];
  }

  return [];
}

function createEntry(
  eventType: FtzLedgerEntry["eventType"],
  movement: Movement,
  box: InventoryBox
): FtzLedgerEntry {
  return {
    id: `ftz-${movement.id}-${eventType}`,
    boxId: box.id,
    eventType,
    ftzStatus: box.ftzStatus,
    occurredAt: movement.occurredAt,
    referenceMovementId: movement.id
  };
}
