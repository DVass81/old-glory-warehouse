"use client";

import {
  ArrowUpDown,
  Boxes,
  Edit3,
  Filter,
  Move3D,
  PackagePlus,
  ScanLine,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  COPPER_SIZE_OPTIONS,
  ftzStatusToYesNo,
  ftzYesNoToStatus,
  levelsForRow,
  listInventory,
  ORIGIN_OPTIONS,
  STATUS_OPTIONS,
  SUPPLIER_OPTIONS,
  WAREHOUSE_POSITIONS,
  WAREHOUSE_ROWS,
} from "@/lib/domain";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";

const statusTone: Record<string, string> = {
  available: "good",
  held: "warn",
  reserved: "info",
  picked: "danger",
  shipped: "danger",
  needsReview: "review",
  archived: "danger",
};

type UiInventoryRow = ReturnType<typeof listInventory>[number] & {
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
  unitValueUsd: number;
  ftzStatus: ReturnType<typeof listInventory>[number]["ftzStatus"];
  dateReceived?: string;
  reviewStatus?: string;
  reviewIssues?: string[];
  fifoRank?: number;
};

export function InventoryTable() {
  const { snapshot, reserve, hold, release, update } = useWarehouseData();
  const inventoryRows = listInventory({}, snapshot) as UiInventoryRow[];
  const [search, setSearch] = useState("");
  const [rowFilter, setRowFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ftzFilter, setFtzFilter] = useState("all");
  const [selected, setSelected] = useState<UiInventoryRow | null>(null);
  const [message, setMessage] = useState("");

  const rows = useMemo(
    () => Array.from(new Set(inventoryRows.map((row) => getWarehouseRow(row)).filter(Boolean))).sort(),
    [inventoryRows],
  );
  const filteredRows = inventoryRows.filter((row) => {
    const query = search.trim().toLowerCase();
    const searchable = [
      row.poNumber,
      row.supplier,
      row.partNumber,
      row.copperSize,
      row.sku,
      row.boxNumber,
      getWarehouseLocation(row),
      row.ftzLotId,
      row.countryOfOrigin,
      row.grade,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) {
      return false;
    }
    if (rowFilter !== "all" && getWarehouseRow(row) !== rowFilter) {
      return false;
    }
    if (statusFilter !== "all" && row.status !== statusFilter) {
      return false;
    }
    if (ftzFilter !== "all" && row.ftzStatus !== ftzFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Active copper lots</h2>
        </div>
        <div className="filter-row">
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
            <select value={rowFilter} onChange={(event) => setRowFilter(event.target.value)} aria-label="Row filter">
              <option value="all">All rows</option>
              {rows.map((row) => (
                <option key={row} value={row}>
                  Row {row}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-pill">
            <Boxes size={14} aria-hidden="true" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Status filter"
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="held">Quality Hold</option>
              <option value="picked">Picked</option>
              <option value="shipped">Shipped</option>
            </select>
          </label>
          <label className="filter-pill">
            <ShieldAlert size={14} aria-hidden="true" />
            <select value={ftzFilter} onChange={(event) => setFtzFilter(event.target.value)} aria-label="FTZ filter">
              <option value="all">All FTZ</option>
              <option value="domestic">Domestic</option>
              <option value="foreignPrivileged">FTZ Inventory</option>
              <option value="nonPrivilegedForeign">Non-privileged foreign</option>
            </select>
          </label>
          <button className="action-button" type="button">
            <ScanLine size={16} aria-hidden="true" />
            Scan
          </button>
          <a className="action-button primary" href="/import">
            <PackagePlus size={16} aria-hidden="true" />
            Receive
          </a>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Box</th>
              <th>Part / Copper Size</th>
              <th>Supplier</th>
              <th>PO</th>
              <th>Origin</th>
              <th>Weight</th>
              <th>Location</th>
              <th>FTZ</th>
              <th>Status</th>
              <th>
                <span className="panel-title-row">
                  Received <ArrowUpDown size={13} aria-hidden="true" />
                </span>
              </th>
              <th>Price / lb</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="strong">{row.boxNumber}</td>
                <td>{display(row.partNumber ?? row.copperSize ?? row.sku)}</td>
                <td>{display(row.supplier)}</td>
                <td>{display(row.poNumber)}</td>
                <td>{row.countryOfOrigin}</td>
                <td>{formatNumber(row.weightLbs)} lb</td>
                <td>{getWarehouseLocation(row)}</td>
                <td>{labelize(row.ftzStatus)}</td>
                <td>
                  <span className={`status-chip ${statusTone[row.status]}`}>
                    {row.status === "held" ? "Quality Hold" : labelize(row.status)}
                  </span>
                  {row.reviewStatus === "needsReview" ? <span className="status-chip review">Needs Review</span> : null}
                </td>
                <td>{formatDate(row.receivedAt)}</td>
                <td className="strong">{formatMoney(row.unitValueUsd)}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-button compact" type="button" title="Edit box" onClick={() => setSelected(row)}>
                      <Edit3 size={15} aria-hidden="true" />
                    </button>
                    <button className="action-button compact" type="button" onClick={() => applyStatus("reserve", row)}>
                      Reserve
                    </button>
                    <button className="action-button compact" type="button" onClick={() => applyStatus("hold", row)}>
                      Hold
                    </button>
                    <button className="action-button compact" type="button" onClick={() => applyStatus("release", row)}>
                      Release
                    </button>
                    <a className="icon-button compact" href="/import" title="Move box">
                      <Move3D size={15} aria-hidden="true" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="empty-table-cell">
                  No inventory matches the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {message ? <div className="detail-drawer"><span className="status-chip good">{message}</span></div> : null}

      {selected ? (
        <InventoryEditDrawer
          selected={selected}
          onClose={() => setSelected(null)}
          onSave={(changes) => {
            update({
              boxId: selected.id,
              actor: "Warehouse User",
              reason: `Edited ${selected.boxNumber} from inventory table`,
              changes,
            });
            setMessage(`${selected.boxNumber} updated.`);
            setSelected(null);
          }}
        />
      ) : null}
    </div>
  );

  function applyStatus(action: "reserve" | "hold" | "release", row: UiInventoryRow): void {
    const input = { actor: "Warehouse User", reason: `${action} from inventory table` };
    if (action === "reserve") reserve(row.id, input);
    if (action === "hold") hold(row.id, input);
    if (action === "release") release(row.id, input);
    setMessage(`${row.boxNumber} ${action === "hold" ? "placed on hold" : action === "reserve" ? "reserved" : "released"}.`);
  }
}

function InventoryEditDrawer({
  selected,
  onClose,
  onSave,
}: {
  selected: UiInventoryRow;
  onClose: () => void;
  onSave: (changes: Partial<UiInventoryRow>) => void;
}) {
  const [draft, setDraft] = useState({
    copperSize: selected.copperSize ?? selected.partNumber ?? selected.sku,
    supplier: selected.supplier === "Needs Review" ? SUPPLIER_OPTIONS[0] : selected.supplier ?? SUPPLIER_OPTIONS[0],
    poNumber: selected.poNumber ?? "",
    boxNumber: selected.boxNumber,
    countryOfOrigin:
      selected.countryOfOrigin === "Needs Review" ? ORIGIN_OPTIONS[0] : selected.countryOfOrigin ?? ORIGIN_OPTIONS[0],
    ftz: ftzStatusToYesNo(selected.ftzStatus),
    receivedAt: isoDate(selected.receivedAt),
    unitValueUsd: String(selected.unitValueUsd || (selected.costUsd && selected.weightLbs ? selected.costUsd / selected.weightLbs : "")),
    weightLbs: String(selected.weightLbs),
    row: getWarehouseRow(selected) || "A",
    position: String(selected.position ?? "01").padStart(2, "0"),
    level: String(selected.level ?? "1"),
    status: selected.status,
  });
  const availableLevels = levelsForRow(draft.row);

  function setField(field: keyof typeof draft, value: string): void {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "row" && !levelsForRow(value).includes(current.level) ? { level: "1" } : {}),
    }));
  }

  return (
    <div className="detail-drawer" role="dialog" aria-label="Inventory edit panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Edit Box</p>
          <h3>{selected.boxNumber}</h3>
        </div>
        <button className="icon-button compact" type="button" onClick={onClose}>
          x
        </button>
      </div>
      <div className="operation-grid receive-grid">
        <SelectField label="Part / Copper Size" value={draft.copperSize} options={COPPER_SIZE_OPTIONS} onChange={(value) => setField("copperSize", value)} />
        <SelectField label="Supplier" value={draft.supplier} options={SUPPLIER_OPTIONS} onChange={(value) => setField("supplier", value)} />
        <TextField label="PO Number" value={draft.poNumber} onChange={(value) => setField("poNumber", value)} />
        <TextField label="Box Number" value={draft.boxNumber} onChange={(value) => setField("boxNumber", value)} />
        <SelectField label="Origin" value={draft.countryOfOrigin} options={ORIGIN_OPTIONS} onChange={(value) => setField("countryOfOrigin", value)} />
        <SelectField label="FTZ" value={draft.ftz} options={["Yes", "No"]} onChange={(value) => setField("ftz", value)} />
        <TextField label="Received" type="date" value={draft.receivedAt} onChange={(value) => setField("receivedAt", value)} />
        <TextField label="Price / lb" type="number" value={draft.unitValueUsd} onChange={(value) => setField("unitValueUsd", value)} />
        <TextField label="Weight lb" type="number" value={draft.weightLbs} onChange={(value) => setField("weightLbs", value)} />
        <SelectField label="Row" value={draft.row} options={WAREHOUSE_ROWS} onChange={(value) => setField("row", value)} />
        <SelectField label="Position" value={draft.position} options={WAREHOUSE_POSITIONS} onChange={(value) => setField("position", value)} />
        <SelectField label="Level" value={draft.level} options={availableLevels} onChange={(value) => setField("level", value)} />
        <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS.map((item) => item.value)} onChange={(value) => setField("status", value)} />
      </div>
      <div className="filter-row">
        <button className="action-button" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="action-button primary"
          type="button"
          onClick={() =>
            onSave({
              partNumber: draft.copperSize,
              copperSize: draft.copperSize,
              sku: draft.copperSize,
              supplier: draft.supplier,
              poNumber: draft.poNumber || "Needs Review",
              boxNumber: draft.boxNumber || "Needs Review",
              countryOfOrigin: draft.countryOfOrigin,
              ftzStatus: ftzYesNoToStatus(draft.ftz),
              ftzLotId: draft.ftz === "Yes" ? selected.ftzLotId || "FTZ-Needs Review" : "No",
              receivedAt: new Date(`${draft.receivedAt}T00:00:00.000Z`).toISOString(),
              dateReceived: draft.receivedAt,
              unitValueUsd: Number(draft.unitValueUsd) || 0,
              costUsd: (Number(draft.unitValueUsd) || 0) * (Number(draft.weightLbs) || 0),
              weightLbs: Number(draft.weightLbs) || 0,
              row: draft.row,
              position: draft.position,
              level: Number(draft.level),
              warehouseLocation: `${draft.row}-${draft.position}-L${draft.level}`,
              status: draft.status as UiInventoryRow["status"],
            })
          }
        >
          Save inventory changes
        </button>
      </div>
    </div>
  );
}

function labelize(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
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

function display(value: string | number | undefined): string {
  if (value === undefined || value === "") {
    return "Needs Review";
  }
  return String(value);
}

function getWarehouseRow(row: UiInventoryRow): string {
  return String(row.row ?? row.warehouseZone ?? "").slice(0, 1).toUpperCase();
}

function getWarehouseLocation(row: UiInventoryRow): string {
  if (row.warehouseLocation) {
    return row.warehouseLocation;
  }
  const locationRow = getWarehouseRow(row);
  const position = String(row.position ?? row.locationId?.split("-").at(-1) ?? "01").padStart(2, "0");
  const level = String(row.level ?? "1").replace(/^L/i, "");
  return locationRow ? `${locationRow}-${position}-L${level}` : "Needs Review";
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelize(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function isoDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Needs Review" : date.toISOString().slice(0, 10);
}
