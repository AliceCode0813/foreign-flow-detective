# Foreign Flow Detective

**외국인 지분 변화만** 전문 추적하는 웹 서비스입니다.  
대주주·국민연금·지배구조는 범위에서 제외합니다.

## 기술 스택

- Next.js 16 (App Router) + TypeScript (strict)
- Tailwind CSS · Recharts
- PostgreSQL (Supabase 호환) + Prisma
- Python `pykrx` 수집기

## 데이터베이스 테이블

| 테이블 | 설명 |
|--------|------|
| `stocks` | 종목 마스터 (code, name, market, sector) |
| `foreign_ownership_daily` | 일별 외국인 지분·보유주식·상장주식 |
| `rankings_daily` | 1/10/30/60일 변화율 (사전 계산) |
| `stock_market_daily` | 종가·거래량 (차트용) |
| `alerts` | 알림 엔진 출력 |

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/stocks` | 추적 종목 목록 |
| GET | `/api/stocks/[code]` | 종목 상세 + 변화율 |
| GET | `/api/stocks/[code]/history?days=90` | 지분·시세 이력 |
| GET | `/api/rankings?period=60d&limit=10` | TOP N 랭킹 |

## 빠른 시작

### 1. 환경 변수

```powershell
copy .env.example .env
```

`.env`에 Supabase/PostgreSQL URL 설정:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/foreign_flow_detective"
```

### 2. DB 스키마 적용

```powershell
cd C:\dev\foreign-flow-detective
npm install
npm run db:push
```

### 3. 데이터 수집 (3종목)

[KRX 데이터포털](https://data.krx.co.kr) 계정 후:

```powershell
$env:KRX_ID = "아이디"
$env:KRX_PW = "비밀번호"
pip install -r scripts/requirements.txt
npm run ingest
```

수집 종목: 삼성전자(005930), 뉴프렉스(085670), 신성이엔지(011930)

### 4. 앱 실행

```powershell
npm run dev
```

http://localhost:3000

## Supabase 연결

1. Supabase 프로젝트 생성
2. **Settings → Database → Connection string (URI)** 복사
3. `DATABASE_URL`에 붙여넣기 (비밀번호 URL 인코딩 주의)
4. `npm run db:push`

## Vercel 배포 (GitHub)

### 1. GitHub 저장소

```powershell
cd C:\dev\foreign-flow-detective
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/내아이디/foreign-flow-detective.git
git push -u origin main
```

GitHub에서 먼저 **New repository** → `foreign-flow-detective` 생성 (README 추가 안 함).

### 2. Vercel 연결

1. [vercel.com](https://vercel.com) 로그인 → **Add New Project**
2. GitHub 저장소 **Import**
3. **Environment Variables** 추가:

| 이름 | 값 |
|------|-----|
| `DATABASE_URL` | Supabase/Neon PostgreSQL URI |

`KRX_ID`, `KRX_PW`는 Vercel에 넣지 않음 (집 PC ingest 전용).

4. **Deploy** → `https://프로젝트명.vercel.app` 생성

### 3. 클라우드 DB 스키마

로컬 `.env`의 `DATABASE_URL`을 Supabase URI로 바꾼 뒤:

```powershell
npm.cmd run db:push
```

### 4. 데이터 수집 (집 PC)

`.env`의 `DATABASE_URL` = **Supabase URL** (Vercel과 동일)로 두고:

```powershell
npm.cmd run update:daily
```

또는 Windows 스케줄러(`schedule:register`)로 매일 갱신 → Vercel 사이트에 반영.

> **로컬 PostgreSQL**은 Vercel에서 접근 불가. 반드시 **Supabase** 또는 **Neon** 등 클라우드 DB 사용.


## 알림 조건 (ingest 시 자동)

- `CHANGE_60D_05` — 60일 +0.5%p 이상
- `STREAK_5D` — 5거래일 연속 증가
- `NEW_HIGH` — 수집 구간 최고치 갱신

## 프로젝트 구조

```
prisma/schema.prisma
scripts/ingest.py              # pykrx → PostgreSQL
src/lib/services/
  stock-service.ts
  ranking-service.ts
  alert-service.ts
src/app/api/                   # REST API
```

## Mock 데이터

**제거됨.** DB에 데이터가 없으면 Empty State가 표시됩니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run db:push` | 스키마 → DB 반영 |
| `npm run ingest` | KRX 데이터 수집 (전종목, 최초 120일) |
| `npm run update:daily` | 일 1회 업데이트 (종목 동기화 + 최근 14일 수집) |
| `npm run schedule:register` | Windows 작업 스케줄러 등록 (매일 19:00) |
| `npm run backfill:rankings` | 1일 변화율 재계산 |
| `npm run db:studio` | Prisma Studio |
