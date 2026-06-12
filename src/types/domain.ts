export type Brand<T, TBrand extends string> = T & { readonly __brand?: TBrand };

export type IsoDateTime = Brand<string, "IsoDateTime">;
export type WarehouseId = Brand<string, "WarehouseId">;
export type StorageLocationId = Brand<string, "StorageLocationId">;
export type InventoryBoxId = Brand<string, "InventoryBoxId">;
export type MovementId = Brand<string, "MovementId">;
export type FifoRecommendationId = Brand<string, "FifoRecommendationId">;
export type FifoOverrideId = Brand<string, "FifoOverrideId">;
export type LedgerEntryId = Brand<string, "LedgerEntryId">;
export type ReportId = Brand<string, "ReportId">;
export type ExportQueueItemId = Brand<string, "ExportQueueItemId">;
export type AdvisorInsightId = Brand<string, "AdvisorInsightId">;
export type UserId = Brand<string, "UserId">;
export type AccountId = Brand<string, "AccountId">;

export type AppEnvironment = "development" | "test" | "production";
export type DataProvider = "mock" | "realIccSeed" | "browserStorage" | "supabase";
export type UserRole =
  | "administrator"
  | "purchasing"
  | "warehouse"
  | "accounting"
  | "management"
  | "readOnly";

export type CopperForm = "cathode" | "rod" | "wire" | "scrap" | "other";
export type CopperGrade = "cuA" | "cuB" | "cuC" | "recycled" | "mixed";
export type UnitOfMeasure = "lb" | "kg" | "metricTon";
export type InventoryStatus =
  | "available"
  | "reserved"
  | "picked"
  | "shipped"
  | "held"
  | "needsReview"
  | "archived";
export type FtzStatus = "domestic" | "foreignPrivileged" | "nonPrivilegedForeign" | "needsReview";
export type MovementType =
  | "receive"
  | "transfer"
  | "reserve"
  | "pick"
  | "ship"
  | "adjust"
  | "hold"
  | "release"
  | "update"
  | "consume"
  | "archive";
export type FtzEventType = "admit" | "transfer" | "withdraw" | "statusChange" | "adjustment";
export type TariffEventType = "estimate" | "accrual" | "withdrawal" | "adjustment";
export type AdvisorSeverity = "info" | "warning" | "critical";
export type AdvisorTopic = "fifo" | "ftz" | "tariff" | "inventory" | "movement";
export type ReportExportFormat = "csv" | "xlsx" | "pdf";
export type ExportQueueItemStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";
export type WarehouseRow = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
export type WarehouseStorageSide = "left12ft" | "right6ft";
export type WarehouseReviewStatus = "valid" | "needsReview";
export type IccImportIssueSeverity = "warning" | "error";
export type IccImportSource = "seed" | "upload" | "manualEdit";
export type WarehouseOperationType =
  | "receiveBox"
  | "updateBox"
  | "moveBox"
  | "reserveBox"
  | "holdBox"
  | "releaseBox"
  | "consumeBox"
  | "deleteOrArchiveBox";

export type Warehouse = {
  id: WarehouseId;
  name: string;
  code: string;
  timezone: string;
};

export type StorageLocation = {
  id: StorageLocationId;
  warehouseId: WarehouseId;
  zone: string;
  row: string;
  bay: string;
  shelf?: string;
  capacityLbs: number;
  position?: string;
  level?: number;
  warehouseLocation?: string;
  storageSide?: WarehouseStorageSide;
  boxLengthFt?: 6 | 12;
  maxLevel?: 3 | 4;
};

export type InventoryBox = {
  id: InventoryBoxId;
  boxNumber: string;
  lotNumber: string;
  sku: string;
  copperForm: CopperForm;
  copperGrade: CopperGrade;
  weightLbs: number;
  unitOfMeasure: UnitOfMeasure;
  countryOfOrigin: string;
  receivedAt: IsoDateTime;
  warehouseId: WarehouseId;
  locationId: StorageLocationId;
  warehouseZone: string;
  status: InventoryStatus;
  ftzStatus: FtzStatus;
  unitValueUsd: number;
  tariffRate: number;
  tariffClassCode?: string;
  customerAccountId?: AccountId;
  vendorAccountId?: AccountId;
  partNumber?: string;
  copperSize?: string;
  supplier?: string;
  poNumber?: string;
  row?: WarehouseRow | string;
  position?: string;
  level?: number;
  warehouseLocation?: string;
  dateReceived?: IsoDateTime | string;
  ftzLotId?: string;
  htsCode?: string;
  costUsd?: number | null;
  originalStatus?: string;
  alloy?: string;
  sourceRowNumber?: number;
  sourceFileName?: string;
  importSource?: IccImportSource;
  storageSide?: WarehouseStorageSide;
  boxLengthFt?: 6 | 12;
  fifoRank?: number;
  tariffExposureUsd?: number | null;
  reviewStatus?: WarehouseReviewStatus;
  reviewIssues?: string[];
};

