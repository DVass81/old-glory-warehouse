import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function DashboardPage() {
  return (
    <WarehousePageFrame>
      <section className="screen-section">
        <Dashboard />
      </section>
    </WarehousePageFrame>
  );
}
