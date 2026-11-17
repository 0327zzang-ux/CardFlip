import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { ExchangedCardData, CardData } from '../types/card';
import { storage } from '../services/storage';
import { downloadVCard } from '../services/vcard';
import { generateCardQRCode } from '../services/qr';
import {
  X,
  Search,
  Star,
  Building,
  Briefcase,
  Layers,
  Phone,
  Mail,
  RotateCcw,
  Trash2,
  Eye,
  UserCheck,
  QrCode
} from 'lucide-react';

interface WalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreviewCard: (card: CardData) => void;
  onShowToast: (msg: string) => void;
}

type TabType = 'all' | 'affiliation' | 'occupation' | 'starred';

export const WalletDrawer: React.FC<WalletDrawerProps> = ({
  isOpen,
  onClose,
  onSelectPreviewCard,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState<ExchangedCardData[]>(() => storage.getExchangedCards());
  const [qrCard, setQrCard] = useState<ExchangedCardData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const handleOpenQR = (card: ExchangedCardData) => {
    setQrCard(card);
    generateCardQRCode(card).then(setQrCodeUrl);
  };

  // 데이터 새로고침
  const reloadCards = useCallback(() => {
    setCards(storage.getExchangedCards());
  }, []);

  // 1. 드로어가 열릴 때마다 로컬 스토리지 최신 명함 목록으로 갱신
  useEffect(() => {
    if (isOpen) {
      reloadCards();
    }
  }, [isOpen, reloadCards]);

  // 2. 앱 내 어디서든 명함이 추가/수정/삭제되면 실시간 감지하여 자동 갱신
  useEffect(() => {
    const handleCardsUpdated = () => {
      reloadCards();
    };
    window.addEventListener('cardflip_cards_updated', handleCardsUpdated);
    return () => {
      window.removeEventListener('cardflip_cards_updated', handleCardsUpdated);
    };
  }, [reloadCards]);

  // 즐겨찾기 토글
  const handleToggleStar = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = cards.map(c => {
      if (c.id === cardId) {
        return { ...c, isStarred: !c.isStarred };
      }
      return c;
    });
    storage.saveExchangedCards(updated);
    setCards(updated);
  };

  // 명함 삭제
  const handleDeleteCard = (cardId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`'${name}'님의 명함을 명함첩에서 삭제하시겠습니까?`)) return;
    const updated = cards.filter(c => c.id !== cardId);
    storage.saveExchangedCards(updated);
    setCards(updated);
    onShowToast(`🗑 '${name}'님의 명함이 삭제되었습니다.`);
  };

  // 데모 데이터 리셋
  const handleResetData = () => {
    if (window.confirm('명함첩 데이터를 기본 시연 상태로 초기화하시겠습니까?')) {
      storage.resetAll();
      reloadCards();
      onShowToast('🔄 시연 데이터가 초기화되었습니다.');
    }
  };

  // 검색 및 탭 필터링 (null-safe)
  const filteredCards = useMemo(() => {
    return cards.filter(c => {
      if (!c) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.affiliation || '').toLowerCase().includes(q) ||
        (c.occupation || '').toLowerCase().includes(q) ||
        (c.uniqueCode || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (activeTab === 'starred') return Boolean(c.isStarred);
      return true;
    });
  }, [cards, searchQuery, activeTab]);

  // 실시간 제스처 오프셋 (좌측 드래그 시 서랍 닫기 1:1 트래킹 & 50% 임계값 스냅)
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const drawerTouchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drawerTouchStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(false);
    setDragX(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawerTouchStartRef.current) return;
    const dx = e.clientX - drawerTouchStartRef.current.x;
    const dy = e.clientY - drawerTouchStartRef.current.y;
    // 가로 드래그 판별
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setIsDragging(true);
      if (dx < 0) {
        setDragX(dx);
      } else {
        setDragX(dx * 0.15);
      }
    }
  };

  const handlePointerUp = () => {
    if (!drawerTouchStartRef.current) return;
    drawerTouchStartRef.current = null;
    setIsDragging(false);

    // 50% 임계값: 서랍 폭의 절반(~140px) 기준으로 스냅 닫기 혹은 스냅 백
    if (dragX < -140) {
      onClose();
    }
    setDragX(0);
  };

  // 소속별/직무별 그룹핑
  const groupedCards = useMemo(() => {
    if (activeTab !== 'affiliation' && activeTab !== 'occupation') return null;

    const groups: { [key: string]: ExchangedCardData[] } = {};
    filteredCards.forEach(c => {
      const key = activeTab === 'affiliation' ? (c.affiliation || '기타') : (c.occupation || '기타');
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [filteredCards, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)'
        }}
        className="w-full max-w-md bg-[#13141f] border-r border-white/10 flex flex-col h-full text-white shadow-2xl relative select-none touch-none"
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-base">스마트 명함첩</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-medium">
              {cards.length}장
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색창 */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="이름, 소속, 직무, @ID 검색..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
        </div>

        {/* 분류 탭 버튼들 */}
        <div className="flex items-center px-5 gap-1.5 border-b border-white/10 pb-2.5 pt-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'all'
                ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>전체</span>
          </button>

          <button
            onClick={() => setActiveTab('affiliation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'affiliation'
                ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>소속별</span>
          </button>

          <button
            onClick={() => setActiveTab('occupation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'occupation'
                ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>직무별</span>
          </button>

          <button
            onClick={() => setActiveTab('starred')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'starred'
                ? 'bg-amber-500 text-white font-semibold shadow-md shadow-amber-500/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>즐겨찾기</span>
          </button>
        </div>

        {/* 카드 목록 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {filteredCards.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              일치하는 명함이 없습니다.
            </div>
          ) : groupedCards ? (
            // 소속별/직무별 아코디언 그룹 렌더링
            Object.entries(groupedCards).map(([groupTitle, groupItems]) => (
              <div key={groupTitle} className="space-y-2">
                <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-sky-400">
                  <span>{groupTitle}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300">
                    {groupItems.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {groupItems.map(c => (
                    <CardListItem
                      key={c.id}
                      card={c}
                      onSelect={() => {
                        onSelectPreviewCard(c);
                        onClose();
                      }}
                      onToggleStar={e => handleToggleStar(c.id, e)}
                      onDelete={e => handleDeleteCard(c.id, c.name, e)}
                      onSaveContact={e => {
                        e.stopPropagation();
                        downloadVCard(c);
                        onShowToast(`📲 '${c.name}'님의 연락처가 다운로드되었습니다.`);
                      }}
                      onOpenQR={e => {
                        e.stopPropagation();
                        handleOpenQR(c);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // 일반 리스트 렌더링
            filteredCards.map(c => (
              <CardListItem
                key={c.id}
                card={c}
                onSelect={() => {
                  onSelectPreviewCard(c);
                  onClose();
                }}
                onToggleStar={e => handleToggleStar(c.id, e)}
                onDelete={e => handleDeleteCard(c.id, c.name, e)}
                onSaveContact={e => {
                  e.stopPropagation();
                  downloadVCard(c);
                  onShowToast(`📲 '${c.name}'님의 연락처가 다운로드되었습니다.`);
                }}
                onOpenQR={e => {
                  e.stopPropagation();
                  handleOpenQR(c);
                }}
              />
            ))
          )}
        </div>

        {/* 하단 유틸리티 (데이터 리셋) */}
        <div className="p-4 border-t border-white/10 bg-[#0e0f17]">
          <button
            onClick={handleResetData}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>데모 샘플 데이터 초기화</span>
          </button>
        </div>

        {/* 명함첩 내 카드 QR 팝업 모달 */}
        {qrCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#181926] border border-white/15 rounded-3xl p-6 max-w-xs w-full flex flex-col items-center text-center shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <QrCode className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-bold text-base text-white">{qrCard.name}님의 명함 QR</h3>
                <p className="text-xs text-slate-400 mt-1">
                  스마트폰 카메라로 스캔하면 이 명함이 즉시 열립니다.
                </p>
              </div>

              {qrCodeUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-inner">
                  <img src={qrCodeUrl} alt="Card QR Code" className="w-48 h-48 block" />
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  QR 생성 중...
                </div>
              )}

              <div className="text-[11px] font-mono text-slate-400 break-all px-2">
                {qrCard.uniqueCode}
              </div>

              <button
                onClick={() => setQrCard(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface CardListItemProps {
  card: ExchangedCardData;
  onSelect: () => void;
  onToggleStar: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onSaveContact: (e: React.MouseEvent) => void;
  onOpenQR: (e: React.MouseEvent) => void;
}

const CardListItem: React.FC<CardListItemProps> = ({
  card,
  onSelect,
  onToggleStar,
  onDelete,
  onSaveContact,
  onOpenQR
}) => {
  return (
    <div
      onClick={onSelect}
      className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group hover:border-sky-500/40 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{card.name || '이름 없음'}</span>
            <span className="text-[11px] font-mono text-sky-400">{card.uniqueCode || '@card'}</span>
          </div>
          <div className="text-xs text-slate-300 mt-0.5">{card.affiliation || ''}</div>
          <div className="text-[11px] text-slate-400">{card.occupation || ''}</div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStar}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="즐겨찾기"
          >
            <Star
              className={`w-4 h-4 ${card.isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-500 hover:text-slate-300'
                }`}
            />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onSaveContact}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
          >
            <Phone className="w-3 h-3" />
            <span>연락처 추가</span>
          </button>
          <a
            href={`mailto:${card.email}`}
            onClick={e => e.stopPropagation()}
            className="hover:text-white transition-colors"
          >
            <Mail className="w-3 h-3" />
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenQR}
            className="flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors"
            title="QR 코드 보기"
          >
            <QrCode className="w-3 h-3 text-sky-400" />
            <span>QR</span>
          </button>

          <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-300 transition-colors">
            <Eye className="w-3 h-3" />
            <span>3D 보기</span>
          </div>
        </div>
      </div>
    </div>
  );
};
