import { CATS, FASES_PAULISTAO } from "../constants";

// ─── DEFAULTS DE CUSTO POR JOGO (Paulistão Feminino) ─────────────────────────
// Valores iniciais conservadores — ajustar conforme orçamento aprovado.
const PESSOAL_PAU = { coord_um:800, prod_um:0, prod_campo:300, monitoracao:0, supervisor1:600, supervisor2:600, dtv:600, vmix:400, audio:600 };
const PAULISTAO_DEFAULT = {
  outros_log:0, transporte:3500, uber:800, hospedagem:1200, diaria:480,
  ...PESSOAL_PAU,
  um_b1:0, um_b2:42000, geradores:3500, sng:5500, sng_extra:0,
  seg_espacial:3500, seg_extra:0,
  drone:0, grua:3500, dslr:6500, carrinho:0, especial:0, goalcam:0, minidrone:0,
  infra:5000, extra:0,
};

export const allSubKeysPaulistao = () => { const r={}; CATS.forEach(c=>c.subs.forEach(s=>{r[s.key]=0;})); return r; };
export const getPaulistaoDefaults = () => ({ ...PAULISTAO_DEFAULT });

// Helpers de fase
export const FASE_KEYS = FASES_PAULISTAO.map(f => f.key);
export const getFase = key => FASES_PAULISTAO.find(f => f.key === key) || FASES_PAULISTAO[0];
export const ordemFase = key => (FASES_PAULISTAO.find(f => f.key === key)?.ordem) || 99;

// Cria placeholder/jogo do Paulistão
export const makeJogoPaulistao = ({ id, fase="grupos", grupo="-", rodada=1, cidade="A definir", estadio="A definir", dia="", data="A definir", hora="A definir", mandante="A definir", visitante="A definir", detentor="A definir" }) => {
  const defs = getPaulistaoDefaults();
  return {
    id, fase, grupo, rodada,
    categoria:"PAU",
    cidade, estadio, dia, data, hora, mandante, visitante, detentor,
    orcado: { ...defs },
    provisionado: { ...allSubKeysPaulistao() },
    realizado: { ...allSubKeysPaulistao() },
  };
};

// ─── SEED PADRÃO — Paulistão Feminino 2026 (formato 8 times) ──────────────────
// Times: Palmeiras, Mirassol, Ferroviária, Santos, Corinthians, São Paulo, RB Bragantino, Taubaté.
// Fase de Grupos: 7 rodadas turno único (parciais publicadas até R7 — restantes a divulgar).
// Mata-mata: Quartas (4 jogos = 2 confrontos ida/volta) → Semi (4 jogos) → Final (2 jogos).
export const PAULISTAO_GRUPOS = ["-"];

