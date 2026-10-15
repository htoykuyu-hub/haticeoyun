export interface Question {
  num1: number;
  num2: number;
  answer: number;
  options: number[];
  hint: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'sparkle' | 'confetti' | 'brick' | 'star' | 'heart' | 'smoke' | 'fire';
  rotation?: number;
  vRot?: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  size: number;
  font?: string;
}

export interface QuestionBlock {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  isCorrect: boolean;
  state: 'idle' | 'hit_correct' | 'hit_wrong' | 'broken';
  offsetY: number;
  shakeX: number;
  shakeTimer: number;
  glowTimer: number;
  texture: 'question' | 'brick';
}

export interface LevelConfig {
  levelNumber: number;
  name: string;
  description: string;
  theme: 'grassland' | 'desert' | 'iceland' | 'castle';
  skyGradient: [string, string];
  groundColor: string;
  groundSubColor: string;
  cloudColor: string;
  tables: number[];
}

export interface TurtleEnemy {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  state: 'emerging' | 'walking' | 'hit_cat' | 'retreating';
  facing: 'left' | 'right';
  walkCycle: number;
  shellTimer: number;
  opacity: number;
  active: boolean;
  color: 'green' | 'red';
}

export interface Costume {
  id: string;
  name: string;
  description: string;
  cost: number;
  minScore: number;
  hatColor: string;
  hatHighlight?: string;
  shirtColor: string;
  shirtHighlight?: string;
  overallsColor: string;
  overallsHighlight?: string;
  capeColor?: string;
  capeTrim?: string;
  hasCrown?: boolean;
  hasMask?: boolean;
  hasUnicornHorn?: boolean;
  hasCyberVisor?: boolean;
  hasKnightArmor?: boolean;
  furColor?: string;
  specialAura?: 'fire' | 'stars' | 'gold' | 'ice' | 'rainbow' | 'cosmic' | 'cyber' | 'none';
  badgeLetter: string;
  tag: string;
  icon: string;
}

