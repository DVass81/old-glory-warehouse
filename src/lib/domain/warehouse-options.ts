import { iccRealWarehouseSeed } from "@/data/real/icc-real-warehouse-seed";
import type { FtzStatus, InventoryStatus } from "@/data/mock/warehouse-data";

export const SUPPLIER_OPTIONS = ["Maverick", "CopprRod"] as const;
export const ORIGIN_OPTIONS = ["Tecnofil", "Lavada", "Arubus"] as const;
export const FTZ_OPTIONS = ["Yes", "No"] as const;
export const STATUS_OPTIONS: Array<{ label: string; value: InventoryStatus }> = [
  { label: "Available", value: "available" },
  { label: "Reserved", value: "reserved" },
  { label: "Quality Hold", value: "held" },
  { label: "Needs Review", value: "needsReview" },
];
export const WAREHOUSE_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
export const WAREHOUSE_POSITIONS = Array.from({ length: 8 }, (_, index) => String(index + 1).padStart(2, "0"));

export const COPPER_SIZE_OPTIONS = Array.from(
  new Set(
    iccRealWarehouseSeed
      .map((box) => box.copperSize ?? box.partNumber ?? box.sku)
      .filter((value): value is string => Boolean(value) && value !== "Needs Review"),
  ),
).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

export function levelsForRow(row: string): string[] {
  const maxLevel = ["A", "B", "C", "D"].includes(row.toUpperCase()) ? 3 : 4;
  return Array.from({ length: maxLevel }, (_, index) => String(index + 1));
}

export function ftzYesNoToStatus(value: string): FtzStatus {
  return value === "Yes" ? "foreignPrivileged" : "domestic";
}

export function ftzStatusToYesNo(value: FtzStatus | undefined): "Yes" | "No" {
  return value && value !== "domestic" && value !== "needsReview" ? "Yes" : "No";
}