export type InventoryMovement = {
  id: MovementId;
  boxId: InventoryBoxId;
  type: MovementType;
  fromLocationId?: StorageLocationId;
  toLocationId?: StorageLocationId;
  fromZone?: string;
  toZone?: string;
  occurredAt: IsoDateTime;
  actor: string;
  reason?: string;
  operationType?: WarehouseOperationType;
  previousLocation?: string;
  newLocation?: string;
  previousStatus?: InventoryStatus;
  newStatus?: InventoryStatus;
  comment?: string;
};

export type IccWarehouseSpreadsheetRow = {
  "Box ID"?: string;
  "Part Number / Copper Size"?: string;
  "Part Number"?: string;
  "Copper Size"?: string;
  Part?: string;
  Alloy?: string;
  Supplier?: string;
  "PO Number"?: string;
  "Box Number"?: string;
  "Length Type"?: string;
  Row?: string;
  Position?: string | number;
  Level?: string | number;
  "Warehouse Location"?: string;
  Weight?: string | number;
  "Weight Lbs"?: string | number;
  "Cost Per Lb"?: string | number;
  "Extended Value"?: string | number;
  "Date Received"?: string | number;
  "FTZ Status"?: string;
  "FTZ Lot ID"?: string;
  "HTS Code"?: string;
  "Country of Origin"?: string;
  Cost?: string | number;
  Status?: string;
};

export type IccWarehouseRecord = InventoryBox & {
  partNumber: string;
  copperSize: string;
  row: WarehouseRow | string;
  position: string;
  level: number;
  warehouseLocation: string;
  weightLbs: number;
  reviewStatus: WarehouseReviewStatus;
  reviewIssues: string[];
  storageSide: WarehouseStorageSide;
  boxLengthFt: 6 | 12;
};

export type IccImportValidationIssue = {
  rowNumber: number;
  field: keyof IccWarehouseSpreadsheetRow | "location" | "duplicate" | "rowLevelRule";
  severity: IccImportIssueSeverity;
  message: string;
  value?: string | number | null;
};

export type IccImportResult = {
  records: IccWarehouseRecord[];
  validRecords: IccWarehouseRecord[];
  needsReviewRecords: IccWarehouseRecord[];
  duplicateLocations: string[];
  issues: IccImportValidationIssue[];
  importedAt: IsoDateTime;
  sourceFileName?: string;
};

export type IccPoSupplierEnrichmentSpreadsheetRow = {
  "Box ID"?: string;
  "Box Number"?: string;
  "Warehouse Location"?: string;
  "Part Number"?: string;
  "Copper Size"?: string;
  Supplier?: string;
  "PO Number"?: string;
  "FTZ Lot ID"?: string;
  "HTS Code"?: string;
  "Country of Origin"?: string;
};

export type IccPoSupplierEnrichmentRecord = {
  boxId?: string;
  boxNumber?: string;
  warehouseLocation?: string;
  partNumber?: string;
  copperSize?: string;
  supplier?: string;
  poNumber?: string;
  ftzLotId?: string;
  htsCode?: string;
  countryOfOrigin?: string;
  sourceRowNumber: number;
  reviewStatus: WarehouseReviewStatus;
  reviewIssues: string[];
};

export type IccPoSupplierEnrichmentResult = {
  records: IccPoSupplierEnrichmentRecord[];
  issues: IccImportValidationIssue[];
  importedAt: IsoDateTime;
  sourceFileName?: string;
};

export type OldGloryLabelFieldSection = "boxQr" | "ftzTariff";

export type OldGloryLabelFieldDefinition = {
  fieldLabel: string;
  required: string;
  source: string;
  displayOnLabel: string;
  includeInQr: boolean;
  exampleFormat?: string;
  fieldName: string;
  validation: string;
  notes?: string;
  section: OldGloryLabelFieldSection;
};

export type OldGloryRowPlacardDefinition = {
  placardId: string;
  row: WarehouseRow | string;
  warehouseSide: string;
  storageSide: WarehouseStorageSide;
  copperLength: string;
  boxLengthFt: 6 | 12;
  maxStackLevel: 3 | 4;
  placardText: string;
  codexUsage?: string;
};

export type OldGloryLocationLabelRule = {
  ruleId: string;
  rows: string;
  positionPattern: string;
  levels: string;
  copperLength: string;
  labelFormat: string;
  validationRule: string;
  placementRule: string;
};

export type OldGloryLabelConfig = {
  sourceWorkbookName?: string;
  warehouseDimensions: {
    lengthFt: number;
    widthFt: number;
  };
  locationFormat: string;
  labelStock: {
    name: string;
    labelWidthIn: number;
    labelHeightIn: number;
    columns: number;
    rowsPerPage: number;
    labelsPerPage: number;
  };
  rowPlacards: OldGloryRowPlacardDefinition[];
  locationRules: OldGloryLocationLabelRule[];
  boxQrFields: OldGloryLabelFieldDefinition[];
  ftzTariffFields: OldGloryLabelFieldDefinition[];
};

