"use client";

import { BadgeCheck, FileWarning, Landmark, Scale, ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  deriveFtzLedger,
  summarizeFtzByStatus,
  summarizeTariffExposure,
} from "@/lib/domain";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";

export function CompliancePanels() {
  const { snapshot } = useWarehouseData();
  const ftzSummary = summarizeFtzByStatus(snapshot);
  const ftzLedger = deriveFtzLedger(snapshot);
  const tariffData = summarizeTariffExposure(snapshot).map((item) => ({
    class: item.countryOfOrigin.slice(0, 3).toUpperCase(),
    estimate: Math.round(item.estimatedDutyUsd),
  }));
  const ftzRows = [
    ["Foreign privileged", formatMoney(ftzSummary.foreignPrivileged.valueUsd), "good"],
    ["Non privileged foreign", formatMoney(ftzSummary.nonPrivilegedForeign.valueUsd), "warn"],
    ["Domestic", `${ftzSummary.domestic.boxes} lots`, "info"],
    ["Needs review", `${ftzSummary.needsReview?.boxes ?? 0} lots`, "review"],
    ["Ledger events", `${ftzLedger.length} tracked`, "danger"],
  ];

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Compliance</p>
          <h2>FTZ status and tariff exposure</h2>
        </div>
        <span className="status-chip info">
          <Landmark size={14} aria-hidden="true" />
          Supabase ready
        </span>
      </div>

      <div className="compliance-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">FTZ Ledger</p>
              <h3>Zone status controls</h3>
            </div>
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div className="alert-list">
            {ftzRows.map(([label, value, tone]) => (
              <div className="alert-item" key={label}>
                <div className="item-row">
                  <span>{label}</span>
                  <span className={`status-chip ${tone}`}>{value}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Tariffs</p>
              <h3>Estimated duty by class</h3>
            </div>
            <Scale size={20} aria-hidden="true" />
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <BarChart data={tariffData}>
                <CartesianGrid stroke="#2c3440" strokeDasharray="4 4" />
                <XAxis dataKey="class" stroke="#a6afb9" />
                <YAxis stroke="#a6afb9" />
                <Tooltip
                  contentStyle={{ background: "#171b21", border: "1px solid #2c3440" }}
                />
                <Bar dataKey="estimate" fill="#c87533" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Controls</p>
              <h3>Release readiness</h3>
            </div>
            <BadgeCheck size={20} aria-hidden="true" />
          </div>
          <div className="alert-list">
            {["Entry package complete", "FIFO trace attached", "Customer release authorized"].map(
              (label) => (
                <div className="alert-item" key={label}>
                  <div className="item-row">
                    <span>{label}</span>
                    <span className="status-chip good">Ready</span>
                  </div>
                </div>
              ),
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Exceptions</p>
              <h3>Documentation gaps</h3>
            </div>
            <FileWarning size={20} aria-hidden="true" />
          </div>
          <div className="alert-list">
            <div className="alert-item">
              <div className="item-row">
                <span className="strong">Missing country certificate</span>
                <span className="status-chip danger">4 lots</span>
              </div>
              <span className="muted">Release blocked until accounting confirms duty basis.</span>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
