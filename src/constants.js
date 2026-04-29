// ─── TEMAS ────────────────────────────────────────────────────────────────────
// Paleta corporativa Livemode: verde #65B32E, cinza escuro #585455, preto #1A1A1A,
// branco #FFFFFF. Cores semânticas financeiras consistentes em todas as telas.
// As chaves originais (bg, card, border, muted, text, textMd, textSm) são
// preservadas para compat. Tokens novos foram adicionados para o design system.
export const DARK = {
  // legacy keys (compat)
  bg:"#141414", card:"#1E1E1E", border:"rgba(255,255,255,0.07)", muted:"#2a2a2a",
  text:"#F0F0F0", textMd:"#9CA3AF", textSm:"#6B7280",
  // novos tokens
  surface:"#1E1E1E",
  surfaceAlt:"#242424",
  surfaceRaised:"#2a2a2a",
  borderStrong:"rgba(255,255,255,0.12)",
  brand:"#65B32E",                              // verde Livemode oficial
  brandStrong:"#5aa327",
  brandSoft:"rgba(101,179,46,0.12)",
  brandBorder:"rgba(101,179,46,0.35)",
  brandGlow:"radial-gradient(circle at 50% 0%, rgba(101,179,46,0.10) 0%, transparent 60%)",
  accent:"#65B32E",
  // semântica financeira (espectro consistente)
  success:"#16A34A",   // realizado
  warning:"#D97706",   // provisionado
  danger:"#DC2626",
  info:"#2563EB",      // orçado
  projetado:"#7C3AED",
  pending:"#F59E0B",
  checked:"#10B981",
  shadow:"0 1px 3px rgba(0,0,0,0.3)",
  shadowSoft:"0 1px 2px rgba(0,0,0,0.25)",
  shadowBrand:"0 0 0 1px rgba(101,179,46,0.25), 0 8px 24px -8px rgba(101,179,46,0.4)",
  gradHeader:"linear-gradient(135deg,#1A1A1A 0%,#1E1E1E 100%)",
  gradSidebar:"linear-gradient(180deg,#111111 0%,#0d0d0d 100%)",
  gradBrand:"linear-gradient(180deg,#65B32E 0%,#5aa327 100%)",
  gradCard:"none",
};

