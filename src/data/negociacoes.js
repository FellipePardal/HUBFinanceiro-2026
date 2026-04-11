// ─── CONSTANTES DE NEGOCIAÇÕES / COTAÇÕES ──────────────────────────────────
// Cotações, chats e links públicos persistem via Supabase (app_state + tabelas
// dedicadas para chat/anexos). Esse arquivo concentra apenas os dicionários
// reutilizáveis em todas as sub-abas de Fornecedores.

export const COTACAO_INIT = [];
export const NEGOCIACOES_CHATS_INIT = [];

// Status possíveis de uma cotação (ciclo de vida da negociação)
export const STATUS_COTACAO = [
  { key:"rascunho",   label:"Rascunho",     color:"#64748b" },
  { key:"aberta",     label:"Aberta",       color:"#3b82f6" },
  { key:"em_analise", label:"Em Análise",   color:"#f59e0b" },
  { key:"negociando", label:"Negociando",   color:"#a855f7" },
  { key:"aprovada",   label:"Aprovada",     color:"#10b981" },
  { key:"recusada",   label:"Recusada",     color:"#ef4444" },
  { key:"cancelada",  label:"Cancelada",    color:"#94a3b8" },
];

export const statusInfo = key => STATUS_COTACAO.find(s => s.key === key) || STATUS_COTACAO[0];

// Status de "jogo programado" (para contagem da sub-aba Negociações)
export const STATUS_JOGO_NEGOCIACAO = {
  definido:   { label:"Definido",   color:"#10b981" },
  pendente:   { label:"A definir",  color:"#f59e0b" },
  urgente:    { label:"Urgente",    color:"#ef4444" },
};

// Lista de campeonatos usados na agenda de cotações. Mantida em sincronia
// manual com src/constants.js (CAMPEONATOS) para evitar dependência circular.
export const CAMPEONATOS_COTACAO = [
  { id:"brasileirao-2026",  nome:"Brasileirão Série A 2026", cor:"#166534" },
  { id:"copa-brasil-2026",  nome:"Copa do Brasil 2026",      cor:"#1d4ed8" },
  { id:"libertadores-2026", nome:"Libertadores 2026",        cor:"#b45309" },
  { id:"sulamericana-2026", nome:"Sul-Americana 2026",       cor:"#7c2d12" },
  { id:"estaduais-2026",    nome:"Campeonatos Estaduais",    cor:"#92400e" },
];
