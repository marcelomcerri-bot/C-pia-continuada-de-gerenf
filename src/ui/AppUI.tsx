import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { Play, ClipboardList, LogOut, Pause, BookOpen, Maximize2, Minimize2 } from "lucide-react";
import { hasSave, clearSave, loadGame, saveGame, DEFAULT_STATE } from "../game/utils/save";
import { PlayerProfile, GameState, MISSIONS, getLevelInfo } from "../game/data/gameData";
import { playSound } from "../game/utils/audio";
import { isAppFullscreen, toggleAppFullscreen, subscribeFullscreenChange } from "../game/utils/fullscreen";
import { ProfessorView } from "./ProfessorView";
import { ErrorNotebookModal } from "./ErrorNotebookModal";
import { CharacterCreationModal } from "./CharacterCreationModal";

// Students are identified by a generated ID stored in sessionStorage so the
// professor dashboard can track them across the session without any login.
function getOrCreatePlayerId(): string {
  const key = "gestor_player_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

async function registerInGlobalRoom(playerNameOverride?: string) {
  const playerId = getOrCreatePlayerId();
  const state = loadGame();
  const playerName = playerNameOverride || state.playerProfile?.name || `Estudante`;
  try {
    // Use PUT-style upsert: join always re-registers with the same stored ID.
    // Since our API generates a new ID, we track ours separately and send
    // heartbeats using window.sessionRoom which is set here.
    const res = await fetch("/api/rooms/GLOBAL/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, playerId }),
    });
    if (res.ok) {
      const data = await res.json();
      (window as any).sessionRoom = { code: "GLOBAL", playerId: data.playerId || playerId };
    }
  } catch {
    // silent — professor mode is optional, game works without it
  }
}

export interface CanvasBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
}

export function AppUI({
  onStartGame,
  isMobile = false,
  canvasBounds = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, scale: 1 },
}: {
  onStartGame: () => void;
  isMobile?: boolean;
  canvasBounds?: CanvasBounds;
}) {
  return (
    <HashRouter>
      <RoutesWrapper
        onStartGame={onStartGame}
        isMobile={isMobile}
        canvasBounds={canvasBounds}
      />
    </HashRouter>
  );
}

function RoutesWrapper({
  onStartGame,
  isMobile,
  canvasBounds,
}: {
  onStartGame: () => void;
  isMobile: boolean;
  canvasBounds: CanvasBounds;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeChoices, setActiveChoices] = useState<{ text: string; index: number }[] | null>(null);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsNotebookOpen(true);
    const handleClose = () => setIsNotebookOpen(false);
    const handleToggle = () => setIsNotebookOpen((prev) => !prev);

    window.addEventListener("opennotebook", handleOpen);
    window.addEventListener("closenotebook", handleClose);
    window.addEventListener("togglenotebook", handleToggle);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle notebook with 'C' key if not typing in input
      if (
        (e.key === "c" || e.key === "C") &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName || "")
      ) {
        setIsNotebookOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("opennotebook", handleOpen);
      window.removeEventListener("closenotebook", handleClose);
      window.removeEventListener("togglenotebook", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    (window as any).reactNavigate = navigate;
    const handleRequestPause = () => {
      navigate("/pause");
    };
    window.addEventListener("requestpause", handleRequestPause);
    return () => {
      delete (window as any).reactNavigate;
      window.removeEventListener("requestpause", handleRequestPause);
    };
  }, [navigate]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        // Find if we clicked a button, a link, or an element with role="button"
        const interactive = target.closest("button, [role='button'], a");
        if (interactive) {
          try {
            playSound("click");
          } catch {}
        }
      }
    };
    document.addEventListener("click", handleGlobalClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  const [missionsModalData, setMissionsModalData] = useState<GameState | null>(null);

  useEffect(() => {
    const handleToggleMissions = (e: any) => {
      setMissionsModalData((prev) => {
        if (prev) return null;
        const state = e?.detail?.state || (window as any).phaserGame?.scene?.getScene("GameScene")?.state;
        return state || null;
      });
    };
    window.addEventListener("toggle-missions" as any, handleToggleMissions);
    return () => {
      window.removeEventListener("toggle-missions" as any, handleToggleMissions);
    };
  }, []);

  useEffect(() => {
    const onShow = () => {
      const data = (window as any).activeChoices;
      if (data) {
        setActiveChoices(data.choices);
      }
    };
    const onHide = () => {
      setActiveChoices(null);
    };
    window.addEventListener("showchoices", onShow);
    window.addEventListener("hidechoices", onHide);
    return () => {
      window.removeEventListener("showchoices", onShow);
      window.removeEventListener("hidechoices", onHide);
    };
  }, []);

  const inGame =
    location.pathname !== "/" &&
    location.pathname !== "/pause" &&
    location.pathname !== "/professor";

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <HomeMenu
                onStartGame={onStartGame}
                canvasBounds={canvasBounds}
              />
            }
          />
          <Route path="/pause" element={<PauseMenu />} />
          <Route path="/professor" element={<ProfessorView />} />
        </Routes>
      </AnimatePresence>

      {isMobile && inGame && <MobileControls />}
      {activeChoices && (
        <DialogueChoicesOverlay choices={activeChoices} />
      )}

      <ErrorNotebookModal
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
      />

      <MissionsModal
        isOpen={!!missionsModalData}
        onClose={() => setMissionsModalData(null)}
        gameState={missionsModalData}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Home menu
