/**
 * wallet.js : 명함 데이터 모델, LocalStorage 저장소 및 지능형 자동 분류 모듈
 */

const STORAGE_KEYS = {
  MY_CARDS: 'cardflip_my_cards_v1',
  ACTIVE_INDEX: 'cardflip_active_idx_v1',
  EXCHANGED_CARDS: 'cardflip_exchanged_cards_v1'
};

// 5종 시그니처 3D 스킨 메타데이터
const SKINS = [
  { id: 'hologram', name: '홀로그램 프리즘', type: 'hologram', color: '#a855f7', desc: '무지개빛 스펙트럼 반사' },
  { id: 'matte', name: '무광 흑요석', type: 'matte', color: '#1e1e2d', desc: '매트 블랙 & 실버 타이포' },
  { id: 'glass', name: '글래스모피즘', type: 'glass', color: '#38bdf8', desc: '반투명 젖은 아크릴 굴절' },
  { id: 'neon', name: '사이버 네온', type: 'neon', color: '#06b6d4', desc: '사이버틱 네온 그리드 글로우' },
  { id: 'gold', name: '샴페인 골드', type: 'gold', color: '#eab308', desc: '헤어라인 브러시드 골드' }
];

// 초기 기본 내 명함 3장 (멀티 페르소나)
const SEED_MY_CARDS = [
  {
    id: 'my_card_01',
    uniqueCode: '@minsu_design',
    isPrimary: true,
    skinId: 'hologram',
    name: '김민수',
    affiliation: '네오스튜디오 (Neo Studio)',
    occupation: 'UI/UX 디자이너',
    email: 'minsu.design@neo.io',
    phone: '010-8241-9920',
    bio: '인터랙티브 3D 경험과 감각적인 디지털 인터페이스를 설계합니다.',
    links: [
      { platform: 'portfolio', label: '🎨 포트폴리오', url: 'https://minsu-portfolio.web.app' },
      { platform: 'notion', label: '📝 노션 이력서', url: 'https://notion.so/minsu-resume' },
      { platform: 'instagram', label: '📷 인스타그램', url: 'https://instagram.com/minsu_ui' }
    ]
  },
  {
    id: 'my_card_02',
    uniqueCode: '@minsu_student',
    isPrimary: false,
    skinId: 'matte',
    name: '김민수',
    affiliation: '한국대학교 뉴미디어아트학과',
    occupation: '학부 연구생 (디자인학부)',
    email: 'minsu.kim@hankuk.ac.kr',
    phone: '010-8241-9920',
    bio: 'Processing 4와 Three.js 기반의 피지컬 컴퓨팅을 연구하고 있습니다.',
    links: [
      { platform: 'github', label: '💻 GitHub', url: 'https://github.com/minsu-kim' },
      { platform: 'website', label: '🏫 연구실 프로젝트', url: 'https://lab.hankuk.ac.kr' }
    ]
  },
  {
    id: 'my_card_03',
    uniqueCode: '@minsu_creator',
    isPrimary: false,
    skinId: 'neon',
    name: 'MINSU (김민수)',
    affiliation: '인디 크리에이티브 크루',
    occupation: '3D 제너레이티브 아티스트',
    email: 'creator.minsu@gmail.com',
    phone: '010-8241-9920',
    bio: 'WebGL & 실시간 셰이더로 디지털 공간 아트를 만듭니다.',
    links: [
      { platform: 'portfolio', label: '✨ 아카이브', url: 'https://minsu.art' },
      { platform: 'youtube', label: '🎬 튜토리얼 채널', url: 'https://youtube.com/@minsu_3d' }
    ]
  }
];

