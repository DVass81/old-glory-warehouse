import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { InventoryTable } from "@/components/inventory/InventoryTable";

export default function InventoryPage() {
  return (
    <WarehousePageFrame>
      <section className="screen-section">
        <InventoryTable />
      </section>
    </WarehousePageFrame>
  );
}
