import React, { useState, useRef, useEffect } from 'react';
import { type CardData, type SkinId, SKINS } from '../types/card';
import { Card2DTransparent } from './Card2DTransparent';
import { SkinPlateVisual } from './SkinPlateVisual';
import { X, Plus, FolderHeart } from 'lucide-react';

interface CrossCarouselBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  myCards: CardData[];
  activeIdx?: number;
  onSelectCardIdx?: (idx: number) => void;
  onPrevCard?: () => void;
  onNextCard?: () => void;
  onCreateNewCard: () => void;
  onEditCard: (card: CardData) => void;
  onSelectSkin: (skinId: SkinId) => void;
  onCycleSkin: (direction: 'prev' | 'next') => void;
  onOpenWallet: () => void;
  onSetRepresentative?: (cardId: string) => void;
  onReorderCards?: (newCards: CardData[]) => void;
  onOpenExchange?: () => void;
  onShareCard?: () => void;
  onDeleteCard?: () => void;
  isFlipped?: boolean;
  onFlipToggle?: () => void;
}

const CARD_WIDTH = 300;
const CARD_GAP = 16;
const CARD_STEP = CARD_WIDTH + CARD_GAP; // 316px
const CARD_SNAP_THRESHOLD = CARD_STEP * 0.5; // 50% 임계값 = 158px
const SKIN_SNAP_THRESHOLD = 50; // 스킨 상하 50% 임계값 = 50px
const SHEET_CLOSE_THRESHOLD = 120; // 바텀 시트 닫기 50% 임계값 = 120px

