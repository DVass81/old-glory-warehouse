"use client";

import { PackagePlus, RotateCcw, Save } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";
import {
  COPPER_SIZE_OPTIONS,
  ftzYesNoToStatus,
  levelsForRow,
  ORIGIN_OPTIONS,
  STATUS_OPTIONS,
  SUPPLIER_OPTIONS,
  WAREHOUSE_POSITIONS,
  WAREHOUSE_ROWS,
} from "@/lib/domain";

const initialForm = {
  partNumber: "",
  copperSize: COPPER_SIZE_OPTIONS[0] ?? "",
  supplier: SUPPLIER_OPTIONS[0],
  poNumber: "",
  boxNumber: "",
  row: "A",
  position: "01",
  level: "1",
  weightLbs: "",
  countryOfOrigin: ORIGIN_OPTIONS[0],
  ftz: "No",
  htsCode: "",
  costUsd: "",
  receivedAt: new Date().toISOString().slice(0, 10),
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
  const availableLevels = levelsForRow(form.row);
  const canSubmit = Number(form.weightLbs) > 0 && form.boxNumber.trim() && form.poNumber.trim() && !duplicateLocation;

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "row" && !levelsForRow(value).includes(current.level) ? { level: "1" } : {}),
    }));
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
        supplier: form.supplier,
        poNumber: form.poNumber.trim(),
        boxNumber: form.boxNumber.trim(),
        row: form.row.trim().toUpperCase(),
        position: form.position.trim(),
        level: Number(form.level) || 1,
        weightLbs: Number(form.weightLbs),
        countryOfOrigin: form.countryOfOrigin,
        ftzStatus: ftzYesNoToStatus(form.ftz),
        ftzLotId: form.ftz === "Yes" ? `FTZ-${form.poNumber.trim() || "Needs Review"}` : "No",
        htsCode: form.htsCode.trim() || "Needs Review",
        unitValueUsd: Number(form.costUsd) || 0,
        costUsd: (Number(form.costUsd) || 0) * Number(form.weightLbs),
        receivedAt: new Date(`${form.receivedAt}T00:00:00.000Z`).toISOString(),
        dateReceived: form.receivedAt,
        status: form.status as "available" | "reserved" | "held" | "needsReview",
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
          <SelectField label="Copper Size" value={form.copperSize} options={COPPER_SIZE_OPTIONS} onChange={(value) => updateField("copperSize", value)} />
          <SelectField label="Supplier" value={form.supplier} options={SUPPLIER_OPTIONS} onChange={(value) => updateField("supplier", value)} />
          <TextField label="Weight lb" type="number" value={form.weightLbs} onChange={(value) => updateField("weightLbs", value)} />
          <SelectField label="Origin" value={form.countryOfOrigin} options={ORIGIN_OPTIONS} onChange={(value) => updateField("countryOfOrigin", value)} />
          <SelectField label="FTZ" value={form.ftz} options={["Yes", "No"]} onChange={(value) => updateField("ftz", value)} />
          <TextField label="HTS Code" value={form.htsCode} onChange={(value) => updateField("htsCode", value)} />
          <TextField label="Price / lb" type="number" value={form.costUsd} onChange={(value) => updateField("costUsd", value)} />
          <TextField label="Received" type="date" value={form.receivedAt} onChange={(value) => updateField("receivedAt", value)} />
          <SelectField label="Row" value={form.row} options={WAREHOUSE_ROWS} onChange={(value) => updateField("row", value)} />
          <SelectField label="Position" value={form.position} options={WAREHOUSE_POSITIONS} onChange={(value) => updateField("position", value)} />
          <SelectField label="Level" value={form.level} options={availableLevels} onChange={(value) => updateField("level", value)} />
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
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
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
