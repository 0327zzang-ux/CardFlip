import { useState, useEffect, useCallback } from 'react';
import { type CardData, type SkinId, SKINS } from './types/card';
import { storage } from './services/storage';
import { Card3DViewer } from './components/Card3DViewer';
import { PublicCardView } from './components/PublicCardView';
import { WalletDrawer } from './components/WalletDrawer';
import { QRExchangeModal } from './components/QRExchangeModal';
import { EditCardModal } from './components/EditCardModal';
import { Toast } from './components/Toast';
import {
  Menu,
  RotateCw,
  QrCode,
  Edit3,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  X
} from 'lucide-react';

export default function App() {
  const [myCards, setMyCards] = useState<CardData[]>(() => storage.getMyCards());
  const [activeIdx, setActiveIdx] = useState<number>(() => storage.getActiveCardIndex());
  const [isFlipped, setIsFlipped] = useState(false);

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

  const activeCard = myCards[activeIdx] || myCards[0];

  // 다음 / 이전 명함 전환
  const handlePrevCard = useCallback(() => {
    setActiveIdx((prev) => {
      const next = prev > 0 ? prev - 1 : myCards.length - 1;
      storage.setActiveCardIndex(next);
      return next;
    });
    setIsFlipped(false);
  }, [myCards.length]);

  const handleNextCard = useCallback(() => {
    setActiveIdx((prev) => {
      const next = prev < myCards.length - 1 ? prev + 1 : 0;
      storage.setActiveCardIndex(next);
      return next;
    });
    setIsFlipped(false);
  }, [myCards.length]);

  // 스킨 롤링 변경
  const handleCycleSkin = useCallback((direction: 'next' | 'prev') => {
    if (!activeCard) return;
    const currentSkinIdx = SKINS.findIndex((s) => s.id === activeCard.skinId);
    let nextIdx = direction === 'next' ? currentSkinIdx + 1 : currentSkinIdx - 1;
    if (nextIdx >= SKINS.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = SKINS.length - 1;

    const newSkinId: SkinId = SKINS[nextIdx].id;
    const updatedCards = myCards.map((c, i) => {
      if (i === activeIdx) {
        return { ...c, skinId: newSkinId };
      }
      return c;
    });

    setMyCards(updatedCards);
    storage.saveMyCards(updatedCards);
    showToast(`✨ 스킨 변경: ${SKINS[nextIdx].name}`);
  }, [activeCard, activeIdx, myCards, showToast]);

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
      showToast(`✏️ '${card.name}'님의 명함 정보가 수정되었습니다.`);
    } else {
      updated = [...myCards, card];
      setActiveIdx(updated.length - 1);
      storage.setActiveCardIndex(updated.length - 1);
      showToast(`🎉 새로운 명함이 생성되었습니다!`);
    }
    setMyCards(updated);
    storage.saveMyCards(updated);
  };

  // 만약 퍼블릭 카드 뷰 모드라면 바로 PublicCardView 렌더링
  if (publicCard) {
    return (
      <div className="w-full h-screen max-w-md mx-auto relative overflow-hidden bg-[#0d0e15] shadow-2xl flex flex-col">
        <PublicCardView
          card={publicCard}
          onGoToApp={() => {
            // URL 파라미터 제거 후 일반 앱 모드로 전환
            window.history.pushState({}, '', window.location.pathname);
            setPublicCard(null);
          }}
          onShowToast={showToast}
        />
        <Toast message={toastMessage} />
      </div>
    );
  }

  const currentSkinMeta = SKINS.find((s) => s.id === activeCard?.skinId) || SKINS[0];

  return (
    <div className="w-full h-screen max-w-md mx-auto relative overflow-hidden bg-[#0d0e15] text-white flex flex-col font-sans select-none shadow-2xl border-x border-white/5">
      {/* 1. 상단 헤더 바 */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0d0e15]/80 backdrop-blur-md z-20">
        <button
          onClick={() => setIsWalletOpen(true)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10"
          title="명함첩 열기"
        >
          <Menu className="w-5 h-5 text-sky-400" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            <span>CardFlip 3D</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </h1>
          <span className="text-[10px] font-semibold tracking-wider text-sky-400/90 uppercase">
            DIGITAL WALLET MVP
          </span>
        </div>

        <button
          onClick={() => setIsFlipped((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-200 transition-all border border-white/10"
          title="앞뒷면 180° 뒤집기"
        >
          <RotateCw className="w-3.5 h-3.5 text-sky-400" />
          <span>{isFlipped ? '앞면' : '뒷면'}</span>
        </button>
      </header>

      {/* 2. 2축 제스처 가이드 힌트 배지 */}
      <div className="absolute top-16 inset-x-0 z-10 flex justify-between px-4 pointer-events-none text-[11px] text-slate-400">
        <button
          onClick={handlePrevCard}
          className="pointer-events-auto flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-sky-400" />
          <span>이전</span>
        </button>

        <button
          onClick={() => handleCycleSkin('next')}
          className="pointer-events-auto flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors text-sky-300"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>스킨 변경 (↑/↓)</span>
        </button>

        <button
          onClick={handleNextCard}
          className="pointer-events-auto flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
        >
          <span>다음</span>
          <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
        </button>
      </div>

      {/* 3. 메인 3D 카드 스테이지 */}
      <main className="relative flex-1 flex flex-col items-center justify-center min-h-[380px] overflow-hidden">
        {activeCard && (
          <Card3DViewer
            card={activeCard}
            skinId={activeCard.skinId}
            isFlipped={isFlipped}
            onFlipToggle={() => setIsFlipped((prev) => !prev)}
            className="w-full h-full"
          />
        )}
      </main>

      {/* 4. 스마트 하이퍼링크 독 */}
      {activeCard?.links && activeCard.links.length > 0 && (
        <div className="px-5 py-2 z-10 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {activeCard.links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-sky-300 whitespace-nowrap transition-colors"
            >
              <span>{link.label}</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          ))}
        </div>
      )}

      {/* 5. 하단 플로팅 컨트롤 바 */}
      <footer className="px-5 py-4 border-t border-white/10 bg-[#12131f]/95 backdrop-blur-xl z-20 flex items-center justify-between">
        {/* 명함 슬라이드 인디케이터 & 수정 버튼 */}
        <div className="flex items-center gap-1.5">
          <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
            {activeIdx + 1} / {myCards.length}
          </div>
          <button
            onClick={() => {
              setEditingCard(activeCard);
              setIsEditOpen(true);
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="명함 수정"
          >
            <Edit3 className="w-4 h-4 text-sky-400" />
          </button>
        </div>

        {/* 중앙 플로팅 QR 교환 버튼 */}
        <div className="relative -top-3">
          <button
            onClick={() => setIsExchangeOpen(true)}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 p-0.5 shadow-xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            title="QR 코드 교환"
          >
            <div className="w-full h-full rounded-[14px] bg-[#12131f]/40 backdrop-blur-sm flex items-center justify-center text-white">
              <QrCode className="w-7 h-7" />
            </div>
          </button>
        </div>

        {/* 새 명함 만들기 & 현재 스킨 표시 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setEditingCard(null);
              setIsEditOpen(true);
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="새 명함 추가"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
          </button>

          <div
            onClick={() => handleCycleSkin('next')}
            className="cursor-pointer px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="클릭하여 스킨 변경"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentSkinMeta.color }}
            />
            <span className="text-slate-300 truncate max-w-[65px]">{currentSkinMeta.name}</span>
          </div>
        </div>
      </footer>

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

      {/* 글로벌 토스트 알림 */}
      <Toast message={toastMessage} />
    </div>
  );
}
