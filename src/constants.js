// ─── TEMAS ────────────────────────────────────────────────────────────────────
// Paleta corporativa inspirada no brandkit Livemode (verde / branco / cinza).
// As chaves originais (bg, card, border, muted, text, textMd, textSm) são
// preservadas para que o restante do app continue funcionando sem alterações.
// Tokens novos foram adicionados para o design system.
export const DARK = {
  // legacy keys (compat) — bg mais profundo, contraste forte entre superfícies
  bg:"#060912", card:"#0f1623", border:"#1e293b", muted:"#334155",
  text:"#f8fafc", textMd:"#cbd5e1", textSm:"#94a3b8",
  // novos tokens
  surface:"#0f1623",
  surfaceAlt:"#0a0f1a",
  surfaceRaised:"#1a2435",
  borderStrong:"#334155",
  brand:"#10b981",        // emerald-500 — verde corporativo refinado
  brandStrong:"#059669",
  brandSoft:"rgba(16,185,129,0.14)",
  brandBorder:"rgba(16,185,129,0.32)",
  brandGlow:"radial-gradient(circle at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 60%)",
  accent:"#10b981",
  success:"#22c55e",
  warning:"#f59e0b",
  danger:"#ef4444",
  info:"#3b82f6",
  shadow:"0 4px 6px -2px rgba(0,0,0,0.4), 0 20px 40px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
  shadowSoft:"0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px -2px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
  shadowBrand:"0 0 0 1px rgba(16,185,129,0.25), 0 8px 24px -8px rgba(16,185,129,0.4)",
  gradHeader:"linear-gradient(135deg,#060912 0%,#0f1623 60%,#0a1f17 100%)",
  gradSidebar:"linear-gradient(180deg,#060912 0%,#0a0f1a 100%)",
  gradBrand:"linear-gradient(135deg,#047857 0%,#10b981 100%)",
  gradCard:"linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
};

