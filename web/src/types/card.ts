export type SkinId = 'hologram' | 'matte' | 'glass' | 'neon' | 'gold';

export interface SkinMeta {
  id: SkinId;
  name: string;
  type: string;
  color: string;
  desc: string;
}

export interface LinkItem {
  id?: string;
  platform: 'portfolio' | 'notion' | 'github' | 'instagram' | 'linkedin' | 'youtube' | 'website' | 'other';
  label: string;
  url: string;
}

export interface CardData {
  id: string;
  uniqueCode: string;
  isPrimary?: boolean;
  skinId: SkinId;
  name: string;
  affiliation: string;
  occupation: string;
  email: string;
  phone: string;
  bio: string;
  avatarUrl?: string;
  links: LinkItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExchangedCardData extends CardData {
  exchangedAt: string;
  isStarred?: boolean;
  memo?: string;
  tags?: string[];
}

export const SKINS: SkinMeta[] = [
  { id: 'hologram', name: '홀로그램 프리즘', type: 'hologram', color: '#a855f7', desc: '빛 각도에 반응하는 무지개빛 스펙트럼' },
  { id: 'matte', name: '무광 흑요석', type: 'matte', color: '#1e1e2d', desc: '세련된 매트 블랙 & 실버 타이포' },
  { id: 'glass', name: '글래스모피즘', type: 'glass', color: '#38bdf8', desc: '반투명 젖은 아크릴 굴절 텍스처' },
  { id: 'neon', name: '사이버펑크 네온', type: 'neon', color: '#06b6d4', desc: '미래지향적 네온 그리드 & 글로우' },
  { id: 'gold', name: '샴페인 골드', type: 'gold', color: '#eab308', desc: '헤어라인 브러시드 골드 메탈릭' }
];

export const INITIAL_MY_CARDS: CardData[] = [
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
    bio: 'Processing 4와 Three.js 기반의 피지컬 인터랙션을 연구하고 있습니다.',
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

export const INITIAL_EXCHANGED_CARDS: ExchangedCardData[] = [
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
    tags: ['디자인', '토스'],
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
    tags: ['개발', '네이버'],
    links: [{ platform: 'github', label: 'GitHub 프로필', url: 'https://github.com' }]
  },
  {
    id: 'ex_03',
    uniqueCode: '@chloe_pm',
    name: '최지우',
    affiliation: '당근마켓',
    occupation: '프로덕트 오너 (PO)',
    email: 'jiwoo.choi@daangn.com',
    phone: '010-5512-8871',
    skinId: 'gold',
    bio: '지역 커뮤니티의 연결과 로컬 커머스 혁신을 주도합니다.',
    isStarred: false,
    exchangedAt: '2026-11-13 18:20',
    tags: ['기획', '당근'],
    links: [{ platform: 'website', label: '당근 팀 블로그', url: 'https://medium.com/daangn' }]
  }
];
