import { notFound } from "next/navigation";
import Link from "next/link";
import { getMemberDetail } from "@/lib/services/members";
import {
  PAYMENT_METHOD_LABEL_KO,
  PAYMENT_METHODS,
  PILATES_EQUIPMENT,
  PILATES_EQUIPMENT_LABEL_KO,
  PILATES_LEVELS,
  PILATES_LEVEL_LABEL_KO,
  SESSION_TYPE_LABEL_KO,
  SESSION_TYPES,
} from "@/lib/types";
import { PROGRAM_META, type ProgramType } from "@/lib/pose/programs";
import {
  addExerciseLogAction,
  addPackageAction,
  addPainRecordAction,
  addPaymentAction,
  addPersonalRecordAction,
  addPilatesRecordAction,
  addStretchLogAction,
  checkInAction,
  updateMemberAction,
} from "../actions";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMemberDetail(id);
  if (!member) notFound();

  const updateAction = updateMemberAction.bind(null, member.id);
  const painAction = addPainRecordAction.bind(null, member.id);
  const packageAction = addPackageAction.bind(null, member.id);
  const paymentAction = addPaymentAction.bind(null, member.id);
  const checkinAction = checkInAction.bind(null, member.id);
  const exerciseLogAction = addExerciseLogAction.bind(null, member.id);
  const personalRecordAction = addPersonalRecordAction.bind(null, member.id);
  const pilatesRecordAction = addPilatesRecordAction.bind(null, member.id);
  const stretchLogAction = addStretchLogAction.bind(null, member.id);

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">{member.name}</h1>
        <p className="text-sm text-zinc-500">
          {member.phone ?? "연락처 없음"} · 가입일 {member.joinedAt.toLocaleDateString("ko-KR")}
        </p>
      </div>

      <Section title="프로필 · 병력">
        <form action={updateAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LabeledInput label="이름" name="name" defaultValue={member.name} />
          <LabeledInput label="전화번호" name="phone" defaultValue={member.phone ?? ""} />
          <LabeledInput label="이메일" name="email" defaultValue={member.email ?? ""} />
          <LabeledInput
            label="생년월일"
            name="birthDate"
            type="date"
            defaultValue={member.birthDate ? member.birthDate.toISOString().slice(0, 10) : ""}
          />
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-zinc-700">병력 / 과거 부상·수술 이력</label>
            <textarea
              name="medicalHistory"
              rows={3}
              defaultValue={member.medicalHistory ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-zinc-700">메모</label>
            <textarea
              name="memo"
              rows={2}
              defaultValue={member.memo ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              저장
            </button>
          </div>
        </form>
      </Section>

      <Section title="통증 이력">
        <form action={painAction} className="mb-4 flex flex-wrap items-end gap-2">
          <MiniField label="부위" name="bodyPart" required />
          <MiniField label="설명" name="description" />
          <div>
            <label className="text-xs text-zinc-500">강도(1-10)</label>
            <input
              name="severity"
              type="number"
              min={1}
              max={10}
              defaultValue={5}
              className="mt-0.5 w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium">
            추가
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {member.painRecords.map((p) => (
            <li key={p.id} className="rounded-lg border border-zinc-200 p-2">
              <span className="font-medium">{p.bodyPart}</span> · 강도 {p.severity}/10
              {p.description && <span className="text-zinc-500"> — {p.description}</span>}
              <span className="ml-2 text-xs text-zinc-400">{p.recordedAt.toLocaleDateString("ko-KR")}</span>
            </li>
          ))}
          {member.painRecords.length === 0 && <li className="text-zinc-400">기록 없음</li>}
        </ul>
      </Section>

      <Section title="회원권">
        <form action={packageAction} className="mb-4 flex flex-wrap items-end gap-2">
          <MiniField label="이름" name="name" required placeholder="PT 20회권" />
          <div>
            <label className="text-xs text-zinc-500">유형</label>
            <select name="sessionType" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_TYPE_LABEL_KO[t]}
                </option>
              ))}
              <option value="MIXED">혼합</option>
            </select>
          </div>
          <MiniField label="총 횟수" name="totalSessions" type="number" />
          <MiniField label="금액" name="price" type="number" required />
          <MiniField label="만료일" name="endDate" type="date" />
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium">
            추가
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {member.packages.map((p) => (
            <li key={p.id} className="rounded-lg border border-zinc-200 p-2">
              <span className="font-medium">{p.name}</span> · {p.remainingSessions ?? "-"}/{p.totalSessions ?? "-"}회 남음 ·{" "}
              {p.price.toLocaleString("ko-KR")}원
            </li>
          ))}
          {member.packages.length === 0 && <li className="text-zinc-400">등록된 회원권 없음</li>}
        </ul>
      </Section>

      <Section title="결제 내역">
        <form action={paymentAction} className="mb-4 flex flex-wrap items-end gap-2">
          <MiniField label="금액" name="amount" type="number" required />
          <div>
            <label className="text-xs text-zinc-500">결제수단</label>
            <select name="method" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL_KO[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">연결 회원권</label>
            <select name="packageId" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="">없음</option>
              {member.packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <MiniField label="메모" name="memo" />
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium">
            기록
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {member.payments.map((p) => (
            <li key={p.id} className="rounded-lg border border-zinc-200 p-2">
              {p.amount.toLocaleString("ko-KR")}원 · {PAYMENT_METHOD_LABEL_KO[p.method as keyof typeof PAYMENT_METHOD_LABEL_KO]} ·{" "}
              {p.paidAt.toLocaleDateString("ko-KR")}
              {p.memo && <span className="text-zinc-500"> — {p.memo}</span>}
            </li>
          ))}
          {member.payments.length === 0 && <li className="text-zinc-400">결제 내역 없음</li>}
        </ul>
      </Section>

      <Section title="출석">
        <form action={checkinAction} className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-zinc-500">수업 유형</label>
            <select name="sessionType" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_TYPE_LABEL_KO[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">차감할 회원권</label>
            <select name="packageId" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="">없음</option>
              {member.packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
            체크인
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {member.attendance.map((a) => (
            <li key={a.id} className="rounded-lg border border-zinc-200 p-2">
              {SESSION_TYPE_LABEL_KO[a.sessionType as keyof typeof SESSION_TYPE_LABEL_KO]} ·{" "}
              {a.checkedInAt.toLocaleString("ko-KR")}
            </li>
          ))}
          {member.attendance.length === 0 && <li className="text-zinc-400">출석 기록 없음</li>}
        </ul>
      </Section>

      <Section title="PT 운동 기록">
        <form action={exerciseLogAction} className="mb-3 flex flex-wrap items-end gap-2">
          <MiniField label="운동명" name="exerciseName" required placeholder="스쿼트" />
          <MiniField label="횟수" name="reps" type="number" />
          <MiniField label="중량(kg)" name="weightKg" type="number" />
          <MiniField label="메모" name="notes" />
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium">
            기록
          </button>
        </form>
        <form action={personalRecordAction} className="mb-4 flex flex-wrap items-end gap-2">
          <MiniField label="PR 종목" name="exerciseName" required placeholder="데드리프트" />
          <MiniField label="기록값" name="value" type="number" required />
          <div>
            <label className="text-xs text-zinc-500">단위</label>
            <select name="unit" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="kg">kg</option>
              <option value="reps">회</option>
              <option value="sec">초</option>
            </select>
          </div>
          <button type="submit" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
            PR 등록
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {member.exerciseLogs.map((e) => {
            const sets = Array.isArray(e.setsJson) ? (e.setsJson as { reps: number; weightKg?: number }[]) : [];
            return (
              <li key={e.id} className="rounded-lg border border-zinc-200 p-2">
                <span className="font-medium">{e.exerciseName}</span>{" "}
                {sets.map((s, i) => (
                  <span key={i} className="text-zinc-500">
                    {i > 0 && ", "}
                    {s.reps}회{s.weightKg ? ` x ${s.weightKg}kg` : ""}
                  </span>
                ))}
                <span className="ml-2 text-xs text-zinc-400">{e.sessionDate.toLocaleDateString("ko-KR")}</span>
              </li>
            );
          })}
          {member.personalRecords.map((p) => (
            <li key={p.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2">
              PR: <span className="font-medium">{p.exerciseName}</span> {p.value}
              {p.unit} <span className="ml-2 text-xs text-zinc-400">{p.achievedAt.toLocaleDateString("ko-KR")}</span>
            </li>
          ))}
          {member.exerciseLogs.length === 0 && member.personalRecords.length === 0 && (
            <li className="text-zinc-400">기록 없음</li>
          )}
        </ul>
      </Section>

      <Section title="필라테스 기록">
        <form action={pilatesRecordAction} className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-zinc-500">기구</label>
            <select name="equipment" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              {PILATES_EQUIPMENT.map((eq) => (
                <option key={eq} value={eq}>
                  {PILATES_EQUIPMENT_LABEL_KO[eq]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">레벨</label>
            <select name="level" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              {PILATES_LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {PILATES_LEVEL_LABEL_KO[lv]}
                </option>
              ))}
            </select>
          </div>
          <MiniField label="주요 동작" name="exerciseName" placeholder="풀업" />
          <MiniField label="메모" name="notes" />
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium">
            기록
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {member.pilatesRecords.map((p) => {
            const exercises = Array.isArray(p.exercisesJson) ? (p.exercisesJson as { name: string }[]) : [];
            return (
              <li key={p.id} className="rounded-lg border border-zinc-200 p-2">
                {PILATES_EQUIPMENT_LABEL_KO[p.equipment as keyof typeof PILATES_EQUIPMENT_LABEL_KO]} ·{" "}
                {PILATES_LEVEL_LABEL_KO[p.level as keyof typeof PILATES_LEVEL_LABEL_KO]}
                {exercises.length > 0 && (
                  <span className="text-zinc-500"> — {exercises.map((e) => e.name).join(", ")}</span>
                )}
                {p.notes && <span className="text-zinc-500"> ({p.notes})</span>}
                <span className="ml-2 text-xs text-zinc-400">{p.classDate.toLocaleDateString("ko-KR")}</span>
              </li>
            );
          })}
          {member.pilatesRecords.length === 0 && <li className="text-zinc-400">기록 없음</li>}
        </ul>
      </Section>

      <Section title="패시브 스트레칭 기록">
        <form action={stretchLogAction} className="mb-4 flex flex-wrap items-end gap-2">
          <MiniField label="부위" name="bodyPart" required placeholder="햄스트링" />
          <MiniField label="강도(1-5)" name="intensity" type="number" />
          <MiniField label="ROM 전" name="romBefore" type="number" />
          <MiniField label="ROM 후" name="romAfter" type="number" />
          <MiniField label="통증 전(0-10)" name="painBefore" type="number" />
          <MiniField label="통증 후(0-10)" name="painAfter" type="number" />
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium">
            기록
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {member.stretchLogs.map((s) => (
            <li key={s.id} className="rounded-lg border border-zinc-200 p-2">
              <span className="font-medium">{s.bodyPart}</span> · 강도 {s.intensity}/5
              {s.romBefore != null && s.romAfter != null && (
                <span className="text-zinc-500">
                  {" "}
                  · ROM {s.romBefore}° → {s.romAfter}°
                </span>
              )}
              {s.painBefore != null && s.painAfter != null && (
                <span className="text-zinc-500">
                  {" "}
                  · 통증 {s.painBefore} → {s.painAfter}
                </span>
              )}
              <span className="ml-2 text-xs text-zinc-400">{s.sessionDate.toLocaleDateString("ko-KR")}</span>
            </li>
          ))}
          {member.stretchLogs.length === 0 && <li className="text-zinc-400">기록 없음</li>}
        </ul>
      </Section>

      <Section title="자세 분석 기록">
        <Link
          href={`/analyze?memberId=${member.id}`}
          className="mb-4 inline-block w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          새로 측정하기
        </Link>
        <ul className="flex flex-col gap-2 text-sm">
          {member.postureResults.map((p) => (
            <li key={p.id} className="rounded-lg border border-zinc-200 p-2">
              {PROGRAM_META[p.programType as ProgramType]?.label ?? p.programType} · 정면 {p.frontScore}점 · 측면{" "}
              {p.sideScore}점 · {p.measuredAt.toLocaleDateString("ko-KR")}
            </li>
          ))}
          {member.postureResults.length === 0 && <li className="text-zinc-400">측정 기록 없음</li>}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

function LabeledInput({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function MiniField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-500">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
