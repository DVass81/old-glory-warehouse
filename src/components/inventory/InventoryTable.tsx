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
import { calculateInventoryValue, listInventory } from "@/lib/domain";
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
  reviewStatus?: string;
  reviewIssues?: string[];
  fifoRank?: number;
};

export function InventoryTable() {
  const { snapshot, reserve, hold, release } = useWarehouseData();
  const inventoryRows = listInventory({}, snapshot) as UiInventoryRow[];
  const [search, setSearch] = useState("");
  const [rowFilter, setRowFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ftzFilter, setFtzFilter] = useState("all");
  const [selected, setSelected] = useState<UiInventoryRow | null>(null);

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
                  Age <ArrowUpDown size={13} aria-hidden="true" />
                </span>
              </th>
              <th>Value</th>
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
                  <span className={`status-chip ${row.reviewStatus === "needsReview" ? "review" : statusTone[row.status]}`}>
                    {row.reviewStatus === "needsReview" ? "Needs Review" : labelize(row.status)}
                  </span>
                </td>
                <td>{ageInDays(row.receivedAt)} days</td>
                <td className="strong">{formatMoney(calculateInventoryValue(row))}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-button compact" type="button" title="Edit box" onClick={() => setSelected(row)}>
                      <Edit3 size={15} aria-hidden="true" />
                    </button>
                    <button className="action-button compact" type="button" onClick={() => reserve(row.id, { reason: "Reserved from inventory table" })}>
                      Reserve
                    </button>
                    <button className="action-button compact" type="button" onClick={() => hold(row.id, { reason: "Quality hold from inventory table" })}>
                      Hold
                    </button>
                    <button className="action-button compact" type="button" onClick={() => release(row.id, { reason: "Released from inventory table" })}>
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

      {selected ? (
        <div className="detail-drawer" role="dialog" aria-label="Inventory edit panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Edit Box</p>
              <h3>{selected.boxNumber}</h3>
            </div>
            <button className="icon-button compact" type="button" onClick={() => setSelected(null)}>
              x
            </button>
          </div>
          <div className="detail-grid">
            <span>Part</span>
            <strong>{display(selected.partNumber ?? selected.sku)}</strong>
            <span>Location</span>
            <strong>{getWarehouseLocation(selected)}</strong>
            <span>FIFO Rank</span>
            <strong>{selected.fifoRank ?? "Needs Review"}</strong>
            <span>Tariff Exposure</span>
            <strong>{formatMoney(calculateInventoryValue(selected) * selected.tariffRate)}</strong>
          </div>
          <div className="filter-row">
            <a className="action-button" href="/import">
              <Edit3 size={16} aria-hidden="true" />
              Edit details
            </a>
            <a className="action-button" href="/import">
              <Move3D size={16} aria-hidden="true" />
              Move location
            </a>
            <a className="action-button primary" href="/import">
              Change status
            </a>
          </div>
        </div>
      ) : null}
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

function ageInDays(receivedAt: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.floor((new Date("2026-06-12T12:00:00.000Z").getTime() - new Date(receivedAt).getTime()) / msPerDay),
  );
}
