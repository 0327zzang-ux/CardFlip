import { useState, useEffect, useCallback, useRef } from 'react';
import { type CardData, type SkinId, SKINS, INITIAL_MY_CARDS } from './types/card';
import { storage } from './services/storage';
import { decodeCardFromParam } from './services/qr';
import { Card3DViewer } from './components/Card3DViewer';
import { PublicCardView } from './components/PublicCardView';
import { WalletDrawer } from './components/WalletDrawer';
import { QRExchangeModal } from './components/QRExchangeModal';
import { EditCardModal } from './components/EditCardModal';
import { CrossCarouselBottomSheet } from './components/CrossCarouselBottomSheet';
import { Toast } from './components/Toast';
import {
  QrCode,
  ChevronUp,
  X
} from 'lucide-react';

export default function App() {
  const [myCards, setMyCards] = useState<CardData[]>(() => storage.getMyCards());
  // activeIdx: -1이면 '+' 새 명함 제작 슬롯, 0 이상이면 보유 명함 인덱스
  const [activeIdx, setActiveIdx] = useState<number>(() => storage.getActiveCardIndex());
  const [isFlipped, setIsFlipped] = useState(false);

  // 안드로이드 바텀 시트 상태 (false = 홈 디폴트 뷰, true = 2축 캐러셀 바텀 시트 오픈 뷰)
  const [isSheetOpen, setIsSheetOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sheet') === 'true';
  });

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

  // 앱 초기 로드 시 보유 명함을 로컬 네트워크 서버에 동기화
  useEffect(() => {
    storage.syncAllMyCardsToServer().catch(() => {});
  }, []);

  // URL 파라미터 파싱을 통한 퍼블릭 카드 조회
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dParam = params.get('d') || params.get('data');
    const uParam = params.get('u');
    const cParam = params.get('c');

    // 1. QR 코드에 직접 담긴 전체 카드 데이터 복원 (타 기기/모바일 카메라 접속 지원)
    if (dParam) {
      const decodedCard = decodeCardFromParam(dParam);
      if (decodedCard && decodedCard.name) {
        setPublicCard(decodedCard);
        return;
      }
    }

    // 2. 고유 ID / 코드 기반 로컬 및 원격 실시간 서버 조회
    if (uParam || cParam) {
      const code = uParam ? (uParam.startsWith('@') ? uParam : `@${uParam}`) : (cParam || '');
      storage.findCardByCodeAsync(code).then((matched) => {
        if (matched) {
          setPublicCard(matched);
        } else {
          showToast(`⚠️ 해당 명함('${code}')을 찾을 수 없습니다. (스마트폰에서 제작된 경우 같은 Wi-Fi 확인)`);
        }
      });
    }
  }, [showToast]);

  // 홈 화면 대표 명함: 항상 myCards[0] (대표로 설정된 명함 단 한 장만 표시)
  const representativeCard = myCards[0] || INITIAL_MY_CARDS[0];
  const activeCard = representativeCard;

  // 좌우 캐러셀: 왼쪽으로 넘기면 '+' 슬롯(-1), 오른쪽으로 넘기면 그동안 제작한 명함들(0, 1, 2...)
  const handlePrevCard = useCallback(() => {
    setActiveIdx((prev) => {
      if (prev === 0) return -1;
      if (prev === -1) return myCards.length - 1;
      return prev - 1;
    });
    setIsFlipped(false);
  }, [myCards.length]);

  const handleNextCard = useCallback(() => {
    setActiveIdx((prev) => {
      if (prev === -1) return 0;
      if (prev >= myCards.length - 1) return -1;
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

  // 바텀 시트 열기 실시간 제스처 오프셋 & 50% 임계값 스냅
  const [sheetPullY, setSheetPullY] = useState<number>(0);
  const [isPullingSheet, setIsPullingSheet] = useState<boolean>(false);
  const pullStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleSheetPullDown = (e: React.PointerEvent) => {
    if (isSheetOpen || e.button !== 0) return;
    pullStartRef.current = { x: e.clientX, y: e.clientY };
    setIsPullingSheet(false);
    setSheetPullY(0);
  };

  const handleSheetPullMove = (e: React.PointerEvent) => {
    if (!pullStartRef.current || isSheetOpen) return;
    const dy = e.clientY - pullStartRef.current.y;
    if (dy < -8) {
      setIsPullingSheet(true);
      setSheetPullY(Math.min(window.innerHeight * 0.85, -dy));
    }
  };

  const handleSheetPullUp = () => {
    if (!pullStartRef.current) return;
    pullStartRef.current = null;
    setIsPullingSheet(false);

    // 50% 임계값 = 120px 기준 스냅 오픈 및 스냅 백
    const SNAP_OPEN_THRESHOLD = 120;
    if (sheetPullY > SNAP_OPEN_THRESHOLD) {
      setIsSheetOpen(true);
    }
    setSheetPullY(0);
  };

  // 홈 화면 터치 제스처: 수평 스와이프로 명함 변경하는 기능은 완전 제거(바텀 시트에서만 교체)
  // 세로 위로 스와이프 시 바텀 시트 열기만 유지
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSheetOpen) return;
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isSheetOpen || !touchStartRef.current || e.changedTouches.length === 0) return;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    touchStartRef.current = null;

    // 위로 스와이프 시 바텀 시트 열기
    if (Math.abs(dy) > Math.abs(dx) && dy < -50) {
      setIsSheetOpen(true);
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
      showToast(`🎉 새로운 명함이 생성되어 목록 맨 끝에 추가되었습니다!`);
    }
    setMyCards(updated);
    storage.saveMyCards(updated);
  };

  // 대표 명함으로 설정 (선택된 명함을 1번 최좌측으로 이동, 기존 대표는 우측으로 한 칸 이동)
  const handleSetRepresentative = (cardId: string) => {
    const targetIdx = myCards.findIndex((c) => c.id === cardId);
    if (targetIdx < 0) return;
    const target = myCards[targetIdx];
    const remaining = myCards.filter((_, idx) => idx !== targetIdx);
    const updated = [
      { ...target, isPrimary: true },
      ...remaining.map((c) => ({ ...c, isPrimary: false }))
    ];
    setMyCards(updated);
    setActiveIdx(0);
    storage.saveMyCards(updated);
    storage.setActiveCardIndex(0);
    showToast(`★ '${target.name}'님의 명함이 대표 명함으로 설정되었습니다!`);
  };

  // 1.5초 롱프레스 드래그 앤 드롭 카드 순서 변경
  const handleReorderCards = (newCards: CardData[]) => {
    const updated = newCards.map((c, i) => ({ ...c, isPrimary: i === 0 }));
    setMyCards(updated);
    storage.saveMyCards(updated);
    showToast('↔ 명함 순서가 변경되었습니다.');
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
      <div className="w-full min-h-dvh bg-[#08090f] text-white flex items-center justify-center p-0 md:p-6">
        <div className="w-full h-dvh max-w-md mx-auto relative overflow-hidden bg-[#0d0e15] shadow-2xl flex flex-col md:rounded-3xl border border-white/10">
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
      </div>
    );
  }

  return (
    <div className="w-full min-h-dvh bg-[#07080e] text-white flex flex-col items-center justify-center p-0 md:p-4 select-none overflow-hidden relative">
      {/* 스마트폰 세로 뷰포트 컨테이너 (항상 세로 화면으로 고정) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full max-w-md h-dvh md:h-[min(94vh,860px)] md:rounded-[40px] relative overflow-hidden bg-[#0c0d14] text-white flex flex-col shadow-2xl border border-white/10"
      >
        {/* 1. 안드로이드 최적화 앰비언트 글로우 배경 */}
        <div className="pointer-events-none absolute -top-24 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl z-0" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl z-0" />

        {/* 2. 홈 디폴트 화면 : 세로 3D 대표 명함 (회전된 텍스트) */}
        <main className="flex-1 h-full min-h-0 relative w-full flex flex-col items-center justify-center overflow-hidden z-10">
          {activeCard && (
            <div className="w-full h-full relative flex items-center justify-center">
              <Card3DViewer
                key={`home-3d-${activeCard.id}-${activeCard.skinId}`}
                card={activeCard}
                skinId={activeCard.skinId}
                isFlipped={isFlipped}
                isLarge={true}
                isHorizontal={false}
                onFlipToggle={() => setIsFlipped((prev) => !prev)}
                className="w-full h-full"
              />
            </div>
          )}
        </main>

        {/* 3. 디폴트 홈 화면의 하단 컨트롤러 (하단 정중앙 QR 버튼 & 최하단 바텀 시트 핸들) */}
        {!isSheetOpen && (
          <footer className="shrink-0 w-full px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3.5 z-20 pointer-events-auto">
            {/* 화면 하단 정중앙 QR 버튼 */}
            <button
              onClick={() => setIsExchangeOpen(true)}
              className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-xl border border-white/20 flex flex-col items-center justify-center gap-1 shadow-2xl shadow-sky-500/20 group transition-all"
              title="QR 코드 촬영 및 교환"
            >
              <QrCode className="w-6 h-6 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold text-slate-300">QR</span>
            </button>

            {/* 화면 최하단 바텀 시트 제스처 핸들 바 (실시간 1:1 트래킹 & 50% 스냅 오픈) */}
            <div
              onPointerDown={handleSheetPullDown}
              onPointerMove={handleSheetPullMove}
              onPointerUp={handleSheetPullUp}
              onPointerCancel={handleSheetPullUp}
              onClick={() => setIsSheetOpen(true)}
              className="w-full flex flex-col items-center justify-center pt-1 pb-1 cursor-pointer group active:opacity-75 touch-none select-none"
              title="위로 끌어올려 바텀 시트 열기"
            >
              <div className="w-16 h-1.5 rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
              <span className="text-[10px] text-slate-400 mt-1.5 font-medium group-hover:text-white flex items-center gap-1 transition-colors">
                <ChevronUp className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
                <span>바텀 시트</span>
              </span>
            </div>
          </footer>
        )}

        {/* 4. 바텀 시트 오픈 모드 : 2축(십자형) 캐러셀 시트 (실시간 끌어올리기 트래킹 & 50% 스냅) */}
        <div
          className="absolute inset-0 z-40"
          style={{
            transform: isSheetOpen
              ? 'translateY(0%)'
              : isPullingSheet
                ? `translateY(calc(100% - ${sheetPullY}px))`
                : 'translateY(100%)',
            transition: isPullingSheet ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
            pointerEvents: isSheetOpen ? 'auto' : 'none'
          }}
        >
          <CrossCarouselBottomSheet
            isOpen={isSheetOpen || isPullingSheet}
            onClose={() => setIsSheetOpen(false)}
            myCards={myCards}
            activeIdx={activeIdx}
            onSelectCardIdx={(idx) => {
              setActiveIdx(idx);
              storage.setActiveCardIndex(idx);
            }}
            onPrevCard={handlePrevCard}
            onNextCard={handleNextCard}
            onCreateNewCard={() => {
              setEditingCard(null);
              setIsEditOpen(true);
            }}
            onEditCard={(card) => {
              setEditingCard(card);
              setIsEditOpen(true);
            }}
            onSelectSkin={handleSelectSkin}
            onCycleSkin={handleCycleSkin}
            onOpenWallet={() => setIsWalletOpen(true)}
            onSetRepresentative={handleSetRepresentative}
            onReorderCards={handleReorderCards}
            onOpenExchange={() => setIsExchangeOpen(true)}
            onShareCard={handleCopyShareLink}
            onDeleteCard={handleDeleteActiveCard}
            isFlipped={isFlipped}
            onFlipToggle={() => setIsFlipped((prev) => !prev)}
          />
        </div>

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
    </div>
  );
}
