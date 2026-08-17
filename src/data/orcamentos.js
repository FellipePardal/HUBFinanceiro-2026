// ─── MÓDULO ORÇAMENTOS — MOTOR DE DADOS ───────────────────────────────────────
// Budget builder pré-campeonato: um orçamento é um documento vivo (rascunho →
// em revisão → aprovado) onde o orçado de cada jogo é DERIVADO ao vivo de:
//   premissa(padrão do jogo)  ⊕  logística(faixa de distância da praça)  ⊕  overrides da linha
// Só na aprovação o valor é achatado ("carimbado") em jogo.orcado e o
// campeonato custom é criado pelo fluxo existente (criarCampeonato do App).
//
// Chaves no app_state:
//   orc_registry          → lista leve p/ a tela de listagem (espelha campeonatos_custom)
//   orc_${id}             → documento completo do orçamento
//   orc_${id}_eventos     → log append-only (appendState, com clientRef)

import { CATS } from "../constants";
import { allSubKeysPaulistao } from "./paulistao";
import { slugify } from "./customCampeonato";

export const ORC_REGISTRY_KEY = "orc_registry";
export const orcKey        = (id) => `orc_${id}`;
export const orcEventosKey = (id) => `orc_${id}_eventos`;

export const ORC_STATUS = {
  rascunho:   { label: "Rascunho",   color: "#f59e0b" },
  em_revisao: { label: "Em revisão", color: "#3b82f6" },
  aprovado:   { label: "Aprovado",   color: "#22c55e" },
};

// Eixos de subKeys: logística vem da faixa da praça; o resto vem da premissa do padrão.
export const SUBS_LOGISTICA = CATS[0].subs;                        // outros_log, transporte, uber, hospedagem, diaria
export const SUBS_PREMISSA  = [...CATS[1].subs, ...CATS[2].subs];  // pessoal + operações

export const PADROES_SUGERIDOS = ["B1", "B2", "B3", "B3+"];

// Faixas de distância padrão — valores iniciais zerados exceto Uber (piso comum);
// o operador ajusta na aba Praças & Logística.
export const FAIXAS_PRESET = [
  { key:"sp",        label:"SP",        logistica:{ transporte:0, uber:250, hospedagem:0, diaria:0, outros_log:0 } },
  { key:"grande_sp", label:"Grande SP", logistica:{ transporte:0, uber:250, hospedagem:0, diaria:0, outros_log:0 } },
  { key:"sp200",     label:"SP200",     logistica:{ transporte:0, uber:250, hospedagem:0, diaria:0, outros_log:0 } },
  { key:"sp400",     label:"SP400",     logistica:{ transporte:0, uber:250, hospedagem:0, diaria:0, outros_log:0 } },
];

export const novoOrcamento = ({ nome, edicao, formato, numRodadas, fases, cor, icon, descricao }) => {
  const now = new Date().toISOString();
  return {
    id: slugify(`${nome}-${edicao}`),
    schemaVersion: 1,
    meta: {
      nome: String(nome || "").trim(),
      edicao: String(edicao || "").trim(),
      icon: icon || "🏆",
      cor: cor || "#ec4899",
      descricao: String(descricao || "").trim(),
      formato: formato || "mata_mata",
      numRodadas: formato === "pontos_corridos" ? (parseInt(numRodadas) || 0) : null,
      fases: fases || [],
      status: "rascunho",
      aprovadoEm: null,
      aprovadoPor: null,
      campeonatoCriadoId: null,
      createdAt: now,
      updatedAt: now,
    },
    padroes: [],
    premissas: {},          // { [padrao]: { [subKey]: number } }
    faixas: FAIXAS_PRESET.map(f => ({ ...f, logistica: { ...f.logistica } })),
    pracas: [],             // [{ id, cidade, faixaKey }]
    jogos: [],              // [{ id, fase, rodada, mandante, visitante, pracaId, padrao, data, obs, overrides:{} }]
    servicosFixos: [],      // [{ secao, itens:[{ id, nome, orcado, obs }] }]
  };
};

// ─── DERIVAÇÃO DO ORÇADO ──────────────────────────────────────────────────────

