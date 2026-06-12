"use client";

import { ArrowRight, BrainCircuit, CircleAlert, Lightbulb, Sparkles } from "lucide-react";
import { getAdvisorInsights } from "@/lib/domain";
import { useWarehouseData } from "@/components/warehouse/WarehouseDataProvider";

const toneBySeverity: Record<string, string> = {
  warning: "warn",
  critical: "danger",
  info: "info",
};

export function AdvisorPanel() {
  const { snapshot } = useWarehouseData();
  const insights = getAdvisorInsights(snapshot);

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">AI Advisor</p>
          <h2>Explainable recommendations</h2>
        </div>
        <span className="status-chip info">
          <BrainCircuit size={14} aria-hidden="true" />
          Rule-backed live data
        </span>
      </div>

      <article className="panel">
        <div className="advisor-list">
          {insights.map((insight) => (
            <div className="advisor-item" key={insight.title}>
              <div className="item-row">
                <div className="panel-title-row">
                  {insight.severity === "critical" ? (
                    <CircleAlert size={18} aria-hidden="true" />
                  ) : (
                    <Lightbulb size={18} aria-hidden="true" />
                  )}
                  <span className="strong">{insight.title}</span>
                </div>
                <span className={`status-chip ${toneBySeverity[insight.severity]}`}>
                  {insight.topic.toUpperCase()}
                </span>
              </div>
              <div className="item-row">
                <span className="muted">{insight.reasoning[0]}</span>
                <span className="strong">{insight.relatedBoxIds.length} related lots</span>
              </div>
              <button className="action-button" type="button">
                <Sparkles size={16} aria-hidden="true" />
                Review recommendation
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
