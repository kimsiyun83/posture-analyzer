"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseInbodyText, type ParsedInbodyFields } from "@/lib/ai/ocr";

interface InbodyUploadProps {
  memberId: string;
}

const FIELD_LABELS: Record<keyof ParsedInbodyFields, string> = {
  weightKg: "체중(kg)",
  skeletalMuscleKg: "골격근량(kg)",
  bodyFatMassKg: "체지방량(kg)",
  bodyFatPercent: "체지방률(%)",
  bmi: "BMI",
  visceralFatLevel: "내장지방레벨",
};

export default function InbodyUpload({ memberId }: InbodyUploadProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "reading" | "review" | "saving">("idle");
  const [fields, setFields] = useState<ParsedInbodyFields>({});
  const [rawText, setRawText] = useState("");
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus("reading");
    setError(null);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("kor+eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setRawText(data.text);
      setConfidence(data.confidence);
      setFields(parseInbodyText(data.text));
      setStatus("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 인식에 실패했습니다.");
      setStatus("idle");
    }
  }

  async function handleSave() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/members/${memberId}/inbody`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, ocrRawText: rawText, ocrConfidence: confidence }),
      });
      if (!res.ok) throw new Error("저장에 실패했습니다.");
      setStatus("idle");
      setFields({});
      setRawText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setStatus("review");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-sm"
        />
        {status === "reading" && <span className="text-sm text-zinc-500">이미지 인식 중…</span>}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {status === "review" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">
            자동 인식 결과입니다. 값이 틀렸다면 직접 수정한 뒤 저장해 주세요. (인식 신뢰도:{" "}
            {confidence != null ? `${confidence.toFixed(0)}%` : "-"})
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(FIELD_LABELS) as (keyof ParsedInbodyFields)[]).map((key) => (
              <div key={key}>
                <label className="text-xs text-zinc-500">{FIELD_LABELS[key]}</label>
                <input
                  type="number"
                  step="0.1"
                  value={fields[key] ?? ""}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [key]: e.target.value === "" ? undefined : Number(e.target.value) }))
                  }
                  className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={status !== "review"}
            className="mt-1 w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            저장
          </button>
        </div>
      )}
      {status === "saving" && <p className="text-sm text-zinc-500">저장 중…</p>}
    </div>
  );
}