export type OldGloryBoxQrLabelPayload = {
  version: 1;
  type: "oldGloryBoxLabel";
  boxId: string;
  boxNumber: string;
  urlPath: string;
  generatedAt: IsoDateTime;
  display: {
    primary: string;
    secondary: string;
    location: string;
  };
  data: {
    copperSize: string;
    alloy?: string;
    supplier: string;
    poNumber: string;
    weightLbs: number;
    warehouseLocation: string;
    row?: string;
    fifoRank?: number;
    ftzStatus: FtzStatus;
    ftzLotId?: string;
    htsCode?: string;
    countryOfOrigin: string;
    status: InventoryStatus;
  };
};

export type WarehouseOperationAudit = {
  id: MovementId;
  boxId: InventoryBoxId;
  operationType: WarehouseOperationType;
  actor: string;
  occurredAt: IsoDateTime;
  previousLocation?: string;
  newLocation?: string;
  previousStatus?: InventoryStatus;
  newStatus?: InventoryStatus;
  reason?: string;
  comment?: string;
};

export type FifoRecommendation = {
  id: FifoRecommendationId;
  sku: string;
  requestedWeightLbs: number;
  selectedBoxIds: InventoryBoxId[];
  totalWeightLbs: number;
  shortageWeightLbs: number;
  rationale: string[];
  createdAt: IsoDateTime;
};

export type FifoOverride = {
  id: FifoOverrideId;
  recommendationId: FifoRecommendationId;
  removedBoxIds: InventoryBoxId[];
  addedBoxIds: InventoryBoxId[];
  reason: string;
  actor: string;
  createdAt: IsoDateTime;
};

export type FtzLedgerEntry = {
  id: LedgerEntryId;
  boxId: InventoryBoxId;
  eventType: FtzEventType;
  ftzStatus: FtzStatus;
  occurredAt: IsoDateTime;
  referenceMovementId?: MovementId;
};

export type TariffLedgerEntry = {
  id: LedgerEntryId;
  boxId: InventoryBoxId;
  eventType: TariffEventType;
  dutiableValueUsd: number;
  tariffRate: number;
  estimatedDutyUsd: number;
  occurredAt: IsoDateTime;
  referenceMovementId?: MovementId;
};

export type AdvisorInsight = {
  id: AdvisorInsightId;
  severity: AdvisorSeverity;
  topic: AdvisorTopic;
  title: string;
  reasoning: string[];
  relatedBoxIds: InventoryBoxId[];
  createdAt: IsoDateTime;
};

export type DateRange = {
  from?: IsoDateTime;
  to?: IsoDateTime;
};

export type SortDirection = "asc" | "desc";

export type PaginationInput = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
};

export type InventoryQuery = PaginationInput & {
  warehouseId?: WarehouseId;
  sku?: string;
  grade?: CopperGrade;
  status?: InventoryStatus;
  ftzStatus?: FtzStatus;
  origin?: string;
  search?: string;
  receivedRange?: DateRange;
  sortBy?: "receivedAt" | "weightLbs" | "unitValueUsd" | "status";
  sortDirection?: SortDirection;
};

export type MovementQuery = PaginationInput & {
  boxId?: InventoryBoxId;
  type?: MovementType;
  occurredRange?: DateRange;
  search?: string;
};

export type ReportDefinition = {
  id: ReportId;
  name: string;
  description: string;
  supportedFormats: ReportExportFormat[];
};

export type ReportFilter = {
  key: string;
  value: string;
};

export type ReportColumnKey = string;

export type ReportExportRequest = {
  reportId: ReportId;
  format: ReportExportFormat;
  filters: ReportFilter[];
  columns?: ReportColumnKey[];
  dateRange?: DateRange;
};

export type ReportExportResult = {
  fileName: string;
  mimeType: string;
  byteLength?: number;
  generatedAt: IsoDateTime;
  source: DataProvider;
};

export type ExportQueueItem = {
  id: ExportQueueItemId;
  request: ReportExportRequest;
  status: ExportQueueItemStatus;
  requestedAt: IsoDateTime;
  requestedBy?: UserId | string;
  attempts: number;
  result?: ReportExportResult;
  errorMessage?: string;
};

export type DashboardMetrics = {
  availableWeightLbs: number;
  heldWeightLbs: number;
  estimatedInventoryValueUsd: number;
  estimatedTariffLiabilityUsd: number;
  ftzExposureUsd: number;
  fifoRiskCount: number;
  recentMovementCount: number;
  overrideCount: number;
};

export type AdvisorInput = {
  inventory: InventoryBox[];
  movements: InventoryMovement[];
  dashboardMetrics: DashboardMetrics;
};
