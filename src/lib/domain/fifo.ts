import {
  FifoOverride,
  FifoRecommendation,
  InventoryBox
} from "@/data/mock/warehouse-data";
import {
  InventorySnapshot,
  defaultInventorySnapshot,
  getAvailableInventory,
  sortByReceivedAtThenBoxNumber
} from "./inventory";

export type FifoPickRequest = {
  inventory?: InventoryBox[];
  sku: string;
  requestedWeightLbs: number;
  createdAt?: string;
};

export type FifoOverrideInput = {
  removedBoxIds: string[];
  addedBoxIds: string[];
  reason: string;
  actor: string;
  createdAt?: string;
};

export function recommendFifoPick(
  request: FifoPickRequest,
  snapshot: InventorySnapshot = defaultInventorySnapshot
): FifoRecommendation {
  if (request.requestedWeightLbs <= 0) {
    throw new Error("FIFO request weight must be greater than zero.");
  }

  const effectiveSnapshot = request.inventory
    ? { ...snapshot, inventory: request.inventory }
    : snapshot;
  const eligible = getAvailableInventory({ sku: request.sku }, effectiveSnapshot);
  const selected: InventoryBox[] = [];
  let selectedWeight = 0;

  for (const box of eligible) {
    if (selectedWeight >= request.requestedWeightLbs) {
      break;
    }
    selected.push(box);
    selectedWeight += box.weightLbs;
  }

  const shortageLbs = Math.max(0, request.requestedWeightLbs - selectedWeight);
  const createdAt = request.createdAt ?? new Date().toISOString();

  return {
    id: `fifo-${request.sku.toLowerCase()}-${createdAt.slice(0, 10)}`,
    sku: request.sku,
    requestedWeightLbs: request.requestedWeightLbs,
    selectedBoxIds: selected.map((box) => box.id),
    totalWeightLbs: selectedWeight,
    shortageLbs,
    shortageWeightLbs: shortageLbs,
    rationale: buildRationale(request, selected, eligible, shortageLbs),
    createdAt
  };
}

export function applyFifoOverride(
  recommendation: FifoRecommendation,
  input: FifoOverrideInput,
  snapshot: InventorySnapshot = defaultInventorySnapshot
): FifoOverride {
  if (!input.reason.trim()) {
    throw new Error("FIFO override reason is required.");
  }

  const eligibleIds = new Set(
    getAvailableInventory({ sku: recommendation.sku }, snapshot).map((box) => box.id)
  );
  const recommendedIds = new Set(recommendation.selectedBoxIds);

  for (const removedId of input.removedBoxIds) {
    if (!recommendedIds.has(removedId)) {
      throw new Error(`Cannot remove box ${removedId}; it is not in the recommendation.`);
    }
  }

  for (const addedId of input.addedBoxIds) {
    if (!eligibleIds.has(addedId)) {
      throw new Error(`Cannot add box ${addedId}; it is not eligible for this FIFO request.`);
    }
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: `ovr-${recommendation.id}-${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    recommendationId: recommendation.id,
    removedBoxIds: input.removedBoxIds,
    addedBoxIds: input.addedBoxIds,
    reason: input.reason.trim(),
    actor: input.actor,
    createdAt
  };
}

export function previewOverrideSelection(
  recommendation: FifoRecommendation,
  override: FifoOverride
): string[] {
  const removed = new Set(override.removedBoxIds);
  const next = recommendation.selectedBoxIds.filter((id) => !removed.has(id));

  for (const addedId of override.addedBoxIds) {
    if (!next.includes(addedId)) {
      next.push(addedId);
    }
  }

  return next;
}

function buildRationale(
  request: FifoPickRequest,
  selected: InventoryBox[],
  eligible: InventoryBox[],
  shortageLbs: number
): string[] {
  const oldestFirst = [...eligible].sort(sortByReceivedAtThenBoxNumber);
  const rationale = [
    `Selected ${selected.length} available ${request.sku} lot(s) by oldest received date.`,
    `Oldest eligible lot is ${oldestFirst[0]?.boxNumber ?? "not available"}.`,
    `Requested ${request.requestedWeightLbs} lb and selected ${selected.reduce(
      (total, box) => total + box.weightLbs,
      0
    )} lb.`
  ];

  if (shortageLbs > 0) {
    rationale.push(`Shortage of ${shortageLbs} lb remains after all eligible lots.`);
  }

  return rationale;
}
