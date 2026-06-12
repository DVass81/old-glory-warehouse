import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { WarehouseScene } from "@/components/warehouse-3d/WarehouseScene";

export default function WarehousePage() {
  return (
    <WarehousePageFrame>
      <section className="screen-section warehouse-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">3D Warehouse View</p>
            <h2>Actual Row-Position-Level copper layout</h2>
          </div>
          <span className="status-chip info">56 ft x 37 ft warehouse</span>
        </div>
        <WarehouseScene />
      </section>
    </WarehousePageFrame>
  );
}
