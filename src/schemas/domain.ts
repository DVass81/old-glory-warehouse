import { z } from "zod";

import type {
  AdvisorInsight,
  AdvisorInput,
  DashboardMetrics,
  FifoOverride,
  FifoRecommendation,
  FtzLedgerEntry,
  InventoryBox,
  InventoryMovement,
  InventoryQuery,
  MovementQuery,
  PaginatedResult,
  ReportDefinition,
  ReportExportRequest,
  ReportExportResult,
  StorageLocation,
  TariffLedgerEntry,
  Warehouse,
} from "@/types/domain";

const nonEmptyString = z.string().trim().min(1);
const isoDateTime = z.string().datetime({ offset: true });
const positiveMoney = z.number().finite().nonnegative();
const positiveWeight = z.number().finite().positive();
const nonNegativeWeight = z.number().finite().nonnegative();

export const appEnvironmentSchema = z.enum(["development", "test", "production"]);
export const dataProviderSchema = z.enum(["mock", "supabase"]);
export const userRoleSchema = z.enum([
  "administrator",
  "purchasing",
  "warehouse",
  "accounting",
  "management",
  "readOnly",
]);
export const copperFormSchema = z.enum(["cathode", "rod", "wire", "scrap", "other"]);
export const copperGradeSchema = z.enum(["cuA", "cuB", "cuC", "recycled", "mixed"]);
export const unitOfMeasureSchema = z.enum(["lb", "kg", "metricTon"]);
export const inventoryStatusSchema = z.enum(["available", "reserved", "picked", "shipped", "held"]);
export const ftzStatusSchema = z.enum(["domestic", "foreignPrivileged", "nonPrivilegedForeign"]);
export const movementTypeSchema = z.enum([
  "receive",
  "transfer",
  "reserve",
  "pick",
  "ship",
  "adjust",
  "hold",
  "release",
]);
export const ftzEventTypeSchema = z.enum(["admit", "transfer", "withdraw", "statusChange", "adjustment"]);
export const tariffEventTypeSchema = z.enum(["estimate", "accrual", "withdrawal", "adjustment"]);
export const advisorSeveritySchema = z.enum(["info", "warning", "critical"]);
export const advisorTopicSchema = z.enum(["fifo", "ftz", "tariff", "inventory", "movement"]);
export const reportExportFormatSchema = z.enum(["csv", "xlsx", "pdf"]);

export const warehouseSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  code: nonEmptyString,
  timezone: nonEmptyString,
}) satisfies z.ZodType<Warehouse>;

export const storageLocationSchema = z.object({
  id: nonEmptyString,
  warehouseId: nonEmptyString,
  zone: nonEmptyString,
  row: nonEmptyString,
  bay: nonEmptyString,
  shelf: nonEmptyString.optional(),
  capacityLbs: nonNegativeWeight,
}) satisfies z.ZodType<StorageLocation>;

export const inventoryBoxSchema = z.object({
  id: nonEmptyString,
  boxNumber: nonEmptyString,
  lotNumber: nonEmptyString,
  sku: nonEmptyString,
  copperForm: copperFormSchema,
  copperGrade: copperGradeSchema,
  weightLbs: positiveWeight,
  unitOfMeasure: unitOfMeasureSchema,
  countryOfOrigin: nonEmptyString,
  receivedAt: isoDateTime,
  warehouseId: nonEmptyString,
  locationId: nonEmptyString,
  warehouseZone: nonEmptyString,
  status: inventoryStatusSchema,
  ftzStatus: ftzStatusSchema,
  unitValueUsd: positiveMoney,
  tariffRate: z.number().finite().min(0).max(1),
  tariffClassCode: nonEmptyString.optional(),
  customerAccountId: nonEmptyString.optional(),
  vendorAccountId: nonEmptyString.optional(),
}) satisfies z.ZodType<InventoryBox>;

export const inventoryMovementSchema = z.object({
  id: nonEmptyString,
  boxId: nonEmptyString,
  type: movementTypeSchema,
  fromLocationId: nonEmptyString.optional(),
  toLocationId: nonEmptyString.optional(),
  fromZone: nonEmptyString.optional(),
  toZone: nonEmptyString.optional(),
  occurredAt: isoDateTime,
  actor: nonEmptyString,
  reason: nonEmptyString.optional(),
}) satisfies z.ZodType<InventoryMovement>;

export const fifoRecommendationSchema = z.object({
  id: nonEmptyString,
  sku: nonEmptyString,
  requestedWeightLbs: positiveWeight,
  selectedBoxIds: z.array(nonEmptyString),
  totalWeightLbs: nonNegativeWeight,
  shortageWeightLbs: nonNegativeWeight,
  rationale: z.array(nonEmptyString),
  createdAt: isoDateTime,
}) satisfies z.ZodType<FifoRecommendation>;

