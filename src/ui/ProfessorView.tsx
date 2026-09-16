import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  RefreshCw,
  Activity,
  ArrowLeft,
  BarChart3,
  Video,
  Radio,
  Trophy,
  Award,
  Zap,
  MapPin,
  Clock,
  Eye,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Filter,
  Check,
  ClipboardList,
  FileText,
  Lock,
  X,
  Crown,
  ChevronDown,
  ChevronRight,
  User,
  UserCheck,
  Layers
} from "lucide-react";
import { playSound } from "../game/utils/audio";
import { LiveGameplayCanvas } from "./LiveGameplayCanvas";

export function getDisplayNickname(fullName: string): { nick: string; firstName: string; prefix?: string } {
  if (!fullName) return { nick: "Estudante", firstName: "Estudante" };
  const trimmed = fullName.trim();

  // Strip "Enf. ", "Enf ", "Dr. ", "Dra. ", "Téc. " prefixes
  const prefixMatch = trimmed.match(/^(Enf\.?|Dr\.?|Dra\.?|Téc\.?)\s+/i);
  let nick = trimmed;
  let prefix: string | undefined = undefined;

  if (prefixMatch) {
    prefix = prefixMatch[1];
    nick = trimmed.replace(/^(Enf\.?|Dr\.?|Dra\.?|Téc\.?)\s+/i, "").trim();
  }

  if (!nick) nick = trimmed;

  const firstName = nick.split(" ")[0] || nick;

  return { nick, firstName, prefix };
}

export interface DecisionLog {
  id: string;
  playerId: string;
  playerName: string;
  timestamp: number;
  npcName: string;
  questionText: string;
  selectedOption: string;
  isCorrect: boolean;
  pointsEarned: number;
  feedback: string;
  category: string;
}

export interface PlayerData {
  playerId: string;
  playerName: string;
  online: boolean;
  currentRoom: string;
  prestige: number;
  score: number;
  energy: number;
  stress: number;
  level: string;
  completedMissions: number;
  lastActivity: string;
  shiftTime: number;
  isDemo?: boolean;
  x?: number;
  y?: number;
  facing?: string;
  isMoving?: boolean;
  avatar?: any;
}

const CARD_COLORS = [
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#e74c3c",
  "#27ae60",
  "#f39c12",
  "#2980b9",
];

