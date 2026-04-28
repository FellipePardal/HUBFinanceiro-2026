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

// Cria jogo do Paulistão com orçado mapeado por bloco (logística/pessoal/operação)
// onde o valor de cada bloco é depositado em uma subkey representativa do CATS:
//   logística → uber (modo "uber") OU transporte (modos "van SP"/"van interior")
//   pessoal   → coord_um (consolidado; pode ser refinado em VisaoMicro)
//   operação  → um_b2  (consolidado; pode ser refinado em VisaoMicro)
const buildOrcado = (logModo, ol, op, oo) => {
  const orc = allSubKeysPaulistao();
  if (logModo === "uber") orc.uber = ol; else orc.transporte = ol;
  orc.coord_um = op;
  orc.um_b2    = oo;
  return orc;
};

export const makeJogoPaulistao = (j) => {
  const {
    id, codigo_orcamento="", fase="grupos", grupo="-", rodada=1,
    cidade="A definir", estadio="A definir", dia="", data="A definir", hora="A definir",
    mandante="A definir", visitante="A definir", detentor="A definir",
    categoria="B3", dist="", logistica_modo="uber", equipe="",
    orcado_logistica=0, orcado_pessoal=0, orcado_operacao=0,
    divergencia=false, nota_divergencia="",
  } = j;
  return {
    id, codigo_orcamento, fase, grupo, rodada,
    categoria, dist, logistica_modo, equipe,
    cidade, estadio, dia, data, hora, mandante, visitante, detentor,
    divergencia, nota_divergencia,
    orcado:       buildOrcado(logistica_modo, orcado_logistica, orcado_pessoal, orcado_operacao),
    provisionado: { ...allSubKeysPaulistao() },
    realizado:    { ...allSubKeysPaulistao() },
  };
};

// ─── SEED PADRÃO — Paulistão Feminino 2026 (orçamento aprovado) ────────────────
// Times: Palmeiras, Mirassol, Ferroviária, Santos, Corinthians, São Paulo, RB Bragantino, Taubaté.
// Primeira Fase: 7 rodadas turno único (20 jogos divulgados; demais a divulgar).
// Play In: 4 jogos · Semifinal: 4 jogos (ida/volta) · Final: 2 jogos (ida/volta).
export const PAULISTAO_GRUPOS = ["-"];

