import React, { useState, useEffect } from 'react';
import { type CardData, SKINS } from '../types/card';
import { Card3DViewer } from './Card3DViewer';
import { downloadVCard } from '../services/vcard';
import { generateCardQRCode, getCardShareUrl } from '../services/qr';
import { storage } from '../services/storage';
import {
  RotateCw,
  UserPlus,
  Share2,
  ExternalLink,
  Phone,
  Mail,
  QrCode,
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface PublicCardViewProps {
  card: CardData;
  onGoToApp: () => void;
  onShowToast: (msg: string) => void;
}

export const PublicCardView: React.FC<PublicCardViewProps> = ({
  card,
  onGoToApp,
  onShowToast
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isSavedToWallet, setIsSavedToWallet] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    generateCardQRCode(card).then(setQrCodeUrl);
    // 내 지갑에 이미 있는지 확인
    const list = storage.getExchangedCards();
    const exists = list.some(c => c.uniqueCode.toLowerCase() === card.uniqueCode.toLowerCase());
    setIsSavedToWallet(exists);
  }, [card]);

  // 스마트폰 연락처에 저장 (.vcf)
  const handleSaveContact = () => {
    downloadVCard(card);
    onShowToast(`📲 '${card.name}'님의 연락처(.vcf) 파일이 다운로드되었습니다.`);
  };

  // 내 지갑에 저장
  const handleSaveToWallet = () => {
    storage.addExchangedCard(card, '공개 링크를 통해 수집됨');
    setIsSavedToWallet(true);
    onShowToast(`🎉 '${card.name}'님의 명함이 내 명함첩에 저장되었습니다!`);
  };

  // Web Share API 또는 링크 복사
  const handleShare = async () => {
    const shareUrl = getCardShareUrl(card);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${card.name}님의 디지털 명함 - CardFlip`,
          text: `${card.name} (${card.affiliation} ${card.occupation})의 3D 디지털 명함을 확인해보세요.`,
          url: shareUrl
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      onShowToast('📋 명함 링크가 클립보드에 복사되었습니다.');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      onShowToast('링크 복사에 실패했습니다.');
    }
  };

  const currentSkinMeta = SKINS.find(s => s.id === card.skinId) || SKINS[0];

  return (
    <div className="flex flex-col h-full bg-[#0d0e15] text-white overflow-hidden relative font-sans">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0d0e15]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-sky-500/20">
            CF
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-sky-400 uppercase">CardFlip 3D</div>
            <div className="text-sm font-bold truncate max-w-[150px]">{card.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFlipped(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-200 transition-all border border-white/10"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>{isFlipped ? '앞면' : '뒷면'}</span>
          </button>

          <button
            onClick={() => setShowQRModal(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/15 text-slate-200 transition-all border border-white/10"
            title="QR 코드 보기"
          >
            <QrCode className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </header>

      {/* 3D 스테이지 */}
      <main className="relative flex-1 flex flex-col items-center justify-center min-h-[360px] overflow-hidden">
        {/* 상단 힌트 배지 */}
        <div className="absolute top-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>카드를 드래그하여 360° 회전해보세요</span>
        </div>

        <Card3DViewer
          card={card}
          skinId={card.skinId}
          isFlipped={isFlipped}
          onFlipToggle={() => setIsFlipped(prev => !prev)}
          className="w-full h-full"
        />

        {/* 하단 스킨 배지 */}
        <div className="absolute bottom-3 left-4 z-10 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentSkinMeta.color }} />
          <span>스킨: {currentSkinMeta.name}</span>
        </div>
      </main>

      {/* 하단 액션 독 & 정보 바 */}
      <footer className="px-5 py-4 bg-[#13141f]/95 border-t border-white/10 backdrop-blur-xl z-20 space-y-3.5 shadow-2xl">
        {/* 스마트 하이퍼링크 칩 목록 */}
        {card.links && card.links.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {card.links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-sky-300 whitespace-nowrap transition-colors"
              >
                <span>{link.label}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ))}
          </div>
        )}

        {/* 핵심 3대 액션 버튼 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. 연락처 즉시 저장 (.vcf) */}
          <button
            onClick={handleSaveContact}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-semibold text-sm shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>연락처에 저장</span>
          </button>

          {/* 2. 내 명함첩에 저장 / 맞교환 */}
          <button
            onClick={handleSaveToWallet}
            disabled={isSavedToWallet}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border active:scale-[0.98] transition-all ${
              isSavedToWallet
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
            }`}
          >
            {isSavedToWallet ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>지갑에 저장됨</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>내 지갑에 저장</span>
              </>
            )}
          </button>
        </div>

        {/* 전화 / 이메일 / 공유 서브 컨트롤 */}
        <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <a
              href={`tel:${card.phone}`}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>전화</span>
            </a>
            <span className="opacity-30">•</span>
            <a
              href={`mailto:${card.email}`}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>이메일</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{isCopied ? '복사됨' : '공유하기'}</span>
            </button>
            <span className="opacity-30">•</span>
            <button
              onClick={onGoToApp}
              className="flex items-center gap-0.5 text-sky-400 hover:text-sky-300 font-semibold transition-colors"
            >
              <span>앱 홈</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

      {/* QR 코드 팝업 모달 */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181926] border border-white/15 rounded-3xl p-6 max-w-xs w-full flex flex-col items-center text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-white">{card.name}님의 3D 명함 QR</h3>
              <p className="text-xs text-slate-400 mt-1">
                기본 카메라 앱으로 스캔하면 이 3D 명함이 즉시 열립니다.
              </p>
            </div>

            {qrCodeUrl && (
              <div className="p-3 bg-white rounded-2xl shadow-inner">
                <img src={qrCodeUrl} alt="Card QR Code" className="w-48 h-48 block" />
              </div>
            )}

            <div className="text-[11px] font-mono text-slate-400 break-all px-2">
              {card.uniqueCode}
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
