"use client";

import { OrbitControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Filter, MousePointer2, PackagePlus, Search } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { calculateInventoryValue, listInventory, storageLocations } from "@/lib/domain";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";

type UiBox = ReturnType<typeof listInventory>[number] & {
  partNumber?: string;
  copperSize?: string;
  supplier?: string;
  poNumber?: string;
  row?: string;
  position?: string;
  level?: number | string;
  warehouseLocation?: string;
  ftzLotId?: string;
  htsCode?: string;
  costUsd?: number;
  reviewStatus?: string;
  fifoRank?: number;
};

type Slot = {
  id: string;
  row: string;
  position: string;
  level: number;
  x: number;
  y: number;
  z: number;
  lengthFt: 6 | 12;
  box?: UiBox;
};

const warehouseRows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const leftRows = new Set(["A", "B", "C", "D"]);

const statusColor: Record<string, string> = {
  available: "#58b47b",
  reserved: "#d7aa47",
  held: "#e06464",
  picked: "#7b8794",
  shipped: "#7b8794",
  ftz: "#4f8cc9",
  review: "#e3954c",
  empty: "#626b76",
};

function WarehouseModel({
  slots,
  selectedId,
  onSelect,
}: {
  slots: Slot[];
  selectedId: string | null;
  onSelect: (slot: Slot) => void;
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[14, 9.25]} />
        <meshStandardMaterial color="#151b22" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]} receiveShadow>
        <planeGeometry args={[2.1, 8.7]} />
        <meshStandardMaterial color="#252d37" />
      </mesh>

      {slots.map((slot) => {
        const color = getSlotColor(slot.box);
        const selected = selectedId === slot.id;
        return (
          <group key={slot.id} position={[slot.x, slot.y, slot.z]}>
            <mesh castShadow receiveShadow onClick={() => onSelect(slot)}>
              <boxGeometry args={[0.42, 0.24, slot.lengthFt === 12 ? 1.55 : 0.88]} />
              <meshStandardMaterial
                color={selected ? "#f0b06d" : color}
                roughness={0.54}
                metalness={slot.box ? 0.22 : 0.05}
                transparent={!slot.box}
                opacity={slot.box ? 1 : 0.42}
              />
            </mesh>
          </group>
        );
      })}

      {warehouseRows.map((row, index) => {
        const isLeft = leftRows.has(row);
        const z = isLeft ? index * 0.75 - 3.05 : (index - 4) * 0.56 - 1.6;
        const x = isLeft ? -5.9 : 2.0;
        return (
          <Text
            key={row}
            position={[x, 0.05, z]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.26}
            color="#f5f1ea"
            anchorX="center"
            anchorY="middle"
          >
            Row {row}
          </Text>
        );
      })}

      <Text position={[0, 0.08, -4.15]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#cbe4ff">
        Forklift aisle clearance
      </Text>
      <Text position={[-3.95, 0.08, 4.1]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#f5dfad">
        Left A-D: 12 ft boxes, max L3
      </Text>
      <Text position={[3.65, 0.08, 4.1]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#f5dfad">
        Right E-J: 6 ft boxes, max L4
      </Text>
    </group>
  );
}

export function WarehouseScene() {
  const { snapshot } = useWarehouseData();
  const inventory = listInventory({}, snapshot) as UiBox[];
  const [search, setSearch] = useState("");
  const [rowFilter, setRowFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const slots = useMemo(() => buildSlots(inventory), [inventory]);
  const filteredSlots = slots.filter((slot) => {
    const box = slot.box;
    if (rowFilter !== "all" && slot.row !== rowFilter) {
      return false;
    }
    if (statusFilter !== "all") {
      if (statusFilter === "empty" && box) {
        return false;
      }
      if (statusFilter !== "empty" && box?.status !== statusFilter && box?.reviewStatus !== statusFilter) {
        return false;
      }
    }
    if (!search.trim()) {
      return true;
    }
    const query = search.toLowerCase();
    const searchable = box
      ? [
          box.poNumber,
          box.supplier,
          box.partNumber,
          box.copperSize,
          box.sku,
          box.boxNumber,
          getWarehouseLocation(box),
          box.ftzLotId,
        ].join(" ")
      : `${slot.row}-${slot.position}-L${slot.level} empty`;
    return searchable.toLowerCase().includes(query);
  });

  const selectedSlot = slots.find((slot) => slot.id === selectedId) ?? slots.find((slot) => slot.box);

  return (
    <div className="warehouse-view-layout">
      <div className="warehouse-controls panel">
        <label className="table-search">
          <Search size={14} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search PO, supplier, part, box, location, FTZ lot"
          />
        </label>
        <label className="filter-pill">
          <Filter size={14} aria-hidden="true" />
          <select value={rowFilter} onChange={(event) => setRowFilter(event.target.value)} aria-label="3D row filter">
            <option value="all">All rows</option>
            {warehouseRows.map((row) => (
              <option key={row} value={row}>
                Row {row}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-pill">
          <MousePointer2 size={14} aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="3D status filter"
          >
            <option value="all">All states</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="held">Quality Hold</option>
            <option value="needsReview">Needs Review</option>
            <option value="empty">Empty Location</option>
          </select>
        </label>
        <a className="action-button primary" href="/import">
          <PackagePlus size={16} aria-hidden="true" />
          Receive / Move
        </a>
      </div>

      <div className="warehouse-overlay">
        <div className="warehouse-canvas">
          <Canvas shadows camera={{ position: [7.5, 7.4, 7.8], fov: 42 }}>
            <color attach="background" args={["#0b0f14"]} />
            <ambientLight intensity={0.58} />
            <directionalLight position={[4, 8, 5]} intensity={1.45} castShadow />
            <pointLight position={[-4, 3, -3]} intensity={0.8} color="#4f8cc9" />
            <Suspense fallback={null}>
              <WarehouseModel slots={filteredSlots} selectedId={selectedSlot?.id ?? selectedId} onSelect={(slot) => setSelectedId(slot.id)} />
              <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.08} minDistance={6} maxDistance={14} />
            </Suspense>
          </Canvas>
        </div>
        <div className="warehouse-legend">
          <span className="status-chip good">
            <span className="legend-dot dot-available" /> Available
          </span>
          <span className="status-chip info">
            <span className="legend-dot dot-ftz" /> FTZ Inventory
          </span>
          <span className="status-chip warn">
            <span className="legend-dot dot-held" /> Reserved
          </span>
          <span className="status-chip danger">
            <span className="legend-dot dot-exception" /> Quality Hold
          </span>
          <span className="status-chip review">
            <span className="legend-dot dot-review" /> Needs Review
          </span>
          <span className="status-chip">
            <span className="legend-dot dot-empty" /> Empty
          </span>
        </div>
      </div>

      <aside className="panel warehouse-detail-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Selected Location</p>
            <h3>{selectedSlot ? `${selectedSlot.row}-${selectedSlot.position}-L${selectedSlot.level}` : "Select a box"}</h3>
          </div>
          <span className={`status-chip ${selectedSlot?.box ? getChipTone(selectedSlot.box) : ""}`}>
            {selectedSlot?.box ? getStatusLabel(selectedSlot.box) : "Empty"}
          </span>
        </div>
        {selectedSlot?.box ? <BoxDetails box={selectedSlot.box} /> : <EmptyDetails slot={selectedSlot} />}
      </aside>
    </div>
  );
}

function BoxDetails({ box }: { box: UiBox }) {
  const tariffExposure = calculateInventoryValue(box) * box.tariffRate;
  const details = [
    ["Part / Copper Size", box.partNumber ?? box.copperSize ?? box.sku],
    ["Supplier", box.supplier],
    ["PO Number", box.poNumber],
    ["Box Number", box.boxNumber],
    ["Weight", `${formatNumber(box.weightLbs)} lb`],
    ["Row", getWarehouseRow(box)],
    ["Position", getPosition(box)],
    ["Level", `L${getLevel(box)}`],
    ["Full Warehouse Location", getWarehouseLocation(box)],
    ["FIFO Rank", box.fifoRank ?? "Needs Review"],
    ["FTZ Status", labelize(box.ftzStatus)],
    ["FTZ Lot ID", box.ftzLotId],
    ["HTS Code", box.htsCode],
    ["Country of Origin", box.countryOfOrigin],
    ["Tariff Exposure", formatMoney(tariffExposure)],
    ["Status", getStatusLabel(box)],
  ];

  return (
    <>
      <div className="detail-grid warehouse-detail-grid">
        {details.map(([label, value]) => (
          <div className="detail-row" key={label}>
            <span>{label}</span>
            <strong>{display(value)}</strong>
          </div>
        ))}
      </div>
      <div className="filter-row">
        <a className="action-button" href="/import">
          Edit box
        </a>
        <a className="action-button" href="/import">
          Move
        </a>
        <a className="action-button primary" href="/import">
          Change status
        </a>
      </div>
    </>
  );
}

function EmptyDetails({ slot }: { slot?: Slot }) {
  return (
    <div className="empty-location-panel">
      <p className="table-meta">This structural location is empty in the active dataset.</p>
      <div className="detail-grid">
        <span>Row</span>
        <strong>{slot?.row ?? "Needs Review"}</strong>
        <span>Position</span>
        <strong>{slot?.position ?? "Needs Review"}</strong>
        <span>Level</span>
        <strong>{slot ? `L${slot.level}` : "Needs Review"}</strong>
        <span>Storage class</span>
        <strong>{slot?.lengthFt === 12 ? "12-foot copper" : "6-foot copper"}</strong>
      </div>
      <a className="action-button primary" href="/import">
        Receive copper here
      </a>
    </div>
  );
}

function buildSlots(inventory: UiBox[]): Slot[] {
  const positions = Array.from({ length: 8 }, (_, index) => String(index + 1).padStart(2, "0"));
  const boxesByLocation = new Map(inventory.map((box) => [getWarehouseLocation(box), box]));

  return warehouseRows.flatMap((row, rowIndex) => {
    const isLeft = leftRows.has(row);
    const maxLevel = isLeft ? 3 : 4;
    return positions.flatMap((position, positionIndex) =>
      Array.from({ length: maxLevel }, (_, levelIndex) => {
        const level = levelIndex + 1;
        const location = `${row}-${position}-L${level}`;
        return {
          id: location,
          row,
          position,
          level,
          x: isLeft ? rowIndex * 0.78 - 5.0 : (rowIndex - 4) * 0.54 + 1.35,
          y: levelIndex * 0.28 + 0.13,
          z: positionIndex * 0.82 - 3.0,
          lengthFt: isLeft ? 12 : 6,
          box: boxesByLocation.get(location),
        };
      }),
    );
  });
}

function getSlotColor(box?: UiBox): string {
  if (!box) {
    return statusColor.empty;
  }
  if (box.reviewStatus === "needsReview") {
    return statusColor.review;
  }
  if (box.status === "available" && box.ftzStatus !== "domestic") {
    return statusColor.ftz;
  }
  return statusColor[box.status] ?? statusColor.review;
}

function getChipTone(box: UiBox): string {
  if (box.reviewStatus === "needsReview") {
    return "review";
  }
  if (box.status === "available" && box.ftzStatus !== "domestic") {
    return "info";
  }
  return box.status === "available" ? "good" : box.status === "reserved" ? "warn" : "danger";
}

function getStatusLabel(box: UiBox): string {
  if (box.reviewStatus === "needsReview") {
    return "Needs Review";
  }
  if (box.status === "available" && box.ftzStatus !== "domestic") {
    return "FTZ Inventory";
  }
  return box.status === "held" ? "Quality Hold" : labelize(box.status);
}

function getWarehouseLocation(box: UiBox): string {
  if (box.warehouseLocation) {
    return box.warehouseLocation;
  }
  const locationRow = getWarehouseRow(box);
  const position = getPosition(box);
  const level = getLevel(box);
  return locationRow ? `${locationRow}-${position}-L${level}` : "Needs Review";
}

function getWarehouseRow(box: UiBox): string {
  if (box.row) {
    return String(box.row).slice(0, 1).toUpperCase();
  }
  const location = storageLocations.find((item) => item.id === box.locationId);
  return String(location?.row ?? box.warehouseZone ?? "").slice(0, 1).toUpperCase();
}

function getPosition(box: UiBox): string {
  if (box.position) {
    return String(box.position).padStart(2, "0");
  }
  const location = storageLocations.find((item) => item.id === box.locationId);
  return String(location?.bay ?? "01").padStart(2, "0");
}

function getLevel(box: UiBox): string {
  return String(box.level ?? "1").replace(/^L/i, "");
}

function labelize(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function display(value: string | number | undefined): string {
  if (value === undefined || value === "") {
    return "Needs Review";
  }
  return String(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
