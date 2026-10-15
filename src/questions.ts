import { Question, LevelConfig } from './types.ts';

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    levelNumber: 1,
    name: '1. Bölüm: Çimenli Tepe',
    description: "2, 3 ve 4'ler Çarpım Tablosu",
    theme: 'grassland',
    skyGradient: ['#60a5fa', '#93c5fd'],
    groundColor: '#22c55e',
    groundSubColor: '#854d0e',
    cloudColor: '#ffffff',
    tables: [2, 3, 4]
  },
  {
    levelNumber: 2,
    name: '2. Bölüm: Güneşli Piramitler',
    description: "5, 6 ve 7'ler Çarpım Tablosu",
    theme: 'desert',
    skyGradient: ['#fb923c', '#fdba74'],
    groundColor: '#eab308',
    groundSubColor: '#a16207',
    cloudColor: '#ffedd5',
    tables: [5, 6, 7]
  },
  {
    levelNumber: 3,
    name: '3. Bölüm: Kristal Buzlar',
    description: "8, 9 ve 10'lar Çarpım Tablosu",
    theme: 'iceland',
    skyGradient: ['#3b82f6', '#818cf8'],
    groundColor: '#38bdf8',
    groundSubColor: '#1e40af',
    cloudColor: '#e0f2fe',
    tables: [8, 9, 10]
  },
  {
    levelNumber: 4,
    name: '4. Bölüm: Kraliyet Şatosu',
    description: 'Büyük Final & Prensesi Kurtarış (Karma Sorular)',
    theme: 'castle',
    skyGradient: ['#8b5cf6', '#ec4899'],
    groundColor: '#64748b',
    groundSubColor: '#334155',
    cloudColor: '#fce7f3',
    tables: [2, 3, 4, 5, 6, 7, 8, 9, 10]
  }
];

// Helper to shuffle an array
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate realistic distractors for 3rd grade math
function generateDistractors(num1: number, num2: number, answer: number): number[] {
  const candidates = new Set<number>();

  // Typical multiplication errors:
  candidates.add(num1 * (num2 + 1));
  candidates.add(num1 * Math.max(1, num2 - 1));
  candidates.add((num1 + 1) * num2);
  candidates.add(Math.max(1, num1 - 1) * num2);
  candidates.add(answer + 2);
  candidates.add(Math.max(1, answer - 2));
  candidates.add(answer + 4);
  candidates.add(Math.max(1, answer - 4));
  candidates.add(answer + 10);
  candidates.add(Math.max(1, answer - 10));
  candidates.add(num1 + num2); // addition instead of multiplication

  // Filter out the actual answer and non-positive numbers
  const validDistractors = Array.from(candidates).filter(n => n > 0 && n !== answer);
  const shuffled = shuffle(validDistractors);

  // Take 2 or 3 distinct distractors so we have 3 or 4 options total
  const selected = shuffled.slice(0, 3);
  return shuffle([answer, ...selected]);
}

// Pre-curated, pedagogically structured question set for each level (10 questions per level = 40 total)
export function getLevelQuestions(level: number): Question[] {
  let pairs: [number, number][] = [];

  if (level === 1) {
    // 2, 3, 4 multiplication tables
    pairs = [
      [2, 3], [3, 4], [4, 5], [2, 7], [3, 6],
      [4, 4], [2, 9], [3, 8], [4, 7], [3, 9]
    ];
  } else if (level === 2) {
    // 5, 6, 7 multiplication tables
    pairs = [
      [5, 4], [6, 3], [7, 2], [5, 6], [6, 6],
      [7, 4], [5, 8], [6, 7], [7, 6], [7, 8]
    ];
  } else if (level === 3) {
    // 8, 9, 10 multiplication tables
    pairs = [
      [8, 3], [9, 2], [10, 4], [8, 6], [9, 5],
      [8, 7], [9, 7], [10, 8], [8, 9], [9, 9]
    ];
  } else {
    // Level 4: Mixed review & Princess castle run
    pairs = [
      [4, 8], [6, 8], [7, 7], [9, 6], [8, 8],
      [7, 9], [9, 8], [6, 9], [8, 5], [9, 9]
    ];
  }

  // Shuffle the question order slightly for variety if desired, but keep deterministic length 10
  return pairs.map(([n1, n2]) => {
    const answer = n1 * n2;
    const options = generateDistractors(n1, n2, answer);
    const hint = `İpucu: ${n1} x ${n2} demek, ${n1} tane ${n2}'yi (veya ${n2} tane ${n1}'i) toplamak demektir!`;
    return {
      num1: n1,
      num2: n2,
      answer,
      options,
      hint
    };
  });
}
