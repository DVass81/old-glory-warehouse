import type {
  AdvisorInput,
  AdvisorInsight,
  DashboardMetrics,
  DataProvider,
  FifoOverride,
  FifoRecommendation,
  IccImportResult,
  IccWarehouseRecord,
  IccWarehouseSpreadsheetRow,
  FtzLedgerEntry,
  InventoryBox,
  InventoryBoxId,
  InventoryMovement,
  InventoryQuery,
  MovementId,
  MovementQuery,
  PaginatedResult,
  ReportDefinition,
  ReportExportRequest,
  ReportExportResult,
  ReportId,
  StorageLocation,
  TariffLedgerEntry,
  Warehouse,
  WarehouseOperationAudit,
  WarehouseOperationType,
} from "@/types/domain";

export type RepositorySource = DataProvider;

export type CreateMovementInput = Omit<InventoryMovement, "id" | "occurredAt"> & {
  occurredAt?: InventoryMovement["occurredAt"];
};

export type WarehouseLocationInput = {
  row: string;
  position: string;
  level: number;
};

export type ReceiveBoxInput = WarehouseLocationInput & {
  partNumber: string;
  copperSize: string;
  weightLbs: number;
  status: InventoryBox["status"];
  supplier?: string;
  poNumber?: string;
  boxNumber?: string;
  dateReceived?: InventoryBox["receivedAt"];
  ftzLotId?: string;
  htsCode?: string;
  countryOfOrigin?: string;
  costUsd?: number;
  reason?: string;
};

export type UpdateBoxInput = {
  boxId: InventoryBoxId;
  changes: Partial<
    Pick<
      IccWarehouseRecord,
      | "partNumber"
      | "copperSize"
      | "supplier"
      | "poNumber"
      | "boxNumber"
      | "weightLbs"
      | "dateReceived"
      | "ftzLotId"
      | "htsCode"
      | "countryOfOrigin"
      | "costUsd"
      | "status"
      | "reviewStatus"
      | "reviewIssues"
    >
  >;
  reason?: string;
};

export type MoveBoxInput = WarehouseLocationInput & {
  boxId: InventoryBoxId;
  reason: string;
  allowDuplicateForReview?: boolean;
};

export type ChangeBoxStatusInput = {
  boxId: InventoryBoxId;
  status: InventoryBox["status"];
  reason: string;
};

export type ConsumeBoxInput = {
  boxId: InventoryBoxId;
  consumedWeightLbs?: number;
  reason: string;
};

export type DeleteOrArchiveBoxInput = {
  boxId: InventoryBoxId;
  reason: string;
  archiveOnly: true;
};

export type WarehouseOperationInput =
  | ({ operationType: "receiveBox" } & ReceiveBoxInput)
  | ({ operationType: "updateBox" } & UpdateBoxInput)
  | ({ operationType: "moveBox" } & MoveBoxInput)
  | ({ operationType: "reserveBox" } & ChangeBoxStatusInput)
  | ({ operationType: "holdBox" } & ChangeBoxStatusInput)
  | ({ operationType: "releaseBox" } & ChangeBoxStatusInput)
  | ({ operationType: "consumeBox" } & ConsumeBoxInput)
  | ({ operationType: "deleteOrArchiveBox" } & DeleteOrArchiveBoxInput);

export type WarehouseOperationResult = {
  box: IccWarehouseRecord;
  audit: WarehouseOperationAudit;
  operationType: WarehouseOperationType;
};

export type FifoRecommendationInput = {
  sku: string;
  requestedWeightLbs: number;
};

export type FifoOverrideInput = {
  recommendationId: FifoRecommendation["id"];
  removedBoxIds: InventoryBoxId[];
  addedBoxIds: InventoryBoxId[];
  reason: string;
  actor: string;
};

export interface WarehouseRepository {
  listWarehouses(): Promise<Warehouse[]>;
  listLocations(warehouseId?: Warehouse["id"]): Promise<StorageLocation[]>;
}

export interface InventoryRepository {
  listInventory(query: InventoryQuery): Promise<PaginatedResult<InventoryBox>>;
  getInventoryBox(id: InventoryBoxId): Promise<InventoryBox | null>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
}

export interface IccWarehouseDataRepository {
  loadActiveDataset(): Promise<IccWarehouseRecord[]>;
  replaceActiveDataset(importResult: IccImportResult): Promise<IccWarehouseRecord[]>;
  resetActiveDatasetToSeed(): Promise<IccWarehouseRecord[]>;
  validateRows(rows: IccWarehouseSpreadsheetRow[], sourceFileName?: string): Promise<IccImportResult>;
  applyOperation(input: WarehouseOperationInput, actor?: string): Promise<WarehouseOperationResult>;
  listOperationAudits(boxId?: InventoryBoxId): Promise<WarehouseOperationAudit[]>;
}

export interface MovementRepository {
  listMovements(query: MovementQuery): Promise<PaginatedResult<InventoryMovement>>;
  getMovement(id: MovementId): Promise<InventoryMovement | null>;
  recordMovement(input: CreateMovementInput): Promise<InventoryMovement>;
}

export interface FifoRepository {
  recommendPick(input: FifoRecommendationInput): Promise<FifoRecommendation>;
  applyOverride(input: FifoOverrideInput): Promise<FifoOverride>;
  listOverrides(recommendationId?: FifoRecommendation["id"]): Promise<FifoOverride[]>;
}

export interface ComplianceRepository {
  listFtzLedgerEntries(boxId?: InventoryBoxId): Promise<FtzLedgerEntry[]>;
  listTariffLedgerEntries(boxId?: InventoryBoxId): Promise<TariffLedgerEntry[]>;
}

export interface ReportRepository {
  listReports(): Promise<ReportDefinition[]>;
  exportReport(request: ReportExportRequest): Promise<ReportExportResult>;
}

export interface AdvisorService {
  generateInsights(input: AdvisorInput): Promise<AdvisorInsight[]>;
}

export interface RepositoryBundle {
  source: RepositorySource;
  warehouses: WarehouseRepository;
  inventory: InventoryRepository;
  iccWarehouseData?: IccWarehouseDataRepository;
  movements: MovementRepository;
  fifo: FifoRepository;
  compliance: ComplianceRepository;
  reports: ReportRepository;
  advisor: AdvisorService;
}

export type RepositoryFactory = () => RepositoryBundle;

export type ReportRouteParams = {
  reportId: ReportId;
};
