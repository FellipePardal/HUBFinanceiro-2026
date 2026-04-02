// ─── TEMAS ────────────────────────────────────────────────────────────────────
export const DARK  = { bg:"#0f172a", card:"#1e293b", border:"#334155", muted:"#475569", text:"#f1f5f9", textMd:"#94a3b8", textSm:"#64748b" };
export const LIGHT = { bg:"#f8fafc", card:"#ffffff", border:"#e2e8f0", muted:"#cbd5e1", text:"#1e293b", textMd:"#475569", textSm:"#64748b" };

// ─── LISTAS ───────────────────────────────────────────────────────────────────
export const DETENTORES = ["CazeTV/Record/Premiere","Amazon","A definir"];
export const CIDADES    = ["Rio de Janeiro","São Paulo","Curitiba","Belo Horizonte","Porto Alegre","Chapecó","Mirassol","Outro"];
export const TIMES      = ["Fluminense","Botafogo","Flamengo","Vasco","Corinthians","Palmeiras","São Paulo","Athletico PR","Grêmio","Internacional","Cruzeiro","Atlético MG","Chapecoense","Santos","Vitória","Mirassol","Coritiba","Outro"];

// ─── CATEGORIAS DE CUSTO ──────────────────────────────────────────────────────
export const CATS = [
  { key:"logistica", label:"Logística", color:"#22c55e", subs:[{key:"outros_log",label:"Outros Logística"},{key:"transporte",label:"Transporte"},{key:"uber",label:"Uber"},{key:"hospedagem",label:"Hospedagem"},{key:"diaria",label:"Diária de Alimentação"}]},
  { key:"pessoal",   label:"Pessoal",   color:"#3b82f6", subs:[{key:"coord_um",label:"Coord UM"},{key:"prod_um",label:"Prod UM"},{key:"prod_campo",label:"Prod Campo"},{key:"monitoracao",label:"Monitoração"},{key:"supervisor1",label:"Supervisor 1"},{key:"supervisor2",label:"Supervisor 2"},{key:"dtv",label:"DTV"},{key:"vmix",label:"Vmix"},{key:"audio",label:"Áudio"}]},
  { key:"operacoes", label:"Operações", color:"#f59e0b", subs:[{key:"um_b1",label:"UM B1"},{key:"um_b2",label:"UM B2"},{key:"geradores",label:"Geradores"},{key:"sng",label:"SNG"},{key:"sng_extra",label:"SNG Extra"},{key:"seg_espacial",label:"Seg. Espacial"},{key:"seg_extra",label:"Seg. Extra"},{key:"drone",label:"Drone"},{key:"grua",label:"Grua/Policam"},{key:"dslr",label:"DSLR + Microlink"},{key:"carrinho",label:"Carrinho"},{key:"especial",label:"Especial"},{key:"goalcam",label:"Goalcam"},{key:"minidrone",label:"Minidrone"},{key:"infra",label:"Infra + Distr."},{key:"extra",label:"Extra"}]},
];

// ─── CORES ────────────────────────────────────────────────────────────────────
export const TIPO_COLOR   = { fixo:"#6366f1", variavel:"#f43f5e" };
export const PIE_COLORS   = ["#22c55e","#3b82f6","#f59e0b","#ec4899","#8b5cf6","#06b6d4","#f97316"];
export const SECAO_COLORS = { "Pessoal":"#3b82f6", "Transmissão":"#22c55e", "Infraestrutura e Distribuição de Sinais":"#f59e0b" };

// ─── CENÁRIOS ─────────────────────────────────────────────────────────────────
export const CENARIO_INFO = {
  b1:   { label:"B1 Sudeste", color:"#22c55e", total:159476, cat:"B1", regiao:"sudeste" },
  b2s:  { label:"B2 Sudeste", color:"#3b82f6", total:100976, cat:"B2", regiao:"sudeste" },
  b2sul:{ label:"B2 Sul",     color:"#f59e0b", total:118296, cat:"B2", regiao:"sul"     },
};

// ─── CAMPEONATOS ──────────────────────────────────────────────────────────────
export const CAMPEONATOS = [
  { id:"brasileirao-2026", nome:"Brasileirão Série A", edicao:"2026", status:"Em andamento", statusColor:"#22c55e", cor:"#166534", corGrad:"linear-gradient(135deg,#166534,#15803d)", icon:"🇧🇷", rodadas:38, descricao:"Campeonato Brasileiro — FFU Transmissões" },
  { id:"estaduais-2026",   nome:"Campeonatos Estaduais", edicao:"2026", status:"Planejamento", statusColor:"#f59e0b", cor:"#92400e", corGrad:"linear-gradient(135deg,#78350f,#92400e)", icon:"🏆", rodadas:null, descricao:"Estaduais — em estruturação", emBreve:true },
];

// ─── APRESENTAÇÕES ────────────────────────────────────────────────────────────
export const ORC_PADRAO  = [306440, 206427, 331103, 206347];
export const REAL_PADRAO = [266760, 145080, 226700, 73700];

// ─── ESTILOS COMPARTILHADOS ───────────────────────────────────────────────────
export const btnStyle = { color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:600, fontSize:13 };
export const iSty = T => ({ background:T.bg, border:`1px solid ${T.muted}`, borderRadius:6, color:T.text, padding:"7px 10px", fontSize:13, width:"100%", boxSizing:"border-box" });

// ─── CHAVES DE PERSISTÊNCIA ───────────────────────────────────────────────────
export const LS_JOGOS    = "ffu_jogos_v1";
export const LS_SERVICOS = "ffu_servicos_v1";
export const LS_DARK     = "ffu_darkmode_v1";
