"use client";

import { CheckCircle2, MinusCircle, Search, Truck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";
import { recommendFifoPick } from "@/lib/domain";

export function PullCopperPanel() {
  const { snapshot, pull } = useWarehouseData();
  const availableBoxes = useMemo(
    () =>
      snapshot.inventory
        .filter((box) => box.status === "available" && box.weightLbs > 0)
        .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()),
    [snapshot.inventory],
  );
  const copperSizes = useMemo(
    () => Array.from(new Set(availableBoxes.map((box) => box.sku).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [availableBoxes],
  );
  const [sku, setSku] = useState(copperSizes[0] ?? "");
  const [requestedWeight, setRequestedWeight] = useState("1000");
  const [jobNumber, setJobNumber] = useState("");
  const [tariffTracked, setTariffTracked] = useState("Yes");
  const [reason, setReason] = useState("Production pull");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Choose a copper size, job/order, and requested weight.");

  const activeSku = copperSizes.includes(sku) ? sku : copperSizes[0] ?? "";
  const requestWeight = Number(requestedWeight) || 0;
  const recommendation = activeSku && requestWeight > 0
    ? recommendFifoPick({ sku: activeSku, requestedWeightLbs: requestWeight, createdAt: new Date().toISOString() }, snapshot)
    : null;
  const selectedBoxes = recommendation
    ? recommendation.selectedBoxIds
        .map((id) => availableBoxes.find((box) => box.id === id))
        .filter((box): box is (typeof availableBoxes)[number] => Boolean(box))
    : [];
  const filteredBoxes = selectedBoxes.filter((box) =>
    `${box.boxNumber} ${box.poNumber ?? ""} ${box.supplier ?? ""} ${box.partNumber ?? ""} ${box.copperSize ?? ""} ${box.warehouseLocation ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const canPull = selectedBoxes.length > 0 && requestWeight > 0 && Boolean(jobNumber.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPull || !recommendation) {
      setMessage("Enter a job/order number, copper size, and positive requested weight before pulling.");
      return;
    }

    let remaining = requestWeight;
    for (const box of selectedBoxes) {
      if (remaining <= 0) break;
      const pullWeight = Math.min(box.weightLbs, remaining);
      pull({
        boxId: box.id,
        pulledWeightLbs: pullWeight,
        actor: "Warehouse User",
        jobNumber: jobNumber.trim(),
        tariffTracked: tariffTracked === "Yes",
        reason: `${reason || "FIFO pull"} for ${jobNumber.trim()}: ${formatWeight(pullWeight)} lb`,
      });
      remaining -= pullWeight;
    }

    setMessage(`${formatWeight(requestWeight - Math.max(0, remaining))} lb pulled for ${jobNumber.trim()} using FIFO.`);
    setRequestedWeight("");
  }

  return (
    <div className="operation-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Guided Pull</p>
          <h2>FIFO allocation by job/order</h2>
        </div>
        <span className="status-chip info">{availableBoxes.length} available boxes</span>
      </div>

      <div className="pull-layout">
        <form className="panel operation-form" onSubmit={handleSubmit}>
          <div className="panel-head">
            <div className="panel-title-row">
              <Truck size={19} aria-hidden="true" />
              <h3>Pull request</h3>
            </div>
            <span className="muted">{message}</span>
          </div>

          <div className="operation-grid two-column">
            <label className="field">
              <span>Copper size</span>
              <select value={activeSku} onChange={(event) => setSku(event.target.value)}>
                {copperSizes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Requested weight lb</span>
              <input type="number" min="1" value={requestedWeight} onChange={(event) => setRequestedWeight(event.target.value)} />
            </label>
            <label className="field">
              <span>Job / Order</span>
              <input value={jobNumber} onChange={(event) => setJobNumber(event.target.value)} placeholder="Required job/order" />
            </label>
            <label className="field">
              <span>Track tariff</span>
              <select value={tariffTracked} onChange={(event) => setTariffTracked(event.target.value)}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </label>
            <label className="field wide-field">
              <span>Reason</span>
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
          </div>

          <div className="operation-footer">
            <div className="detail-grid compact-detail">
              <span>FIFO selected</span>
              <strong>{selectedBoxes.length} box(es)</strong>
              <span>Selected weight</span>
              <strong>{formatWeight(recommendation?.totalWeightLbs ?? 0)} lb</strong>
              <span>Shortage</span>
              <strong>{formatWeight(recommendation?.shortageWeightLbs ?? 0)} lb</strong>
            </div>
            <button className="action-button primary" type="submit" disabled={!canPull}>
              <MinusCircle size={16} aria-hidden="true" />
              Confirm FIFO pull
            </button>
          </div>
        </form>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Recommended Boxes</p>
              <h3>{activeSku || "No available copper"}</h3>
            </div>
            <CheckCircle2 size={20} aria-hidden="true" />
          </div>
          <label className="table-search full-width">
            <Search size={14} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter recommended boxes" />
          </label>
          <div className="fifo-list guided-pull-list">
            {filteredBoxes.map((box, index) => (
              <div className="fifo-item" key={box.id}>
                <span className="step-badge">{index + 1}</span>
                <div>
                  <strong>{box.boxNumber}</strong>
                  <p className="muted">{box.poNumber ?? "Needs Review"} | {box.warehouseLocation ?? "Needs Review"} | FIFO {box.fifoRank ?? "Pending"}</p>
                </div>
                <span className="status-chip good">{formatWeight(box.weightLbs)} lb</span>
              </div>
            ))}
            {filteredBoxes.length === 0 ? <p className="muted">No FIFO boxes match the current pull request.</p> : null}
          </div>
        </article>
      </div>
    </div>
  );
}

function formatWeight(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