export const LIGHT = {
  // legacy keys (compat)
  bg:"#F2F3F5", card:"#FFFFFF", border:"rgba(0,0,0,0.08)", muted:"#E5E7EB",
  text:"#1A1A1A", textMd:"#6B7280", textSm:"#9CA3AF",
  // novos tokens
  surface:"#FFFFFF",
  surfaceAlt:"#F8F9FA",
  surfaceRaised:"#FFFFFF",
  borderStrong:"rgba(0,0,0,0.15)",
  brand:"#65B32E",                              // verde Livemode oficial
  brandStrong:"#5aa327",
  brandSoft:"rgba(101,179,46,0.10)",
  brandBorder:"rgba(101,179,46,0.30)",
  brandGlow:"radial-gradient(circle at 50% 0%, rgba(101,179,46,0.06) 0%, transparent 60%)",
  accent:"#65B32E",
  success:"#16A34A",
  warning:"#D97706",
  danger:"#DC2626",
  info:"#2563EB",
  projetado:"#7C3AED",
  pending:"#F59E0B",
  checked:"#10B981",
  shadow:"0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowSoft:"0 1px 2px rgba(0,0,0,0.04)",
  shadowBrand:"0 0 0 1px rgba(101,179,46,0.25), 0 6px 18px -8px rgba(101,179,46,0.30)",
  gradHeader:"linear-gradient(135deg,#FFFFFF 0%,#F8F9FA 100%)",
  gradSidebar:"linear-gradient(180deg,#1E1E1E 0%,#111111 100%)",
  gradBrand:"linear-gradient(180deg,#65B32E 0%,#5aa327 100%)",
  gradCard:"none",
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
export const RADIUS  = { sm:6, md:8, lg:10, xl:12, pill:999 };
export const SPACE   = { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32 };
export const FONT    = {
  ui:"'Poppins', system-ui, -apple-system, sans-serif",
  display:"'Barlow Condensed', 'Alternate Gothic', sans-serif",
  num:"'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
};

// ─── LISTAS ───────────────────────────────────────────────────────────────────
export const DETENTORES = ["CazeTV/Record/Premiere","Amazon","A definir"];
export const CIDADES    = ["Rio de Janeiro","São Paulo","Curitiba","Belo Horizonte","Porto Alegre","Chapecó","Mirassol","Outro"];
export const TIMES      = ["Fluminense","Botafogo","Flamengo","Vasco","Corinthians","Palmeiras","São Paulo","Athletico PR","Grêmio","Internacional","Cruzeiro","Atlético MG","Chapecoense","Santos","Vitória","Mirassol","Coritiba","Ferroviária","RB Bragantino","Taubaté","Outro"];

// ─── CATEGORIAS DE CUSTO ──────────────────────────────────────────────────────
// Cores semânticas por categoria — alinhadas à paleta financeira oficial.
export const CATS = [
  { key:"logistica", label:"Logística", color:"#16A34A", subs:[{key:"outros_log",label:"Outros Logística"},{key:"transporte",label:"Transporte"},{key:"uber",label:"Uber"},{key:"hospedagem",label:"Hospedagem"},{key:"diaria",label:"Diária de Alimentação"}]},
  { key:"pessoal",   label:"Pessoal",   color:"#2563EB", subs:[{key:"coord_um",label:"Coord UM"},{key:"prod_um",label:"Prod UM"},{key:"prod_campo",label:"Prod Campo"},{key:"monitoracao",label:"Monitoração"},{key:"supervisor1",label:"Supervisor 1"},{key:"supervisor2",label:"Supervisor 2"},{key:"dtv",label:"DTV"},{key:"vmix",label:"Vmix"},{key:"audio",label:"Áudio"}]},
  { key:"operacoes", label:"Operações", color:"#D97706", subs:[{key:"um_b1",label:"UM B1"},{key:"um_b2",label:"UM B2"},{key:"um_b3",label:"UM B3"},{key:"geradores",label:"Geradores"},{key:"sng",label:"SNG"},{key:"sng_extra",label:"SNG Extra"},{key:"seg_espacial",label:"Seg. Espacial"},{key:"seg_extra",label:"Seg. Extra"},{key:"drone",label:"Drone"},{key:"grua",label:"Grua/Policam"},{key:"dslr",label:"DSLR + Microlink"},{key:"dslrs_transmissor",label:"DSLR + Transmissor"},{key:"refcam",label:"Refcam"},{key:"carrinho",label:"Carrinho"},{key:"especial",label:"Especial"},{key:"goalcam",label:"Goalcam"},{key:"minidrone",label:"Minidrone"},{key:"infra",label:"Infra + Distr."},{key:"downlink",label:"Downlink"},{key:"distribuicao",label:"Distribuição"},{key:"liveu",label:"LiveU"},{key:"internet",label:"Internet"},{key:"maquinas",label:"Máquinas"},{key:"montagem_vespera",label:"Montagem Véspera"},{key:"extra",label:"Extra"}]},
];

// ─── CORES ────────────────────────────────────────────────────────────────────
export const TIPO_COLOR   = { fixo:"#7C3AED", variavel:"#DC2626" };
export const PIE_COLORS   = ["#65B32E","#2563EB","#D97706","#7C3AED","#DC2626","#10B981","#F59E0B"];
export const SECAO_COLORS = { "Pessoal":"#2563EB", "Transmissão":"#65B32E", "Serviços Complementares":"#D97706" };

// ─── CENÁRIOS ─────────────────────────────────────────────────────────────────
export const CENARIO_INFO = {
  b1:   { label:"B1 Sudeste", color:"#65B32E", total:160376, cat:"B1", regiao:"sudeste" },
  b2s:  { label:"B2 Sudeste", color:"#2563EB", total:101476, cat:"B2", regiao:"sudeste" },
  b2sul:{ label:"B2 Sul",     color:"#D97706", total:118796, cat:"B2", regiao:"sul"     },
};

// ─── CAMPEONATOS ──────────────────────────────────────────────────────────────
// Cada campeonato pode definir: cor de acento, fundo dark temático e gradiente radial.
// Veja CHAMPIONSHIP_CONFIG em src/config/championships.js para logos e fallbacks.
export const CAMPEONATOS = [
  {
    id:"brasileirao-2026",
    nome:"Brasileirão Série A",
    edicao:"2026",
    status:"Em andamento",
    statusColor:"#65B32E",
    cor:"#009C3B",
    corGrad:"radial-gradient(ellipse at 80% 50%, rgba(0,156,59,0.15) 0%, #0A1A0B 70%)",
    bgColor:"#0A1A0B",
    icon:"🇧🇷",
    rodadas:38,
    descricao:"Campeonato Brasileiro — Livemode Transmissões",
  },
  {
    id:"paulistao-feminino-2026",
    nome:"Paulistão Feminino",
    edicao:"2026",
    status:"Em andamento",
    statusColor:"#65B32E",
    cor:"#7C3AED",
    corGrad:"radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.18) 0%, #150A1A 70%)",
    bgColor:"#150A1A",
    icon:"⚽",
    fases:4,
    descricao:"Estadual Paulista Feminino — Primeira Fase + Play In + Semi + Final",
  },
];

// ─── PAULISTÃO FEMININO ───────────────────────────────────────────────────────
export const FASES_PAULISTAO = [
  { key:"grupos",   label:"Primeira Fase", short:"Primeira Fase", color:"#2563EB", ordem:1 },
  { key:"play_in",  label:"Play In",       short:"Play In",       color:"#7C3AED", ordem:2 },
  { key:"semi",     label:"Semifinal",     short:"Semi",          color:"#DC2626", ordem:3 },
  { key:"final",    label:"Final",         short:"Final",         color:"#65B32E", ordem:4 },
];

export const PAULISTAO_CENARIO_INFO = {
  paulistao: { label:"Paulistão Feminino", color:"#7C3AED", total:80000, cat:"PAU", regiao:"sudeste" },
};

// ─── APRESENTAÇÕES ────────────────────────────────────────────────────────────
export const ORC_PADRAO  = [306440, 206427, 331103, 206347];
export const REAL_PADRAO = [266760, 145080, 226700, 73700];

// ─── ESTILOS COMPARTILHADOS ───────────────────────────────────────────────────
export const btnStyle = { color:"#fff", border:"none", borderRadius:7, padding:"8px 14px", cursor:"pointer", fontWeight:500, fontSize:12, fontFamily:FONT.ui };
export const iSty = T => ({ background:T.surface||T.bg, border:`1px solid ${T.borderStrong||T.muted}`, borderRadius:6, color:T.text, padding:"7px 10px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:FONT.ui });

// ─── CHAVES DE PERSISTÊNCIA ───────────────────────────────────────────────────
export const LS_JOGOS    = "ffu_jogos_v1";
export const LS_SERVICOS = "ffu_servicos_v1";
export const LS_DARK     = "ffu_darkmode_v1";
