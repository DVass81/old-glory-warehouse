import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { FifoPanel } from "@/components/fifo/FifoPanel";

export default function FifoPage() {
  return (
    <WarehousePageFrame>
      <section className="screen-section">
        <FifoPanel />
      </section>
    </WarehousePageFrame>
  );
}
