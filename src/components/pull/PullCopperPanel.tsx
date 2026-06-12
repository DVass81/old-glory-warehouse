"use client";

import { CheckCircle2, MinusCircle, Search, Scale } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";

export function PullCopperPanel() {
  const { snapshot, pull } = useWarehouseData();
  const availableBoxes = useMemo(
    () =>
      snapshot.inventory
        .filter((box) => box.status === "available" && box.weightLbs > 0)
        .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()),
    [snapshot.inventory],
  );
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(availableBoxes[0]?.id ?? "");
  const [pullWeight, setPullWeight] = useState("");
  const [reason, setReason] = useState("Partial production pull");
  const [jobNumber, setJobNumber] = useState("");
  const [tariffTracked, setTariffTracked] = useState("Yes");
  const [message, setMessage] = useState("Select an available box and enter the pull weight.");

  const filteredBoxes = availableBoxes.filter((box) => {
    const haystack = `${box.boxNumber} ${box.poNumber ?? ""} ${box.supplier ?? ""} ${box.partNumber ?? ""} ${box.copperSize ?? ""} ${box.warehouseLocation ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const selectedBox = filteredBoxes.find((box) => box.id === selectedId) ?? filteredBoxes[0];
  const requestedWeight = Number(pullWeight);
  const remainingWeight = selectedBox ? Math.max(0, selectedBox.weightLbs - requestedWeight) : 0;
  const canPull = Boolean(selectedBox) && requestedWeight > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBox || !canPull) {
      setMessage("Choose a box and enter a positive pull weight.");
      return;
    }

    if (requestedWeight >= selectedBox.weightLbs) {
      pull({
        boxId: selectedBox.id,
        pulledWeightLbs: selectedBox.weightLbs,
        actor: "Warehouse User",
        jobNumber: jobNumber.trim() || "Needs Review",
        tariffTracked: tariffTracked === "Yes",
        reason: `${reason || "Full depletion pull"}: ${formatWeight(selectedBox.weightLbs)} lb depleted`,
      });
      setMessage(`${selectedBox.boxNumber} depleted and archived; ${selectedBox.warehouseLocation ?? "its location"} is freed.`);
    } else {
      pull({
        boxId: selectedBox.id,
        pulledWeightLbs: requestedWeight,
        actor: "Warehouse User",
        jobNumber: jobNumber.trim() || "Needs Review",
        tariffTracked: tariffTracked === "Yes",
        reason: `${reason || "Partial pull"}: ${formatWeight(requestedWeight)} lb removed`,
      });
      setMessage(`${formatWeight(requestedWeight)} lb pulled from ${selectedBox.boxNumber}; ${formatWeight(remainingWeight)} lb remains.`);
    }
    setPullWeight("");
  }

  return (
    <div className="operation-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pull</p>
          <h2>Deplete copper by partial weight</h2>
        </div>
        <span className="status-chip info">{availableBoxes.length} available boxes</span>
      </div>

      <div className="pull-layout">
        <form className="panel operation-form" onSubmit={handleSubmit}>
          <div className="panel-head">
            <div className="panel-title-row">
              <Scale size={19} aria-hidden="true" />
              <h3>Pull request</h3>
            </div>
            <span className="muted">{message}</span>
          </div>

          <label className="table-search full-width">
            <Search size={14} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PO, box, part, location" />
          </label>

          <div className="operation-grid two-column">
            <label className="field">
              <span>Available box</span>
              <select value={selectedBox?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
                {filteredBoxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.boxNumber} - {formatWeight(box.weightLbs)} lb
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Pull weight lb</span>
              <input type="number" min="0" value={pullWeight} onChange={(event) => setPullWeight(event.target.value)} />
            </label>
            <label className="field wide-field">
              <span>Reason</span>
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <label className="field">
              <span>Job / Order</span>
              <input value={jobNumber} onChange={(event) => setJobNumber(event.target.value)} placeholder="Job number" />
            </label>
            <label className="field">
              <span>Track tariff</span>
              <select value={tariffTracked} onChange={(event) => setTariffTracked(event.target.value)}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </label>
          </div>

          <div className="operation-footer">
            <div className="detail-grid compact-detail">
              <span>Current</span>
              <strong>{selectedBox ? `${formatWeight(selectedBox.weightLbs)} lb` : "No box"}</strong>
              <span>After pull</span>
              <strong>{canPull ? `${formatWeight(remainingWeight)} lb` : "Pending"}</strong>
            </div>
            <button className="action-button primary" type="submit" disabled={!canPull}>
              <MinusCircle size={16} aria-hidden="true" />
              Apply pull
            </button>
          </div>
        </form>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Selected Box</p>
              <h3>{selectedBox?.boxNumber ?? "No available box"}</h3>
            </div>
            <CheckCircle2 size={20} aria-hidden="true" />
          </div>
          {selectedBox ? (
            <div className="detail-grid">
              <span>PO</span>
              <strong>{selectedBox.poNumber ?? "Needs Review"}</strong>
              <span>Part</span>
              <strong>{selectedBox.partNumber ?? selectedBox.copperSize ?? selectedBox.sku}</strong>
              <span>Location</span>
              <strong>{selectedBox.warehouseLocation ?? selectedBox.locationId ?? "Needs Review"}</strong>
              <span>FIFO Rank</span>
              <strong>{selectedBox.fifoRank ?? "Pending"}</strong>
            </div>
          ) : (
            <p className="muted">No available inventory matches the current filters.</p>
          )}
        </article>
      </div>
    </div>
  );
}

function formatWeight(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
