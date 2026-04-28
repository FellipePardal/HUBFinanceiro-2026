// ─── HELPERS PARA CAMPEONATOS DINÂMICOS ───────────────────────────────────────
// Permite criar um campeonato novo colando um JSON no mesmo formato que a
// gente já alinhou para o Paulistão Feminino. As helpers daqui:
//  • slugify  → gera id estável a partir do nome+edição
//  • derivarFases → infere a lista de fases a partir do array de jogos
//  • jogoFromJSON → normaliza um jogo do JSON da planilha para o shape interno
//
// O resultado alimenta diretamente o estado do campeonato no Supabase, com as
// chaves namespaced `${id}_jogos`, `${id}_servicos`, etc.

import { allSubKeysPaulistao } from "./paulistao";

export const slugify = (s) => String(s || "")
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 60);

// Mapeamento de nomes de fase comuns (PT-BR) → key padronizada usada no app.
// Importante para que jogos com fase "Fase de Grupos" e "Primeira Fase" sejam
// agrupados na mesma key "grupos".
const FASE_KEY_MAP = {
  "primeira fase":"grupos", "fase de grupos":"grupos", "grupos":"grupos",
  "play in":"play_in", "play-in":"play_in", "playin":"play_in",
  "oitavas":"oitavas", "oitavas de final":"oitavas",
  "quartas":"quartas", "quartas de final":"quartas", "2ª fase":"quartas", "2a fase":"quartas",
  "semifinal":"semi", "semi":"semi", "semifinais":"semi",
  "final":"final", "finais":"final",
};

const FASE_DEFAULT_COLORS = ["#3b82f6","#8b5cf6","#f59e0b","#ec4899","#ef4444","#10b981","#06b6d4","#a855f7","#22c55e"];

const normFaseRaw = (raw) => String(raw || "grupos").trim();
export const faseKeyFromRaw = (raw) => {
  const r = normFaseRaw(raw).toLowerCase();
  return FASE_KEY_MAP[r] || slugify(r) || "grupos";
};

// A partir do array bruto de jogos, monta a lista ordenada de fases (key/label/cor/ordem).
// Preserva a ordem em que cada fase aparece no JSON.
export const derivarFases = (jogos) => {
  const ordemConhecida = ["grupos","play_in","oitavas","quartas","semi","final"];
  const seen = new Map();
  let order = 0;
  jogos.forEach((j) => {
    const raw = normFaseRaw(j.fase);
    const key = faseKeyFromRaw(raw);
    if (!seen.has(key)) seen.set(key, { key, label: raw, ordemRaw: order++ });
  });
  const arr = Array.from(seen.values());
  // Reordena dando preferência à ordem padrão conhecida; o resto fica na ordem de chegada
  arr.sort((a, b) => {
    const ai = ordemConhecida.indexOf(a.key);
    const bi = ordemConhecida.indexOf(b.key);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.ordemRaw - b.ordemRaw;
  });
  return arr.map((f, i) => ({
    key: f.key,
    label: f.label,
    short: f.label,
    color: FASE_DEFAULT_COLORS[i % FASE_DEFAULT_COLORS.length],
    ordem: i + 1,
  }));
};

// Mapeia o orçado granular do JSON (logistica/pessoal/operacao com subkeys)
// para o shape uniforme de subkeys do CATS.
const mapOrc = (log = {}, pess = {}, op = {}) => ({
  ...allSubKeysPaulistao(),
  uber:        log.uber        || 0,
  transporte:  (log.locado || 0) + (log.passagem || 0),
  hospedagem:  log.hospedagem  || 0,
  diaria:      log.diaria_cache|| 0,
  coord_um:    pess.coord_um   || 0,
  prod_um:     pess.prod_um    || 0,
  prod_campo:  pess.prod_campo || 0,
  supervisor1: pess.supervisor || 0,
  dtv:         pess.dtv        || 0,
  vmix:        pess.vmix       || 0,
  um_b1:       op.um_b1        || 0,
  um_b2:       op.um_b2        || 0,
  um_b3:       op.um_b3        || 0,
  geradores:   op.geradores    || 0,
  sng:         op.sng          || 0,
  seg_espacial:op.seg_espacial || 0,
  drone:       op.drone        || 0,
  grua:        op.grua         || 0,
  dslrs_transmissor: op.dslrs_transmissor || 0,
  refcam:      op.refcam       || 0,
  minidrone:   op.minidrone    || 0,
  downlink:    op.downlink     || 0,
  distribuicao:op.distribuicao || 0,
  liveu:       op.liveu        || 0,
  internet:    op.internet     || 0,
  maquinas:    op.maquinas     || 0,
  montagem_vespera: op.montagem_vespera || 0,
  extra:       op.extra        || 0,
});

// Converte um jogo cru do JSON da planilha para o shape interno do app.
export const jogoFromJSON = (j, idx) => {
  const log  = j.logistica || {};
  const pess = j.pessoal   || {};
  const op   = j.operacao  || {};
  return {
    id: 1000 + idx + 1,
    codigo_orcamento: j.codigo_orcamento || "",
    seed_version: 3,
    fase: faseKeyFromRaw(j.fase),
    grupo: j.grupo || "-",
    rodada: parseInt(j.rodada) || (idx + 1),
    categoria: j.categoria || "",
    dist: j.dist || "",
    logistica_modo: log.categoria || j.logistica_modo || "",
    equipe: pess.categoria || j.equipe || "",
    cidade: j.cidade || "A definir",
    estadio: j.estadio || "A definir",
    dia: j.dia || "",
    data: j.data || "A definir",
    hora: j.hora || "A definir",
    mandante: j.mandante || "A definir",
    visitante: j.visitante || "A definir",
    detentor: j.detentor || "A definir",
    divergencia: !!j.divergencia,
    nota_divergencia: j.nota_divergencia || "",
    orcado: mapOrc(log, pess, op),
    provisionado: { ...allSubKeysPaulistao() },
    realizado: { ...allSubKeysPaulistao() },
  };
};

// Helpers de fase derivados de uma config (para uso no CampeonatoCustom)
export const makeFaseHelpers = (fases = []) => ({
  getFase:    (key) => fases.find((f) => f.key === key) || fases[0] || { key, label:key, short:key, color:"#888", ordem:99 },
  ordemFase:  (key) => fases.find((f) => f.key === key)?.ordem || 99,
});

// Chave única no Supabase que guarda o registry de campeonatos custom criados
export const REGISTRY_KEY = "campeonatos_custom";
