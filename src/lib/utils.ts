import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { IsoDateTime } from "@/types/domain";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function asIsoDateTime(value: string): IsoDateTime {
  return value as IsoDateTime;
}

export function toIsoDateTime(value: Date): IsoDateTime {
  return value.toISOString() as IsoDateTime;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWeightLbs(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} lb`;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function percentFromRate(rate: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(rate * 100)}%`;
}
