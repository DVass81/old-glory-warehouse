import { WarehousePageFrame } from "@/components/app-shell/WarehousePageFrame";
import { NeedsReviewQueue } from "@/components/needs-review/NeedsReviewQueue";

export default function NeedsReviewPage() {
  return (
    <WarehousePageFrame>
      <NeedsReviewQueue />
    </WarehousePageFrame>
  );
}
