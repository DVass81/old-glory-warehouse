import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { RealIccDataImport } from "@/components/import/RealIccDataImport";

export default function RealImportPage() {
  return (
    <WarehousePageFrame>
      <section className="screen-section">
        <RealIccDataImport />
      </section>
    </WarehousePageFrame>
  );
}
