import type {
  InventoryBox,
  IsoDateTime,
  OldGloryBoxQrLabelPayload,
  OldGloryLabelConfig,
  OldGloryLabelFieldDefinition,
  OldGloryLocationLabelRule,
  OldGloryRowPlacardDefinition,
} from "@/types/domain";

const NEEDS_REVIEW = "Needs Review";

export const OLD_GLORY_LABEL_STOCK = {
  name: "ULINE S-5962",
  labelWidthIn: 4,
  labelHeightIn: 2,
  columns: 2,
  rowsPerPage: 5,
  labelsPerPage: 10,
} as const;

export const OLD_GLORY_ROW_PLACARDS: OldGloryRowPlacardDefinition[] = [
  makeRowPlacard("A", "Left Side", 12, 3),
  makeRowPlacard("B", "Left Side", 12, 3),
  makeRowPlacard("C", "Left Side", 12, 3),
  makeRowPlacard("D", "Left Side", 12, 3),
  makeRowPlacard("E", "Right Side", 6, 4),
  makeRowPlacard("F", "Right Side", 6, 4),
  makeRowPlacard("G", "Right Side", 6, 4),
  makeRowPlacard("H", "Right Side", 6, 4),
  makeRowPlacard("I", "Right Side", 6, 4),
  makeRowPlacard("J", "Right Side", 6, 4),
];

export const OLD_GLORY_LOCATION_RULES: OldGloryLocationLabelRule[] = [
  {
    ruleId: "LOC-12FT",
    rows: "A-D",
    positionPattern: "01, 02, 03... from spreadsheet",
    levels: "L1-L3",
    copperLength: "12 ft",
    labelFormat: "{Row}-{Position}-L{Level}",
    validationRule: "Rows A-D cannot exceed Level 3",
    placementRule: "Place on left side in 12-foot storage zone",
  },
  {
    ruleId: "LOC-6FT",
    rows: "E-J",
    positionPattern: "01, 02, 03... from spreadsheet",
    levels: "L1-L4",
    copperLength: "6 ft",
    labelFormat: "{Row}-{Position}-L{Level}",
    validationRule: "Rows E-J cannot exceed Level 4",
    placementRule: "Place on right side in 6-foot storage zone",
  },
  {
    ruleId: "DUP-CHECK",
    rows: "A-J",
    positionPattern: "Any",
    levels: "Any",
    copperLength: "Any",
    labelFormat: "One unique box per Row/Position/Level",
    validationRule: "Flag duplicate locations as Needs Review",
    placementRule: "Show duplicate conflict in red/orange",
  },
  {
    ruleId: "MISSING-CHECK",
    rows: "A-J",
    positionPattern: "Any",
    levels: "Any",
    copperLength: "Any",
    labelFormat: "Missing row/position/level = Needs Review",
    validationRule: "Do not invent location data",
    placementRule: "Place in Needs Review holding area until corrected",
  },
];

export const OLD_GLORY_BOX_QR_FIELDS: OldGloryLabelFieldDefinition[] = [
  makeField("Box ID", "Yes", "Import or generated", "Yes", true, "C107-250x300-MAV-001", "boxId", "Unique", "boxQr"),
  makeField("Copper Size", "Yes", "Spreadsheet", "Yes - large text", true, ".250 x 3.00", "copperSize", "Required", "boxQr", "Highlight/prominent on label"),
  makeField("Alloy / Grade", "Yes", "Spreadsheet/default", "Yes", true, "C10700", "alloy", "Required", "boxQr"),
  makeField("Supplier", "Yes", "Spreadsheet", "Yes", true, "Maverick", "supplier", "Required", "boxQr"),
  makeField("PO Number", "Yes", "Spreadsheet", "Yes", true, "PO028944", "poNumber", "Required if known", "boxQr"),
  makeField("Weight", "Yes", "Spreadsheet/default", "Yes", true, "1500 lb", "weightLbs", "Numeric", "boxQr"),
  makeField("Warehouse Location", "Yes", "Spreadsheet", "Yes - large text", true, "A-01-L1", "warehouseLocation", "Required/Unique", "boxQr", "Row-position-level"),
  makeField("Row", "Yes", "Spreadsheet", "No", true, "A", "row", "A-J", "boxQr", "Derived from location if possible"),
];

