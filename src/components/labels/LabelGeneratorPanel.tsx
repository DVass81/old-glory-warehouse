"use client";

import { Download, Printer, QrCode, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";
import { createInventoryQrPayload, serializeQrPayload } from "@/lib/domain";

export function LabelGeneratorPanel() {
  const { snapshot } = useWarehouseData();
  const poNumbers = useMemo(
    () =>
      Array.from(new Set(snapshot.inventory.map((box) => box.poNumber).filter((po): po is string => Boolean(po))))
        .sort((a, b) => a.localeCompare(b)),
    [snapshot.inventory],
  );
  const [poNumber, setPoNumber] = useState("all");
  const [filter, setFilter] = useState("");
  const selectedPoNumber = poNumber === "all" || poNumbers.includes(poNumber) ? poNumber : "all";
  const boxesForPo = snapshot.inventory.filter(
    (box) =>
      (selectedPoNumber === "all" || box.poNumber === selectedPoNumber) &&
      `${box.boxNumber} ${box.partNumber ?? ""} ${box.copperSize ?? ""} ${box.supplier ?? ""} ${box.poNumber ?? ""} ${box.warehouseLocation ?? ""} ${box.ftzLotId ?? ""}`
        .toLowerCase()
        .includes(filter.trim().toLowerCase()),
  );

  return (
    <div className="operation-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Labels</p>
          <h2>Generate labels by PO</h2>
        </div>
        <button className="action-button" type="button" onClick={() => window.print()} disabled={boxesForPo.length === 0}>
          <Printer size={16} aria-hidden="true" />
          Print labels
        </button>
        <button className="action-button" type="button" onClick={() => downloadLabelsHtml(boxesForPo)} disabled={boxesForPo.length === 0}>
          <Download size={16} aria-hidden="true" />
          Export labels
        </button>
      </div>

      <article className="panel operation-form">
        <div className="filter-row">
          <label className="filter-pill">
            <QrCode size={14} aria-hidden="true" />
            <select value={selectedPoNumber} onChange={(event) => setPoNumber(event.target.value)} aria-label="PO number">
              <option value="all">All POs</option>
              {poNumbers.map((po) => (
                <option key={po} value={po}>
                  {po}
                </option>
              ))}
            </select>
          </label>
          <label className="table-search">
            <Search size={14} aria-hidden="true" />
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter labels" />
          </label>
          <span className="status-chip info">{boxesForPo.length} labels</span>
        </div>

        <div className="label-grid">
          {boxesForPo.map((box) => {
            const payload = serializeQrPayload(createInventoryQrPayload(box));
            return (
              <article className="label-card" key={box.id}>
                <div className="label-card-head">
                  <div>
                    <span className="muted">PO {box.poNumber}</span>
                    <strong>{box.boxNumber}</strong>
                  </div>
                  <div className="qr-preview" aria-label={`QR payload for ${box.boxNumber}`}>
                    <QrCode size={42} aria-hidden="true" />
                  </div>
                </div>
                <div className="detail-grid compact-detail">
                  <span>Part</span>
                  <strong>{box.partNumber ?? box.copperSize ?? box.sku}</strong>
                  <span>Weight</span>
                  <strong>{formatWeight(box.weightLbs)} lb</strong>
                  <span>Location</span>
                  <strong>{box.warehouseLocation ?? "Needs Review"}</strong>
                  <span>FTZ</span>
                  <strong>{box.ftzLotId ?? box.ftzStatus}</strong>
                  <span>Supplier</span>
                  <strong>{box.supplier ?? "Needs Review"}</strong>
                </div>
                <code className="label-payload">{payload}</code>
              </article>
            );
          })}
          {boxesForPo.length === 0 ? <p className="muted">No boxes found for the selected PO.</p> : null}
        </div>
      </article>
    </div>
  );
}

function formatWeight(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

type LabelBox = ReturnType<typeof useWarehouseData>["snapshot"]["inventory"][number];

function downloadLabelsHtml(boxes: LabelBox[]): void {
  const generatedAt = new Date().toISOString();
  const cards = boxes
    .map((box) => {
      const payload = serializeQrPayload(createInventoryQrPayload(box));
      return `<article class="label">
  <div class="top"><span>PO ${escapeHtml(box.poNumber ?? "Needs Review")}</span><strong>${escapeHtml(box.boxNumber)}</strong></div>
  <dl>
    <dt>Part</dt><dd>${escapeHtml(box.partNumber ?? box.copperSize ?? box.sku)}</dd>
    <dt>Supplier</dt><dd>${escapeHtml(box.supplier ?? "Needs Review")}</dd>
    <dt>Weight</dt><dd>${formatWeight(box.weightLbs)} lb</dd>
    <dt>Location</dt><dd>${escapeHtml(box.warehouseLocation ?? "Needs Review")}</dd>
    <dt>FTZ</dt><dd>${escapeHtml(box.ftzLotId ?? box.ftzStatus)}</dd>
  </dl>
  <code>${escapeHtml(payload)}</code>
</article>`;
    })
    .join("");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Old Glory Labels ${generatedAt}</title>
<style>
@page{size:letter;margin:.25in}body{font-family:Arial,sans-serif;margin:0;color:#111}.sheet{display:grid;grid-template-columns:repeat(2,4in);gap:.125in;padding:.125in}.label{width:4in;height:2in;border:1px dashed #999;padding:.12in;box-sizing:border-box;break-inside:avoid}.top{display:flex;justify-content:space-between;gap:.1in;font-size:12px}.top strong{font-size:18px}dl{display:grid;grid-template-columns:.8in 1fr;gap:2px 8px;margin:8px 0;font-size:11px}dt{color:#555}dd{margin:0;font-weight:700}code{display:block;font-size:8px;white-space:normal;overflow-wrap:anywhere}
</style></head><body><main class="sheet">${cards}</main></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `old-glory-labels-${generatedAt.slice(0, 10)}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}