// ---------------------------------------------------------------------------

function HomeMenu({
  onStartGame,
  canvasBounds,
}: {
  onStartGame: () => void;
  canvasBounds: CanvasBounds;
}) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [showCharCreation, setShowCharCreation] = useState(false);
  const startingRef = useRef(false);

  const openNewGameModal = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try { playSound("click"); } catch {}
    setShowCharCreation(true);
  };

  const confirmNewGame = (profile: PlayerProfile) => {
    setShowCharCreation(false);
    if (startingRef.current) return;
    startingRef.current = true;

    try { playSound("click"); } catch {}
    try { clearSave(); } catch {}

    const newState: GameState = {
      ...DEFAULT_STATE,
      playerProfile: profile,
    };
    saveGame(newState);

    try { registerInGlobalRoom(profile.name); } catch {}

    // Update phaser textures if Phaser game is running or when BootScene starts
    try {
      const phaser = (window as any).phaserGame;
      if (phaser && phaser.scene) {
        const bootScene = phaser.scene.getScene("BootScene") as any;
        if (bootScene && typeof bootScene.createPlayerSprite === "function") {
          bootScene.createPlayerSprite(profile);
        }
      }
    } catch {}

    onStartGame();
    navigate("/game");

    setTimeout(() => {
      startingRef.current = false;
    }, 800);
  };

  const continueGame = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (startingRef.current) return;
    startingRef.current = true;

    try { playSound("click"); } catch {}
    try { registerInGlobalRoom(); } catch {}

    onStartGame();
    navigate("/game");

    setTimeout(() => {
      startingRef.current = false;
    }, 800);
  };

  // Align buttons with the lower entrance colonnade of the hospital in the 16:9 canvas
  const menuCenterX = canvasBounds.left + canvasBounds.width / 2;
  const menuCenterY = canvasBounds.top + 490 * canvasBounds.scale;
  // Keep buttons comfortably readable even on compact/laptop views
  const menuScale = Math.min(1.05, Math.max(0.85, canvasBounds.scale));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 pointer-events-none"
    >
      <CharacterCreationModal
        isOpen={showCharCreation}
        onClose={() => setShowCharCreation(false)}
        onConfirm={confirmNewGame}
      />

      {!showHelp ? (
        <motion.div
          initial={{ opacity: 0, scale: menuScale * 0.92, x: "-50%", y: "-35%" }}
          animate={{ opacity: 1, scale: menuScale, x: "-50%", y: "-50%" }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.15 }}
          style={{
            position: "absolute",
            left: `${menuCenterX}px`,
            top: `${menuCenterY}px`,
            transformOrigin: "center center",
          }}
          className="flex flex-col gap-2.5 w-80 max-w-[92vw] pointer-events-auto select-none p-3.5 bg-slate-950/65 backdrop-blur-md rounded-2xl border border-teal-500/30 shadow-[0_12px_36px_rgba(0,0,0,0.65)]"
        >
          {hasSave() && (
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97, y: 1 }}
              type="button"
              onPointerDown={continueGame}
              onClick={continueGame}
              onMouseEnter={() => { try { playSound("hover"); } catch {} }}
              className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-sans font-bold text-[15px] tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-[0_4px_0_#312e81] active:translate-y-1 active:shadow-none border-2 border-white/90 cursor-pointer select-none touch-manipulation transition-all"
            >
              ▶ CONTINUAR
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97, y: 1 }}
            type="button"
            onPointerDown={openNewGameModal}
            onClick={openNewGameModal}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-2.5 bg-[#1abc9c] hover:bg-[#1dd2af] active:bg-[#16a085] text-white font-sans font-bold text-[15px] tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-[0_4px_0_#0e6252] active:translate-y-1 active:shadow-none border-2 border-white/90 cursor-pointer select-none touch-manipulation transition-all"
          >
            ★ NOVO JOGO
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97, y: 1 }}
            type="button"
            onPointerDown={() => { try { playSound("click"); } catch {}; setShowHelp(true); }}
            onClick={() => { try { playSound("click"); } catch {}; setShowHelp(true); }}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-2.5 bg-[#f39c12] hover:bg-[#f4a62a] active:bg-[#d68910] text-white font-sans font-bold text-[15px] tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-[0_4px_0_#a66705] active:translate-y-1 active:shadow-none border-2 border-white/90 cursor-pointer select-none touch-manipulation transition-all"
          >
            📖 COMO JOGAR
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97, y: 1 }}
            type="button"
            onPointerDown={() => { try { playSound("click"); } catch {}; navigate("/professor"); }}
            onClick={() => { try { playSound("click"); } catch {}; navigate("/professor"); }}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-2.5 bg-[#2c3e70] hover:bg-[#344985] active:bg-[#1a2348] text-white font-sans font-bold text-[15px] tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-[0_4px_0_#1a2348] active:translate-y-1 active:shadow-none border-2 border-white/90 cursor-pointer select-none touch-manipulation transition-all"
          >
            🎓 MODO PROFESSOR
          </motion.button>
        </motion.div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a1628]/95 border-4 border-teal-500 rounded-2xl p-6 w-[480px] max-w-full shadow-2xl flex flex-col items-center gap-4 max-h-[88vh] overflow-y-auto select-none"
          >
            <h2 className="text-base sm:text-lg font-mono text-teal-400 font-bold text-center">
              COMO JOGAR — HUAP/UFF
            </h2>
            <div className="text-teal-50 font-mono text-xs space-y-1.5 text-center">
              <p>🎮 WASD / Setas / D-Pad — Mover</p>
              <p>🏃 SHIFT / Botão RUN — Correr</p>
              <p>💬 E / Botão FALAR — Interagir</p>
              <p>📋 M / Botão MISSÃO — Missões</p>
              <p>⏸️ ESC / Botão PAUSA — Menu</p>
              <br />
              <p className="text-teal-200">
                Explore o HUAP, fale com a equipe e complete tarefas de enfermagem.
              </p>
              <p className="text-orange-400">
                🚨 CRISES: Eventos clínicos aleatórios exigem decisões rápidas!
              </p>
              <p className="text-green-400">⚡ Energia: descanse na Copa (+6/s)</p>
              <p className="text-red-400">😰 Estresse: reduza no jardim ou copa</p>
            </div>
            <button
              type="button"
              onPointerDown={() => { try { playSound("click"); } catch {}; setShowHelp(false); }}
              onClick={() => {
                try { playSound("click"); } catch {};
                setShowHelp(false);
              }}
              className="mt-2 px-8 py-2.5 rounded-xl bg-teal-600/30 text-teal-300 border-2 border-teal-400 hover:bg-teal-500 hover:text-white active:bg-teal-600 font-mono font-bold text-xs cursor-pointer select-none touch-manipulation"
            >
              VOLTAR
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function PauseMenu() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(() => isAppFullscreen());

  useEffect(() => {
    return subscribeFullscreenChange((fs) => {
      setIsFullscreen(fs);
    });
  }, []);

  const lastFsToggleRef = useRef(0);

  const handleToggleFullscreen = (e?: React.SyntheticEvent | React.PointerEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastFsToggleRef.current < 350) return;
    lastFsToggleRef.current = now;

    try { playSound("click"); } catch {}
    toggleAppFullscreen();
  };

  const resume = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try { playSound("click"); } catch {}
    navigate("/game");
    try {
      const phaser = (window as any).phaserGame;
      if (phaser && phaser.scene) {
        phaser.scene.resume("GameScene");
        phaser.scene.resume("HUDScene");
      }
    } catch {}
  };

  const exitToMenu = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try { playSound("click"); } catch {}
    navigate("/");
    try {
      const phaser = (window as any).phaserGame;
      if (phaser && phaser.scene) {
        phaser.scene.stop("HUDScene");
        phaser.scene.stop("DialogScene");
        phaser.scene.stop("GameScene");
        phaser.scene.start("MenuScene");
      }
    } catch {}
  };

  const openMissions = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try { playSound("click"); } catch {}
    navigate("/game");
    try {
      const phaser = (window as any).phaserGame;
      if (phaser && phaser.scene) {
        phaser.scene.resume("GameScene");
        phaser.scene.resume("HUDScene");
        
        // Wait briefly for scenes to fully resume before displaying the overlay
        setTimeout(() => {
          const gameScene = phaser.scene.getScene("GameScene") as any;
          if (gameScene && typeof gameScene.toggleMissionOverlay === "function") {
            gameScene.toggleMissionOverlay();
          }
        }, 80);
      }
    } catch {}
  };

  const openNotebook = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try { playSound("click"); } catch {}
    window.dispatchEvent(new CustomEvent("opennotebook"));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto p-4 select-none"
    >
      <div className="bg-slate-900/95 border border-slate-700/50 rounded-2xl p-8 w-[350px] max-w-full shadow-2xl flex flex-col items-stretch gap-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 mb-3 border border-teal-500/20">
            <Pause className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold tracking-wider text-slate-100 uppercase font-sans">
            Jogo Pausado
          </h2>
          <p className="text-[11px] font-semibold text-teal-400 tracking-wider uppercase font-sans mt-1">
            HUAP / UFF — GESTOR DE ENFERMAGEM
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {/* CONTINUAR / RETOMAR */}
          <button
            type="button"
            onPointerDown={resume}
            onClick={resume}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-sans text-sm font-semibold py-3.5 px-5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer select-none touch-manipulation"
          >
            <Play className="w-4 h-4" />
            <span>CONTINUAR</span>
          </button>

          {/* VER MISSÕES */}
          <button
            type="button"
            onPointerDown={openMissions}
            onClick={openMissions}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-sans text-sm font-semibold py-3.5 px-5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer select-none touch-manipulation"
          >
            <ClipboardList className="w-4 h-4" />
            <span>VER MISSÕES</span>
          </button>

          {/* CADERNO DE ERROS / APRENDIZADO */}
          <button
            type="button"
            onPointerDown={openNotebook}
            onClick={openNotebook}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-sans text-sm font-semibold py-3.5 px-5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer select-none touch-manipulation"
          >
            <BookOpen className="w-4 h-4" />
            <span>CADERNO DE ERROS (C)</span>
          </button>

          {/* TELA CHEIA / MODO PAISAGEM */}
          <button
            type="button"
            onPointerDown={handleToggleFullscreen}
            onClick={handleToggleFullscreen}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-3 bg-sky-700 hover:bg-sky-600 active:bg-sky-800 text-white font-sans text-sm font-semibold py-3.5 px-5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer select-none touch-manipulation pointer-events-auto"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? "SAIR DA TELA CHEIA" : "TELA CHEIA / PAISAGEM"}</span>
          </button>

          {/* VOLTAR AO MENU */}
          <button
            type="button"
            onPointerDown={exitToMenu}
            onClick={exitToMenu}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white font-sans text-sm font-semibold py-3.5 px-5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer select-none touch-manipulation"
          >
            <LogOut className="w-4 h-4" />
            <span>VOLTAR AO MENU</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Mobile D-Pad controls
