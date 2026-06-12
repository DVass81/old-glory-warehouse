"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  ShieldCheck,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateDashboardMetrics,
  summarizeTariffExposure,
} from "@/lib/domain";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";

const valueTrend = [
  { day: "Mon", value: 0.19, bonded: 0.12 },
  { day: "Tue", value: 0.2, bonded: 0.13 },
  { day: "Wed", value: 0.21, bonded: 0.13 },
  { day: "Thu", value: 0.22, bonded: 0.14 },
  { day: "Fri", value: 0.22, bonded: 0.14 },
];

export function Dashboard() {
  const { snapshot } = useWarehouseData();
  const metrics = calculateDashboardMetrics(snapshot);
  const exposureByOrigin = summarizeTariffExposure(snapshot).map((item) => ({
    origin: item.countryOfOrigin,
    duty: Math.round(item.estimatedDutyUsd),
    value: Math.round(item.dutiableValueUsd),
  }));
  const metricCards = [
    {
      label: "Copper on hand",
      value: `${formatWeight(metrics.availableWeightLbs)} lb`,
      detail: `${metrics.availableBoxes} available of ${metrics.totalBoxes} boxes`,
      icon: Boxes,
      tone: "info",
    },
    {
      label: "Inventory value",
      value: formatMoney(metrics.totalValueUsd),
      detail: "Domain calculated",
      icon: BadgeDollarSign,
      tone: "good",
    },
    {
      label: "Bonded exposure",
      value: formatMoney(metrics.ftzExposureUsd),
      detail: "Foreign FTZ status",
      icon: ShieldCheck,
      tone: "good",
    },
    {
      label: "FIFO exceptions",
      value: String(metrics.fifoRiskCount + metrics.overrideCount),
      detail: `${metrics.overrideCount} override audit entries`,
      icon: TimerReset,
      tone: "warn",
    },
    {
      label: "Tariff liability",
      value: formatMoney(metrics.estimatedTariffLiabilityUsd),
      detail: "Estimated exposure",
      icon: TrendingUp,
      tone: "danger",
    },
  ];
  const alerts = [
    {
      title: "Held copper needs review",
      detail: `${formatWeight(metrics.heldWeightLbs)} lb unavailable for allocation.`,
      tone: "warn",
    },
    {
      title: "Recent movement velocity",
      detail: `${metrics.recentMovementCount} movement events in the current review window.`,
      tone: "info",
    },
    {
      title: "Tariff exposure watch",
      detail: `${exposureByOrigin.length} origins contribute estimated duty exposure.`,
      tone: "danger",
    },
  ];

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Operations Command</p>
          <h1>Copper inventory, compliance, and movement control</h1>
        </div>
        <span className="status-chip good">Real ICC active dataset</span>
      </div>

      <div className="metric-grid">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <div className="metric-head">
                <span className="metric-label">{metric.label}</span>
                <span className={`status-chip ${metric.tone}`}>
                  <Icon size={14} aria-hidden="true" />
                </span>
              </div>
              <div>
                <div className="metric-value">{metric.value}</div>
                <div className="metric-detail">{metric.detail}</div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Valuation</p>
              <h3>Inventory value and bonded exposure</h3>
            </div>
            <span className="status-chip info">5 day trend</span>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <AreaChart data={valueTrend}>
                <defs>
                  <linearGradient id="valueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#c87533" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#c87533" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2c3440" strokeDasharray="4 4" />
                <XAxis dataKey="day" stroke="#a6afb9" />
                <YAxis stroke="#a6afb9" />
                <Tooltip
                  contentStyle={{ background: "#171b21", border: "1px solid #2c3440" }}
                />
                <Area
                  dataKey="value"
                  name="Value"
                  stroke="#e3954c"
                  fill="url(#valueFill)"
                  strokeWidth={2}
                />
                <Area dataKey="bonded" name="Bonded" stroke="#4f8cc9" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Exceptions</p>
              <h3>Priority queue</h3>
            </div>
            <AlertTriangle size={20} aria-hidden="true" />
          </div>
          <div className="alert-list">
            {alerts.map((alert) => (
              <div className="alert-item" key={alert.title}>
                <div className="item-row">
                  <span className="strong">{alert.title}</span>
                  <span className={`status-chip ${alert.tone}`}>Review</span>
                </div>
                <span className="muted">{alert.detail}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Tariff Exposure</p>
              <h3>Duty by origin</h3>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <BarChart data={exposureByOrigin}>
                <CartesianGrid stroke="#2c3440" strokeDasharray="4 4" />
                <XAxis dataKey="origin" stroke="#a6afb9" />
                <YAxis stroke="#a6afb9" />
                <Tooltip
                  contentStyle={{ background: "#171b21", border: "1px solid #2c3440" }}
                />
                <Bar dataKey="value" name="Value" fill="#4f8cc9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="duty" name="Duty" fill="#c87533" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Capacity</p>
              <h3>Storage utilization</h3>
            </div>
          </div>
          {["12 ft rows A-D", "6 ft rows E-J", "FTZ bonded cage", "Outbound staging"].map(
            (label, index) => (
              <div className="alert-item" key={label}>
                <div className="item-row">
                  <span>{label}</span>
                  <span className="strong">{[82, 68, 74, 43][index]}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${[82, 68, 74, 43][index]}%` }}
                  />
                </div>
              </div>
            ),
          )}
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

function formatWeight(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
