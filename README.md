# 스튜디오 관리 플랫폼 (PT · 필라테스 · 패시브 스트레칭)

PT/필라테스/패시브 스트레칭 스튜디오를 위한 회원 관리(CRM) + AI 체형/자세 분석 플랫폼.
회원 등록, 병력/통증 이력, 회원권/결제/출석, 예약, PT·필라테스·스트레칭 세션 기록,
AI 기반 상담노트/운동·식단 추천, InBody OCR, PDF 리포트, 관리자 대시보드를 포함합니다.

## 기술 스택 (실제 구현 vs 원안)

원래 스펙은 Supabase + OpenAI 기반이었으나, **비용이 들지 않고 신규 계정 가입이
필요 없는 대안**으로 우회 구현했습니다. 인터페이스가 분리되어 있어 나중에 유료
서비스로 교체하는 것은 설정 변경 수준의 작업입니다.

| 영역 | 원안 | 실제 구현 | 비고 |
|---|---|---|---|
| DB | Supabase Postgres | Prisma + SQLite (libSQL) | `prisma/schema.prisma`의 `provider`만 바꾸면 Postgres로 전환 |
| 인증 | Supabase Auth | bcrypt + JWT(jose) 세션 쿠키 | 외부 서비스 없음 |
| 체형/자세 분석 AI | OpenAI Vision | MediaPipe Pose (브라우저 내 실행) | 이미 프로덕션에서 사용 중이던 기능 재사용 |
| 인바디 OCR | OpenAI Vision | Tesseract.js (브라우저 내 실행) | `lib/ai/ocr.ts`가 라벨 기반으로 수치 파싱 |
| 상담노트/운동/식단 추천 | GPT | 규칙 기반 엔진 (`lib/ai/engine.ts`) | `AiEngine` 인터페이스 — OpenAI 키를 넣으면 실제 GPT 엔진으로 교체 가능하도록 설계 |
| 결제 | (미지정) | 수동 결제 기록 | 실제 결제 게이트웨이 연동 없음 (Toss 등은 별도 계약 필요) |
| 배포 | Vercel | Vercel | 동일 |

공통 스택: Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma.

## 시작하기

```bash
npm install                 # postinstall이 MediaPipe wasm 자산도 함께 준비합니다
cp .env.example .env        # JWT_SECRET 등 값을 채워주세요
npx prisma migrate dev      # 로컬 SQLite DB 생성
npx tsx prisma/seed.ts      # 최초 관리자 계정 생성 (기본: admin@studio.local / changeme123)
npm run dev
```

`http://localhost:3000/login` 에서 로그인 후 `/dashboard`, `/members`, `/admin` 등을
사용할 수 있습니다. `/` 와 `/analyze` (자세 분석)는 로그인 없이 공개되어 있습니다
(트레이너가 워크인 고객에게 바로 보여주는 용도).

## 배포 시 반드시 알아야 할 점 — SQLite는 프로덕션에서 그대로 쓸 수 없습니다

Vercel(및 대부분의 서버리스 플랫폼)의 함수는 **파일시스템이 요청마다 초기화**됩니다.
로컬 SQLite 파일(`prisma/dev.db`)은 로컬 개발에는 완벽하지만, Vercel에 그대로
배포하면 저장한 데이터가 다음 요청/콜드스타트 때 사라집니다.

**해결 방법 (선택)**:
1. Vercel 대시보드 → 이 프로젝트 → Storage 탭에서 **Postgres**를 추가합니다
   (Hobby 요금제 무료, 기존 Vercel 계정 그대로 사용 — 신규 가입 불필요).
2. `prisma/schema.prisma`에서 `provider = "sqlite"` → `"postgresql"`로 변경합니다.
3. Vercel이 발급한 `DATABASE_URL`을 프로젝트 환경변수에 설정합니다.
4. `npx prisma migrate deploy`로 마이그레이션을 적용합니다.

이 작업을 하지 않으면 정적 페이지(랜딩, `/analyze`)는 정상 동작하지만, 회원
CRM/예약/결제 등 DB 기반 기능은 배포 환경에서 데이터가 유지되지 않습니다.

## 네이버 검색광고 자동화 (선택 기능)

`/admin/ads`에서 네이버 검색광고(searchad.naver.com) 계정을 연결해 파워링크
연관키워드를 분석하고, 규칙 기반으로 입찰가·예산·키워드를 자동 관리할 수
있습니다. 광고주센터 → 도구 → **API 사용 관리**에서 CUSTOMER_ID / API_KEY(액세스
라이선스) / SECRET_KEY를 발급받아 연결합니다. SECRET_KEY는 AES-256-GCM으로
암호화되어 DB에 저장되고 화면에 다시 표시되지 않습니다.

**실제 광고비가 오가는 기능이라 이중 안전장치를 기본으로 뒀습니다.** 다음 두
스위치가 *모두* 켜져 있어야만 실제로 입찰가/예산/키워드가 바뀝니다 — 하나라도
꺼져 있으면 규칙 실행은 "이렇게 바꾸겠다"는 제안만 `AdRunLog`에 기록하고 아무
것도 변경하지 않습니다. 둘 다 기본값은 꺼짐입니다.
1. 계정 단위 "자동 실행" 스위치 (`/admin/ads`에서 계정마다 켜고 끔)
2. 규칙 단위 "활성화" 스위치 (규칙마다 켜고 끔)

