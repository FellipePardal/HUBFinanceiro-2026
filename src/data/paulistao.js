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
export const makeJogoPaulistao = ({ id, fase="grupos", grupo="A", rodada=1, cidade="A definir", data="A definir", hora="A definir", mandante="A definir", visitante="A definir", detentor="A definir" }) => {
  const defs = getPaulistaoDefaults();
  return {
    id, fase, grupo, rodada,
    categoria:"PAU",
    cidade, data, hora, mandante, visitante, detentor,
    orcado: { ...defs },
    provisionado: { ...allSubKeysPaulistao() },
    realizado: { ...allSubKeysPaulistao() },
  };
};

// ─── SEED PADRÃO ──────────────────────────────────────────────────────────────
// Estrutura típica do Paulistão Feminino: 16 times divididos em 4 grupos (A-D).
// Fase de Grupos: 12 rodadas (cada time joga 12 partidas — turno único entre todos).
// Mata-mata: 8 jogos oitavas (jogo único) + 4 quartas + 2 semis + 1 final (jogo único ou ida/volta).
// Aqui criamos placeholders ajustáveis. A definição real virá do operador.

const PLACEHOLDERS_GRUPOS_QTDE = 12; // rodadas iniciais sem jogos definidos
export const PAULISTAO_GRUPOS = ["A","B","C","D"];

const placeholdersGrupos = Array.from({ length: PLACEHOLDERS_GRUPOS_QTDE * 4 }, (_, i) => {
  const rodada = Math.floor(i/4) + 1;
  const grupo  = PAULISTAO_GRUPOS[i % 4];
  return makeJogoPaulistao({ id: 1000 + i, fase:"grupos", grupo, rodada });
});

const placeholdersMata = [
  ...Array.from({ length:8 }, (_,i) => makeJogoPaulistao({ id: 2000+i, fase:"oitavas", grupo:"-", rodada:1 })),
  ...Array.from({ length:4 }, (_,i) => makeJogoPaulistao({ id: 3000+i, fase:"quartas", grupo:"-", rodada:1 })),
  ...Array.from({ length:2 }, (_,i) => makeJogoPaulistao({ id: 4000+i, fase:"semi",    grupo:"-", rodada:1 })),
  makeJogoPaulistao({ id: 5000, fase:"final", grupo:"-", rodada:1 }),
];

export const PAULISTAO_JOGOS_INIT = [...placeholdersGrupos, ...placeholdersMata];

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
