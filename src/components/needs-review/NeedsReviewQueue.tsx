"use client";

import { CheckCircle2, ClipboardCheck, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";
import {
  ftzYesNoToStatus,
  getNeedsReviewRows,
  ORIGIN_OPTIONS,
  SUPPLIER_OPTIONS,
} from "@/lib/domain";

export function NeedsReviewQueue() {
  const { snapshot, update } = useWarehouseData();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const rows = useMemo(() => getNeedsReviewRows(snapshot), [snapshot]);
  const filteredRows = rows.filter(({ box, issues }) =>
    `${box.boxNumber} ${box.poNumber ?? ""} ${box.supplier ?? ""} ${box.partNumber ?? ""} ${box.copperSize ?? ""} ${box.warehouseLocation ?? ""} ${issues.join(" ")}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <div className="operation-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Needs Review</p>
          <h2>Data cleanup work queue</h2>
        </div>
        <span className="status-chip review">{rows.length} records</span>
      </div>

      <article className="panel operations-panel">
        <div className="filter-row">
          <label className="table-search">
            <Search size={14} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search box, PO, supplier, location, issue" />
          </label>
          {message ? <span className="status-chip good">{message}</span> : null}
        </div>

        <div className="review-grid">
          {filteredRows.map(({ box, issues, locationConflict }) => (
            <article className="review-card" key={box.id}>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">{box.warehouseLocation ?? "Needs Review"}</p>
                  <h3>{box.boxNumber}</h3>
                </div>
                <span className={`status-chip ${locationConflict ? "danger" : "review"}`}>{issues.length} issue(s)</span>
              </div>
              <p className="muted">{issues.slice(0, 4).join(" | ")}</p>
              <QuickReviewForm
                box={box}
                onSave={(changes) => {
                  update({
                    boxId: box.id,
                    actor: "Warehouse User",
                    reason: `Resolved Needs Review fields for ${box.boxNumber}`,
                    changes,
                  });
                  setMessage(`${box.boxNumber} updated.`);
                }}
              />
            </article>
          ))}
          {filteredRows.length === 0 ? (
            <div className="empty-review-state">
              <CheckCircle2 size={24} aria-hidden="true" />
              <strong>No review records match the current search.</strong>
              <span className="muted">Nice. The queue is either clean or narrowed too far.</span>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}

type ReviewBox = ReturnType<typeof getNeedsReviewRows>[number]["box"];

function QuickReviewForm({ box, onSave }: { box: ReviewBox; onSave: (changes: Partial<ReviewBox>) => void }) {
  const [supplier, setSupplier] = useState(box.supplier === "Needs Review" ? SUPPLIER_OPTIONS[0] : box.supplier ?? SUPPLIER_OPTIONS[0]);
  const [origin, setOrigin] = useState(box.countryOfOrigin === "Needs Review" ? ORIGIN_OPTIONS[0] : box.countryOfOrigin ?? ORIGIN_OPTIONS[0]);
  const [poNumber, setPoNumber] = useState(box.poNumber === "Needs Review" ? "" : box.poNumber ?? "");
  const [ftz, setFtz] = useState(box.ftzStatus !== "domestic" && box.ftzStatus !== "needsReview" ? "Yes" : "No");
  const [receivedAt, setReceivedAt] = useState(toDate(box.receivedAt));
  const [price, setPrice] = useState(String(box.unitValueUsd || ""));
  const [htsCode, setHtsCode] = useState(box.htsCode === "Needs Review" ? "" : box.htsCode ?? "");

  return (
    <div className="review-form">
      <label className="field">
        <span>Supplier</span>
        <select value={supplier} onChange={(event) => setSupplier(event.target.value)}>
          {SUPPLIER_OPTIONS.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Origin</span>
        <select value={origin} onChange={(event) => setOrigin(event.target.value)}>
          {ORIGIN_OPTIONS.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <label className="field">
        <span>FTZ</span>
        <select value={ftz} onChange={(event) => setFtz(event.target.value)}>
          <option>Yes</option>
          <option>No</option>
        </select>
      </label>
      <label className="field">
        <span>PO</span>
        <input value={poNumber} onChange={(event) => setPoNumber(event.target.value)} />
      </label>
      <label className="field">
        <span>Received</span>
        <input type="date" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} />
      </label>
      <label className="field">
        <span>Price / lb</span>
        <input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} />
      </label>
      <label className="field">
        <span>HTS</span>
        <input value={htsCode} onChange={(event) => setHtsCode(event.target.value)} />
      </label>
      <button
        className="action-button primary"
        type="button"
        onClick={() =>
          onSave({
            supplier,
            countryOfOrigin: origin,
            ftzStatus: ftzYesNoToStatus(ftz),
            ftzLotId: ftz === "Yes" ? box.ftzLotId || "FTZ-Needs Review" : "No",
            poNumber: poNumber || "Needs Review",
            receivedAt: new Date(`${receivedAt}T00:00:00.000Z`).toISOString(),
            dateReceived: receivedAt,
            unitValueUsd: Number(price) || 0,
            costUsd: (Number(price) || 0) * box.weightLbs,
            htsCode: htsCode || "Needs Review",
            reviewStatus: "valid",
            reviewIssues: [],
          })
        }
      >
        <ClipboardCheck size={16} aria-hidden="true" />
        Save review
      </button>
    </div>
  );
}

function toDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}
