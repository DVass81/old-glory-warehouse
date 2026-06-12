import { AppShell } from "@/components/app-shell/AppShell";
import { WarehouseDataProvider } from "@/components/warehouse/WarehouseDataProvider";

export function WarehousePageFrame({ children }: { children: React.ReactNode }) {
  return (
    <WarehouseDataProvider>
      <AppShell>{children}</AppShell>
    </WarehouseDataProvider>
  );
}
