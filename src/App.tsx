/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  Download,
  Copy,
  Check,
  Star,
  Award,
  Sparkles,
  Maximize2,
  Minimize2,
  HelpCircle,
  Smartphone,
  Vibrate,
  VibrateOff,
  ShoppingBag,
  Heart,
  Coins
} from 'lucide-react';
import { GameEngine } from './gameEngine.ts';
import { LEVEL_CONFIGS, getLevelQuestions } from './questions.ts';
import { COSTUMES, Costume } from './types.ts';
import { audio } from './audio.ts';
import { haptics } from './haptics.ts';
import { usePWAInstall } from './usePWAInstall.ts';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // PWA install hook
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Reactive state for React HUD
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentCostumeId, setCurrentCostumeId] = useState('classic');
  const [unlockedCostumeIds, setUnlockedCostumeIds] = useState<string[]>(['classic']);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Settings & Modals
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Touch button states
  const [touchLeft, setTouchLeft] = useState(false);
  const [touchRight, setTouchRight] = useState(false);

  // Initialize Game Engine on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, LEVEL_CONFIGS);
    engineRef.current = engine;

    const q1 = getLevelQuestions(1);
    engine.setQuestions(q1);

    engine.onStateChange = () => {
      setCurrentLevel(engine.currentLevelIndex);
      setCurrentQuestionIdx(engine.currentQuestionIndex);
      setScore(engine.score);
      setStreak(engine.streak);
      setCoins(engine.coins);
      setLives(engine.lives);
      setCurrentCostumeId(engine.currentCostumeId);
      setUnlockedCostumeIds([...engine.unlockedCostumeIds]);
      setCurrentHint(engine.currentHint);
      setIsLevelComplete(engine.isLevelComplete);
      setIsGameFinished(engine.isGameFinished);
      setIsGameOver(engine.isGameOver);
    };

    engine.onLevelComplete = () => {
      setIsLevelComplete(true);
    };

    engine.onGameFinished = () => {
      setIsGameFinished(true);
    };

    engine.onGameOver = () => {
      setIsGameOver(true);
    };

    engine.start();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGameStarted) setIsGameStarted(true);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        engine.keys.left = true;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        engine.keys.right = true;
      }
      if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
        engine.handleJumpInput(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        engine.keys.left = false;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        engine.keys.right = false;
      }
      if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
        engine.handleJumpInput(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      engine.stop();
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.keys.left = touchLeft;
    }
  }, [touchLeft]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.keys.right = touchRight;
    }
  }, [touchRight]);

  const handleNextLevel = () => {
    haptics.buttonPress();
    const nextIdx = currentLevel + 1;
    if (nextIdx < LEVEL_CONFIGS.length && engineRef.current) {
      engineRef.current.setupLevel(nextIdx);
      const nextQ = getLevelQuestions(nextIdx + 1);
      engineRef.current.setQuestions(nextQ);
      setIsLevelComplete(false);
    }
  };

  const handleRestart = () => {
    haptics.buttonPress();
    if (engineRef.current) {
      engineRef.current.restartGame();
      setScore(0);
      setStreak(0);
      setLives(3);
      setIsLevelComplete(false);
      setIsGameFinished(false);
      setIsGameOver(false);
    }
  };

  const handleRetryAfterGameOver = () => {
    haptics.buttonPress();
    if (engineRef.current) {
      engineRef.current.retryCurrentLevel();
      setScore(0);
      setStreak(0);
      setLives(3);
      setIsGameOver(false);
    }
  };

  const handleSelectLevel = (levelIndex: number) => {
    haptics.buttonPress();
    if (engineRef.current) {
      engineRef.current.setupLevel(levelIndex);
      const questions = getLevelQuestions(levelIndex + 1);
      engineRef.current.setQuestions(questions);
      setIsLevelComplete(false);
      setIsGameFinished(false);
      setIsGameOver(false);
    }
  };

  const handleToggleSound = () => {
    haptics.buttonPress();
    const val = audio.toggleSound();
    setSoundEnabled(val);
  };

  const handleToggleMusic = () => {
    haptics.buttonPress();
    const val = audio.toggleMusic();
    setMusicEnabled(val);
  };

  const handleToggleHaptics = () => {
    const val = haptics.toggle();
    setHapticsEnabled(val);
  };

  const handleToggleFullscreen = async () => {
    haptics.buttonPress();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore
    }
  };

  const handleJumpPress = useCallback(() => {
    if (!isGameStarted) setIsGameStarted(true);
    if (engineRef.current) {
      engineRef.current.handleJumpInput(true);
      setTimeout(() => {
        if (engineRef.current) {
          engineRef.current.handleJumpInput(false);
        }
      }, 150);
    }
  }, [isGameStarted]);

  const handleEquipOrBuyCostume = (costume: Costume) => {
    if (!engineRef.current) return;
    const isUnlocked = unlockedCostumeIds.includes(costume.id);

    if (isUnlocked) {
      engineRef.current.setCostume(costume.id);
    } else {
      engineRef.current.buyCostume(costume);
    }
  };

  const handleDownloadStandalone = () => {
    haptics.buttonPress();
    const link = document.createElement('a');
    link.href = '/super-mario-carpim-tablosu.html';
    link.download = 'super-mario-carpim-tablosu.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCode = async () => {
    try {
      const resp = await fetch('/super-mario-carpim-tablosu.html');
      const text = await resp.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Kodu kopyalamak için dosya indirilebilir.');
    }
  };

  const currentQ = engineRef.current?.currentQuestions[currentQuestionIdx];
  const activeLevelConfig = LEVEL_CONFIGS[currentLevel] || LEVEL_CONFIGS[0];
  const activeCostume = COSTUMES.find(c => c.id === currentCostumeId) || COSTUMES[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-1.5 sm:p-4 select-none font-fun touch-manipulation">
      {/* Top Mobile/Android Header */}
      <header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl backdrop-blur-md">
        {/* Game Title with Current Costume Avatar */}
        <div className="flex items-center gap-2.5">
          <div
            onClick={() => setShowShopModal(true)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-lg border-2 border-yellow-300 cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: activeCostume.hatColor }}
            title="Kostüm Gardırobu"
          >
            <span className="text-xl sm:text-2xl">{activeCostume.icon}</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wide text-amber-400 drop-shadow flex items-center gap-1.5">
              MARIO ÇARPIM
              <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-600 text-white rounded-md uppercase tracking-wider flex items-center gap-0.5">
                <Smartphone size={10} /> Android
              </span>
            </h1>
            <p className="text-[11px] text-slate-300 font-medium hidden sm:block">
              Kostüm: <span className="text-yellow-300 font-bold">{activeCostume.name}</span>
            </p>
          </div>
        </div>

        {/* Costume Shop & Coins Banner */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Gold Coin Bank */}
          <div className="flex items-center gap-1 bg-amber-950/80 border border-amber-500/60 px-2.5 py-1.5 rounded-xl shadow-inner">
            <Coins size={16} className="text-amber-400 animate-spin-slow" />
            <span className="text-sm sm:text-base font-black text-amber-300">{coins}</span>
            <span className="text-[10px] text-amber-400/80 font-bold hidden sm:inline">Altın</span>
          </div>

          {/* Costume Wardrobe Button */}
          <button
            onClick={() => {
              haptics.buttonPress();
              setShowShopModal(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black px-3 py-1.5 rounded-xl border border-pink-300 shadow-md transition-all active:scale-95 animate-bounce-subtle"
            title="Kostüm Mağazası & Gardırop"
          >
            <ShoppingBag size={14} />
            <span>Kostümler</span>
          </button>

          {/* Android PWA Install Button */}
          {isInstallable && (
            <button
              onClick={() => {
                haptics.buttonPress();
                install();
              }}
              className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white text-xs font-black px-2.5 py-1.5 rounded-xl border border-emerald-300 shadow-md transition-all active:scale-95"
              title="Android Telefonuna Yükle"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Yükle</span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Haptic Vibration Toggle */}
          <button
            onClick={handleToggleHaptics}
            title={hapticsEnabled ? 'Android Titreşimi Kapat' : 'Android Titreşimi Aç'}
            className={`p-2 rounded-xl border transition-all ${
              hapticsEnabled
                ? 'bg-slate-800 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-800/50 border-slate-700 text-slate-600'
            }`}
          >
            {hapticsEnabled ? <Vibrate size={16} /> : <VibrateOff size={16} />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            className={`p-2 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-slate-800 border-amber-500/40 text-amber-400'
                : 'bg-slate-800/50 border-slate-700 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Music Toggle */}
          <button
            onClick={handleToggleMusic}
            title={musicEnabled ? '8-Bit Müziği Kapat' : '8-Bit Müziği Aç'}
            className={`p-2 rounded-xl border transition-all ${
              musicEnabled
                ? 'bg-amber-500 border-yellow-300 text-slate-950 font-bold animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Music size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            title="Tam Ekran Modu (Android)"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Restart */}
          <button
            onClick={handleRestart}
            title="Bölümü Yeniden Başlat"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* Main Game Screen Area */}
      <main className="w-full max-w-5xl my-1 sm:my-2 flex flex-col items-center relative">
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-3 sm:border-4 border-amber-500 shadow-2xl">
          {/* In-Game HUD Overlays */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex items-start justify-between pointer-events-none z-10 gap-1.5">
            {/* Level & Question Progression */}
            <div className="bg-slate-900/90 border-2 border-amber-400 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-lg backdrop-blur-md flex flex-col">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                {activeLevelConfig.name.split(':')[0]}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs sm:text-sm font-extrabold text-white">
                  Soru {currentQuestionIdx + 1}/10
                </span>
                <div className="hidden sm:flex gap-1 ml-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i < currentQuestionIdx
                          ? 'bg-amber-400 ring-1 ring-yellow-200'
                          : i === currentQuestionIdx
                          ? 'bg-red-500 scale-125 animate-ping'
                          : 'bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Central Big Multiplication Question Billboard */}
            {currentQ && !isGameOver && (
              <div className="pointer-events-auto bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-2 sm:border-3 border-white rounded-2xl sm:rounded-3xl px-3 py-1 sm:px-5 sm:py-2 shadow-[0_6px_0_#92400e,0_8px_16px_rgba(0,0,0,0.6)] text-center">
                <div className="text-[9px] sm:text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Sparkles size={11} className="text-yellow-200" />
                  DOĞRU BLOKU PATLAT!
                  <Sparkles size={11} className="text-yellow-200" />
                </div>
                <div className="text-xl sm:text-4xl font-black text-white drop-shadow-[2px_3px_0_#000] tracking-wider">
                  {currentQ.num1} x {currentQ.num2} = ?
                </div>
              </div>
            )}

            {/* Lives (3 Hearts) & Score */}
            <div className="bg-slate-900/90 border-2 border-amber-400 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-lg backdrop-blur-md flex flex-col items-end">
              {/* 3 Can Hakkı */}
              <div className="flex items-center gap-1 mb-0.5">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Heart
                    key={idx}
                    size={16}
                    fill={idx < lives ? '#ef4444' : '#475569'}
                    className={`transition-all ${idx < lives ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm sm:text-lg font-extrabold text-amber-400">
                  {score}
                </span>
                {streak > 1 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-600 text-white rounded-md animate-pulse">
                    x{streak}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hint notification bubble if student hit wrong block */}
          {currentHint && !isGameOver && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-red-600/95 border-2 border-yellow-300 text-white font-bold text-xs sm:text-base px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 z-20 animate-pulse text-center max-w-[90%]">
              <span>🐢</span>
              <span>{currentHint} Dikkat et, kaplumbağalar canını alabilir!</span>
            </div>
          )}

          {/* Interactive Canvas */}
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            className="w-full h-full object-contain block bg-sky-400"
          />

          {/* GAME OVER (CANLAR BİTTİĞİNDE) MODAL */}
          {isGameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 text-center animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-b from-slate-900 to-red-950 border-4 border-red-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_20px_50px_rgba(239,68,68,0.5)]">
                <div className="text-5xl mb-2 animate-bounce">
                  🐢 💔 🐱
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-red-400 mb-1">
                  CANLARIN BİTTİ!
                </h2>
                <h3 className="text-sm sm:text-base font-bold text-yellow-300 mb-3">
                  Ama Sakın Üzülme, Pratikle Usta Olunur!
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm mb-5 leading-relaxed">
                  Kaplumbağalar canlarını aldı! Puanın sıfırlandı ancak altınların güvende. 3 yeni can ve yepyeni sorularla hemen bu bölüme tekrar başla!
                </p>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 mb-5 flex justify-around items-center">
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold">PUAN</div>
                    <div className="text-xl font-black text-amber-400">0 (Sıfırlandı)</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold">KASANDAKİ ALTIN</div>
                    <div className="text-xl font-black text-yellow-300">🪙 {coins}</div>
                  </div>
                </div>
                <button
                  onClick={handleRetryAfterGameOver}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-base sm:text-lg font-black py-3 rounded-2xl shadow-[0_5px_0_#14532d] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={18} />
                  3 CAN & YENİ SORULARLA BAŞLA 🔄
                </button>
              </div>
            </div>
          )}

          {/* Level Complete Modal with Shop Option */}
          {isLevelComplete && !isGameFinished && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-40 p-4 text-center animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-amber-400 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
                <div className="flex justify-center gap-2 text-3xl sm:text-4xl mb-2 text-amber-400 animate-bounce">
                  <Star fill="#facc15" size={36} />
                  <Star fill="#facc15" size={44} className="-translate-y-2" />
                  <Star fill="#facc15" size={36} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-400 mb-1">
                  BÖLÜM TAMAMLANDI!
                </h2>
                <h3 className="text-base sm:text-lg font-bold text-sky-300 mb-2">
                  {activeLevelConfig.name}
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm mb-4 leading-relaxed">
                  Tebrikler! 10 soruyu tamamladın ve <b>+4 Bonus Altın 🪙</b> kazandın!
                </p>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 mb-4 flex justify-around items-center">
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold">TOPLAM PUAN</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-400">{score}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold">ALTIN KASASI</div>
                    <div className="text-xl sm:text-2xl font-black text-yellow-300">🪙 {coins}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      haptics.buttonPress();
                      setShowShopModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm sm:text-base font-black py-2.5 rounded-2xl shadow-[0_4px_0_#831843] active:translate-y-1 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={18} />
                    KOSTÜM MAĞAZASINA GİT 🛍️
                  </button>
                  <button
                    onClick={handleNextLevel}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-base sm:text-lg font-black py-3 rounded-2xl shadow-[0_5px_0_#b45309] active:translate-y-1 transition-all flex items-center justify-center gap-2"
                  >
                    SONRAKİ BÖLÜME GEÇ ➔
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grand Finale / Princess Saved Modal */}
          {isGameFinished && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 text-center">
              <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-pink-950 border-4 border-yellow-300 rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-[0_25px_60px_rgba(244,114,182,0.4)]">
                <div className="text-5xl sm:text-6xl mb-2 animate-bounce">
                  👑 🏰 💖
                </div>
                <div className="inline-block px-3 py-1 bg-pink-500/20 border border-pink-400 text-pink-300 rounded-full text-xs font-bold uppercase tracking-widest mb-1">
                  BÜYÜK ZAFER
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-300 to-yellow-300 mb-1">
                  PRENSES KURTARILDI!
                </h2>
                <p className="text-amber-200 font-bold text-sm sm:text-lg mb-3">
                  Tebrikler Şampiyon Matematikçi! 🌟
                </p>
                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed mb-4">
                  40 çarpma işlemini başarıyla çözdün! Mario Kedi ve Prenses sarıldı, krallık kurtuldu!
                </p>

                <div className="bg-slate-900/90 border-2 border-yellow-400 p-3 rounded-2xl mb-4 shadow-inner flex items-center justify-center gap-4">
                  <Award size={40} className="text-amber-400" />
                  <div className="text-left">
                    <div className="text-[11px] text-yellow-300 font-extrabold uppercase">
                      3. SINIF MATEMATİK USTASI
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {score} PUAN • 🪙 {coins} ALTIN
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={handleRestart}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold py-3 rounded-xl shadow-[0_4px_0_#14532d] active:translate-y-1 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <RotateCcw size={16} />
                    YENİDEN OYNA
                  </button>
                  <button
                    onClick={handleDownloadStandalone}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-[0_4px_0_#b45309] active:translate-y-1 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Download size={16} />
                    OYUNU İNDİR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile / Android On-Screen Arcade Gamepad */}
        <div className="w-full max-w-5xl mt-2 sm:mt-3 flex items-center justify-between gap-3 px-1 sm:px-2">
          {/* Left / Right Directional Controls with Android Haptics */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                haptics.buttonPress();
                setTouchLeft(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                setTouchLeft(false);
              }}
              onPointerLeave={() => setTouchLeft(false)}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-b from-blue-500 to-blue-700 active:from-blue-600 active:to-blue-800 text-white text-3xl font-black rounded-2xl border-3 border-blue-300 shadow-[0_5px_0_#1e3a8a,0_8px_16px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_1px_0_#1e3a8a] flex items-center justify-center transition-all select-none touch-none"
              aria-label="Sola Koş"
            >
              ◀
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                haptics.buttonPress();
                setTouchRight(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                setTouchRight(false);
              }}
              onPointerLeave={() => setTouchRight(false)}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-b from-blue-500 to-blue-700 active:from-blue-600 active:to-blue-800 text-white text-3xl font-black rounded-2xl border-3 border-blue-300 shadow-[0_5px_0_#1e3a8a,0_8px_16px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_1px_0_#1e3a8a] flex items-center justify-center transition-all select-none touch-none"
              aria-label="Sağa Koş"
            >
              ▶
            </button>
          </div>

          {/* Quick World Level Selector for Mobile */}
          <div className="flex sm:hidden items-center gap-1 bg-slate-900/80 px-2 py-1.5 rounded-xl border border-slate-800">
            {LEVEL_CONFIGS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectLevel(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                  currentLevel === idx
                    ? 'bg-amber-500 text-slate-950 font-extrabold scale-110 shadow'
                    : 'text-slate-400 bg-slate-800'
                }`}
              >
                {idx === 3 ? '👑' : idx + 1}
              </button>
            ))}
          </div>

          {/* Keyboard tip for desktop */}
          <div className="hidden lg:flex flex-col items-center text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl">
            <span className="font-bold text-slate-300">🎮 Kontroller:</span>
            <span>← / → veya A / D ile yürü • BOŞLUK (Space) veya W ile zıpla</span>
          </div>

          {/* Big Jump Button with Android Haptics */}
          <div>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                handleJumpPress();
              }}
              className="px-7 sm:px-14 h-16 sm:h-20 bg-gradient-to-b from-emerald-500 to-green-700 active:from-emerald-600 active:to-green-800 text-white text-lg sm:text-2xl font-black rounded-2xl border-3 border-emerald-300 shadow-[0_5px_0_#14532d,0_8px_16px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_1px_0_#14532d] flex items-center justify-center gap-1.5 transition-all select-none touch-none"
              aria-label="Zıpla"
            >
              <span>ZIPLA</span>
              <span className="text-xl sm:text-2xl">⬆</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info with Android Guide link */}
      <footer className="w-full max-w-5xl text-center text-xs text-slate-400 py-1.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[11px] sm:text-xs">
          <span>❤️ 3 Can • 🐢 Kaplumbağalar • 👗 Altınla Kostüm Seçenekleri</span>
        </span>
        <div className="flex items-center gap-3 text-[11px] sm:text-xs">
          <button
            onClick={() => setShowShopModal(true)}
            className="text-pink-400 hover:underline flex items-center gap-1 font-bold"
          >
            <ShoppingBag size={13} /> Kostüm Gardırobu
          </button>
          <button
            onClick={() => setShowAndroidModal(true)}
            className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
          >
            <Smartphone size={13} /> Android Kurulumu
          </button>
          <button
            onClick={() => setShowHelpModal(true)}
            className="hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            <HelpCircle size={13} /> Nasıl Oynanır?
          </button>
        </div>
      </footer>

      {/* KOSTÜM MAĞAZASI & GARDIRAP MODALI */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-slate-900 border-2 border-pink-400 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-400 flex items-center justify-center text-pink-300">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-pink-400">Mario Kedi Kostüm Mağazası</h3>
                  <p className="text-xs text-slate-400 font-medium">Bölüm sonlarında topladığın altınlarla kediye yeni kıyafetler al!</p>
                </div>
              </div>
              <button
                onClick={() => setShowShopModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Currency Banner */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins size={22} className="text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-extrabold">Mevcut Altının</div>
                  <div className="text-lg font-black text-amber-300">{coins} Altın 🪙</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-extrabold">Toplam Skorun</div>
                <div className="text-lg font-black text-yellow-400">{score} Puan ⭐</div>
              </div>
            </div>

            {/* Costumes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {COSTUMES.map((costume) => {
                const isUnlocked = unlockedCostumeIds.includes(costume.id);
                const isEquipped = currentCostumeId === costume.id;
                const canAfford = coins >= costume.cost && score >= costume.minScore;

                return (
                  <div
                    key={costume.id}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-purple-950/60 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                        : isUnlocked
                        ? 'bg-slate-950 border-emerald-500/50 hover:border-emerald-400'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top Tag & Price */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {costume.tag}
                        </span>
                        {isUnlocked ? (
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <Check size={14} /> Açık
                          </span>
                        ) : (
                          <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                            🪙 {costume.cost} Altın
                          </span>
                        )}
                      </div>

                      {/* Costume Icon & Name */}
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/20"
                          style={{ backgroundColor: costume.hatColor }}
                        >
                          {costume.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-white">{costume.name}</h4>
                          <p className="text-[11px] text-slate-300 line-clamp-1">{costume.description}</p>
                        </div>
                      </div>

                      {/* Color Palette Indicators */}
                      <div className="flex items-center gap-1.5 mb-3 text-[10px] text-slate-400">
                        <span>Renkler:</span>
                        <div className="w-3.5 h-3.5 rounded-full border border-black" style={{ backgroundColor: costume.hatColor }} title="Şapka" />
                        <div className="w-3.5 h-3.5 rounded-full border border-black" style={{ backgroundColor: costume.shirtColor }} title="Gömlek" />
                        <div className="w-3.5 h-3.5 rounded-full border border-black" style={{ backgroundColor: costume.overallsColor }} title="Tulum" />
                        {costume.capeColor && (
                          <div className="w-3.5 h-3.5 rounded-full border border-black" style={{ backgroundColor: costume.capeColor }} title="Pelerin" />
                        )}
                      </div>

                      {/* Min Score requirement warning if locked */}
                      {!isUnlocked && costume.minScore > 0 && score < costume.minScore && (
                        <div className="text-[10px] text-amber-400 mb-2 font-bold">
                          ⚠️ Açmak için en az {costume.minScore} puan gerekli!
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div>
                      {isEquipped ? (
                        <button
                          disabled
                          className="w-full bg-yellow-400 text-slate-950 font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                        >
                          <Check size={14} /> GİYİLDİ
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquipOrBuyCostume(costume)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          BU KOSTÜMÜ GİY 🐱
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquipOrBuyCostume(costume)}
                          disabled={!canAfford}
                          className={`w-full font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300 shadow active:scale-95 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          {canAfford ? (
                            `SATIN AL & GİY (🪙 ${costume.cost})`
                          ) : (
                            coins < costume.cost
                              ? `${costume.cost - coins} Altın Daha Gerekli`
                              : `${costume.minScore - score} Puan Daha Gerekli`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowShopModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition text-xs"
            >
              Mağazayı Kapat & Oyuna Dön
            </button>
          </div>
        </div>
      )}

      {/* Android Installation & APK Modal */}
      {showAndroidModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-lg">
                <Smartphone size={22} />
                <span>Android'e Nasıl Yüklenir?</span>
              </div>
              <button
                onClick={() => setShowAndroidModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-200">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/40">
                <div className="font-extrabold text-emerald-400 flex items-center gap-1.5 mb-1 text-sm">
                  <span>📱 1. Yöntem: Doğrudan Telefona / Tablete Yükleme</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed mb-3">
                  Bu oyun <b>Progressive Web App (PWA)</b> olarak hazırlanmıştır. Google Play'e gerek kalmadan telefonun ana ekranına uygulama olarak eklenir ve internetsiz çalışır:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg text-xs space-y-1.5 text-slate-300 border border-slate-800">
                  <div>1. Android Chrome tarayıcısında bu sayfayı açın.</div>
                  <div>2. Sağ üstteki <b>üç nokta (⋮)</b> menüsüne dokunun.</div>
                  <div>3. <b>"Uygulamayı yükle"</b> veya <b>"Ana ekrana ekle"</b> seçeneğine dokunun.</div>
                  <div>4. Mario Cat simgesi telefonunuzun uygulama listesinde yerini alır!</div>
                </div>

                {isInstallable && (
                  <button
                    onClick={() => {
                      setShowAndroidModal(false);
                      install();
                    }}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-xl transition flex items-center justify-center gap-2 text-xs"
                  >
                    <Smartphone size={15} /> Şimdi Bu Cihaza Yükle
                  </button>
                )}
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="font-extrabold text-amber-400 flex items-center gap-1.5 mb-1 text-sm">
                  <span>📦 2. Yöntem: Google Play İçin .APK Çıktısı Alma</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed mb-2">
                  Oyunu doğrudan bağımsız bir Android `.apk` dosyasına dönüştürüp Google Play Store'da yayınlamak için:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg text-xs text-slate-300 border border-slate-800 space-y-1">
                  <div>• <b>PWABuilder (pwabuilder.com)</b> adresine uygulamanın URL adresini yapıştırın.</div>
                  <div>• "Package for Android" butonuna basarak tek tıkla imzalı <b>.APK / .AAB</b> paketini indirin.</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="font-extrabold text-sky-400 flex items-center gap-1.5 mb-1 text-sm">
                  <span>💾 3. Yöntem: Tek Dosya HTML Olarak Çalıştırma</span>
                </div>
                <button
                  onClick={handleDownloadStandalone}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Download size={13} /> super-mario-carpim-tablosu.html İndir
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidModal(false)}
              className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition text-xs"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-lg">
                <Copy size={20} />
                <span>Tek Dosya HTML Oyunu</span>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Bu oyun HTML5 Canvas, modern CSS ve Vanilla JavaScript ile hiçbir harici bağımlılık olmadan TEK BİR .HTML DOSYASI olarak derlenmiştir.
            </p>
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleDownloadStandalone}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow transition-all"
              >
                <Download size={16} /> .HTML Olarak İndir
              </button>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-sm px-4 py-2.5 rounded-xl transition-all"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                {copied ? 'Kopyalandı!' : 'Tüm HTML Kodunu Kopyala'}
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 select-text">
              <code>{`Dosya Adı: super-mario-carpim-tablosu.html (Tamamı tek dosya, 100% bağımsız)`}</code>
            </div>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black text-amber-400 mb-3 flex items-center gap-2">
              <HelpCircle size={22} /> Nasıl Oynanır?
            </h3>
            <ul className="text-sm text-slate-300 space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                <span>Ekranın üst kısmında çıkan çarpma işlemini incele (Örn: <b>4 x 7 = ?</b>).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                <span>Doğru kutunun altına gelip <b>ZIPLA</b> tuşuna basarak patlat!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">3.</span>
                <span><b>DİKKAT:</b> Yanlış cevap verirsen <b>Kaplumbağalar</b> çıkar ve <b>3 canından birini</b> alır!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold">4.</span>
                <span>Topladığın <b>altınlarla</b> bölüm sonlarında kediye Ateş Kedisi, Luigi, Tanooki ve Kral Kedi kostümleri al!</span>
              </li>
            </ul>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl transition-all"
            >
              ANLADIM, BAŞLA! 🎮
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
