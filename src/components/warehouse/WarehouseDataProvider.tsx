"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultInventorySnapshot,
  deleteOrArchiveBox,
  holdBox,
  moveBox,
  pullBox,
  receiveBox,
  releaseBox,
  reserveBox,
  setBoxStatus,
  updateBox,
  type InventorySnapshot,
  type MoveBoxInput,
  type PullBoxInput,
  type ReceiveBoxInput,
  type UpdateBoxInput,
  type WarehouseOperationInput,
} from "@/lib/domain";
import type { InventoryBox, InventoryStatus } from "@/data/mock/warehouse-data";

const STORAGE_KEY = "old-glory-active-icc-dataset-v1";

type WarehouseDataContextValue = {
  snapshot: InventorySnapshot;
  replaceInventory: (inventory: InventoryBox[], reason?: string) => void;
  resetToSeed: () => void;
  receive: (input: ReceiveBoxInput) => void;
  update: (input: UpdateBoxInput) => void;
  move: (input: MoveBoxInput) => void;
  pull: (input: PullBoxInput) => void;
  deplete: (input: PullBoxInput) => void;
  reserve: (boxId: string, input?: WarehouseOperationInput) => void;
  hold: (boxId: string, input?: WarehouseOperationInput) => void;
  release: (boxId: string, input?: WarehouseOperationInput) => void;
  changeStatus: (boxId: string, status: InventoryStatus, input?: WarehouseOperationInput) => void;
  archive: (boxId: string, input?: WarehouseOperationInput) => void;
};

const WarehouseDataContext = createContext<WarehouseDataContextValue | null>(null);

export function WarehouseDataProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<InventorySnapshot>(() => loadStoredSnapshot());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }
  }, [snapshot]);

  const value = useMemo<WarehouseDataContextValue>(
    () => ({
      snapshot,
      replaceInventory: (inventory, reason = "Imported active ICC warehouse dataset") => {
        const occurredAt = new Date().toISOString();
        setSnapshot({
          ...defaultInventorySnapshot,
          inventory,
          movements: [
            ...defaultInventorySnapshot.movements,
            {
              id: `import-${occurredAt.replace(/[-:.TZ]/g, "")}`,
              boxId: "dataset-import",
              type: "adjust",
              occurredAt,
              actor: "Warehouse User",
              reason,
            },
          ],
        });
      },
      resetToSeed: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setSnapshot(defaultInventorySnapshot);
      },
      receive: (input) => setSnapshot((current) => receiveBox(current, input)),
      update: (input) => setSnapshot((current) => updateBox(current, input)),
      move: (input) => setSnapshot((current) => moveBox(current, input)),
      pull: (input) => setSnapshot((current) => pullBox(current, input)),
      deplete: (input) => setSnapshot((current) => pullBox(current, input)),
      reserve: (boxId, input) => setSnapshot((current) => reserveBox(current, boxId, input)),
      hold: (boxId, input) => setSnapshot((current) => holdBox(current, boxId, input)),
      release: (boxId, input) => setSnapshot((current) => releaseBox(current, boxId, input)),
      changeStatus: (boxId, status, input) =>
        setSnapshot((current) => setBoxStatus(current, boxId, status, input)),
      archive: (boxId, input) => setSnapshot((current) => deleteOrArchiveBox(current, boxId, input)),
    }),
    [snapshot],
  );

  return <WarehouseDataContext.Provider value={value}>{children}</WarehouseDataContext.Provider>;
}

function loadStoredSnapshot(): InventorySnapshot {
  if (typeof window === "undefined") {
    return defaultInventorySnapshot;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultInventorySnapshot;
  }
  try {
    return JSON.parse(stored) as InventorySnapshot;
  } catch {
    return defaultInventorySnapshot;
  }
}

export function useWarehouseData() {
  const value = useContext(WarehouseDataContext);
  if (!value) {
    throw new Error("useWarehouseData must be used inside WarehouseDataProvider");
  }
  return value;
}
