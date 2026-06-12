"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Move3D,
  PackagePlus,
  RotateCcw,
  Save,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";
import type { InventoryBox, InventoryStatus } from "@/data/mock/warehouse-data";
import { enrichIccWarehouseRecords, parsePoSupplierEnrichmentRows } from "@/lib/import/old-glory-label-import";
import {
  ICC_IMPORT_HEADERS,
  ICC_LOCATION_LAYOUT_HEADERS,
  validateIccWarehouseRows,
  type IccHeaderValidationResult,
  validateIccImportHeaders,
} from "@/lib/import/icc-warehouse-import";
import type { IccImportResult, IccPoSupplierEnrichmentSpreadsheetRow, IccWarehouseSpreadsheetRow } from "@/types/domain";

const requiredHeaders = ICC_IMPORT_HEADERS;
const locationLayoutHeaders = ICC_LOCATION_LAYOUT_HEADERS;

const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const statuses = ["Available", "Reserved", "Quality Hold", "Needs Review"];

type DraftMode = "receive" | "edit" | "move" | "status";

export function RealIccDataImport() {
  const { snapshot, replaceInventory, resetToSeed, receive } = useWarehouseData();
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState<IccImportResult | null>(null);
  const [headerResult, setHeaderResult] = useState<IccHeaderValidationResult | null>(null);
  const [importError, setImportError] = useState("");
  const [enrichmentMessage, setEnrichmentMessage] = useState("");
  const [mode, setMode] = useState<DraftMode>("receive");
  const [partNumber, setPartNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [boxNumber, setBoxNumber] = useState("");
  const [row, setRow] = useState("A");
  const [position, setPosition] = useState("01");
  const [level, setLevel] = useState("1");
  const [status, setStatus] = useState("Available");
  const [weight, setWeight] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const openReceive = () => setMode("receive");
    window.addEventListener("old-glory-open-receive", openReceive);
    return () => window.removeEventListener("old-glory-open-receive", openReceive);
  }, []);

  const maxLevel = row <= "D" ? 3 : 4;
  const levelIssue = Number(level) > maxLevel;
  const location = `${row}-${position.padStart(2, "0")}-L${level}`;
  const storageClass = row <= "D" ? "12-foot copper box" : "6-foot copper box";

  const importSummary = useMemo(
    () => [
      { label: "Spreadsheet source", value: fileName || "No file selected", tone: fileName ? "good" : "warn" },
      {
        label: "Active records",
        value: `${snapshot.inventory.length} boxes`,
        tone: snapshot.inventory.length ? "good" : "warn",
      },
      {
        label: "Import validation",
        value: importResult ? `${importResult.issues.length} issues` : "Waiting for upload",
        tone: importResult?.issues.length ? "warn" : "info",
      },
      {
        label: "Needs Review",
        value: importResult ? `${importResult.needsReviewRecords.length} rows` : "Missing values stay blank",
        tone: importResult?.needsReviewRecords.length ? "warn" : "good",
      },
    ],
    [fileName, importResult, snapshot.inventory.length],
  );

  const canReceive = partNumber.trim() && row && position.trim() && Number(level) > 0 && Number(weight) > 0;

  return (
    <div className="import-layout">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Real ICC Data Import</p>
          <h2>Spreadsheet-backed warehouse source</h2>
        </div>
        <span className="status-chip warn">
          <AlertTriangle size={14} aria-hidden="true" />
          Mock data separated after import
        </span>
      </div>

      <div className="import-grid">
        <section className="panel import-dropzone" aria-label="Upload ICC warehouse spreadsheet">
          <div className="dropzone-icon">
            <UploadCloud size={28} aria-hidden="true" />
          </div>
          <div>
            <h3>Upload warehouse spreadsheet</h3>
            <p className="table-meta">
              Upload the real Copper Layout sheet or the full ICC template. Missing fields stay Needs Review.
            </p>
          </div>
          <label className="action-button primary file-picker">
            <FileSpreadsheet size={17} aria-hidden="true" />
            Select file
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                void handleFileSelection(event.currentTarget.files?.[0] ?? null);
              }}
            />
          </label>
          {importError ? <span className="status-chip danger">{importError}</span> : null}
          {headerResult?.missingHeaders.length ? (
            <span className="status-chip warn">
              Missing headers: {headerResult.missingHeaders.join(", ")}
            </span>
          ) : null}
          {headerResult?.profile === "locationLayout" ? (
            <span className="status-chip good">Recognized Copper Layout format</span>
          ) : null}
          {headerResult?.profile === "fullTemplate" ? (
            <span className="status-chip good">Recognized full ICC template</span>
          ) : null}
          {importResult ? (
            <button
              className="action-button primary"
              type="button"
              onClick={() =>
                replaceInventory(
                  importResult.records as unknown as InventoryBox[],
                  `Imported ${importResult.records.length} ICC warehouse spreadsheet records from ${fileName}`,
                )
              }
            >
              <Save size={16} aria-hidden="true" />
              Overwrite active dataset
            </button>
          ) : null}
          <div className="validation-list">
            {importSummary.map((item) => (
              <div className="validation-row" key={item.label}>
                <span>{item.label}</span>
                <span className={`status-chip ${item.tone}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel import-dropzone" aria-label="Upload PO or sticker enrichment spreadsheet">
          <div className="dropzone-icon">
            <PackagePlus size={28} aria-hidden="true" />
          </div>
          <div>
            <h3>Upload PO / sticker enrichment</h3>
            <p className="table-meta">
              Add supplier, PO, FTZ, HTS, and origin later without changing the real warehouse locations.
            </p>
          </div>
          <label className="action-button file-picker">
            <FileSpreadsheet size={17} aria-hidden="true" />
            Select PO file
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                void handleEnrichmentSelection(event.currentTarget.files?.[0] ?? null);
              }}
            />
          </label>
          {enrichmentMessage ? <span className="status-chip info">{enrichmentMessage}</span> : null}
          <p className="table-meta">
            Best match keys are Box ID, Box Number, or Warehouse Location. Unmatched rows stay separate for review.
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Accepted Imports</p>
              <h3>Warehouse data formats</h3>
            </div>
            <span className="status-chip info">2 formats</span>
          </div>
          <p className="table-meta">Real Copper Layout headers</p>
          <div className="header-chip-grid">
            {locationLayoutHeaders.map((header) => (
              <span className="filter-pill" key={header}>
                <CheckCircle2 size={13} aria-hidden="true" />
                {header}
              </span>
            ))}
          </div>
          <p className="table-meta">Full ICC template headers</p>
          <div className="header-chip-grid compact-detail">
            {requiredHeaders.map((header) => (
              <span className="filter-pill" key={header}>
                {header}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel operations-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Editable Warehouse Operations</p>
            <h3>Receive, edit, move, and change status</h3>
          </div>
          <div className="filter-row">
            {(["receive", "edit", "move", "status"] as const).map((item) => (
              <button
                className={`filter-pill ${mode === item ? "selected" : ""}`}
                key={item}
                type="button"
                onClick={() => setMode(item)}
              >
                {labelize(item)}
              </button>
            ))}
          </div>
        </div>

        <div className="operation-grid">
          <label className="field">
            <span>Part / Copper Size</span>
            <input value={partNumber} onChange={(event) => setPartNumber(event.target.value)} placeholder="Part Number / Copper Size" />
          </label>
          <label className="field">
            <span>Supplier</span>
            <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Needs Review if blank" />
          </label>
          <label className="field">
            <span>PO Number</span>
            <input value={poNumber} onChange={(event) => setPoNumber(event.target.value)} placeholder="PO Number" />
          </label>
          <label className="field">
            <span>Box Number</span>
            <input value={boxNumber} onChange={(event) => setBoxNumber(event.target.value)} placeholder="Box Number" />
          </label>
          <label className="field">
            <span>Row</span>
            <select value={row} onChange={(event) => setRow(event.target.value)}>
              {rows.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Position</span>
            <input value={position} onChange={(event) => setPosition(event.target.value)} />
          </label>
          <label className="field">
            <span>Level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              {["1", "2", "3", "4"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Weight</span>
            <input value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Weight in pounds" inputMode="decimal" />
          </label>
          <label className="field">
            <span>Reason / Comment</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for moves and status changes" />
          </label>
        </div>

        <div className="operation-footer">
          <div className="location-preview">
            <Move3D size={18} aria-hidden="true" />
            <div>
              <span className="strong">{location}</span>
              <span className="table-meta">
                {storageClass}; max level {maxLevel}
              </span>
            </div>
          </div>
          {levelIssue ? (
            <span className="status-chip warn">Needs Review: level exceeds row limit</span>
          ) : (
            <span className="status-chip good">Location rule passes</span>
          )}
          <div className="filter-row">
            <button className="action-button" type="button" onClick={resetToSeed}>
              <RotateCcw size={16} aria-hidden="true" />
              Reset to seed
            </button>
            <button className="action-button primary" type="button" disabled={!canReceive} onClick={handleReceive}>
              {mode === "receive" ? <PackagePlus size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
              {mode === "receive" ? "Receive box" : "Save change"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  async function handleFileSelection(file: File | null): Promise<void> {
    setImportError("");
    setImportResult(null);
    setHeaderResult(null);
    setFileName(file?.name ?? "");
    if (!file) {
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<IccWarehouseSpreadsheetRow>(sheet, { defval: "" });
      const headerRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
      const headers = (headerRows[0] ?? []).map(String);
      const nextHeaderResult = validateIccImportHeaders(headers);
      const nextImportResult = validateIccWarehouseRows(rows, file.name);
      setHeaderResult(nextHeaderResult);
      setImportResult(nextImportResult);
      if (!nextHeaderResult.isValid) {
        setImportError("Upload parsed, but this file is not the Copper Layout or full ICC template format.");
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to parse spreadsheet.");
    }
  }

  async function handleEnrichmentSelection(file: File | null): Promise<void> {
    setEnrichmentMessage("");
    if (!file) {
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<IccPoSupplierEnrichmentSpreadsheetRow>(sheet, { defval: "" });
      const enrichmentResult = parsePoSupplierEnrichmentRows(rows, file.name);
      const sourceRecords = (importResult?.records ?? snapshot.inventory) as unknown as Parameters<typeof enrichIccWarehouseRecords>[0];
      const enriched = enrichIccWarehouseRecords(sourceRecords, enrichmentResult.records);
      replaceInventory(
        enriched as unknown as InventoryBox[],
        `Merged ${enrichmentResult.records.length} PO/sticker enrichment rows from ${file.name}`,
      );
      setImportResult((current) =>
        current
          ? {
              ...current,
              records: enriched,
              validRecords: enriched.filter((record) => record.reviewStatus === "valid"),
              needsReviewRecords: enriched.filter((record) => record.reviewStatus === "needsReview"),
            }
          : current,
      );
      setEnrichmentMessage(
        `Merged ${enrichmentResult.records.length} enrichment rows; ${enrichmentResult.issues.length} need review.`,
      );
    } catch (error) {
      setEnrichmentMessage(error instanceof Error ? error.message : "Unable to parse enrichment file.");
    }
  }

  function handleReceive(): void {
    receive({
      box: {
        partNumber: partNumber.trim(),
        copperSize: partNumber.trim(),
        supplier: supplier.trim() || "Needs Review",
        poNumber: poNumber.trim() || "Needs Review",
        boxNumber: boxNumber.trim() || "Needs Review",
        row,
        position,
        level: Number(level),
        weightLbs: Number(weight),
        status: normalizeStatus(status),
      },
      actor: "Warehouse User",
      reason: reason.trim() || "Received from Real ICC Data Import",
    });
    setPartNumber("");
    setSupplier("");
    setPoNumber("");
    setBoxNumber("");
    setWeight("");
    setReason("");
  }
}

function labelize(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function normalizeStatus(value: string): InventoryStatus {
  if (value === "Reserved") return "reserved";
  if (value === "Quality Hold") return "held";
  if (value === "Needs Review") return "needsReview";
  return "available";
}
