// Parses raw OCR text from an InBody-style body composition report. Numbers on
// these reports are consistently printed near a recognizable Korean or English
// label, so matching is done per-field with a handful of label variants rather
// than relying on fixed layout/position (OCR text order is not reliable).

export interface ParsedInbodyFields {
  weightKg?: number;
  skeletalMuscleKg?: number;
  bodyFatMassKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  visceralFatLevel?: number;
}

interface FieldPattern {
  key: keyof ParsedInbodyFields;
  labels: string[];
}

const FIELD_PATTERNS: FieldPattern[] = [
  { key: "weightKg", labels: ["체중", "Weight"] },
  { key: "skeletalMuscleKg", labels: ["골격근량", "Skeletal Muscle Mass", "SMM"] },
  { key: "bodyFatMassKg", labels: ["체지방량", "Body Fat Mass"] },
  { key: "bodyFatPercent", labels: ["체지방률", "PBF", "Percent Body Fat"] },
  { key: "bmi", labels: ["BMI"] },
  { key: "visceralFatLevel", labels: ["내장지방레벨", "내장지방", "Visceral Fat Level", "VFL"] },
];

export function parseInbodyText(rawText: string): ParsedInbodyFields {
  const result: ParsedInbodyFields = {};
  const lines = rawText.split(/\r?\n/);

  for (const pattern of FIELD_PATTERNS) {
    for (const line of lines) {
      const hasLabel = pattern.labels.some((label) => line.includes(label));
      if (!hasLabel) continue;
      const match = line.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        result[pattern.key] = Number(match[1]);
        break;
      }
    }
  }

  return result;
}
