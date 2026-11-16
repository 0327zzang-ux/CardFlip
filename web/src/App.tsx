import { useState, useEffect, useCallback, useRef } from 'react';
import { type CardData, type SkinId, SKINS } from './types/card';
import { storage } from './services/storage';
import { Card3DViewer } from './components/Card3DViewer';
import { PublicCardView } from './components/PublicCardView';
import { WalletDrawer } from './components/WalletDrawer';
import { QRExchangeModal } from './components/QRExchangeModal';
import { EditCardModal } from './components/EditCardModal';
import { SkinSlotCarousel } from './components/SkinSlotCarousel';
import { Toast } from './components/Toast';
import {
  RotateCw,
  QrCode,
  Edit3,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  X,
  Share2,
  Trash2,
  FolderHeart
} from 'lucide-react';

export default function App() {
  const [myCards, setMyCards] = useState<CardData[]>(() => storage.getMyCards());
  // activeIdx: -1이면 '+' 새 명함 제작 슬롯, 0 이상이면 보유 명함 인덱스
  const [activeIdx, setActiveIdx] = useState<number>(() => storage.getActiveCardIndex());
  const [isFlipped, setIsFlipped] = useState(false);

  // 안드로이드 바텀 시트 상태 (false = 홈 디폴트 9:16 뷰, true = 커스텀/부가기능 시트 오픈 16:9 뷰)
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 모달 상태
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);

  // 토스트 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 퍼블릭 뷰 모드 검사 (?u=username 또는 ?c=id)
  const [publicCard, setPublicCard] = useState<CardData | null>(null);

  // 터치 제스처 좌표 추적
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // URL 파라미터 파싱을 통한 퍼블릭 카드 조회
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uParam = params.get('u');
    const cParam = params.get('c');

    if (uParam || cParam) {
      const code = uParam ? (uParam.startsWith('@') ? uParam : `@${uParam}`) : (cParam || '');
      const matched = storage.findCardByCode(code);
      if (matched) {
        setPublicCard(matched);
      }
    }
  }, []);

  const activeCard = activeIdx >= 0 ? (myCards[activeIdx] || myCards[0]) : myCards[0];

  // 좌우 캐러셀: 왼쪽으로 넘기면 '+' 슬롯(-1), 오른쪽으로 넘기면 그동안 제작한 명함들(0, 1, 2...)
  const handlePrevCard = useCallback(() => {
    setActiveIdx((prev) => {
      // 만약 0번 카드에서 왼쪽으로 넘기면 '+' 새 명함 슬롯(-1)으로 이동
      if (prev === 0) return -1;
      if (prev === -1) return myCards.length - 1; // 맨 끝 카드로
      return prev - 1;
    });
    setIsFlipped(false);
  }, [myCards.length]);

  const handleNextCard = useCallback(() => {
    setActiveIdx((prev) => {
      // '+' 슬롯(-1)에서 오른쪽으로 넘기면 0번 카드로
      if (prev === -1) return 0;
      if (prev >= myCards.length - 1) return -1; // 끝에서 오른쪽으로 넘기면 '+' 슬롯
      return prev + 1;
    });
    setIsFlipped(false);
  }, [myCards.length]);

  // 상하 캐러셀 / 제스처를 통한 스킨 변경 (현재 카드에 실시간 끼워맞추기)
  const handleSelectSkin = useCallback((newSkinId: SkinId) => {
    if (!activeCard || activeIdx < 0) return;
    const updatedCards = myCards.map((c, i) => {
      if (i === activeIdx) {
        return { ...c, skinId: newSkinId };
      }
      return c;
    });
    setMyCards(updatedCards);
    storage.saveMyCards(updatedCards);
    const skinName = SKINS.find(s => s.id === newSkinId)?.name || newSkinId;
    showToast(`✨ '${skinName}' 스킨이 장착되었습니다!`);
  }, [activeCard, activeIdx, myCards, showToast]);

  const handleCycleSkin = useCallback((direction: 'next' | 'prev') => {
    if (!activeCard || activeIdx < 0) return;
    const currentSkinIdx = SKINS.findIndex((s) => s.id === activeCard.skinId);
    let nextIdx = direction === 'next' ? currentSkinIdx + 1 : currentSkinIdx - 1;
    if (nextIdx >= SKINS.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = SKINS.length - 1;
    handleSelectSkin(SKINS[nextIdx].id);
  }, [activeCard, activeIdx, handleSelectSkin]);

  // 터치 스와이프 제스처 핸들러 (좌우 캐러셀 & 상하 스킨 교체)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // 가로 스와이프 (좌우 캐러셀)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) {
        handlePrevCard();
      } else {
        handleNextCard();
      }
    }
    // 세로 스와이프 (상하 스킨 캐러셀 or 시트 열기)
    else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 40) {
      if (!isSheetOpen && dy < -40) {
        // 홈 디폴트 상태에서 위로 스와이프 시 바텀 시트 열기
        setIsSheetOpen(true);
      } else if (isSheetOpen) {
        if (dy > 0) {
          handleCycleSkin('next');
        } else {
          handleCycleSkin('prev');
        }
      }
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWalletOpen || isExchangeOpen || isEditOpen || previewCard || publicCard) return;

      if (e.key === 'ArrowLeft') {
        handlePrevCard();
      } else if (e.key === 'ArrowRight') {
        handleNextCard();
      } else if (e.key === 'ArrowUp') {
        handleCycleSkin('prev');
      } else if (e.key === 'ArrowDown') {
        handleCycleSkin('next');
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSheetOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePrevCard,
    handleNextCard,
    handleCycleSkin,
    isWalletOpen,
    isExchangeOpen,
    isEditOpen,
    previewCard,
    publicCard
  ]);

  // 명함 저장 (생성/수정)
  const handleSaveCard = (card: CardData) => {
    const existingIdx = myCards.findIndex((c) => c.id === card.id);
    let updated: CardData[];
    if (existingIdx >= 0) {
      updated = [...myCards];
      updated[existingIdx] = card;
      showToast(`✏️ '${card.name}'님의 명함이 수정되었습니다.`);
    } else {
      updated = [...myCards, card];
      setActiveIdx(updated.length - 1);
      storage.setActiveCardIndex(updated.length - 1);
      showToast(`🎉 새로운 명함이 생성되었습니다!`);
    }
    setMyCards(updated);
    storage.saveMyCards(updated);
  };

  // 명함 삭제
  const handleDeleteActiveCard = () => {
    if (myCards.length <= 1) {
      showToast('⚠️ 최소 1개의 명함은 유지되어야 합니다.');
      return;
    }
    if (!window.confirm(`'${activeCard.name}'님의 명함을 삭제하시겠습니까?`)) return;
    const updated = myCards.filter((_, idx) => idx !== activeIdx);
    const nextIdx = Math.max(0, activeIdx - 1);
    setMyCards(updated);
    setActiveIdx(nextIdx);
    storage.saveMyCards(updated);
    storage.setActiveCardIndex(nextIdx);
    showToast('🗑️ 명함이 삭제되었습니다.');
  };

  // 공유 링크 복사
  const handleCopyShareLink = () => {
    if (!activeCard) return;
    const url = `${window.location.origin}${window.location.pathname}?u=${encodeURIComponent(activeCard.uniqueCode || activeCard.id)}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('🔗 명함 공유 링크가 클립보드에 복사되었습니다!');
    }).catch(() => {
      showToast(`공유 링크: ${url}`);
    });
  };

  // 퍼블릭 카드 뷰 모드
  if (publicCard) {
    return (
      <div className="w-full h-dvh max-w-md mx-auto relative overflow-hidden bg-[#0d0e15] shadow-2xl flex flex-col">
        <PublicCardView
          card={publicCard}
          onGoToApp={() => {
            window.history.pushState({}, '', window.location.pathname);
            setPublicCard(null);
          }}
          onShowToast={showToast}
        />
        <Toast message={toastMessage} />
      </div>
    );
  }

  const isCreatingNewSlot = activeIdx === -1;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-dvh max-w-md mx-auto relative overflow-hidden bg-[#0c0d14] text-white flex flex-col font-sans select-none shadow-2xl border-x border-white/5"
    >
      {/* 1. 안드로이드 최적화 앰비언트 글로우 배경 */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl z-0" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl z-0" />

      {/* 2. 우측 상단 X 닫기 버튼: 바텀 시트 열림 모드일 때 항상 표시되어 홈 디폴트 화면으로 즉시 복귀 */}
      {isSheetOpen && (
        <button
          onClick={() => setIsSheetOpen(false)}
          className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/20 text-slate-200 hover:text-white active:scale-90 transition-all shadow-xl shadow-black/40"
          title="홈 디폴트 화면으로 나가기"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {/* 3. 메인 히어로 섹션
          - 디폴트 상태: flex-1 전체 화면을 꽉 채우며 9:16 비율 화면에 길고 크게 가로로 나타남 (isLarge=true)
          - 바텀 시트 오픈 상태: 상단 히어로 섹션에 16:9 비율로 컴팩트하게 자리잡음 (isLarge=false)
      */}
      <main
        className={`relative w-full transition-all duration-500 ease-out flex flex-col items-center justify-center overflow-hidden z-10 ${
          isSheetOpen
            ? 'shrink-0 aspect-[16/9] min-h-[220px] max-h-[250px] pt-2'
            : 'flex-1 h-full min-h-0'
        }`}
      >
        {/* '+' 새 명함 만들기 슬롯인 경우 */}
        {isCreatingNewSlot ? (
          <div
            onClick={() => {
              setEditingCard(null);
              setIsEditOpen(true);
            }}
            className="w-[85%] aspect-[1.58] rounded-2xl border-2 border-dashed border-sky-400/60 bg-gradient-to-tr from-sky-500/10 to-indigo-500/10 hover:bg-sky-500/20 backdrop-blur-md flex flex-col items-center justify-center gap-3 cursor-pointer group active:scale-95 transition-all shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8" />
            </div>
            <div className="text-center">
              <span className="text-sm font-bold text-white block">새 명함 만들기</span>
              <span className="text-xs text-sky-300/80 font-medium block mt-0.5">
                탭하여 새로운 페르소나 명함을 추가하세요
              </span>
            </div>
          </div>
        ) : (
          /* 기존 명함 3D 뷰어 렌더링 */
          activeCard && (
            <div className="w-full h-full relative">
              <Card3DViewer
                card={activeCard}
                skinId={activeCard.skinId}
                isFlipped={isFlipped}
                isLarge={!isSheetOpen}
                onFlipToggle={() => setIsFlipped((prev) => !prev)}
                className="w-full h-full"
              />

              {/* 3D 명함 앞/뒷면 뒤집기 빠른 액션 힌트 칩 (디폴트 홈 모드에서 표시) */}
              {!isSheetOpen && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto">
                  <button
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-xs text-slate-300 font-medium active:scale-95 transition-all"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isFlipped ? '앞면 보기' : '뒷면 보기'}</span>
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {/* 바텀 시트 열림 상태일 때의 좌우 캐러셀 내비게이션 화살표 */}
        {isSheetOpen && (
          <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between z-30">
            <button
              onClick={handlePrevCard}
              className="pointer-events-auto p-2 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white border border-white/10 active:scale-90 transition-all"
              title="이전 명함 / 새 명함 (+)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextCard}
              className="pointer-events-auto p-2 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white border border-white/10 active:scale-90 transition-all"
              title="다음 명함"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 바텀 시트 열림 상태일 때의 좌우 캐러셀 인디케이터 (왼쪽 + 슬롯 및 카드들) */}
        {isSheetOpen && (
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-20">
            {/* 맨 왼쪽: '+' 새 명함 슬롯 버튼 */}
            <button
              onClick={() => setActiveIdx(-1)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-0.5 transition-all ${
                activeIdx === -1
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40 scale-105'
                  : 'bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>새 명함</span>
            </button>

            {/* 보유 명함 인디케이터 도트/칩 */}
            {myCards.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActiveIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  activeIdx === i
                    ? 'w-6 bg-sky-400 shadow-md shadow-sky-400/50'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                title={c.name}
              />
            ))}
          </div>
        )}
      </main>

      {/* 4. 디폴트 홈 화면의 바텀 영역
          - 탑바와 바텀 네비가 모두 삭제된 상태
          - 바텀에는 오직 QR 촬영 버튼과, 바텀 시트를 끌어올릴 수 있는 슬림 핸들만 존재
      */}
      {!isSheetOpen && (
        <footer className="shrink-0 w-full px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3.5 z-20">
          {/* 중앙 강조 안드로이드 스타일 QR 촬영 버튼 */}
          <button
            onClick={() => setIsExchangeOpen(true)}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:opacity-95 active:scale-95 text-white font-bold text-sm shadow-2xl shadow-sky-500/30 border border-white/20 transition-all"
            title="QR 코드 촬영 및 교환"
          >
            <QrCode className="w-5 h-5 text-sky-200" />
            <span className="tracking-wide">QR 코드 촬영 / 교환</span>
          </button>

          {/* 바텀 시트를 위로 끌어올리는 안드로이드 제스처 핸들 & 가이드 */}
          <div
            onClick={() => setIsSheetOpen(true)}
            className="w-full flex flex-col items-center justify-center pt-1 pb-1 cursor-pointer group active:opacity-75"
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 group-hover:bg-white/60 transition-colors mb-2" />
            <span className="text-xs font-semibold text-slate-400 group-hover:text-white flex items-center gap-1 transition-colors">
              <ChevronUp className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
              <span>위로 끌어올려 명함 커스텀 & 설정</span>
            </span>
          </div>
        </footer>
      )}

      {/* 5. 안드로이드 바텀 시트 (끌어올렸을 때 열리는 커스텀 & 부가기능 패널) */}
      {isSheetOpen && (
        <section
          className="flex-1 w-full bg-[#12131f]/95 backdrop-blur-2xl rounded-t-[28px] border-t border-white/15 flex flex-col overflow-hidden shadow-2xl z-30 animate-in slide-in-from-bottom duration-300"
        >
          {/* 바텀 시트 드래그 핸들 (누르면 닫기) */}
          <div
            onClick={() => setIsSheetOpen(false)}
            className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer group"
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
            <span className="text-[10px] text-slate-500 mt-1 font-medium group-hover:text-slate-300">
              아래로 내려 홈으로 돌아가기
            </span>
          </div>

          {/* 시트 내부 스크롤 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 scrollbar-none">
            {/* A. 상하 캐러셀: 명함과 같은 사이즈의 직사각형 색깔 네모들이 현재 명함에 끼워맞춰 지면서 색깔 변경 */}
            {activeCard && !isCreatingNewSlot && (
              <SkinSlotCarousel
                card={activeCard}
                activeSkinId={activeCard.skinId}
                onSelectSkin={handleSelectSkin}
              />
            )}

            {/* B. 명함 커스텀 & 부가 기능 액션 바 */}
            {activeCard && !isCreatingNewSlot && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 px-2 flex items-center justify-between">
                  <span>명함 관리 및 부가 기능</span>
                  <span className="text-[10px] text-sky-400 font-mono">
                    {activeIdx + 1} / {myCards.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* 명함 정보 수정 */}
                  <button
                    onClick={() => {
                      setEditingCard(activeCard);
                      setIsEditOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 active:scale-95 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                    <span>정보 수정</span>
                  </button>

                  {/* 앞/뒷면 뒤집기 */}
                  <button
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 active:scale-95 transition-all"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isFlipped ? '앞면 보기' : '뒷면 보기'}</span>
                  </button>

                  {/* 공유 링크 복사 */}
                  <button
                    onClick={handleCopyShareLink}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 active:scale-95 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>링크 복사</span>
                  </button>

                  {/* 명함 삭제 (카드가 2장 이상일 때만 활성화) */}
                  <button
                    onClick={handleDeleteActiveCard}
                    disabled={myCards.length <= 1}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold active:scale-95 transition-all ${
                      myCards.length > 1
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                        : 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>명함 삭제</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* C. 바텀 시트 하단 네비게이션: 교환한 명함첩 보기 버튼 */}
          <div className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-[#0c0d14]/90 backdrop-blur-md flex items-center justify-between gap-3">
            {/* 다른 사람과 교환한 명함첩 버튼 */}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-sky-600/40 via-indigo-600/40 to-purple-600/40 hover:from-sky-600/60 hover:to-purple-600/60 border border-sky-400/30 text-xs font-bold text-white shadow-lg active:scale-98 transition-all"
              title="교환한 명함 지갑 열기"
            >
              <FolderHeart className="w-4 h-4 text-sky-300" />
              <span>교환한 명함첩 보기</span>
            </button>

            {/* QR 촬영 모달 버튼 */}
            <button
              onClick={() => setIsExchangeOpen(true)}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 active:scale-95 transition-all"
              title="QR 스캔 및 교환"
            >
              <QrCode className="w-5 h-5 text-sky-400" />
            </button>
          </div>
        </section>
      )}

      {/* --- 모달 및 서랍 컴포넌트들 --- */}

      {/* 스마트 명함첩 드로어 */}
      <WalletDrawer
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        onSelectPreviewCard={(card) => setPreviewCard(card)}
        onShowToast={showToast}
      />

      {/* QR 코드 교환 모달 */}
      {activeCard && (
        <QRExchangeModal
          isOpen={isExchangeOpen}
          onClose={() => setIsExchangeOpen(false)}
          activeCard={activeCard}
          onExchangeSuccess={(card) => {
            showToast(`🎉 '${card.name}'님의 명함이 교환되었습니다!`);
          }}
          onShowToast={showToast}
        />
      )}

      {/* 명함 생성 / 수정 모달 */}
      <EditCardModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        cardToEdit={editingCard}
        onSave={handleSaveCard}
      />

      {/* 명함첩 내 카드 3D 미리보기 팝업 모달 */}
      {previewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#13141f] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <span className="font-bold text-sm text-white">{previewCard.name}님의 명함 3D 뷰</span>
              <button
                onClick={() => setPreviewCard(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 relative">
              <Card3DViewer
                card={previewCard}
                skinId={previewCard.skinId}
                className="w-full h-full"
              />
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0e0f17] flex justify-between items-center text-xs">
              <span className="text-slate-400">{previewCard.affiliation}</span>
              <button
                onClick={() => {
                  setPublicCard(previewCard);
                  setPreviewCard(null);
                }}
                className="text-sky-400 hover:text-sky-300 font-semibold"
              >
                퍼블릭 상세 뷰 열기 ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 글로벌 안드로이드 스타일 토스트 알림 */}
      <Toast message={toastMessage} />
    </div>
  );
}