export const OLD_GLORY_FTZ_TARIFF_FIELDS: OldGloryLabelFieldDefinition[] = [
  makeField("FTZ Lot ID", "Yes for FTZ", "Import/app", "Yes - prominent", true, "FTZ-20250626-001", "ftzLotId", "Unique", "ftzTariff", "Key to tariff ledger"),
  makeField("Admission Date", "Yes for FTZ", "Import/app", "No", true, "YYYY-MM-DD", "ftzAdmissionDate", "Date", "ftzTariff"),
  makeField("Supplier", "Yes", "Import", "Yes", true, "Tecnofil", "supplier", "Required", "ftzTariff"),
  makeField("Country of Origin", "Yes", "Import", "Small", true, "Peru", "countryOfOrigin", "Required", "ftzTariff"),
  makeField("HTS Code", "Yes", "Import", "Small", true, "8503.00.9520", "htsCode", "Required", "ftzTariff"),
  makeField("Declared Value", "Yes for tariff ledger", "Import/app", "No", true, "125000", "declaredValue", "Currency", "ftzTariff"),
  makeField("Tariff Rate", "Yes for tariff ledger", "Import/app", "No", true, "13% / 18% / current", "tariffRate", "Percent", "ftzTariff", "Should be editable by authorized users"),
  makeField("Estimated Tariff", "Generated", "App", "No", true, "Declared Value x Tariff Rate", "estimatedTariff", "Calculated", "ftzTariff"),
];

export const OLD_GLORY_LABEL_CONFIG: OldGloryLabelConfig = {
  sourceWorkbookName: "old_glory_warehouse_labels_codex_package.xlsx",
  warehouseDimensions: {
    lengthFt: 56,
    widthFt: 37,
  },
  locationFormat: "{Row}-{Position}-L{Level}",
  labelStock: OLD_GLORY_LABEL_STOCK,
  rowPlacards: OLD_GLORY_ROW_PLACARDS,
  locationRules: OLD_GLORY_LOCATION_RULES,
  boxQrFields: OLD_GLORY_BOX_QR_FIELDS,
  ftzTariffFields: OLD_GLORY_FTZ_TARIFF_FIELDS,
};

export function createOldGloryBoxQrLabelPayload(
  box: InventoryBox,
  generatedAt = new Date().toISOString() as IsoDateTime,
  basePath = "/inventory",
): OldGloryBoxQrLabelPayload {
  const boxId = String(box.id);
  const boxNumber = text(box.boxNumber) || boxId;
  const copperSize = text(box.copperSize) || text(box.partNumber) || text(box.sku) || NEEDS_REVIEW;
  const warehouseLocation = text(box.warehouseLocation) || text(box.warehouseZone) || NEEDS_REVIEW;

  return {
    version: 1,
    type: "oldGloryBoxLabel",
    boxId,
    boxNumber,
    urlPath: `${basePath.replace(/\/$/, "")}/${encodeURIComponent(boxId)}`,
    generatedAt,
    display: {
      primary: copperSize,
      secondary: text(box.supplier) || NEEDS_REVIEW,
      location: warehouseLocation,
    },
    data: {
      copperSize,
      alloy: text(box.alloy) || undefined,
      supplier: text(box.supplier) || NEEDS_REVIEW,
      poNumber: text(box.poNumber) || NEEDS_REVIEW,
      weightLbs: box.weightLbs,
      warehouseLocation,
      row: text(box.row) || undefined,
      fifoRank: box.fifoRank,
      ftzStatus: box.ftzStatus,
      ftzLotId: text(box.ftzLotId) && box.ftzLotId !== NEEDS_REVIEW ? box.ftzLotId : undefined,
      htsCode: text(box.htsCode) || undefined,
      countryOfOrigin: text(box.countryOfOrigin) || NEEDS_REVIEW,
      status: box.status,
    },
  };
}

export function serializeOldGloryBoxQrLabelPayload(payload: OldGloryBoxQrLabelPayload): string {
  return JSON.stringify(payload);
}

function makeRowPlacard(
  row: string,
  warehouseSide: string,
  boxLengthFt: 6 | 12,
  maxStackLevel: 3 | 4,
): OldGloryRowPlacardDefinition {
  return {
    placardId: `ROW-${row}`,
    row,
    warehouseSide,
    storageSide: boxLengthFt === 12 ? "left12ft" : "right6ft",
    copperLength: `${boxLengthFt} ft copper`,
    boxLengthFt,
    maxStackLevel,
    placardText: `ROW ${row} - ${boxLengthFt}' COPPER - MAX ${maxStackLevel} HIGH`,
    codexUsage: "Render as physical row label and 3D row header",
  };
}

function makeField(
  fieldLabel: string,
  required: string,
  source: string,
  displayOnLabel: string,
  includeInQr: boolean,
  exampleFormat: string,
  fieldName: string,
  validation: string,
  section: OldGloryLabelFieldDefinition["section"],
  notes?: string,
): OldGloryLabelFieldDefinition {
  return {
    fieldLabel,
    required,
    source,
    displayOnLabel,
    includeInQr,
    exampleFormat,
    fieldName,
    validation,
    notes,
    section,
  };
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}
