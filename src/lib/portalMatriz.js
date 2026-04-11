// ─── ADAPTER: PORTAL MATRIZ ──────────────────────────────────────────────────
// Camada de abstração entre o módulo de Fornecedores e a fonte de jogos do
// Brasileirão. Hoje a fonte é a coleção local em app_state.forn_jogos
// (alimentada por src/data/jogosFornecedores.js no primeiro acesso). Quando
// o portal matriz interno for publicado, basta trocar a implementação destas
// funções para chamadas HTTP — a interface fica estável.
//
// Toda a UI consome o adapter, NUNCA o app_state diretamente, exatamente
// para que essa troca seja invisível pro restante do sistema.

import { getState } from "./supabase";

// ── Tipos (apenas para referência) ────────────────────────────────────────
// Jogo: { id, campeonatoId, cidadeId, categoria, rodada, data,
//         mandante, visitante, estadio }

const STORE_KEY = "forn_jogos";

// Lê todos os jogos do storage. Caller normalmente passa filtros.
async function carregar() {
  const lista = await getState(STORE_KEY);
  return Array.isArray(lista) ? lista : [];
}

// ── API pública ───────────────────────────────────────────────────────────

// Lista jogos aplicando filtros opcionais. Filtros suportados:
//   campeonatoId, cidadeId, categoria, rodada,
//   dataInicio (ISO), dataFim (ISO)
export async function listarJogos(filtros = {}) {
  const lista = await carregar();
  const {
    campeonatoId, cidadeId, categoria, rodada, dataInicio, dataFim,
  } = filtros;
  return lista.filter(j => {
    if (campeonatoId && j.campeonatoId !== campeonatoId) return false;
    if (cidadeId     && j.cidadeId     !== cidadeId)     return false;
    if (categoria    && j.categoria    !== categoria)    return false;
    if (rodada       && j.rodada       !== rodada)       return false;
    if (dataInicio   && j.data         <  dataInicio)    return false;
    if (dataFim      && j.data         >  dataFim)       return false;
    return true;
  });
}

// Versão síncrona para uso em componentes que já têm a lista carregada via
// realtime / state. Recebe a coleção pronta e aplica os mesmos filtros.
export function filtrarJogos(lista, filtros = {}) {
  const {
    campeonatoId, cidadeId, categoria, rodada, dataInicio, dataFim,
  } = filtros;
  return (lista || []).filter(j => {
    if (campeonatoId && j.campeonatoId !== campeonatoId) return false;
    if (cidadeId     && j.cidadeId     !== cidadeId)     return false;
    if (categoria    && j.categoria    !== categoria)    return false;
    if (rodada       && j.rodada       !== rodada)       return false;
    if (dataInicio   && j.data         <  dataInicio)    return false;
    if (dataFim      && j.data         >  dataFim)       return false;
    return true;
  });
}

// Busca um jogo por id. Útil para a tela de cotação.
export async function buscarJogo(id) {
  const lista = await carregar();
  return lista.find(j => j.id === id) || null;
}

// Helper: classificação temporal de um jogo (para lista de Próximos Jogos)
export function classificarTemporal(jogo, agora = new Date()) {
  if (!jogo?.data) return "sem_data";
  const data = new Date(jogo.data);
  const diffMs = data - agora;
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0)        return "passado";
  if (diffDias < 1)      return "hoje";
  if (diffDias < 3)      return "urgente";
  if (diffDias < 7)      return "semana";
  return "futuro";
}