// ---------------------------------------------------------------------------

type PadKey =
  | "up"
  | "down"
  | "left"
  | "right"
  | "sprint"
  | "actionJustPressed"
  | "missionJustPressed"
  | "menuJustPressed";

function setVPad(key: PadKey, value: boolean) {
  if (!(window as any).virtualPad) {
    (window as any).virtualPad = {
      up: false,
      down: false,
      left: false,
      right: false,
      sprint: false,
      actionJustPressed: false,
      missionJustPressed: false,
      menuJustPressed: false,
    };
  }
  (window as any).virtualPad[key] = value;
}

function VirtualDPad() {
  const padRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const handlePointer = (e: React.PointerEvent) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < 10) {
      // Inside center deadzone
      setVPad("up", false);
      setVPad("down", false);
      setVPad("left", false);
      setVPad("right", false);
      setActive({ up: false, down: false, left: false, right: false });
      return;
    }

    // Determine active direction based on vector components with diagonal tolerance
    const angle = Math.atan2(dy, dx); // radians -PI to PI
    const deg = (angle * 180) / Math.PI;

    // Slices for 8-way navigation
    const isRight = deg > -67.5 && deg < 67.5;
    const isDown = deg > 22.5 && deg < 157.5;
    const isLeft = deg > 112.5 || deg < -112.5;
    const isUp = deg < -22.5 && deg > -157.5;

    setVPad("up", isUp);
    setVPad("down", isDown);
    setVPad("left", isLeft);
    setVPad("right", isRight);
    setActive({ up: isUp, down: isDown, left: isLeft, right: isRight });
  };

  const handleDown = (e: React.PointerEvent) => {
    
    
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    handlePointer(e);
  };

  const handleMove = (e: React.PointerEvent) => {
    handlePointer(e);
  };

  const handleUp = (e?: React.PointerEvent | PointerEvent) => {
    try {
      if (e && 'currentTarget' in e && e.currentTarget && 'releasePointerCapture' in (e.currentTarget as any)) {
        (e.currentTarget as any).releasePointerCapture(e.pointerId);
      }
    } catch {}
    setVPad("up", false);
    setVPad("down", false);
    setVPad("left", false);
    setVPad("right", false);
    setActive({ up: false, down: false, left: false, right: false });
  };

  useEffect(() => {
    const globalUp = (e: PointerEvent) => handleUp(e);
    window.addEventListener("pointerup", globalUp);
    window.addEventListener("pointercancel", globalUp);
    return () => {
      window.removeEventListener("pointerup", globalUp);
      window.removeEventListener("pointercancel", globalUp);
    };
  }, []);

  return (
    <div
      ref={padRef}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      style={{
        position: "fixed",
        left: "max(12px, env(safe-area-inset-left, 12px))",
        bottom: "max(12px, env(safe-area-inset-bottom, 12px))",
        width: 130,
        height: 130,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        pointerEvents: "auto",
        zIndex: 85,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Center knob */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(15,23,42,0.4)",
          border: "1.5px solid rgba(26,188,156,0.3)",
          pointerEvents: "none",
        }}
      />

      {/* Direction indicators */}
      {/* UP */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 36,
          height: 36,
          borderRadius: 8,
          background: active.up ? "#1abc9c" : "rgba(30,41,59,0.8)",
          color: active.up ? "#0a1628" : "#1abc9c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: "bold",
          boxShadow: active.up ? "0 0 12px #1abc9c" : "none",
          transition: "background 0.08s, transform 0.08s",
          pointerEvents: "none",
        }}
      >
        ▲
      </div>

      {/* DOWN */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 36,
          height: 36,
          borderRadius: 8,
          background: active.down ? "#1abc9c" : "rgba(30,41,59,0.8)",
          color: active.down ? "#0a1628" : "#1abc9c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: "bold",
          boxShadow: active.down ? "0 0 12px #1abc9c" : "none",
          transition: "background 0.08s, transform 0.08s",
          pointerEvents: "none",
        }}
      >
        ▼
      </div>

      {/* LEFT */}
      <div
        style={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 36,
          height: 36,
          borderRadius: 8,
          background: active.left ? "#1abc9c" : "rgba(30,41,59,0.8)",
          color: active.left ? "#0a1628" : "#1abc9c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: "bold",
          boxShadow: active.left ? "0 0 12px #1abc9c" : "none",
          transition: "background 0.08s, transform 0.08s",
          pointerEvents: "none",
        }}
      >
        ◀
      </div>

      {/* RIGHT */}
      <div
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 36,
          height: 36,
          borderRadius: 8,
          background: active.right ? "#1abc9c" : "rgba(30,41,59,0.8)",
          color: active.right ? "#0a1628" : "#1abc9c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: "bold",
          boxShadow: active.right ? "0 0 12px #1abc9c" : "none",
          transition: "background 0.08s, transform 0.08s",
          pointerEvents: "none",
        }}
      >
        ▶
      </div>
    </div>
  );
}

