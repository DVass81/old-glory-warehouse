import { Download, FileSpreadsheet, FileText, PieChart, Printer } from "lucide-react";
import { listReportDefinitions } from "@/lib/domain";
import { ExportQueuePanel } from "./ExportQueuePanel";

const icons = [FileSpreadsheet, FileText, Printer, PieChart];

export function ReportsPanel() {
  const reports = listReportDefinitions();

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Export-ready operational packets</h2>
        </div>
        <button className="action-button" type="button">
          <Download size={16} aria-hidden="true" />
          Export queue
        </button>
      </div>

      <div className="reports-grid">
        <article className="panel">
          <div className="report-list">
            {reports.map((report, index) => {
              const Icon = icons[index % icons.length];
              return (
                <div className="report-item" key={report.id}>
                  <div className="item-row">
                    <div className="panel-title-row">
                      <Icon size={18} aria-hidden="true" />
                      <span className="strong">{report.title}</span>
                    </div>
                    <span className="status-chip info">{report.defaultFormat.toUpperCase()}</span>
                  </div>
                  <span className="muted">{report.description}</span>
                </div>
              );
            })}
          </div>
        </article>

        <ExportQueuePanel />
      </div>
    </>
  );
}
