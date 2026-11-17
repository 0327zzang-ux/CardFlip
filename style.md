# 🎨 CardFlip 3D : 디자인 시스템 & 스타일 가이드 (`style.md`)

> **문서 버전**: v2.0 (최신 구현 반영본)  
> **기반 스택**: Tailwind CSS v4, Three.js WebGL, Pretendard Webfont  
> **디자인 철학**: 안드로이드 Material 3 기반의 촉각적 인터랙션 + 미니멀 2D 글래스모피즘 + 3D 물리 관성 회전

---

## 1. 디자인 철학 및 비주얼 아이덴티티

1. **Android Native Touch & Feel**:
   - 모바일 세로 풀스크린 몰입감(No Chrome)을 기본으로 하며, 안드로이드 표준 제스처(드래그, 스와이프, 바텀 시트)를 준수합니다.
2. **Tactile Skeuomorphism in 3D (홈 화면)**:
   - 스마트폰 세로 화면에 최적화된 90° 시계방향 회전 텍스트 대표 명함.
   - 손가락 움직임 속도를 반영한 자연스러운 **관성 회전(Inertia)**과 감속(Damping), 그리고 **단 한 번의 터치로 수직 앞/뒷면 똑바로 정렬**.
3. **Pure Minimal 2-Layer Dock (바텀 시트)**:
   - 프레임 테두리 박스와 안내 텍스트를 전면 배제한 순수 미니멀리즘.
   - 앞단의 2D 정면 투명 명함(`Card2DTransparent`)과 뒷단의 순수 컬러 스킨 플레이트가 겹쳐져, 스킨 색상이 명함 텍스트 뒤로 그대로 투영되는 물리적 2층 구조.
4. **Physical Snap & Elasticity**:
   - 모든 스와이프 제스처에서 손가락을 실시간 1:1로 추적하며, 손을 뗐을 때 50% 임계값을 기준으로 정밀하게 스냅(Snap-Move / Snap-Back)합니다.

---

## 2. 컬러 시스템 (Color Palette)

### 2.1 서피스 & 백그라운드 (Surfaces)
| 토큰명 | CSS 변수 | HEX / RGBA | 용도 |
| :--- | :--- | :--- | :--- |
| **App Background** | `--color-app-bg` | `#070810` / `#0c0d14` | 최하단 메인 캔버스 배경 |
| **Surface Card** | `--color-surface-card` | `#12131f` | 모달 팝업, 카드 백드롭 기본면 |
| **Surface Sheet** | `--color-surface-sheet` | `#070810/95` | 바텀 시트 백드롭 블러 배경 |
| **Surface Elevated** | `--color-surface-elevated`| `#1a1b2e` | 1.5초 롱프레스 플로팅 카드 |
| **Glass Surface** | `--color-surface-glass` | `rgba(255, 255, 255, 0.02)` | 바텀 시트 2D 투명 명함 바탕 |

### 2.2 기능성 악센트 컬러 (Accents)
| 역할 | CSS 변수 | HEX | 설명 |
| :--- | :--- | :--- | :--- |
| **Primary Sky** | `--color-accent-sky` | `#38bdf8` | 메인 포커스, 링크, 현재 대표 배지 |
| **Brand Indigo** | `--color-accent-indigo` | `#6366f1` | 대표 설정 버튼 그라디언트 |
| **Cyber Purple** | `--color-accent-purple` | `#a855f7` | 홀로그램 포인트 조명 |
| **Electric Neon** | `--color-accent-neon` | `#06b6d4` | 사이버 HUD, 발광 보더 |
| **Champagne Gold**| `--color-accent-gold` | `#eab308` | 메탈릭 럭셔리 포인트 |
| **Success Emerald**| `--color-accent-emerald`| `#10b981` | 신규 생성(+), 성공 배지 |
| **Danger Rose** | `--color-accent-rose` | `#f43f5e` | 삭제 버튼, 경고 알림 |

### 2.3 5종 시그니처 명함 스킨 프리셋 (Skin Presets)
```
1. 🌈 홀로그램 프리즘 (Hologram Prism)
   - 재질: MeshPhysicalMaterial (Metalness 0.35, Roughness 0.32, Clearcoat 0.7)
   - 비주얼: 빛 반사 각도에 반응하는 무지개 스펙트럼 인디고/바이올렛 그라디언트

2. ⬛ 무광 흑요석 (Obsidian Matte)
   - 재질: MeshStandardMaterial (Metalness 0.15, Roughness 0.65)
   - 비주얼: 질감이 느껴지는 매트 카본 딥블랙 + 정교한 실버 타이포그래피

3. 🪟 글래스모피즘 (Frosted Glass)
   - 재질: MeshPhysicalMaterial (Transmission 0.75, Roughness 0.18, Opacity 0.96)
   - 비주얼: 반투명 젖은 아크릴 굴절 효과 및 은은한 시안 림 라이트

4. ⚡ 사이버 네온 (Cyber Neon)
   - 재질: MeshStandardMaterial (Emissive #06b6d4, EmissiveIntensity 0.28)
   - 비주얼: 미래형 회로 그리드 패턴과 전기적 네온 발광 테두리

5. 👑 샴페인 골드 (Champagne Gold)
   - 재질: MeshStandardMaterial (Metalness 0.88, Roughness 0.18)
   - 비주얼: 헤어라인 브러시드 골드 메탈릭 텍스처 및 고급스러운 스펙큘러
```

---

