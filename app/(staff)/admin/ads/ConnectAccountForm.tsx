"use client";

import { useActionState } from "react";
import { connectAccountAction, type ActionState } from "./actions";

export default function ConnectAccountForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(connectAccountAction, {});

  return (
    <form
      action={formAction}
      autoComplete="off"
      className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 p-3"
    >
      <Field label="계정 이름" name="label" placeholder="OO스튜디오 네이버광고" required />
      <Field
        label="CUSTOMER_ID (숫자 6~8자리)"
        name="naverCustomerId"
        placeholder="1749296"
        pattern="[0-9]{6,8}"
        title="네이버 CUSTOMER_ID는 6~8자리 숫자입니다. 이메일이 아닙니다."
        required
      />
      <Field label="API_KEY (액세스 라이선스)" name="naverApiKey" required />
      <Field label="SECRET_KEY" name="naverSecretKey" type="password" required />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "연결 중…" : "연결"}
      </button>
      {state.error && <p className="w-full text-sm text-rose-600">{state.error}</p>}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  pattern,
  title,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
  title?: string;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-500">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        pattern={pattern}
        title={title}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
