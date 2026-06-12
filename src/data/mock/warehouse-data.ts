export type CopperForm = "cathode" | "rod" | "wire" | "scrap" | "other";

export type InventoryStatus =
  | "available"
  | "reserved"
  | "picked"
  | "shipped"
  | "held"
  | "needsReview"
  | "archived";

export type FtzStatus =
  | "domestic"
  | "foreignPrivileged"
  | "nonPrivilegedForeign"
  | "needsReview";

export type MovementType =
  | "receive"
  | "transfer"
  | "reserve"
  | "pick"
  | "ship"
  | "adjust"
  | "hold"
  | "release"
  | "withdraw"
  | "deplete";

export type AdvisorSeverity = "info" | "warning" | "critical";
export type AdvisorTopic = "fifo" | "ftz" | "tariff" | "inventory" | "movement";
export type ReportCategory = "inventory" | "fifo" | "ftz" | "tariff" | "executive";
export type ReportFormat = "csv" | "xlsx" | "pdf";

export type StorageLocation = {
  id: string;
  zone: string;
  rack: string;
  bay: string;
  row: string;
  maxLengthFt: 6 | 12;
  capacityLbs: number;
};

export type InventoryBox = {
  id: string;
  source?: "icc-seed" | "uploaded" | "manual" | "demo";
  sourceRow?: number;
  boxNumber: string;
  partNumber?: string;
  copperSize?: string;
  sku: string;
  copperForm: CopperForm;
  alloy?: string;
  grade?: string;
  supplier?: string;
  poNumber?: string;
  row?: string;
  position?: string;
  level?: number;
  warehouseLocation?: string;
  boxLengthFt?: 6 | 12;
  storageSide?: "left12ft" | "right6ft";
  weightLbs: number;
  dateReceived?: string;
  countryOfOrigin: string;
  receivedAt: string;
  warehouseZone: string;
  locationId?: string;
  status: InventoryStatus;
  ftzStatus: FtzStatus;
  ftzLotId?: string;
  htsCode?: string;
  costUsd?: number | null;
  unitValueUsd: number;
  tariffRate: number;
  tariffExposureUsd?: number;
  originalStatus?: string;
  reviewStatus?: "valid" | "needsReview";
  reviewIssues?: string[];
  fifoRank?: number;
  customerAccount?: string;
  holdReason?: string;
};

export type Movement = {
  id: string;
  boxId: string;
  type: MovementType | "edit" | "receiveBox" | "moveBox" | "reserveBox" | "holdBox" | "releaseBox" | "consumeBox" | "archiveBox";
  fromZone?: string;
  toZone?: string;
  fromLocation?: string;
  toLocation?: string;
  previousWeightLbs?: number;
  newWeightLbs?: number;
  pulledWeightLbs?: number;
  consumedWeightLbs?: number;
  remainingWeightLbs?: number;
  jobNumber?: string;
  tariffTracked?: boolean;
  previousStatus?: InventoryStatus;
  newStatus?: InventoryStatus;
  previousLocation?: string;
  newLocation?: string;
  occurredAt: string;
  actor: string;
  reason?: string;
};

export type FifoRecommendation = {
  id: string;
  sku: string;
  requestedWeightLbs: number;
  selectedBoxIds: string[];
  totalWeightLbs: number;
  shortageLbs: number;
  shortageWeightLbs: number;
  rationale: string[];
  createdAt: string;
};

export type FifoOverride = {
  id: string;
  recommendationId: string;
  removedBoxIds: string[];
  addedBoxIds: string[];
  reason: string;
  actor: string;
  createdAt: string;
};

export type FtzLedgerEntry = {
  id: string;
  boxId: string;
  eventType: "admit" | "transfer" | "withdraw" | "statusChange" | "adjustment";
  ftzStatus: FtzStatus;
  occurredAt: string;
  referenceMovementId?: string;
};

export type TariffLedgerEntry = {
  id: string;
  boxId: string;
  eventType: "estimate" | "accrual" | "withdrawal" | "adjustment";
  dutiableValueUsd: number;
  tariffRate: number;
  estimatedDutyUsd: number;
  occurredAt: string;
  referenceMovementId?: string;
};

export type AdvisorInsight = {
  id: string;
  severity: AdvisorSeverity;
  topic: AdvisorTopic;
  title: string;
  reasoning: string[];
  relatedBoxIds: string[];
  createdAt: string;
};

export type ReportDefinition = {
  id: string;
  title: string;
  category: ReportCategory;
  description: string;
  defaultFormat: ReportFormat;
  columns: string[];
};

export type ReportExportRequest = {
  reportId: string;
  format: ReportFormat;
  filters?: Record<string, string | number | boolean>;
  requestedAt: string;
};

export type ReportExportResult = {
  fileName: string;
  mimeType: string;
  byteLength: number;
  generatedAt: string;
  source: "mock" | "supabase";
};

