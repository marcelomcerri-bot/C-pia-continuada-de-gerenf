export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  sourceTitle: string;
  category: string;
  questionText: string;
  wrongAnswerText: string;
  correctAnswerText: string;
  explanation: string;
  pedagogyRef: string;
  reviewed?: boolean;
}

export interface DoubtBankItem {
  id: string;
  title: string;
  category: string;
  question: string;
  answer: string;
  pedagogyRef: string;
  tags: string[];
}

const STORAGE_KEY = 'gestorEnf_caderno_erros_v1';

export function getErrorEntries(): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ErrorLogEntry[];
  } catch (_) {
    return [];
  }
}

export function saveErrorEntries(entries: ErrorLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    // Dispatch custom event for reactive UI updates across all components
    window.dispatchEvent(new CustomEvent('errorlogupdated', { detail: entries }));
  } catch (_) {}
}

export function addErrorEntry(entryData: Omit<ErrorLogEntry, 'id' | 'timestamp'>): ErrorLogEntry {
  const current = getErrorEntries();
  const now = new Date();
  const timestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  
  // Avoid exact duplicates if student clicks same wrong answer twice in a row
  const isDuplicate = current.some(
    e => e.sourceTitle === entryData.sourceTitle && e.wrongAnswerText === entryData.wrongAnswerText
  );

  if (isDuplicate) {
    const existing = current.find(
      e => e.sourceTitle === entryData.sourceTitle && e.wrongAnswerText === entryData.wrongAnswerText
    )!;
    return existing;
  }

  const newEntry: ErrorLogEntry = {
    ...entryData,
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    reviewed: false,
  };

  const updated = [newEntry, ...current];
  saveErrorEntries(updated);
  return newEntry;
}

export function toggleEntryReviewed(id: string): void {
  const current = getErrorEntries();
  const updated = current.map(e => e.id === id ? { ...e, reviewed: !e.reviewed } : e);
  saveErrorEntries(updated);
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('errorlogupdated', { detail: [] }));
  } catch (_) {}
}

// ─── BANCO DE DÚVIDAS FREQUENTES DA DISCIPLINA ───────────────────────────────
export const PREPOPULATED_DOUBTS: DoubtBankItem[] = [
  {
    id: 'd1',
    title: 'Dimensionamento de Pessoal de Enfermagem (COFEN 543/2017)',
    category: 'Dimensionamento & Gestão',
    question: 'Como calcular o dimensionamento de pessoal de enfermagem no hospital?',
    answer: 'O dimensionamento baseia-se no Sistema de Classificação de Pacientes (SCP) para identificar as horas de enfermagem necessárias por leito (Mínimo: 4h, Intermediário: 6h, Alta Dependência/Semi-Intensivo: 10h, Intensivo: 18h). Adiciona-se o Índice de Segurança Técnica (IST) de no mínimo 15% para cobrir folgas, férias e absenteísmo.',
    pedagogyRef: 'Kurcgant, P. (2016). Gerenciamento em Enfermagem, cap. 7; Resolução COFEN nº 543/2017.',
    tags: ['Dimensionamento', 'COFEN 543/2017', 'Quadro de Pessoal'],
  },
  {
    id: 'd2',
    title: 'Estilos de Liderança na Enfermagem (Liderança Situacional)',
    category: 'Liderança & Pessoas',
    question: 'Quando utilizar Liderança Autocrática, Democrática ou Situacional?',
    answer: 'Segundo Marquis & Huston, a Liderança Situacional é ideal porque adapta o comportamento do líder ao nível de maturidade da equipe e à urgência. Em situações de emergência (ex: Código Azul), adota-se postura DIRETIVA (autocrática). Em planejamento de escalas e melhorias de fluxo, adota-se postura PARTICIPATIVA/DEMOCRÁTICA.',
    pedagogyRef: 'Marquis, B. L., & Huston, C. J. (2015). Administração e Liderança em Enfermagem, cap. 1 & 18.',
    tags: ['Liderança', 'Marquis & Huston', 'Gestão de Equipes'],
  },
  {
    id: 'd3',
    title: 'Resolução de Conflitos na Equipe Multiprofissional',
    category: 'Gestão de Conflitos',
    question: 'Qual a conduta gerencial correta diante de conflito de rotinas entre enfermagem e medicina?',
    answer: 'A gerência de enfermagem deve utilizar a estratégia de Colaboração (ganha-ganha), promovendo reuniões de alinhamento com escuta ativa, dados objetivos (protocolos institucionais) e foco na segurança do paciente, evitando posturas punitivas ou de esquiva.',
    pedagogyRef: 'Kurcgant, P. (2016). Gerenciamento em Enfermagem, cap. 10 — Gestão de Conflitos.',
    tags: ['Conflitos', 'Comunicação', 'Clima Organizacional'],
  },
  {
    id: 'd4',
    title: 'Gestão de Recursos Materiais e RDC 15 ANVISA (CME)',
    category: 'Recursos Materiais',
    question: 'Quais os pilares da segurança e controle de insumos e esterilização?',
    answer: 'A gestão de materiais exige previsão, provisão, organização e controle. Na CME (RDC 15/2012), deve-se garantir fluxo unidirecional (área suja -> limpa -> esterilizada), controle microbiológico e rastreabilidade total de pacotes por lote e indicador químico/biológico.',
    pedagogyRef: 'Kurcgant, P. (2016). Gerenciamento em Enfermagem, cap. 6; RDC ANVISA nº 15/2012.',
    tags: ['Materiais', 'CME', 'ANVISA', 'RDC 15'],
  },
  {
    id: 'd5',
    title: 'Cultura Justa de Segurança e Notificação de Incidentes',
    category: 'Segurança do Paciente',
    question: 'Como agir quando um profissional comete um erro de medicação?',
    answer: 'Adotar os princípios da Cultura Justa: acolher o profissional, garantir a assistência imediata ao paciente atingido, notificar o incidente no NESP/NSP sem cunho punitivo e aplicar ferramentas de causas-raiz (Diagrama de Ishikawa / 5 Porquês) para corrigir falhas de processo.',
    pedagogyRef: 'Kurcgant, P. (2016). Gerenciamento em Enfermagem, cap. 11; PNSP / OMS (2009).',
    tags: ['Segurança do Paciente', 'Cultura Justa', 'Gestão do Erro'],
  },
  {
    id: 'd6',
    title: 'Comunicação Efetiva no Passagem de Plantão (SBAR)',
    category: 'Comunicação & Liderança',
    question: 'Como estruturar a passagem de plantão para evitar perda de dados críticos?',
    answer: 'Utilizar a ferramenta estruturada SBAR: S (Situação - dados do paciente e leito), B (Breve Histórico - diagnóstico e antecedentes), A (Avaliação - sinais vitais e quadro atual) e R (Recomendação - pendências e condutas prioritárias).',
    pedagogyRef: 'Marquis & Huston (2015), cap. 19; Protocolo Nacional de Segurança do Paciente (MS).',
    tags: ['SBAR', 'Passagem de Plantão', 'Comunicação'],
  },
];
