"use client";

import { Download, FilePlus2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";
import { createRealReportExport, listExportableReportDefinitions, serializeRowsToCsv } from "@/lib/domain";
import type { ReportFormat } from "@/data/mock/warehouse-data";

const reportFormats: ReportFormat[] = ["csv", "xlsx"];

type QueueItem = {
  id: string;
  reportId: string;
  title: string;
  format: ReportFormat;
  fileName: string;
  generatedAt: string;
  byteLength: number;
  status: "ready" | "queued";
  rows: Array<Record<string, string | number | boolean | null | undefined>>;
  mimeType: string;
};

export function ExportQueuePanel() {
  const { snapshot } = useWarehouseData();
  const reports = listExportableReportDefinitions();
  const [reportId, setReportId] = useState(reports[0]?.id ?? "");
  const selectedReport = reports.find((report) => report.id === reportId) ?? reports[0];
  const [format, setFormat] = useState<ReportFormat>(selectedReport?.defaultFormat ?? "csv");
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const totalBytes = useMemo(() => queue.reduce((total, item) => total + item.byteLength, 0), [queue]);

  function addToQueue() {
    if (!selectedReport) {
      return;
    }
    const exportResult = createRealReportExport({
      reportId: selectedReport.id,
      format,
    }, snapshot);
    setQueue((current) => [
      {
        id: `${selectedReport.id}-${exportResult.generatedAt}`,
        reportId: selectedReport.id,
        title: selectedReport.title,
        format,
        fileName: exportResult.fileName,
        generatedAt: exportResult.generatedAt,
        byteLength: exportResult.byteLength,
        status: "ready",
        rows: exportResult.rows,
        mimeType: exportResult.mimeType,
      },
      ...current,
    ]);
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Export Queue</p>
          <h3>Queued report files</h3>
        </div>
        <span className="status-chip info">{formatBytes(totalBytes)}</span>
      </div>

      <div className="export-builder">
        <label className="field">
          <span>Report</span>
          <select
            value={selectedReport?.id ?? ""}
            onChange={(event) => {
              const nextReport = reports.find((report) => report.id === event.target.value);
              setReportId(event.target.value);
              setFormat(nextReport?.defaultFormat ?? "csv");
            }}
          >
            {reports.map((report) => (
              <option key={report.id} value={report.id}>
                {report.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Format</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as ReportFormat)}>
            {reportFormats.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <button className="action-button primary" type="button" onClick={addToQueue}>
          <FilePlus2 size={16} aria-hidden="true" />
          Queue export
        </button>
      </div>

      <div className="export-queue">
        {queue.map((item) => (
          <div className="export-queue-item" key={item.id}>
            <div>
              <div className="item-row">
                <strong>{item.title}</strong>
                <span className="status-chip good">{item.status}</span>
              </div>
              <span className="muted">
                {item.fileName} - {formatBytes(item.byteLength)}
              </span>
            </div>
            <div className="row-actions">
              <button className="icon-button compact" type="button" title="Download export" onClick={() => downloadQueueItem(item)}>
                <Download size={15} aria-hidden="true" />
              </button>
              <button className="icon-button compact" type="button" title="Remove export" onClick={() => setQueue((current) => current.filter((queued) => queued.id !== item.id))}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        {queue.length === 0 ? <p className="muted">No exports queued yet.</p> : null}
      </div>
    </article>
  );
}

function downloadQueueItem(item: QueueItem): void {
  if (item.format === "xlsx") {
    const worksheet = XLSX.utils.json_to_sheet(item.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Old Glory Export");
    const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadBlob(new Blob([data], { type: item.mimeType }), item.fileName);
    return;
  }

  downloadBlob(new Blob([serializeRowsToCsv(item.rows)], { type: item.mimeType }), item.fileName);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  return `${(value / 1024).toFixed(1)} KB`;
}
