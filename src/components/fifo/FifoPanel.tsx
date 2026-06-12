"use client";

import { AlertTriangle, CheckCircle2, Clock3, GitBranch, RotateCcw } from "lucide-react";
import { recommendFifoPick } from "@/lib/domain";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";

export function FifoPanel() {
  const { snapshot } = useWarehouseData();
  const sku = snapshot.inventory[0]?.sku ?? "Needs Review";
  const recommendation = recommendFifoPick(
    { sku, requestedWeightLbs: 20000, createdAt: "2026-06-12T12:00:00.000Z" },
    snapshot,
  );
  const selectedBoxes = recommendation.selectedBoxIds
    .map((boxId) => snapshot.inventory.find((box) => box.id === boxId))
    .filter((box): box is NonNullable<typeof box> => Boolean(box));

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">FIFO</p>
          <h2>Recommended depletion path</h2>
        </div>
        <button className="action-button" type="button">
          <RotateCcw size={16} aria-hidden="true" />
          Recalculate
        </button>
      </div>

      <div className="fifo-layout">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Order OG-SO-4307</p>
              <h3>C110 Rod allocation</h3>
            </div>
            <span className="status-chip warn">
              <AlertTriangle size={14} aria-hidden="true" />
              Override risk
            </span>
          </div>
          <div className="fifo-list">
            {selectedBoxes.map((item, index) => (
              <div className="fifo-item" key={item.id}>
                <span className="step-badge">{index + 1}</span>
                <div>
                  <div className="item-row">
                    <span className="strong">{item.boxNumber}</span>
                    <span className="table-meta">Zone {item.warehouseZone}</span>
                  </div>
                  <span className="muted">
                    {formatNumber(item.weightLbs)} lb received {ageInDays(item.receivedAt)} days ago
                  </span>
                </div>
                <span className={`status-chip ${index === 0 ? "good" : "info"}`}>
                  {index === 0 ? "Oldest eligible" : "Selected"}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Audit</p>
              <h3>Decision trace</h3>
            </div>
            <GitBranch size={20} aria-hidden="true" />
          </div>
          <div className="timeline">
            {selectedBoxes.map((box, index) => (
              <div className="timeline-row" key={box.id}>
                <span className="muted">{ageInDays(box.receivedAt)} days</span>
                <div className="timeline-bar" style={{ width: `${100 - index * 24}%` }} />
              </div>
            ))}
          </div>
          <div className="alert-list" style={{ marginTop: 16 }}>
            <div className="alert-item">
              <div className="item-row">
                <span className="strong">Rule basis</span>
                <CheckCircle2 size={17} aria-hidden="true" />
              </div>
              <span className="muted">
                {recommendation.rationale[0]}
              </span>
            </div>
            <div className="alert-item">
              <div className="item-row">
                <span className="strong">Manager action</span>
                <Clock3 size={17} aria-hidden="true" />
              </div>
              <span className="muted">
                Override requires reason capture and keeps the original recommendation.
              </span>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function ageInDays(receivedAt: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.floor((new Date("2026-06-12T12:00:00.000Z").getTime() - new Date(receivedAt).getTime()) / msPerDay),
  );
}
