import { CATS } from "./constants";

// ─── DEFAULTS DE CUSTO POR CENÁRIO ────────────────────────────────────────────
const PESSOAL     = {coord_um:1000,prod_um:0,prod_campo:400,monitoracao:0,supervisor1:800,supervisor2:800,dtv:800,vmix:500,audio:800};
const B1_SUL      = {outros_log:0,transporte:6000,uber:1000,hospedagem:2450,diaria:550,...PESSOAL,um_b1:85000,um_b2:0,geradores:4500,sng:6600,sng_extra:0,seg_espacial:4500,seg_extra:0,drone:2500,grua:4500,dslr:8500,carrinho:0,especial:15000,goalcam:4000,minidrone:2500,infra:6776,extra:0};
const B2_SUDESTE  = {outros_log:0,transporte:5000,uber:1000,hospedagem:1450,diaria:550,...PESSOAL,um_b1:0,um_b2:50000,geradores:4500,sng:6600,sng_extra:0,seg_espacial:4500,seg_extra:0,drone:2500,grua:4500,dslr:8500,carrinho:0,especial:0,goalcam:0,minidrone:0,infra:6776,extra:0};
const B2_SUL      = {outros_log:0,transporte:10010,uber:1200,hospedagem:3150,diaria:640,...PESSOAL,um_b1:0,um_b2:50000,geradores:6000,sng:7920,sng_extra:0,seg_espacial:4500,seg_extra:0,drone:3500,grua:9000,dslr:10500,carrinho:0,especial:0,goalcam:0,minidrone:0,infra:6776,extra:0};

export const allSubKeys = () => { const r={}; CATS.forEach(c=>c.subs.forEach(s=>{r[s.key]=0;})); return r; };
export const getDefaults = (cat, regiao="sudeste") => { if(cat==="B1") return {...B1_SUL}; if(regiao==="sul") return {...B2_SUL}; return {...B2_SUDESTE}; };

const JOGO_CENARIO = {1:"b1",2:"b1",5:"b1",8:"b1",10:"b1",11:"b1",15:"b1",16:"b1",3:"b2s",9:"b2s",14:"b2s",6:"b2sul",4:"b2sul",7:"b2sul",12:"b2sul",13:"b2sul"};
export const getJogoDefaults = (id, cat, det) => {
  const c = JOGO_CENARIO[id];
  if(c==="b1")    return {...B1_SUL};
  if(c==="b2sul") return {...B2_SUL};
  if(c==="b2s")   return {...B2_SUDESTE};
  if(cat==="B1")  return {...B1_SUL};
  if(det==="CazeTV/Record/Premiere") return {...B2_SUL};
  return {...B2_SUDESTE};
};

export const makeJogo = (id, rodada, cat, cidade, data, hora, mandante, visitante, detentor) => {
  const defs = getJogoDefaults(id, cat, detentor);
  return { id, rodada, categoria:cat, cidade, data, hora, mandante, visitante, detentor, orcado:{...defs}, provisionado:{...allSubKeys()}, realizado:{...allSubKeys()} };
};

// ─── JOGOS ────────────────────────────────────────────────────────────────────
export const JOGOS_REAIS = [
  makeJogo(1,1,"B1","Rio de Janeiro","28/01","19:30","Fluminense","Grêmio","CazeTV/Record/Premiere"),
  makeJogo(2,1,"B1","Rio de Janeiro","29/01","21:30","Botafogo","Cruzeiro","Amazon"),
  makeJogo(3,2,"B2","Rio de Janeiro","05/02","20:00","Vasco","Chapecoense","Amazon"),
  makeJogo(4,2,"B2","Curitiba","18/02","19:30","Athletico PR","Corinthians","CazeTV/Record/Premiere"),
  makeJogo(5,3,"B1","Rio de Janeiro","12/02","19:30","Fluminense","Botafogo","CazeTV/Record/Premiere"),
  makeJogo(6,3,"B2","Porto Alegre","12/02","21:30","Internacional","Palmeiras","Amazon"),
  makeJogo(7,4,"B2","Curitiba","26/02","20:00","Coritiba","São Paulo","Amazon"),
  makeJogo(8,4,"B1","Rio de Janeiro","à definir","à definir","Botafogo","Vitória","CazeTV/Record/Premiere"),
  makeJogo(9,5,"B2","Mirassol","10/03","21:30","Mirassol","Santos","Amazon"),
  makeJogo(10,5,"B1","Rio de Janeiro","12/03","19:30","Vasco","Palmeiras","CazeTV/Record/Premiere"),
  makeJogo(11,6,"B1","Rio de Janeiro","14/03","20:30","Botafogo","Flamengo","Amazon"),
  makeJogo(12,6,"B2","Belo Horizonte","15/03","20:30","Cruzeiro","Vasco","CazeTV/Record/Premiere"),
  makeJogo(13,7,"B2","Curitiba","18/03","19:30","Athletico PR","Cruzeiro","CazeTV/Record/Premiere"),
  makeJogo(14,7,"B2","Chapecó","19/03","21:30","Chapecoense","Corinthians","Amazon"),
  makeJogo(15,8,"B1","Rio de Janeiro","21/03","18:30","Fluminense","Atlético MG","Amazon"),
  makeJogo(16,8,"B1","São Paulo","22/03","20:30","Corinthians","Flamengo","CazeTV/Record/Premiere"),
];

