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

// Mapeia o orçado granular da planilha (logistica/pessoal/operacao com subkeys)
// para o shape uniforme de subkeys do CATS. Campos zerados ficam implícitos.
const mapOrc = (log = {}, pess = {}, op = {}) => ({
  ...allSubKeysPaulistao(),
  // Logística (passagem somada com locado em "transporte" — Brasileirão usa mesma convenção)
  uber:        log.uber        || 0,
  transporte:  (log.locado || 0) + (log.passagem || 0),
  hospedagem:  log.hospedagem  || 0,
  diaria:      log.diaria_cache|| 0,
  // Pessoal — supervisor unificado em supervisor1
  coord_um:    pess.coord_um   || 0,
  prod_um:     pess.prod_um    || 0,
  prod_campo:  pess.prod_campo || 0,
  supervisor1: pess.supervisor || 0,
  dtv:         pess.dtv        || 0,
  vmix:        pess.vmix       || 0,
  // Operação
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

const SEED_VERSION = 3;

export const makeJogoPaulistao = (j) => {
  const {
    id, codigo_orcamento="", fase="grupos", grupo="-", rodada=1,
    cidade="A definir", estadio="A definir", dia="", data="A definir", hora="A definir",
    mandante="A definir", visitante="A definir", detentor="A definir",
    categoria="B3", dist="", logistica_modo="uber", equipe="",
    log={}, pess={}, op={},
    divergencia=false, nota_divergencia="",
  } = j;
  return {
    id, codigo_orcamento, seed_version: SEED_VERSION,
    fase, grupo, rodada,
    categoria, dist, logistica_modo, equipe,
    cidade, estadio, dia, data, hora, mandante, visitante, detentor,
    divergencia, nota_divergencia,
    orcado:       mapOrc(log, pess, op),
    provisionado: { ...allSubKeysPaulistao() },
    realizado:    { ...allSubKeysPaulistao() },
  };
};

// ─── SEED PADRÃO — Paulistão Feminino 2026 (orçamento aprovado) ────────────────
// Times: Palmeiras, Mirassol, Ferroviária, Santos, Corinthians, São Paulo, RB Bragantino, Taubaté.
// Primeira Fase: 7 rodadas turno único (20 jogos divulgados; demais a divulgar).
// Play In: 4 jogos · Semifinal: 4 jogos (ida/volta) · Final: 2 jogos (ida/volta).
export const PAULISTAO_GRUPOS = ["-"];

// Padrões reutilizáveis de pessoal/operação para reduzir repetição na seed.
// Equipes: SP-B (sem coordenador na 1ª rodada/rodadas iniciais sem coord) e RIB (interior).
// Operação por categoria (B3/B3+): UM B3 + geradores + sng + seg_espacial + downlink + distr + maquinas.
const P_SPB_SEM_COORD = { coord_um:0,   prod_um:400, prod_campo:400, supervisor:600 };  // 1.400
const P_SPB_COM_COORD = { coord_um:600, prod_um:400, prod_campo:400, supervisor:600 };  // 2.000
const P_SEMI_FINAL    = { coord_um:800, prod_um:400, prod_campo:400, supervisor:800 };  // 2.400

// Operações comuns (b3 grande SP / b3 SP / b3 SP400 / etc) — diferenças nos geradores e UM
const OP_B3_GSP        = { um_b3:24000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958 }; // 37.408
const OP_B3_GSP_VESP   = { um_b3:24000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250 }; // 37.658
const OP_B3PLUS_SP     = { um_b3:23000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958 }; // 36.408
const OP_B3PLUS_SP_V   = { um_b3:23000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250 }; // 36.658
const OP_B3_COTIA      = { um_b3:21000, geradores:3000, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958 }; // 34.208
const OP_B3_COTIA_V    = { um_b3:21000, geradores:3000, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250 }; // 34.458
const OP_B3_SP400      = { um_b3:24000, geradores:3500, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958 }; // 37.708
const OP_B3_SP400_V    = { um_b3:24000, geradores:3500, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250 }; // 37.958
const OP_B3PLUS_SAN    = { um_b3:24000, geradores:3800, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250 }; // 38.258
const OP_B3_SAN200     = { um_b3:24000, geradores:3800, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958 }; // 38.008
const OP_B3_SP200_V    = { um_b3:24000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250 }; // 37.658
const OP_B3_TAU        = { um_b3:24000, geradores:3500, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250, extra:9450 }; // 47.408
const OP_B3_BAL        = { um_b3:28000, geradores:5500, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250 }; // 43.958
const OP_B3_BAL_S      = { um_b3:28000, geradores:5500, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958 }; // 43.708
const OP_PIN1          = { um_b3:23000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250, extra:9060 }; // 45.718
const OP_PIN2          = { um_b3:23000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958 }; // 36.408
const OP_PIN3          = { um_b3:24000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958 }; // 37.408
const OP_PIN4          = { um_b3:28000, geradores:5500, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, maquinas:958, montagem_vespera:250 }; // 43.958
const OP_SEMI_SP       = { um_b3:23000, geradores:3200, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, liveu:1500, maquinas:958 }; // 37.908
const OP_SEMI_SP200    = { um_b3:24000, geradores:3800, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, liveu:1500, maquinas:958, montagem_vespera:250 }; // 39.758
const OP_SEMI_SP400    = { um_b3:28000, geradores:5500, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, liveu:1500, maquinas:958 }; // 45.208
const OP_FIN_SP200     = { um_b2:28000, geradores:4100, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, liveu:1500, maquinas:958, extra:10830 }; // 54.638
const OP_FIN_SP400     = { um_b2:28000, geradores:4100, sng:4000, seg_espacial:3250, downlink:1000, distribuicao:1000, liveu:1500, maquinas:958, extra:10830 }; // 54.638

// Logística por modo
const L_UBER       = { uber:250 };                              // 250
const L_VAN_SP     = { uber:250, locado:1200 };                 // 1.450
const L_VAN_INT    = { uber:250, locado:2600 };                 // 2.850
const L_VAN_INT_2K = { uber:250, locado:2000 };                 // 2.250 — Ferroviária (interior próximo)

export const PAULISTAO_JOGOS_INIT = [
  // ── Primeira Fase ──────────────────────────────────────────────────────────
  makeJogoPaulistao({ id:1001, codigo_orcamento:"PAL1", fase:"grupos", rodada:1, dia:"quarta-feira", data:"06/05/2026", hora:"18:00", mandante:"Palmeiras",     visitante:"Mirassol",      cidade:"Barueri",     estadio:"Arena Barueri",                  detentor:"SporTV",                          dist:"Grande SP", categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_SEM_COORD, op:OP_B3_GSP }),
  makeJogoPaulistao({ id:1002, codigo_orcamento:"FER1", fase:"grupos", rodada:1, dia:"quarta-feira", data:"06/05/2026", hora:"20:00", mandante:"Ferroviária",   visitante:"Santos",         cidade:"Araraquara",  estadio:"Fonte Luminosa",                 detentor:"Record News / HBO Max / CazeTV", dist:"SP400",     categoria:"B3",  logistica_modo:"van interior", equipe:"equipe RIB",  log:L_VAN_INT_2K,  pess:P_SPB_COM_COORD, op:OP_B3_SP400 }),
  makeJogoPaulistao({ id:1003, codigo_orcamento:"COR1", fase:"grupos", rodada:1, dia:"quinta-feira", data:"07/05/2026", hora:"21:30", mandante:"Corinthians",   visitante:"São Paulo",      cidade:"São Paulo",   estadio:"Alfredo Schürig",                detentor:"SporTV",                          dist:"SP",        categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_SEM_COORD, op:OP_B3PLUS_SP }),

  makeJogoPaulistao({ id:1004, codigo_orcamento:"MIR1", fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"16:00", mandante:"Mirassol",      visitante:"Ferroviária",    cidade:"Bálsamo",     estadio:"Manuel Francisco Ferreira",      detentor:"SporTV",                          dist:"SP400",     categoria:"B3",  logistica_modo:"van interior", equipe:"equipe RIB",  log:L_VAN_INT,     pess:P_SPB_COM_COORD, op:OP_B3_BAL }),
  makeJogoPaulistao({ id:1005, codigo_orcamento:"RBB1", fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"17:30", mandante:"RB Bragantino", visitante:"Corinthians",    cidade:"Rio Claro",   estadio:"Benito Agnelo Castellano",       detentor:"Record / HBO Max",                dist:"SP200",     categoria:"B3",  logistica_modo:"van SP",        equipe:"equipe SP-B", log:L_VAN_SP,      pess:P_SPB_COM_COORD, op:OP_B3_SP200_V, divergencia:true, nota_divergencia:"Orçamento previa Bragança Paulista, jogo real é em Rio Claro." }),
  makeJogoPaulistao({ id:1006, codigo_orcamento:"SAN1", fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"19:30", mandante:"Santos",        visitante:"Palmeiras",      cidade:"Santos",      estadio:"Vila Belmiro",                   detentor:"Record News / HBO Max / CazeTV", dist:"SP200",     categoria:"B3+", logistica_modo:"van SP",        equipe:"equipe SP-B", log:L_VAN_SP,      pess:P_SPB_COM_COORD, op:OP_B3PLUS_SAN }),
  makeJogoPaulistao({ id:1007, codigo_orcamento:"SAO1", fase:"grupos", rodada:2, dia:"quinta-feira", data:"14/05/2026", hora:"21:00", mandante:"São Paulo",     visitante:"Taubaté",        cidade:"Cotia",       estadio:"Marcelo Portugal Gouvêa",        detentor:"SporTV",                          dist:"Grande SP", categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_SEM_COORD, op:OP_B3_COTIA }),

  makeJogoPaulistao({ id:1008, codigo_orcamento:"FER2", fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"18:00", mandante:"Ferroviária",   visitante:"Palmeiras",      cidade:"Araraquara",  estadio:"Fonte Luminosa",                 detentor:"SporTV",                          dist:"SP400",     categoria:"B3",  logistica_modo:"van interior", equipe:"equipe RIB",  log:L_VAN_INT_2K,  pess:P_SPB_COM_COORD, op:OP_B3_SP400_V }),
  makeJogoPaulistao({ id:1009, codigo_orcamento:"COR2", fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"19:30", mandante:"Corinthians",   visitante:"Santos",         cidade:"São Paulo",   estadio:"Alfredo Schürig",                detentor:"Record News / HBO Max / CazeTV", dist:"SP",        categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_SEM_COORD, op:OP_B3PLUS_SP_V }),
  makeJogoPaulistao({ id:1010, codigo_orcamento:"SAO2", fase:"grupos", rodada:3, dia:"quinta-feira", data:"21/05/2026", hora:"21:00", mandante:"São Paulo",     visitante:"RB Bragantino",  cidade:"Cotia",       estadio:"Marcelo Portugal Gouvêa",        detentor:"SporTV",                          dist:"Grande SP", categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_SEM_COORD, op:OP_B3_COTIA }),

  makeJogoPaulistao({ id:1011, codigo_orcamento:"COR3", fase:"grupos", rodada:4, dia:"sexta-feira",  data:"17/07/2026", hora:"15:00", mandante:"Corinthians",   visitante:"Ferroviária",    cidade:"São Paulo",   estadio:"Alfredo Schürig",                detentor:"Record News / HBO Max / CazeTV", dist:"SP",        categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_COM_COORD, op:OP_B3PLUS_SP }),
  makeJogoPaulistao({ id:1012, codigo_orcamento:"PAL2", fase:"grupos", rodada:4, dia:"sexta-feira",  data:"17/07/2026", hora:"15:00", mandante:"Palmeiras",     visitante:"São Paulo",      cidade:"Barueri",     estadio:"Arena Barueri",                  detentor:"SporTV",                          dist:"Grande SP", categoria:"B3+", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_SEM_COORD, op:OP_B3_GSP }),

  makeJogoPaulistao({ id:1013, codigo_orcamento:"PAL3", fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"Palmeiras",     visitante:"Corinthians",    cidade:"Barueri",     estadio:"Arena Barueri",                  detentor:"SporTV",                          dist:"Grande SP", categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_COM_COORD, op:OP_B3_GSP }),
  makeJogoPaulistao({ id:1014, codigo_orcamento:"SAN2", fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"RB Bragantino", visitante:"Santos",         cidade:"Rio Claro",   estadio:"Benito Agnelo Castellano",       detentor:"SporTV",                          dist:"SP200",     categoria:"B3",  logistica_modo:"van SP",        equipe:"equipe SP-B", log:L_VAN_SP,      pess:P_SPB_COM_COORD, op:OP_B3_SAN200, divergencia:true, nota_divergencia:"Orçamento previa Santos como mandante. Jogo real tem RB Bragantino como mandante em Rio Claro." }),
  makeJogoPaulistao({ id:1015, codigo_orcamento:"SAO3", fase:"grupos", rodada:5, dia:"quarta-feira", data:"29/07/2026", hora:"15:00", mandante:"São Paulo",     visitante:"Mirassol",       cidade:"Cotia",       estadio:"Marcelo Portugal Gouvêa",        detentor:"Record News / HBO Max / CazeTV", dist:"Grande SP", categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_COM_COORD, op:OP_B3_COTIA_V }),

  makeJogoPaulistao({ id:1016, codigo_orcamento:"TAU1", fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"Taubaté",       visitante:"Palmeiras",      cidade:"Taubaté",     estadio:"Estádio Joaquim de Morais Filho",detentor:"SporTV",                          dist:"SP200",     categoria:"B3",  logistica_modo:"van SP",        equipe:"equipe SP-B", log:L_VAN_SP,      pess:P_SPB_COM_COORD, op:OP_B3_TAU }),
  makeJogoPaulistao({ id:1017, codigo_orcamento:"MIR2", fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"Mirassol",      visitante:"Corinthians",    cidade:"Bálsamo",     estadio:"Manuel Francisco Ferreira",      detentor:"SporTV",                          dist:"SP400",     categoria:"B3",  logistica_modo:"van interior", equipe:"equipe RIB",  log:L_VAN_INT,     pess:P_SPB_COM_COORD, op:OP_B3_BAL_S }),
  makeJogoPaulistao({ id:1018, codigo_orcamento:"SAN3", fase:"grupos", rodada:6, dia:"quarta-feira", data:"12/08/2026", hora:"15:00", mandante:"São Paulo",     visitante:"Santos",         cidade:"Cotia",       estadio:"Marcelo Portugal Gouvêa",        detentor:"Record News / HBO Max / CazeTV", dist:"SP200",     categoria:"B3",  logistica_modo:"van SP",        equipe:"equipe SP-B", log:L_VAN_SP,      pess:P_SPB_COM_COORD, op:OP_B3_SAN200, divergencia:true, nota_divergencia:"Orçamento previa Santos como mandante. Jogo real tem São Paulo como mandante em Cotia." }),

  makeJogoPaulistao({ id:1019, codigo_orcamento:"COR4", fase:"grupos", rodada:7, dia:"quarta-feira", data:"26/08/2026", hora:"15:00", mandante:"Corinthians",   visitante:"Taubaté",        cidade:"São Paulo",   estadio:"Alfredo Schürig",                detentor:"SporTV",                          dist:"SP",        categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_COM_COORD, op:OP_B3PLUS_SP }),
  makeJogoPaulistao({ id:1020, codigo_orcamento:"PAL4", fase:"grupos", rodada:7, dia:"quarta-feira", data:"26/08/2026", hora:"15:00", mandante:"Palmeiras",     visitante:"RB Bragantino",  cidade:"Barueri",     estadio:"Arena Barueri",                  detentor:"Record News / HBO Max / CazeTV", dist:"Grande SP", categoria:"B3",  logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,        pess:P_SPB_COM_COORD, op:OP_B3_GSP_VESP }),

  // ── Play In ────────────────────────────────────────────────────────────────
  makeJogoPaulistao({ id:3001, codigo_orcamento:"P-IN1", fase:"play_in", rodada:1, dist:"SP",    categoria:"B3", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,    pess:P_SPB_COM_COORD, op:OP_PIN1 }),
  makeJogoPaulistao({ id:3002, codigo_orcamento:"P-IN2", fase:"play_in", rodada:2, dist:"SP",    categoria:"B3", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,    pess:P_SPB_COM_COORD, op:OP_PIN2 }),
  makeJogoPaulistao({ id:3003, codigo_orcamento:"P-IN3", fase:"play_in", rodada:3, dist:"SP200", categoria:"B3", logistica_modo:"van SP",        equipe:"equipe SP-B", log:L_VAN_SP,  pess:P_SPB_COM_COORD, op:OP_PIN3 }),
  makeJogoPaulistao({ id:3004, codigo_orcamento:"P-IN4", fase:"play_in", rodada:4, dist:"SP400", categoria:"B3", logistica_modo:"van interior", equipe:"equipe SP-B", log:L_VAN_INT, pess:P_SPB_COM_COORD, op:OP_PIN4 }),

  // ── Semifinal (ida 09/12 + volta 13/12) ────────────────────────────────────
  makeJogoPaulistao({ id:4001, codigo_orcamento:"SEMI1", fase:"semi", rodada:1, dia:"quarta-feira", data:"09/12/2026", hora:"20:00", dist:"SP",    categoria:"B3", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,    pess:P_SEMI_FINAL, op:OP_SEMI_SP }),
  makeJogoPaulistao({ id:4002, codigo_orcamento:"SEMI2", fase:"semi", rodada:2, dia:"quarta-feira", data:"09/12/2026", hora:"20:00", dist:"SP",    categoria:"B3", logistica_modo:"uber",          equipe:"equipe SP-B", log:L_UBER,    pess:P_SEMI_FINAL, op:OP_SEMI_SP }),
  makeJogoPaulistao({ id:4003, codigo_orcamento:"SEMI3", fase:"semi", rodada:3, dia:"domingo",      data:"13/12/2026", hora:"20:00", dist:"SP200", categoria:"B3", logistica_modo:"van SP",        equipe:"equipe SP-B", log:L_VAN_SP,  pess:P_SEMI_FINAL, op:OP_SEMI_SP200 }),
  makeJogoPaulistao({ id:4004, codigo_orcamento:"SEMI4", fase:"semi", rodada:4, dia:"domingo",      data:"13/12/2026", hora:"20:00", dist:"SP400", categoria:"B3", logistica_modo:"van interior", equipe:"equipe SP-B", log:L_VAN_INT, pess:P_SEMI_FINAL, op:OP_SEMI_SP400 }),

  // ── Final (ida 16/12 + volta 20/12) ────────────────────────────────────────
  makeJogoPaulistao({ id:5001, codigo_orcamento:"FIN1", fase:"final", rodada:1, dia:"quarta-feira", data:"16/12/2026", hora:"20:00", dist:"SP200", categoria:"B2", logistica_modo:"van SP",        equipe:"equipe SP-B", log:L_VAN_SP,  pess:P_SEMI_FINAL, op:OP_FIN_SP200 }),
  makeJogoPaulistao({ id:5002, codigo_orcamento:"FIN2", fase:"final", rodada:2, dia:"domingo",      data:"20/12/2026", hora:"20:00", dist:"SP400", categoria:"B2", logistica_modo:"van interior", equipe:"equipe SP-B", log:L_VAN_INT, pess:P_SEMI_FINAL, op:OP_FIN_SP400 }),
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
