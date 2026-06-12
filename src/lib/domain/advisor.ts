import { AdvisorInsight } from "@/data/mock/warehouse-data";
import { recommendFifoPick } from "./fifo";
import { calculateDashboardMetrics, defaultInventorySnapshot, InventorySnapshot } from "./inventory";
import { summarizeTariffExposure } from "./tariffs";

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
