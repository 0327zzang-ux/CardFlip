import { type CardData, type ExchangedCardData, INITIAL_MY_CARDS, INITIAL_EXCHANGED_CARDS } from '../types/card';

const STORAGE_KEYS = {
  MY_CARDS: 'cardflip_my_cards_v2',
  ACTIVE_INDEX: 'cardflip_active_idx_v2',
  EXCHANGED_CARDS: 'cardflip_exchanged_cards_v2',
  DEVICE_ID: 'cardflip_device_id_v2'
};

export interface AppSyncState {
  deviceId?: string;
  deviceName?: string;
  myCards: CardData[];
  exchangedCards: ExchangedCardData[];
  activeIndex: number;
  updatedAt?: string;
}

// 서버로부터 초기 데이터를 불러오기 전까지 로컬 캐시로 서버를 덮어쓰지 못하도록 방지하는 가드
let isInitializedFromServer = false;
let syncDebounceTimer: any = null;

/**
 * 기기 고유 식별자(Device UUID) 획득 또는 자동 생성
 * - PC 호스트(localhost / 127.0.0.1)는 고정 호스트 ID('dev_pc_host') 사용
 * - 스마트폰 등 외부 기기는 고유한 무작위 UUID('dev_phone_xxxx')를 생성하여 본인 기기 로컬스토리지에 보관
 * - URL 파라미터 '?dev=xxx'가 있는 경우 해당 ID 우선
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'dev_pc_host';

  const params = new URLSearchParams(window.location.search);
  const paramDev = params.get('dev');
  if (paramDev) {
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, paramDev);
    return paramDev;
  }

  const existing = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (existing) return existing;

  const hostname = window.location.hostname;
  const isPcHost = hostname === 'localhost' || hostname === '127.0.0.1';

  let newId: string;
  if (isPcHost) {
    newId = 'dev_pc_host';
  } else {
    // 스마트폰 접속: 전 세계 유일 8자리 랜덤 UUID 자동 부여 (다수 폰 동시 접속 지원)
    const rand = Math.random().toString(36).substring(2, 10);
    newId = `dev_phone_${rand}`;
  }

  localStorage.setItem(STORAGE_KEYS.DEVICE_ID, newId);
  return newId;
}

/**
 * 상대방에게서 받은 명함인지 판별하는 엄격한 필터
 * (스마트폰에서 교환받은 '@my_luv' / '박상' / 교환 일시가 있는 카드는 절대 내 명함 목록에 들어갈 수 없음 - PC 호스트 기준)
 */
function isExchangedCard(card: any): boolean {
  if (!card) return false;
  const code = String(card.uniqueCode || '').toLowerCase().trim();
  const name = String(card.name || '').trim();
  const devId = getOrCreateDeviceId();
  // PC 호스트에서만 박상(@my_luv)을 교환 명함으로 판별
  if (devId === 'dev_pc_host') {
    return code === '@my_luv' || code === 'my_luv' || name === '박상' || Boolean(card.exchangedAt);
  }
  return Boolean(card.exchangedAt);
}

