"use client";

import { Barcode, Boxes, ClipboardCheck, FileWarning, PackagePlus, Scale, Truck } from "lucide-react";
import Link from "next/link";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";
import { calculateDashboardMetrics, deriveJobTariffLedger, getNeedsReviewRows } from "@/lib/domain";

const actions = [
  { href: "/receive", title: "Receive Copper", detail: "Add a new box, set dropdown fields, and assign a valid location.", icon: PackagePlus, tone: "good" },
  { href: "/pull", title: "Guided Pull", detail: "Choose copper size and job, then confirm FIFO depletion.", icon: Truck, tone: "info" },
  { href: "/inventory", title: "Move / Edit Box", detail: "Update supplier, origin, FTZ, received date, price, status, or location.", icon: Boxes, tone: "warn" },
  { href: "/labels", title: "Build Labels", detail: "Preview and export print-ready labels by PO, supplier, part, location, or review status.", icon: Barcode, tone: "info" },
  { href: "/needs-review", title: "Needs Review Queue", detail: "Resolve missing PO, supplier, origin, FTZ, HTS, price, and received dates.", icon: FileWarning, tone: "review" },
  { href: "/compliance", title: "Job Tariff Ledger", detail: "Track pulled copper to jobs with value and estimated duty.", icon: Scale, tone: "danger" },
];

export function WarehouseOperationsCenter() {
  const { snapshot } = useWarehouseData();
  const metrics = calculateDashboardMetrics(snapshot);
  const reviewRows = getNeedsReviewRows(snapshot);
  const jobLedger = deriveJobTariffLedger(snapshot);

  return (
    <div className="operation-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Warehouse Operations</p>
          <h2>Daily command center</h2>
        </div>
        <span className="status-chip good">
          <ClipboardCheck size={14} aria-hidden="true" />
          Live local dataset
        </span>
      </div>

      <div className="ops-metric-strip">
        <Metric label="Available weight" value={`${formatNumber(metrics.availableWeightLbs)} lb`} tone="good" />
        <Metric label="Needs review" value={String(reviewRows.length)} tone="review" />
        <Metric label="Held / reserved" value={`${formatNumber(metrics.heldWeightLbs + metrics.reservedWeightLbs)} lb`} tone="warn" />
        <Metric label="Job ledger pulls" value={String(jobLedger.length)} tone="info" />
      </div>

      <div className="operations-grid">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link className="operation-card" href={action.href} key={action.href}>
              <span className={`status-chip ${action.tone}`}>
                <Icon size={15} aria-hidden="true" />
                Open
              </span>
              <div>
                <h3>{action.title}</h3>
                <p>{action.detail}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <article className="metric-card mini-metric">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className={`status-chip ${tone}`}>Current</span>
    </article>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
