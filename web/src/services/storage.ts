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
      return JSON.parse(raw);
    } catch {
      return INITIAL_MY_CARDS;
    }
  },

  saveMyCards(cards: CardData[]): void {
    localStorage.setItem(STORAGE_KEYS.MY_CARDS, JSON.stringify(cards));
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
      return JSON.parse(raw);
    } catch {
      return INITIAL_EXCHANGED_CARDS;
    }
  },

  saveExchangedCards(cards: ExchangedCardData[]): void {
    localStorage.setItem(STORAGE_KEYS.EXCHANGED_CARDS, JSON.stringify(cards));
  },

  addExchangedCard(card: CardData, memo?: string): ExchangedCardData {
    const list = this.getExchangedCards();
    const existingIdx = list.findIndex(c => c.uniqueCode.toLowerCase() === card.uniqueCode.toLowerCase());
    
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const exchangedItem: ExchangedCardData = {
      ...card,
      exchangedAt: now,
      isStarred: existingIdx >= 0 ? list[existingIdx].isStarred : false,
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
    const cleanCode = code.trim().toLowerCase();
    const norm = (c: string) => c.replace(/^@/, '').toLowerCase();

    // 1. 내 명함에서 검색
    const myCards = this.getMyCards();
    const myMatch = myCards.find(c => norm(c.uniqueCode) === norm(cleanCode));
    if (myMatch) return myMatch;

    // 2. 수집된 명함에서 검색
    const exCards = this.getExchangedCards();
    const exMatch = exCards.find(c => norm(c.uniqueCode) === norm(cleanCode));
    if (exMatch) return exMatch;

    // 3. 초기 시드 데이터에서 검색
    const seedMatch = INITIAL_EXCHANGED_CARDS.find(c => norm(c.uniqueCode) === norm(cleanCode));
    if (seedMatch) return seedMatch;

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