export const storage = {
  /**
   * 내 명함 목록과 교환된 명함첩을 엄격하게 분리하여 정제
   */
  sanitizeSeparation(): { myCards: CardData[]; exchangedCards: ExchangedCardData[] } {
    const rawMy = localStorage.getItem(STORAGE_KEYS.MY_CARDS);
    let myCards: CardData[] = INITIAL_MY_CARDS;
    if (rawMy) {
      try {
        const parsed = JSON.parse(rawMy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          myCards = parsed.filter((c): c is CardData => Boolean(c && typeof c === 'object' && c.id && c.name));
        }
      } catch {}
    }

    const rawEx = localStorage.getItem(STORAGE_KEYS.EXCHANGED_CARDS);
    let exchangedCards: ExchangedCardData[] = INITIAL_EXCHANGED_CARDS;
    if (rawEx) {
      try {
        const parsed = JSON.parse(rawEx);
        if (Array.isArray(parsed) && parsed.length > 0) {
          exchangedCards = parsed.filter((c): c is ExchangedCardData => Boolean(c && typeof c === 'object' && (c.name || c.uniqueCode)));
        }
      } catch {}
    }

    // PC 호스트인 경우 myCards에서 교환된 명함('박상' 등) 적출
    const devId = getOrCreateDeviceId();
    if (devId === 'dev_pc_host') {
      const contaminated = myCards.filter(isExchangedCard);
      const cleanMyCards = myCards.filter(c => !isExchangedCard(c));

      let exUpdated = false;
      for (const card of contaminated) {
        const code = String(card.uniqueCode || '').toLowerCase().trim();
        const exists = exchangedCards.some(e => String(e.uniqueCode || '').toLowerCase().trim() === code);
        if (!exists) {
          exchangedCards.unshift({
            ...card,
            id: card.id || `card_${card.uniqueCode || Date.now()}`,
            name: card.name || '박상',
            uniqueCode: card.uniqueCode || '@my_luv',
            skinId: card.skinId || 'glass',
            affiliation: card.affiliation || '스마트폰 사용자',
            occupation: card.occupation || '',
            email: card.email || '',
            phone: card.phone || '',
            bio: card.bio || '스마트폰으로부터 교환받은 명함입니다.',
            links: card.links || [],
            exchangedAt: (card as any).exchangedAt || '2026-11-18 12:20',
            isStarred: true,
            memo: (card as any).memo || '스마트폰에서 Wi-Fi 교환 완료'
          });
          exUpdated = true;
        }
      }

      if (contaminated.length > 0) {
        localStorage.setItem(STORAGE_KEYS.MY_CARDS, JSON.stringify(cleanMyCards));
      }
      if (exUpdated) {
        localStorage.setItem(STORAGE_KEYS.EXCHANGED_CARDS, JSON.stringify(exchangedCards));
      }

      return { myCards: cleanMyCards, exchangedCards };
    }

    return { myCards, exchangedCards };
  },

  getMyCards(): CardData[] {
    const { myCards } = this.sanitizeSeparation();
    return myCards.length > 0 ? myCards : INITIAL_MY_CARDS;
  },

  saveMyCards(cards: CardData[]): void {
    const valid = (cards || [])
      .filter(Boolean)
      .filter(c => !isExchangedCard(c));

    localStorage.setItem(STORAGE_KEYS.MY_CARDS, JSON.stringify(valid));
    this.scheduleSyncStateToServer();
    this.syncAllMyCardsToServer().catch(() => {});
  },

  /**
   * 로컬 네트워크 서버(/api/cards)로 명함 1장 실시간 등록 (모든 기기가 검색 가능한 공용 풀)
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
      // 오프라인 시 조용히 무시
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

  /**
   * 서버(/api/sync)로 본인 기기 전용 사물함(Device UUID)에 영구 저장
   */
  scheduleSyncStateToServer(): void {
    if (!isInitializedFromServer) return; // 서버 초기 복원 전 덮어쓰기 방지
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }
    syncDebounceTimer = setTimeout(() => {
      this.syncStateToServer().catch(() => {});
    }, 250);
  },

  async syncStateToServer(): Promise<void> {
    if (!isInitializedFromServer) return;
    try {
      const devId = getOrCreateDeviceId();
      const state: AppSyncState = {
        deviceId: devId,
        myCards: this.getMyCards(),
        exchangedCards: this.getExchangedCards(),
        activeIndex: this.getActiveCardIndex(),
        updatedAt: new Date().toISOString()
      };
      await fetch(`/api/sync?dev=${encodeURIComponent(devId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch {
      // 오프라인 시 로컬스토리지로 정상 유지
    }
  },

  /**
   * 앱 최초 구동 시 본인 기기 고유 ID(Device UUID)에 해당하는 사물함 데이터만 서버 디스크에서 복원
   */
  async fetchInitialStateFromServer(): Promise<{
    myCards: CardData[];
    exchangedCards: ExchangedCardData[];
    activeIndex: number;
    restored: boolean;
  }> {
    const devId = getOrCreateDeviceId();
    try {
      const res = await fetch(`/api/sync?dev=${encodeURIComponent(devId)}`);
      if (res.ok) {
        const stateData: AppSyncState = await res.json();
        if (stateData && typeof stateData === 'object') {
          let updated = false;

          // 1) 내 명함 목록 복원
          if (Array.isArray(stateData.myCards) && stateData.myCards.length > 0) {
            const cleanMyCards = stateData.myCards.filter(c => !isExchangedCard(c));
            localStorage.setItem(STORAGE_KEYS.MY_CARDS, JSON.stringify(cleanMyCards));
            updated = true;
          }

          // 2) 교환받은 명함 목록 복원
          if (Array.isArray(stateData.exchangedCards) && stateData.exchangedCards.length > 0) {
            localStorage.setItem(STORAGE_KEYS.EXCHANGED_CARDS, JSON.stringify(stateData.exchangedCards));
            updated = true;
          }

          const { myCards, exchangedCards } = this.sanitizeSeparation();

          const validIdx = typeof stateData.activeIndex === 'number' && stateData.activeIndex < myCards.length
            ? stateData.activeIndex
            : 0;
          localStorage.setItem(STORAGE_KEYS.ACTIVE_INDEX, validIdx.toString());

          isInitializedFromServer = true;

          if (updated && typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cardflip_cards_updated'));
          }

          return {
            myCards,
            exchangedCards,
            activeIndex: validIdx,
            restored: true
          };
        }
      } else if (res.status === 404) {
        // 새 기기(스마트폰 2번, 3번 등)가 처음 접속한 경우:
        // PC 호스트 데이터를 침범하지 않고 본인만의 신규 사물함을 서버에 등록
        isInitializedFromServer = true;
        const myCards = this.getMyCards();
        const exchangedCards = this.getExchangedCards();
        this.syncStateToServer().catch(() => {});
        return {
          myCards,
          exchangedCards,
          activeIndex: 0,
          restored: false
        };
      }
    } catch {
      // 서버 미응답 시 fallback
    }

    const { myCards, exchangedCards } = this.sanitizeSeparation();
    isInitializedFromServer = true;

    return {
      myCards,
      exchangedCards,
      activeIndex: this.getActiveCardIndex(),
      restored: false
    };
  },

  getActiveCardIndex(): number {
    const idx = parseInt(localStorage.getItem(STORAGE_KEYS.ACTIVE_INDEX) || '0', 10);
    const cards = this.getMyCards();
    return (idx >= 0 && idx < cards.length) ? idx : 0;
  },

  setActiveCardIndex(idx: number): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_INDEX, idx.toString());
    this.scheduleSyncStateToServer();
  },

  getExchangedCards(): ExchangedCardData[] {
    const { exchangedCards } = this.sanitizeSeparation();
    return exchangedCards.length > 0 ? exchangedCards : INITIAL_EXCHANGED_CARDS;
  },

  saveExchangedCards(cards: ExchangedCardData[]): void {
    const valid = (cards || []).filter(Boolean);
    localStorage.setItem(STORAGE_KEYS.EXCHANGED_CARDS, JSON.stringify(valid));
    this.scheduleSyncStateToServer();
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

    // 2. 서버 실시간 원격 조회 (공용 명함 풀에서 검색)
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

  /**
   * 비상용: 현재 모든 상태를 JSON 문자열로 내보내기 (Export)
   */
  exportStateToJson(): string {
    const state: AppSyncState = {
      deviceId: getOrCreateDeviceId(),
      myCards: this.getMyCards(),
      exchangedCards: this.getExchangedCards(),
      activeIndex: this.getActiveCardIndex(),
      updatedAt: new Date().toISOString()
    };
    return JSON.stringify(state, null, 2);
  },

  /**
   * 비상용: 외부 JSON 문자열로 상태 덮어쓰기 복원 (Import)
   */
  importStateFromJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.myCards)) {
        this.saveMyCards(parsed.myCards);
        if (Array.isArray(parsed.exchangedCards)) {
          this.saveExchangedCards(parsed.exchangedCards);
        }
        if (typeof parsed.activeIndex === 'number') {
          this.setActiveCardIndex(parsed.activeIndex);
        }
        return true;
      }
    } catch {
      // invalid
    }
    return false;
  },

  resetAll(): void {
    localStorage.removeItem(STORAGE_KEYS.MY_CARDS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_INDEX);
    localStorage.removeItem(STORAGE_KEYS.EXCHANGED_CARDS);
    localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
    this.saveMyCards(INITIAL_MY_CARDS);
    this.saveExchangedCards(INITIAL_EXCHANGED_CARDS);
    this.setActiveCardIndex(0);
  }
};