export const PAULISTAO_JOGOS_INIT = [
  // ── Primeira Fase ──────────────────────────────────────────────────────────
  makeJogoPaulistao({ id:1001, codigo_orcamento:"PAL1", fase:"grupos", rodada:1, dia:"quarta-feira", data:"06/05/2026", hora:"18:00", mandante:"Palmeiras",     visitante:"Mirassol",      cidade:"Barueri",     estadio:"Arena Barueri",                 detentor:"SporTV",                          dist:"Grande SP", categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:1400, orcado_operacao:37408 }),
  makeJogoPaulistao({ id:1002, codigo_orcamento:"FER1", fase:"grupos", rodada:1, dia:"quarta-feira", data:"06/05/2026", hora:"20:00", mandante:"Ferroviária",  visitante:"Santos",         cidade:"Araraquara",  estadio:"Fonte Luminosa",                detentor:"Record News / HBO Max / CazeTV", dist:"SP400",     categoria:"B3",  logistica_modo:"van interior", equipe:"equipe RIB",  orcado_logistica:2250, orcado_pessoal:2000, orcado_operacao:37708 }),
  makeJogoPaulistao({ id:1003, codigo_orcamento:"COR1", fase:"grupos", rodada:1, dia:"quinta-feira", data:"07/05/2026", hora:"21:30", mandante:"Corinthians",  visitante:"São Paulo",      cidade:"São Paulo",   estadio:"Alfredo Schürig",               detentor:"SporTV",                          dist:"SP",        categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:1400, orcado_operacao:36408 }),

  makeJogoPaulistao({ id:1004, codigo_orcamento:"MIR1", fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"16:00", mandante:"Mirassol",     visitante:"Ferroviária",    cidade:"Bálsamo",     estadio:"Manuel Francisco Ferreira",     detentor:"SporTV",                          dist:"SP400",     categoria:"B3",  logistica_modo:"van interior", equipe:"equipe RIB",  orcado_logistica:2850, orcado_pessoal:2000, orcado_operacao:43958 }),
  makeJogoPaulistao({ id:1005, codigo_orcamento:"RBB1", fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"17:30", mandante:"RB Bragantino",visitante:"Corinthians",    cidade:"Rio Claro",   estadio:"Benito Agnelo Castellano",      detentor:"Record / HBO Max",                dist:"SP200",     categoria:"B3",  logistica_modo:"van SP",        equipe:"equipe SP-B", orcado_logistica:1450, orcado_pessoal:2000, orcado_operacao:37658, divergencia:true, nota_divergencia:"Orçamento previa cidade Bragança Paulista, jogo real é em Rio Claro. Logística mantida mas custo pode variar." }),
  makeJogoPaulistao({ id:1006, codigo_orcamento:"SAN1", fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"19:30", mandante:"Santos",       visitante:"Palmeiras",      cidade:"Santos",      estadio:"Vila Belmiro",                  detentor:"Record News / HBO Max / CazeTV", dist:"SP200",     categoria:"B3+", logistica_modo:"van SP",        equipe:"equipe SP-B", orcado_logistica:1450, orcado_pessoal:2000, orcado_operacao:38258 }),
  makeJogoPaulistao({ id:1007, codigo_orcamento:"SAO1", fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"21:00", mandante:"São Paulo",    visitante:"Taubaté",        cidade:"Cotia",       estadio:"Marcelo Portugal Gouvêa",       detentor:"SporTV",                          dist:"Grande SP", categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:1400, orcado_operacao:34208 }),

  makeJogoPaulistao({ id:1008, codigo_orcamento:"FER2", fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"18:00", mandante:"Ferroviária",  visitante:"Palmeiras",      cidade:"Araraquara",  estadio:"Fonte Luminosa",                detentor:"SporTV",                          dist:"SP400",     categoria:"B3",  logistica_modo:"van interior", equipe:"equipe RIB",  orcado_logistica:2250, orcado_pessoal:2000, orcado_operacao:37958 }),
  makeJogoPaulistao({ id:1009, codigo_orcamento:"COR2", fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"19:30", mandante:"Corinthians",  visitante:"Santos",         cidade:"São Paulo",   estadio:"Alfredo Schürig",               detentor:"Record News / HBO Max / CazeTV", dist:"SP",        categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:1400, orcado_operacao:36658 }),
  makeJogoPaulistao({ id:1010, codigo_orcamento:"SAO2", fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"21:00", mandante:"São Paulo",    visitante:"RB Bragantino",  cidade:"Cotia",       estadio:"Marcelo Portugal Gouvêa",       detentor:"SporTV",                          dist:"Grande SP", categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:1400, orcado_operacao:34208 }),

  makeJogoPaulistao({ id:1011, codigo_orcamento:"COR3", fase:"grupos", rodada:4, dia:"sexta-feira",  data:"17/07/2026", hora:"15:00", mandante:"Corinthians",  visitante:"Ferroviária",    cidade:"São Paulo",   estadio:"Alfredo Schürig",               detentor:"Record News / HBO Max / CazeTV", dist:"SP",        categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2000, orcado_operacao:36408 }),
  makeJogoPaulistao({ id:1012, codigo_orcamento:"PAL2", fase:"grupos", rodada:4, dia:"sexta-feira",  data:"17/07/2026", hora:"15:00", mandante:"Palmeiras",    visitante:"São Paulo",      cidade:"Barueri",     estadio:"Arena Barueri",                 detentor:"SporTV",                          dist:"Grande SP", categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:1400, orcado_operacao:37408 }),

  makeJogoPaulistao({ id:1013, codigo_orcamento:"PAL3", fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"Palmeiras",    visitante:"Corinthians",    cidade:"Barueri",     estadio:"Arena Barueri",                 detentor:"SporTV",                          dist:"Grande SP", categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2000, orcado_operacao:37408 }),
  makeJogoPaulistao({ id:1014, codigo_orcamento:"SAN2", fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"RB Bragantino",visitante:"Santos",         cidade:"Rio Claro",   estadio:"Benito Agnelo Castellano",      detentor:"SporTV",                          dist:"SP200",     categoria:"B3",  logistica_modo:"van SP",        equipe:"equipe SP-B", orcado_logistica:1450, orcado_pessoal:2000, orcado_operacao:38008, divergencia:true, nota_divergencia:"Orçamento previa Santos como mandante. Jogo real tem RB Bragantino como mandante em Rio Claro." }),
  makeJogoPaulistao({ id:1015, codigo_orcamento:"SAO3", fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"São Paulo",    visitante:"Mirassol",       cidade:"Cotia",       estadio:"Marcelo Portugal Gouvêa",       detentor:"Record News / HBO Max / CazeTV", dist:"Grande SP", categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2000, orcado_operacao:34458 }),

  makeJogoPaulistao({ id:1016, codigo_orcamento:"TAU1", fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"Taubaté",      visitante:"Palmeiras",      cidade:"Taubaté",     estadio:"Estádio Joaquim de Morais Filho",detentor:"SporTV",                         dist:"SP200",     categoria:"B3",  logistica_modo:"van SP",        equipe:"equipe SP-B", orcado_logistica:1450, orcado_pessoal:2000, orcado_operacao:47408 }),
  makeJogoPaulistao({ id:1017, codigo_orcamento:"MIR2", fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"Mirassol",     visitante:"Corinthians",    cidade:"Bálsamo",     estadio:"Manuel Francisco Ferreira",     detentor:"SporTV",                          dist:"SP400",     categoria:"B3",  logistica_modo:"van interior", equipe:"equipe RIB",  orcado_logistica:2850, orcado_pessoal:2000, orcado_operacao:43708 }),
  makeJogoPaulistao({ id:1018, codigo_orcamento:"SAN3", fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"São Paulo",    visitante:"Santos",         cidade:"Cotia",       estadio:"Marcelo Portugal Gouvêa",       detentor:"Record News / HBO Max / CazeTV", dist:"SP200",     categoria:"B3",  logistica_modo:"van SP",        equipe:"equipe SP-B", orcado_logistica:1450, orcado_pessoal:2000, orcado_operacao:38008, divergencia:true, nota_divergencia:"Orçamento previa Santos como mandante. Jogo real tem São Paulo como mandante em Cotia." }),

  makeJogoPaulistao({ id:1019, codigo_orcamento:"COR4", fase:"grupos", rodada:7, dia:"quarta-feira", data:"26/08/2026", hora:"15:00", mandante:"Corinthians",  visitante:"Taubaté",        cidade:"São Paulo",   estadio:"Alfredo Schürig",               detentor:"SporTV",                          dist:"SP",        categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2000, orcado_operacao:36408 }),
  makeJogoPaulistao({ id:1020, codigo_orcamento:"PAL4", fase:"grupos", rodada:7, dia:"quarta-feira", data:"26/08/2026", hora:"15:00", mandante:"Palmeiras",    visitante:"RB Bragantino",  cidade:"Barueri",     estadio:"Arena Barueri",                 detentor:"Record News / HBO Max / CazeTV", dist:"Grande SP", categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2000, orcado_operacao:37658 }),

  // ── Play In (4 jogos placeholders) ─────────────────────────────────────────
  makeJogoPaulistao({ id:3001, codigo_orcamento:"P-IN1", fase:"play_in", rodada:1, dist:"SP",     categoria:"B3", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2000, orcado_operacao:45718 }),
  makeJogoPaulistao({ id:3002, codigo_orcamento:"P-IN2", fase:"play_in", rodada:2, dist:"SP",     categoria:"B3", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2000, orcado_operacao:36408 }),
  makeJogoPaulistao({ id:3003, codigo_orcamento:"P-IN3", fase:"play_in", rodada:3, dist:"SP200",  categoria:"B3", logistica_modo:"van SP",        equipe:"equipe SP-B", orcado_logistica:1450, orcado_pessoal:2000, orcado_operacao:37408 }),
  makeJogoPaulistao({ id:3004, codigo_orcamento:"P-IN4", fase:"play_in", rodada:4, dist:"SP400",  categoria:"B3", logistica_modo:"van interior", equipe:"equipe SP-B", orcado_logistica:2850, orcado_pessoal:2000, orcado_operacao:43958 }),

  // ── Semifinal (ida 09/12 + volta 13/12) ────────────────────────────────────
  makeJogoPaulistao({ id:4001, codigo_orcamento:"SEMI1", fase:"semi", rodada:1, dia:"quarta-feira", data:"09/12/2026", hora:"20:00", dist:"SP",    categoria:"B3", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2400, orcado_operacao:37908 }),
  makeJogoPaulistao({ id:4002, codigo_orcamento:"SEMI2", fase:"semi", rodada:2, dia:"quarta-feira", data:"09/12/2026", hora:"20:00", dist:"SP",    categoria:"B3", logistica_modo:"uber",          equipe:"equipe SP-B", orcado_logistica:250,  orcado_pessoal:2400, orcado_operacao:37908 }),
  makeJogoPaulistao({ id:4003, codigo_orcamento:"SEMI3", fase:"semi", rodada:3, dia:"domingo",      data:"13/12/2026", hora:"20:00", dist:"SP200", categoria:"B3", logistica_modo:"van SP",        equipe:"equipe SP-B", orcado_logistica:1450, orcado_pessoal:2400, orcado_operacao:39758 }),
  makeJogoPaulistao({ id:4004, codigo_orcamento:"SEMI4", fase:"semi", rodada:4, dia:"domingo",      data:"13/12/2026", hora:"20:00", dist:"SP400", categoria:"B3", logistica_modo:"van interior", equipe:"equipe SP-B", orcado_logistica:2850, orcado_pessoal:2400, orcado_operacao:45208 }),

  // ── Final (ida 16/12 + volta 20/12) ────────────────────────────────────────
  makeJogoPaulistao({ id:5001, codigo_orcamento:"FIN1", fase:"final", rodada:1, dia:"quarta-feira", data:"16/12/2026", hora:"20:00", dist:"SP200", categoria:"B2", logistica_modo:"van SP",        equipe:"equipe SP-B", orcado_logistica:1450, orcado_pessoal:2400, orcado_operacao:54638 }),
  makeJogoPaulistao({ id:5002, codigo_orcamento:"FIN2", fase:"final", rodada:2, dia:"domingo",      data:"20/12/2026", hora:"20:00", dist:"SP400", categoria:"B2", logistica_modo:"van interior", equipe:"equipe SP-B", orcado_logistica:2850, orcado_pessoal:2400, orcado_operacao:54638 }),
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
