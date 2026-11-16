# 🎴 CardFlip : 차세대 인터랙티브 3D 디지털 명함 서비스 (Production MVP & Processing 4 Hybrid)

> **수업 과제 프로토타입에서 실제 배포(Production MVP) 수준으로 진화한 차세대 인터랙티브 3D 디지털 명함 웹 서비스**  
> **기술 스택**: Vite + React 19 + TypeScript + Three.js + Tailwind CSS + Supabase (호환) + Processing 4 (Java 런처 호환)

---

## 📌 1. 프로젝트 소개

**CardFlip**은 평면적인 종이 명함과 단순 2D 링크트리의 한계를 극복하고, 사용자의 다양한 페르소나를 감각적인 3차원 실물 카드로 표현하는 인터랙티브 명함 서비스입니다.  
실제 메탈·유리·홀로그램 카드를 손에 쥐고 만지는 듯한 **3D 물리 회전 및 180° 양면 플립**, 상하좌우 **2축 제스처 조작**, 상대방 스마트폰 주소록에 즉시 저장되는 **vCard(.vcf) 원클릭 내보내기**, 그리고 고유 URL(`/?u=minsu_design`)과 **스마트폰 기본 카메라로 인식하는 실시간 QR 교환 시스템**을 제공합니다.

---

## ✨ 2. 핵심 기능 (Production MVP Features)

