import { useState, useEffect } from "react";
import { Heart, Users, Activity, Building2 } from "lucide-react";
import { loadGame } from "../game/utils/save";
import type { GameState } from "../game/data/gameData";

export function HospitalGlobalHUD() {
  const [gameState, setGameState] = useState<GameState>(() => loadGame());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ state?: GameState }>).detail;
      if (detail?.state) {
        setGameState(detail.state);
      } else {
        setGameState(loadGame());
      }
    };

    window.addEventListener("globalhudupdate", handleUpdate);
    const interval = setInterval(() => {
      setGameState(loadGame());
    }, 3000);

    return () => {
      window.removeEventListener("globalhudupdate", handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const completedMissionsCount = gameState.completedMissions?.length || 0;
  const prestige = gameState.prestige || 0;
  const stress = gameState.stress || 0;
  const energy = gameState.energy || 100;

  const rels = gameState.relationships || {};
  const relValues: number[] = Object.values(rels);
  const avgRel = relValues.length > 0 ? relValues.reduce((a: number, b: number) => a + b, 0) / relValues.length : 50;

  const patientSatisfaction = Math.min(
    100,
    Math.max(30, Math.round(72 + completedMissionsCount * 3.5 + (prestige / 35) - (stress * 0.15)))
  );

  const teamEfficiency = Math.min(
    100,
    Math.max(25, Math.round(68 + (avgRel * 0.35) + (energy > 40 ? 8 : 0) - (stress * 0.18)))
  );

  const avgOverall = (patientSatisfaction + teamEfficiency) / 2;
  let statusLabel = "Operacional";
  let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

  if (avgOverall >= 85) {
    statusLabel = "Excelente";
    statusColor = "text-teal-300 bg-teal-500/15 border-teal-400/40";
  } else if (avgOverall >= 70) {
    statusLabel = "Estável";
    statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  } else if (avgOverall >= 50) {
    statusLabel = "Atenção";
    statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
  } else {
    statusLabel = "Crítico";
    statusColor = "text-rose-400 bg-rose-500/10 border-rose-500/30";
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[90] pointer-events-none select-none max-w-[95vw] w-auto">
      <div className="bg-slate-900/90 backdrop-blur-md border border-teal-500/30 rounded-xl px-3.5 py-1.5 shadow-xl shadow-black/40 flex items-center gap-3 sm:gap-5 text-slate-100">
        
        {/* Hospital Brand */}
        <div className="flex items-center gap-2 border-r border-slate-700/60 pr-2.5 sm:pr-3.5">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400 leading-tight">
              Gestão Hospitalar
            </span>
            <span className="text-[11px] font-bold text-teal-300 leading-tight">
              Indicadores Globais
            </span>
          </div>
        </div>

        {/* Patient Satisfaction */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Heart className="w-3 h-3 fill-rose-500/30" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-tight">
                Satisfação dos Pacientes
              </span>
              <span className="text-[11px] font-black text-rose-300 font-mono">
                {patientSatisfaction}%
              </span>
            </div>
            <div className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${patientSatisfaction}%` }}
              />
            </div>
          </div>
        </div>

        {/* Team Efficiency */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Users className="w-3 h-3" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-tight">
                Eficiência da Equipe
              </span>
              <span className="text-[11px] font-black text-cyan-300 font-mono">
                {teamEfficiency}%
              </span>
            </div>
            <div className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${teamEfficiency}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold tracking-wide uppercase ${statusColor}`}>
          <Activity className="w-3 h-3 animate-pulse" />
          <span>{statusLabel}</span>
        </div>

      </div>
    </div>
  );
}