## 3. 타이포그래피 (Typography)

* **기본 본문/제목 폰트**: `Pretendard`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`
* **코드/식별자 폰트**: `'JetBrains Mono'`, `'Fira Code'`, `ui-monospace`

| 계층 | 크기 | 자간 / 굵기 | 사용 위치 |
| :--- | :--- | :--- | :--- |
| **Hero Title** | `20px ~ 24px` | Bold (700) | 모달 헤더, 주요 카드 타이틀 |
| **Card Name (3D)** | `64px` (Texture) | Bold (700) + 드롭 섀도우 | 3D 명함 앞면 사용자 이름 |
| **Card Name (2D)** | `22px ~ 24px` | Black (900) + 드롭 섀도우 | 바텀 시트 2D 투명 명함 이름 |
| **Card Affiliation**| `26px` (Texture) | Bold (700) | 3D 명함 소속 뱃지 |
| **Section Heading** | `13px ~ 14px` | SemiBold (600) | 바텀 시트 버튼 텍스트, 탭 라벨 |
| **Body / Description**| `11px ~ 12px` | Medium (500) | 서브 설명, 연락처 부가 정보 |
| **Unique Code / Badge**| `10px` | Mono Bold (700) | `@고유코드`, 상태 표시 태그 |

---

## 4. 화면별 컴포넌트 시스템 명세

### 4.1 홈 화면 (Home Stage)
* **세로 스마트폰 뷰포트**: `w-full max-w-md h-dvh md:h-[min(94vh,860px)] md:rounded-[40px] relative overflow-hidden bg-[#0c0d14]`
* **3D 대표 명함 (`Card3DViewer`)**:
  - `isHorizontal={false}`, `isLarge={true}`
  - 가로 명함 텍스트를 시계방향 90도 회전(`rotate(Math.PI / 2)`)하여 렌더링.
  - 관성 물리 회전: `velocity *= 0.94` 감속으로 자연스러운 스핀 후 정지.
  - 단일 탭: `triggerSingleTapAlign()` 호출로 수직 앞/뒷면 똑바로 정렬.
  - 정면 조명: 전방향 환경광(`0.95`) + 듀얼 정면 키라이트(`0.95`)로 그늘 없는 고휘도 선명도 확보.
* **하단 컨트롤러**:
  - 하단 정중앙 QR 버튼: `w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl`
  - 최하단 바텀 시트 핸들: `w-16 h-1.5 rounded-full bg-white/30` (위로 120px 드래그 시 50% 스냅 오픈)

### 4.2 바텀 시트 화면 (`CrossCarouselBottomSheet`)
* **미니멀 레이아웃**: 프레임 박스 없음, 안내 문구 완전 배제.
* **상/하 스킨 플레이트 (`SkinPlateVisual`)**: `width: 300px`, `height: 88px`, 순수 컬러/그라데이션 판.
* **중앙 2-Layer 도크**:
  - 뒷단 (Layer 1): `width: 300px`, `height: 190px`, 중앙 도킹 위치에 고정된 활성 스킨 플레이트.
  - 앞단 (Layer 2): `width: 300px`, `height: 190px`, 2D 투명 명함 트랙.
* **`0번 [+ 새 명함 제작]` 슬롯**:
  - `width: 300px`, `height: 190px`, `border-2 border-dashed border-white/40`.
  - 정중앙 `w-13 h-13 rounded-2xl border-2 border-white/90 bg-black/50` 안쪽에 `Plus(text-emerald-400 stroke-[3])` 배치. 설명 텍스트 없음.
* **우측 피크(Peek-in)**: 수평 트랙 오프셋 정렬을 통해 우측 다음 명함의 일부(~40px) 노출.
* **하단 2단 수직 버튼**:
  - 상단: `[★ 대표 명함으로 설정]` (또는 `[★ 현재 대표 명함]`)
  - 하단: `[명함첩]`
  - 동일 규격 `w-full max-w-[300px] py-3.5 px-6 rounded-2xl text-xs font-bold`.
* **1.5초 롱프레스**: 1.5초 유지 시 `scale-105 shadow-[0_24px_60px_rgba(0,0,0,0.95)] ring-2 ring-sky-400` 플로팅. 드래그 시 순서 맞바꿈, 손을 떼면 편집 모달 오픈.

---

## 5. 제스처 물리 파라미터 (Physics & Thresholds)

```typescript
// 물리 상수 테이블
export const GESTURE_CONSTANTS = {
  CARD_WIDTH: 300,              // 카드 폭 (px)
  CARD_GAP: 16,                 // 카드 간격 (px)
  CARD_STEP: 316,               // 카드 스텝 (CARD_WIDTH + CARD_GAP)
  CARD_SNAP_THRESHOLD: 158,     // 명함 수평 스냅 임계값 (50%)
  SKIN_SNAP_THRESHOLD: 50,      // 스킨 수직 스냅 임계값 (50%)
  SHEET_OPEN_THRESHOLD: 120,    // 바텀 시트 열기 스냅 임계값 (50%)
  SHEET_CLOSE_THRESHOLD: 120,   // 바텀 시트 닫기 스냅 임계값 (50%)
  DRAWER_CLOSE_THRESHOLD: 140,  // 명함첩 서랍 닫기 스냅 임계값 (50%)
  INERTIA_DAMPING: 0.94,        // 관성 회전 감속비
  INERTIA_MAX_SPEED: 0.055,     // 최대 관성 속도 제한
};
```
