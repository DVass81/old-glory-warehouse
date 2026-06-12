import { AdvisorInsight } from "@/data/mock/warehouse-data";
import { recommendFifoPick } from "./fifo";
import { calculateDashboardMetrics, defaultInventorySnapshot, InventorySnapshot } from "./inventory";
import { deriveJobTariffLedger, summarizeTariffExposure } from "./tariffs";
import { findDuplicateLocations, getNeedsReviewRows } from "./warehouse-quality";

export type AdvisorInput = {
  snapshot?: InventorySnapshot;
  nowIso?: string;
};

export interface AdvisorService {
  generateInsights(input?: AdvisorInput): Promise<AdvisorInsight[]>;
}

export class MockAdvisorService implements AdvisorService {
  async generateInsights(input: AdvisorInput = {}): Promise<AdvisorInsight[]> {
    return getAdvisorInsights(input.snapshot ?? defaultInventorySnapshot, input.nowIso);
  }
}

export function getAdvisorInsights(
  snapshot: InventorySnapshot = defaultInventorySnapshot,
  nowIso = "2026-06-12T12:00:00.000Z"
): AdvisorInsight[] {
  const metrics = calculateDashboardMetrics(snapshot, nowIso);
  const tariffExposure = summarizeTariffExposure(snapshot);
  const insights: AdvisorInsight[] = [];
  const needsReview = getNeedsReviewRows(snapshot);
  const heldOrReserved = snapshot.inventory.filter((box) => box.status === "held" || box.status === "reserved");
  const duplicateLocations = findDuplicateLocations(snapshot.inventory);
  const jobLedger = deriveJobTariffLedger(snapshot);
  const untrackedPulls = snapshot.movements.filter((movement) => movement.tariffTracked === false);
  const lowStock = findLowStockBySku(snapshot);

  if (metrics.fifoRiskCount > 0) {
    const recommendation = recommendFifoPick(
      { sku: "CU-CATH-A", requestedWeightLbs: 20000, createdAt: nowIso },
      snapshot
    );
    insights.push({
      id: "advisor-fifo-aging",
      severity: "warning",
      topic: "fifo",
      title: "Aging copper lots should be reviewed before the next outbound wave.",
      reasoning: [
        `${metrics.fifoRiskCount} available lot(s) are at or above the 120 day FIFO watch threshold.`,
        `Current CU-CATH-A recommendation selects ${recommendation.totalWeightLbs} lb across ${recommendation.selectedBoxIds.length} lot(s).`
      ],
      relatedBoxIds: recommendation.selectedBoxIds,
      createdAt: nowIso
    });
  }

  if (metrics.heldWeightLbs > 0) {
    const heldBoxIds = snapshot.inventory.filter((box) => box.status === "held").map((box) => box.id);
    insights.push({
      id: "advisor-held-inventory",
      severity: "critical",
      topic: "inventory",
      title: "Held inventory is reducing available copper capacity.",
      reasoning: [
        `${metrics.heldWeightLbs} lb are currently held and unavailable for allocation.`,
        "Review hold reasons before committing near-term shipments."
      ],
      relatedBoxIds: heldBoxIds,
      createdAt: nowIso
    });
  }

  if (needsReview.length > 0) {
    insights.push({
      id: "advisor-needs-review",
      severity: "warning",
      topic: "inventory",
      title: "Inventory records still need operational cleanup.",
      reasoning: [
        `${needsReview.length} box(es) have missing supplier, origin, FTZ, received, cost, weight, or location fields.`,
        "Use the Inventory edit panel to resolve Needs Review before pulling against jobs."
      ],
      relatedBoxIds: needsReview.slice(0, 12).map((row) => row.box.id),
      createdAt: nowIso
    });
  }

  if (heldOrReserved.length > 0) {
    insights.push({
      id: "advisor-held-reserved",
      severity: "info",
      topic: "movement",
      title: "Held and reserved boxes should be reviewed before FIFO allocation.",
      reasoning: [
        `${heldOrReserved.length} box(es) are not freely available.`,
        "Release boxes when ready, or keep a reason in the movement audit trail."
      ],
      relatedBoxIds: heldOrReserved.map((box) => box.id),
      createdAt: nowIso
    });
  }

  if (duplicateLocations.size > 0) {
    insights.push({
      id: "advisor-duplicate-locations",
      severity: "critical",
      topic: "inventory",
      title: "Duplicate warehouse locations require correction.",
      reasoning: [
        `${duplicateLocations.size} active location(s) have more than one box assigned.`,
        "Move or edit one of the boxes so the 3D warehouse and pull menus stay accurate."
      ],
      relatedBoxIds: snapshot.inventory
        .filter((box) => box.warehouseLocation && duplicateLocations.has(box.warehouseLocation))
        .map((box) => box.id),
      createdAt: nowIso
    });
  }

  if (lowStock.length > 0) {
    insights.push({
      id: "advisor-low-stock",
      severity: "warning",
      topic: "inventory",
      title: "Some copper sizes are below practical pull coverage.",
      reasoning: lowStock.slice(0, 3).map((item) => `${item.sku}: ${item.availableWeightLbs.toLocaleString("en-US")} lb available across ${item.boxes} box(es).`),
      relatedBoxIds: [],
      createdAt: nowIso
    });
  }

  if (untrackedPulls.length > 0) {
    insights.push({
      id: "advisor-untracked-tariff-pulls",
      severity: "warning",
      topic: "tariff",
      title: "Some job pulls are not included in tariff tracking.",
      reasoning: [
        `${untrackedPulls.length} pull movement(s) were marked Track tariff = No.`,
        `${jobLedger.length} pull movement(s) are currently included in the job tariff ledger.`
      ],
      relatedBoxIds: untrackedPulls.map((movement) => movement.boxId),
      createdAt: nowIso
    });
  }

  const highestDuty = tariffExposure[0];
  if (highestDuty && highestDuty.estimatedDutyUsd > 0) {
    insights.push({
      id: "advisor-tariff-exposure",
      severity: highestDuty.estimatedDutyUsd > 2000 ? "warning" : "info",
      topic: "tariff",
      title: `${highestDuty.countryOfOrigin} has the highest estimated tariff exposure.`,
      reasoning: [
        `${highestDuty.boxes} lot(s) contribute an estimated duty of $${highestDuty.estimatedDutyUsd.toLocaleString("en-US")}.`,
        "Use tariff scenario review before withdrawal or customer repricing."
      ],
      relatedBoxIds: snapshot.inventory
        .filter((box) => box.countryOfOrigin === highestDuty.countryOfOrigin)
        .map((box) => box.id),
      createdAt: nowIso
    });
  }

  if (metrics.ftzExposureUsd > 50000) {
    insights.push({
      id: "advisor-ftz-exposure",
      severity: "warning",
      topic: "ftz",
      title: "FTZ exposure is material enough for compliance review.",
      reasoning: [
        `Foreign-status inventory value is $${metrics.ftzExposureUsd.toLocaleString("en-US")}.`,
        "Confirm admission, transfer, and withdrawal records before month-end close."
      ],
      relatedBoxIds: snapshot.inventory
        .filter((box) => box.ftzStatus !== "domestic")
        .map((box) => box.id),
      createdAt: nowIso
    });
  }

  return insights;
}

function findLowStockBySku(snapshot: InventorySnapshot): Array<{ sku: string; availableWeightLbs: number; boxes: number }> {
  const bySku = new Map<string, { sku: string; availableWeightLbs: number; boxes: number }>();
  for (const box of snapshot.inventory) {
    if (box.status !== "available") continue;
    const current = bySku.get(box.sku) ?? { sku: box.sku, availableWeightLbs: 0, boxes: 0 };
    current.availableWeightLbs += box.weightLbs;
    current.boxes += 1;
    bySku.set(box.sku, current);
  }
  return [...bySku.values()].filter((item) => item.availableWeightLbs > 0 && item.availableWeightLbs < 1000);
}
