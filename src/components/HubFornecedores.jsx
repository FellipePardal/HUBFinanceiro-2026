import { useState, useEffect, useMemo } from "react";
import { RADIUS } from "../constants";
import { getState, setState as setSupabaseState, supabase } from "../lib/supabase";
import { FORNECEDORES_INIT } from "../data/fornecedores";
import { COTACAO_INIT, CAMPEONATOS_COTACAO, statusInfo } from "../data/negociacoes";
import { CIDADES_INIT, CAMPEONATOS_FORN_INIT } from "../data/catalogos";
import { JOGOS_FORN_INIT } from "../data/jogosFornecedores";
import { ALL_JOGOS } from "../data";
import { fmt, fmtK } from "../utils";
import { Stat, Badge, IconButton } from "./ui";
import {
  ArrowLeft, Eye, EyeOff, Sun, Moon, Users,
  Handshake, Wallet, Building2, Trophy, Globe2,
} from "lucide-react";
import TabFornecedores from "./tabs/TabFornecedores";

// Filtro global: "todos" ou id de um campeonato
const FILTRO_TODOS = "todos";

export default function HubFornecedores({ onBack, T, darkMode, setDarkMode, filtroInicial }) {
  const [fornecedores, setFornecedoresRaw] = useState(FORNECEDORES_INIT);
  const [cotacoes,     setCotacoesRaw]     = useState(COTACAO_INIT);
  const [jogos,        setJogosRaw]        = useState(ALL_JOGOS);
  const [jogosForn,    setJogosFornRaw]    = useState(JOGOS_FORN_INIT);
  const [cidades,      setCidadesRaw]      = useState(CIDADES_INIT);
  const [campeonatos,  setCampeonatosRaw]  = useState(CAMPEONATOS_FORN_INIT);
  const [tabelas,      setTabelasRaw]      = useState([]);
  const [loading,      setLoading]         = useState(true);
  const [ocultar,      setOcultar]         = useState(false);
  const [filtroCamp,   setFiltroCamp]      = useState(filtroInicial || FILTRO_TODOS);

  // Carga inicial + realtime
  useEffect(() => {
    async function load() {
      const [f, c, j, ci, ca, tb, jf] = await Promise.all([
        getState('fornecedores'),
        getState('cotacoes'),
        getState('jogos'),
        getState('forn_cidades'),
        getState('forn_campeonatos'),
        getState('forn_tabelas_preco'),
        getState('forn_jogos'),
      ]);
      if (f)  setFornecedoresRaw(f);
      if (c)  setCotacoesRaw(c);
      if (j)  setJogosRaw(j);
      if (ci) setCidadesRaw(ci);     else setSupabaseState('forn_cidades', CIDADES_INIT);
      if (ca) setCampeonatosRaw(ca); else setSupabaseState('forn_campeonatos', CAMPEONATOS_FORN_INIT);
      if (tb) setTabelasRaw(tb);     else setSupabaseState('forn_tabelas_preco', []);
      if (jf) setJogosFornRaw(jf);   else setSupabaseState('forn_jogos', JOGOS_FORN_INIT);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel('hub_fornecedores_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, payload => {
        if (payload.new.key === 'fornecedores')       setFornecedoresRaw(payload.new.value);
        if (payload.new.key === 'cotacoes')           setCotacoesRaw(payload.new.value);
        if (payload.new.key === 'jogos')              setJogosRaw(payload.new.value);
        if (payload.new.key === 'forn_cidades')       setCidadesRaw(payload.new.value);
        if (payload.new.key === 'forn_campeonatos')   setCampeonatosRaw(payload.new.value);
        if (payload.new.key === 'forn_tabelas_preco') setTabelasRaw(payload.new.value);
        if (payload.new.key === 'forn_jogos')         setJogosFornRaw(payload.new.value);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const setFornecedores = fn => setFornecedoresRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('fornecedores', next); return next;
  });
  const setCotacoes = fn => setCotacoesRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('cotacoes', next); return next;
  });
  const setCidades = fn => setCidadesRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('forn_cidades', next); return next;
  });
  const setCampeonatos = fn => setCampeonatosRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('forn_campeonatos', next); return next;
  });
  const setTabelas = fn => setTabelasRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('forn_tabelas_preco', next); return next;
  });
  const setJogosForn = fn => setJogosFornRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('forn_jogos', next); return next;
  });

  // Métricas consolidadas (todas as cotações, independente do filtro)
  const metricasGlobais = useMemo(() => {
    const all = cotacoes || [];
    const ativas = all.filter(c => ["aberta","em_analise","negociando"].includes(c.status)).length;
    const aprovadas = all.filter(c => c.status === "aprovada");
    const savingTotal = aprovadas.reduce((s, c) => {
      const p = Number(c.valorProposto||0), cp = Number(c.valorContraproposta||0);
      return s + (p && cp ? Math.max(0, p - cp) : 0);
    }, 0);
    const fornecedoresUnicos = new Set(all.map(c => c.fornecedorId).filter(Boolean)).size;
    const campeonatosAtivos = new Set(all.map(c => c.campeonatoId).filter(Boolean)).size;
    return { ativas, savingTotal, fornecedoresUnicos, campeonatosAtivos };
  }, [cotacoes]);

  // Campeonato selecionado (para header e filtro)
  const campInfo = filtroCamp === FILTRO_TODOS
    ? null
    : CAMPEONATOS_COTACAO.find(c => c.id === filtroCamp);

  if (loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:T.textMd,fontSize:16}}>Carregando Hub de Fornecedores...</p>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',sans-serif",display:"flex"}}>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside style={{
        width:72,
        minHeight:"100vh",
        background: T.gradSidebar || "linear-gradient(180deg,#0a0f1a,#0f172a)",
        borderRight:"1px solid rgba(255,255,255,0.06)",
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        paddingTop:16,
        paddingBottom:16,
        gap:6,
        flexShrink:0,
        position:"sticky",
        top:0,
        height:"100vh",
      }}>
        <button onClick={onBack} title="Voltar ao portal"
          style={{
            width:44, height:44, borderRadius:12, border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#059669,#10b981)",
            color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            marginBottom:14,
            boxShadow:"0 6px 16px rgba(16,185,129,0.35)",
          }}>
          <ArrowLeft size={18} strokeWidth={2.25}/>
        </button>

        <div style={{ width:32, height:1, background:"rgba(255,255,255,0.08)", marginBottom:8 }}/>

        <IconButton icon={Users} title="Fornecedores" active={true} onClick={()=>{}} size={44} T={T}/>

        <div style={{ flex:1 }}/>

        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <IconButton
            icon={ocultar ? EyeOff : Eye}
            title={ocultar?"Mostrar valores":"Ocultar valores"}
            onClick={()=>setOcultar(o=>!o)}
            active={ocultar}
            size={40} T={T}
          />
          <IconButton
            icon={darkMode ? Sun : Moon}
            title={darkMode?"Modo claro":"Modo escuro"}
            onClick={()=>setDarkMode(d=>!d)}
            size={40} T={T}
          />
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div style={{flex:1,minWidth:0,paddingBottom:40,background:T.bg}}>
        {/* Header corporativo */}
        <div style={{
          background: T.surface || T.card,
          borderBottom: `1px solid ${T.border}`,
          padding: "20px 32px 20px",
        }}>
          <div style={{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"flex-start",
            flexWrap:"wrap",
            gap:16,
          }}>
            <div style={{ minWidth:0, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{
                width:44, height:44, borderRadius:12,
                background: T.brandSoft || "rgba(16,185,129,0.12)",
                border: `1px solid ${T.brandBorder || "rgba(16,185,129,0.28)"}`,
                color: T.brand || "#10b981",
                display:"flex", alignItems:"center", justifyContent:"center",
                flexShrink:0,
              }}>
                <Handshake size={22} strokeWidth={2.25}/>
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{
                  color: T.brand || "#10b981",
                  fontSize: 10,
                  letterSpacing:"0.16em",
                  textTransform:"uppercase",
                  margin:"0 0 3px",
                  fontWeight:700,
                  display:"inline-flex",
                  alignItems:"center",
                  gap:6,
                }}>
                  <Globe2 size={11}/>
                  Hub Global · Módulo Financeiro
                </p>
                <h1 style={{
                  fontSize:20,
                  fontWeight:800,
                  margin:0,
                  color:T.text,
                  letterSpacing:"-0.02em",
                }}>Fornecedores & Negociações</h1>
                <p style={{ color:T.textMd, fontSize:12, margin:"4px 0 0" }}>
                  Cadastro, cotações, chat e análise preditiva —
                  {campInfo ? (
                    <> filtrado em <span style={{color:campInfo.cor,fontWeight:700}}>{campInfo.nome}</span></>
                  ) : (
                    <> visão consolidada de <span style={{color:T.text,fontWeight:700}}>todos os campeonatos</span></>
                  )}
                </p>
              </div>
            </div>

            {/* Seletor global de campeonato */}
            <div style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"8px 14px",
              background: T.surfaceAlt || T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: RADIUS.lg,
            }}>
              <Trophy size={14} color={T.brand || "#10b981"} strokeWidth={2.25}/>
              <span style={{fontSize:10,color:T.textSm,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700}}>Filtro</span>
              <select
                value={filtroCamp}
                onChange={e => setFiltroCamp(e.target.value)}
                style={{
                  background:"transparent",
                  border:"none",
                  color:T.text,
                  fontSize:13,
                  fontWeight:600,
                  cursor:"pointer",
                  outline:"none",
                  paddingRight:8,
                  fontFamily:"inherit",
                }}
              >
                <option value={FILTRO_TODOS}>Todos os campeonatos</option>
                {CAMPEONATOS_COTACAO.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {/* KPI header global */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
            gap:12,
            marginTop:20,
            filter:ocultar?"blur(8px)":"none",
            transition:"filter 0.2s",
          }}>
            <Stat T={T} label="Cotações Ativas" value={String(metricasGlobais.ativas)}         sub="Em negociação"         color={T.info||"#3b82f6"}    icon={Handshake}/>
            <Stat T={T} label="Saving Consolidado" value={fmtK(metricasGlobais.savingTotal)}   sub="Aprovadas · cross-camp" color={T.brand||"#10b981"}   icon={Wallet}/>
            <Stat T={T} label="Fornecedores Engajados" value={String(metricasGlobais.fornecedoresUnicos)} sub={`de ${fornecedores.length} cadastrados`} color={T.warning||"#f59e0b"} icon={Building2}/>
            <Stat T={T} label="Campeonatos com Cotação" value={String(metricasGlobais.campeonatosAtivos)} sub={`de ${CAMPEONATOS_COTACAO.length} mapeados`}  color="#a855f7" icon={Trophy}/>
          </div>
        </div>

        <div style={{padding:"28px 32px",filter:ocultar?"blur(10px)":"none",transition:"filter 0.3s",userSelect:ocultar?"none":"auto"}}>
          <TabFornecedores
            fornecedores={fornecedores}
            setFornecedores={setFornecedores}
            cotacoes={cotacoes}
            setCotacoes={setCotacoes}
            jogos={jogos}
            jogosForn={jogosForn}
            setJogosForn={setJogosForn}
            cidades={cidades}
            setCidades={setCidades}
            campeonatos={campeonatos}
            setCampeonatos={setCampeonatos}
            tabelas={tabelas}
            setTabelas={setTabelas}
            filtroCampeonato={filtroCamp}
            T={T}
          />
        </div>
      </div>
    </div>
  );
}
