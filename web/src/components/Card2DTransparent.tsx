import React from 'react';
import type { CardData } from '../types/card';

interface Card2DTransparentProps {
  card: CardData;
  isFloating?: boolean;
  className?: string;
}

export const Card2DTransparent: React.FC<Card2DTransparentProps> = ({
  card,
  isFloating = false,
  className = ''
}) => {
  return (
    <div
      className={`w-full h-full rounded-2xl relative overflow-hidden p-4 sm:p-5 flex flex-col justify-between border border-white/30 select-none transition-all duration-200 ${
        isFloating
          ? 'scale-105 shadow-[0_24px_60px_rgba(0,0,0,0.95)] ring-2 ring-sky-400 bg-white/[0.05]'
          : 'bg-white/[0.02]'
      } ${className}`}
      style={{
        // 텍스트와 테두리 외에는 투명 색상 디폴트 (배후 스킨 투영)
        background: 'rgba(255, 255, 255, 0.02)',
      }}
    >
      {/* 글래스 반사광 하이라이트 */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] pointer-events-none" />

      {/* 상단: 이름 및 고유 식별 코드 */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate">
            {card.name}
          </h2>
          <p className="text-[11px] font-semibold text-white/90 mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] truncate">
            {card.affiliation} · {card.occupation}
          </p>
        </div>
        <div className="px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-xs border border-white/20 shrink-0">
          <span className="text-[10px] font-mono font-bold text-white/90 tracking-wider">
            {card.uniqueCode || '#CARD'}
          </span>
        </div>
      </div>

      {/* 중앙 미니멀 구분선 */}
      <div className="relative z-10 w-full flex items-center gap-2 my-auto">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-white/40 via-white/20 to-transparent" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
      </div>

      {/* 하단: 연락처 정보 및 기하학 심볼 */}
      <div className="relative z-10 flex items-end justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="text-[10px] font-mono text-white/95 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] truncate">
            <span className="font-bold text-white/60 shrink-0">EMAIL</span>
            <span className="truncate">{card.email}</span>
          </div>
          <div className="text-[10px] font-mono text-white/95 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] truncate">
            <span className="font-bold text-white/60 shrink-0">TEL</span>
            <span className="truncate">{card.phone}</span>
          </div>
        </div>

        {/* 미니멀 원형 그래픽 심볼 */}
        <div className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center opacity-80 pointer-events-none shrink-0">
          <div className="w-3.5 h-3.5 rounded-full border border-white/40 border-dashed" />
        </div>
      </div>
    </div>
  );
};
