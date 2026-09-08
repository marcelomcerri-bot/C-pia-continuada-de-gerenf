import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Check, X, Sparkles } from "lucide-react";
import { PlayerProfile } from "../game/data/gameData";
import { SKIN_TONE_PRESETS } from "../game/utils/save";
import {
  renderPlayerPreviewOnCanvas,
  renderPlayerPortraitOnCanvas,
} from "../game/utils/renderPlayerSprite";
import { playSound } from "../game/utils/audio";

interface CharacterCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (profile: PlayerProfile) => void;
}

export function CharacterCreationModal({
  isOpen,
  onClose,
  onConfirm,
}: CharacterCreationModalProps) {
  const [name, setName] = useState("Enf. Alex");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [skinTone, setSkinTone] = useState("#f5c5a3");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const femaleBtnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maleBtnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Helper to ensure mobile keyboard is dismissed when tapping buttons or options
  const dismissKeyboard = () => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // Ensure keyboard is blurred when modal opens
  useEffect(() => {
    if (isOpen) {
      dismissKeyboard();
    }
  }, [isOpen]);

  // Render exact full pixel-art sprite on preview canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    renderPlayerPreviewOnCanvas(canvasRef.current, {
      name,
      gender,
      skinTone,
    });
  }, [isOpen, name, gender, skinTone]);

  // Render mini gender portrait buttons
  useEffect(() => {
    if (!isOpen) return;

    if (femaleBtnCanvasRef.current) {
      renderPlayerPortraitOnCanvas(
        femaleBtnCanvasRef.current,
        "female",
        skinTone
      );
    }

    if (maleBtnCanvasRef.current) {
      renderPlayerPortraitOnCanvas(
        maleBtnCanvasRef.current,
        "male",
        skinTone
      );
    }
  }, [isOpen, skinTone]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    dismissKeyboard();
    const finalName = name.trim() || (gender === "female" ? "Enf. Ana" : "Enf. Carlos");
    try { playSound("click"); } catch {}
    onConfirm({
      name: finalName,
      gender,
      skinTone,
    });
  };

  const handleGenderChange = (g: "female" | "male") => {
    dismissKeyboard();
    try { playSound("click"); } catch {}
    setGender(g);
    if (name === "Enf. Alex" || name === "Enf. Ana" || name === "Enf. Carlos") {
      setName(g === "female" ? "Enf. Ana" : "Enf. Carlos");
    }
  };

  const handleSkinToneChange = (hex: string) => {
    dismissKeyboard();
    try { playSound("click"); } catch {}
    setSkinTone(hex);
  };

  const displayName = name.trim() || (gender === "female" ? "Enf. Ana" : "Enf. Carlos");

  return (
    <AnimatePresence>
      <div
        onMouseDown={(e) => {
          if (e.target !== inputRef.current) {
            e.preventDefault();
            dismissKeyboard();
          }
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.target !== inputRef.current) {
            dismissKeyboard();
          }
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          if (e.target !== inputRef.current) {
            dismissKeyboard();
          }
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 pointer-events-auto touch-manipulation overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 320 }}
          className="bg-slate-900 border-2 border-teal-500/80 rounded-2xl w-[520px] max-w-full my-auto shadow-[0_0_50px_rgba(26,188,156,0.3)] flex flex-col overflow-hidden text-slate-100"
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950/90 to-slate-900 px-4 py-2.5 sm:px-5 sm:py-3 border-b border-teal-500/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold tracking-wider font-sans text-teal-300 uppercase">
                CRIAR PERSONAGEM
              </h2>
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { dismissKeyboard(); try { playSound("click"); } catch {}; onClose(); }}
              onPointerDown={(e) => { e.stopPropagation(); dismissKeyboard(); onClose(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer touch-manipulation"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-3 sm:p-5 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto">
            {/* Grid layout for landscape/desktop or stacked for mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
              {/* Left Column: Character Preview Canvas & Tag */}
              <div className="sm:col-span-5 bg-slate-950/90 border-2 border-teal-500/40 rounded-xl p-3 flex flex-col items-center justify-center gap-2 shadow-inner relative overflow-hidden min-h-[140px]">
                <div className="relative shrink-0 flex items-center justify-center bg-slate-900 rounded-lg p-1 border border-teal-500/50 shadow-md">
                  <canvas
                    ref={canvasRef}
                    width={110}
                    height={115}
                    className="rounded border border-slate-700/60 shadow bg-slate-950"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-teal-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow">
                    IN-GAME
                  </div>
                </div>

                <div className="w-full flex flex-col gap-1 items-center">
                  <div className="w-full flex items-center justify-center gap-1.5 bg-teal-950/80 border border-teal-500/50 px-2.5 py-1 rounded-lg shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="text-xs font-extrabold font-sans text-teal-200 truncate max-w-[120px]">
                      {displayName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {gender === "female" ? "Enfermeira (HUAP)" : "Enfermeiro (HUAP)"}
                  </span>
                </div>
              </div>

              {/* Right Column: Nickname, Gender, Skin Tone */}
              <div className="sm:col-span-7 flex flex-col gap-3 justify-between">
                {/* 1. NICKNAME */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-teal-300 uppercase tracking-wider font-sans select-none">
                    NOME / NICKNAME:
                  </span>
                  <div className="relative flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={name}
                      maxLength={22}
                      onChange={(e) => setName(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      placeholder="Ex: Enf. Carlos ou Enf. Ana"
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-teal-400 text-teal-100 font-sans font-bold text-xs sm:text-sm px-3 py-2 rounded-xl outline-none transition-colors placeholder:text-slate-600 pr-8 shadow-inner touch-manipulation"
                    />
                    {name.length > 0 && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { dismissKeyboard(); setName(""); }}
                        onPointerDown={(e) => { e.stopPropagation(); dismissKeyboard(); setName(""); }}
                        className="absolute right-2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer touch-manipulation"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sugestões rápidas de nome */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {["Enf. Ana", "Enf. Carlos", "Enf. Mariana", "Enf. Lucas"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { dismissKeyboard(); try { playSound("click"); } catch {}; setName(preset); }}
                        onPointerDown={(e) => { e.stopPropagation(); dismissKeyboard(); try { playSound("click"); } catch {}; setName(preset); }}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800/90 active:bg-slate-700 hover:bg-slate-700 text-teal-300 border border-slate-700 transition-colors cursor-pointer touch-manipulation"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. SELEÇÃO DE GÊNERO */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-teal-300 uppercase tracking-wider font-sans select-none">
                    GÊNERO:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Mulher */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleGenderChange("female")}
                      onPointerDown={(e) => { e.stopPropagation(); handleGenderChange("female"); }}
                      className={`flex items-center justify-center p-1.5 rounded-xl border-2 transition-all cursor-pointer touch-manipulation ${
                        gender === "female"
                          ? "bg-teal-950/80 border-teal-400 shadow-[0_0_12px_rgba(26,188,156,0.35)] scale-[1.02]"
                          : "bg-slate-800/40 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-slate-950 border border-teal-400/50 flex items-center justify-center relative overflow-hidden shadow shrink-0">
                        <canvas
                          ref={femaleBtnCanvasRef}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover rounded-full pointer-events-none"
                        />
                        {gender === "female" && (
                          <div className="absolute top-0 right-0 bg-teal-400 text-slate-950 p-0.5 rounded-bl">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Homem */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleGenderChange("male")}
                      onPointerDown={(e) => { e.stopPropagation(); handleGenderChange("male"); }}
                      className={`flex items-center justify-center p-1.5 rounded-xl border-2 transition-all cursor-pointer touch-manipulation ${
                        gender === "male"
                          ? "bg-teal-950/80 border-teal-400 shadow-[0_0_12px_rgba(26,188,156,0.35)] scale-[1.02]"
                          : "bg-slate-800/40 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-slate-950 border border-teal-400/50 flex items-center justify-center relative overflow-hidden shadow shrink-0">
                        <canvas
                          ref={maleBtnCanvasRef}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover rounded-full pointer-events-none"
                        />
                        {gender === "male" && (
                          <div className="absolute top-0 right-0 bg-teal-400 text-slate-950 p-0.5 rounded-bl">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. TOM DE PELE */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-teal-300 uppercase tracking-wider font-sans select-none">
                    TOM DE PELE:
                  </span>
                  <div className="grid grid-cols-8 gap-1">
                    {SKIN_TONE_PRESETS.map((preset) => {
                      const isSelected = skinTone === preset.hex;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSkinToneChange(preset.hex)}
                          onPointerDown={(e) => { e.stopPropagation(); handleSkinToneChange(preset.hex); }}
                          className={`h-8 sm:h-9 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer touch-manipulation relative ${
                            isSelected
                              ? "border-teal-400 scale-105 shadow-[0_0_10px_rgba(26,188,156,0.5)] z-10"
                              : "border-slate-700/80 hover:border-slate-500 opacity-80 hover:opacity-100 active:opacity-100"
                          }`}
                          style={{ backgroundColor: preset.hex }}
                        >
                          {isSelected && (
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-950/80 text-teal-300 flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { dismissKeyboard(); try { playSound("click"); } catch {}; onClose(); }}
                onPointerDown={(e) => { e.stopPropagation(); dismissKeyboard(); try { playSound("click"); } catch {}; onClose(); }}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-sans font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-600 transition-all cursor-pointer touch-manipulation min-h-[40px]"
              >
                VOLTAR
              </button>
              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => { e.stopPropagation(); handleSubmit(); }}
                className="flex-1 py-2.5 px-3 bg-[#1abc9c] hover:bg-[#1dd2af] active:bg-[#16a085] text-slate-950 font-sans font-extrabold text-xs uppercase tracking-wider rounded-xl border-2 border-white/80 shadow-[0_3px_0_#0e6252] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer touch-manipulation min-h-[40px]"
              >
                INICIAR JOGO ▶
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