export type DashboardMetrics = {
  totalBoxes: number;
  availableBoxes: number;
  availableWeightLbs: number;
  heldWeightLbs: number;
  reservedWeightLbs: number;
  totalValueUsd: number;
  estimatedTariffLiabilityUsd: number;
  ftzExposureUsd: number;
  fifoRiskCount: number;
  overrideCount: number;
  recentMovementCount: number;
  needsReviewCount?: number;
};

export type QrPayload = {
  version: 1;
  entity: "inventoryBox" | "movement" | "report";
  id: string;
  label: string;
  generatedAt: string;
  data: Record<string, string | number>;
};

export const storageLocations: StorageLocation[] = [
  { id: "loc-a-01", zone: "A", rack: "A1", bay: "01", row: "A", maxLengthFt: 12, capacityLbs: 52000 },
  { id: "loc-b-04", zone: "B", rack: "B2", bay: "04", row: "B", maxLengthFt: 12, capacityLbs: 52000 },
  { id: "loc-c-02", zone: "C", rack: "C1", bay: "02", row: "C", maxLengthFt: 12, capacityLbs: 50000 },
  { id: "loc-d-03", zone: "D", rack: "D3", bay: "03", row: "D", maxLengthFt: 12, capacityLbs: 50000 },
  { id: "loc-e-05", zone: "E", rack: "E1", bay: "05", row: "E", maxLengthFt: 6, capacityLbs: 28000 },
  { id: "loc-f-01", zone: "F", rack: "F1", bay: "01", row: "F", maxLengthFt: 6, capacityLbs: 28000 },
  { id: "loc-g-08", zone: "G", rack: "G2", bay: "08", row: "G", maxLengthFt: 6, capacityLbs: 26000 },
  { id: "loc-j-02", zone: "J", rack: "J1", bay: "02", row: "J", maxLengthFt: 6, capacityLbs: 26000 }
];

export const inventoryBoxes: InventoryBox[] = [
  {
    id: "box-1001",
    boxNumber: "OGW-A-1001",
    sku: "CU-CATH-A",
    copperForm: "cathode",
    grade: "A",
    weightLbs: 12400,
    countryOfOrigin: "Chile",
    receivedAt: "2026-01-12T09:30:00.000Z",
    warehouseZone: "A",
    locationId: "loc-a-01",
    status: "available",
    ftzStatus: "foreignPrivileged",
    unitValueUsd: 4.18,
    tariffRate: 0.025,
    customerAccount: "Foundry North"
  },
  {
    id: "box-1002",
    boxNumber: "OGW-A-1002",
    sku: "CU-CATH-A",
    copperForm: "cathode",
    grade: "A",
    weightLbs: 11850,
    countryOfOrigin: "Peru",
    receivedAt: "2026-02-03T14:00:00.000Z",
    warehouseZone: "B",
    locationId: "loc-b-04",
    status: "available",
    ftzStatus: "nonPrivilegedForeign",
    unitValueUsd: 4.12,
    tariffRate: 0.03,
    customerAccount: "Great Lakes Wire"
  },
  {
    id: "box-1003",
    boxNumber: "OGW-C-1003",
    sku: "CU-CATH-A",
    copperForm: "cathode",
    grade: "A",
    weightLbs: 13025,
    countryOfOrigin: "United States",
    receivedAt: "2026-03-19T10:15:00.000Z",
    warehouseZone: "C",
    locationId: "loc-c-02",
    status: "held",
    ftzStatus: "domestic",
    unitValueUsd: 4.24,
    tariffRate: 0,
    holdReason: "QC review"
  },
  {
    id: "box-2001",
    boxNumber: "OGW-D-2001",
    sku: "CU-ROD-08",
    copperForm: "rod",
    grade: "C110",
    weightLbs: 8300,
    countryOfOrigin: "Canada",
    receivedAt: "2026-01-25T08:00:00.000Z",
    warehouseZone: "D",
    locationId: "loc-d-03",
    status: "available",
    ftzStatus: "domestic",
    unitValueUsd: 4.31,
    tariffRate: 0
  },
  {
    id: "box-2002",
    boxNumber: "OGW-E-2002",
    sku: "CU-ROD-08",
    copperForm: "rod",
    grade: "C110",
    weightLbs: 7900,
    countryOfOrigin: "Mexico",
    receivedAt: "2026-04-02T13:20:00.000Z",
    warehouseZone: "E",
    locationId: "loc-e-05",
    status: "reserved",
    ftzStatus: "foreignPrivileged",
    unitValueUsd: 4.28,
    tariffRate: 0.015
  },
  {
    id: "box-3001",
    boxNumber: "OGW-F-3001",
    sku: "CU-WIRE-02",
    copperForm: "wire",
    grade: "ETP",
    weightLbs: 5200,
    countryOfOrigin: "Germany",
    receivedAt: "2026-02-18T11:45:00.000Z",
    warehouseZone: "F",
    locationId: "loc-f-01",
    status: "available",
    ftzStatus: "nonPrivilegedForeign",
    unitValueUsd: 4.56,
    tariffRate: 0.04
  },
  {
    id: "box-3002",
    boxNumber: "OGW-G-3002",
    sku: "CU-WIRE-02",
    copperForm: "wire",
    grade: "ETP",
    weightLbs: 6100,
    countryOfOrigin: "Japan",
    receivedAt: "2026-05-01T15:05:00.000Z",
    warehouseZone: "G",
    locationId: "loc-g-08",
    status: "available",
    ftzStatus: "foreignPrivileged",
    unitValueUsd: 4.61,
    tariffRate: 0.035
  },
  {
    id: "box-4001",
    boxNumber: "OGW-J-4001",
    sku: "CU-SCRAP-MIX",
    copperForm: "scrap",
    grade: "Mixed",
    weightLbs: 9700,
    countryOfOrigin: "United States",
    receivedAt: "2026-04-18T16:40:00.000Z",
    warehouseZone: "J",
    locationId: "loc-j-02",
    status: "available",
    ftzStatus: "domestic",
    unitValueUsd: 3.02,
    tariffRate: 0
  }
];