export const CrossCarouselBottomSheet: React.FC<CrossCarouselBottomSheetProps> = ({
  isOpen,
  onClose,
  myCards,
  onCreateNewCard,
  onEditCard,
  onSelectSkin,
  onOpenWallet,
  onSetRepresentative,
  onReorderCards
}) => {
  // carouselIdx: 0 = [+ 새 명함 제작], 1 = 1번 대표 명함(myCards[0]), 2 = 명함 2(myCards[1]), ...
  const [carouselIdx, setCarouselIdx] = useState<number>(1);

  // 실시간 제스처 오프셋 상태 (1:1 손가락 추적)
  const [cardDragX, setCardDragX] = useState<number>(0);
  const [skinDragY, setSkinDragY] = useState<number>(0);
  const [sheetCloseDragY, setSheetCloseDragY] = useState<number>(0);
  const [activeGesture, setActiveGesture] = useState<'none' | 'card_h' | 'skin_v' | 'sheet_close_v' | 'floating_reorder'>('none');
  const [isGestureActive, setIsGestureActive] = useState<boolean>(false);

  // 1.5초 롱프레스 상태
  const [isFloating, setIsFloating] = useState<boolean>(false);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // 현재 활성 스킨 (명함이 바뀌어도 상하 스와이프 상태가 지속 유지됨)
  const [activeSkinId, setActiveSkinId] = useState<SkinId>(() => myCards[0]?.skinId || 'hologram');

  // 시트 오픈 시 항상 1번(대표 명함)으로 포커스 리셋
  useEffect(() => {
    if (isOpen) {
      setCarouselIdx(1);
      setIsFloating(false);
      setCardDragX(0);
      setSkinDragY(0);
      setSheetCloseDragY(0);
      setActiveGesture('none');
      setIsGestureActive(false);
      if (myCards[0]?.skinId) {
        setActiveSkinId(myCards[0].skinId);
      }
    }
  }, [isOpen, myCards]);

  const currentCard = carouselIdx >= 1 ? myCards[carouselIdx - 1] : myCards[0];
  const currentSkinIdx = SKINS.findIndex((s) => s.id === activeSkinId);
  const prevSkin = SKINS[(currentSkinIdx - 1 + SKINS.length) % SKINS.length];
  const nextSkin = SKINS[(currentSkinIdx + 1) % SKINS.length];

  // 스킨 변경 핸들러
  const handleApplySkin = (skinId: SkinId) => {
    setActiveSkinId(skinId);
    onSelectSkin(skinId);
  };

  // 대표 명함 설정 핸들러
  const handleSetRepresentative = (cardId: string) => {
    if (onSetRepresentative) {
      onSetRepresentative(cardId);
      setCarouselIdx(1);
    }
  };

  // 터치/포인터 시작
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    setActiveGesture('none');
    setIsGestureActive(false);
    setCardDragX(0);
    setSkinDragY(0);
    setSheetCloseDragY(0);

    // 보유 명함(1번 이상)일 때 1.5초 롱프레스 타이머 가동
    if (carouselIdx >= 1 && currentCard) {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
      longPressTimerRef.current = window.setTimeout(() => {
        setIsFloating(true);
        setActiveGesture('floating_reorder');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(60);
        }
      }, 1500);
    }
  };

  // 터치/포인터 이동: 실시간 1:1 손가락 트래킹
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPosRef.current) return;
    const dx = e.clientX - touchStartPosRef.current.x;
    const dy = e.clientY - touchStartPosRef.current.y;
    const startY = touchStartPosRef.current.y;

    if (!isFloating) {
      // 1.5초가 되기 전에 8px 이상 이동 시 롱프레스 취소 -> 스와이프 제스처 전환
      if (Math.hypot(dx, dy) > 8 && longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // 제스처 방향 결정 (최초 10px 이상 이동 시 축 잠금)
      if (activeGesture === 'none' && Math.hypot(dx, dy) > 10) {
        setIsGestureActive(true);
        // 최상단 핸들 바 부근(startY < 90)에서 아래로 당기는 경우 -> 바텀 시트 닫기 제스처
        if (startY < 90 && dy > 0) {
          setActiveGesture('sheet_close_v');
        } else if (Math.abs(dx) >= Math.abs(dy)) {
          setActiveGesture('card_h');
        } else {
          setActiveGesture('skin_v');
        }
      }

      // 실시간 1:1 손가락 위치 추적
      if (activeGesture === 'card_h') {
        // 양 끝 경계에서는 저항감 부여
        if ((carouselIdx === 0 && dx > 0) || (carouselIdx === myCards.length && dx < 0)) {
          setCardDragX(dx * 0.25);
        } else {
          setCardDragX(dx);
        }
      } else if (activeGesture === 'skin_v') {
        setSkinDragY(dy);
      } else if (activeGesture === 'sheet_close_v') {
        setSheetCloseDragY(Math.max(0, dy));
      }
    } else {
      // 1.5초 플로팅 모드: 실시간 카드 드래그
      setActiveGesture('floating_reorder');
      setCardDragX(dx);
    }
  };

  // 터치/포인터 종료: 50% 임계값(Threshold) 기준 스냅 오픈 / 스냅 전환 / 스냅 백
  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartPosRef.current) return;
    touchStartPosRef.current = null;
    setIsGestureActive(false);

    // 1. 1.5초 플로팅 모드 해제 분기
    if (isFloating) {
      if (Math.abs(cardDragX) > 70) {
        // 좌우 드래그 순서 변경
        const myCardIdx = carouselIdx - 1;
        if (cardDragX > 70 && myCardIdx > 0) {
          const newCards = [...myCards];
          const temp = newCards[myCardIdx];
          newCards[myCardIdx] = newCards[myCardIdx - 1];
          newCards[myCardIdx - 1] = temp;
          onReorderCards?.(newCards);
          setCarouselIdx((prev) => Math.max(1, prev - 1));
        } else if (cardDragX < -70 && myCardIdx < myCards.length - 1) {
          const newCards = [...myCards];
          const temp = newCards[myCardIdx];
          newCards[myCardIdx] = newCards[myCardIdx + 1];
          newCards[myCardIdx + 1] = temp;
          onReorderCards?.(newCards);
          setCarouselIdx((prev) => Math.min(myCards.length, prev + 1));
        }
      } else {
        // 드래그 없이 손을 뗌 -> 명함 정보 수정 모달 오픈
        if (currentCard) {
          onEditCard(currentCard);
        }
      }
      setIsFloating(false);
      setCardDragX(0);
      setActiveGesture('none');
      return;
    }

    // 2. 명함 목록 수평 스와이프: 50% 임계값(CARD_SNAP_THRESHOLD = 158px) 기준 스냅
    if (activeGesture === 'card_h') {
      if (cardDragX < -CARD_SNAP_THRESHOLD && carouselIdx < myCards.length) {
        // 왼쪽으로 50% 이상 드래그 -> 다음 명함으로 스냅 이동
        setCarouselIdx((prev) => prev + 1);
      } else if (cardDragX > CARD_SNAP_THRESHOLD && carouselIdx > 0) {
        // 오른쪽으로 50% 이상 드래그 -> 이전 명함으로 스냅 이동
        setCarouselIdx((prev) => prev - 1);
      }
      // 50% 미만이면 원래 카드 위치로 스냅 백 (carouselIdx 유지)
      setCardDragX(0);
    }

    // 3. 스킨 목록 수직 스와이프: 50% 임계값(SKIN_SNAP_THRESHOLD = 50px) 기준 스냅
    else if (activeGesture === 'skin_v') {
      if (skinDragY > SKIN_SNAP_THRESHOLD) {
        // 아래로 50% 이상 드래그 -> 상단 이전 스킨으로 스냅 전환
        handleApplySkin(prevSkin.id);
      } else if (skinDragY < -SKIN_SNAP_THRESHOLD) {
        // 위로 50% 이상 드래그 -> 하단 다음 스킨으로 스냅 전환
        handleApplySkin(nextSkin.id);
      }
      // 50% 미만이면 원래 스킨으로 스냅 백
      setSkinDragY(0);
    }

    // 4. 바텀 시트 닫기 제스처: 50% 임계값(SHEET_CLOSE_THRESHOLD = 120px) 기준 스냅
    else if (activeGesture === 'sheet_close_v') {
      if (sheetCloseDragY > SHEET_CLOSE_THRESHOLD) {
        // 50% 이상 아래로 드래그 -> 스냅 닫기
        onClose();
      }
      // 50% 미만이면 완전히 열린 상태로 스냅 백
      setSheetCloseDragY(0);
    }

    setActiveGesture('none');
  };

  if (!isOpen) return null;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        // 상단 바텀 시트 닫기 제스처 시 실시간 수직 트래킹 + 스냅 백 애니메이션
        transform: `translateY(${sheetCloseDragY}px)`,
        transition: isGestureActive && activeGesture === 'sheet_close_v' ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)'
      }}
      className="absolute inset-0 z-40 bg-[#070810]/95 backdrop-blur-2xl text-white select-none flex flex-col justify-between p-3.5 animate-in slide-in-from-bottom duration-300 overflow-hidden touch-none"
    >
      {/* 1. 상단 드래그 핸들 & 닫기(X) 버튼 (안내 문구 완전 삭제) */}
      <div className="w-full relative shrink-0 pt-1 pb-1 flex items-center justify-center">
        <div
          onClick={onClose}
          className="w-14 h-1.5 rounded-full bg-white/30 hover:bg-white/60 cursor-pointer transition-colors"
          title="닫기"
        />
        <button
          onClick={onClose}
          className="absolute right-0 top-0 p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-slate-300 hover:text-white transition-all border border-white/10 cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. 상단 2D 순수 스킨 플레이트 (실시간 수직 트래킹 & 50% 스냅) */}
      <div
        onClick={() => handleApplySkin(prevSkin.id)}
        style={{
          width: `${CARD_WIDTH}px`,
          height: '88px',
          transform: `translateY(${skinDragY}px)`,
          transition: isGestureActive && activeGesture === 'skin_v' ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)'
        }}
        className="mx-auto rounded-2xl relative overflow-hidden active:scale-98 shadow-md cursor-pointer shrink-0 opacity-75 hover:opacity-100"
      >
        <SkinPlateVisual skinId={prevSkin.id} compact={true} />
      </div>

      {/* 3. 중앙 2-Layer 도크 (뒷단: 스킨 투영 레이어 / 앞단: 수평 명함 트랙) */}
      <div className="relative w-full h-[190px] flex items-center justify-center my-auto overflow-hidden shrink-0">
        {/* Layer 1 (뒷단): 중앙 도킹 위치에 고정된 액티브 2D 스킨 플레이트 (실시간 수직 트래킹) */}
        <div
          style={{
            width: `${CARD_WIDTH}px`,
            height: '190px',
            transform: `translate(-50%, ${skinDragY}px)`,
            transition: isGestureActive && activeGesture === 'skin_v' ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)'
          }}
          className={`absolute left-1/2 rounded-2xl overflow-hidden shadow-2xl pointer-events-none ${carouselIdx === 0 ? 'opacity-20' : 'opacity-100'
            }`}
        >
          <SkinPlateVisual skinId={activeSkinId} compact={true} />
        </div>

        {/* Layer 2 (앞단): 수평 X축 명함 트랙 (실시간 1:1 수평 트래킹 & 50% 임계값 스냅) */}
        <div className="absolute inset-0 flex items-center pointer-events-auto overflow-visible">
          <div
            className="absolute left-1/2 flex items-center will-change-transform"
            style={{
              gap: `${CARD_GAP}px`,
              // left: 50% 기준, 선택된 카드의 중심을 정확히 0(중앙)으로 정렬 + 실시간 cardDragX 반영
              transform: `translateX(calc(-${CARD_WIDTH / 2}px - ${carouselIdx * CARD_STEP}px + ${cardDragX}px))`,
              transition: isGestureActive && (activeGesture === 'card_h' || isFloating) ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)'
            }}
          >
            {/* [0번 슬롯] : [+ 새 명함 제작] 버튼 */}
            <div
              onClick={onCreateNewCard}
              style={{ width: `${CARD_WIDTH}px`, height: '190px' }}
              className={`rounded-2xl border-2 border-dashed border-white/40 hover:border-emerald-400/80 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${carouselIdx === 0 ? 'ring-2 ring-emerald-400/60 shadow-xl shadow-emerald-500/15 opacity-100' : 'opacity-50'
                }`}
            >
              <div className="w-13 h-13 rounded-2xl border-2 border-white/90 bg-black/50 backdrop-blur-md flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                <Plus className="w-7 h-7 text-emerald-400 stroke-[3]" />
              </div>
            </div>

            {/* [1번 ~ N번 슬롯] : 보유 명함들 (정면 2D 미니멀 뷰) */}
            {myCards.map((card, idx) => {
              const slotIdx = idx + 1;
              const isCurrent = carouselIdx === slotIdx;

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (!isCurrent) {
                      setCarouselIdx(slotIdx);
                    }
                  }}
                  style={{ width: `${CARD_WIDTH}px`, height: '190px' }}
                  className={`rounded-2xl shrink-0 transition-all duration-300 cursor-pointer ${isCurrent
                      ? isFloating
                        ? 'scale-105 shadow-[0_24px_60px_rgba(0,0,0,0.95)] ring-2 ring-sky-400 z-30'
                        : 'opacity-100 z-10'
                      : 'opacity-60 scale-95 z-0'
                    }`}
                >
                  <Card2DTransparent
                    card={card}
                    isFloating={isCurrent && isFloating}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. 하단 2D 순수 스킨 플레이트 (실시간 수직 트래킹 & 50% 스냅) */}
      <div
        onClick={() => handleApplySkin(nextSkin.id)}
        style={{
          width: `${CARD_WIDTH}px`,
          height: '88px',
          transform: `translateY(${skinDragY}px)`,
          transition: isGestureActive && activeGesture === 'skin_v' ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)'
        }}
        className="mx-auto rounded-2xl relative overflow-hidden active:scale-98 shadow-md cursor-pointer shrink-0 opacity-75 hover:opacity-100"
      >
        <SkinPlateVisual skinId={nextSkin.id} compact={true} />
      </div>

      {/* 5. 최하단 2단 버튼 구성 ([대표 명함 설정] & [명함첩]) */}
      <div className="w-full max-w-[300px] mx-auto pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-2.5 shrink-0">
        {carouselIdx === 0 ? (
          <div className="w-full py-3.5 px-6 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold text-center select-none">
            새 명함 제작 슬롯
          </div>
        ) : carouselIdx === 1 ? (
          <div className="w-full py-3.5 px-6 rounded-2xl bg-sky-500/15 border border-sky-400/50 text-sky-300 text-xs font-bold text-center select-none shadow-md shadow-sky-500/10 flex items-center justify-center gap-1.5">
            <span>★ 현재 대표 명함</span>
          </div>
        ) : (
          <button
            onClick={() => {
              if (currentCard) {
                handleSetRepresentative(currentCard.id);
              }
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 active:scale-98 border border-white/20 text-white text-xs font-bold shadow-xl shadow-sky-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>★ 대표 명함으로 설정</span>
          </button>
        )}

        <button
          onClick={onOpenWallet}
          className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-98 border border-white/20 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <FolderHeart className="w-4 h-4 text-sky-400" />
          <span>명함첩</span>
        </button>
      </div>
    </div>
  );
};
