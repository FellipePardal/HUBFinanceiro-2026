import { useState, useMemo, useEffect } from "react";
import { DARK, LIGHT, CATS, TIPO_COLOR, LS_JOGOS, LS_SERVICOS, LS_DARK, btnStyle } from "./constants";
import { fmt, fmtK, subTotal, catTotal, lsGet, lsSet } from "./utils";
import { ALL_JOGOS, SERVICOS_INIT } from "./data";
import { KPI, Pill, CustomTooltip } from "./components/shared";
import Home             from "./components/Home";
import TabJogos         from "./components/tabs/TabJogos";
import TabSavings       from "./components/tabs/TabSavings";
import TabGraficos      from "./components/tabs/TabGraficos";
import TabServicos      from "./components/tabs/TabServicos";
import VisaoMicro       from "./components/tabs/VisaoMicro";
import TabApresentacoes from "./components/tabs/TabApresentacoes";
import TabNotas         from "./components/tabs/TabNotas";
import TabFornecedores  from "./components/tabs/TabFornecedores";
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
  const [loading, setLoading]            = useState(true);

  useEffect(() => {
    async function load() {
      const [j, s, n, f, nm, ev] = await Promise.all([getState('jogos'), getState('servicos'), getState('notas'), getState('fornecedores'), getState('notas_mensais'), getState('envios')]);
      if (j) setJogosRaw(j); else setSupabaseState('jogos', ALL_JOGOS);
      if (s) setServicosRaw(s); else setSupabaseState('servicos', SERVICOS_INIT);
      if (n) setNotasRaw(n); else setSupabaseState('notas', []);
      if (f) setFornecedoresRaw(f); else setSupabaseState('fornecedores', FORNECEDORES_INIT);
      if (nm) setNotasMensaisRaw(nm); else setSupabaseState('notas_mensais', []);
      if (ev) setEnviosRaw(ev); else setSupabaseState('envios', []);
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
      ? [{ nome:"Outros Mensais", orcado:0, provisionado:0, realizado: total, tipo:"variavel" }]
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
  const TABS_FORN = ["cadastro"];
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
    {k:"orcamento", l:"Orçamento",     icon:"📊"},
    {k:"notas",     l:"Notas Fiscais", icon:"📄"},
    {k:"fornecedores", l:"Fornecedores", icon:"👥"},
    {k:"relatorio",    l:"Relatório",    icon:"📋"},
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',sans-serif",display:"flex"}}>

      {/* Sidebar */}
      <div style={{width:64,minHeight:"100vh",background:"linear-gradient(180deg,#166534,#15803d)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:12,gap:4,flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"8px",cursor:"pointer",color:"#fff",fontSize:14,marginBottom:12,width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center"}} title="Voltar ao Portal">←</button>
        {SETORES.map(s => (
          <button key={s.k} onClick={() => handleSetorChange(s.k)} title={s.l}
            style={{width:48,height:48,borderRadius:12,border:"none",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",
              background:setor===s.k?"rgba(255,255,255,0.25)":"transparent",
              boxShadow:setor===s.k?"0 0 12px rgba(134,239,172,0.3)":"none"}}>
            {s.icon}
          </button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={()=>setOcultar(o=>!o)} title={ocultar?"Mostrar valores":"Ocultar valores"}
          style={{width:42,height:42,borderRadius:10,border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
            background:ocultar?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.1)",marginBottom:4}}>
          {ocultar ? "👁" : "🔒"}
        </button>
        <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Modo claro":"Modo escuro"}
          style={{width:42,height:42,borderRadius:10,border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(255,255,255,0.1)",marginBottom:12}}>
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Main */}
      <div style={{flex:1,minWidth:0,paddingBottom:40}}>
        {/* Header verde */}
        <div style={{background:"linear-gradient(135deg,#166534,#15803d,#166534)",padding:"16px 20px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <p style={{color:"#86efac",fontSize:11,letterSpacing:2,textTransform:"uppercase",margin:"0 0 2px"}}>FFU — Transmissões · {SETORES.find(s=>s.k===setor)?.l}</p>
              <h1 style={{fontSize:19,fontWeight:700,margin:0,color:"#fff"}}>Brasileirão Série A 2026</h1>
              <p style={{color:"#bbf7d0",fontSize:11,margin:"2px 0 0"}}>{divulgados.length} jogos divulgados · {aDivulgar.length} a divulgar · 38 rodadas</p>
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{color:"#86efac",fontSize:10,margin:"0 0 1px"}}>Execução geral</p>
              <p style={{fontSize:26,fontWeight:800,color:pctGasto>80?"#fca5a5":"#86efac",margin:0,filter:ocultar?"blur(8px)":"none",transition:"filter 0.2s"}}>{pctGasto}%</p>
            </div>
          </div>
          <div style={{display:"flex",gap:2,marginTop:14,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            {TABS.map(t => (
              <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 14px",borderRadius:"8px 8px 0 0",border:"none",cursor:"pointer",whiteSpace:"nowrap",background:tab===t?T.bg:"rgba(255,255,255,0.12)",color:tab===t?"#22c55e":"#e2e8f0",fontWeight:tab===t?700:400,fontSize:13,textTransform:"capitalize",flexShrink:0}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:"24px 20px",filter:ocultar?"blur(10px)":"none",transition:"filter 0.3s",userSelect:ocultar?"none":"auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:24}}>
            <KPI label="Total Orçado"       value={fmt(totalOrc)}           sub="Jogos + serviços fixos"                                           color="#22c55e" T={T}/>
            <KPI label="Total Provisionado" value={fmt(totalProv)}          sub={`${totalOrc?((totalProv/totalOrc)*100).toFixed(1):0}% do orçado`} color="#3b82f6" T={T}/>
            <KPI label="Total Realizado"    value={fmt(totalReal)}          sub={`${pctGasto}% executado`}                                         color="#f59e0b" T={T}/>
            <KPI label="Saldo Disponível"   value={fmt(totalOrc-totalReal)} sub="Orçado - Realizado"                                               color={(totalOrc-totalReal)>=0?"#a3e635":"#ef4444"} T={T}/>
          </div>
          <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Resumo por Categoria</h3>
              <div style={{display:"flex",gap:12,fontSize:12,color:T.textMd}}>
                <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"#6366f1",marginRight:4}}/>Fixo</span>
                <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"#f43f5e",marginRight:4}}/>Variável</span>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                <thead>
                  <tr style={{background:T.bg}}>
                    {["Categoria","Tipo","Orçado","Provisionado","Realizado","Saldo","% Exec.","Progresso"].map(h => (
                      <th key={h} style={{padding:"10px 16px",textAlign:h==="Categoria"||h==="Tipo"?"left":"right",color:T.textSm,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESUMO_CATS.map(c => {
                    const saldo = c.orcado-c.realizado;
                    const pct   = c.orcado ? Math.min(100,(c.realizado/c.orcado)*100) : 0;
                    return (
                      <tr key={c.nome} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{padding:"12px 16px",fontWeight:600,whiteSpace:"nowrap",color:T.text}}>{c.nome}</td>
                        <td style={{padding:"12px 16px"}}><Pill label={c.tipo} color={TIPO_COLOR[c.tipo]}/></td>
                        <td style={{padding:"12px 16px",textAlign:"right",whiteSpace:"nowrap",color:T.text}}>{fmt(c.orcado)}</td>
                        <td style={{padding:"12px 16px",textAlign:"right",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(c.provisionado||0)}</td>
                        <td style={{padding:"12px 16px",textAlign:"right",color:"#f59e0b",whiteSpace:"nowrap"}}>{fmt(c.realizado)}</td>
                        <td style={{padding:"12px 16px",textAlign:"right",fontWeight:600,color:saldo<0?"#ef4444":"#22c55e",whiteSpace:"nowrap"}}>{fmt(saldo)}</td>
                        <td style={{padding:"12px 16px",textAlign:"right",color:T.text}}>{pct.toFixed(1)}%</td>
                        <td style={{padding:"12px 20px"}}>
                          <div style={{background:T.border,borderRadius:4,height:8,minWidth:60}}>
                            <div style={{background:pct>90?"#ef4444":pct>60?"#f59e0b":"#22c55e",width:`${pct}%`,height:"100%",borderRadius:4}}/>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{borderTop:`2px solid ${T.border}`,background:T.bg,fontWeight:700}}>
                    <td colSpan={2} style={{padding:"12px 16px",color:T.text}}>TOTAL GERAL</td>
                    <td style={{padding:"12px 16px",textAlign:"right",color:"#22c55e",whiteSpace:"nowrap"}}>{fmt(totalOrc)}</td>
                    <td style={{padding:"12px 16px",textAlign:"right",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(totalProv)}</td>
                    <td style={{padding:"12px 16px",textAlign:"right",color:"#f59e0b",whiteSpace:"nowrap"}}>{fmt(totalReal)}</td>
                    <td style={{padding:"12px 16px",textAlign:"right",color:(totalOrc-totalReal)>=0?"#22c55e":"#ef4444",whiteSpace:"nowrap"}}>{fmt(totalOrc-totalReal)}</td>
                    <td style={{padding:"12px 16px",textAlign:"right",color:T.text}}>{pctGasto}%</td>
                    <td/>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
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
        {tab==="apresentações" && <TabApresentacoes jogos={divulgados} T={T}/>}
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
