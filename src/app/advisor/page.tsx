import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { AdvisorPanel } from "@/components/advisor/AdvisorPanel";

export default function AdvisorPage() {
  return (
    <WarehousePageFrame>
      <section className="screen-section">
        <AdvisorPanel />
      </section>
    </WarehousePageFrame>
  );
}
