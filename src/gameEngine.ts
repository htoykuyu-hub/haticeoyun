import { Question, QuestionBlock, Particle, FloatingText, LevelConfig, TurtleEnemy, COSTUMES, Costume } from './types.ts';
import { getLevelQuestions } from './questions.ts';
import { audio } from './audio.ts';
import { haptics } from './haptics.ts';

export interface BrickShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
}

export interface SpeedLine {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

export interface GoldCoinFX {
  x: number;
  y: number;
  vy: number;
  startY: number;
  active: boolean;
  spin: number;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  // Virtual resolution
  public readonly width = 960;
  public readonly height = 540;
  public readonly groundY = 440;

  // Game state
  public currentLevelIndex = 0;
  public currentQuestionIndex = 0;
  public score = 0;
  public streak = 0;
  public coins = 0;
  public isLevelComplete = false;
  public isGameFinished = false;
  public isGameOver = false;
  public isPaused = false;
  public currentHint: string | null = null;
  public levelConfigs: LevelConfig[];
  public currentQuestions: Question[] = [];

  // 3 Lives System
  public lives = 3;
  public maxLives = 3;

  // Koopa Troopa Enemies (Kaplumbağalar)
  public turtles: TurtleEnemy[] = [];

  // Costumes & Wardrobe System
  public currentCostumeId = 'classic';
  public unlockedCostumeIds: string[] = ['classic'];

  // World scrolling & Forward Progression
  public worldScroll = 0;
  public isAdvancing = false;
  public advanceTimer = 0;
  public advanceSpeed = 460;

  // Grand Finale: Castle, Run & Hugging scene
  public isCastleRevealed = false;
  public isCastleRun = false;
  public isHugging = false;
  public hugTimer = 0;
  public hugHeartTimer = 0;

  // Visual effects
  public brickShards: BrickShard[] = [];
  public speedLines: SpeedLine[] = [];
  public goldCoin: GoldCoinFX | null = null;
  private dustSpawnTimer = 0;

  // Callbacks to UI
  public onStateChange?: () => void;
  public onLevelComplete?: (level: number) => void;
  public onGameFinished?: () => void;
  public onGameOver?: () => void;

  // Player (Mario Cat)
  public cat = {
    x: 120,
    y: 376,
    w: 54,
    h: 64,
    vx: 0,
    vy: 0,
    speed: 5.8,
    jumpPower: -13.8,
    isGrounded: true,
    facing: 'right' as 'left' | 'right',
    walkCycle: 0,
    isJumping: false,
    hitReaction: 0,
    happyReaction: 0,
    invulnerableTimer: 0,
  };

  // Input states
  public keys = {
    left: false,
    right: false,
    jump: false,
  };

  // Entities
  public blocks: QuestionBlock[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public clouds: { x: number; y: number; scale: number; speed: number }[] = [];
  public hills: { baseX: number; y: number; r: number; color: string }[] = [];
  public roadsideProps: { baseX: number; type: 'bush' | 'pipe' | 'flower' }[] = [];

  // Princess
  public princess = {
    x: 790,
    y: 366,
    w: 56,
    h: 74,
    floatOffset: 0,
    cheerTimer: 0,
    saved: false,
  };

  private animationFrameId: number | null = null;
  private lastTime = 0;
  private praiseWords = ['HARİKA!', 'SÜPER!', 'BRAVO!', 'MÜKEMMEL!', 'ÇOK İYİ!', 'ŞAMPİYON!'];

  constructor(canvas: HTMLCanvasElement, levelConfigs: LevelConfig[]) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.levelConfigs = levelConfigs;

    this.loadProgress();
    this.initWorld();
    this.setupLevel(0);
  }

