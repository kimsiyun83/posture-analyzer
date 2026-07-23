"use client";

import { useState } from "react";

export interface MemberPdfData {
  name: string;
  phone: string | null;
  joinedAtLabel: string;
  medicalHistory: string | null;
  latestPosture: { programType: string; frontScore: number; sideScore: number; dateLabel: string } | null;
  latestInbody: { weightKg: number | null; bodyFatPercent: number | null; bmi: number | null; dateLabel: string } | null;
  aiReports: { typeLabel: string; content: string; dateLabel: string }[];
}

export default function MemberPdfExportButton({ data }: { data: MemberPdfData }) {
  const [state, setState] = useState<"idle" | "building" | "error">("idle");

  async function handleExport() {
    setState("building");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const marginX = 18;
      let y = 20;
      const lineHeight = 7;
      const pageHeight = pdf.internal.pageSize.getHeight();

      function ensureSpace(next: number) {
        if (y + next > pageHeight - 15) {
          pdf.addPage();
          y = 20;
        }
      }

      function heading(text: string) {
        ensureSpace(lineHeight + 2);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text(text, marginX, y);
        y += lineHeight;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
      }

      function body(text: string) {
        const lines = pdf.splitTextToSize(text, 210 - marginX * 2) as string[];
        for (const line of lines) {
          ensureSpace(lineHeight);
          pdf.text(line, marginX, y);
          y += lineHeight - 2;
        }
        y += 3;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(`${data.name} 회원 리포트`, marginX, y);
      y += 10;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`생성일: ${new Date().toLocaleDateString("ko-KR")}`, marginX, y);
      y += lineHeight + 2;

      heading("기본 정보");
      body(`연락처: ${data.phone ?? "-"} / 가입일: ${data.joinedAtLabel}`);
      if (data.medicalHistory) body(`병력: ${data.medicalHistory}`);

      if (data.latestPosture) {
        heading("최근 자세 분석");
        body(
          `${data.latestPosture.programType} (${data.latestPosture.dateLabel}) — 정면 ${data.latestPosture.frontScore}점 / 측면 ${data.latestPosture.sideScore}점`
        );
      }

      if (data.latestInbody) {
        heading("최근 체성분");
        body(
          `체중 ${data.latestInbody.weightKg ?? "-"}kg · 체지방률 ${data.latestInbody.bodyFatPercent ?? "-"}% · BMI ${data.latestInbody.bmi ?? "-"} (${data.latestInbody.dateLabel})`
        );
      }

      if (data.aiReports.length > 0) {
        heading("AI 리포트");
        for (const r of data.aiReports) {
          ensureSpace(lineHeight);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${r.typeLabel} (${r.dateLabel})`, marginX, y);
          y += lineHeight - 2;
          pdf.setFont("helvetica", "normal");
          body(r.content);
        }
      }

      pdf.save(`${data.name}-리포트-${Date.now()}.pdf`);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={state === "building"}
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {state === "building" ? "PDF 생성 중…" : "회원 리포트 PDF 다운로드"}
      </button>
      {state === "error" && <span className="text-sm text-rose-600">PDF 생성에 실패했습니다.</span>}
    </div>
  );
}
