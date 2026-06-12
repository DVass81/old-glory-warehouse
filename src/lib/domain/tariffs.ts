import {
  InventoryBox,
  TariffLedgerEntry
} from "@/data/mock/warehouse-data";
import { InventorySnapshot, calculateInventoryValue, defaultInventorySnapshot, roundCurrency } from "./inventory";

export type TariffExposureSummary = {
  countryOfOrigin: string;
  boxes: number;
  dutiableValueUsd: number;
  estimatedDutyUsd: number;
};

export type TariffExposure = {
  entries: TariffLedgerEntry[];
  totalDutiableValueUsd: number;
  totalEstimatedDutyUsd: number;
};

export function calculateEstimatedDuty(box: InventoryBox): number {
  return roundCurrency(calculateInventoryValue(box) * box.tariffRate);
}

export function calculateTariffExposure(
  inventory: InventoryBox[] = defaultInventorySnapshot.inventory
): TariffExposure {
  const entries = inventory
    .filter((box) => box.tariffRate > 0)
    .map<TariffLedgerEntry>((box) => ({
      id: `tariff-${box.id}-estimate`,
      boxId: box.id,
      eventType: "estimate",
      dutiableValueUsd: calculateInventoryValue(box),
      tariffRate: box.tariffRate,
      estimatedDutyUsd: calculateEstimatedDuty(box),
      occurredAt: box.receivedAt
    }));

  return {
    entries,
    totalDutiableValueUsd: roundCurrency(
      entries.reduce((total, entry) => total + entry.dutiableValueUsd, 0)
    ),
    totalEstimatedDutyUsd: roundCurrency(
      entries.reduce((total, entry) => total + entry.estimatedDutyUsd, 0)
    )
  };
}

export function deriveTariffLedger(
  snapshot: InventorySnapshot = defaultInventorySnapshot
): TariffLedgerEntry[] {
  const baseEntries = snapshot.inventory
    .filter((box) => box.tariffRate > 0)
    .map<TariffLedgerEntry>((box) => ({
      id: `tariff-${box.id}-estimate`,
      boxId: box.id,
      eventType: "estimate",
      dutiableValueUsd: calculateInventoryValue(box),
      tariffRate: box.tariffRate,
      estimatedDutyUsd: calculateEstimatedDuty(box),
      occurredAt: box.receivedAt
    }));

  const withdrawalEntries = snapshot.movements
    .filter((movement) => movement.type === "withdraw" || movement.type === "ship")
    .flatMap<TariffLedgerEntry>((movement) => {
      const box = snapshot.inventory.find((item) => item.id === movement.boxId);
      if (!box || box.tariffRate <= 0) {
        return [];
      }
      return [
        {
          id: `tariff-${movement.id}-withdrawal`,
          boxId: box.id,
          eventType: "withdrawal",
          dutiableValueUsd: calculateInventoryValue(box),
          tariffRate: box.tariffRate,
          estimatedDutyUsd: calculateEstimatedDuty(box),
          occurredAt: movement.occurredAt,
          referenceMovementId: movement.id
        }
      ];
    });

  return [...baseEntries, ...withdrawalEntries].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt)
  );
}

export function summarizeTariffExposure(
  snapshot: InventorySnapshot = defaultInventorySnapshot
): TariffExposureSummary[] {
  const byCountry = new Map<string, TariffExposureSummary>();

  for (const box of snapshot.inventory) {
    const current =
      byCountry.get(box.countryOfOrigin) ??
      {
        countryOfOrigin: box.countryOfOrigin,
        boxes: 0,
        dutiableValueUsd: 0,
        estimatedDutyUsd: 0
      };

    current.boxes += 1;
    current.dutiableValueUsd = roundCurrency(current.dutiableValueUsd + calculateInventoryValue(box));
    current.estimatedDutyUsd = roundCurrency(current.estimatedDutyUsd + calculateEstimatedDuty(box));
    byCountry.set(box.countryOfOrigin, current);
  }

  return [...byCountry.values()].sort((a, b) => b.estimatedDutyUsd - a.estimatedDutyUsd);
}
