import { useState, useMemo, useEffect } from "react";
import { DARK, LIGHT, CATS, TIPO_COLOR, LS_JOGOS, LS_SERVICOS, LS_DARK, btnStyle, RADIUS } from "./constants";
import { fmt, fmtK, subTotal, catTotal, lsGet, lsSet } from "./utils";
import { ALL_JOGOS, SERVICOS_INIT } from "./data";
import { KPI, Pill, CustomTooltip } from "./components/shared";
import { Card, SectionHeader, Stat, Badge, Progress, IconButton } from "./components/ui";
import {
  LayoutDashboard, FileText, Users, ClipboardList,
  ArrowLeft, Eye, EyeOff, Sun, Moon,
  Wallet, TrendingUp, Activity, PiggyBank,
} from "lucide-react";
import Home             from "./components/Home";
import TabJogos         from "./components/tabs/TabJogos";
import TabSavings       from "./components/tabs/TabSavings";
import TabGraficos      from "./components/tabs/TabGraficos";
import TabServicos      from "./components/tabs/TabServicos";
import VisaoMicro       from "./components/tabs/VisaoMicro";
import TabApresentacoes from "./components/tabs/TabApresentacoes";
import TabNotas         from "./components/tabs/TabNotas";
import TabFornecedores  from "./components/tabs/TabFornecedores";
import TabTabelaPrecos  from "./components/tabs/TabTabelaPrecos";
import TabNotasMensal  from "./components/tabs/TabNotasMensal";
import TabEnvio        from "./components/tabs/TabEnvio";
import { NovoJogoModal, NovoRapidoModal } from "./components/modals/NovoJogoModal";
import { getState, setState as setSupabaseState, supabase } from "./lib/supabase";
import { FORNECEDORES_INIT } from "./data/fornecedores";


