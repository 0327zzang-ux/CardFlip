import React, { useRef, useEffect } from 'react';
import { type CardData, type SkinId, SKINS } from '../types/card';
import { Check, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { SkinPlateVisual } from './SkinPlateVisual';

interface SkinSlotCarouselProps {
  card: CardData;
  activeSkinId: SkinId;
  onSelectSkin: (skinId: SkinId) => void;
}

export const SkinSlotCarousel: React.FC<SkinSlotCarouselProps> = ({
  card,
  activeSkinId,
  onSelectSkin
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<SkinId, HTMLDivElement>>(new Map());

  // Web Audio 기반 스킨 장착 '착!' 클릭/스냅 사운드
  const playSnapFeedback = () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // AudioContext 제한 시 무시
    }
  };

  const handleSelect = (skinId: SkinId) => {
    if (skinId !== activeSkinId) {
      playSnapFeedback();
      onSelectSkin(skinId);
    }
  };

  const activeIndex = SKINS.findIndex((s) => s.id === activeSkinId);

  const handlePrev = () => {
    const nextIdx = activeIndex > 0 ? activeIndex - 1 : SKINS.length - 1;
    handleSelect(SKINS[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = activeIndex < SKINS.length - 1 ? activeIndex + 1 : 0;
    handleSelect(SKINS[nextIdx].id);
  };

  // 활성화된 스킨 요소로 부드러운 스크롤 이동
  useEffect(() => {
    const el = itemRefs.current.get(activeSkinId);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSkinId]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* 상단 컨트롤 가이드 및 이전 버튼 */}
      <div className="w-full flex items-center justify-between px-6 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>상하 스킨 슬롯 (카드에 끼워맞추기)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 active:scale-90 transition-all border border-white/10"
            title="이전 스킨 (위로)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 active:scale-90 transition-all border border-white/10"
            title="다음 스킨 (아래로)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 상하 스킨 캐러셀 스냅 컨테이너 */}
      <div className="relative w-full max-w-[340px] px-4">
        {/* 가운데 슬롯 '끼워맞춤 장착 프레임' (Docking Bay) 가이드 라인 */}
        <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 h-[96px] rounded-2xl border-2 border-sky-400/40 shadow-[0_0_24px_rgba(56,189,248,0.18)] z-10" />

        <div
          ref={containerRef}
          className="w-full h-[210px] overflow-y-auto snap-y snap-mandatory scrollbar-none flex flex-col gap-3.5 py-14 px-2"
        >
          {SKINS.map((skin) => {
            const isSelected = skin.id === activeSkinId;

            return (
              <div
                key={skin.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(skin.id, el);
                  else itemRefs.current.delete(skin.id);
                }}
                onClick={() => handleSelect(skin.id)}
                className={`snap-center shrink-0 w-full aspect-[16/9] max-h-[96px] rounded-xl cursor-pointer relative overflow-hidden transition-all duration-300 select-none ${
                  isSelected
                    ? 'scale-105 shadow-xl shadow-sky-500/25 ring-2 ring-sky-400 z-20'
                    : 'scale-95 opacity-55 hover:opacity-85 hover:scale-100 border border-white/10'
                }`}
              >
                {/* 각 스킨별 직사각형 텍스처 그래픽 (명함과 동일 비율) */}
                <SkinPlateVisual skinId={skin.id} card={card} />

                {/* 선택 상태 장착 인디케이터 배지 */}
                <div className="absolute inset-0 flex items-center justify-between px-4 z-20 pointer-events-none">
                  <div className="flex flex-col drop-shadow-md">
                    <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1">
                      {skin.name}
                    </span>
                    <span className="text-[10px] text-white/80 font-medium">
                      {skin.desc}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/90 text-white text-[10px] font-bold shadow-lg shadow-sky-500/50 animate-in zoom-in-75">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>장착됨</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


