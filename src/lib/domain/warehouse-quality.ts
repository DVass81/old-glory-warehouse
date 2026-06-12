import type { InventoryBox } from "@/data/mock/warehouse-data";
import type { InventorySnapshot } from "./inventory";

const REVIEW_FIELDS: Array<[string, keyof InventoryBox]> = [
  ["PO", "poNumber"],
  ["Supplier", "supplier"],
  ["Origin", "countryOfOrigin"],
  ["FTZ", "ftzStatus"],
  ["HTS", "htsCode"],
  ["Received", "receivedAt"],
  ["Price / lb", "unitValueUsd"],
  ["Weight", "weightLbs"],
  ["Location", "warehouseLocation"],
];

export type NeedsReviewRow = {
  box: InventoryBox;
  issues: string[];
  locationConflict: boolean;
};

export function getNeedsReviewRows(snapshot: InventorySnapshot): NeedsReviewRow[] {
  const duplicates = findDuplicateLocations(snapshot.inventory);
  return snapshot.inventory
    .filter((box) => box.status !== "archived")
    .map((box) => {
      const missing = REVIEW_FIELDS.flatMap(([label, field]) => (isMissing(box[field]) ? [`Missing ${label}`] : []));
      const issues = [...missing, ...(box.reviewIssues ?? [])];
      const locationConflict = Boolean(box.warehouseLocation && duplicates.has(box.warehouseLocation));
      if (locationConflict) {
        issues.push(`Duplicate location ${box.warehouseLocation}`);
      }
      return { box, issues: Array.from(new Set(issues)), locationConflict };
    })
    .filter((row) => row.box.reviewStatus === "needsReview" || row.box.status === "needsReview" || row.issues.length > 0)
    .sort((a, b) => a.box.boxNumber.localeCompare(b.box.boxNumber, undefined, { numeric: true }));
}

export function findDuplicateLocations(inventory: InventoryBox[]): Set<string> {
  const counts = new Map<string, number>();
  for (const box of inventory) {
    if (box.status === "archived" || !box.warehouseLocation || box.warehouseLocation === "Needs Review") continue;
    counts.set(box.warehouseLocation, (counts.get(box.warehouseLocation) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([location]) => location));
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "" || value === "Needs Review" || value === "needsReview" || value === 0;
}