지원 규칙 3종 (`lib/services/naverAds/rules.ts`):
- **입찰가 상한 자동 조정**: 키워드 CPC가 상한을 넘으면 지정한 비율만큼 입찰가를 낮춤 (최소 입찰가 하한 보장)
- **무전환 키워드 자동 정지**: 최근 7·30일간 지정 소진액 이상 쓰고 전환이 0건이면 키워드 정지
- **일 예산 초과 시 캠페인 정지**: 오늘 소진액이 지정 상한을 넘으면 캠페인 정지

규칙 실행은 자동 스케줄이 없는 이 앱 구조상(App Router에는 내장 cron이 없음)
외부 스케줄러가 `POST /api/cron/naver-ads`를 호출해야 동작합니다. `CRON_SECRET`을
설정한 뒤 예:

```bash
# crontab: 매시 정각
0 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/naver-ads
```

또는 Vercel을 쓴다면 `vercel.json`에 Cron Job으로 등록해도 됩니다.

**한계**: 네이버 검색광고 API(`lib/services/naverAds/client.ts`)는 공식 문서
([naver/searchad-apidoc](https://github.com/naver/searchad-apidoc))를 기준으로
구현했지만, 실제 발급된 API 키로 라이브 검증은 하지 못했습니다 — 이 세션에는
네이버 검색광고 자격증명이 없었습니다. 계정을 연결한 뒤 "자동 실행"을 켜기 전에,
먼저 스위치를 끈 상태로 며칠간 제안 로그(`AdRunLog`)를 검토해 필드/응답 형식이
실제 계정과 맞는지 확인하는 것을 권장합니다.

## 프로젝트 구조

```
app/
  (staff)/            # 로그인 필요 — 회원/예약/출석/관리자
    members/[id]/     # 회원 상세: 프로필·병력·통증·회원권·결제·출석·
                       # PT·필라테스·스트레칭·자세분석·인바디·AI리포트
    admin/            # 관리자 전용 (통계, 강사 계정 관리)
    admin/ads/        # 관리자 전용 — 네이버 검색광고 자동화
  analyze/            # 공개 — 자세 분석 (MediaPipe, 클라이언트 실행)
  api/                # 세션이 필요한 mutation용 API 라우트
  api/cron/naver-ads/ # 외부 스케줄러가 호출하는 광고 자동화 실행 엔드포인트 (CRON_SECRET)
lib/
  ai/                 # AiEngine 인터페이스 + 규칙 기반 구현, OCR 파서
  pose/               # 자세 분석 알고리즘 (Kendall plumb-line, CVA 근사 등)
  services/           # DB 접근 계층 (도메인별로 분리)
  services/naverAds/  # 네이버 검색광고 API 클라이언트 + 규칙 엔진 + 자격증명 암호화
  auth.ts             # 세션/비밀번호 유틸
  rateLimit.ts        # 로그인 무차별 대입 방지 (인메모리)
prisma/schema.prisma  # 전체 스키마 (users, members, reservations, payments, …)
```

## 보안

- bcrypt(cost 12) 비밀번호 해시, httpOnly+secure 쿠키 JWT 세션
- `proxy.ts`(Next 16의 middleware 후속)에서 라우트 단위 인증/권한 검사, 각 서버
  액션·API 라우트에서도 세션을 재검증(defense in depth)
- 모든 주요 변경 작업은 `AuditLog`에 기록
- 로그인 무차별 대입 방지: IP+이메일 기준 5분당 8회 제한 (인메모리 — 단일
  프로세스 기준이며, 서버리스 다중 인스턴스 환경에서는 완벽하지 않음)
- 보안 헤더(X-Frame-Options, X-Content-Type-Options 등) `next.config.ts`에 설정

## 알려진 한계 (정직하게 밝힙니다)

- **AI 품질**: 상담노트/운동·식단 추천은 실제 GPT가 아닌 규칙 기반 템플릿입니다.
  회원의 실제 데이터(통증 이력, 최근 자세 분석 점수 등)를 반영하지만, GPT 수준의
  자연스러운 문장이나 맥락 이해는 없습니다.
- **인바디 OCR 정확도**: Tesseract.js는 무료지만 상용 Vision API보다 정확도가
  낮을 수 있습니다. 인식 결과를 트레이너가 검토·수정하도록 UI가 설계되어 있습니다.
- **결제**: 실제 결제 게이트웨이 연동이 없습니다 — 트레이너가 수동으로 결제
  내역을 기록하는 방식입니다.
- **멀티테넌트**: 여러 사업장이 한 플랫폼을 공유하는 진짜 멀티테넌트가 아니라,
  한 스튜디오의 트레이너/관리자 여러 명이 함께 쓰는 구조입니다(이 사용 사례에
  더 적합하다고 판단했습니다).
- **다크모드**: 미구현.

## Docker

```bash
docker build -t studio-platform .
docker run -p 3000:3000 --env-file .env studio-platform
```

SQLite 파일을 컨테이너 밖에 유지하려면 `-v $(pwd)/prisma:/app/prisma` 로 볼륨을
마운트하세요. 프로덕션에서는 위 "배포 시 반드시 알아야 할 점"을 따라 Postgres
사용을 권장합니다.
