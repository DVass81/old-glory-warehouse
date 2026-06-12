import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { WarehouseOperationsCenter } from "@/components/operations/WarehouseOperationsCenter";

export default function OperationsPage() {
  return (
    <WarehousePageFrame>
      <WarehouseOperationsCenter />
    </WarehousePageFrame>
  );
}
