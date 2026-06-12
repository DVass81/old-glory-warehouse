import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { ReportsPanel } from "@/components/reports/ReportsPanel";

export default function ReportsPage() {
  return (
    <WarehousePageFrame>
      <section className="screen-section">
        <ReportsPanel />
      </section>
    </WarehousePageFrame>
  );
}
