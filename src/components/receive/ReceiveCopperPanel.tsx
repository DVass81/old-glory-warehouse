"use client";

import { PackagePlus, RotateCcw, Save } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";

const initialForm = {
  partNumber: "",
  copperSize: "",
  supplier: "",
  poNumber: "",
  boxNumber: "",
  row: "A",
  position: "01",
  level: "1",
  weightLbs: "",
  countryOfOrigin: "",
  ftzLotId: "",
  htsCode: "",
  costUsd: "",
  status: "available",
};

export function ReceiveCopperPanel() {
  const { snapshot, receive } = useWarehouseData();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("Ready for inbound copper entry.");

  const previewLocation = useMemo(
    () => `${form.row.trim().toUpperCase()}-${form.position.trim().padStart(2, "0")}-L${form.level || "1"}`,
    [form.level, form.position, form.row],
  );
  const duplicateLocation = snapshot.inventory.find(
    (box) => box.warehouseLocation === previewLocation && box.status !== "archived",
  );
  const canSubmit = Number(form.weightLbs) > 0 && form.boxNumber.trim() && form.poNumber.trim();

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setMessage("Box number, PO, and positive weight are required before receiving.");
      return;
    }

    receive({
      actor: "Warehouse User",
      reason: `Received PO ${form.poNumber.trim()}`,
      box: {
        partNumber: form.partNumber.trim() || form.copperSize.trim() || "Needs Review",
        copperSize: form.copperSize.trim() || form.partNumber.trim() || "Needs Review",
        supplier: form.supplier.trim() || "Needs Review",
        poNumber: form.poNumber.trim(),
        boxNumber: form.boxNumber.trim(),
        row: form.row.trim().toUpperCase(),
        position: form.position.trim(),
        level: Number(form.level) || 1,
        weightLbs: Number(form.weightLbs),
        countryOfOrigin: form.countryOfOrigin.trim() || "Needs Review",
        ftzLotId: form.ftzLotId.trim() || "Needs Review",
        htsCode: form.htsCode.trim() || "Needs Review",
        costUsd: form.costUsd ? Number(form.costUsd) : null,
        status: form.status as "available" | "held" | "needsReview",
      },
    });
    setMessage(`${form.boxNumber.trim()} received into ${previewLocation}.`);
    setForm(initialForm);
  }

  return (
    <div className="operation-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Receive</p>
          <h2>Inbound copper receiving</h2>
        </div>
        <span className={`status-chip ${duplicateLocation ? "warn" : "good"}`}>
          {duplicateLocation ? "Location occupied" : "Location clear"}
        </span>
      </div>

      <form className="panel operation-form" onSubmit={handleSubmit}>
        <div className="panel-head">
          <div className="panel-title-row">
            <PackagePlus size={19} aria-hidden="true" />
            <h3>Lot details</h3>
          </div>
          <span className="muted">{message}</span>
        </div>

        <div className="operation-grid receive-grid">
          <TextField label="PO Number" value={form.poNumber} onChange={(value) => updateField("poNumber", value)} />
          <TextField label="Box Number" value={form.boxNumber} onChange={(value) => updateField("boxNumber", value)} />
          <TextField label="Part Number" value={form.partNumber} onChange={(value) => updateField("partNumber", value)} />
          <TextField label="Copper Size" value={form.copperSize} onChange={(value) => updateField("copperSize", value)} />
          <TextField label="Supplier" value={form.supplier} onChange={(value) => updateField("supplier", value)} />
          <TextField label="Weight lb" type="number" value={form.weightLbs} onChange={(value) => updateField("weightLbs", value)} />
          <TextField label="Origin" value={form.countryOfOrigin} onChange={(value) => updateField("countryOfOrigin", value)} />
          <TextField label="FTZ Lot" value={form.ftzLotId} onChange={(value) => updateField("ftzLotId", value)} />
          <TextField label="HTS Code" value={form.htsCode} onChange={(value) => updateField("htsCode", value)} />
          <TextField label="Cost USD" type="number" value={form.costUsd} onChange={(value) => updateField("costUsd", value)} />
          <TextField label="Row" value={form.row} onChange={(value) => updateField("row", value)} />
          <TextField label="Position" value={form.position} onChange={(value) => updateField("position", value)} />
          <TextField label="Level" type="number" value={form.level} onChange={(value) => updateField("level", value)} />
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
              <option value="available">Available</option>
              <option value="held">Quality hold</option>
              <option value="needsReview">Needs review</option>
            </select>
          </label>
        </div>

        <div className="operation-footer">
          <div className="location-preview">
            <span className="step-badge">{form.row.trim().toUpperCase() || "?"}</span>
            <div>
              <span className="muted">Receiving location</span>
              <strong>{previewLocation}</strong>
            </div>
          </div>
          <div className="button-row">
            <button className="action-button" type="button" onClick={() => setForm(initialForm)}>
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
            <button className="action-button primary" type="submit" disabled={!canSubmit}>
              <Save size={16} aria-hidden="true" />
              Receive copper
            </button>
          </div>
        </div>
      </form>
    </div>
  );
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
  type?: "text" | "number";
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