export const LIGHT = {
  // legacy keys (compat) — bg cinza claro, cards brancos puros pra contraste forte
  bg:"#eef0f4", card:"#ffffff", border:"#e2e8f0", muted:"#cbd5e1",
  text:"#0b1220", textMd:"#475569", textSm:"#64748b",
  // novos tokens
  surface:"#ffffff",
  surfaceAlt:"#f1f5f9",
  surfaceRaised:"#ffffff",
  borderStrong:"#cbd5e1",
  brand:"#059669",
  brandStrong:"#047857",
  brandSoft:"rgba(5,150,105,0.10)",
  brandBorder:"rgba(5,150,105,0.32)",
  brandGlow:"radial-gradient(circle at 50% 0%, rgba(5,150,105,0.08) 0%, transparent 60%)",
  accent:"#059669",
  success:"#16a34a",
  warning:"#d97706",
  danger:"#dc2626",
  info:"#2563eb",
  shadow:"0 4px 6px -2px rgba(15,23,42,0.06), 0 20px 40px -12px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.04)",
  shadowSoft:"0 1px 3px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.03)",
  shadowBrand:"0 0 0 1px rgba(5,150,105,0.25), 0 8px 24px -8px rgba(5,150,105,0.35)",
  gradHeader:"linear-gradient(135deg,#ffffff 0%,#f1f5f9 60%,#ecfdf5 100%)",
  gradSidebar:"linear-gradient(180deg,#060912 0%,#0a0f1a 100%)",
  gradBrand:"linear-gradient(135deg,#047857 0%,#059669 100%)",
  gradCard:"linear-gradient(180deg, rgba(15,23,42,0.015) 0%, transparent 100%)",
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
export const RADIUS  = { sm:6, md:10, lg:14, xl:20, pill:999 };
export const SPACE   = { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32 };
export const FONT    = { ui:"'Inter', system-ui, -apple-system, sans-serif", num:"'JetBrains Mono', ui-monospace, SFMono-Regular, monospace" };

// ─── LISTAS ───────────────────────────────────────────────────────────────────
export const DETENTORES = ["CazeTV/Record/Premiere","Amazon","A definir"];
export const CIDADES    = ["Rio de Janeiro","São Paulo","Curitiba","Belo Horizonte","Porto Alegre","Chapecó","Mirassol","Outro"];
export const TIMES      = ["Fluminense","Botafogo","Flamengo","Vasco","Corinthians","Palmeiras","São Paulo","Athletico PR","Grêmio","Internacional","Cruzeiro","Atlético MG","Chapecoense","Santos","Vitória","Mirassol","Coritiba","Ferroviária","RB Bragantino","Taubaté","Outro"];

// ─── CATEGORIAS DE CUSTO ──────────────────────────────────────────────────────
export const CATS = [
  { key:"logistica", label:"Logística", color:"#22c55e", subs:[{key:"outros_log",label:"Outros Logística"},{key:"transporte",label:"Transporte"},{key:"uber",label:"Uber"},{key:"hospedagem",label:"Hospedagem"},{key:"diaria",label:"Diária de Alimentação"}]},
  { key:"pessoal",   label:"Pessoal",   color:"#3b82f6", subs:[{key:"coord_um",label:"Coord UM"},{key:"prod_um",label:"Prod UM"},{key:"prod_campo",label:"Prod Campo"},{key:"monitoracao",label:"Monitoração"},{key:"supervisor1",label:"Supervisor 1"},{key:"supervisor2",label:"Supervisor 2"},{key:"dtv",label:"DTV"},{key:"vmix",label:"Vmix"},{key:"audio",label:"Áudio"}]},
  { key:"operacoes", label:"Operações", color:"#f59e0b", subs:[{key:"um_b1",label:"UM B1"},{key:"um_b2",label:"UM B2"},{key:"geradores",label:"Geradores"},{key:"sng",label:"SNG"},{key:"sng_extra",label:"SNG Extra"},{key:"seg_espacial",label:"Seg. Espacial"},{key:"seg_extra",label:"Seg. Extra"},{key:"drone",label:"Drone"},{key:"grua",label:"Grua/Policam"},{key:"dslr",label:"DSLR + Microlink"},{key:"carrinho",label:"Carrinho"},{key:"especial",label:"Especial"},{key:"goalcam",label:"Goalcam"},{key:"minidrone",label:"Minidrone"},{key:"infra",label:"Infra + Distr."},{key:"extra",label:"Extra"}]},
];

// ─── CORES ────────────────────────────────────────────────────────────────────
export const TIPO_COLOR   = { fixo:"#6366f1", variavel:"#f43f5e" };
export const PIE_COLORS   = ["#22c55e","#3b82f6","#f59e0b","#ec4899","#8b5cf6","#06b6d4","#f97316"];
export const SECAO_COLORS = { "Pessoal":"#3b82f6", "Transmissão":"#22c55e", "Serviços Complementares":"#f59e0b" };

// ─── CENÁRIOS ─────────────────────────────────────────────────────────────────
export const CENARIO_INFO = {
  b1:   { label:"B1 Sudeste", color:"#22c55e", total:160376, cat:"B1", regiao:"sudeste" },
  b2s:  { label:"B2 Sudeste", color:"#3b82f6", total:101476, cat:"B2", regiao:"sudeste" },
  b2sul:{ label:"B2 Sul",     color:"#f59e0b", total:118796, cat:"B2", regiao:"sul"     },
};

// ─── CAMPEONATOS ──────────────────────────────────────────────────────────────
export const CAMPEONATOS = [
  { id:"brasileirao-2026", nome:"Brasileirão Série A", edicao:"2026", status:"Em andamento", statusColor:"#22c55e", cor:"#166534", corGrad:"linear-gradient(135deg,#166534,#15803d)", icon:"🇧🇷", rodadas:38, descricao:"Campeonato Brasileiro — Livemode Transmissões" },
  { id:"paulistao-feminino-2026", nome:"Paulistão Feminino", edicao:"2026", status:"Em andamento", statusColor:"#ec4899", cor:"#9d174d", corGrad:"linear-gradient(135deg,#9d174d,#be185d)", icon:"⚽", fases:4, descricao:"Estadual Paulista Feminino — Primeira Fase + Play In + Semi + Final" },
];

// ─── PAULISTÃO FEMININO ───────────────────────────────────────────────────────
// Fases do campeonato (ordem importa: índice = ordem de exibição/sort)
export const FASES_PAULISTAO = [
  { key:"grupos",   label:"Primeira Fase", short:"Primeira Fase", color:"#3b82f6", ordem:1 },
  { key:"play_in",  label:"Play In",       short:"Play In",       color:"#8b5cf6", ordem:2 },
  { key:"semi",     label:"Semifinal",     short:"Semi",          color:"#ef4444", ordem:3 },
  { key:"final",    label:"Final",         short:"Final",         color:"#10b981", ordem:4 },
];

// Cenário operacional do Paulistão Feminino — valor unificado por jogo (ajustar quando vier orçamento real)
export const PAULISTAO_CENARIO_INFO = {
  paulistao: { label:"Paulistão Feminino", color:"#ec4899", total:80000, cat:"PAU", regiao:"sudeste" },
};

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
