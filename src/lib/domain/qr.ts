import { InventoryBox, Movement, QrPayload, ReportDefinition } from "@/data/mock/warehouse-data";

export type LegacyInventoryQrInput = {
  boxId: string;
  boxNumber: string;
  sku: string;
  warehouseZone: string;
  generatedAt?: string;
};

export type LegacyInventoryQrPayload = {
  version: 1;
  type: "inventory_box";
  boxId: string;
  boxNumber: string;
  sku: string;
  warehouseZone: string;
  urlPath: string;
  generatedAt: string;
};

export function createQrPayload(input: LegacyInventoryQrInput): LegacyInventoryQrPayload {
  return {
    version: 1,
    type: "inventory_box",
    boxId: input.boxId,
    boxNumber: input.boxNumber,
    sku: input.sku,
    warehouseZone: input.warehouseZone,
    urlPath: `/inventory/${input.boxId}`,
    generatedAt: input.generatedAt ?? new Date().toISOString()
  };
}

export function createInventoryQrPayload(box: InventoryBox, generatedAt = new Date().toISOString()): QrPayload {
  return {
    version: 1,
    entity: "inventoryBox",
    id: box.id,
    label: box.boxNumber,
    generatedAt,
    data: {
      sku: box.sku,
      weightLbs: box.weightLbs,
      zone: box.warehouseZone,
      status: box.status,
      ftzStatus: box.ftzStatus
    }
  };
}

export type InventoryLabelPayloadOptions = {
  generatedAt?: string;
  labelSize?: "4x6" | "uline-s-5962";
};

export function createInventoryLabelPayload(
  box: InventoryBox,
  options: InventoryLabelPayloadOptions = {}
) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const labelSize = options.labelSize ?? "uline-s-5962";
  const layout =
    labelSize === "4x6"
      ? { widthIn: 4, heightIn: 6, orientation: "portrait" }
      : { widthIn: 4, heightIn: 2, orientation: "landscape", columns: 2, rowsPerPage: 5 };

  return {
    version: 1,
    template: labelSize === "4x6" ? "inventory-box-4x6" : "uline-s-5962-box-label",
    generatedAt,
    layout,
    fields: {
      boxNumber: box.boxNumber,
      partNumber: box.partNumber ?? box.sku,
      copperSize: box.copperSize ?? box.partNumber ?? box.sku,
      alloy: box.alloy ?? box.grade,
      supplier: box.supplier ?? "Needs Review",
      poNumber: box.poNumber ?? "Needs Review",
      warehouseLocation: box.warehouseLocation ?? box.locationId ?? "Needs Review",
      weightLbs: box.weightLbs,
      ftzLotId: box.ftzLotId ?? "Needs Review",
      htsCode: box.htsCode ?? "Needs Review",
      countryOfOrigin: box.countryOfOrigin,
      status: box.status
    },
    qrPayload: createInventoryQrPayload(box, generatedAt)
  };
}

export function createMovementQrPayload(
  movement: Movement,
  generatedAt = new Date().toISOString()
): QrPayload {
  return {
    version: 1,
    entity: "movement",
    id: movement.id,
    label: `${movement.type.toUpperCase()} ${movement.boxId}`,
    generatedAt,
    data: {
      boxId: movement.boxId,
      type: movement.type,
      occurredAt: movement.occurredAt,
      actor: movement.actor
    }
  };
}

export function createReportQrPayload(
  report: ReportDefinition,
  generatedAt = new Date().toISOString()
): QrPayload {
  return {
    version: 1,
    entity: "report",
    id: report.id,
    label: report.title,
    generatedAt,
    data: {
      category: report.category,
      defaultFormat: report.defaultFormat,
      columns: report.columns.length
    }
  };
}

export function serializeQrPayload(payload: QrPayload): string {
  return JSON.stringify(payload);
}