1. **퍼블릭 공유 URL & 스마트폰 기본 카메라 QR 인식 (Key Feature #1)**
   - 수신자는 앱 설치나 로그인 없이 링크(`/?u=username`) 클릭 또는 카메라 QR 스캔만으로 3D 명함을 즉시 열람
   - 자이로스코프(기기 기울기)와 터치 드래그로 촉각적인 명함 확인
2. **원클릭 스마트폰 주소록 저장 (`.vcf` vCard 지원)**
   - `[연락처에 저장]` 버튼 클릭 시 iOS Contacts 및 Android 주소록에 이름, 소속, 직무, 전화번호, 이메일, 메모가 즉시 등록
3. **5종 시그니처 3D PBR 스킨 머티리얼**
   - `홀로그램 프리즘(Holographic Prism)`, `무광 흑요석(Matte Obsidian)`, `글래스모피즘(Frost Glass)`, `사이버펑크 네온`, `샴페인 골드`
4. **2축 제스처 내비게이션**
   - **X축 (`←` / `→` 방향키 또는 좌우 스와이프)**: 내 다른 명함으로 즉시 전환 및 새 명함 추가
   - **Y축 (`↑` / `↓` 방향키 또는 상하 스와이프)**: 수집된 3D 스킨 실시간 변경
5. **실제 기기 간 쌍방향 명함 교환 & 지능형 명함첩 (Smart Wallet)**
   - `[내 지갑에 저장]` 클릭 시 방문자 명함첩에 보관
   - ☰ 햄버거 메뉴를 통해 소속별/직무별 자동 분류 및 즐겨찾기, 빠른 전화/메일 연결 지원
6. **Processing 4 완전 호환 (하이브리드 빌드 파이프라인)**
   - 최신 React/TypeScript 웹 앱을 Processing 4 IDE의 재생(▶) 버튼 클릭 1회만으로 로컬 실행 가능하도록 동기화 지원

---

## 🚀 3. 실행 방법 (Quick Start Guide)

### 방법 A. 웹 개발 및 배포 환경 (Vite + React)

```bash
# 1. 루트 또는 web 폴더 이동
cd web

# 2. 패키지 설치
npm install

# 3. 개발 서버 구동 (핫 리로딩 지원)
npm run dev
# ➜ Local: http://localhost:5173/

# 4. 프로덕션 빌드 (배포용 dist 생성)
npm run build
```

#### 🌐 Vercel 무료 배포
본 저장소에는 루트 `vercel.json`이 설정되어 있어, GitHub 레포지토리를 Vercel에 연동하면 **추가 설정 없이 1분 만에 글로벌 배포**됩니다.

---

### 방법 B. 과제 평가 시연용 (Processing 4 원클릭 실행)

1. Processing 4 IDE에서 `CardFlip/CardFlip.pde` 파일을 엽니다.
2. 좌측 상단의 **재생(▶) 버튼을 클릭**합니다.
3. 내장 Java 웹서버가 가동되며 기본 브라우저에 최신 React 3D 명함 앱이 자동으로 열립니다.
4. 웹 코드 수정 후 Processing 반영이 필요할 때는 터미널에서 다음 명령어를 실행합니다:
   ```bash
   cd web
   npm run build:sync
   ```

---

## 🎮 4. 조작 가이드 (Controls & Shortcuts)

| 구분 | 조작 방법 | 기능 설명 |
| :--- | :--- | :--- |
| **3D 카드 틸팅** | 마우스 / 터치 드래그 | 카드를 3차원 공간에서 360° 자유자재로 회전 |
| **앞/뒷면 뒤집기** | 더블 클릭 또는 `Space` 키 | 180° 반전하여 앞면(프로필) ↔ 뒷면(링크/바이오) 전환 |
| **내 명함 전환** | `←` / `→` 방향키 또는 좌우 스와이프 | 보유한 다른 명함으로 슬라이드 |
| **스킨 롤링** | `↑` / `↓` 방향키 또는 상하 스와이프 | 5종 머티리얼 스킨을 즉시 변경 적용 |
| **연락처 저장** | `[연락처에 저장]` 버튼 | 스마트폰 기본 주소록에 `.vcf` vCard 파일로 즉시 추가 |
| **QR/ID 교환** | 하단 중앙 플로팅 QR 버튼 | 내 실시간 QR 보기, 카메라 스캐너, `@ID` 직접 입력 교환 |
| **스마트 명함첩** | 좌측 상단 ☰ 햄버거 버튼 | 소속별/직무별 자동 분류 명함첩 드로어 열기 |

---

## 📁 5. 프로젝트 디렉토리 구조

```text
기말고사 프로젝트_NEW/
├── web/                                 <-- [NEW] 최신 배포용 React/TypeScript 앱
│   ├── src/
│   │   ├── components/
│   │   │   ├── Card3DViewer.tsx         <-- Three.js 3D 엔진 & 5종 PBR 스킨
│   │   │   ├── PublicCardView.tsx       <-- 퍼블릭 공유 랜딩 (vCard 저장 & 공유)
│   │   │   ├── WalletDrawer.tsx         <-- 소속/직무별 스마트 명함첩
│   │   │   ├── QRExchangeModal.tsx      <-- 카메라 스캔 & 실시간 QR 생성 모달
│   │   │   ├── EditCardModal.tsx        <-- 실시간 명함 생성 및 커스텀 모달
│   │   │   └── Toast.tsx                <-- 알림 토스트 UI
│   │   ├── services/
│   │   │   ├── vcard.ts                 <-- 스마트폰 연락처(.vcf) 생성기
│   │   │   ├── qr.ts                    <-- 퍼블릭 URL QR 코드 엔진
│   │   │   ├── storage.ts               <-- 로컬 & 클라우드 데이터 매니저
│   │   │   └── supabase.ts              <-- Supabase DB/Auth 클라이언트
│   │   ├── types/
│   │   │   └── card.ts                  <-- 명함 & 스킨 타입 정의
│   │   ├── App.tsx                      <-- 라우팅 및 2축 제스처 컨트롤러
│   │   └── index.css                    <-- Tailwind CSS 및 글래스모피즘
│   ├── scripts/
│   │   └── sync-to-processing.js        <-- Processing 4 하이브리드 동기화 스크립트
│   └── package.json
├── CardFlip/                            <-- Processing 4 스케치 폴더
│   ├── CardFlip.pde                     <-- Java 내장 HttpServer 호스트 & 런처
│   ├── data/                            <-- React 빌드 번들 서빙 (오프라인 구동)
│   └── data_legacy_backup/              <-- 원본 과제 시연 파일 안전 백업
├── prd.md                               <-- 제품 요구사항 정의서
├── trd.md                               <-- 기술 요구사항 및 아키텍처 정의서
├── vercel.json                          <-- Vercel 클라우드 원클릭 배포 설정
└── README.md                            <-- 본 통합 프로젝트 가이드
```