// Orçado derivado de um jogo: base zerada → premissa do padrão → logística da
// faixa da praça → overrides da linha (vencem tudo).
export const calcOrcadoJogo = (orc, jogo) => {
  const out = { ...allSubKeysPaulistao() };
  const prem = orc?.premissas?.[jogo?.padrao] || {};
  for (const [k, v] of Object.entries(prem)) if (k in out) out[k] = Number(v) || 0;
  const praca = (orc?.pracas || []).find(p => p.id === jogo?.pracaId);
  const faixa = (orc?.faixas || []).find(f => f.key === praca?.faixaKey);
  if (faixa) for (const [k, v] of Object.entries(faixa.logistica || {})) if (k in out) out[k] = Number(v) || 0;
  for (const [k, v] of Object.entries(jogo?.overrides || {})) {
    if (v === null || v === undefined || v === "") continue;
    if (k in out) out[k] = Number(v) || 0;
  }
  return out;
};

export const totalJogo = (orc, jogo) =>
  Object.values(calcOrcadoJogo(orc, jogo)).reduce((s, v) => s + v, 0);

// Quebra do orçado derivado de um jogo por categoria de CATS (p/ colunas da tabela).
export const blocosJogo = (orc, jogo) => {
  const orcado = calcOrcadoJogo(orc, jogo);
  const out = { total: 0 };
  CATS.forEach(cat => {
    const t = cat.subs.reduce((s, sub) => s + (orcado[sub.key] || 0), 0);
    out[cat.key] = t;
    out.total += t;
  });
  return out;
};

export const totalFixos = (orc) =>
  (orc?.servicosFixos || []).reduce((s, sec) =>
    s + (sec.itens || []).reduce((si, it) => si + (Number(it.orcado) || 0), 0), 0);

// Totais consolidados para o Resumo e para o espelho do registry.
export const calcTotais = (orc) => {
  const jogos = orc?.jogos || [];
  const porCategoria = CATS.map(cat => ({ key: cat.key, label: cat.label, color: cat.color, total: 0 }));
  const porFase = {}, porPadrao = {}, porFaixa = {};
  let totalJogos = 0;
  jogos.forEach(j => {
    const orcado = calcOrcadoJogo(orc, j);
    let tj = 0;
    CATS.forEach((cat, i) => {
      const t = cat.subs.reduce((s, sub) => s + (orcado[sub.key] || 0), 0);
      porCategoria[i].total += t;
      tj += t;
    });
    totalJogos += tj;
    porFase[j.fase || "—"] = (porFase[j.fase || "—"] || 0) + tj;
    porPadrao[j.padrao || "—"] = (porPadrao[j.padrao || "—"] || 0) + tj;
    const praca = (orc.pracas || []).find(p => p.id === j.pracaId);
    const faixaLabel = (orc.faixas || []).find(f => f.key === praca?.faixaKey)?.label || "—";
    porFaixa[faixaLabel] = (porFaixa[faixaLabel] || 0) + tj;
  });
  const fixos = totalFixos(orc);
  return { porCategoria, porFase, porPadrao, porFaixa, totalJogos, totalFixos: fixos, totalGeral: totalJogos + fixos };
};

// Espelho leve para o orc_registry (recalculado a cada save do documento).
export const resumoRegistry = (orc) => {
  const { totalGeral } = calcTotais(orc);
  return {
    id: orc.id,
    nome: orc.meta.nome,
    edicao: orc.meta.edicao,
    icon: orc.meta.icon,
    cor: orc.meta.cor,
    status: orc.meta.status,
    totalEstimado: totalGeral,
    numJogos: (orc.jogos || []).length,
    campeonatoCriadoId: orc.meta.campeonatoCriadoId || null,
    createdAt: orc.meta.createdAt,
    updatedAt: orc.meta.updatedAt,
  };
};

// ─── APROVAÇÃO ────────────────────────────────────────────────────────────────