const TOTAL_JOGOS = 76;
const QTD_PLACEHOLDER = Math.max(0, TOTAL_JOGOS - JOGOS_REAIS.length);
export const JOGOS_PLACEHOLDER = Array.from({length:QTD_PLACEHOLDER}, (_,i) => {
  const rodada = 9+Math.floor(i/2), cat = i%2===0 ? "B1" : "B2";
  return { id:100+i, rodada, categoria:cat, cidade:"A definir", data:"A definir", hora:"A definir", mandante:"A definir", visitante:"A definir", detentor:"A definir", orcado:{...getDefaults(cat)}, provisionado:{...getDefaults(cat)}, realizado:{...allSubKeys()} };
});

export const ALL_JOGOS = [...JOGOS_REAIS, ...JOGOS_PLACEHOLDER];

// ─── SERVIÇOS FIXOS ───────────────────────────────────────────────────────────
export const SERVICOS_INIT = [
  { secao:"Pessoal", itens:[
    {id:1,nome:"Coordenador Sinal Internacional",orcado:0,provisionado:0,realizado:0,obs:""},
    {id:2,nome:"Produtor Campo/Detentores",orcado:0,provisionado:0,realizado:0,obs:""},
    {id:3,nome:"Produtor Assets/Pacote",orcado:0,provisionado:0,realizado:0,obs:""},
    {id:4,nome:"Editor de Imagens 1",orcado:0,provisionado:0,realizado:14900,obs:""},
    {id:5,nome:"Editor de Imagens 2",orcado:0,provisionado:0,realizado:0,obs:""},
  ]},
  { secao:"Transmissão", itens:[
    {id:6,nome:"Recepção Fibra para MMs, Antipirataria e Arquivo",orcado:234612,provisionado:0,realizado:0,obs:""},
  ]},
  { secao:"Serviços Complementares", itens:[
    {id:7,nome:"Antipirataria (Serviço LiveMode)",orcado:425600,provisionado:0,realizado:840,obs:""},
    {id:8,nome:"Estatísticas",orcado:120000,provisionado:0,realizado:7000,obs:""},
    {id:9,nome:"Ferramenta de Clipping",orcado:200000,provisionado:0,realizado:0,obs:""},
    {id:10,nome:"Media Day",orcado:300000,provisionado:0,realizado:0,obs:""},
    {id:11,nome:"Espumas",orcado:5000,provisionado:0,realizado:0,obs:""},
    {id:12,nome:"Grafismo",orcado:90000,provisionado:0,realizado:0,obs:""},
    {id:13,nome:"Vinheta + Trilha",orcado:35000,provisionado:0,realizado:16000,obs:""},
  ]},
];

// ─── CUSTOS FIXOS (APRESENTAÇÕES) ─────────────────────────────────────────────
export const CATS_FIXOS_INIT = [
  { id:"pessoal", label:"Pessoal", subs:[
    { id:1, nome:"Freelas Fixos", itens:[
      {id:1,nome:"Coordenador sinal internacional",orc:0,gasto:0,prov:0},
      {id:2,nome:"Produtor campo/detentores",orc:0,gasto:0,prov:0},
      {id:3,nome:"Produtor assets/pacote",orc:0,gasto:0,prov:0},
      {id:4,nome:"Editor de imagens 1",orc:0,gasto:14900,prov:0},
      {id:5,nome:"Editor de imagens 2",orc:0,gasto:0,prov:0},
    ]}
  ]},
  { id:"transmissao", label:"Transmissão", subs:[
    { id:2, nome:"Pacotes Mensais", itens:[
      {id:6,nome:"Recepção Fibra para MMs, Antipirataria e Arquivo",orc:234612,gasto:0,prov:234612},
    ]}
  ]},
  { id:"infra", label:"Serviços Complementares", subs:[
    { id:3, nome:"Serviços (Pacotes Mensais)", itens:[
      {id:7,nome:"Antipirataria (Serviço LiveMode)",orc:425600,gasto:840,prov:299160},
      {id:8,nome:"Estatísticas",orc:120000,gasto:7000,prov:49000},
      {id:9,nome:"Ferramenta de Clipping",orc:200000,gasto:0,prov:200000},
      {id:10,nome:"Media Day",orc:300000,gasto:0,prov:200000},
      {id:11,nome:"Espumas",orc:5000,gasto:0,prov:5000},
      {id:12,nome:"Grafismo",orc:90000,gasto:0,prov:90000},
      {id:13,nome:"Vinheta + Trilha",orc:35000,gasto:16000,prov:19000},
    ]}
  ]},
];
