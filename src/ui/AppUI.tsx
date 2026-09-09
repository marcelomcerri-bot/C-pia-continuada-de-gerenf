import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Play, ClipboardList, LogOut, Pause, BookOpen } from "lucide-react";
import { hasSave, clearSave, loadGame, saveGame, DEFAULT_STATE } from "../game/utils/save";
import { PlayerProfile, GameState } from "../game/data/gameData";
import { playSound } from "../game/utils/audio";
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
    return () => {
      delete (window as any).reactNavigate;
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
      {isMobile && activeChoices && (
        <DialogueChoicesOverlay choices={activeChoices} />
      )}

      <ErrorNotebookModal
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
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

  // Align buttons with the title in the 16:9 canvas
  const menuCenterX = canvasBounds.left + canvasBounds.width / 2;
  const menuCenterY = canvasBounds.top + 440 * canvasBounds.scale;
  const menuScale = Math.min(1, Math.max(0.70, canvasBounds.scale));

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
          className="flex flex-col gap-3 w-72 pointer-events-auto select-none"
        >
          {hasSave() && (
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97, y: 1 }}
              type="button"
              onPointerDown={continueGame}
              onClick={continueGame}
              onMouseEnter={() => { try { playSound("hover"); } catch {} }}
              className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-sans font-bold text-sm tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-[0_4px_0_#312e81] active:translate-y-1 active:shadow-none border-2 border-white/90 cursor-pointer select-none touch-manipulation transition-all"
            >
              ▶ CONTINUAR
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97, y: 1 }}
            type="button"
            onPointerDown={openNewGameModal}
            onClick={openNewGameModal}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-2.5 bg-[#1abc9c] hover:bg-[#1dd2af] active:bg-[#16a085] text-white font-sans font-bold text-sm tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-[0_4px_0_#0e6252] active:translate-y-1 active:shadow-none border-2 border-white/90 cursor-pointer select-none touch-manipulation transition-all"
          >
            ★ NOVO JOGO
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97, y: 1 }}
            type="button"
            onPointerDown={() => { try { playSound("click"); } catch {}; setShowHelp(true); }}
            onClick={() => { try { playSound("click"); } catch {}; setShowHelp(true); }}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-2.5 bg-[#f39c12] hover:bg-[#f4a62a] active:bg-[#d68910] text-white font-sans font-bold text-sm tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-[0_4px_0_#a66705] active:translate-y-1 active:shadow-none border-2 border-white/90 cursor-pointer select-none touch-manipulation transition-all"
          >
            📖 COMO JOGAR
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97, y: 1 }}
            type="button"
            onPointerDown={() => { try { playSound("click"); } catch {}; navigate("/professor"); }}
            onClick={() => { try { playSound("click"); } catch {}; navigate("/professor"); }}
            onMouseEnter={() => { try { playSound("hover"); } catch {} }}
            className="w-full flex items-center justify-center gap-2.5 bg-[#2c3e70] hover:bg-[#344985] active:bg-[#1a2348] text-white font-sans font-bold text-sm tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-[0_4px_0_#1a2348] active:translate-y-1 active:shadow-none border-2 border-white/90 cursor-pointer select-none touch-manipulation transition-all"
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sprintToggle, setSprintToggle] = useState(false);

  useEffect(() => {
    const handler = (e: Event) =>
      setDialogOpen((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("dialogactive", handler);
    return () => window.removeEventListener("dialogactive", handler);
  }, []);

  if (dialogOpen) return null;

  const handleAction = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { playSound("click"); } catch {}
    setVPad("actionJustPressed", true);
    window.dispatchEvent(new CustomEvent("mobileaction", { detail: { action: "falar" } }));
  };

  const handleSprintDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !sprintToggle;
    setSprintToggle(next);
    setVPad("sprint", next);
    try { playSound("click"); } catch {}
  };

  const handleMission = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { playSound("click"); } catch {}
    setVPad("missionJustPressed", true);
  };

  const handlePause = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { playSound("click"); } catch {}
    setVPad("menuJustPressed", true);
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

      {/* Action buttons — bottom-right */}
      <div
        style={{
          position: "fixed",
          right: "max(16px, env(safe-area-inset-right, 16px))",
          bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
          width: 156,
          height: 156,
          pointerEvents: "none",
          zIndex: 85,
        }}
      >
        {/* RUN / SPRINT */}
        <button
          type="button"
          onPointerDown={handleSprintDown}
          style={{
            position: "absolute",
            left: 6,
            top: 10,
            width: 52,
            height: 52,
            pointerEvents: "auto",
            borderRadius: "50%",
            background: sprintToggle ? "#f39c12" : "rgba(15,23,42,0.9)",
            border: "3px solid #f39c12",
            color: sprintToggle ? "#0a1628" : "#fff",
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: sprintToggle ? "0 0 16px #f39c12" : "0 4px 10px rgba(0,0,0,0.5)",
            transition: "all 0.1s",
          }}
        >
          <span>🏃</span>
          <span style={{ fontSize: 9, lineHeight: 1 }}>{sprintToggle ? "CORRER" : "CORRER"}</span>
        </button>

        {/* FALAR / INTERAGIR */}
        <button
          type="button"
          onPointerDown={handleAction}
          style={{
            position: "absolute",
            right: 0,
            top: 22,
            width: 66,
            height: 66,
            pointerEvents: "auto",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(26,188,156,0.9), rgba(16,140,115,0.95))",
            border: "3.5px solid #2ecc71",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(46,204,113,0.4), 0 6px 14px rgba(0,0,0,0.6)",
            transition: "transform 0.08s",
          }}
        >
          <span style={{ fontSize: 16 }}>💬</span>
          <span style={{ fontSize: 10, letterSpacing: 0.5, marginTop: 1 }}>FALAR</span>
        </button>

        {/* MISSÃO */}
        <button
          type="button"
          onPointerDown={handleMission}
          style={{
            position: "absolute",
            left: 2,
            bottom: 6,
            width: 50,
            height: 50,
            pointerEvents: "auto",
            borderRadius: "50%",
            background: "rgba(15,23,42,0.9)",
            border: "2.5px solid #9b59b6",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ fontSize: 14 }}>📋</span>
          <span style={{ fontSize: 8 }}>MISSÃO</span>
        </button>

        {/* PAUSA */}
        <button
          type="button"
          onPointerDown={handlePause}
          style={{
            position: "absolute",
            right: 18,
            bottom: 0,
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "rgba(15,23,42,0.9)",
            border: "2.5px solid #e74c3c",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ fontSize: 13 }}>⚙️</span>
          <span style={{ fontSize: 8 }}>MENU</span>
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
  if (!choices) return null;

  const handleSelect = (idx: number) => {
    if (selectedRef.current) return;
    selectedRef.current = true;
    const data = (window as any).activeChoices;
    if (data?.select) {
      data.select(idx);
    }
  };

  const activeData = (window as any).activeChoices;
  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-end sm:justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 pointer-events-auto select-none">
      <div className="flex flex-col gap-2.5 w-full max-w-lg p-3.5 sm:p-4 bg-[#0a1628]/98 border-2 border-[#1abc9c] rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto mb-2 sm:mb-0">
        <div className="flex flex-col gap-1.5 border-b border-[#1abc9c]/30 pb-2 mb-0.5">
          {activeData?.topic && (
            <div className="bg-[#f1c40f]/15 border border-[#f1c40f]/70 rounded-md px-2.5 py-1 text-[#f1c40f] font-mono text-[11px] font-bold uppercase tracking-wider text-center">
              📚 CONTEÚDO: {activeData.topic}
            </div>
          )}
          <div className="flex items-center justify-between">
            <h3 className="text-[#1abc9c] font-bold font-mono text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <span>💬</span> Selecione a melhor conduta
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Toque para selecionar</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {choices.map((choice) => (
            <button
              key={choice.index}
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
              className="w-full text-left px-3 py-2.5 rounded-xl bg-[#0d1f35] border border-[#1abc9c]/70 hover:bg-[#1a3a5c] active:bg-[#1a3a5c] active:border-[#f1c40f] text-slate-100 font-sans text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow border-l-4 border-l-[#1abc9c] active:border-l-[#f1c40f] transition-all cursor-pointer touch-manipulation min-h-[44px]"
            >
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-[#1abc9c] text-[#0d1f35] font-bold text-xs">
                {choice.index + 1}
              </span>
              <span className="flex-1 leading-snug text-sm sm:text-base font-bold text-white">{choice.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