// ─── BRASILEIRÃO ──────────────────────────────────────────────────────────────
function Brasileirao({ onBack, T, darkMode, setDarkMode }) {
  const [jogos, setJogosRaw]       = useState(ALL_JOGOS);
  const [servicos, setServicosRaw] = useState(SERVICOS_INIT);
  const [notas, setNotasRaw]               = useState([]);
  const [notasMensais, setNotasMensaisRaw] = useState([]);
  const [envios, setEnviosRaw]             = useState([]);
  const [fornecedores, setFornecedoresRaw] = useState(FORNECEDORES_INIT);
  const [tabelaPrecos, setTabelaPrecosRaw] = useState([]);
  const [loading, setLoading]            = useState(true);

  useEffect(() => {
    async function load() {
      const [j, s, n, f, nm, ev, tp] = await Promise.all([getState('jogos'), getState('servicos'), getState('notas'), getState('fornecedores'), getState('notas_mensais'), getState('envios'), getState('tabela_precos')]);
      if (j) setJogosRaw(j); else setSupabaseState('jogos', ALL_JOGOS);
      if (s) setServicosRaw(s); else setSupabaseState('servicos', SERVICOS_INIT);
      if (n) setNotasRaw(n); else setSupabaseState('notas', []);
      if (f) setFornecedoresRaw(f); else setSupabaseState('fornecedores', FORNECEDORES_INIT);
      if (nm) setNotasMensaisRaw(nm); else setSupabaseState('notas_mensais', []);
      if (ev) setEnviosRaw(ev); else setSupabaseState('envios', []);
      if (tp) setTabelaPrecosRaw(tp); else setSupabaseState('tabela_precos', []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel('app_state_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, payload => {
        if (payload.new.key === 'jogos')        setJogosRaw(payload.new.value);
        if (payload.new.key === 'servicos')     setServicosRaw(payload.new.value);
        if (payload.new.key === 'notas')        setNotasRaw(payload.new.value);
        if (payload.new.key === 'fornecedores')   setFornecedoresRaw(payload.new.value);
        if (payload.new.key === 'notas_mensais') setNotasMensaisRaw(payload.new.value);
        if (payload.new.key === 'envios')        setEnviosRaw(payload.new.value);
        if (payload.new.key === 'tabela_precos') setTabelaPrecosRaw(payload.new.value);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const setJogos = fn => setJogosRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('jogos', next); return next;
  });
  const setServicos = fn => setServicosRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('servicos', next); return next;
  });
  const setNotas = fn => setNotasRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('notas', next); return next;
  });
  const setEnvios = fn => setEnviosRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('envios', next); return next;
  });
  const setNotasMensais = fn => setNotasMensaisRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('notas_mensais', next); return next;
  });
  const setFornecedores = fn => setFornecedoresRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('fornecedores', next); return next;
  });
  const setTabelaPrecos = fn => setTabelaPrecosRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState('tabela_precos', next); return next;
  });

  // Mapa de categoria variável (aba Mensal) → chave de CAT no dashboard
  const VAR_CAT_TO_CATKEY = { "Transporte":"logistica", "Uber":"logistica", "Hospedagem":"logistica", "Seg. Espacial":"operacoes" };

  // Servicos com realizado derivado das NFs mensais (fonte única da verdade: as NFs)
  const servicosCalc = useMemo(() => servicos.map(sec => ({
    ...sec,
    itens: sec.itens.map(it => ({
      ...it,
      realizado: notasMensais.filter(n => n.servicoId === it.id).reduce((s, n) => s + (n.valor || 0), 0),
    })),
  })), [servicos, notasMensais]);

  const varCalc = useMemo(() => {
    const allJ = jogos.filter(j => j.mandante !== "A definir");
    const result = CATS.map(cat => {
      const realizadoMensal = notasMensais
        .filter(n => !n.servicoId && VAR_CAT_TO_CATKEY[n.categoria] === cat.key)
        .reduce((s, n) => s + (n.valor || 0), 0);
      return {
        nome: cat.label,
        orcado:       allJ.reduce((s,j) => s+catTotal(j.orcado, cat), 0),
        provisionado: allJ.reduce((s,j) => s+catTotal(j.provisionado, cat), 0),
        realizado:    allJ.reduce((s,j) => s+catTotal(j.realizado, cat), 0) + realizadoMensal,
        tipo: "variavel",
      };
    });
    const extraOrc = allJ.reduce((s,j) => s+((j.orcado&&j.orcado.extra)||0), 0);
    result.push({ nome:"Extra", orcado:extraOrc, provisionado:0, realizado:0, tipo:"variavel" });
    return result;
  }, [jogos, notasMensais]);

  const fixosCalc = useMemo(() => servicosCalc.map(s => ({
    nome: s.secao,
    orcado:       s.itens.reduce((t,i) => t+i.orcado, 0),
    provisionado: s.itens.reduce((t,i) => t+i.provisionado, 0),
    realizado:    s.itens.reduce((t,i) => t+i.realizado, 0),
    tipo: "fixo",
  })), [servicosCalc]);

  // "Outros Mensais": NFs mensais sem servicoId e sem mapeamento variável (ex: categoria "Outro")
  const outrosMensaisCalc = useMemo(() => {
    const total = notasMensais
      .filter(n => !n.servicoId && !VAR_CAT_TO_CATKEY[n.categoria])
      .reduce((s, n) => s + (n.valor || 0), 0);
    return total > 0
      ? [{ nome:"Outros Mensais", orcado:0, provisionado:0, realizado: total, tipo:"fixo" }]
      : [];
  }, [notasMensais]);

  const RESUMO_CATS = [...varCalc, ...fixosCalc, ...outrosMensaisCalc];

  const [setor,           setSetor]           = useState("orcamento");
  const [tab,             setTab]             = useState("dashboard");
  const [showNovo,        setNovo]            = useState(false);
  const [novoRapido,      setNovoRapido]      = useState(null);
  const [jogoEdit,        setJogoEdit]        = useState(null);

  const [filtroRod,       setFiltroRod]       = useState("Todas");
  const [filtroCat,       setFiltroCat]       = useState("Todas");
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [microJogoId,     setMicroJogoId]     = useState(jogos.find(j=>j.mandante!=="A definir")?.id);
  const [ocultar,         setOcultar]         = useState(false);

  const saveJogo       = j => setJogos(js => js.map(x => x.id===j.id ? j : x));
  const addJogo        = j => {
    setJogos(js => {
      // Substituir um placeholder da mesma rodada e categoria, se existir
      let replaced = false;
      const next = js.map(x => {
        if (!replaced && x.mandante === "A definir" && x.rodada === j.rodada && x.categoria === j.categoria) {
          replaced = true;
          return { ...j, id: x.id };
        }
        return x;
      });
      return replaced ? next : [...js, j];
    });
    setNovo(false); setNovoRapido(null);
  };
  const deleteJogo     = id => { if(window.confirm("Excluir este jogo?")) setJogos(js => js.filter(j => j.id !== id)); };
  const editJogo       = j => setJogoEdit(j);
  const handleEditSave = j => { saveJogo(j); setJogoEdit(null); };


  const totalOrc  = RESUMO_CATS.reduce((s,c) => s+c.orcado, 0);
  const totalProv = RESUMO_CATS.reduce((s,c) => s+c.provisionado, 0);
  const totalReal = RESUMO_CATS.reduce((s,c) => s+c.realizado, 0);
  const pctGasto  = totalOrc ? ((totalReal/totalOrc)*100).toFixed(1) : 0;

  const divulgados  = jogos.filter(j => j.mandante !== "A definir");
  const aDivulgar   = jogos.filter(j => j.mandante === "A definir");
  const rodadasList = ["Todas", ...Array.from(new Set(divulgados.map(j=>j.rodada))).sort((a,b)=>a-b).map(String)];

  const filtrados = (showPlaceholder ? jogos : divulgados).filter(j =>
    (filtroRod==="Todas" || j.rodada===parseInt(filtroRod)) &&
    (filtroCat==="Todas" || j.categoria===filtroCat)
  ).sort((a,b) => a.rodada - b.rodada);

  const jogosFiltered = divulgados.filter(j =>
    (filtroRod==="Todas" || j.rodada===parseInt(filtroRod)) &&
    (filtroCat==="Todas" || j.categoria===filtroCat)
  );
  const totOrcJogos  = jogosFiltered.reduce((s,j) => s+subTotal(j.orcado), 0);
  const totProvJogos = jogosFiltered.reduce((s,j) => s+subTotal(j.provisionado), 0);

  const savingRodada = useMemo(() => {
    const map = {};
    divulgados.forEach(j => {
      const r = `R${j.rodada}`;
      if(!map[r]) map[r] = { name:r, Saving:0 };
      map[r].Saving += subTotal(j.orcado) - subTotal(j.provisionado);
    });
    return Object.values(map).sort((a,b) => parseInt(a.name.slice(1))-parseInt(b.name.slice(1)));
  }, [jogos]);

  const TABS_ORC  = ["dashboard","serviços","jogos","micro","savings","gráficos"];
  const TABS_NF   = ["notas fiscais","mensal"];
  const TABS_FORN = ["cadastro","tabela de precos"];
  const TABS_REL  = ["apresentações","envio"];
  const TABS = setor === "orcamento" ? TABS_ORC : setor === "notas" ? TABS_NF : setor === "fornecedores" ? TABS_FORN : TABS_REL;

  const handleSetorChange = s => {
    setSetor(s);
    if (s === "orcamento") setTab("dashboard");
    else if (s === "notas") setTab("notas fiscais");
    else if (s === "fornecedores") setTab("cadastro");
    else if (s === "relatorio") setTab("apresentações");
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:T.textMd,fontSize:16}}>Carregando...</p>
    </div>
  );

  const SETORES = [
    {k:"orcamento",    l:"Orçamento",     icon:LayoutDashboard},
    {k:"notas",        l:"Notas Fiscais", icon:FileText},
    {k:"fornecedores", l:"Fornecedores",  icon:Users},
    {k:"relatorio",    l:"Relatório",     icon:ClipboardList},
  ];

  const setorAtual = SETORES.find(s => s.k === setor);

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
        {/* logo / back */}
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

        {/* setores */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {SETORES.map(s => (
            <IconButton key={s.k} icon={s.icon} title={s.l}
              active={setor===s.k}
              onClick={()=>handleSetorChange(s.k)}
              size={44} T={T}/>
          ))}
        </div>

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
          padding: "20px 32px 0",
        }}>
          <div style={{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"flex-start",
            flexWrap:"wrap",
            gap:16,
            paddingBottom:18,
          }}>
            <div style={{ minWidth:0, display:"flex", alignItems:"center", gap:14 }}>
              {setorAtual?.icon && (
                <div style={{
                  width:42, height:42, borderRadius:12,
                  background: T.brandSoft || "rgba(16,185,129,0.12)",
                  border: `1px solid ${T.brandBorder || "rgba(16,185,129,0.28)"}`,
                  color: T.brand || "#10b981",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0,
                }}>
                  <setorAtual.icon size={20} strokeWidth={2.25}/>
                </div>
              )}
              <div style={{ minWidth:0 }}>
                <p style={{
                  color: T.brand || "#10b981",
                  fontSize: 10,
                  letterSpacing:"0.16em",
                  textTransform:"uppercase",
                  margin:"0 0 3px",
                  fontWeight:700,
                }}>Livemode · Transmissões · {setorAtual?.l}</p>
                <h1 style={{
                  fontSize:20,
                  fontWeight:800,
                  margin:0,
                  color:T.text,
                  letterSpacing:"-0.02em",
                }}>Brasileirão Série A 2026</h1>
                <p style={{ color:T.textMd, fontSize:12, margin:"4px 0 0" }}>
                  <span className="num" style={{ color:T.text, fontWeight:600 }}>{divulgados.length}</span> divulgados
                  <span style={{ color:T.border, margin:"0 8px" }}>·</span>
                  <span className="num" style={{ color:T.text, fontWeight:600 }}>{aDivulgar.length}</span> a divulgar
                  <span style={{ color:T.border, margin:"0 8px" }}>·</span>
                  <span className="num" style={{ color:T.text, fontWeight:600 }}>38</span> rodadas
                </p>
              </div>
            </div>

            <div style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 18px",
              background: T.surfaceAlt || T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: RADIUS.lg,
            }}>
              <Activity size={16} color={T.brand || "#10b981"} strokeWidth={2.25}/>
              <div style={{ textAlign:"right" }}>
                <p style={{ color:T.textSm, fontSize:10, margin:"0 0 2px", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:600 }}>Execução geral</p>
                <p className="num" style={{
                  fontSize:22,
                  fontWeight:800,
                  color: pctGasto>80 ? (T.danger||"#ef4444") : (T.brand||"#10b981"),
                  margin:0,
                  filter:ocultar?"blur(8px)":"none",
                  transition:"filter 0.2s",
                  letterSpacing:"-0.02em",
                  lineHeight:1,
                }}>{pctGasto}%</p>
              </div>
            </div>
          </div>

          {/* tabs */}
          <div style={{
            display:"flex", gap:4, overflowX:"auto", WebkitOverflowScrolling:"touch",
            marginBottom:-1,
          }}>
            {TABS.map(t => {
              const isActive = tab===t;
              return (
                <button key={t} onClick={()=>setTab(t)} style={{
                  padding:"10px 16px",
                  border:"none",
                  borderBottom: `2px solid ${isActive ? (T.brand||"#10b981") : "transparent"}`,
                  background:"transparent",
                  color: isActive ? (T.brand||"#10b981") : T.textMd,
                  fontWeight: isActive ? 700 : 500,
                  fontSize:13,
                  cursor:"pointer",
                  whiteSpace:"nowrap",
                  textTransform:"capitalize",
                  flexShrink:0,
                  transition:"color .15s, border-color .15s",
                  letterSpacing:"-0.005em",
                }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{padding:"28px 32px",filter:ocultar?"blur(10px)":"none",transition:"filter 0.3s",userSelect:ocultar?"none":"auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
            <Stat T={T} label="Total Orçado"       value={fmt(totalOrc)}           sub="Jogos + serviços fixos"                                           color={T.brand}   icon={Wallet}     />
            <Stat T={T} label="Total Provisionado" value={fmt(totalProv)}          sub={`${totalOrc?((totalProv/totalOrc)*100).toFixed(1):0}% do orçado`} color={T.info}    icon={PiggyBank}  />
            <Stat T={T} label="Total Realizado"    value={fmt(totalReal)}          sub={`${pctGasto}% executado`}                                         color={T.warning} icon={TrendingUp} />
            <Stat T={T} label="Saldo Disponível"   value={fmt(totalOrc-totalReal)} sub="Orçado − Realizado"                                               color={(totalOrc-totalReal)>=0 ? T.brand : T.danger} icon={Activity}/>
          </div>
          <Card T={T}>
            <SectionHeader
              T={T}
              title="Resumo por Categoria"
              subtitle="Visão consolidada por natureza de despesa"
              icon={LayoutDashboard}
              right={
                <div style={{display:"flex",gap:10,fontSize:11,color:T.textMd}}>
                  <Badge color="#6366f1" T={T}>Fixo</Badge>
                  <Badge color="#f43f5e" T={T}>Variável</Badge>
                </div>
              }
            />
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
                <thead>
                  <tr style={{background:T.surfaceAlt||T.bg}}>
                    {["Categoria","Tipo","Orçado","Provisionado","Realizado","Saldo","% Exec.","Progresso"].map(h => (
                      <th key={h} style={{
                        padding:"11px 16px",
                        textAlign:h==="Categoria"||h==="Tipo"?"left":"right",
                        color:T.textSm,
                        fontSize:10,
                        fontWeight:700,
                        letterSpacing:"0.06em",
                        textTransform:"uppercase",
                        whiteSpace:"nowrap",
                        borderBottom:`1px solid ${T.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESUMO_CATS.map(c => {
                    const saldo = c.orcado-c.realizado;
                    const pct   = c.orcado ? Math.min(100,(c.realizado/c.orcado)*100) : 0;
                    return (
                      <tr key={c.nome} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{padding:"13px 16px",fontWeight:600,whiteSpace:"nowrap",color:T.text,fontSize:13}}>{c.nome}</td>
                        <td style={{padding:"13px 16px"}}><Pill label={c.tipo} color={TIPO_COLOR[c.tipo]}/></td>
                        <td className="num" style={{padding:"13px 16px",textAlign:"right",whiteSpace:"nowrap",color:T.text,fontSize:13}}>{fmt(c.orcado)}</td>
                        <td className="num" style={{padding:"13px 16px",textAlign:"right",color:T.info||"#3b82f6",whiteSpace:"nowrap",fontSize:13}}>{fmt(c.provisionado||0)}</td>
                        <td className="num" style={{padding:"13px 16px",textAlign:"right",color:T.warning||"#f59e0b",whiteSpace:"nowrap",fontSize:13}}>{fmt(c.realizado)}</td>
                        <td className="num" style={{padding:"13px 16px",textAlign:"right",fontWeight:700,color:saldo<0?(T.danger||"#ef4444"):(T.brand||"#10b981"),whiteSpace:"nowrap",fontSize:13}}>{fmt(saldo)}</td>
                        <td className="num" style={{padding:"13px 16px",textAlign:"right",color:T.text,fontSize:13}}>{pct.toFixed(1)}%</td>
                        <td style={{padding:"13px 20px",minWidth:120}}>
                          <Progress value={pct} T={T}/>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg,fontWeight:700}}>
                    <td colSpan={2} style={{padding:"14px 16px",color:T.text,fontSize:12,letterSpacing:"0.04em",textTransform:"uppercase"}}>Total Geral</td>
                    <td className="num" style={{padding:"14px 16px",textAlign:"right",color:T.brand||"#10b981",whiteSpace:"nowrap",fontSize:14,fontWeight:700}}>{fmt(totalOrc)}</td>
                    <td className="num" style={{padding:"14px 16px",textAlign:"right",color:T.info||"#3b82f6",whiteSpace:"nowrap",fontSize:14,fontWeight:700}}>{fmt(totalProv)}</td>
                    <td className="num" style={{padding:"14px 16px",textAlign:"right",color:T.warning||"#f59e0b",whiteSpace:"nowrap",fontSize:14,fontWeight:700}}>{fmt(totalReal)}</td>
                    <td className="num" style={{padding:"14px 16px",textAlign:"right",color:(totalOrc-totalReal)>=0?(T.brand||"#10b981"):(T.danger||"#ef4444"),whiteSpace:"nowrap",fontSize:14,fontWeight:700}}>{fmt(totalOrc-totalReal)}</td>
                    <td className="num" style={{padding:"14px 16px",textAlign:"right",color:T.text,fontSize:14,fontWeight:700}}>{pctGasto}%</td>
                    <td/>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>)}

        {/* ── ABAS ── */}
        {tab==="jogos"         && <TabJogos         jogos={jogos} filtrados={filtrados} filtroRod={filtroRod} setFiltroRod={setFiltroRod} filtroCat={filtroCat} setFiltroCat={setFiltroCat} showPlaceholder={showPlaceholder} setShowPlaceholder={setShowPlaceholder} rodadasList={rodadasList} setMicroJogoId={setMicroJogoId} setTab={setTab} setNovo={setNovo} setNovoRapido={setNovoRapido} onDelete={deleteJogo} onEdit={editJogo} T={T}/>}
        {tab==="savings"       && <TabSavings       jogosFiltered={jogosFiltered} divulgados={divulgados} totOrcJogos={totOrcJogos} totProvJogos={totProvJogos} filtroRod={filtroRod} setFiltroRod={setFiltroRod} filtroCat={filtroCat} setFiltroCat={setFiltroCat} rodadasList={rodadasList} T={T}/>}
        {tab==="gráficos"      && <TabGraficos      divulgados={divulgados} savingRodada={savingRodada} RESUMO_CATS={RESUMO_CATS} T={T}/>}
        {tab==="micro"         && <VisaoMicro       jogos={jogos} jogoId={microJogoId} onChangeJogo={setMicroJogoId} onSave={saveJogo} T={T}/>}
        {tab==="serviços"      && <TabServicos      servicos={servicosCalc} setServicos={setServicos} T={T}/>}
        {tab==="notas fiscais" && <TabNotas notas={notas} setNotas={setNotas} jogos={jogos} setJogos={setJogos} fornecedores={fornecedores} envios={envios} T={T}/>}
        {tab==="mensal" && <TabNotasMensal notas={notasMensais} setNotas={setNotasMensais} fornecedores={fornecedores} servicos={servicosCalc} T={T}/>}
        {tab==="cadastro"      && <TabFornecedores fornecedores={fornecedores} setFornecedores={setFornecedores} T={T}/>}
        {tab==="tabela de precos" && <TabTabelaPrecos tabelaPrecos={tabelaPrecos} setTabelaPrecos={setTabelaPrecos} fornecedores={fornecedores} T={T}/>}
        {tab==="apresentações" && <TabApresentacoes jogos={divulgados} servicos={servicosCalc} notasMensais={notasMensais} T={T}/>}
        {tab==="envio"         && <TabEnvio jogos={jogos} notas={notas} notasMensais={notasMensais} servicos={servicosCalc} envios={envios} setEnvios={setEnvios} T={T}/>}

      </div>

      {showNovo    && <NovoJogoModal   onSave={addJogo} onClose={()=>setNovo(false)} T={T}/>}
      {novoRapido  && <NovoRapidoModal cenario={novoRapido} jogos={jogos} onSave={addJogo} onClose={()=>setNovoRapido(null)} T={T}/>}
      {jogoEdit    && <NovoJogoModal   jogo={jogoEdit} onSave={handleEditSave} onClose={()=>setJogoEdit(null)} T={T}/>}

      </div>{/* /Main */}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
import FormularioPublico from "./components/FormularioPublico";
import EnvioPublico from "./components/EnvioPublico";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => lsGet(LS_DARK, true));
  const [pagina,   setPagina]   = useState("home");
  const T = darkMode ? DARK : LIGHT;

  const toggleDark = v => {
    const next = typeof v === "function" ? v(darkMode) : v;
    setDarkMode(next); lsSet(LS_DARK, next);
  };

  // Rotas públicas
  if (window.location.hash === "#formulario") return <FormularioPublico/>;
  const envioMatch = window.location.hash.match(/^#envio\/(\d+)$/);
  if (envioMatch) return <EnvioPublico numero={parseInt(envioMatch[1])}/>;

  if(pagina==="brasileirao-2026") return <Brasileirao onBack={()=>setPagina("home")} T={T} darkMode={darkMode} setDarkMode={toggleDark}/>;
  return <Home onEnter={setPagina} T={T} darkMode={darkMode} setDarkMode={toggleDark}/>
}
