import React from 'react';
import type { CardData, SkinId } from '../types/card';

interface SkinPlateVisualProps {
  skinId: SkinId;
  card?: CardData;
  compact?: boolean;
}

export const SkinPlateVisual: React.FC<SkinPlateVisualProps> = ({ skinId, card, compact = false }) => {
  switch (skinId) {
    case 'hologram':
      return (
        <div className="w-full h-full relative bg-gradient-to-tr from-purple-800 via-pink-600 via-sky-500 to-indigo-800 p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/35 via-transparent to-black/35" />
          <div className="absolute -inset-1 bg-[conic-gradient(from_0deg,rgba(255,255,255,0.2),transparent_60%)] opacity-70 animate-pulse pointer-events-none" />
          {!compact && (
            <>
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] font-black tracking-widest text-white/90">PRISM 3D</span>
                <span className="text-[9px] font-mono text-white/70">{card?.uniqueCode || '#PRISM'}</span>
              </div>
              <div className="z-10 flex justify-between items-end">
                <span className="text-xs font-black text-white drop-shadow-md">{card?.name}</span>
                <span className="text-[9px] font-semibold text-white/80">{card?.affiliation}</span>
              </div>
            </>
          )}
        </div>
      );
    case 'matte':
      return (
        <div className="w-full h-full relative bg-gradient-to-br from-[#23242e] to-[#0d0e14] p-2.5 border border-white/10 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:8px_8px]" />
          {!compact && (
            <>
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] font-black tracking-widest text-slate-400">OBSIDIAN MATTE</span>
                <span className="text-[9px] font-mono text-slate-500">{card?.uniqueCode || '#MATTE'}</span>
              </div>
              <div className="z-10 flex justify-between items-end">
                <span className="text-xs font-bold text-slate-100">{card?.name}</span>
                <span className="text-[9px] font-semibold text-slate-400">{card?.affiliation}</span>
              </div>
            </>
          )}
        </div>
      );
    case 'glass':
      return (
        <div className="w-full h-full relative bg-gradient-to-br from-sky-400/30 via-indigo-500/20 to-purple-600/35 backdrop-blur-md p-2.5 border border-cyan-400/30 flex flex-col justify-between overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-cyan-400/25 blur-xl" />
          {!compact && (
            <>
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] font-black tracking-widest text-cyan-200">FROSTED GLASS</span>
                <span className="text-[9px] font-mono text-cyan-300/80">{card?.uniqueCode || '#GLASS'}</span>
              </div>
              <div className="z-10 flex justify-between items-end">
                <span className="text-xs font-bold text-white drop-shadow">{card?.name}</span>
                <span className="text-[9px] font-semibold text-cyan-200/90">{card?.affiliation}</span>
              </div>
            </>
          )}
        </div>
      );
    case 'neon':
      return (
        <div className="w-full h-full relative bg-[#070913] p-2.5 border border-cyan-400/60 shadow-[inset_0_0_14px_rgba(6,182,212,0.35)] flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d418_1px,transparent_1px),linear-gradient(to_bottom,#06b6d418_1px,transparent_1px)] bg-[size:12px_12px]" />
          {!compact && (
            <>
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] font-black tracking-widest text-cyan-400">CYBER NEON</span>
                <span className="text-[9px] font-mono text-fuchsia-400">{card?.uniqueCode || '#NEON'}</span>
              </div>
              <div className="z-10 flex justify-between items-end">
                <span className="text-xs font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">{card?.name}</span>
                <span className="text-[9px] font-semibold text-cyan-400/80">{card?.affiliation}</span>
              </div>
            </>
          )}
        </div>
      );
    case 'gold':
      return (
        <div className="w-full h-full relative bg-gradient-to-tr from-[#996515] via-[#d4af37] via-[#f7e39a] to-[#aa771c] p-2.5 text-slate-900 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.45)_0%,transparent_50%,rgba(0,0,0,0.25)_100%)]" />
          {!compact && (
            <>
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] font-black tracking-widest text-amber-950">CHAMPAGNE GOLD</span>
                <span className="text-[9px] font-mono text-amber-900">{card?.uniqueCode || '#GOLD'}</span>
              </div>
              <div className="z-10 flex justify-between items-end">
                <span className="text-xs font-black text-amber-950">{card?.name}</span>
                <span className="text-[9px] font-bold text-amber-900/90">{card?.affiliation}</span>
              </div>
            </>
          )}
        </div>
      );
    default:
      return null;
  }
};
