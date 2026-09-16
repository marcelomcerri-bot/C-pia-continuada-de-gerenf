import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  Search,
  Trash2,
  Check,
  Bookmark,
  CheckSquare,
  Square,
  GraduationCap
} from "lucide-react";
import {
  getErrorEntries,
  toggleEntryReviewed,
  clearErrorLog,
  PREPOPULATED_DOUBTS,
  type ErrorLogEntry,
} from "../game/utils/errorLog";
import { playSound } from "../game/utils/audio";

interface ErrorNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 10;

const ErrorItemCard = React.memo(function ErrorItemCard({
  item,
  onToggleReviewed,
}: {
  item: ErrorLogEntry;
  onToggleReviewed: (id: string) => void;
}) {
  return (
    <div
      className={`p-4 sm:p-5 rounded-xl border transition-all space-y-3 ${
        item.reviewed
          ? "bg-[#0a1523]/70 border-slate-800/80 opacity-75"
          : "bg-[#0f1d30] border-slate-700/80 shadow-md"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {item.sourceTitle}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
            {item.category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
          <button
            onClick={() => {
              onToggleReviewed(item.id);
              try { playSound("click"); } catch {}
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              item.reviewed
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {item.reviewed ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Entendido</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Marcar como Entendido</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scenario question */}
      <div className="p-3 rounded-lg bg-[#081220] border border-slate-800/90 text-xs text-slate-200">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
          Caso / Situação Apresentada
        </span>
        <p className="leading-relaxed">{item.questionText}</p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Incorrect choice */}
        <div className="p-3 rounded-r-lg border-l-2 border-red-500 bg-red-950/20 border-y border-r border-red-500/20">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <span>❌</span> Sua Conduta (Incorreta)
          </span>
          <p className="text-xs text-red-200 leading-snug">{item.wrongAnswerText}</p>
        </div>

        {/* Correct choice */}
        <div className="p-3 rounded-r-lg border-l-2 border-emerald-500 bg-emerald-950/20 border-y border-r border-emerald-500/20">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <span>✅</span> Conduta Correta Recomendada
          </span>
          <p className="text-xs text-emerald-200 leading-snug">{item.correctAnswerText}</p>
        </div>
      </div>

      {/* Pedagogical Explanation */}
      <div className="p-3.5 rounded-r-lg border-l-2 border-teal-400 bg-teal-950/20 border-y border-r border-teal-500/20 space-y-1.5">
        <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-teal-300" />
          Justificativa & Fundamentação Teórica
        </span>
        <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed whitespace-pre-line">
          {item.explanation}
        </p>
        <div className="text-xs font-mono text-teal-300/90 flex items-center gap-1.5 pt-1.5 border-t border-teal-800/40">
          <BookOpen className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>Referência UFF:</span>
          <span className="font-semibold">{item.pedagogyRef}</span>
        </div>
      </div>
    </div>
  );
});

export function ErrorNotebookModal({ isOpen, onClose }: ErrorNotebookModalProps) {
  const [activeTab, setActiveTab] = useState<"errors" | "doubts" | "references">("errors");
  const [entries, setEntries] = useState<ErrorLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    if (isOpen) {
      setEntries(getErrorEntries());
      setVisibleCount(ITEMS_PER_PAGE);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = (e: CustomEvent<ErrorLogEntry[]>) => {
      if (e.detail) {
        setEntries(e.detail);
      } else {
        setEntries(getErrorEntries());
      }
    };
    window.addEventListener("errorlogupdated", handleUpdate as EventListener);
    return () => {
      window.removeEventListener("errorlogupdated", handleUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, categoryFilter, activeTab]);

  const handleToggleReviewed = useCallback((id: string) => {
    toggleEntryReviewed(id);
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.category)));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return entries.filter((item) => {
      const matchesSearch =
        !term ||
        item.sourceTitle.toLowerCase().includes(term) ||
        item.questionText.toLowerCase().includes(term) ||
        item.wrongAnswerText.toLowerCase().includes(term) ||
        item.explanation.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [entries, searchTerm, categoryFilter]);

  const displayedEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount]);

  const filteredDoubts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return PREPOPULATED_DOUBTS;
    return PREPOPULATED_DOUBTS.filter((d) => {
      return (
        d.title.toLowerCase().includes(term) ||
        d.question.toLowerCase().includes(term) ||
        d.answer.toLowerCase().includes(term) ||
        d.tags.some((t) => t.toLowerCase().includes(term))
      );
    });
  }, [searchTerm]);

  const reviewedCount = useMemo(() => {
    return entries.filter((e) => e.reviewed).length;
  }, [entries]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={() => {
          try { playSound("click"); } catch {}
          onClose();
        }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 pointer-events-auto select-none cursor-pointer"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="relative w-full max-w-4xl bg-[#0b1422] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden cursor-default"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1a2c] border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                  <span>Caderno de Erros & Aprendizado</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    Gerência II · UFF
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Mediação pedagógica fundamentada em Kurcgant (2016) e Marquis & Huston (2015)
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
              className="w-12 h-12 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
              aria-label="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-[#09111c] border-b border-slate-800 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  try { playSound("hover"); } catch {}
                  setActiveTab("errors");
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "errors"
                    ? "bg-teal-400 text-slate-950 shadow-sm"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Registros de Erros</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "errors" ? "bg-slate-950/20 text-slate-950" : "bg-teal-500/20 text-teal-300"
                  }`}
                >
                  {entries.length}
                </span>
              </button>

              <button
                onClick={() => {
                  try { playSound("hover"); } catch {}
                  setActiveTab("doubts");
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "doubts"
                    ? "bg-teal-400 text-slate-950 shadow-sm"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Banco de Dúvidas</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "doubts" ? "bg-slate-950/20 text-slate-950" : "bg-indigo-500/20 text-indigo-300"
                  }`}
                >
                  {PREPOPULATED_DOUBTS.length}
                </span>
              </button>

              <button
                onClick={() => {
                  try { playSound("hover"); } catch {}
                  setActiveTab("references");
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "references"
                    ? "bg-teal-400 text-slate-950 shadow-sm"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Referências (Kurcgant)</span>
              </button>
            </div>

            {/* Quick stats badge */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{reviewedCount} de {entries.length} revisados</span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          {(activeTab === "errors" || activeTab === "doubts") && (
            <div className="p-3 px-5 bg-[#0a121e] border-b border-slate-800 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "errors"
                      ? "Buscar por tema, cenário ou justificativa..."
                      : "Buscar dúvidas frequentes..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0e1a2b] border border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-400"
                />
              </div>

              {activeTab === "errors" && categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#0e1a2b] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-400 cursor-pointer"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}

              {activeTab === "errors" && entries.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Deseja realmente limpar todo o caderno de erros local?")) {
                      clearErrorLog();
                      setEntries([]);
                    }
                  }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Limpar Caderno de Erros"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Main Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0b1422]">
            {/* TAB 1: REGISTROS DE ERROS */}
            {activeTab === "errors" && (
              <>
                {filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200 mb-1">
                      {entries.length === 0 ? "Nenhum erro registrado ainda!" : "Nenhum resultado encontrado"}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md">
                      {entries.length === 0
                        ? "Conforme você toma decisões nas situações práticas do hospital, as escolhas incorretas serão salvas aqui com as justificativas fundamentadas em Kurcgant e Marquis & Huston."
                        : "Tente alterar os termos de busca ou filtros de categoria."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {displayedEntries.map((item) => (
                      <ErrorItemCard
                        key={item.id}
                        item={item}
                        onToggleReviewed={handleToggleReviewed}
                      />
                    ))}

                    {filteredEntries.length > visibleCount && (
                      <div className="flex justify-center pt-2 pb-2">
                        <button
                          onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                          className="px-5 py-2 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <span>Carregar Mais Registros ({displayedEntries.length} de {filteredEntries.length})</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: BANCO DE DÚVIDAS */}
            {activeTab === "doubts" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-2.5 mb-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                  <p>
                    <strong>Dúvidas Recorrentes da Monitoria:</strong> Tópicos mais frequentes da disciplina com respostas orientadas pela literatura oficial.
                  </p>
                </div>

                {filteredDoubts.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#0f1d30] border border-slate-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-teal-300">{item.title}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {item.category}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-200">❓ {item.question}</p>

                    <div className="p-3 rounded-lg bg-[#081220] border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {item.answer}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                      <span className="text-teal-400">📖 Referência: {item.pedagogyRef}</span>
                      <div className="flex gap-1">
                        {item.tags.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: REFERÊNCIAS BIBLIOGRÁFICAS */}
            {activeTab === "references" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80">
                  <h3 className="text-xs sm:text-sm font-bold text-teal-300 mb-1 flex items-center gap-2">
                    <Bookmark className="w-4 h-4" /> Referenciais Teóricos de Gerência de Enfermagem II
                  </h3>
                  <p className="text-xs text-slate-300">
                    Síntese dos conceitos fundamentais utilizados nas situações do jogo e nos casos práticos da monitoria.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kurcgant */}
                  <div className="p-4 rounded-xl bg-[#0f1d30] border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-teal-300">Kurcgant, Paulina (2016)</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        Referência Principal UFF
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Gerenciamento em Enfermagem:</strong> Administração de serviços com foco em dimensionamento de pessoal (COFEN 543/2017), gestão de recursos materiais, decisão ética, avaliação de desempenho e ferramentas da qualidade (PDCA, indicadores).
                    </p>
                    <ul className="text-xs text-slate-400 space-y-1 pt-1 list-disc list-inside">
                      <li>Cap. 6: Gestão de Recursos Materiais</li>
                      <li>Cap. 7: Dimensionamento de Pessoal</li>
                      <li>Cap. 9: Liderança e Gestão de Pessoas</li>
                      <li>Cap. 11: Gestão da Qualidade e Segurança</li>
                      <li>Cap. 12: Ética na Gestão</li>
                    </ul>
                  </div>

                  {/* Marquis & Huston */}
                  <div className="p-4 rounded-xl bg-[#0f1d30] border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-indigo-300">Marquis & Huston (2015)</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        Liderança & Governança
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Administração e Liderança em Enfermagem:</strong> Foco em teorias da liderança situacional, processo de mudança, resolução de conflitos, comunicação assertiva (SBAR), gerenciamento do estresse e tomadas de decisão gerenciais.
                    </p>
                    <ul className="text-xs text-slate-400 space-y-1 pt-1 list-disc list-inside">
                      <li>Cap. 1 & 18: Estilos de Liderança</li>
                      <li>Cap. 8: Resolução de Problemas</li>
                      <li>Cap. 10: Gerenciamento do Conflito</li>
                      <li>Cap. 19: Comunicação Organizacional</li>
                      <li>Cap. 23: Gestão do Estresse</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer controls */}
          <div className="p-3 px-5 bg-[#0e1a2c] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>💾 Histórico salvo localmente</span>
            <button
              onClick={() => {
                try { playSound("click"); } catch {}
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-teal-400 hover:bg-teal-300 active:bg-teal-500 text-slate-950 font-bold transition-colors cursor-pointer shadow-sm"
            >
              Concluir Leitura
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
