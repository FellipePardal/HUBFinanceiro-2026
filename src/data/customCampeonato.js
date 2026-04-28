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

// ─── PARSER CSV ───────────────────────────────────────────────────────────────
// Recebe uma string CSV (com ou sem aspas) e devolve um array de objetos cuja
// chave é o cabeçalho da coluna (lowercase, sem espaços extras). Aceita ; como
// separador também (Excel BR exporta assim). Linhas vazias são ignoradas.

const detectarSeparador = (linha) => {
  const ncomma = (linha.match(/,/g) || []).length;
  const nsemic = (linha.match(/;/g) || []).length;
  const ntab   = (linha.match(/\t/g) || []).length;
  if (ntab >= ncomma && ntab >= nsemic) return "\t";
  return nsemic > ncomma ? ";" : ",";
};

const parseCSVLine = (linha, sep) => {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"' && linha[i+1] === '"') { cur += '"'; i++; }
    else if (c === '"') inQuotes = !inQuotes;
    else if (c === sep && !inQuotes) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
};

export const parseCSV = (texto) => {
  const linhas = String(texto || "").trim().split(/\r?\n/).filter(l => l.trim());
  if (linhas.length < 2) return { header: [], rows: [] };
  const sep = detectarSeparador(linhas[0]);
  const header = parseCSVLine(linhas[0], sep).map(h => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = linhas.slice(1).map(l => {
    const cols = parseCSVLine(l, sep);
    const obj = {};
    header.forEach((k, i) => { obj[k] = cols[i] != null ? cols[i] : ""; });
    return obj;
  });
  return { header, rows };
};

// Converte uma linha do CSV para o shape interno do jogo. Colunas ausentes
// viram 0 (numéricos) ou string vazia. Aceita várias grafias (codigo/codigo_orcamento,
// supervisor/supervisor1, etc).
export const jogoFromCSVRow = (row, idx) => {
  const get = (...keys) => { for (const k of keys) { if (row[k] != null && row[k] !== "") return row[k]; } return ""; };
  const num = (...keys) => {
    const v = get(...keys);
    if (!v) return 0;
    return parseFloat(String(v).replace(/[^0-9,.\-]/g, "").replace(",", ".")) || 0;
  };
  return {
    id: 1000 + idx + 1,
    codigo_orcamento: get("codigo", "codigo_orcamento", "code"),
    seed_version: 3,
    fase: faseKeyFromRaw(get("fase")),
    grupo: get("grupo") || "-",
    rodada: parseInt(get("rodada")) || (idx + 1),
    categoria: get("categoria"),
    dist: get("dist", "distancia"),
    logistica_modo: get("logistica_modo", "logistica", "modo"),
    equipe: get("equipe", "time_producao"),
    cidade: get("cidade") || "A definir",
    estadio: get("estadio") || "A definir",
    dia: get("dia"),
    data: get("data") || "A definir",
    hora: get("hora") || "A definir",
    mandante: get("mandante") || "A definir",
    visitante: get("visitante") || "A definir",
    detentor: get("detentor") || "A definir",
    divergencia: false,
    nota_divergencia: "",
    orcado: {
      ...allSubKeysPaulistao(),
      uber:        num("uber"),
      transporte:  num("locado") + num("passagem") + num("transporte"),
      hospedagem:  num("hospedagem"),
      diaria:      num("diaria", "diaria_cache"),
      coord_um:    num("coord_um"),
      prod_um:     num("prod_um"),
      prod_campo:  num("prod_campo"),
      supervisor1: num("supervisor", "supervisor1"),
      supervisor2: num("supervisor2"),
      dtv:         num("dtv"),
      vmix:        num("vmix"),
      um_b1:       num("um_b1"),
      um_b2:       num("um_b2"),
      um_b3:       num("um_b3"),
      geradores:   num("geradores"),
      sng:         num("sng"),
      seg_espacial:num("seg_espacial"),
      drone:       num("drone"),
      grua:        num("grua"),
      dslrs_transmissor: num("dslrs_transmissor", "dslr_transmissor"),
      refcam:      num("refcam"),
      minidrone:   num("minidrone"),
      downlink:    num("downlink"),
      distribuicao:num("distribuicao", "distribucao"),
      liveu:       num("liveu"),
      internet:    num("internet"),
      maquinas:    num("maquinas"),
      montagem_vespera: num("montagem_vespera", "montagem"),
      extra:       num("extra"),
    },
    provisionado: { ...allSubKeysPaulistao() },
    realizado:    { ...allSubKeysPaulistao() },
  };
};

// Template CSV (1 linha de exemplo) — copiável pelo modal.
export const CSV_TEMPLATE = [
  "codigo,fase,rodada,dia,data,hora,mandante,visitante,cidade,estadio,detentor,categoria,dist,logistica_modo,equipe,uber,locado,passagem,hospedagem,diaria,coord_um,prod_um,prod_campo,supervisor,dtv,vmix,um_b1,um_b2,um_b3,geradores,sng,seg_espacial,drone,grua,dslrs_transmissor,refcam,minidrone,downlink,distribuicao,liveu,internet,maquinas,montagem_vespera,extra",
  "EX1,Primeira Fase,1,quarta-feira,06/05/2026,18:00,Time A,Time B,Cidade,Estádio,Detentor,B3+,Grande SP,uber,equipe SP-B,250,0,0,0,0,0,400,400,600,0,0,0,0,24000,3200,4000,3250,0,0,0,0,0,1000,1000,0,0,958,0,0",
].join("\n");

// Presets de fase para o wizard
export const FASES_PRESETS = [
  { key:"grupos",  label:"Primeira Fase", color:"#3b82f6" },
  { key:"play_in", label:"Play In",       color:"#8b5cf6" },
  { key:"oitavas", label:"Oitavas",       color:"#f59e0b" },
  { key:"quartas", label:"Quartas",       color:"#ec4899" },
  { key:"semi",    label:"Semifinal",     color:"#ef4444" },
  { key:"final",   label:"Final",         color:"#10b981" },
];