function formatTime(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes || 0));
  const h = Math.floor(m / 60);
  const min = Math.floor(m % 60);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function StatBar({
  value,
  color,
  label,
  display,
}: {
  value: number;
  color: string;
  label: string;
  display: string;
}) {
  const safeVal = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div>
      <div className="flex justify-between mb-1 text-[10px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold" style={{ color }}>
          {display}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-slate-900 border border-slate-700/50">
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${safeVal}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// LiveGameplayCanvas imported from ./LiveGameplayCanvas

// ─────────────────────────────────────────────────────────────────────────────
// Demo / Simulation Initializer with Dynamic Scoring
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_DEMO_PLAYERS: PlayerData[] = [
  {
    playerId: "demo-1",
    playerName: "Ana Silva (Enf. Internato)",
    online: true,
    currentRoom: "Pacientes e Enfermarias",
    prestige: 110,
    score: 110,
    energy: 85,
    stress: 25,
    level: "Gestora Júnior",
    completedMissions: 3,
    lastActivity: "Dimensionamento COFEN 543/2017 aprovado",
    shiftTime: 180,
    isDemo: true,
    x: 220,
    y: 140,
    facing: "down",
  },
  {
    playerId: "demo-2",
    playerName: "Lucas Mendes (Monitoria)",
    online: true,
    currentRoom: "Central de Material (CME)",
    prestige: 85,
    score: 85,
    energy: 95,
    stress: 15,
    level: "Estagiário UFF",
    completedMissions: 2,
    lastActivity: "Auditoria da RDC 15 na Central de Esterilização",
    shiftTime: 240,
    isDemo: true,
    x: 410,
    y: 190,
    facing: "right",
  },
  {
    playerId: "demo-3",
    playerName: "Mariana Costa (Graduação)",
    online: true,
    currentRoom: "UTI Adulto",
    prestige: 0,
    score: 0,
    energy: 60,
    stress: 60,
    level: "Estagiária",
    completedMissions: 0,
    lastActivity: "Iniciando avaliação na UTI Adulto",
    shiftTime: 60,
    isDemo: true,
    x: 180,
    y: 110,
    facing: "up",
  },
  {
    playerId: "demo-4",
    playerName: "Gabriel Oliveira (Graduação)",
    online: true,
    currentRoom: "Pronto-Socorro & Triagem",
    prestige: 0,
    score: 0,
    energy: 90,
    stress: 10,
    level: "Estagiário",
    completedMissions: 0,
    lastActivity: "Avaliando fila de acolhimento e triagem",
    shiftTime: 45,
    isDemo: true,
    x: 320,
    y: 170,
    facing: "left",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Professor Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export function ProfessorView() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("prof_authenticated") === "true";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [demoList, setDemoList] = useState<PlayerData[]>(INITIAL_DEMO_PLAYERS);
  const [useDemo, setUseDemo] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [showClassReport, setShowClassReport] = useState(false);
  const [showDecisionLogsModal, setShowDecisionLogsModal] = useState(false);
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [decisionFilter, setDecisionFilter] = useState<"all" | "correct" | "error">("all");
  const [decisionSearch, setDecisionSearch] = useState("");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("all");
  const [viewGroupMode, setViewGroupMode] = useState<"grouped" | "timeline">("grouped");
  const [collapsedStudents, setCollapsedStudents] = useState<Record<string, boolean>>({});

  // Manual spectator override (null = auto broadcast top scorer)
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);

  // Periodic position and score simulation for demo mode so students walk and leaders swap!
  useEffect(() => {
    const simTimer = setInterval(() => {
      setDemoList((prev) => {
        return prev.map((p) => {
          const nextP = { ...p };
          
          // Random movement steps on Phaser map scale (100..2300, 100..1500)
          const deltaX = Math.floor(Math.random() * 200 - 100);
          const deltaY = Math.floor(Math.random() * 200 - 100);
          const newX = Math.max(150, Math.min(2250, (nextP.x ?? 800) + deltaX));
          const newY = Math.max(150, Math.min(1450, (nextP.y ?? 600) + deltaY));
          
          let facing: 'up' | 'down' | 'left' | 'right' = 'down';
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            facing = deltaX > 0 ? 'right' : 'left';
          } else {
            facing = deltaY > 0 ? 'down' : 'up';
          }

          nextP.x = newX;
          nextP.y = newY;
          nextP.facing = facing;
          nextP.isMoving = true;

          // Occasional score/activity boost
          if (Math.random() < 0.3) {
            const gained = Math.floor(Math.random() * 20) + 10;
            nextP.score = (nextP.score || 0) + gained;
            nextP.prestige = nextP.score;
            nextP.completedMissions = (nextP.completedMissions || 0) + 1;
            const activities = [
              `Dimensionamento de Pessoal COFEN 543/2017 (+${gained} pts)`,
              `Atendimento no Leito com Prescrição (+${gained} pts)`,
              `Auditoria de Processos CME RDC 15 (+${gained} pts)`,
              `Acolhimento com Classificação de Risco (+${gained} pts)`,
            ];
            nextP.lastActivity = activities[Math.floor(Math.random() * activities.length)];
          }

          return nextP;
        });
      });
    }, 1800);

    return () => clearInterval(simTimer);
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms/GLOBAL/players");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const list = Array.isArray(data.players) ? data.players : [];
      setPlayers(list);
      setLastRefresh(new Date());
      setError("");
    } catch {
      setError("Sem conexão ao servidor local");
    }
  }, []);

  useEffect(() => {
    fetchPlayers();

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource("/api/rooms/GLOBAL/stream");

      eventSource.onopen = () => {
        setIsRealtime(true);
        setError("");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.players)) {
            setPlayers(data.players);
            setLastRefresh(new Date());
          }
        } catch (e) {
          console.error("SSE parse error", e);
        }
      };

      eventSource.onerror = () => {
        setIsRealtime(false);
      };
    } catch (err) {
      console.error("EventSource failed", err);
      setIsRealtime(false);
    }

    pollInterval = setInterval(() => {
      if (!eventSource || eventSource.readyState !== EventSource.OPEN) {
        fetchPlayers();
      }
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchPlayers]);

  const fetchDecisions = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms/GLOBAL/decisions");
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.decisions)) {
        setDecisions(data.decisions);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchDecisions();
    const interval = setInterval(fetchDecisions, 3000);
    return () => clearInterval(interval);
  }, [fetchDecisions]);

  const handleResetRoom = useCallback(async () => {
    try {
      await fetch("/api/rooms/GLOBAL/reset", { method: "POST" });
      setPlayers([]);
      setManualSelectedId(null);
      fetchPlayers();
    } catch (err) {
      console.error("Error resetting room", err);
    }
  }, [fetchPlayers]);

  const handleClearAllServerRecords = useCallback(async () => {
    if (
      !window.confirm(
        "⚠️ TEM CERTEZA QUE DESEJA ZERAR TODOS OS REGISTROS DO SERVIDOR?\n\nIsso apagará permanentemente todos os registros de erros, acertos e conexões ativas dos alunos no servidor para iniciar uma nova avaliação do zero."
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/rooms/GLOBAL/clear-logs", { method: "POST" });
      if (res.ok) {
        setDecisions([]);
        setPlayers([]);
        setManualSelectedId(null);
        fetchPlayers();
        fetchDecisions();
        alert("✅ Todos os registros de erros, acertos e jogadores foram zerados no servidor com sucesso!");
      }
    } catch (err) {
      alert("Erro ao zerar registros no servidor.");
    }
  }, [fetchPlayers, fetchDecisions]);

  // Filter decisions log
  const baseFilteredDecisions = decisions.filter((d) => {
    const matchesFilter =
      decisionFilter === "all"
        ? true
        : decisionFilter === "correct"
        ? d.isCorrect
        : !d.isCorrect;

    const term = decisionSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      d.playerName.toLowerCase().includes(term) ||
      d.npcName.toLowerCase().includes(term) ||
      d.questionText.toLowerCase().includes(term) ||
      d.selectedOption.toLowerCase().includes(term) ||
      d.category.toLowerCase().includes(term);

    const matchesStudent =
      selectedStudentFilter === "all" ||
      d.playerId === selectedStudentFilter ||
      d.playerName === selectedStudentFilter;

    return matchesFilter && matchesSearch && matchesStudent;
  });

  const filteredDecisions = baseFilteredDecisions;

  // Group decisions by player
  const groupedByPlayer = decisions.reduce((acc, item) => {
    const key = item.playerId || item.playerName;
    if (!acc[key]) {
      acc[key] = {
        playerId: item.playerId,
        playerName: item.playerName,
        decisions: [],
      };
    }
    acc[key].decisions.push(item);
    return acc;
  }, {} as Record<string, { playerId: string; playerName: string; decisions: DecisionLog[] }>);

  const studentGroupsList = Object.values(groupedByPlayer)
    .map((group) => {
      const groupDecisions = group.decisions.filter((d) => {
        const matchesFilter =
          decisionFilter === "all"
            ? true
            : decisionFilter === "correct"
            ? d.isCorrect
            : !d.isCorrect;

        const term = decisionSearch.toLowerCase().trim();
        const matchesSearch =
          !term ||
          d.playerName.toLowerCase().includes(term) ||
          d.npcName.toLowerCase().includes(term) ||
          d.questionText.toLowerCase().includes(term) ||
          d.selectedOption.toLowerCase().includes(term) ||
          d.category.toLowerCase().includes(term);

        return matchesFilter && matchesSearch;
      });

      const total = groupDecisions.length;
      const correct = groupDecisions.filter((d) => d.isCorrect).length;
      const errors = groupDecisions.filter((d) => !d.isCorrect).length;
      const points = groupDecisions.reduce((acc, d) => acc + (d.pointsEarned || 0), 0);
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      return {
        key: group.playerId || group.playerName,
        playerId: group.playerId,
        playerName: group.playerName,
        decisions: groupDecisions,
        rawDecisions: group.decisions,
        total,
        correct,
        errors,
        points,
        accuracy,
      };
    })
    .filter((group) => {
      if (
        selectedStudentFilter !== "all" &&
        group.playerId !== selectedStudentFilter &&
        group.playerName !== selectedStudentFilter
      ) {
        return false;
      }
      return group.decisions.length > 0;
    });

  const correctCount = decisions.filter((d) => d.isCorrect).length;
  const errorCount = decisions.filter((d) => !d.isCorrect).length;

  // Real active online players filter
  const realOnlinePlayers = players.filter((p) => p.online);
  const activePool = useDemo ? demoList : realOnlinePlayers;

  // Determine top scorer (player with highest score > 0)
  const sortedByScore = [...activePool].sort(
    (a, b) => (b.score ?? b.prestige ?? 0) - (a.score ?? a.prestige ?? 0)
  );

  const topScorerCandidate = sortedByScore[0];
  const hasLeaderWithPoints = Boolean(
    topScorerCandidate && (topScorerCandidate.score > 0 || topScorerCandidate.prestige > 0)
  );

  // If professor picked someone manually, use them; otherwise auto-transmit top candidate
  let transmittedPlayer: PlayerData | null = null;
  if (manualSelectedId) {
    transmittedPlayer = activePool.find((p) => p.playerId === manualSelectedId) || null;
  } else if (hasLeaderWithPoints) {
    transmittedPlayer = topScorerCandidate;
  } else if (activePool.length > 0) {
    // If no score yet, transmit the first connected student
    transmittedPlayer = activePool[0];
  }

  // Non-transmitted remaining players stay on static cards
  const staticPlayers = activePool.filter((p) => p.playerId !== transmittedPlayer?.playerId);

  const onlineCount = activePool.filter((p) => p.online).length;

  if (!isAuthenticated) {
    const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === "prof231@2") {
        sessionStorage.setItem("prof_authenticated", "true");
        setIsAuthenticated(true);
        setPasswordError("");
      } else {
        setPasswordError("Senha incorreta! Digite a senha cadastrada para o Modo Professor.");
        try { playSound("error"); } catch {}
      }
    };

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#050c18] p-4 text-slate-100 font-sans select-none pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#0a182b] border-2 border-teal-500/80 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600" />
          
          <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/20 border-2 border-teal-400/50 flex items-center justify-center text-teal-300 shadow-lg">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide uppercase font-mono">
              MODO PROFESSOR
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 font-mono leading-relaxed">
              Digite a senha de acesso restrito para visualizar o Painel Docente e Monitoria em Tempo Real.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-teal-300 uppercase tracking-wider">
                Senha de Acesso:
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Digite a senha..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border-2 border-teal-500/50 text-white font-mono text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all placeholder:text-slate-600"
              />
            </div>

            {passwordError && (
              <p className="text-xs text-red-400 font-mono font-bold bg-red-950/60 border border-red-500/40 p-2.5 rounded-xl leading-snug">
                ⚠️ {passwordError}
              </p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  try { playSound("click"); } catch {}
                  navigate("/");
                }}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-mono font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                VOLTAR AO JOGO
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>ENTRAR</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      key="professor-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex flex-col bg-[#050c18] text-slate-100 font-sans overflow-hidden pointer-events-auto select-none"
    >
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#081325]/95 backdrop-blur-md border-b border-teal-500/30 shadow-xl flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sessionStorage.removeItem("prof_authenticated");
              try {
                playSound("click");
              } catch {}
              navigate("/");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-teal-300 text-xs font-mono font-bold transition-all border border-slate-700/80 hover:border-teal-500/50 cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">SAIR DO MODO PROFESSOR</span>
            <span className="sm:hidden">SAIR</span>
          </button>

          <div className="flex items-center gap-2.5 border-l border-slate-700/80 pl-3">
            <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-inner">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-white tracking-wider uppercase font-mono flex items-center gap-2">
                <span>PAINEL DOCENTE & MONITORIA</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold">
                  UFF · Gerência II
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono hidden md:block">
                Transmissão ao vivo do líder de pontuação no Hospital Antônio Pedro
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              setShowDecisionLogsModal(true);
              fetchDecisions();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-400/80 font-mono font-bold text-xs transition-all shadow-sm cursor-pointer active:scale-95 backdrop-blur-sm"
          >
            <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
            <span>ERROS & ACERTOS</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 text-[10px] font-extrabold border border-amber-500/30">
              {decisions.length}
            </span>
          </button>

          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              window.dispatchEvent(new CustomEvent("opennotebook"));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:border-teal-400/80 font-mono font-bold text-xs transition-all shadow-sm cursor-pointer active:scale-95 backdrop-blur-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            <span>CADERNO DE ERROS</span>
          </button>

          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              setShowClassReport((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:border-indigo-400/80 font-mono font-bold text-xs transition-all shadow-sm cursor-pointer active:scale-95 backdrop-blur-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>RELATÓRIO</span>
          </button>

          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              setUseDemo((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border backdrop-blur-sm shadow-sm active:scale-95 ${
              useDemo
                ? "bg-sky-500/20 text-sky-300 border-sky-400/50 hover:bg-sky-500/30"
                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{useDemo ? "Modo Simulado" : "Alunos Reais"}</span>
          </button>

          <button
            onClick={handleClearAllServerRecords}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-400/80 font-mono font-bold text-xs transition-all shadow-sm cursor-pointer active:scale-95 backdrop-blur-sm"
            title="Apaga permanentemente todos os registros e limpa a sala do servidor"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>ZERAR TUDO</span>
          </button>
        </div>
      </div>

      {/* Sub Stats Ribbon */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[#040c17]/90 backdrop-blur border-b border-slate-800/80 text-xs font-mono flex-wrap gap-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-md text-emerald-300 font-bold text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{onlineCount} {onlineCount === 1 ? "aluno real conectado" : "alunos reais conectados"}</span>
          </div>

          <button
            onClick={handleResetRoom}
            className="text-rose-300 hover:text-rose-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-rose-500/40 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Remove instâncias desconectadas ou duplicadas de alunos"
          >
            <RefreshCw className="w-3 h-3 text-rose-400" />
            <span>Limpar Fantasmas / Resetar Sala</span>
          </button>

          {manualSelectedId && (
            <button
              onClick={() => setManualSelectedId(null)}
              className="text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚙ Voltar p/ Transmissão Automática</span>
            </button>
          )}

          {useDemo && (
            <span className="text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md text-[11px] font-medium">
              ℹ️ Modo Simulação Ativo (Alunos Virtuais em Ação)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          {isRealtime ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Transmissão SSE Ativa</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase">
              <span>Polling Periódico</span>
            </div>
          )}

          {lastRefresh && <span>Atualizado: {lastRefresh.toLocaleTimeString()}</span>}

          <button
            onClick={() => fetchPlayers()}
            className="p-1 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#050c18] space-y-4">
        {/* Class Diagnostic Overlay */}
        {showClassReport && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-[#091a30] border-2 border-indigo-500/40 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-300 font-mono uppercase flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Diagnóstico Pedagógico da Turma — Gerência II</span>
              </h3>
              <button
                onClick={() => setShowClassReport(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Média de Pontos</span>
                <span className="text-base font-bold text-teal-400">
                  {Math.round(
                    activePool.reduce((acc, p) => acc + (p.score || p.prestige || 0), 0) /
                      (activePool.length || 1)
                  )}{" "}
                  pts
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Estresse Médio</span>
                <span className="text-base font-bold text-amber-400">
                  {Math.round(
                    activePool.reduce((acc, p) => acc + (p.stress || 0), 0) /
                      (activePool.length || 1)
                  )}
                  %
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Missões Concluídas</span>
                <span className="text-base font-bold text-indigo-300">
                  {activePool.reduce((acc, p) => acc + (p.completedMissions || 0), 0)} missões
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Aderência COFEN</span>
                <span className="text-base font-bold text-emerald-400">94% de precisão</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MAIN BROADCAST SCREEN (CENTRO INTEGRADO DE TRANSMISSÃO - HUAP)    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900/95 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
          {/* Command Center Precision Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              {transmittedPlayer ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>AO VIVO • 60 FPS</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {manualSelectedId
                        ? `FEED MANUAL: ${getDisplayNickname(transmittedPlayer.playerName).nick}`
                        : `1º LUGAR NO RANKING: ${getDisplayNickname(transmittedPlayer.playerName).nick}`}
                    </span>
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>MODO ESPERA • AGUARDANDO PRIMEIRA PONTUAÇÃO</span>
                </span>
              )}
            </div>

            {transmittedPlayer && (
              <div className="flex items-center gap-3 font-mono text-xs text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-md">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400 text-[11px]">PONTUAÇÃO ATUAL:</span>
                  <span className="font-bold text-amber-300 text-sm">
                    {transmittedPlayer.score ?? transmittedPlayer.prestige ?? 0} PTS
                  </span>
                </div>
                {manualSelectedId && (
                  <button
                    onClick={() => setManualSelectedId(null)}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Voltar para o Líder
                  </button>
                )}
              </div>
            )}
          </div>

          {/* MAIN STREAM CONTENT */}
          {transmittedPlayer ? (
            <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Left / Central Architectural CAD Visual Specator Feed (8 cols on PC) */}
              <div className="lg:col-span-8 flex flex-col gap-2.5">
                <LiveGameplayCanvas player={transmittedPlayer} />
                
                {/* Clean Sub-Canvas Telemetry Dock */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      Setor: <strong className="text-white">{transmittedPlayer.currentRoom || "Corredores"}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tempo de Turno: <strong className="text-white">{formatTime(transmittedPlayer.shiftTime)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 justify-start sm:justify-end text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>LATÊNCIA: 0.0s (SINAL DIRETO)</span>
                  </div>
                </div>
              </div>

              {/* Right Clinical Telemetry Terminal (4 cols on PC) */}
              <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4">
                <div>
                  {/* Student Medical Record Header */}
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3 gap-2">
                    {(() => {
                      const tNick = getDisplayNickname(transmittedPlayer.playerName);
                      return (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                              CLASSIFICAÇÃO: #1
                            </span>
                            {tNick.prefix && (
                              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                {tNick.prefix}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-400">
                              HUAP ENF
                            </span>
                          </div>
                          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                            {tNick.nick}
                          </h2>
                          <span className="text-xs font-mono text-cyan-400 block mt-0.5">
                            {transmittedPlayer.level || "Internato de Enfermagem"}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-mono">STATUS</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        EM AÇÃO
                      </span>
                    </div>
                  </div>

                  {/* Core Clinical Metrics */}
                  <div className="space-y-3.5 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] mb-1 uppercase tracking-wider">
                        Pontuação Clínica Acumulada
                      </span>
                      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-3">
                        <span className="text-xl font-bold text-amber-300 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          {transmittedPlayer.score ?? transmittedPlayer.prestige ?? 0} <span className="text-xs text-amber-400/80 font-normal">PTS</span>
                        </span>
                        <span className="text-xs text-slate-300 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                          🎯 {transmittedPlayer.completedMissions || 0} Casos Resolvidos
                        </span>
                      </div>
                    </div>

                    <StatBar
                      value={transmittedPlayer.energy ?? 100}
                      color="#10b981"
                      label="DISPOSIÇÃO / ENERGIA"
                      display={`${Math.round(transmittedPlayer.energy ?? 100)}%`}
                    />

                    <StatBar
                      value={transmittedPlayer.stress ?? 0}
                      color={(transmittedPlayer.stress ?? 0) > 70 ? "#ef4444" : "#f59e0b"}
                      label="NÍVEL DE ESTRESSE CLÍNICO"
                      display={`${Math.round(transmittedPlayer.stress ?? 0)}%`}
                    />
                  </div>
                </div>

                {/* Real-Time Clinical Activity Log */}
                <div className="border-t border-slate-800 pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Última Ação no Plantão
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">SINCRONIZADO</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                    {transmittedPlayer.lastActivity || "Explorando as dependências do HUAP"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* AWAITING TOP SCORE STATIC SCREEN BANNER */
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-slate-950/60 space-y-3.5 min-h-[260px]">
              <div className="p-3.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                Nenhum estudante pontuou ainda no plantão
              </h3>
              <p className="text-xs text-slate-300 font-sans max-w-md leading-relaxed">
                Todos os alunos iniciam com <strong>0 Pontos</strong> em tela estática. Assim que um estudante responder casos clínicos, tomar decisões de enfermagem ou resolver intercorrências, sua gameplay será <strong>transmitida automaticamente nesta tela</strong> sem qualquer atraso.
              </p>
              <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-3.5 py-1.5 rounded-full border border-cyan-800/40">
                💡 Você também pode clicar em "Assistir" em qualquer aluno no painel abaixo para fixar sua transmissão.
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* GRID OF STATIC SCREENS (TELAS ESTÁTICAS DOS DEMAIS ALUNOS)       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-400" />
              <span>Telas Estáticas dos Demais Jogadores ({staticPlayers.length})</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              Nicknames e pontuações em tempo real
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {staticPlayers.map((p, i) => {
                const color = CARD_COLORS[i % CARD_COLORS.length];
                const scoreVal = p.score ?? p.prestige ?? 0;
                const isOnline = Boolean(p.online);
                const pNickObj = getDisplayNickname(p.playerName);
                const pRank = sortedByScore.findIndex((sp) => sp.playerId === p.playerId) + 1;

                return (
                  <motion.div
                    key={p.playerId}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="relative flex flex-col border border-slate-800 hover:border-slate-700 overflow-hidden rounded-xl bg-slate-900/90 shadow-md transition-colors min-h-[220px]"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isOnline ? "bg-emerald-400" : "bg-slate-600"
                          }`}
                          title={isOnline ? "Conectado" : "Desconectado"}
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                          #{pRank || i + 2}
                        </span>
                        <span className="text-white font-semibold text-xs truncate" title={p.playerName}>
                          {pNickObj.nick}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {p.level || "Estudante"}
                      </span>
                    </div>

                    {/* Static Screen Snapshot Display */}
                    <div className="flex-1 flex flex-col justify-between p-3.5 bg-slate-950/50">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{p.currentRoom || "Corredor Central"}</span>
                        </div>
                        <div className="text-sm font-mono font-bold text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <span>{scoreVal} PTS</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed font-sans min-h-[46px] line-clamp-2 mb-3">
                        {p.lastActivity || "Em deslocamento pelo plantão..."}
                      </div>

                      {/* Mini Vitals Strip */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-2 border-t border-slate-800/60 mb-3">
                        <div>
                          <span className="text-slate-400 block text-[9px]">ENERGIA</span>
                          <span className="text-emerald-400 font-semibold">{Math.round(p.energy ?? 100)}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">ESTRESSE</span>
                          <span className={(p.stress ?? 0) > 70 ? "text-rose-400 font-semibold" : "text-amber-400 font-semibold"}>
                            {Math.round(p.stress ?? 0)}%
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => {
                          try {
                            playSound("click");
                          } catch {}
                          setManualSelectedId(p.playerId);
                        }}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-cyan-300 border border-slate-700/80 font-mono font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Transmitir Tela</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* RANKING TABLE SECTION (CLASSIFICAÇÃO GERAL DA TURMA)              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h2 className="text-xs sm:text-sm font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>CLASSIFICAÇÃO GERAL DA TURMA — AO VIVO ({activePool.length} ALUNOS)</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              Classificação dinâmica por pontuação acumulada
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Posição</th>
                  <th className="py-2.5 px-3">Nick / Nome do Aluno</th>
                  <th className="py-2.5 px-3">Nível</th>
                  <th className="py-2.5 px-3">Setor Atual</th>
                  <th className="py-2.5 px-3">Casos Resolvidos</th>
                  <th className="py-2.5 px-3 text-right">Pontuação</th>
                  <th className="py-2.5 px-3 text-center">Transmissão</th>
                </tr>
              </thead>
              <tbody>
                {sortedByScore.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 font-mono">
                      Nenhum aluno conectado no momento.
                    </td>
                  </tr>
                ) : (
                  sortedByScore.map((player, idx) => {
                    const { nick, prefix } = getDisplayNickname(player.playerName);
                    const isLeader = idx === 0;
                    const isTransmitted = player.playerId === transmittedPlayer?.playerId;

                    return (
                      <tr
                        key={player.playerId}
                        className={`border-b border-slate-800/60 hover:bg-slate-800/50 transition-colors ${
                          isLeader ? "bg-amber-500/10" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold">
                          {idx === 0 ? (
                            <span className="text-amber-300 font-extrabold flex items-center gap-1">
                              🥇 1º
                            </span>
                          ) : idx === 1 ? (
                            <span className="text-slate-200 flex items-center gap-1">🥈 2º</span>
                          ) : idx === 2 ? (
                            <span className="text-amber-600 flex items-center gap-1">🥉 3º</span>
                          ) : (
                            <span className="text-slate-400">{idx + 1}º</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{nick}</span>
                            {prefix && <span className="text-[10px] text-slate-400">({prefix})</span>}
                            {isLeader && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                                👑 LÍDER DO TURNO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{player.level || "Estudante"}</td>
                        <td className="py-2.5 px-3 text-cyan-300">{player.currentRoom || "Corredor"}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{player.completedMissions || 0}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-amber-300 text-sm">
                          {player.score ?? player.prestige ?? 0} PTS
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isTransmitted ? (
                            <span className="text-[10px] bg-rose-500/15 text-rose-300 px-2 py-1 rounded border border-rose-500/30 font-bold inline-block">
                              🔴 TRANSMITINDO
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                try {
                                  playSound("click");
                                } catch {}
                                setManualSelectedId(player.playerId);
                              }}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-1 rounded font-bold cursor-pointer transition-all active:scale-95"
                            >
                              Assistir
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: RELATÓRIO DE ERROS & ACERTOS DOS ALUNOS NO SERVIDOR       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDecisionLogsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-5xl h-[90vh] bg-[#071324] border-2 border-teal-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#0a1b30] border-b border-teal-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide flex items-center gap-2 uppercase">
                      RELATÓRIO DE ERROS & ACERTOS DA TURMA
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                        {decisions.length} Registros no Servidor
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Acompanhe em tempo real as escolhas, condutas clínicas e decisões gerenciais de cada aluno
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAllServerRecords}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs transition-all shadow cursor-pointer active:scale-95"
                    title="Zera permanentemente o banco de respostas e a lista de alunos no servidor"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ZERAR TODOS OS REGISTROS</span>
                  </button>

                  <button
                    onClick={() => setShowDecisionLogsModal(false)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* KPI Stats Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#050c18] border-b border-slate-800 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#09182c] border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">Total de Respostas</span>
                  <span className="text-lg font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-400" />
                    {decisions.length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#09182c] border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 uppercase block mb-1">Acertos (Condutas Corretas)</span>
                  <span className="text-lg font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {correctCount} ({decisions.length ? Math.round((correctCount / decisions.length) * 100) : 0}%)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#09182c] border border-rose-500/30">
                  <span className="text-[10px] text-rose-400 uppercase block mb-1">Erros / Inadequadas</span>
                  <span className="text-lg font-bold text-rose-300 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    {errorCount} ({decisions.length ? Math.round((errorCount / decisions.length) * 100) : 0}%)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#09182c] border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 uppercase block mb-1">Pontos Distribuídos</span>
                  <span className="text-lg font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {decisions.reduce((acc, d) => acc + (d.pointsEarned || 0), 0)} PTS
                  </span>
                </div>
              </div>

              {/* Filters, Mode Switcher & Search Bar */}
              <div className="flex flex-col bg-[#0a182b] border-b border-slate-800">
                {/* Upper bar: Search, Mode Switch & Correctness Filters */}
                <div className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={decisionSearch}
                        onChange={(e) => setDecisionSearch(e.target.value)}
                        placeholder="Buscar por aluno, NPC, questão..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#050c18] border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-[#050c18] p-1 rounded-xl border border-slate-700/80">
                      <button
                        onClick={() => {
                          try { playSound("click"); } catch {}
                          setViewGroupMode("grouped");
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                          viewGroupMode === "grouped"
                            ? "bg-teal-500 text-[#050c18] shadow"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Agrupado por Aluno</span>
                      </button>
                      <button
                        onClick={() => {
                          try { playSound("click"); } catch {}
                          setViewGroupMode("timeline");
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                          viewGroupMode === "timeline"
                            ? "bg-teal-500 text-[#050c18] shadow"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Lista Cronológica</span>
                      </button>
                    </div>

                    {/* Correctness Filter */}
                    <div className="flex items-center gap-1 border-l border-slate-700/80 pl-2">
                      <button
                        onClick={() => setDecisionFilter("all")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                          decisionFilter === "all"
                            ? "bg-slate-700 text-white font-bold"
                            : "bg-slate-800/80 text-slate-400 hover:bg-slate-700/60"
                        }`}
                      >
                        Todos ({decisions.length})
                      </button>
                      <button
                        onClick={() => setDecisionFilter("correct")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                          decisionFilter === "correct"
                            ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold"
                            : "bg-slate-800/80 text-slate-400 hover:bg-slate-700/60"
                        }`}
                      >
                        ✅ Acertos ({correctCount})
                      </button>
                      <button
                        onClick={() => setDecisionFilter("error")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                          decisionFilter === "error"
                            ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold"
                            : "bg-slate-800/80 text-slate-400 hover:bg-slate-700/60"
                        }`}
                      >
                        ❌ Erros ({errorCount})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lower bar: Student Quick Filter Chips */}
                <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto text-xs font-mono scrollbar-thin">
                  <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0 flex items-center gap-1">
                    <User className="w-3 h-3 text-teal-400" /> Alunos:
                  </span>
                  <button
                    onClick={() => setSelectedStudentFilter("all")}
                    className={`px-2.5 py-1 rounded-lg shrink-0 font-bold transition-all cursor-pointer ${
                      selectedStudentFilter === "all"
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm"
                        : "bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-white"
                    }`}
                  >
                    👥 Todos os Alunos
                  </button>

                  {Object.values(groupedByPlayer).map((group) => {
                    const nick = getDisplayNickname(group.playerName).nick;
                    const isSelected =
                      selectedStudentFilter === group.playerId || selectedStudentFilter === group.playerName;
                    const corr = group.decisions.filter((d) => d.isCorrect).length;
                    const errs = group.decisions.filter((d) => !d.isCorrect).length;

                    return (
                      <button
                        key={group.playerId || group.playerName}
                        onClick={() => {
                          try { playSound("click"); } catch {}
                          setSelectedStudentFilter(
                            isSelected ? "all" : group.playerId || group.playerName
                          );
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-teal-500/25 border-teal-400 text-teal-200 font-bold shadow-md"
                            : "bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <span className="font-extrabold">{nick}</span>
                        <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded text-slate-300">
                          {group.decisions.length}
                        </span>
                        {corr > 0 && <span className="text-[10px] text-emerald-400">+{corr}</span>}
                        {errs > 0 && <span className="text-[10px] text-rose-400">-{errs}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Decision Logs List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#050c18]">
                {viewGroupMode === "grouped" ? (
                  /* ── GROUPED BY STUDENT VIEW ── */
                  studentGroupsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 font-mono space-y-3 my-auto">
                      <ClipboardList className="w-12 h-12 text-slate-600 animate-pulse" />
                      <h3 className="text-sm font-bold uppercase text-slate-300">
                        Nenhum aluno ou resposta encontrada
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md">
                        {decisions.length === 0
                          ? "Nenhum aluno respondeu a questões até o momento. Quando os estudantes tomarem decisões nos diálogos, os registros aparecerão aqui agrupados por aluno."
                          : "Nenhum resultado atende aos filtros de busca e aluno selecionados."}
                      </p>
                    </div>
                  ) : (
                    studentGroupsList.map((group) => {
                      const groupKey = group.key;
                      const isCollapsed = Boolean(collapsedStudents[groupKey]);
                      const nickObj = getDisplayNickname(group.playerName);
                      const isOnline = activePool.some(
                        (p) => p.playerId === group.playerId || p.playerName === group.playerName
                      );

                      return (
                        <div
                          key={groupKey}
                          className="border-2 border-slate-700/80 rounded-2xl bg-[#081527] shadow-xl overflow-hidden transition-all"
                        >
                          {/* Student Header Bar */}
                          <div className="flex items-center justify-between p-3 sm:p-4 bg-[#0b1c33] border-b border-slate-700/80 flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 font-extrabold font-mono text-base shadow-inner">
                                {nickObj.nick.slice(0, 2).toUpperCase()}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm sm:text-base font-extrabold text-white font-mono tracking-wide">
                                    {nickObj.nick}
                                  </h3>
                                  {nickObj.prefix && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      ({nickObj.prefix})
                                    </span>
                                  )}
                                  <span
                                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                                      isOnline
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        : "bg-slate-800 text-slate-400 border-slate-700"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isOnline ? "bg-emerald-400 animate-ping" : "bg-slate-500"
                                      }`}
                                    />
                                    <span>{isOnline ? "CONECTADO" : "OFFLINE"}</span>
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-mono">
                                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold">
                                    {group.total} {group.total === 1 ? "Resposta" : "Respostas"}
                                  </span>
                                  <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                                    ✅ {group.correct} Acertos ({group.accuracy}%)
                                  </span>
                                  <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                                    ❌ {group.errors} Erros
                                  </span>
                                  <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                                    🏆 +{group.points} PTS
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 font-mono">
                              <button
                                onClick={() => {
                                  try { playSound("click"); } catch {}
                                  setManualSelectedId(group.playerId);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
                                title="Acompanhar gameplay deste aluno na transmissão principal"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Transmitir Aluno</span>
                              </button>

                              <button
                                onClick={() => {
                                  try { playSound("click"); } catch {}
                                  setCollapsedStudents((prev) => ({
                                    ...prev,
                                    [groupKey]: !prev[groupKey],
                                  }));
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
                                title={isCollapsed ? "Expandir respostas" : "Ocultar respostas"}
                              >
                                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {/* Student Decisions Content */}
                          {!isCollapsed && (
                            <div className="p-3 sm:p-4 space-y-3 bg-[#050c18]">
                              {group.decisions.map((item, idx) => (
                                <div
                                  key={item.id}
                                  className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                                    item.isCorrect
                                      ? "bg-[#06191d] border-emerald-500/40 shadow-sm"
                                      : "bg-[#180d16] border-rose-500/40 shadow-sm"
                                  }`}
                                >
                                  {/* Item Header */}
                                  <div className="flex items-center justify-between flex-wrap gap-2 font-mono">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-extrabold text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/30">
                                        Questão #{idx + 1}
                                      </span>
                                      <span className="text-xs font-bold text-slate-200">
                                        🗣️ NPC: <span className="text-teal-300">{item.npcName}</span>
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 font-semibold">
                                        {item.category}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(item.timestamp).toLocaleTimeString("pt-BR")}
                                      </span>
                                      {item.isCorrect ? (
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-bold flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                          ACERTO (+{item.pointsEarned} PTS)
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-xs font-bold flex items-center gap-1">
                                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                          ERRO / INADEQUADO
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Scenario / Question */}
                                  <div className="p-2.5 rounded-lg bg-[#081220] border border-slate-800 text-xs text-slate-200">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                                      Cenário / Pergunta Apresentada
                                    </span>
                                    <p className="leading-relaxed">{item.questionText}</p>
                                  </div>

                                  {/* Choice & Rationale */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    <div
                                      className={`p-2.5 rounded-lg border ${
                                        item.isCorrect
                                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                                          : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                                      }`}
                                    >
                                      <span className="text-[10px] font-bold uppercase block mb-1 flex items-center gap-1">
                                        {item.isCorrect ? (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Opção Escolhida (Correta)
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="w-3.5 h-3.5 text-rose-400" /> Opção Escolhida pelo Aluno
                                          </>
                                        )}
                                      </span>
                                      <p className="font-semibold">{item.selectedOption}</p>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                        Feedback & Raciocínio Pedagógico
                                      </span>
                                      <p className="leading-relaxed text-[11px]">{item.feedback}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )
                ) : (
                  /* ── TIMELINE CHRONOLOGICAL VIEW ── */
                  filteredDecisions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 font-mono space-y-3 my-auto">
                      <ClipboardList className="w-12 h-12 text-slate-600 animate-pulse" />
                      <h3 className="text-sm font-bold uppercase text-slate-300">
                        Nenhum registro encontrado
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md">
                        {decisions.length === 0
                          ? "Nenhum aluno respondeu a questões até o momento."
                          : "Nenhum resultado atende ao filtro de busca atual."}
                      </p>
                    </div>
                  ) : (
                    filteredDecisions.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                          item.isCorrect
                            ? "bg-[#06191d] border-emerald-500/40 shadow-sm"
                            : "bg-[#180d16] border-rose-500/40 shadow-sm"
                        }`}
                      >
                        {/* Top Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap font-mono">
                            <span className="text-xs font-bold text-white px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                              👤 {getDisplayNickname(item.playerName).nick}
                            </span>
                            <span className="text-xs font-bold text-teal-300">
                              🗣️ {item.npcName}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                              {item.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.timestamp).toLocaleTimeString("pt-BR")}
                            </span>
                            {item.isCorrect ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ACERTO (+{item.pointsEarned} PTS)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-xs font-bold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                ERRO / INADEQUADO
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Question Text */}
                        <div className="p-3 rounded-lg bg-[#081220] border border-slate-800/80 text-xs text-slate-200">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Cenário / Pergunta Apresentada
                          </span>
                          <p className="leading-relaxed">{item.questionText}</p>
                        </div>

                        {/* Choice & Rationale Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div
                            className={`p-3 rounded-lg border ${
                              item.isCorrect
                                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                                : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                              {item.isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Opção Escolhida (Correta)
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> Opção Escolhida pelo Aluno
                                </>
                              )}
                            </span>
                            <p className="font-semibold">{item.selectedOption}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Feedback & Raciocínio Pedagógico
                            </span>
                            <p className="leading-relaxed text-[11px]">{item.feedback}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