  public loadProgress() {
    try {
      const savedCoins = localStorage.getItem('mario_cat_coins');
      if (savedCoins !== null) {
        const c = parseInt(savedCoins, 10);
        if (!isNaN(c) && c >= 0) this.coins = c;
      }
      const savedCostumes = localStorage.getItem('mario_cat_unlocked_costumes');
      if (savedCostumes) {
        const parsed = JSON.parse(savedCostumes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.unlockedCostumeIds = parsed;
        }
      }
      const savedEquipped = localStorage.getItem('mario_cat_equipped_costume');
      if (savedEquipped && this.unlockedCostumeIds.includes(savedEquipped)) {
        this.currentCostumeId = savedEquipped;
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  public saveProgress() {
    try {
      localStorage.setItem('mario_cat_coins', String(this.coins));
      localStorage.setItem('mario_cat_unlocked_costumes', JSON.stringify(this.unlockedCostumeIds));
      localStorage.setItem('mario_cat_equipped_costume', this.currentCostumeId);
    } catch {
      // Storage unavailable
    }
  }

  private initWorld() {
    this.clouds = [
      { x: 50, y: 70, scale: 1.1, speed: 0.25 },
      { x: 320, y: 120, scale: 0.8, speed: 0.2 },
      { x: 620, y: 60, scale: 1.3, speed: 0.3 },
      { x: 880, y: 100, scale: 0.9, speed: 0.18 },
    ];

    this.hills = [
      { baseX: 100, y: 440, r: 85, color: '#16a34a' },
      { baseX: 450, y: 440, r: 120, color: '#15803d' },
      { baseX: 800, y: 440, r: 95, color: '#16a34a' },
      { baseX: 1150, y: 440, r: 130, color: '#15803d' },
      { baseX: 1500, y: 440, r: 90, color: '#16a34a' },
    ];

    this.roadsideProps = [
      { baseX: 240, type: 'flower' },
      { baseX: 540, type: 'bush' },
      { baseX: 850, type: 'flower' },
      { baseX: 1100, type: 'pipe' },
      { baseX: 1400, type: 'bush' },
      { baseX: 1700, type: 'flower' },
    ];
  }

  public setQuestions(questions: Question[]) {
    this.currentQuestions = questions;
    this.loadQuestion(0);
  }

  public setupLevel(levelIdx: number) {
    this.currentLevelIndex = levelIdx;
    this.currentQuestionIndex = 0;
    this.isLevelComplete = false;
    this.isGameFinished = false;
    this.isGameOver = false;
    this.isAdvancing = false;
    this.isCastleRevealed = false;
    this.isCastleRun = false;
    this.isHugging = false;
    this.hugTimer = 0;
    this.currentHint = null;
    this.worldScroll = 0;
    this.cat.x = 120;
    this.cat.y = this.groundY - this.cat.h;
    this.cat.vx = 0;
    this.cat.vy = 0;
    this.cat.invulnerableTimer = 0;
    this.princess.saved = false;
    this.turtles = [];
  }

  public loadQuestion(qIndex: number) {
    if (!this.currentQuestions || qIndex >= this.currentQuestions.length) {
      this.handleLevelCompleted();
      return;
    }

    this.currentQuestionIndex = qIndex;
    const q = this.currentQuestions[qIndex];
    this.currentHint = null;

    this.cat.x = 140;
    this.cat.y = this.groundY - this.cat.h;
    this.cat.vx = 0;
    this.cat.vy = 0;

    if (this.currentLevelIndex === 3) {
      this.isCastleRevealed = false;
      this.isCastleRun = false;
      this.isHugging = false;
    }

    const count = q.options.length;
    const blockWidth = 76;
    const blockHeight = 64;
    const startX = count === 4 ? 140 : 200;
    const spacing = count === 4 ? 200 : 240;
    const blockY = 220;

    this.blocks = q.options.map((val, idx) => ({
      id: idx,
      x: startX + idx * spacing,
      y: blockY,
      width: blockWidth,
      height: blockHeight,
      value: val,
      isCorrect: val === q.answer,
      state: 'idle',
      offsetY: -220,
      shakeX: 0,
      shakeTimer: 0,
      glowTimer: 0,
      texture: (idx % 2 === 0 ? 'question' : 'brick') as 'question' | 'brick',
    }));

    if (this.onStateChange) this.onStateChange();
  }

  public handleJumpInput(isDown: boolean) {
    if (this.isAdvancing || this.isCastleRun || this.isHugging || this.isGameOver) return;
    if (isDown && !this.keys.jump && this.cat.isGrounded) {
      this.cat.vy = this.cat.jumpPower;
      this.cat.isGrounded = false;
      this.cat.isJumping = true;
      audio.playJump();
      haptics.jump();
    }
    this.keys.jump = isDown;
  }

  // Costumes logic
  public buyCostume(costume: Costume): boolean {
    if (this.unlockedCostumeIds.includes(costume.id)) {
      this.setCostume(costume.id);
      return true;
    }

    if (this.coins >= costume.cost && this.score >= costume.minScore) {
      this.coins -= costume.cost;
      this.unlockedCostumeIds.push(costume.id);
      this.currentCostumeId = costume.id;
      this.saveProgress();
      audio.playCostumeUnlock();
      haptics.costumeEquip();
      if (this.onStateChange) this.onStateChange();
      return true;
    }
    return false;
  }

  public setCostume(costumeId: string) {
    if (this.unlockedCostumeIds.includes(costumeId)) {
      this.currentCostumeId = costumeId;
      this.saveProgress();
      haptics.buttonPress();
      if (this.onStateChange) this.onStateChange();
    }
  }

  public start() {
    this.lastTime = performance.now();
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      if (!this.isPaused && !this.isGameOver) {
        this.update(dt);
      }
      this.render();

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private update(dt: number) {
    if (this.cat.invulnerableTimer > 0) {
      this.cat.invulnerableTimer -= dt;
    }

    // A. INTER-QUESTION ADVANCING
    if (this.isAdvancing) {
      this.advanceTimer -= dt;
      this.worldScroll += this.advanceSpeed * dt;

      this.cat.facing = 'right';
      this.cat.walkCycle += dt * 24;
      this.cat.isGrounded = true;

      const targetCatX = 160;
      this.cat.x += (targetCatX - this.cat.x) * 4 * dt;

      this.dustSpawnTimer += dt;
      if (this.dustSpawnTimer >= 0.08) {
        this.dustSpawnTimer = 0;
        this.spawnRunningDust(this.cat.x + 8, this.groundY - 4);
      }

      if (Math.random() < 0.4) {
        this.speedLines.push({
          x: this.width + 20,
          y: 80 + Math.random() * (this.groundY - 120),
          len: 60 + Math.random() * 80,
          speed: 800 + Math.random() * 400,
          alpha: 0.7,
        });
      }

      if (this.advanceTimer <= 0) {
        this.isAdvancing = false;
        if (this.currentQuestionIndex + 1 >= this.currentQuestions.length) {
          this.handleLevelCompleted();
        } else {
          this.loadQuestion(this.currentQuestionIndex + 1);
        }
      }
    }
    // B. LEVEL 4 FINAL: RUNNING TOWARDS CASTLE & PRINCESS
    else if (this.isCastleRun) {
      this.cat.facing = 'right';
      this.cat.walkCycle += dt * 22;
      this.cat.isGrounded = true;
      this.cat.x += 240 * dt;

      this.dustSpawnTimer += dt;
      if (this.dustSpawnTimer >= 0.08) {
        this.dustSpawnTimer = 0;
        this.spawnRunningDust(this.cat.x + 8, this.groundY - 4);
      }

      if (this.cat.x >= this.princess.x - 48) {
        this.cat.x = this.princess.x - 48;
        this.isCastleRun = false;
        this.isHugging = true;
        this.hugTimer = 4.2;
        this.spawnHeartBurst(this.princess.x - 20, this.princess.y - 10);
      }
    }
    // C. HUGGING SEQUENCE WITH PRINCESS
    else if (this.isHugging) {
      this.hugTimer -= dt;
      this.cat.x = this.princess.x - 48;
      this.cat.isGrounded = true;
      this.cat.walkCycle = 0;

      this.hugHeartTimer += dt;
      if (this.hugHeartTimer >= 0.25) {
        this.hugHeartTimer = 0;
        this.spawnSingleHeart(this.princess.x - 24 + (Math.random() - 0.5) * 30, this.princess.y - 20);
      }

      if (this.hugTimer <= 0) {
        this.isHugging = false;
        this.princess.saved = true;
        this.handleLevelCompleted();
      }
    }
    // D. STANDARD PLAYER RUN & JUMP CONTROLS
    else {
      const targetVx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      if (targetVx !== 0) {
        this.cat.vx = targetVx * this.cat.speed;
        this.cat.facing = targetVx > 0 ? 'right' : 'left';
        if (this.cat.isGrounded) {
          this.cat.walkCycle += dt * 14;
        }
      } else {
        this.cat.vx *= 0.75;
        if (Math.abs(this.cat.vx) < 0.1) this.cat.vx = 0;
        this.cat.walkCycle = 0;
      }

      this.cat.x += this.cat.vx;

      const minX = 20;
      const maxX = this.width - this.cat.w - 20;
      if (this.cat.x < minX) this.cat.x = minX;
      if (this.cat.x > maxX) this.cat.x = maxX;
    }

    // Cat Vertical Physics & Gravity
    if (!this.isHugging) {
      const gravity = 0.58;
      this.cat.vy += gravity;
      this.cat.y += this.cat.vy;

      const floorY = this.groundY - this.cat.h;
      if (this.cat.y >= floorY) {
        this.cat.y = floorY;
        this.cat.vy = 0;
        this.cat.isGrounded = true;
        this.cat.isJumping = false;
      } else {
        this.cat.isGrounded = false;
      }
    } else {
      this.cat.y = this.groundY - this.cat.h;
      this.cat.vy = 0;
    }

    if (this.cat.hitReaction > 0) this.cat.hitReaction -= dt;
    if (this.cat.happyReaction > 0) this.cat.happyReaction -= dt;

    // Special costume auras (fire / stars / gold / ice / rainbow / cosmic / cyber)
    const activeCostume = COSTUMES.find(c => c.id === this.currentCostumeId);
    if (activeCostume?.specialAura === 'fire' && Math.random() < 0.3) {
      this.particles.push({
        x: this.cat.x + this.cat.w / 2 + (Math.random() - 0.5) * 20,
        y: this.cat.y + this.cat.h - 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.5 - Math.random() * 2,
        color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
        size: 3 + Math.random() * 4,
        alpha: 0.9,
        life: 0,
        maxLife: 0.35,
        type: 'fire',
      });
    } else if (activeCostume?.specialAura === 'stars' && Math.random() < 0.22) {
      this.particles.push({
        x: this.cat.x + (Math.random() - 0.2) * this.cat.w,
        y: this.cat.y + (Math.random() - 0.2) * this.cat.h,
        vx: (Math.random() - 0.5),
        vy: -0.8,
        color: '#818cf8',
        size: 4 + Math.random() * 3,
        alpha: 0.8,
        life: 0,
        maxLife: 0.4,
        type: 'star',
      });
    } else if (activeCostume?.specialAura === 'gold' && Math.random() < 0.28) {
      this.particles.push({
        x: this.cat.x + Math.random() * this.cat.w,
        y: this.cat.y + Math.random() * this.cat.h,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -1,
        color: '#facc15',
        size: 3.5 + Math.random() * 3,
        alpha: 0.9,
        life: 0,
        maxLife: 0.45,
        type: 'sparkle',
      });
    } else if (activeCostume?.specialAura === 'ice' && Math.random() < 0.25) {
      this.particles.push({
        x: this.cat.x + Math.random() * this.cat.w,
        y: this.cat.y + Math.random() * this.cat.h,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -0.6 - Math.random() * 1.2,
        color: Math.random() > 0.5 ? '#67e8f9' : '#ffffff',
        size: 3 + Math.random() * 4,
        alpha: 0.9,
        life: 0,
        maxLife: 0.5,
        type: 'star',
      });
    } else if (activeCostume?.specialAura === 'rainbow' && Math.random() < 0.3) {
      const rainbowColors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#facc15'];
      this.particles.push({
        x: this.cat.x + Math.random() * this.cat.w,
        y: this.cat.y + Math.random() * this.cat.h,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1 - Math.random() * 1.5,
        color: rainbowColors[Math.floor(Math.random() * rainbowColors.length)],
        size: 4 + Math.random() * 3,
        alpha: 0.95,
        life: 0,
        maxLife: 0.45,
        type: 'sparkle',
      });
    } else if (activeCostume?.specialAura === 'cosmic' && Math.random() < 0.25) {
      this.particles.push({
        x: this.cat.x + Math.random() * this.cat.w,
        y: this.cat.y + Math.random() * this.cat.h,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -0.5 - Math.random() * 1.5,
        color: Math.random() > 0.5 ? '#c084fc' : '#38bdf8',
        size: 3.5 + Math.random() * 4,
        alpha: 0.9,
        life: 0,
        maxLife: 0.5,
        type: 'star',
      });
    } else if (activeCostume?.specialAura === 'cyber' && Math.random() < 0.28) {
      this.particles.push({
        x: this.cat.x + Math.random() * this.cat.w,
        y: this.cat.y + Math.random() * this.cat.h,
        vx: (Math.random() - 0.5) * 2,
        vy: -1.2,
        color: Math.random() > 0.5 ? '#22d3ee' : '#4ade80',
        size: 2.5 + Math.random() * 3,
        alpha: 0.95,
        life: 0,
        maxLife: 0.35,
        type: 'sparkle',
      });
    }

    // Smooth block dropping into place
    for (const b of this.blocks) {
      if (b.offsetY < 0 && b.state === 'idle') {
        b.offsetY += dt * 700;
        if (b.offsetY > 0) b.offsetY = 0;
      }
    }

    // UPDATE TURTLES (Kaplumbağalar)
    for (let i = this.turtles.length - 1; i >= 0; i--) {
      const t = this.turtles[i];
      if (!t.active) {
        this.turtles.splice(i, 1);
        continue;
      }

      // Physics
      t.vy += 0.45;
      t.y += t.vy;

      const floorTurtle = this.groundY - t.h;
      if (t.y >= floorTurtle) {
        t.y = floorTurtle;
        t.vy = 0;
        if (t.state === 'emerging') t.state = 'walking';
      }

      if (t.state === 'walking') {
        t.walkCycle += dt * 10;
        // Turtle tracks cat
        const dir = this.cat.x > t.x ? 1 : -1;
        t.facing = dir > 0 ? 'right' : 'left';
        t.vx = dir * 2.4;
        t.x += t.vx;

        // Collision with Cat
        const catBox = {
          x: this.cat.x + 6,
          y: this.cat.y,
          w: this.cat.w - 12,
          h: this.cat.h
        };
        const turtleBox = {
          x: t.x + 4,
          y: t.y,
          w: t.w - 8,
          h: t.h
        };

        const overlaps =
          catBox.x < turtleBox.x + turtleBox.w &&
          catBox.x + catBox.w > turtleBox.x &&
          catBox.y < turtleBox.y + turtleBox.h &&
          catBox.y + catBox.h > turtleBox.y;

        if (overlaps) {
          // Check if cat stomped on turtle from above!
          if (this.cat.vy > 1 && (this.cat.y + this.cat.h - this.cat.vy) <= t.y + 16) {
            // STOMPED! Cat bounces high and gets bonus!
            this.cat.vy = -10.5;
            audio.playCorrect();
            haptics.correct();
            this.coins += 2;
            this.saveProgress();
            this.addFloatingText(t.x + t.w / 2, t.y - 15, 'EZİLDİ! +2 🪙', '#4ade80', 22);
            this.spawnDustParticles(t.x + t.w / 2, t.y + t.h / 2);
            t.state = 'retreating';
            t.active = false;
            if (this.onStateChange) this.onStateChange();
          } else if (this.cat.invulnerableTimer <= 0) {
            // TURTLE BUMPED CAT: LOSE 1 LIFE!
            this.lives -= 1;
            this.cat.invulnerableTimer = 1.4;
            this.cat.hitReaction = 0.6;
            this.cat.vy = -6;
            audio.playHurtLifeLost();
            haptics.lifeLost();

            this.addFloatingText(this.cat.x + this.cat.w / 2, this.cat.y - 25, '-1 CAN! 💔', '#ef4444', 28);
            this.spawnDustParticles(t.x + t.w / 2, t.y + t.h);

            // Turtle retreats in shell
            t.state = 'retreating';
            t.active = false;

            if (this.onStateChange) this.onStateChange();

            // Check game over (can bittiğinde puanı sıfırla)
            if (this.lives <= 0) {
              this.score = 0;
              this.streak = 0;
              this.isGameOver = true;
              if (this.onGameOver) this.onGameOver();
            }
          }
        }
      } else if (t.state === 'retreating') {
        t.opacity -= dt * 2;
        if (t.opacity <= 0) t.active = false;
      }
    }

    // Collision with Blocks
    if (!this.isAdvancing && !this.isCastleRun && !this.isHugging && !this.isGameOver) {
      for (const b of this.blocks) {
        if (b.state === 'broken') continue;

        if (b.shakeTimer > 0) {
          b.shakeTimer -= dt;
          b.shakeX = Math.sin(b.shakeTimer * 40) * 7;
          if (b.shakeTimer <= 0) {
            b.shakeX = 0;
            b.state = 'idle';
          }
        }

        if (this.cat.vy < 0 || Math.abs(this.cat.vy) < 2) {
          const catHeadY = this.cat.y;
          const blockBottom = b.y + b.height + b.offsetY;

          const overlapsX =
            this.cat.x + this.cat.w > b.x + 8 &&
            this.cat.x < b.x + b.width - 8;

          const hitsBottom =
            catHeadY <= blockBottom &&
            catHeadY >= blockBottom - 26;

          if (overlapsX && hitsBottom && b.state === 'idle') {
            this.handleBlockHit(b);
            this.cat.vy = 2.5;
          }
        }
      }
    }

    // Update Brick Shards
    for (let i = this.brickShards.length - 1; i >= 0; i--) {
      const s = this.brickShards[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.45;
      s.rot += s.vRot;
      if (s.y > this.height + 50) {
        this.brickShards.splice(i, 1);
      }
    }

    // Update Speed Lines
    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      const sl = this.speedLines[i];
      sl.x -= sl.speed * dt;
      sl.alpha -= dt * 1.5;
      if (sl.x < -sl.len || sl.alpha <= 0) {
        this.speedLines.splice(i, 1);
      }
    }

    // Update Golden Coin Pop FX
    if (this.goldCoin && this.goldCoin.active) {
      this.goldCoin.y += this.goldCoin.vy;
      this.goldCoin.vy += 0.35;
      this.goldCoin.spin += dt * 16;
      if (this.goldCoin.y > this.goldCoin.startY + 10) {
        this.goldCoin.active = false;
      }
    }

    // Update clouds with parallax
    const cloudExtraSpeed = this.isAdvancing ? 2.5 : 0;
    for (const c of this.clouds) {
      c.x += c.speed + cloudExtraSpeed;
      if (c.x > this.width + 100) c.x = -120;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.type === 'heart' ? -0.4 : (p.type === 'fire' ? -0.8 : 0.25);
      if (p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot;
      }
      p.life += dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= dt * 0.9;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    this.princess.floatOffset = Math.sin(performance.now() / 300) * 3;
  }

  private handleBlockHit(b: QuestionBlock) {
    if (b.isCorrect) {
      b.state = 'broken';
      audio.playCorrect();
      haptics.correct();

      this.spawnBrickShards(b.x + b.width / 2, b.y + b.height / 2);

      this.goldCoin = {
        x: b.x + b.width / 2,
        y: b.y - 12,
        vy: -9.5,
        startY: b.y,
        active: true,
        spin: 0,
      };

      for (const other of this.blocks) {
        if (other !== b) {
          other.state = 'broken';
        }
      }

      // Coin rewards for correct answer & streak (higher streak gives bonus coins!)
      const earnedCoins = this.streak >= 4 ? 3 : (this.streak >= 2 ? 2 : 1);
      this.coins += earnedCoins;
      this.saveProgress();
      this.score += 100 + this.streak * 20;
      this.streak += 1;
      this.cat.happyReaction = 0.5;

      const isFinal40thQuestion =
        this.currentLevelIndex === 3 &&
        this.currentQuestionIndex === this.currentQuestions.length - 1;

      const praise = isFinal40thQuestion
        ? 'PRENSESİ BULDUK! 👑'
        : this.praiseWords[Math.floor(Math.random() * this.praiseWords.length)];

      this.addFloatingText(b.x + b.width / 2, b.y - 15, praise, '#facc15', 28);
      this.addFloatingText(b.x + b.width / 2, b.y - 50, `+${100 + (this.streak - 1) * 20} (+${earnedCoins}🪙)`, '#ffffff', 20);

      this.spawnCorrectParticles(b.x + b.width / 2, b.y + b.height / 2);

      // Despawn existing active turtles on correct answer
      this.turtles = [];

      if (this.onStateChange) this.onStateChange();

      if (isFinal40thQuestion) {
        setTimeout(() => {
          this.isCastleRevealed = true;
          this.isCastleRun = true;
          if (this.onStateChange) this.onStateChange();
        }, 300);
      } else {
        setTimeout(() => {
          this.isAdvancing = true;
          this.advanceTimer = 1.3;
          if (this.onStateChange) this.onStateChange();
        }, 250);
      }

    } else {
      // YANLIŞ CEVAP: Blok sarsılır, kaplumbağa çıkar ve DİREK 1 CANI SİLER!
      b.state = 'hit_wrong';
      b.shakeTimer = 0.45;
      audio.playWrong();
      audio.playBlockBump();
      haptics.wrong();

      this.streak = 0;
      this.cat.hitReaction = 0.5;
      this.cat.invulnerableTimer = 1.3;

      // Spawn a Koopa Troopa turtle dropping from the wrong block!
      this.spawnTurtleEnemy(b.x + b.width / 2 - 21, b.y + b.height);

      // DİREK 1 CAN SİLİNİR (Kaplumbağa hemen canı alır!)
      this.lives -= 1;
      audio.playHurtLifeLost();
      haptics.lifeLost();

      const q = this.currentQuestions[this.currentQuestionIndex];
      this.currentHint = q ? q.hint : 'Tekrar dene!';
      this.addFloatingText(b.x + b.width / 2, b.y - 15, 'KAPLUMBAĞA CANINI ALDI! -1 CAN! 💔', '#ef4444', 24);

      this.spawnDustParticles(b.x + b.width / 2, b.y + b.height);

      // 3 CAN BİTİP ÖLDÜĞÜNDE PUANI SIFIRLA!
      if (this.lives <= 0) {
        this.score = 0;
        this.streak = 0;
        this.isGameOver = true;
        if (this.onGameOver) this.onGameOver();
      }

      if (this.onStateChange) this.onStateChange();
    }
  }

  // Spawn Koopa Troopa (Kaplumbağa)
  public spawnTurtleEnemy(x: number, y: number) {
    audio.playTurtleEmerge();
    const isRed = this.currentLevelIndex === 3 || Math.random() < 0.3;
    this.turtles.push({
      id: Math.random(),
      x,
      y,
      w: 42,
      h: 40,
      vx: this.cat.x > x ? 2.5 : -2.5,
      vy: -4.5,
      state: 'emerging',
      facing: this.cat.x > x ? 'right' : 'left',
      walkCycle: 0,
      shellTimer: 0,
      opacity: 1,
      active: true,
      color: isRed ? 'red' : 'green',
    });
  }

  private handleLevelCompleted() {
    this.isLevelComplete = true;
    audio.playLevelClear();
    haptics.levelClear();

    // +10 Bonus Coins for clearing a full level!
    this.coins += 10;
    this.saveProgress();
    this.spawnConfettiShower(120);

    if (this.currentLevelIndex === 3) {
      this.isGameFinished = true;
      audio.playPrincessFanfare();
      haptics.victory();
      if (this.onGameFinished) this.onGameFinished();
    } else {
      if (this.onLevelComplete) this.onLevelComplete(this.currentLevelIndex + 1);
    }

    if (this.onStateChange) this.onStateChange();
  }

  public nextLevel() {
    if (this.currentLevelIndex + 1 < this.levelConfigs.length) {
      const nextIdx = this.currentLevelIndex + 1;
      this.setupLevel(nextIdx);
      const fresh = getLevelQuestions(nextIdx + 1);
      this.setQuestions(fresh);
      if (this.onStateChange) this.onStateChange();
    }
  }

  public restartGame() {
    this.score = 0;
    this.streak = 0;
    this.lives = 3;
    this.isGameOver = false;
    this.setupLevel(0);
    const fresh = getLevelQuestions(1);
    this.setQuestions(fresh);
    if (this.onStateChange) this.onStateChange();
  }

  public retryCurrentLevel() {
    this.score = 0;
    this.streak = 0;
    this.lives = 3;
    this.isGameOver = false;
    this.setupLevel(this.currentLevelIndex);
    const fresh = getLevelQuestions(this.currentLevelIndex + 1);
    this.setQuestions(fresh);
    if (this.onStateChange) this.onStateChange();
  }

  public spawnBrickShards(cx: number, cy: number) {
    const velocities = [
      { vx: -3.8, vy: -7.5 },
      { vx: 3.8, vy: -7.5 },
      { vx: -2.8, vy: -4.5 },
      { vx: 2.8, vy: -4.5 },
    ];
    for (const v of velocities) {
      this.brickShards.push({
        x: cx + (v.vx > 0 ? 12 : -12),
        y: cy + (v.vy < -6 ? -12 : 12),
        vx: v.vx + (Math.random() - 0.5),
        vy: v.vy - Math.random() * 1.5,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 12,
        size: 18,
      });
    }
  }

  public spawnRunningDust(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x - 10 + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 4,
        vx: -2 - Math.random() * 2.5,
        vy: -0.5 - Math.random() * 1.5,
        color: '#e2e8f0',
        size: 4 + Math.random() * 4,
        alpha: 0.7,
        life: 0,
        maxLife: 0.35,
      });
    }
  }

  public spawnHeartBurst(x: number, y: number) {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: '#f43f5e',
        size: 12 + Math.random() * 8,
        alpha: 1,
        life: 0,
        maxLife: 1.5,
        type: 'heart',
      });
    }
  }