export const PAULISTAO_JOGOS_INIT = [
  // R1
  makeJogoPaulistao({ id:1001, fase:"grupos", rodada:1, dia:"quarta-feira", data:"06/05/2026", hora:"18:00", mandante:"Palmeiras",   visitante:"Mirassol",     cidade:"Barueri",     estadio:"Arena Barueri",            detentor:"SporTV" }),
  makeJogoPaulistao({ id:1002, fase:"grupos", rodada:1, dia:"quarta-feira", data:"06/05/2026", hora:"20:00", mandante:"Ferroviária", visitante:"Santos",       cidade:"Araraquara",  estadio:"Fonte Luminosa",            detentor:"Record News / HBO Max / CazeTV" }),
  makeJogoPaulistao({ id:1003, fase:"grupos", rodada:1, dia:"quinta-feira", data:"07/05/2026", hora:"21:30", mandante:"Corinthians", visitante:"São Paulo",    cidade:"São Paulo",   estadio:"Alfredo Schürig",           detentor:"SporTV" }),

  // R2
  makeJogoPaulistao({ id:1004, fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"16:00", mandante:"Mirassol",      visitante:"Ferroviária", cidade:"Bálsamo",    estadio:"Manuel Francisco Ferreira", detentor:"SporTV" }),
  makeJogoPaulistao({ id:1005, fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"17:30", mandante:"RB Bragantino", visitante:"Corinthians", cidade:"Rio Claro",  estadio:"Benito Agnelo Castellano",  detentor:"Record / HBO Max" }),
  makeJogoPaulistao({ id:1006, fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"19:30", mandante:"Santos",        visitante:"Palmeiras",   cidade:"Santos",     estadio:"Vila Belmiro",              detentor:"Record News / HBO Max / CazeTV" }),
  makeJogoPaulistao({ id:1007, fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"21:00", mandante:"São Paulo",     visitante:"Taubaté",     cidade:"Cotia",      estadio:"Marcelo Portugal Gouvêa",   detentor:"SporTV" }),

  // R3
  makeJogoPaulistao({ id:1008, fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"18:00", mandante:"Ferroviária", visitante:"Palmeiras",    cidade:"Araraquara", estadio:"Fonte Luminosa",            detentor:"SporTV" }),
  makeJogoPaulistao({ id:1009, fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"19:30", mandante:"Corinthians", visitante:"Santos",       cidade:"São Paulo",  estadio:"Alfredo Schürig",           detentor:"Record News / HBO Max / CazeTV" }),
  makeJogoPaulistao({ id:1010, fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"21:00", mandante:"São Paulo",   visitante:"RB Bragantino",cidade:"Cotia",      estadio:"Marcelo Portugal Gouvêa",   detentor:"SporTV" }),

  // R4
  makeJogoPaulistao({ id:1011, fase:"grupos", rodada:4, dia:"sexta-feira",  data:"17/07/2026", hora:"15:00", mandante:"Corinthians", visitante:"Ferroviária",  cidade:"São Paulo",  estadio:"Alfredo Schürig",           detentor:"Record News / HBO Max / CazeTV" }),
  makeJogoPaulistao({ id:1012, fase:"grupos", rodada:4, dia:"sexta-feira",  data:"17/07/2026", hora:"15:00", mandante:"Palmeiras",   visitante:"São Paulo",    cidade:"Barueri",    estadio:"Arena Barueri",             detentor:"SporTV" }),

  // R5
  makeJogoPaulistao({ id:1013, fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"RB Bragantino", visitante:"Santos",     cidade:"Rio Claro",  estadio:"Benito Agnelo Castellano",  detentor:"SporTV" }),
  makeJogoPaulistao({ id:1014, fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"Palmeiras",     visitante:"Corinthians",cidade:"Barueri",    estadio:"Arena Barueri",             detentor:"SporTV" }),
  makeJogoPaulistao({ id:1015, fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"São Paulo",     visitante:"Mirassol",   cidade:"Cotia",      estadio:"Marcelo Portugal Gouvêa",   detentor:"Record News / HBO Max / CazeTV" }),

  // R6
  makeJogoPaulistao({ id:1016, fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"Taubaté",   visitante:"Palmeiras",   cidade:"Taubaté",    estadio:"Estádio Joaquim de Morais Filho", detentor:"SporTV" }),
  makeJogoPaulistao({ id:1017, fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"Mirassol",  visitante:"Corinthians", cidade:"Bálsamo",    estadio:"Manuel Francisco Ferreira",       detentor:"SporTV" }),
  makeJogoPaulistao({ id:1018, fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"São Paulo", visitante:"Santos",      cidade:"Cotia",      estadio:"Marcelo Portugal Gouvêa",         detentor:"Record News / HBO Max / CazeTV" }),

  // R7
  makeJogoPaulistao({ id:1019, fase:"grupos", rodada:7, dia:"quarta-feira", data:"26/08/2026", hora:"15:00", mandante:"Corinthians", visitante:"Taubaté",      cidade:"São Paulo",  estadio:"Alfredo Schürig", detentor:"SporTV" }),
  makeJogoPaulistao({ id:1020, fase:"grupos", rodada:7, dia:"quarta-feira", data:"26/08/2026", hora:"15:00", mandante:"Palmeiras",   visitante:"RB Bragantino",cidade:"Barueri",    estadio:"Arena Barueri",   detentor:"Record News / HBO Max / CazeTV" }),

  // Quartas (chamada de "2ª Fase" pela FPF) — 2 confrontos ida/volta
  makeJogoPaulistao({ id:3001, fase:"quartas", rodada:1, dia:"quarta-feira", data:"18/11/2026", hora:"20:00" }),
  makeJogoPaulistao({ id:3002, fase:"quartas", rodada:1, dia:"quarta-feira", data:"18/11/2026", hora:"20:00" }),
  makeJogoPaulistao({ id:3003, fase:"quartas", rodada:2, dia:"domingo",      data:"22/11/2026", hora:"20:00" }),
  makeJogoPaulistao({ id:3004, fase:"quartas", rodada:2, dia:"domingo",      data:"22/11/2026", hora:"20:00" }),

  // Semifinal — 2 confrontos ida/volta
  makeJogoPaulistao({ id:4001, fase:"semi", rodada:1, dia:"quarta-feira", data:"09/12/2026", hora:"20:00" }),
  makeJogoPaulistao({ id:4002, fase:"semi", rodada:1, dia:"quarta-feira", data:"09/12/2026", hora:"20:00" }),
  makeJogoPaulistao({ id:4003, fase:"semi", rodada:2, dia:"domingo",      data:"13/12/2026", hora:"20:00" }),
  makeJogoPaulistao({ id:4004, fase:"semi", rodada:2, dia:"domingo",      data:"13/12/2026", hora:"20:00" }),

  // Final — 1 confronto ida/volta
  makeJogoPaulistao({ id:5001, fase:"final", rodada:1, dia:"quarta-feira", data:"16/12/2026", hora:"20:00" }),
  makeJogoPaulistao({ id:5002, fase:"final", rodada:2, dia:"domingo",      data:"20/12/2026", hora:"20:00" }),
];

