import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { CompliancePanels } from "@/components/compliance/CompliancePanels";

export default function CompliancePage() {
  return (
    <WarehousePageFrame>
      <section className="screen-section split-section">
        <CompliancePanels />
      </section>
    </WarehousePageFrame>
  );
}
