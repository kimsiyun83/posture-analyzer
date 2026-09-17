import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-zinc-500">LULU CARE · 트레이너와 함께 읽는 내 몸의 기록</span>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">체형·자세 스크리닝</h1>
          <p className="text-zinc-600 leading-relaxed">
            정면·측면 사진 한 장씩으로 어깨·골반 좌우 균형, 전방머리자세, 무릎 정렬 등을
            <br className="hidden sm:block" />
            사진 속 관절 추정 위치를 바탕으로 수치화합니다.
            <br className="hidden sm:block" />
            필라테스·패시브 스트레칭·PT 중 수업 유형을 고르면 유형별 핵심 체크포인트를 짚어드리고,
            리포트 이미지를 사진첩에 바로 저장할 수 있습니다.
          </p>
        </div>

        <Link
          href="/analyze"
          className="rounded-full bg-zinc-900 px-8 py-4 text-white font-medium hover:bg-zinc-700 transition-colors"
        >
          측정 시작하기
        </Link>

        <Link href="/analyze/demo" className="rounded-full border border-zinc-300 bg-white px-8 py-4 font-semibold text-zinc-900 hover:border-red-700 hover:text-red-700">
          데모리포트 보기 →
        </Link>
        <p className="text-sm text-zinc-500">로그인·촬영 없이 상세 분석 리포트를 먼저 살펴보세요.<br />9개 항목 해설 · 좌우 비교 · 수업 가이드 · PDF 저장</p>
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-5 text-left text-sm text-zinc-600">
          <p className="font-semibold text-zinc-800">사용 전 안내</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>이 도구는 의료기기가 아니며, 결과는 참고용 스크리닝 지표입니다.</li>
            <li>동일한 촬영 거리·각도·복장으로 반복 측정할수록 변화 추적 정확도가 높아집니다.</li>
            <li>촬영한 사진은 이 기기의 브라우저 안에서만 처리되며 서버로 전송되지 않습니다.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