export const fifoOverrideSchema = z.object({
  id: nonEmptyString,
  recommendationId: nonEmptyString,
  removedBoxIds: z.array(nonEmptyString),
  addedBoxIds: z.array(nonEmptyString),
  reason: nonEmptyString,
  actor: nonEmptyString,
  createdAt: isoDateTime,
}) satisfies z.ZodType<FifoOverride>;

export const ftzLedgerEntrySchema = z.object({
  id: nonEmptyString,
  boxId: nonEmptyString,
  eventType: ftzEventTypeSchema,
  ftzStatus: ftzStatusSchema,
  occurredAt: isoDateTime,
  referenceMovementId: nonEmptyString.optional(),
}) satisfies z.ZodType<FtzLedgerEntry>;

export const tariffLedgerEntrySchema = z.object({
  id: nonEmptyString,
  boxId: nonEmptyString,
  eventType: tariffEventTypeSchema,
  dutiableValueUsd: positiveMoney,
  tariffRate: z.number().finite().min(0).max(1),
  estimatedDutyUsd: positiveMoney,
  occurredAt: isoDateTime,
  referenceMovementId: nonEmptyString.optional(),
}) satisfies z.ZodType<TariffLedgerEntry>;

export const dashboardMetricsSchema = z.object({
  availableWeightLbs: nonNegativeWeight,
  heldWeightLbs: nonNegativeWeight,
  estimatedInventoryValueUsd: positiveMoney,
  estimatedTariffLiabilityUsd: positiveMoney,
  ftzExposureUsd: positiveMoney,
  fifoRiskCount: z.number().int().nonnegative(),
  recentMovementCount: z.number().int().nonnegative(),
  overrideCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<DashboardMetrics>;

export const advisorInsightSchema = z.object({
  id: nonEmptyString,
  severity: advisorSeveritySchema,
  topic: advisorTopicSchema,
  title: nonEmptyString,
  reasoning: z.array(nonEmptyString),
  relatedBoxIds: z.array(nonEmptyString),
  createdAt: isoDateTime,
}) satisfies z.ZodType<AdvisorInsight>;

export const dateRangeSchema = z.object({
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
});

export const paginationInputSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(250),
});

export const inventoryQuerySchema = paginationInputSchema.extend({
  warehouseId: nonEmptyString.optional(),
  sku: nonEmptyString.optional(),
  grade: copperGradeSchema.optional(),
  status: inventoryStatusSchema.optional(),
  ftzStatus: ftzStatusSchema.optional(),
  origin: nonEmptyString.optional(),
  search: z.string().trim().optional(),
  receivedRange: dateRangeSchema.optional(),
  sortBy: z.enum(["receivedAt", "weightLbs", "unitValueUsd", "status"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
}) satisfies z.ZodType<InventoryQuery>;

export const movementQuerySchema = paginationInputSchema.extend({
  boxId: nonEmptyString.optional(),
  type: movementTypeSchema.optional(),
  occurredRange: dateRangeSchema.optional(),
  search: z.string().trim().optional(),
}) satisfies z.ZodType<MovementQuery>;

export const reportDefinitionSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  description: nonEmptyString,
  supportedFormats: z.array(reportExportFormatSchema).min(1),
}) satisfies z.ZodType<ReportDefinition>;

export const reportFilterSchema = z.object({
  key: nonEmptyString,
  value: nonEmptyString,
});

export const reportExportRequestSchema = z.object({
  reportId: nonEmptyString,
  format: reportExportFormatSchema,
  filters: z.array(reportFilterSchema),
  columns: z.array(nonEmptyString).optional(),
  dateRange: dateRangeSchema.optional(),
}) satisfies z.ZodType<ReportExportRequest>;

export const reportExportResultSchema = z.object({
  fileName: nonEmptyString,
  mimeType: nonEmptyString,
  byteLength: z.number().int().nonnegative().optional(),
  generatedAt: isoDateTime,
  source: dataProviderSchema,
}) satisfies z.ZodType<ReportExportResult>;

export const advisorInputSchema = z.object({
  inventory: z.array(inventoryBoxSchema),
  movements: z.array(inventoryMovementSchema),
  dashboardMetrics: dashboardMetricsSchema,
}) satisfies z.ZodType<AdvisorInput>;

export const paginatedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    totalItems: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(250),
  }) satisfies z.ZodType<PaginatedResult<z.infer<T>>>;
