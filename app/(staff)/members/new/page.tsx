import { createMemberAction } from "../actions";

export default function NewMemberPage() {
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-bold text-zinc-900">회원 등록</h1>
      <form action={createMemberAction} className="flex flex-col gap-3">
        <Field label="이름 *" name="name" required />
        <Field label="전화번호" name="phone" />
        <Field label="이메일" name="email" type="email" />
        <Field label="생년월일" name="birthDate" type="date" />
        <div>
          <label className="text-sm font-medium text-zinc-700">성별</label>
          <select name="gender" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">선택 안 함</option>
            <option value="M">남성</option>
            <option value="F">여성</option>
            <option value="OTHER">기타</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">병력 / 과거 부상·수술 이력</label>
          <textarea name="medicalHistory" rows={3} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">메모</label>
          <textarea name="memo" rows={2} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="mt-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white">
          등록
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