function MobileControls() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sprintToggle, setSprintToggle] = useState(false);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const handler = (e: Event) =>
      setDialogOpen((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("dialogactive", handler);
    return () => window.removeEventListener("dialogactive", handler);
  }, []);

  if (dialogOpen) return null;

  const handleAction = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try { playSound("click"); } catch {}
    setVPad("actionJustPressed", true);
    window.dispatchEvent(new CustomEvent("mobileaction", { detail: { action: "falar" } }));
  };

  const handleSprintDown = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const next = !sprintToggle;
    setSprintToggle(next);
    setVPad("sprint", next);
    try { playSound("click"); } catch {}
  };

  const handleMission = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try { playSound("click"); } catch {}
    setVPad("missionJustPressed", true);
  };

  const handlePause = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 800);

    try { playSound("click"); } catch {}
    setVPad("menuJustPressed", true);

    // Save state & pause scenes immediately
    try {
      const phaser = (window as any).phaserGame;
      if (phaser && phaser.scene) {
        const gameScene = phaser.scene.getScene("GameScene") as any;
        if (gameScene && gameScene.state) {
          try { saveGame(gameScene.state); } catch {}
        }
        try { phaser.scene.pause("HUDScene"); } catch {}
        try { phaser.scene.pause("GameScene"); } catch {}
      }
    } catch (err) {
      console.warn("Pause phaser error:", err);
    }

    // Direct React Router navigation
    navigate("/pause");
  };

  const [isFullscreen, setIsFullscreen] = useState(() => isAppFullscreen());

  useEffect(() => {
    return subscribeFullscreenChange((fs) => {
      setIsFullscreen(fs);
    });
  }, []);

  const lastQuickFsRef = useRef(0);

  const handleQuickFullscreen = (e?: React.SyntheticEvent | React.PointerEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastQuickFsRef.current < 350) return;
    lastQuickFsRef.current = now;

    try { playSound("click"); } catch {}
    toggleAppFullscreen();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 80,
      }}
    >
      {/* D-Pad — bottom-left */}
      <VirtualDPad />

      {/* Floating Quick Fullscreen button right above action pad */}
      <div
        style={{
          position: "fixed",
          right: "max(14px, env(safe-area-inset-right, 14px))",
          bottom: "max(178px, calc(env(safe-area-inset-bottom, 14px) + 172px))",
          pointerEvents: "auto",
          zIndex: 86,
        }}
      >
        <button
          type="button"
          onPointerDown={handleQuickFullscreen}
          onClick={handleQuickFullscreen}
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(10, 22, 40, 0.9)",
            border: `2px solid ${isFullscreen ? "#10b981" : "#38bdf8"}`,
            color: isFullscreen ? "#10b981" : "#38bdf8",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            cursor: "pointer",
            touchAction: "manipulation",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* Action buttons — bottom-right */}
      <div
        style={{
          position: "fixed",
          right: "max(12px, env(safe-area-inset-right, 12px))",
          bottom: "max(12px, env(safe-area-inset-bottom, 12px))",
          width: 160,
          height: 160,
          pointerEvents: "none",
          zIndex: 85,
        }}
      >
        {/* RUN / SPRINT */}
        <button
          type="button"
          onPointerDown={handleSprintDown}
          onClick={handleSprintDown}
          style={{
            position: "absolute",
            left: 4,
            top: 8,
            width: 54,
            height: 54,
            pointerEvents: "auto",
            borderRadius: "50%",
            background: sprintToggle ? "#f39c12" : "rgba(15,23,42,0.92)",
            border: "3px solid #f39c12",
            color: sprintToggle ? "#0a1628" : "#fff",
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: sprintToggle ? "0 0 16px #f39c12" : "0 4px 10px rgba(0,0,0,0.5)",
            transition: "all 0.1s",
          }}
        >
          <span style={{ fontSize: 16 }}>🏃</span>
          <span style={{ fontSize: 9, lineHeight: 1 }}>{sprintToggle ? "CORRENDO" : "CORRER"}</span>
        </button>

        {/* FALAR / INTERAGIR */}
        <button
          type="button"
          onPointerDown={handleAction}
          onClick={handleAction}
          style={{
            position: "absolute",
            right: 2,
            top: 10,
            width: 68,
            height: 68,
            pointerEvents: "auto",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(26,188,156,0.95), rgba(16,140,115,0.98))",
            border: "3.5px solid #2ecc71",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(46,204,113,0.4), 0 6px 14px rgba(0,0,0,0.6)",
            transition: "transform 0.08s",
          }}
        >
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ fontSize: 10, letterSpacing: 0.5, marginTop: 1 }}>FALAR</span>
        </button>

        {/* MISSÃO */}
        <button
          type="button"
          onPointerDown={handleMission}
          onClick={handleMission}
          style={{
            position: "absolute",
            left: 4,
            bottom: 8,
            width: 52,
            height: 52,
            pointerEvents: "auto",
            borderRadius: "50%",
            background: "rgba(15,23,42,0.92)",
            border: "2.5px solid #9b59b6",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ fontSize: 15 }}>📋</span>
          <span style={{ fontSize: 8 }}>MISSÃO</span>
        </button>

        {/* PAUSA / MENU */}
        <button
          type="button"
          onPointerDown={handlePause}
          onClick={handlePause}
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            width: 54,
            height: 54,
            pointerEvents: "auto",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(30,15,15,0.95), rgba(15,23,42,0.95))",
            border: "3px solid #e74c3c",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: "0 0 14px rgba(231,76,60,0.4), 0 4px 10px rgba(0,0,0,0.6)",
          }}
        >
          <span style={{ fontSize: 16 }}>⚙️</span>
          <span style={{ fontSize: 9 }}>MENU</span>
        </button>
      </div>
    </div>
  );
}