export const COSTUMES: Costume[] = [
  {
    id: 'classic',
    name: 'Klasik Mario Kedi',
    description: '3 Boyutlu ikonik kırmızı şapka ve mavi işçi tulumu!',
    cost: 0,
    minScore: 0,
    hatColor: '#dc2626',
    hatHighlight: '#f87171',
    shirtColor: '#dc2626',
    shirtHighlight: '#ef4444',
    overallsColor: '#2563eb',
    overallsHighlight: '#60a5fa',
    badgeLetter: 'M',
    tag: 'BAŞLANGIÇ',
    icon: '🐱'
  },
  {
    id: 'luigi',
    name: 'Luigi Kedi Stili',
    description: 'Zümrüt yeşili 3D şapka, kobalt tulum ve cesur macera ruhu!',
    cost: 25,
    minScore: 400,
    hatColor: '#16a34a',
    hatHighlight: '#4ade80',
    shirtColor: '#16a34a',
    shirtHighlight: '#22c55e',
    overallsColor: '#1d4ed8',
    overallsHighlight: '#3b82f6',
    badgeLetter: 'L',
    tag: 'POPÜLER',
    icon: '🟢'
  },
  {
    id: 'fire',
    name: 'Ateş Kedisi (Fire Cat)',
    description: 'Ateş çiçeği gücü! Sedefli beyaz şapka ve adımlarda alev aurası.',
    cost: 55,
    minScore: 1000,
    hatColor: '#ffffff',
    hatHighlight: '#fef08a',
    shirtColor: '#ffffff',
    shirtHighlight: '#f8fafc',
    overallsColor: '#dc2626',
    overallsHighlight: '#f87171',
    specialAura: 'fire',
    badgeLetter: 'F',
    tag: 'ALEVLİ',
    icon: '🔥'
  },
  {
    id: 'ice',
    name: 'Buz Kristali Kedisi',
    description: 'Kutup soğuğu! Buzul mavisi tulum ve uçuşan kar kristalleri.',
    cost: 85,
    minScore: 1800,
    hatColor: '#06b6d4',
    hatHighlight: '#a5f3fc',
    shirtColor: '#0891b2',
    shirtHighlight: '#67e8f9',
    overallsColor: '#0284c7',
    overallsHighlight: '#38bdf8',
    specialAura: 'ice',
    badgeLetter: 'I',
    tag: 'DONMUŞ',
    icon: '❄️'
  },
  {
    id: 'tanooki',
    name: 'Tanooki Rakun Kedi',
    description: 'Özel yaprak gücü! 3D çizgili tüylü rakun kuyruğu ve kestane kürk.',
    cost: 120,
    minScore: 2500,
    hatColor: '#92400e',
    hatHighlight: '#d97706',
    shirtColor: '#b45309',
    shirtHighlight: '#f59e0b',
    overallsColor: '#78350f',
    overallsHighlight: '#b45309',
    furColor: '#92400e',
    badgeLetter: 'T',
    tag: 'ÖZEL GÜÇ',
    icon: '🍂'
  },
  {
    id: 'super_cape',
    name: 'Süper Kahraman Kedisi',
    description: 'Gizemli kahraman maskesi, uçuşan 3D altın pelerin ve yıldızlar!',
    cost: 165,
    minScore: 3200,
    hatColor: '#4f46e5',
    hatHighlight: '#818cf8',
    shirtColor: '#4338ca',
    shirtHighlight: '#6366f1',
    overallsColor: '#312e81',
    overallsHighlight: '#4f46e5',
    capeColor: '#facc15',
    capeTrim: '#ca8a04',
    hasMask: true,
    specialAura: 'stars',
    badgeLetter: 'S',
    tag: 'EFSANEVİ',
    icon: '🦸'
  },
  {
    id: 'rainbow',
    name: 'Gökkuşağı Yıldız Kedisi',
    description: 'Süper Yıldız gücü! Renk değiştiren prizmatik gökkuşağı aurası.',
    cost: 220,
    minScore: 4000,
    hatColor: '#ec4899',
    hatHighlight: '#f472b6',
    shirtColor: '#8b5cf6',
    shirtHighlight: '#a78bfa',
    overallsColor: '#3b82f6',
    overallsHighlight: '#60a5fa',
    specialAura: 'rainbow',
    badgeLetter: '⭐',
    tag: 'YILDIZ GÜCÜ',
    icon: '🌈'
  },
  {
    id: 'diamond_knight',
    name: 'Elmas Şövalye Kedisi',
    description: '3 Boyutlu elmas kask, zırhlı tulum ve kristal parlama efektleri!',
    cost: 280,
    minScore: 5000,
    hatColor: '#0284c7',
    hatHighlight: '#38bdf8',
    shirtColor: '#0369a1',
    shirtHighlight: '#7dd3fc',
    overallsColor: '#075985',
    overallsHighlight: '#38bdf8',
    hasKnightArmor: true,
    specialAura: 'ice',
    badgeLetter: '⚔️',
    tag: 'ZIRHLI',
    icon: '💎'
  },
  {
    id: 'cosmic',
    name: 'Kozmik Galaksi Kedisi',
    description: 'Derin uzay nebulası! Parıldayan yıldız tozu ve kozmik halkalar.',
    cost: 350,
    minScore: 6200,
    hatColor: '#1e1b4b',
    hatHighlight: '#6366f1',
    shirtColor: '#312e81',
    shirtHighlight: '#818cf8',
    overallsColor: '#0f172a',
    overallsHighlight: '#38bdf8',
    capeColor: '#4338ca',
    specialAura: 'cosmic',
    badgeLetter: '🌌',
    tag: 'KOZMİK',
    icon: '🪐'
  },
  {
    id: 'cyber_mecha',
    name: 'Siber Mecha Kedisi',
    description: 'Geleceğin robotu! Parlayan LED vizör ve siber devre çizgileri.',
    cost: 430,
    minScore: 7500,
    hatColor: '#334155',
    hatHighlight: '#06b6d4',
    shirtColor: '#1e293b',
    shirtHighlight: '#38bdf8',
    overallsColor: '#0f172a',
    overallsHighlight: '#22d3ee',
    hasCyberVisor: true,
    specialAura: 'cyber',
    badgeLetter: '🤖',
    tag: 'FÜTÜRİSTİK',
    icon: '⚡'
  },
  {
    id: 'unicorn',
    name: 'Büyülü Tekboynuz Kedi',
    description: 'Spiral altın boynuz, pembe peri pelerini ve gökkuşağı sihir tozu!',
    cost: 520,
    minScore: 8800,
    hatColor: '#f472b6',
    hatHighlight: '#fbcfe8',
    shirtColor: '#ec4899',
    shirtHighlight: '#f9a8d4',
    overallsColor: '#a855f7',
    overallsHighlight: '#d8b4fe',
    capeColor: '#f43f5e',
    hasUnicornHorn: true,
    specialAura: 'rainbow',
    badgeLetter: '🦄',
    tag: 'BÜYÜLÜ',
    icon: '🦄'
  },
  {
    id: 'royal_gold',
    name: '24K Saf Altın Kral Kedi',
    description: 'Saf altın taç, kraliyet yakutları, mor kadife pelerin ve altın ışıltı!',
    cost: 650,
    minScore: 10000,
    hatColor: '#eab308',
    hatHighlight: '#fef08a',
    shirtColor: '#fbbf24',
    shirtHighlight: '#fef08a',
    overallsColor: '#581c87',
    overallsHighlight: '#a855f7',
    capeColor: '#7e22ce',
    capeTrim: '#facc15',
    hasCrown: true,
    specialAura: 'gold',
    badgeLetter: '👑',
    tag: 'HÜKÜMDAR',
    icon: '👑'
  }
];