// ─── SERVIÇOS FIXOS — Orçamento Feminino 2026 v4 (total R$ 238.000) ───────────
// Fonte: planilha "Fixos Sinal Inter - Orçado". Distribuição mensal (mai-dez)
// gravada em `mensal` para referência da equipe; não afeta o cálculo do orçado.
export const PAULISTAO_SERVICOS_INIT = [
  { secao:"Pessoal", itens:[
    { id:1, nome:"Coordenador Sinal Internacional", orcado:24000, provisionado:0, realizado:0,
      obs:"R$ 2k/semana · rodadas: mai 3, jul 2, ago 2, nov 2, dez 4",
      mensal:{ mai:6000, jun:0, jul:4000, ago:4000, set:0, out:0, nov:4000, dez:6000 } },
    { id:2, nome:"Editor de Vídeos",                 orcado:11000, provisionado:0, realizado:0,
      obs:"R$ 1k/semana",
      mensal:{ mai:3000, jun:0, jul:2000, ago:2000, set:0, out:0, nov:2000, dez:2000 } },
    { id:3, nome:"Editor de Vídeos 2",               orcado:7000,  provisionado:0, realizado:0,
      obs:"R$ 1k/semana",
      mensal:{ mai:3000, jun:0, jul:2000, ago:2000, set:0, out:0, nov:0, dez:0 } },
    { id:4, nome:"Desenvolvimento/Suporte Operacional VMIX", orcado:20000, provisionado:0, realizado:0,
      obs:"Redução conforme volume de jogos",
      mensal:{ mai:4000, jun:0, jul:0, ago:4000, set:2000, out:2000, nov:4000, dez:4000 } },
    { id:5, nome:"Desenvolvimento Cadê o Jogo",      orcado:0,     provisionado:0, realizado:0, obs:"" },
  ]},
  { secao:"Transmissão", itens:[
    { id:6, nome:"Estatísticas (Opta/Footstats)",         orcado:41000, provisionado:0, realizado:0, obs:"Aumento em relação a 2025" },
    { id:7, nome:"Ingest/Edição (WSC)",                   orcado:40000, provisionado:0, realizado:0, obs:"Custo FPF — confirmado" },
    { id:8, nome:"Media Day + Vinheta",                   orcado:60000, provisionado:0, realizado:0, obs:"" },
    { id:9, nome:"Espumas (produção + transporte)",       orcado:5000,  provisionado:0, realizado:0, obs:"" },
    { id:10,nome:"Festa de Encerramento",                  orcado:30000, provisionado:0, realizado:0, obs:"" },
  ]},
];