function DialogueChoicesOverlay({
  choices,
}: {
  choices: { text: string; index: number }[] | null;
}) {
  const selectedRef = useRef(false);

  useEffect(() => {
    selectedRef.current = false;
  }, [choices]);

  const handleSelect = useCallback((idx: number) => {
    if (selectedRef.current) return;
    selectedRef.current = true;
    const data = (window as any).activeChoices;
    if (data?.select) {
      data.select(idx);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!choices || choices.length === 0) return;
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= choices.length) {
        e.preventDefault();
        handleSelect(choices[num - 1].index);
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleSelect(choices.length - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [choices, handleSelect]);

  if (!choices || choices.length === 0) return null;

  const activeData = (window as any).activeChoices;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto select-none animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] overflow-hidden">
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-2">
          {activeData?.topic && (
            <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-[10px] sm:text-xs font-semibold tracking-wide uppercase max-w-full">
              <span className="flex-shrink-0">📚</span>
              <span className="truncate">{activeData.topic}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-emerald-400 font-bold font-mono text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="text-base leading-none">💬</span> Selecione a melhor conduta
            </h3>
            <span className="text-[10px] text-slate-400 font-mono hidden xs:inline">
              Toque ou use o teclado [1-{choices.length}]
            </span>
          </div>
        </div>

        {/* Scrollable Choice Items Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 space-y-2 sm:space-y-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-emerald-500/30 [&::-webkit-scrollbar-thumb]:rounded-full">
          {choices.map((choice) => (
            <button
              key={choice.index}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(choice.index);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(choice.index);
              }}
              className="group relative w-full text-left p-2.5 sm:p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800/90 active:bg-emerald-950/50 border border-slate-700/70 hover:border-emerald-500/50 active:border-emerald-400 transition-all duration-150 flex items-start gap-3 cursor-pointer touch-manipulation shadow-sm active:scale-[0.99]"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-slate-950 font-mono font-bold text-xs flex items-center justify-center transition-colors mt-0.5">
                {choice.index + 1}
              </span>
              <span className="flex-1 text-xs sm:text-sm text-slate-100 font-sans font-medium leading-relaxed group-hover:text-white transition-colors">
                {choice.text}
              </span>
              <span className="hidden sm:inline-block text-[10px] text-slate-500 font-mono mt-0.5 group-hover:text-emerald-400 transition-colors">
                [{choice.index + 1}]
              </span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Missions Modal Component (React UI)
// ---------------------------------------------------------------------------

const MISSION_NPC_MAP: Record<string, { npcName: string; room: string }> = {
  triagem_ps: { npcName: 'Enf. Ana', room: 'Recepção' },
  fluxo_recepcao: { npcName: 'Enf. Ana', room: 'Recepção' },
  protocolo_sepse: { npcName: 'Dr. Carlos', room: 'Pronto-Socorro' },
  superlotacao_ps: { npcName: 'Dr. Carlos', room: 'Pronto-Socorro' },
  estoque_farmacia: { npcName: 'Farm. João', room: 'Farmácia' },
  reconciliacao_medicamentosa: { npcName: 'Farm. João', room: 'Farmácia' },
  resultados_criticos: { npcName: 'Tec. Renata', room: 'Laboratório' },
  coleta_sistematizada: { npcName: 'Tec. Renata', room: 'Laboratório' },
  laudo_urgente: { npcName: 'Dr. Roberto', room: 'Diagnóstico por Imagem' },
  escala_plantao: { npcName: 'Diretora Alves', room: 'Diretoria' },
  pesquisa_indicadores: { npcName: 'Diretora Alves', room: 'Diretoria' },
  orcamento: { npcName: 'Diretora Alves', room: 'Diretoria' },
  acreditacao_ona: { npcName: 'Diretora Alves', room: 'Diretoria' },
  cme_protocolo: { npcName: 'Tec. Rosa', room: 'Central de Material' },
  rastreabilidade_esterilizacao: { npcName: 'Tec. Rosa', room: 'Central de Material' },
  terapia_nutricional: { npcName: 'Nutr. Clara', room: 'Copa & Nutrição' },
  protocolo_dieta: { npcName: 'Nutr. Clara', room: 'Copa & Nutrição' },
  ronda_enfermaria: { npcName: 'Enf. Maria', room: 'Enfermaria' },
  capacitacao_sae: { npcName: 'Enf. Maria', room: 'Enfermaria' },
  passagem_plantao: { npcName: 'Enf. Maria', room: 'Enfermaria' },
  quimioterapia_segura: { npcName: 'Dra. Santos', room: 'Oncologia' },
  cuidados_paliativos: { npcName: 'Dra. Santos', room: 'Oncologia' },
  banco_leite: { npcName: 'Enf. Pedro', room: 'Maternidade' },
  humanizacao_parto: { npcName: 'Enf. Pedro', room: 'Maternidade' },
};

function MissionsModal({
  isOpen,
  onClose,
  gameState,
}: {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState | null;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "locked">("all");
  const [search, setSearch] = useState("");

  if (!isOpen || !gameState) return null;

  const levelInfo = getLevelInfo(gameState.prestige);
  const pName = gameState.playerProfile?.name || "Enf. Alex Santos";
  const doneCount = gameState.completedMissions.length;
  const totalCount = MISSIONS.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const processedMissions = MISSIONS.map((m) => {
    const isDone = gameState.completedMissions.includes(m.id);
    const isActive = !!gameState.missionProgress[m.id] && !isDone;
    const isLocked =
      !isDone &&
      !isActive &&
      m.prerequisiteIds.some((id) => !gameState.completedMissions.includes(id));
    const isAvailable = !isDone && !isActive && !isLocked;
    const info = MISSION_NPC_MAP[m.id] || { npcName: "Equipe", room: "Hospital" };

    return {
      ...m,
      isDone,
      isActive,
      isLocked,
      isAvailable,
      npcName: info.npcName,
      room: info.room,
    };
  });

  const filteredMissions = processedMissions.filter((m) => {
    if (filter === "active" && !m.isActive && !m.isAvailable) return false;
    if (filter === "completed" && !m.isDone) return false;
    if (filter === "locked" && !m.isLocked) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.npcName.toLowerCase().includes(q) ||
        m.room.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div 
      onClick={() => {
        try { playSound("click"); } catch {}
        onClose();
      }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none pointer-events-auto cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-3.5 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-lg">
                📋
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-bold font-mono text-emerald-400 tracking-wider uppercase">
                  Diretrizes e Missões de Gerência
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  {pName} · <span className="text-amber-400 font-semibold">{levelInfo.title}</span> · ⭐ {gameState.prestige} PTS
                </p>
              </div>
            </div>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try { playSound("click"); } catch {}
                onClose();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try { playSound("click"); } catch {}
                onClose();
              }}
              className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-xl font-bold font-mono cursor-pointer touch-manipulation"
              aria-label="Sair"
            >
              ✕
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-medium">Progresso de Gestão Hospitalar</span>
              <span className="text-emerald-400 font-bold">
                {doneCount} / {totalCount} ({progressPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
              {[
                { id: "all", label: "Todas" },
                { id: "active", label: "Em Andamento / Disponíveis" },
                { id: "completed", label: "Concluídas" },
                { id: "locked", label: "Bloqueadas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    playSound("click");
                    setFilter(tab.id as any);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    filter === tab.id
                      ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Buscar missão, setor, NPC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 w-full sm:w-56"
            />
          </div>
        </div>

        {/* Missions Grid / List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-emerald-500/30 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filteredMissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              Nenhuma missão encontrada neste filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMissions.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                    m.isDone
                      ? "bg-slate-900/60 border-emerald-500/30"
                      : m.isActive
                      ? "bg-slate-800/80 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                      : m.isAvailable
                      ? "bg-slate-800/40 border-cyan-500/40"
                      : "bg-slate-950/40 border-slate-800/80 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700/80 truncate">
                        {m.category}
                      </span>
                      {m.isDone && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 flex-shrink-0">
                          ✓ CONCLUÍDA (+{m.prestige} PTS)
                        </span>
                      )}
                      {m.isActive && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1 flex-shrink-0">
                          ▶ EM ANDAMENTO
                        </span>
                      )}
                      {m.isAvailable && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 flex-shrink-0">
                          💡 DISPONÍVEL
                        </span>
                      )}
                      {m.isLocked && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 flex-shrink-0">
                          🔒 BLOQUEADA
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 mb-1 leading-snug">
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2">
                      {m.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      📍 <strong className="text-emerald-400 font-medium">{m.npcName}</strong> ({m.room})
                    </span>
                    {m.pedagogyRef && (
                      <span className="text-[10px] text-amber-300/80">
                        📖 {m.pedagogyRef}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