  public spawnSingleHeart(x: number, y: number) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1.8 - Math.random() * 1.2,
      color: Math.random() > 0.5 ? '#f43f5e' : '#ec4899',
      size: 10 + Math.random() * 6,
      alpha: 1,
      life: 0,
      maxLife: 1.6,
      type: 'heart',
    });
  }

  public spawnCorrectParticles(x: number, y: number) {
    const colors = ['#facc15', '#fbbf24', '#f59e0b', '#38bdf8', '#4ade80', '#ec4899'];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const speed = 2.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 6,
        alpha: 1,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        type: 'star',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 8,
      });
    }
  }

  public spawnDustParticles(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2,
        color: '#d1d5db',
        size: 4 + Math.random() * 4,
        alpha: 0.8,
        life: 0,
        maxLife: 0.4,
      });
    }
  }

  public spawnConfettiShower(count = 90) {
    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#fbbf24'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: -10 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        alpha: 1,
        life: 0,
        maxLife: 3 + Math.random() * 2,
        type: 'confetti',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 6,
      });
    }
  }

  public addFloatingText(x: number, y: number, text: string, color: string, size = 20) {
    this.floatingTexts.push({
      id: Math.random(),
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.8,
      size,
    });
  }

  // --- Rendering Pipeline ---
  public render() {
    const ctx = this.ctx;
    const currentConfig = this.levelConfigs[this.currentLevelIndex] || this.levelConfigs[0];

    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, currentConfig.skyGradient[0]);
    skyGrad.addColorStop(1, currentConfig.skyGradient[1]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Stars / Snow / Sun
    this.renderAtmosphere(ctx, currentConfig);

    // 3. Clouds
    this.renderClouds(ctx, currentConfig);

    // 4. Parallax Background Hills
    this.renderScenery(ctx, currentConfig);

    // 5. Roadside Props
    this.renderProps(ctx, currentConfig);

    // 6. Ground
    this.renderGround(ctx, currentConfig);

    // 7. Blocks
    if (!this.isCastleRun && !this.isHugging) {
      for (const b of this.blocks) {
        if (b.state !== 'broken') {
          this.renderBlock(ctx, b);
        }
      }
    }

    // 8. Koopa Troopa Turtles (Kaplumbağalar)
    for (const t of this.turtles) {
      this.renderTurtle(ctx, t);
    }

    // 9. Exploding Brick Shards
    this.renderBrickShards(ctx);

    // 10. Popping Golden Coin
    this.renderGoldCoin(ctx);

    // 11. Castle & Princess
    if (this.currentLevelIndex === 3 && this.isCastleRevealed) {
      this.renderCastleAndPrincess(ctx);
    }

    // 12. Mario Cat (With active custom costume!)
    if (this.isHugging) {
      this.renderHuggingScene(ctx);
    } else {
      this.renderCat(ctx);
    }

    // 13. Speed Lines
    this.renderSpeedLines(ctx);

    // 14. Particles & Hearts
    this.renderParticles(ctx);

    // 15. Floating Texts
    this.renderFloatingTexts(ctx);
  }

  private renderAtmosphere(ctx: CanvasRenderingContext2D, config: LevelConfig) {
    if (config.theme === 'iceland') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137) % this.width);
        const sy = ((i * 93) % 220);
        const sa = 0.4 + 0.6 * Math.sin((performance.now() / 400) + i);
        ctx.globalAlpha = sa;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    } else if (config.theme === 'desert') {
      ctx.save();
      const sunGrad = ctx.createRadialGradient(820, 90, 10, 820, 90, 80);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.4, '#fde047');
      sunGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(820, 90, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (config.theme === 'grassland') {
      ctx.save();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(80, 70, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderClouds(ctx: CanvasRenderingContext2D, config: LevelConfig) {
    ctx.save();
    ctx.fillStyle = config.cloudColor;
    for (const c of this.clouds) {
      ctx.beginPath();
      const cx = c.x;
      const cy = c.y;
      const r = 24 * c.scale;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + 25 * c.scale, cy - 10 * c.scale, r * 1.2, 0, Math.PI * 2);
      ctx.arc(cx + 55 * c.scale, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderScenery(ctx: CanvasRenderingContext2D, config: LevelConfig) {
    ctx.save();
    const wrapWidth = 1800;
    const hillParallax = this.worldScroll * 0.35;

    if (config.theme === 'desert') {
      for (let i = 0; i < 3; i++) {
        const px = ((i * 600 - hillParallax) % wrapWidth + wrapWidth) % wrapWidth - 200;
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(px, this.groundY);
        ctx.lineTo(px + 180, 240);
        ctx.lineTo(px + 360, this.groundY);
        ctx.fill();

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(px + 180, 240);
        ctx.lineTo(px + 360, this.groundY);
        ctx.lineTo(px + 240, this.groundY);
        ctx.fill();
      }
    } else if (config.theme === 'iceland') {
      for (let i = 0; i < 3; i++) {
        const px = ((i * 600 - hillParallax) % wrapWidth + wrapWidth) % wrapWidth - 200;
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.moveTo(px, this.groundY);
        ctx.lineTo(px + 180, 210);
        ctx.lineTo(px + 360, this.groundY);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(px + 140, 270);
        ctx.lineTo(px + 180, 210);
        ctx.lineTo(px + 220, 270);
        ctx.fill();
      }
    } else {
      for (const h of this.hills) {
        const hx = ((h.baseX - hillParallax) % wrapWidth + wrapWidth) % wrapWidth - 100;
        if (hx < -h.r * 2 || hx > this.width + h.r * 2) continue;

        ctx.fillStyle = h.color;
        ctx.beginPath();
        ctx.arc(hx, h.y, h.r, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(hx - 12, h.y - h.r + 28, 3, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(hx + 12, h.y - h.r + 28, 3, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx - 13, h.y - h.r + 25, 1.5, 0, Math.PI * 2);
        ctx.arc(hx + 11, h.y - h.r + 25, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderProps(ctx: CanvasRenderingContext2D, config: LevelConfig) {
    ctx.save();
    const wrapWidth = 1800;
    const propParallax = this.worldScroll;

    for (const p of this.roadsideProps) {
      const px = ((p.baseX - propParallax) % wrapWidth + wrapWidth) % wrapWidth - 100;
      if (px < -60 || px > this.width + 60) continue;

      if (p.type === 'bush') {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(px, this.groundY - 14, 18, 0, Math.PI * 2);
        ctx.arc(px + 22, this.groundY - 18, 22, 0, Math.PI * 2);
        ctx.arc(px + 44, this.groundY - 14, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (p.type === 'flower') {
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px, this.groundY);
        ctx.lineTo(px, this.groundY - 18);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, this.groundY - 20, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(px, this.groundY - 20, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'pipe') {
        const pipeY = this.groundY - 60;
        const pipeColor = config.theme === 'iceland' ? '#0284c7' : '#22c55e';
        const pipeRim = config.theme === 'iceland' ? '#38bdf8' : '#4ade80';
        const pipeShadow = config.theme === 'iceland' ? '#0369a1' : '#15803d';

        ctx.fillStyle = pipeColor;
        ctx.fillRect(px + 4, pipeY + 16, 44, 44);
        ctx.fillStyle = pipeShadow;
        ctx.fillRect(px + 34, pipeY + 16, 14, 44);

        ctx.fillStyle = pipeRim;
        ctx.fillRect(px, pipeY, 52, 16);
        ctx.fillStyle = pipeShadow;
        ctx.fillRect(px + 38, pipeY, 14, 16);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(px, pipeY, 52, 16);
        ctx.strokeRect(px + 4, pipeY + 16, 44, 44);
      }
    }
    ctx.restore();
  }

  private renderGround(ctx: CanvasRenderingContext2D, config: LevelConfig) {
    ctx.save();
    const topY = this.groundY;
    const tileSize = 28;
    const scrollOffset = (this.worldScroll) % tileSize;

    ctx.fillStyle = config.groundColor;
    ctx.fillRect(0, topY, this.width, 16);

    ctx.fillStyle = config.groundSubColor;
    ctx.fillRect(0, topY + 16, this.width, this.height - (topY + 16));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let x = -tileSize; x < this.width + tileSize; x += tileSize) {
      const drawX = x - scrollOffset;
      for (let y = topY + 16; y < this.height; y += tileSize) {
        const tileIdxX = Math.floor((x + this.worldScroll) / tileSize);
        const tileIdxY = Math.floor(y / tileSize);
        if ((tileIdxX + tileIdxY) % 2 === 0) {
          ctx.fillRect(drawX, y, tileSize, tileSize);
        }
      }
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(this.width, topY);
    ctx.stroke();

    ctx.restore();
  }

  // KOOPA TROOPA (Kaplumbağa) Çizimi
  private renderTurtle(ctx: CanvasRenderingContext2D, t: TurtleEnemy) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.opacity);
    ctx.translate(t.x + t.w / 2, t.y + t.h / 2);

    if (t.facing === 'left') {
      ctx.scale(-1, 1);
    }

    const isGreen = t.color === 'green';
    const shellColor = isGreen ? '#22c55e' : '#ef4444';
    const shellDark = isGreen ? '#15803d' : '#b91c1c';

    // 1. Turtle Feet (Walking animation)
    const footSwing = Math.sin(t.walkCycle) * 4;
    ctx.fillStyle = '#facc15'; // Yellow feet
    ctx.beginPath();
    ctx.ellipse(-10 + footSwing, 14, 6, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(8 - footSwing, 14, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Koopa Shell (Rounded back shell)
    ctx.fillStyle = shellColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Shell rim (White/yellow belly ring)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(0, 9, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shell hexagonal pattern
    ctx.fillStyle = shellDark;
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Turtle Head
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(12, -6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Beak
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(24, -2);
    ctx.lineTo(17, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(14, -8, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(15, -8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderBlock(ctx: CanvasRenderingContext2D, b: QuestionBlock) {
    ctx.save();
    const x = b.x + b.shakeX;
    const y = b.y + b.offsetY;
    const w = b.width;
    const h = b.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(x + 4, y + 6, w, h);

    if (b.state === 'hit_wrong') {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x, y, w, h);
    } else {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(0.3, '#f59e0b');
      grad.addColorStop(1, '#d97706');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    }

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 3, y + 3, w - 6, 4);
    ctx.fillRect(x + 3, y + 3, 4, h - 6);

    ctx.fillStyle = '#92400e';
    ctx.fillRect(x + 3, y + h - 7, w - 6, 4);
    ctx.fillRect(x + w - 7, y + 3, 4, h - 6);

    ctx.fillStyle = '#78350f';
    const rivetSize = 5;
    ctx.fillRect(x + 5, y + 5, rivetSize, rivetSize);
    ctx.fillRect(x + w - 10, y + 5, rivetSize, rivetSize);
    ctx.fillRect(x + 5, y + h - 10, rivetSize, rivetSize);
    ctx.fillRect(x + w - 10, y + h - 10, rivetSize, rivetSize);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.font = '800 30px "Fredoka", "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(b.value.toString(), x + w / 2, y + h / 2 + 1);
    ctx.fillText(b.value.toString(), x + w / 2, y + h / 2 + 1);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x + w / 2, y - 6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  private renderBrickShards(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const s of this.brickShards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-s.size / 2 + 2, -s.size / 2 + 2, s.size - 4, 3);
      ctx.restore();
    }
    ctx.restore();
  }

  private renderGoldCoin(ctx: CanvasRenderingContext2D) {
    if (!this.goldCoin || !this.goldCoin.active) return;
    const c = this.goldCoin;
    ctx.save();
    ctx.translate(c.x, c.y);
    const scaleX = Math.cos(c.spin);

    ctx.scale(scaleX, 1);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#d97706';
    ctx.font = '800 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0);

    ctx.restore();
  }

  private renderSpeedLines(ctx: CanvasRenderingContext2D) {
    if (this.speedLines.length === 0) return;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (const sl of this.speedLines) {
      ctx.globalAlpha = Math.max(0, sl.alpha);
      ctx.beginPath();
      ctx.moveTo(sl.x, sl.y);
      ctx.lineTo(sl.x + sl.len, sl.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // MARIO CAT 3D RENDERING (VOLUMETRIC SHADING, NINTENDO/PIXAR STYLE EYES, ACCESSORIES)
  private renderCat(ctx: CanvasRenderingContext2D) {
    const c = this.cat;
    const costume = COSTUMES.find(co => co.id === this.currentCostumeId) || COSTUMES[0];

    // 0. Dynamic 3D Ground Shadow (Volumetric soft ambient occlusion)
    const distFromGround = Math.max(0, this.groundY - (c.y + c.h));
    const shadowScale = Math.max(0.35, 1 - distFromGround / 180);
    const shadowAlpha = Math.max(0.12, 0.42 * (1 - distFromGround / 220));

    ctx.save();
    ctx.translate(c.x + c.w / 2, this.groundY - 2);
    ctx.scale(shadowScale, shadowScale * 0.4);
    const shadowGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
    shadowGrad.addColorStop(0.6, `rgba(0, 0, 0, ${shadowAlpha * 0.6})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();

    // Invulnerability flashing when hit
    if (c.invulnerableTimer > 0) {
      if (Math.floor(c.invulnerableTimer * 22) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }
    }

    // 3D Squash & Stretch for animated feel
    let squashX = 1;
    let squashY = 1;
    if (c.isJumping) {
      squashX = 0.94;
      squashY = 1.06;
    } else if (c.hitReaction > 0) {
      squashX = 1.08;
      squashY = 0.92;
    }

    ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
    ctx.scale(c.facing === 'left' ? -squashX : squashX, squashY);

    if (c.hitReaction > 0) {
      ctx.rotate(Math.sin(c.hitReaction * 20) * 0.15);
    } else if (c.happyReaction > 0) {
      ctx.translate(0, -Math.sin(c.happyReaction * 15) * 8);
    } else if (this.isAdvancing || this.isCastleRun) {
      // 3D forward run lean
      ctx.rotate(0.08);
    }

    // 1. Flowing 3D Silk Cape (if costume has cape)
    if (costume.capeColor) {
      ctx.save();
      const wave = Math.sin(c.walkCycle * 0.9 || performance.now() / 250) * 8;
      // Underside (darker shadow fold)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.quadraticCurveTo(-34 + wave, 14, -26 + wave, 28);
      ctx.lineTo(-4, 18);
      ctx.closePath();
      ctx.fill();

      // Outer Cape with 3D gradient
      const capeGrad = ctx.createLinearGradient(-10, -4, -28 + wave, 28);
      capeGrad.addColorStop(0, costume.capeColor);
      capeGrad.addColorStop(1, costume.capeTrim || costume.capeColor);
      ctx.fillStyle = capeGrad;
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.quadraticCurveTo(-30 + wave, 12, -22 + wave, 26);
      ctx.lineTo(-4, 18);
      ctx.closePath();
      ctx.fill();

      // Gold / Contrast Trim line
      if (costume.capeTrim) {
        ctx.strokeStyle = costume.capeTrim;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-30 + wave, 12);
        ctx.lineTo(-22 + wave, 26);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Volumetric 3D Tail
    ctx.save();
    const isTanooki = costume.id === 'tanooki';
    const tailWag = c.isJumping ? -18 : Math.sin(c.walkCycle) * (this.isAdvancing || this.isCastleRun ? 16 : 10);

    if (isTanooki) {
      // Thick 3D Raccoon Tail with 3 stripes
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16, 12);
      ctx.quadraticCurveTo(-34 + tailWag, 4, -26 + tailWag, -10);
      ctx.stroke();

      // Stripe 1
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(-22, 9);
      ctx.lineTo(-24 + tailWag * 0.5, 4);
      ctx.stroke();

      // Stripe 2
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(-28 + tailWag * 0.7, 1);
      ctx.lineTo(-28 + tailWag * 0.9, -5);
      ctx.stroke();

      // Fluffy tip
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-28 + tailWag, -5);
      ctx.lineTo(-26 + tailWag, -10);
      ctx.stroke();
    } else {
      // 3D Soft Fur Tail with volumetric light
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      const tailGrad = ctx.createLinearGradient(-16, 12, -26 + tailWag, -10);
      tailGrad.addColorStop(0, costume.furColor || '#d97706');
      tailGrad.addColorStop(0.7, costume.furColor || '#f59e0b');
      tailGrad.addColorStop(1, '#ffffff');
      ctx.strokeStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(-16, 12);
      ctx.quadraticCurveTo(-32 + tailWag, 4, -26 + tailWag, -10);
      ctx.stroke();

      // 3D Spherical Fluffy Tip
      const tipGrad = ctx.createRadialGradient(-26 + tailWag - 2, -10 - 2, 1, -26 + tailWag, -10, 6);
      tipGrad.addColorStop(0, '#ffffff');
      tipGrad.addColorStop(0.7, '#f1f5f9');
      tipGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = tipGrad;
      ctx.beginPath();
      ctx.arc(-26 + tailWag, -10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. 3D Legs & Chunky Cartoon Boots
    const legSwing = c.isJumping ? 0 : Math.sin(c.walkCycle) * (this.isAdvancing || this.isCastleRun ? 11 : 7);

    // Left Leg
    this.draw3DLeg(ctx, -14 + legSwing, 16, costume.overallsColor, costume.overallsHighlight || '#3b82f6');
    // Right Leg
    this.draw3DLeg(ctx, 4 - legSwing, 16, costume.overallsColor, costume.overallsHighlight || '#3b82f6');

    // 4. 3D Torso & Overalls
    // 3D Shirt (Rounded Cylinder with specular highlight)
    const shirtGrad = ctx.createLinearGradient(-16, -6, 16, 16);
    shirtGrad.addColorStop(0, costume.shirtHighlight || '#ef4444');
    shirtGrad.addColorStop(0.5, costume.shirtColor);
    shirtGrad.addColorStop(1, '#1e293b'); // Ambient occlusion shadow at bottom
    ctx.fillStyle = shirtGrad;
    ctx.beginPath();
    ctx.roundRect(-16, -6, 32, 22, 8);
    ctx.fill();

    // 3D Overalls Bib & Body
    const overallsGrad = ctx.createLinearGradient(-15, 2, 15, 20);
    overallsGrad.addColorStop(0, costume.overallsHighlight || '#3b82f6');
    overallsGrad.addColorStop(0.6, costume.overallsColor);
    overallsGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = overallsGrad;
    ctx.beginPath();
    ctx.roundRect(-15, 3, 30, 17, 6);
    ctx.fill();

    // 3D Suspender Straps (with drop shadow)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-14, -5, 7, 12);
    ctx.fillRect(6, -5, 7, 12);

    ctx.fillStyle = costume.overallsColor;
    ctx.beginPath();
    ctx.roundRect(-13, -5, 6, 12, 2);
    ctx.roundRect(7, -5, 6, 12, 2);
    ctx.fill();

    // 3D Metallic Golden Brass Buttons with Specular Highlight
    this.draw3DGoldButton(ctx, -10, 7, 3);
    this.draw3DGoldButton(ctx, 10, 7, 3);

    // Overalls Center Pocket with Embossed Stitching
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.roundRect(-6, 8, 12, 8, 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. 3D White Cartoon Gloves & Arms
    if (c.isJumping) {
      // Raised jumping fist (Punching upward!)
      this.draw3DArm(ctx, 12, -8, 14, -22, costume.shirtColor, true);
    } else {
      // Walking arm bobs
      const armBob = Math.sin(c.walkCycle) * 4;
      this.draw3DGlove(ctx, 14, 6 + armBob, 6);
      this.draw3DGlove(ctx, -14, 6 - armBob, 5.5);
    }

    // 6. 3D Cat Head (Volumetric Sphere with Fur Shading)
    const furBase = costume.furColor || '#f97316';
    const furHighlight = '#fde68a';
    const headGrad = ctx.createRadialGradient(-5, -20, 3, 0, -14, 20);
    headGrad.addColorStop(0, furHighlight);
    headGrad.addColorStop(0.4, furBase);
    headGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -14, 18, 0, Math.PI * 2);
    ctx.fill();

    // 3D Soft Cheeks Blush
    ctx.fillStyle = 'rgba(244, 63, 94, 0.28)';
    ctx.beginPath();
    ctx.arc(-8, -10, 4.5, 0, Math.PI * 2);
    ctx.arc(10, -10, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 3D Muzzle (White Puffy Cheeks)
    const muzzleGrad = ctx.createRadialGradient(2, -10, 2, 3, -9, 10);
    muzzleGrad.addColorStop(0, '#ffffff');
    muzzleGrad.addColorStop(0.8, '#f8fafc');
    muzzleGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = muzzleGrad;
    ctx.beginPath();
    ctx.ellipse(3, -9, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Cute Pink Nose with Specular Highlight
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(3, -11);
    ctx.lineTo(6, -8);
    ctx.lineTo(0, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2, -10, 1, 0, Math.PI * 2);
    ctx.fill();

    // 3D Cat Whiskers
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(8, -8); ctx.lineTo(21, -11);
    ctx.moveTo(8, -6); ctx.lineTo(22, -6);
    ctx.moveTo(-2, -8); ctx.lineTo(-13, -11);
    ctx.moveTo(-2, -6); ctx.lineTo(-14, -6);
    ctx.stroke();

    // 7. 3D Pixar/Nintendo Style Expressive Eyes
    if (costume.hasMask) {
      // 3D Superhero Domino Mask
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.roundRect(-2, -22, 19, 12, 5);
      ctx.fill();
      ctx.strokeStyle = '#4338ca';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (costume.hasCyberVisor) {
      // 3D Cyber LED Visor
      const visorGrad = ctx.createLinearGradient(-4, -22, 16, -10);
      visorGrad.addColorStop(0, '#06b6d4');
      visorGrad.addColorStop(0.5, '#22d3ee');
      visorGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = visorGrad;
      ctx.beginPath();
      ctx.roundRect(-3, -22, 20, 10, 4);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Scanline glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(-1, -18, 16, 2);
    }

    if (!costume.hasCyberVisor) {
      // 3D Eye Sclera & Iris with dual specular glints
      this.draw3DEye(ctx, 5, -17, 4, 6);
    }

    // 8. 3D Cat Ears
    this.draw3DCatEar(ctx, -16, -26, -9, -40, -2, -28, furBase, '#fbcfe8');
    this.draw3DCatEar(ctx, 2, -28, 9, -40, 16, -26, furBase, '#fbcfe8');

    // 9. 3D Mario Cap
    // Cap Dome (Spherical 3D puff with radial gradient)
    const capGrad = ctx.createRadialGradient(-3, -30, 2, 0, -26, 18);
    capGrad.addColorStop(0, costume.hatHighlight || '#f87171');
    capGrad.addColorStop(0.5, costume.hatColor);
    capGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.ellipse(0, -26, 17, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Visor / Brim with thickness & shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; // Drop shadow under visor
    ctx.beginPath();
    ctx.ellipse(8, -19, 13, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();

    const brimGrad = ctx.createLinearGradient(0, -24, 16, -18);
    brimGrad.addColorStop(0, costume.hatHighlight || '#f87171');
    brimGrad.addColorStop(0.7, costume.hatColor);
    brimGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = brimGrad;
    ctx.beginPath();
    ctx.ellipse(8, -22, 13, 5.5, 0.18, 0, Math.PI * 2);
    ctx.fill();

    // 10. Accessories: Crown, Unicorn Horn, Knight Armor, or 3D Embossed Badge
    if (costume.hasCrown) {
      // 3D 24K Gold Sovereign Crown
      this.draw3DGoldCrown(ctx, 0, -32);
    } else if (costume.hasUnicornHorn) {
      // 3D Magical Spiral Unicorn Horn
      this.draw3DUnicornHorn(ctx, 4, -30);
    } else if (costume.hasKnightArmor) {
      // 3D Diamond Knight Helmet Visor
      this.draw3DKnightArmor(ctx, 0, -26);
    } else {
      // 3D Embossed White Medallion Badge
      this.draw3DEmbossedBadge(ctx, 1, -26, costume.badgeLetter, costume.hatColor);
    }

    ctx.restore();
  }

  // 3D Rendering Helpers
  private draw3DLeg(ctx: CanvasRenderingContext2D, x: number, y: number, overallsColor: string, overallsHighlight: string) {
    ctx.save();
    // Overalls trouser leg (3D cylinder)
    const legGrad = ctx.createLinearGradient(x, y, x + 12, y);
    legGrad.addColorStop(0, overallsHighlight);
    legGrad.addColorStop(0.5, overallsColor);
    legGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, 12, 12, 3);
    ctx.fill();

    // Dark rubber sole
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.roundRect(x - 2, y + 10, 16, 5, 2);
    ctx.fill();

    // 3D Leather Boot (Rounded dome with specular shine)
    const bootGrad = ctx.createRadialGradient(x + 4, y + 5, 2, x + 6, y + 8, 9);
    bootGrad.addColorStop(0, '#d97706');
    bootGrad.addColorStop(0.6, '#92400e');
    bootGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = bootGrad;
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 8, 9, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boot toe specular glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 6, 3, 1.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private draw3DGoldButton(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.save();
    // 3D metallic radial gradient
    const btnGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    btnGrad.addColorStop(0, '#fef08a');
    btnGrad.addColorStop(0.5, '#facc15');
    btnGrad.addColorStop(0.9, '#ca8a04');
    btnGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private draw3DGlove(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.save();
    // 3D Spherical white cartoon glove
    const gloveGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    gloveGrad.addColorStop(0, '#ffffff');
    gloveGrad.addColorStop(0.7, '#f1f5f9');
    gloveGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = gloveGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Glove wrist cuff
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.6, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private draw3DArm(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, shirtColor: string, _isPunch: boolean) {
    ctx.save();
    // Sleeve
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.roundRect(startX - 4, startY - 10, 10, 16, 4);
    ctx.fill();

    // Punching / Raised Glove
    this.draw3DGlove(ctx, endX, endY, 7);
    ctx.restore();
  }

  private draw3DEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
    ctx.save();
    // 3D Sclera (White eye ball with top eyelid shadow)
    const scleraGrad = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
    scleraGrad.addColorStop(0, '#cbd5e1');
    scleraGrad.addColorStop(0.3, '#ffffff');
    scleraGrad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = scleraGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyelid line
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3D Iris (Lush emerald green / sapphire with internal radial glow)
    const irisR = ry * 0.8;
    const irisGrad = ctx.createRadialGradient(cx + 1, cy - 1, 1, cx, cy, irisR);
    irisGrad.addColorStop(0, '#38bdf8');
    irisGrad.addColorStop(0.6, '#0284c7');
    irisGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(cx + 0.5, cy, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(cx + 0.5, cy, irisR * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Primary Specular Glint (Big glossy reflection)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 0.5, cy - 1.8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Secondary Specular Glint (Small soft reflection)
    ctx.beginPath();
    ctx.arc(cx + 1.8, cy + 1.5, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private draw3DCatEar(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, furColor: string, innerPink: string) {
    ctx.save();
    // Outer Ear (3D cone with shading)
    const earGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    earGrad.addColorStop(0, furColor);
    earGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = earGrad;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();

    // Inner Ear Cavity (Soft Rosy 3D Depth)
    const cx = (x1 + x2 + x3) / 3;
    const cy = (y1 + y2 + y3) / 3;
    const innerGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 7);
    innerGrad.addColorStop(0, innerPink);
    innerGrad.addColorStop(1, '#be185d');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.moveTo(x1 * 0.7 + cx * 0.3, y1 * 0.7 + cy * 0.3);
    ctx.lineTo(x2 * 0.8 + cx * 0.2, y2 * 0.8 + cy * 0.2);
    ctx.lineTo(x3 * 0.7 + cx * 0.3, y3 * 0.7 + cy * 0.3);
    ctx.closePath();
    ctx.fill();

    // White fur tuft
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private draw3DGoldCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save();
    // Crown Base with 3D gold gradient
    const crownGrad = ctx.createLinearGradient(cx - 8, cy, cx + 8, cy - 12);
    crownGrad.addColorStop(0, '#fef08a');
    crownGrad.addColorStop(0.5, '#eab308');
    crownGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx - 8, cy - 12);
    ctx.lineTo(cx - 4, cy - 6);
    ctx.lineTo(cx, cy - 15);
    ctx.lineTo(cx + 4, cy - 6);
    ctx.lineTo(cx + 8, cy - 12);
    ctx.lineTo(cx + 8, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ruby & Emerald Jewels
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 4, 1.6, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 4, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Gold sparkle glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 12, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private draw3DUnicornHorn(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save();
    // Spiral magical horn
    const hornGrad = ctx.createLinearGradient(cx - 3, cy, cx + 5, cy - 18);
    hornGrad.addColorStop(0, '#fef08a');
    hornGrad.addColorStop(0.5, '#facc15');
    hornGrad.addColorStop(1, '#e879f9');
    ctx.fillStyle = hornGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy);
    ctx.lineTo(cx + 3, cy - 20);
    ctx.lineTo(cx + 4, cy);
    ctx.closePath();
    ctx.fill();

    // Spiral ridges
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 2 + i * 1.2, cy - i * 4);
      ctx.lineTo(cx + 2 + i * 0.6, cy - i * 4 - 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private draw3DKnightArmor(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save();
    // Diamond Knight Armor Visor
    const armorGrad = ctx.createLinearGradient(cx - 12, cy, cx + 16, cy);
    armorGrad.addColorStop(0, '#38bdf8');
    armorGrad.addColorStop(0.5, '#e0f2fe');
    armorGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = armorGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 2, cy - 3, 20, 8, 3);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Visor eye slit
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx + 1, cy - 1, 14, 2.5);
    ctx.restore();
  }

  private draw3DEmbossedBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, letter: string, hatColor: string) {
    ctx.save();
    // 3D Medallion Rim with metallic bevel
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 6.5, 0, Math.PI * 2);
    ctx.fill();

    const badgeGrad = ctx.createLinearGradient(cx - 4, cy - 4, cx + 4, cy + 4);
    badgeGrad.addColorStop(0, '#ffffff');
    badgeGrad.addColorStop(0.8, '#f8fafc');
    badgeGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Embossed Letter
    ctx.fillStyle = hatColor === '#ffffff' ? '#dc2626' : hatColor;
    ctx.font = '900 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, cx, cy);
    ctx.restore();
  }

  private renderCastleAndPrincess(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const castleX = 690;
    const castleY = this.groundY - 240;

    // Stone Towers
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(castleX, castleY + 60, 240, 180);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (let cy = castleY + 60; cy < castleY + 240; cy += 26) {
      ctx.beginPath();
      ctx.moveTo(castleX, cy);
      ctx.lineTo(castleX + 240, cy);
      ctx.stroke();
    }

    // Castle Roof Cones
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(castleX + 120, castleY - 30);
    ctx.lineTo(castleX + 40, castleY + 60);
    ctx.lineTo(castleX + 200, castleY + 60);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(castleX - 10, castleY + 10);
    ctx.lineTo(castleX - 35, castleY + 70);
    ctx.lineTo(castleX + 15, castleY + 70);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(castleX - 35, castleY + 70, 50, 170);

    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(castleX + 230, castleY + 10);
    ctx.lineTo(castleX + 205, castleY + 70);
    ctx.lineTo(castleX + 255, castleY + 70);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(castleX + 205, castleY + 70, 50, 170);

    // Castle Grand Gate
    ctx.fillStyle = '#831843';
    ctx.beginPath();
    ctx.arc(castleX + 120, this.groundY - 60, 32, Math.PI, 0);
    ctx.rect(castleX + 88, this.groundY - 60, 64, 60);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Royal Banner
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(castleX + 120, castleY - 30);
    ctx.lineTo(castleX + 160 + Math.sin(performance.now() / 200) * 8, castleY - 42);
    ctx.lineTo(castleX + 120, castleY - 55);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(castleX + 120, castleY + 10);
    ctx.lineTo(castleX + 120, castleY - 58);
    ctx.stroke();

    if (!this.isHugging) {
      const px = this.princess.x;
      const py = this.princess.y + this.princess.floatOffset;

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px - 18, py + 34);
      ctx.lineTo(px + 18, py + 34);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fdf2f8';
      ctx.beginPath();
      ctx.arc(px, py + 14, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py - 18, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(px - 12, py - 24); ctx.lineTo(-8 + px, py - 35); ctx.lineTo(-2 + px, py - 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(px - 10, py - 25); ctx.lineTo(-8 + px, py - 32); ctx.lineTo(-4 + px, py - 26); ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(px + 2, py - 26); ctx.lineTo(8 + px, py - 35); ctx.lineTo(12 + px, py - 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(px + 4, py - 26); ctx.lineTo(8 + px, py - 32); ctx.lineTo(10 + px, py - 25); ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(px - 9, py - 29);
      ctx.lineTo(px - 8, py - 37);
      ctx.lineTo(px - 3, py - 31);
      ctx.lineTo(px, py - 39);
      ctx.lineTo(px + 3, py - 31);
      ctx.lineTo(px + 8, py - 37);
      ctx.lineTo(px + 9, py - 29);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py - 33, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(px - 4, py - 18, 2, 0, Math.PI * 2);
      ctx.arc(px + 4, py - 18, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(px - 8, py - 14, 3, 0, Math.PI * 2);
      ctx.arc(px + 8, py - 14, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px + 12, py);
      ctx.lineTo(px + 24, py - 18);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(px + 24, py - 18, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = '800 13px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('Buradayım! 🐱💖', px, py - 50);
      ctx.fillText('Buradayım! 🐱💖', px, py - 50);
    }

    ctx.restore();
  }

  private renderHuggingScene(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const cx = this.cat.x;
    const px = this.princess.x;
    const baseY = this.groundY - 32;
    const costume = COSTUMES.find(co => co.id === this.currentCostumeId) || COSTUMES[0];

    // Mario Cat (Sarılıyor)
    ctx.save();
    ctx.translate(cx + 10, baseY);

    ctx.fillStyle = costume.shirtColor;
    ctx.beginPath(); ctx.roundRect(-14, -14, 28, 26, 6); ctx.fill();
    ctx.fillStyle = costume.overallsColor;
    ctx.beginPath(); ctx.roundRect(-13, 0, 26, 16, 4); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(16, -2, 6, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(2, -22, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-3, -24, 4, Math.PI, 0);
    ctx.arc(6, -24, 4, Math.PI, 0);
    ctx.stroke();

    ctx.fillStyle = '#fda4af';
    ctx.beginPath(); ctx.arc(-4, -18, 4, 0, Math.PI * 2); ctx.arc(8, -18, 4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = costume.hatColor;
    ctx.beginPath(); ctx.ellipse(2, -34, 16, 9, 0, 0, Math.PI * 2); ctx.fill();

    if (costume.hasCrown) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-4, -40); ctx.lineTo(-3, -48); ctx.lineTo(1, -43); ctx.lineTo(5, -50); ctx.lineTo(7, -40); ctx.fill();
    }

    ctx.restore();

    // Princess Cat
    ctx.save();
    ctx.translate(px - 14, baseY);

    ctx.fillStyle = '#f472b6';
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-18, 22); ctx.lineTo(20, 22); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-16, -2, 6, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-2, -24, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-8, -26, 4, Math.PI, 0);
    ctx.arc(2, -26, 4, Math.PI, 0);
    ctx.stroke();

    ctx.fillStyle = '#fda4af';
    ctx.beginPath(); ctx.arc(-9, -20, 4, 0, Math.PI * 2); ctx.arc(3, -20, 4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-9, -36); ctx.lineTo(-8, -44); ctx.lineTo(-3, -38); ctx.lineTo(0, -46); ctx.lineTo(3, -38); ctx.lineTo(8, -44); ctx.lineTo(9, -36);
    ctx.closePath(); ctx.fill();

    ctx.restore();

    // SPEECH BUBBLE
    const bubbleX = px - 110;
    const bubbleY = baseY - 130;
    const bubbleW = 280;
    const bubbleH = 80;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(bubbleX + 130, bubbleY + bubbleH);
    ctx.lineTo(px - 14, baseY - 45);
    ctx.lineTo(bubbleX + 160, bubbleY + bubbleH);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 15px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Çok teşekkür ederim cesur kedi! 👑', bubbleX + bubbleW / 2, bubbleY + 28);
    ctx.fillStyle = '#e11d48';
    ctx.font = '700 13px "Fredoka", sans-serif';
    ctx.fillText('Beni ve krallığımızı kurtardın! 💖', bubbleX + bubbleW / 2, bubbleY + 48);
    ctx.fillStyle = '#0284c7';
    ctx.font = '800 12px "Fredoka", sans-serif';
    ctx.fillText('⭐ Gerçek bir Çarpım Şampiyonusun! ⭐', bubbleX + bubbleW / 2, bubbleY + 68);

    const heartFloat = Math.sin(performance.now() / 200) * 5;
    ctx.font = '28px sans-serif';
    ctx.fillText('💖', px - 24, baseY - 55 + heartFloat);

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.type === 'star') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        this.drawStar(ctx, 0, 0, 4, p.size, p.size / 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'heart') {
        ctx.save();
        ctx.translate(p.x, p.y);
        this.drawHeart(ctx, 0, 0, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save();
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `800 ${ft.size}px "Fredoka", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }
}
