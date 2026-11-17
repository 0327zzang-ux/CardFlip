import { type CardData, type ExchangedCardData, INITIAL_MY_CARDS, INITIAL_EXCHANGED_CARDS } from '../types/card';

const STORAGE_KEYS = {
  MY_CARDS: 'cardflip_my_cards_v2',
  ACTIVE_INDEX: 'cardflip_active_idx_v2',
  EXCHANGED_CARDS: 'cardflip_exchanged_cards_v2'
};

export const storage = {
  getMyCards(): CardData[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MY_CARDS);
    if (!raw) {
      this.saveMyCards(INITIAL_MY_CARDS);
      return INITIAL_MY_CARDS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((c): c is CardData => Boolean(c && typeof c === 'object' && c.id && c.name));
      }
      return INITIAL_MY_CARDS;
    } catch {
      return INITIAL_MY_CARDS;
    }
  },

  saveMyCards(cards: CardData[]): void {
    const valid = (cards || []).filter(Boolean);
    localStorage.setItem(STORAGE_KEYS.MY_CARDS, JSON.stringify(valid));
    // 로컬 Wi-Fi 서버로 실시간 비동기 동기화
    this.syncAllMyCardsToServer().catch(() => {});
  },

  /**
   * 로컬 네트워크 서버(/api/cards)로 명함 1장 실시간 등록
   */
  async syncCardToServer(card: CardData): Promise<void> {
    if (!card || !card.uniqueCode) return;
    try {
      await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
    } catch {
      // 오프라인이거나 서버 미지원 시 조용히 무시 (로컬스토리지 보존)
    }
  },

  /**
   * 내가 보유한 모든 명함을 서버로 백그라운드 일괄 동기화
   */
  async syncAllMyCardsToServer(): Promise<void> {
    const myCards = this.getMyCards();
    for (const card of myCards) {
      await this.syncCardToServer(card);
    }
  },

  getActiveCardIndex(): number {
    const idx = parseInt(localStorage.getItem(STORAGE_KEYS.ACTIVE_INDEX) || '0', 10);
    const cards = this.getMyCards();
    return (idx >= 0 && idx < cards.length) ? idx : 0;
  },

  setActiveCardIndex(idx: number): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_INDEX, idx.toString());
  },

  getExchangedCards(): ExchangedCardData[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXCHANGED_CARDS);
    if (!raw) {
      this.saveExchangedCards(INITIAL_EXCHANGED_CARDS);
      return INITIAL_EXCHANGED_CARDS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((c): c is ExchangedCardData => Boolean(c && typeof c === 'object' && (c.name || c.uniqueCode)))
          .map(c => ({
            ...c,
            id: c.id || `card_${c.uniqueCode || Date.now()}`,
            name: c.name || '이름 없음',
            uniqueCode: c.uniqueCode || '@card',
            affiliation: c.affiliation || '',
            occupation: c.occupation || '',
            email: c.email || '',
            phone: c.phone || '',
            skinId: c.skinId || 'hologram'
          }));
      }
      return INITIAL_EXCHANGED_CARDS;
    } catch {
      return INITIAL_EXCHANGED_CARDS;
    }
  },

  saveExchangedCards(cards: ExchangedCardData[]): void {
    const valid = (cards || []).filter(Boolean);
    localStorage.setItem(STORAGE_KEYS.EXCHANGED_CARDS, JSON.stringify(valid));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cardflip_cards_updated'));
    }
  },

  addExchangedCard(card: CardData, memo?: string): ExchangedCardData {
    if (!card) {
      throw new Error('Invalid card data');
    }
    const list = this.getExchangedCards();
    const cardCode = (card.uniqueCode || '').toLowerCase().trim();
    const existingIdx = list.findIndex(c => (c.uniqueCode || '').toLowerCase().trim() === cardCode);
    
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const cardId = card.id || `card_${card.uniqueCode || Date.now()}`;
    const exchangedItem: ExchangedCardData = {
      ...card,
      id: cardId,
      name: card.name || '이름 없음',
      uniqueCode: card.uniqueCode || '@card',
      affiliation: card.affiliation || '',
      occupation: card.occupation || '',
      email: card.email || '',
      phone: card.phone || '',
      skinId: card.skinId || 'hologram',
      exchangedAt: now,
      isStarred: existingIdx >= 0 ? Boolean(list[existingIdx].isStarred) : false,
      memo: memo || (existingIdx >= 0 ? list[existingIdx].memo : '')
    };

    if (existingIdx >= 0) {
      list[existingIdx] = exchangedItem;
    } else {
      list.unshift(exchangedItem);
    }

    this.saveExchangedCards(list);
    return exchangedItem;
  },

  findCardByCode(code: string): CardData | null {
    if (!code || typeof code !== 'string') return null;
    const cleanCode = code.trim().toLowerCase();
    const norm = (c?: string) => (c || '').replace(/^@/, '').toLowerCase().trim();

    // 1. 내 명함에서 검색
    const myCards = this.getMyCards();
    const myMatch = myCards.find(c => c && norm(c.uniqueCode) === norm(cleanCode));
    if (myMatch) return myMatch;

    // 2. 수집된 명함에서 검색
    const exCards = this.getExchangedCards();
    const exMatch = exCards.find(c => c && norm(c.uniqueCode) === norm(cleanCode));
    if (exMatch) return exMatch;

    // 3. 초기 시드 데이터에서 검색
    const seedMatch = INITIAL_EXCHANGED_CARDS.find(c => c && norm(c.uniqueCode) === norm(cleanCode));
    if (seedMatch) return seedMatch;

    return null;
  },

  /**
   * 로컬 스토리지에 없는 경우 로컬 네트워크 서버(/api/cards)로 실시간 조회
   * (스마트폰에서 새로 제작한 명함을 PC에서 ID로 즉시 조회 가능)
   */
  async findCardByCodeAsync(code: string): Promise<CardData | null> {
    // 1. 로컬 스토리지 우선 검색
    const local = this.findCardByCode(code);
    if (local) return local;

    // 2. 서버 실시간 원격 조회
    try {
      const clean = code.trim();
      const res = await fetch(`/api/cards?code=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const remoteCard = await res.json();
        if (remoteCard && remoteCard.name) {
          return remoteCard as CardData;
        }
      }
    } catch {
      // 서버 미응답 시 null
    }

    return null;
  },

  resetAll(): void {
    localStorage.removeItem(STORAGE_KEYS.MY_CARDS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_INDEX);
    localStorage.removeItem(STORAGE_KEYS.EXCHANGED_CARDS);
    this.saveMyCards(INITIAL_MY_CARDS);
    this.saveExchangedCards(INITIAL_EXCHANGED_CARDS);
    this.setActiveCardIndex(0);
  }
};
