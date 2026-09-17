import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import * as Phaser from "phaser";
import { Smartphone, RotateCw, X, Maximize } from "lucide-react";
import { createGameConfig } from "./game/config";
import { AppUI } from "./ui/AppUI";
import { GAME_WIDTH, GAME_HEIGHT, getDynamicGameSize } from "./game/constants";
import { playSound } from "./game/utils/audio";
import { requestAppFullscreen, subscribeFullscreenChange } from "./game/utils/fullscreen";

const IS_MOBILE_DEVICE =
  navigator.maxTouchPoints > 1 ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

function checkIsPortrait(): boolean {
  const vw = window.visualViewport?.width || window.innerWidth;
  const vh = window.visualViewport?.height || window.innerHeight;
  return vh > vw;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const resizeTimerRef = useRef<number | null>(null);

  const [isPortrait, setIsPortrait] = useState(() => checkIsPortrait());
  const [dismissedPortrait, setDismissedPortrait] = useState(false);
  const [dimensions, setDimensions] = useState(() => ({
    width: window.visualViewport?.width || window.innerWidth,
    height: window.visualViewport?.height || window.innerHeight,
  }));
  const [inGame, setInGame] = useState(() => {
    return window.location.hash.includes("/game");
  });

  useEffect(() => {
    const handleHashChange = () => {
      setInGame(window.location.hash.includes("/game"));
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update scale safely without lag or memory leaks
  const applySize = useCallback(() => {
    const curW = window.visualViewport?.width || window.innerWidth;
    const curH = window.visualViewport?.height || window.innerHeight;
    const portraitMode = curH > curW;

    setIsPortrait(portraitMode);
    // If rotated to horizontal (landscape), automatically reset dismissed state
    if (!portraitMode) {
      setDismissedPortrait(false);
    }

    setDimensions({
      width: curW,
      height: curH,
    });

    const game = gameRef.current || (window as any).phaserGame;
    if (game && game.scale) {
      try {
        const { width: targetW, height: targetH } = getDynamicGameSize(curW, curH);
        if (game.scale.width !== targetW || game.scale.height !== targetH) {
          game.scale.resize(targetW, targetH);
        }
        game.scale.refresh();
        game.scale.updateBounds();
      } catch (e) {
        console.warn("Resize handling error:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Attempt landscape lock if available in browser
    try {
      const ori = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      };
      ori?.lock?.("landscape").catch(() => {});
    } catch {}

    const handleResizeOrRotate = () => {
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }
      // Immediate adjustment
      applySize();
      
      // Cascading fallbacks to catch the exact moment mobile browser UI (address bar/nav bar) settles
      setTimeout(applySize, 50);
      setTimeout(applySize, 150);
      setTimeout(applySize, 300);
      
      // Final debounce to guarantee clean state
      resizeTimerRef.current = window.setTimeout(applySize, 600);
    };

    window.addEventListener("resize", handleResizeOrRotate, { passive: true });
    window.addEventListener("orientationchange", handleResizeOrRotate, { passive: true });
    document.addEventListener("fullscreenchange", handleResizeOrRotate, { passive: true });
    document.addEventListener("webkitfullscreenchange", handleResizeOrRotate, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResizeOrRotate, { passive: true });
    }

    const unsubFs = subscribeFullscreenChange(() => {
      handleResizeOrRotate();
    });

    return () => {
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }
      window.removeEventListener("resize", handleResizeOrRotate);
      window.removeEventListener("orientationchange", handleResizeOrRotate);
      document.removeEventListener("fullscreenchange", handleResizeOrRotate);
      document.removeEventListener("webkitfullscreenchange", handleResizeOrRotate);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResizeOrRotate);
      }
      unsubFs();
    };
  }, [applySize]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    (window as any).__portraitMobile = false;

    const config = createGameConfig(containerRef.current, "fit");
    const game = new Phaser.Game(config);
    gameRef.current = game;
    (window as any).phaserGame = game;

    // Force immediate size adjustment on mount
    applySize();

    // Cascading delayed updates to guarantee full canvas scaling as mobile elements (address/status bars) settle
    const t1 = setTimeout(applySize, 50);
    const t2 = setTimeout(applySize, 150);
    const t3 = setTimeout(applySize, 350);
    const t4 = setTimeout(applySize, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      game.destroy(true);
      gameRef.current = null;
      delete (window as any).phaserGame;
    };
  }, [applySize]);

  const handleStartGame = () => {
    try {
      if (typeof (window as any).triggerStartGame === "function") {
        (window as any).triggerStartGame();
        return;
      }
      const game = gameRef.current || (window as any).phaserGame;
      if (game && game.scene) {
        if (game.scene.isActive("MenuScene")) {
          const menu = game.scene.getScene("MenuScene") as any;
          if (menu && typeof menu.startGame === "function") {
            menu.startGame();
            return;
          }
        }
        game.scene.stop("MenuScene");
        game.scene.start("GameScene");
      }
    } catch (e) {
      console.warn("Error starting game:", e);
    }
  };

  const handleRequestFullscreenAndLandscape = () => {
    // 1. Immediately request universal fullscreen (synchronous on direct user gesture)
    requestAppFullscreen();

    // 2. Recalculate layout dimensions
    applySize();
    setTimeout(applySize, 60);
    setTimeout(applySize, 200);
  };

  // Calculate dynamic scaling and bounds
  const vw = dimensions.width;
  const vh = dimensions.height;
  const currentSize = getDynamicGameSize(vw, vh);
  const scale = Math.min(vw / currentSize.width, vh / currentSize.height);
  const width = currentSize.width * scale;
  const height = currentSize.height * scale;
  const left = (vw - width) / 2;
  const top = (vh - height) / 2;

  return (
    <div
      style={{ position: "fixed", inset: 0 }}
      className="overflow-hidden bg-[#0a0a0f] select-none"
    >
      {/* Phaser Canvas container */}
      <div id="game-container" ref={containerRef} className="absolute inset-0 z-0" />

      {/* React UI Overlay rendered across the full viewport */}
      <AppUI
        onStartGame={handleStartGame}
        isMobile={IS_MOBILE_DEVICE}
        canvasBounds={{ left, top, width, height, scale }}
      />

      {/* Full Portrait Helper Modal: guides user to rotate phone to landscape */}
      {isPortrait && !dismissedPortrait && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300">
          <div className="relative max-w-sm w-full bg-[#0a1628] border-2 border-[#1abc9c]/70 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center">
            {/* Close button to allow vertical play */}
            <button
              onClick={() => setDismissedPortrait(true)}
              aria-label="Fechar aviso"
              className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Rotating phone animated indicator */}
            <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-2xl bg-[#1abc9c]/10 border border-[#1abc9c]/30 shadow-inner">
              <div className="animate-phone-rotate text-[#1abc9c]">
                <Smartphone className="w-10 h-10 stroke-[1.8]" />
              </div>
            </div>

            <h2 className="text-lg font-bold text-white font-mono tracking-tight mb-2 flex items-center gap-2">
              <span>Gire para a Horizontal</span>
              <RotateCw className="w-4 h-4 text-[#1abc9c] animate-spin-slow" />
            </h2>

            <p className="text-sm text-gray-300 font-sans leading-relaxed mb-3">
              Para a melhor experiência e campo de visão no <strong>Hospital Antônio Pedro</strong>, vire seu aparelho na horizontal (modo paisagem).
            </p>

            <div className="w-full mb-5 p-2.5 rounded-xl bg-white/5 border border-[#1abc9c]/25 text-xs text-gray-300 text-left space-y-1">
              <p className="font-semibold text-[#1abc9c] flex items-center gap-1">
                <span>📱</span> <span>Dica de rotação:</span>
              </p>
              <p>• Ative a <strong>Rotação Automática</strong> no painel de controle do seu celular.</p>
              <p>• Toque no botão abaixo e vire o aparelho de lado.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                handleRequestFullscreenAndLandscape();
                try {
                  playSound("click");
                } catch {}
                setDismissedPortrait(true);
              }}
              className="w-full py-3.5 px-4 bg-[#1abc9c] hover:bg-[#16a085] active:bg-[#148f77] text-[#020b14] font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 touch-manipulation cursor-pointer select-none active:scale-[0.98]"
            >
              <Maximize className="w-4 h-4" />
              <span>Entendido, tela cheia</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating reminder chip if portrait is active but modal was dismissed */}
      {isPortrait && dismissedPortrait && (
        <button
          type="button"
          onClick={() => {
            handleRequestFullscreenAndLandscape();
            try {
              playSound("click");
            } catch {}
            setDismissedPortrait(false);
          }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[300] bg-[#0a1628]/95 border border-[#1abc9c]/70 text-[#1abc9c] px-3.5 py-1.5 rounded-full text-xs font-mono font-bold shadow-lg flex items-center gap-2 backdrop-blur-sm active:scale-95 transition-all pointer-events-auto cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Vire na Horizontal / Tela Cheia</span>
        </button>
      )}
    </div>
  );
}