export const movements: Movement[] = [
  {
    id: "mov-001",
    boxId: "box-1001",
    type: "receive",
    toZone: "A",
    occurredAt: "2026-01-12T09:30:00.000Z",
    actor: "Maria Ortiz",
    reason: "Inbound Chile cathode lot"
  },
  {
    id: "mov-002",
    boxId: "box-1002",
    type: "receive",
    toZone: "B",
    occurredAt: "2026-02-03T14:00:00.000Z",
    actor: "Ray Patel",
    reason: "Inbound Peru cathode lot"
  },
  {
    id: "mov-003",
    boxId: "box-3001",
    type: "receive",
    toZone: "F",
    occurredAt: "2026-02-18T11:45:00.000Z",
    actor: "Nora Chen",
    reason: "Inbound wire lot"
  },
  {
    id: "mov-004",
    boxId: "box-1003",
    type: "hold",
    fromZone: "C",
    toZone: "C",
    occurredAt: "2026-03-21T17:10:00.000Z",
    actor: "QC Desk",
    reason: "Chemistry certificate pending"
  },
  {
    id: "mov-005",
    boxId: "box-2002",
    type: "reserve",
    fromZone: "E",
    toZone: "E",
    occurredAt: "2026-05-17T12:30:00.000Z",
    actor: "Shipping Desk",
    reason: "Reserved for SO-8842"
  },
  {
    id: "mov-006",
    boxId: "box-3002",
    type: "transfer",
    fromZone: "G",
    toZone: "G",
    occurredAt: "2026-05-22T09:15:00.000Z",
    actor: "Warehouse Lead",
    reason: "Rack consolidation"
  },
  {
    id: "mov-007",
    boxId: "box-1001",
    type: "withdraw",
    fromZone: "A",
    toZone: "Domestic",
    occurredAt: "2026-06-02T10:00:00.000Z",
    actor: "Compliance Desk",
    reason: "FTZ withdrawal estimate"
  }
];

export const fifoOverrides: FifoOverride[] = [
  {
    id: "ovr-001",
    recommendationId: "fifo-seed-001",
    removedBoxIds: ["box-1003"],
    addedBoxIds: ["box-1002"],
    reason: "Held lot excluded while QC certificate is pending.",
    actor: "Warehouse Supervisor",
    createdAt: "2026-06-04T13:25:00.000Z"
  }
];

export const reportDefinitions: ReportDefinition[] = [
  {
    id: "report-inventory-valuation",
    title: "Inventory Valuation",
    category: "inventory",
    description: "Current copper weight, status, location, and valuation by lot.",
    defaultFormat: "csv",
    columns: ["boxNumber", "sku", "grade", "weightLbs", "warehouseZone", "status", "valueUsd"]
  },
  {
    id: "report-fifo-audit",
    title: "FIFO Audit",
    category: "fifo",
    description: "FIFO pick sequence, exceptions, and override audit support.",
    defaultFormat: "csv",
    columns: ["sku", "requestedWeightLbs", "selectedBoxIds", "shortageLbs", "rationale"]
  },
  {
    id: "report-ftz-compliance",
    title: "FTZ Compliance",
    category: "ftz",
    description: "FTZ status changes, withdrawals, and bonded exposure.",
    defaultFormat: "xlsx",
    columns: ["boxNumber", "ftzStatus", "eventType", "occurredAt", "referenceMovementId"]
  },
  {
    id: "report-tariff-exposure",
    title: "Tariff Exposure",
    category: "tariff",
    description: "Estimated duty exposure by origin, lot, and movement event.",
    defaultFormat: "xlsx",
    columns: ["boxNumber", "countryOfOrigin", "dutiableValueUsd", "tariffRate", "estimatedDutyUsd"]
  },
  {
    id: "report-executive-summary",
    title: "Executive Summary",
    category: "executive",
    description: "Management summary of value, liability, exceptions, and movement velocity.",
    defaultFormat: "pdf",
    columns: ["metric", "value", "risk", "generatedAt"]
  }
];
