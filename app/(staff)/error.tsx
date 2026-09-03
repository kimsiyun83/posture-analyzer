"use client";

export default function StaffError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-lg font-bold text-zinc-900">오류가 발생했습니다</h1>
      <p className="max-w-md text-sm text-zinc-600">{error.message || "알 수 없는 오류가 발생했습니다."}</p>
      {error.digest && <p className="text-xs text-zinc-400">오류 코드: {error.digest}</p>}
      <button
        onClick={() => unstable_retry()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        다시 시도
      </button>
    </div>
  );
}
