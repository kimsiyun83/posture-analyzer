// Shared literal-union types backing the String columns in prisma/schema.prisma.
// SQLite has no native enum type, so these are enforced here at the app boundary
// instead of in the schema (documented per-field in schema.prisma).

export const SESSION_TYPES = ["PT", "PILATES", "STRETCHING"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const RESERVATION_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const PILATES_EQUIPMENT = ["REFORMER", "CADILLAC", "CHAIR", "BARREL", "MAT"] as const;
export type PilatesEquipment = (typeof PILATES_EQUIPMENT)[number];

export const PILATES_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type PilatesLevel = (typeof PILATES_LEVELS)[number];

export const AI_REPORT_TYPES = [
  "CONSULTATION_NOTE",
  "EXERCISE_RECOMMENDATION",
  "DIET_RECOMMENDATION",
  "PDF_SUMMARY",
] as const;
export type AiReportType = (typeof AI_REPORT_TYPES)[number];

export const GENDERS = ["M", "F", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const SESSION_TYPE_LABEL_KO: Record<SessionType, string> = {
  PT: "PT",
  PILATES: "필라테스",
  STRETCHING: "패시브 스트레칭",
};

export const PAYMENT_METHOD_LABEL_KO: Record<PaymentMethod, string> = {
  CASH: "현금",
  CARD: "카드",
  TRANSFER: "계좌이체",
  OTHER: "기타",
};

export const RESERVATION_STATUS_LABEL_KO: Record<ReservationStatus, string> = {
  SCHEDULED: "예정",
  COMPLETED: "완료",
  CANCELLED: "취소",
  NO_SHOW: "노쇼",
};

export const PILATES_EQUIPMENT_LABEL_KO: Record<PilatesEquipment, string> = {
  REFORMER: "리포머",
  CADILLAC: "캐딜락",
  CHAIR: "체어",
  BARREL: "바렐",
  MAT: "매트",
};

export const PILATES_LEVEL_LABEL_KO: Record<PilatesLevel, string> = {
  BEGINNER: "입문",
  INTERMEDIATE: "중급",
  ADVANCED: "고급",
};