// Valida o orçamento antes de aprovar. `idsExistentes` = ids de CAMPEONATOS
// fixos + registry de customs. Retorna array de erros PT-BR (vazio = ok).
export const validarAprovacao = (orc, idsExistentes = []) => {
  const erros = [];
  if (!orc) return ["Orçamento não carregado."];
  if (orc.meta.status === "aprovado") erros.push("Este orçamento já foi aprovado.");
  const campId = slugify(`${orc.meta.nome}-${orc.meta.edicao}`);
  if (!campId) erros.push("Nome e edição não geram um ID válido de campeonato.");
  if (idsExistentes.includes(campId)) erros.push(`Já existe um campeonato com o ID "${campId}". Ajuste o nome ou a edição.`);
  if ((orc.jogos || []).length === 0) erros.push("O orçamento precisa de pelo menos 1 jogo.");
  if (orc.meta.formato === "mata_mata" && (orc.meta.fases || []).length === 0) erros.push("Defina pelo menos uma fase na Configuração.");
  (orc.jogos || []).forEach((j, i) => {
    const rot = `Jogo ${i + 1}${j.mandante ? ` (${j.mandante})` : ""}`;
    if (!j.padrao) erros.push(`${rot}: sem padrão definido.`);
    else if (!(orc.padroes || []).includes(j.padrao)) erros.push(`${rot}: padrão "${j.padrao}" não está na lista de padrões do orçamento.`);
    else if (!orc.premissas?.[j.padrao]) erros.push(`${rot}: o padrão "${j.padrao}" não tem premissas preenchidas.`);
    const praca = (orc.pracas || []).find(p => p.id === j.pracaId);
    if (!praca) erros.push(`${rot}: sem praça definida.`);
    else if (!(orc.faixas || []).some(f => f.key === praca.faixaKey)) erros.push(`${rot}: a praça "${praca.cidade}" aponta para uma faixa inexistente.`);
  });
  return erros;
};

// Achata o orçamento aprovado no payload do criarCampeonato existente
// ({ config, jogos, servicos }) — jogos no mesmo shape de jogoFromCSVRow.
export const orcamentoParaCampeonato = (orc) => {
  const m = orc.meta;
  const id = slugify(`${m.nome}-${m.edicao}`);
  const fases = m.formato === "pontos_corridos"
    ? [{ key:"rodadas", label:"Rodadas", short:"Rodadas", color:m.cor, ordem:1 }]
    : (m.fases || []).map((f, i) => ({ key:f.key, label:f.label, short:f.short || f.label, color:f.color, ordem:i + 1 }));
  const config = {
    id,
    nome: m.nome,
    edicao: m.edicao,
    status: "Em andamento",
    statusColor: "#22c55e",
    cor: m.cor,
    corGrad: `linear-gradient(135deg, ${m.cor}, ${m.cor}dd)`,
    icon: m.icon || "🏆",
    descricao: m.descricao || `${m.nome} · ${m.edicao}`,
    formato: m.formato,
    numRodadas: m.formato === "pontos_corridos" ? (m.numRodadas || 0) : null,
    fases,
    createdAt: new Date().toISOString(),
    origemOrcamento: orc.id,
  };
  const jogos = (orc.jogos || []).map((j, i) => {
    const praca = (orc.pracas || []).find(p => p.id === j.pracaId);
    const faixa = (orc.faixas || []).find(f => f.key === praca?.faixaKey);
    return {
      id: 1000 + i + 1,
      codigo_orcamento: "",
      seed_version: 3,
      fase: m.formato === "pontos_corridos" ? "rodadas" : (j.fase || fases[0]?.key || "grupos"),
      grupo: "-",
      rodada: parseInt(j.rodada) || (i + 1),
      categoria: j.padrao || "",
      dist: faixa?.label || "",
      logistica_modo: "",
      equipe: "",
      cidade: praca?.cidade || "A definir",
      estadio: "A definir",
      dia: "",
      data: j.data || "A definir",
      hora: "A definir",
      mandante: j.mandante || "A definir",
      visitante: j.visitante || "A definir",
      detentor: "A definir",
      divergencia: false,
      nota_divergencia: "",
      orcado: calcOrcadoJogo(orc, j),
      provisionado: { ...allSubKeysPaulistao() },
      realizado:    { ...allSubKeysPaulistao() },
    };
  });
  const servicos = (orc.servicosFixos || [])
    .filter(sec => (sec.itens || []).length > 0)
    .map(sec => ({
      secao: sec.secao,
      itens: sec.itens.map(it => ({
        id: it.id,
        nome: it.nome,
        orcado: Number(it.orcado) || 0,
        provisionado: 0,
        realizado: 0,
        obs: it.obs || "",
      })),
    }));
  return { config, jogos, servicos };
};