// 초기 교환된 명함 8장 (소속/직무별 풍성한 샘플 데이터)
const SEED_EXCHANGED_CARDS = [
  {
    id: 'ex_01',
    uniqueCode: '@sarah_art',
    name: '이서연',
    affiliation: '토스 (Toss)',
    occupation: '프로덕트 디자이너',
    email: 'seoyeon.lee@toss.im',
    phone: '010-3321-4455',
    skinId: 'glass',
    bio: '금융을 더 쉽고 간결하게 만드는 사용자 경험을 디자인합니다.',
    isStarred: true,
    exchangedAt: '2026-11-10 14:32',
    links: [{ platform: 'portfolio', label: '디자인 블로그', url: 'https://toss.tech' }]
  },
  {
    id: 'ex_02',
    uniqueCode: '@hyunwoo_dev',
    name: '박현우',
    affiliation: '네이버 클라우드',
    occupation: '프론트엔드 리드 개발자',
    email: 'hyunwoo.park@navercorp.com',
    phone: '010-9943-1204',
    skinId: 'neon',
    bio: '초대규모 트래픽 웹 프론트엔드 아키텍처와 WebGL 렌더링 최적화 연구 중.',
    isStarred: true,
    exchangedAt: '2026-11-12 11:15',
    links: [{ platform: 'github', label: 'GitHub Profile', url: 'https://github.com' }]
  },
  {
    id: 'ex_03',
    uniqueCode: '@daeun_3d',
    name: '정다은',
    affiliation: '넥슨 (Nexon)',
    occupation: '3D 테크니컬 아티스트',
    email: 'daeun.jung@nexon.co.kr',
    phone: '010-5541-7782',
    skinId: 'hologram',
    bio: '언리얼 엔진 셰이더 및 캐릭터 라이팅 파이프라인 개발.',
    isStarred: false,
    exchangedAt: '2026-11-13 16:40',
    links: [{ platform: 'artstation', label: 'ArtStation', url: 'https://artstation.com' }]
  },
  {
    id: 'ex_04',
    uniqueCode: '@yujin_pm',
    name: '최유진',
    affiliation: '카카오 (Kakao)',
    occupation: '서비스 기획자 (PM)',
    email: 'yujin.choi@kakaocorp.com',
    phone: '010-2184-9031',
    skinId: 'matte',
    bio: '데이터 기반 프로덕트 그로스 및 인터랙티브 신규 서비스 런칭.',
    isStarred: false,
    exchangedAt: '2026-11-14 09:20',
    links: [{ platform: 'brunch', label: '브런치 스토리', url: 'https://brunch.co.kr' }]
  },
  {
    id: 'ex_05',
    uniqueCode: '@doyun_ai',
    name: '강도윤',
    affiliation: '삼성전자 종합기술원',
    occupation: 'AI 리서치 엔지니어',
    email: 'doyun.kang@samsung.com',
    phone: '010-7761-4523',
    skinId: 'gold',
    bio: '온디바이스 비전 모델 및 멀티모달 인터랙션 연구.',
    isStarred: false,
    exchangedAt: '2026-11-14 17:05',
    links: [{ platform: 'google_scholar', label: '학술 논문 목록', url: 'https://scholar.google.com' }]
  },
  {
    id: 'ex_06',
    uniqueCode: '@minji_media',
    name: '송민지',
    affiliation: '한국대학교 미술대학',
    occupation: '미디어아트 작가',
    email: 'minji.song@hankuk.ac.kr',
    phone: '010-4491-3829',
    skinId: 'hologram',
    bio: '프로젝션 맵핑과 터치 인터랙션을 결합한 몰입형 공간 전시 제작.',
    isStarred: true,
    exchangedAt: '2026-11-15 13:50',
    links: [{ platform: 'instagram', label: '작품 아카이브', url: 'https://instagram.com' }]
  },
  {
    id: 'ex_07',
    uniqueCode: '@jaewon_mkt',
    name: '조재원',
    affiliation: '무신사 (Musinsa)',
    occupation: '브랜드 마케터',
    email: 'jaewon.cho@musinsa.com',
    phone: '010-8831-2910',
    skinId: 'matte',
    bio: '스트리트 패션 브랜드 캠페인 및 인터랙티브 팝업 스토어 기획.',
    isStarred: false,
    exchangedAt: '2026-11-15 18:10',
    links: [{ platform: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com' }]
  },
  {
    id: 'ex_08',
    uniqueCode: '@suah_code',
    name: '한수아',
    affiliation: '스타트업 스튜디오 모나드',
    occupation: '풀스택 엔지니어',
    email: 'suah.han@monad.studio',
    phone: '010-6621-9944',
    skinId: 'neon',
    bio: 'React, Node.js 및 Three.js 기반의 크리에이티브 웹 서비스 구축.',
    isStarred: false,
    exchangedAt: '2026-11-16 10:30',
    links: [{ platform: 'github', label: 'GitHub', url: 'https://github.com' }]
  }
];

// 시연용 모의 교환 풀 (1초 테스트 QR 스캔 시 무작위 지급)
const MOCK_EXCHANGE_POOL = [
  {
    uniqueCode: '@elena_3d',
    name: '엘레나 (Elena Choi)',
    affiliation: '구글 코리아 (Google)',
    occupation: '크리에이티브 엔지니어',
    email: 'elena.choi@google.com',
    phone: '010-9123-4567',
    skinId: 'hologram',
    bio: 'WebXR과 Three.js를 활용한 미래형 웹 인터랙션 실험가.',
    links: [{ platform: 'portfolio', label: '실험실 사이트', url: 'https://experiments.withgoogle.com' }]
  },
  {
    id: 'mock_02',
    uniqueCode: '@taeho_creator',
    name: '윤태호',
    affiliation: '라인 (LINE Plus)',
    occupation: '모션 그래픽 디자이너',
    email: 'taeho.yoon@linecorp.com',
    phone: '010-5432-9876',
    skinId: 'gold',
    bio: '2D/3D 캐릭터 모션과 Lottie 인터랙티브 마이크로 애니메이션 전문.',
    links: [{ platform: 'behance', label: '비핸스 포트폴리오', url: 'https://behance.net' }]
  }
];

class WalletManager {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.MY_CARDS)) {
      localStorage.setItem(STORAGE_KEYS.MY_CARDS, JSON.stringify(SEED_MY_CARDS));
    }
    if (localStorage.getItem(STORAGE_KEYS.ACTIVE_INDEX) === null) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_INDEX, '0');
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXCHANGED_CARDS)) {
      localStorage.setItem(STORAGE_KEYS.EXCHANGED_CARDS, JSON.stringify(SEED_EXCHANGED_CARDS));
    }
  }

  // --- 내 명함 관리 ---
  getMyCards() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_CARDS) || '[]');
  }

  saveMyCards(cards) {
    localStorage.setItem(STORAGE_KEYS.MY_CARDS, JSON.stringify(cards));
  }

  getActiveCardIndex() {
    return parseInt(localStorage.getItem(STORAGE_KEYS.ACTIVE_INDEX) || '0', 10);
  }

  setActiveCardIndex(idx) {
    const cards = this.getMyCards();
    const safeIdx = Math.max(0, Math.min(idx, cards.length - 1));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_INDEX, safeIdx.toString());
    return safeIdx;
  }

  getActiveCard() {
    const cards = this.getMyCards();
    const idx = this.getActiveCardIndex();
    return cards[idx] || cards[0];
  }

  // 활성 명함에 스킨 적용
  applySkinToActiveCard(skinId) {
    const cards = this.getMyCards();
    const idx = this.getActiveCardIndex();
    if (cards[idx]) {
      cards[idx].skinId = skinId;
      this.saveMyCards(cards);
    }
    return cards[idx];
  }

  // 신규 명함 생성
  createNewCard(cardData) {
    const cards = this.getMyCards();
    const newCard = {
      id: 'my_card_' + Date.now(),
      uniqueCode: cardData.uniqueCode || ('@minsu_' + (cards.length + 1)),
      isPrimary: false,
      skinId: cardData.skinId || 'hologram',
      name: cardData.name || '김민수',
      affiliation: cardData.affiliation || '새로운 소속',
      occupation: cardData.occupation || '크리에이터',
      email: cardData.email || 'minsu@sample.com',
      phone: cardData.phone || '010-0000-0000',
      bio: cardData.bio || '새로운 페르소나 명함입니다.',
      links: cardData.links || [{ platform: 'website', label: '🔗 대표 링크', url: 'https://github.com' }]
    };
    cards.push(newCard);
    this.saveMyCards(cards);
    this.setActiveCardIndex(cards.length - 1);
    return newCard;
  }

  // --- 교환된 명함 관리 ---
  getExchangedCards() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXCHANGED_CARDS) || '[]');
  }

  addExchangedCard(card) {
    const cards = this.getExchangedCards();
    // 중복 체크 (고유 ID 기준)
    const exists = cards.some(c => c.uniqueCode === card.uniqueCode);
    if (exists) {
      return { success: false, message: '이미 명함첩에 등록된 상대방입니다.' };
    }

    const newExCard = {
      ...card,
      id: 'ex_' + Date.now(),
      exchangedAt: new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      isStarred: false
    };
    cards.unshift(newExCard);
    localStorage.setItem(STORAGE_KEYS.EXCHANGED_CARDS, JSON.stringify(cards));
    return { success: true, card: newExCard };
  }

  // --- 지능형 자동 분류 알고리즘 ---

  // 1. 소속(회사/학교)별 그룹화
  groupByAffiliation() {
    const cards = this.getExchangedCards();
    const groups = {};

    cards.forEach(card => {
      // 텍스트 정규화: 소속명 단순화
      let aff = (card.affiliation || '기타/미지정').trim();
      if (!groups[aff]) {
        groups[aff] = [];
      }
      groups[aff].push(card);
    });

    return groups;
  }

  // 2. 직업/직무별 카테고리 자동 클러스터링
  groupByOccupation() {
    const cards = this.getExchangedCards();
    const categories = {
      '디자인 / 3D 아트': [],
      '개발 / 엔지니어링': [],
      '기획 / PM': [],
      '마케팅 / 비즈니스': [],
      '연구 / 기타': []
    };

    cards.forEach(card => {
      const occ = (card.occupation || '').toLowerCase();
      if (occ.includes('디자인') || occ.includes('art') || occ.includes('3d') || occ.includes('모션')) {
        categories['디자인 / 3D 아트'].push(card);
      } else if (occ.includes('개발') || occ.includes('엔지니어') || occ.includes('frontend') || occ.includes('code')) {
        categories['개발 / 엔지니어링'].push(card);
      } else if (occ.includes('기획') || occ.includes('pm') || occ.includes('프로덕트')) {
        categories['기획 / PM'].push(card);
      } else if (occ.includes('마케팅') || occ.includes('브랜드') || occ.includes('사업')) {
        categories['마케팅 / 비즈니스'].push(card);
      } else {
        categories['연구 / 기타'].push(card);
      }
    });

    return categories;
  }

  // 시연 데이터 초기화
  resetDemoData() {
    localStorage.setItem(STORAGE_KEYS.MY_CARDS, JSON.stringify(SEED_MY_CARDS));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_INDEX, '0');
    localStorage.setItem(STORAGE_KEYS.EXCHANGED_CARDS, JSON.stringify(SEED_EXCHANGED_CARDS));
  }
}

// 전역 인스턴스 노출
window.walletManager = new WalletManager();
window.SKINS = SKINS;
window.MOCK_EXCHANGE_POOL = MOCK_EXCHANGE_POOL;
