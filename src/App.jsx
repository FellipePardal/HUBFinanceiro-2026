import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

import { DARK, LIGHT, CATS, CENARIO_INFO, TIPO_COLOR, PIE_COLORS, LS_JOGOS, LS_SERVICOS, LS_DARK, btnStyle, iSty } from "./constants";
import { fmt, fmtK, subTotal, catTotal, lsGet, lsSet } from "./utils";
import { ALL_JOGOS, SERVICOS_INIT, allSubKeys, getDefaults } from "./data";
import { KPI, Pill, CustomTooltip } from "./components/shared";
import Home             from "./components/Home";
import TabServicos      from "./components/tabs/TabServicos";
import TabRelatorio     from "./components/tabs/TabRelatorio";
import VisaoMicro       from "./components/tabs/VisaoMicro";
import TabApresentacoes from "./components/tabs/TabApresentacoes";
import { NovoJogoModal, NovoRapidoModal } from "./components/modals/NovoJogoModal";

// ─── BRASILEIRÃO ──────────────────────────────────────────────────────────────
function Brasileirao({onBack, T, darkMode, setDarkMode}) {
  const [jogos, setJogosRaw]       = useState(() => lsGet(LS_JOGOS, ALL_JOGOS));
  const [servicos, setServicosRaw] = useState(() => lsGet(LS_SERVICOS, SERVICOS_INIT));

  const setJogos = fn => setJogosRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    lsSet(LS_JOGOS, next); return next;
  });
  const setServicos = fn => setServicosRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    lsSet(LS_SERVICOS, next); return next;
  });

  const varCalc = useMemo(() => {
    const allJ = jogos.filter(j => j.mandante !== "A definir");
    const result = CATS.map(cat => ({
      nome: cat.label,
      orcado:      allJ.reduce((s,j) => s+catTotal(j.orcado, cat), 0),
      provisionado:allJ.reduce((s,j) => s+catTotal(j.provisionado, cat), 0),
      realizado:   allJ.reduce((s,j) => s+catTotal(j.realizado, cat), 0),
      tipo: "variavel",
    }));
    const extraOrc = allJ.reduce((s,j) => s+((j.orcado&&j.orcado.extra)||0), 0);
    result.push({nome:"Extra", orcado:extraOrc, provisionado:0, realizado:0, tipo:"variavel"});
    return result;
  }, [jogos]);

  const fixosCalc = useMemo(() => servicos.map(s => ({
    nome: s.secao,
    orcado:      s.itens.reduce((t,i) => t+i.orcado, 0),
    provisionado:s.itens.reduce((t,i) => t+i.provisionado, 0),
    realizado:   s.itens.reduce((t,i) => t+i.realizado, 0),
    tipo: "fixo",
  })), [servicos]);

  const RESUMO_CATS = [...varCalc, ...fixosCalc];

  const [tab,            setTab]            = useState("dashboard");
  const [showNovo,       setNovo]           = useState(false);
  const [novoRapido,     setNovoRapido]     = useState(null);
  const [filtroRod,      setFiltroRod]      = useState("Todas");
  const [filtroCat,      setFiltroCat]      = useState("Todas");
  const [showPlaceholder,setShowPlaceholder]= useState(false);
  const [microJogoId,    setMicroJogoId]    = useState(jogos.find(j=>j.mandante!=="A definir")?.id);

  const saveJogo = j => setJogos(js => js.map(x => x.id===j.id ? j : x));
  const addJogo  = j => { setJogos(js => [...js, j]); setNovo(false); setNovoRapido(null); };

  const totalOrc  = RESUMO_CATS.reduce((s,c) => s+c.orcado, 0);
  const totalProv = RESUMO_CATS.reduce((s,c) => s+c.provisionado, 0);
  const totalReal = RESUMO_CATS.reduce((s,c) => s+c.realizado, 0);
  const pctGasto  = totalOrc ? ((totalReal/totalOrc)*100).toFixed(1) : 0;

  const divulgados  = jogos.filter(j => j.mandante !== "A definir");
  const aDivulgar   = jogos.filter(j => j.mandante === "A definir");
  const rodadasList = ["Todas", ...Array.from(new Set(divulgados.map(j=>j.rodada))).sort((a,b)=>a-b).map(String)];
  const filtrados   = (showPlaceholder ? jogos : divulgados).filter(j =>
    (filtroRod==="Todas" || j.rodada===parseInt(filtroRod)) &&
    (filtroCat==="Todas" || j.categoria===filtroCat)
  );
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
      if(!map[r]) map[r] = {name:r, Saving:0};
      map[r].Saving += subTotal(j.orcado) - subTotal(j.provisionado);
    });
    return Object.values(map).sort((a,b) => parseInt(a.name.slice(1))-parseInt(b.name.slice(1)));
  }, [jogos]);

  const TABS = ["dashboard","serviços","jogos","micro","savings","gráficos","relatório","apresentações"];

  // ── Filtros reutilizáveis ──────────────────────────────────────────────────
  const Filtros = () => (
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
      {rodadasList.map(r => (
        <button key={r} onClick={()=>setFiltroRod(r)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,background:filtroRod===r?"#22c55e":T.card,color:filtroRod===r?"#fff":T.textMd}}>
          {r==="Todas" ? "Todas" : `Rd ${r}`}
        </button>
      ))}
      <div style={{width:1,background:T.border,margin:"0 4px"}}/>
      {["Todas","B1","B2"].map(c => (
        <button key={c} onClick={()=>setFiltroCat(c)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,background:filtroCat===c?"#f59e0b":T.card,color:filtroCat===c?"#000":T.textMd}}>
          {c==="Todas" ? "B1+B2" : c}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',sans-serif",paddingBottom:40}}>

      {/* Header verde */}
      <div style={{background:"linear-gradient(135deg,#166534,#15803d,#166534)",padding:"16px 16px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:600}}>← Portal</button>
            <div>
              <p style={{color:"#86efac",fontSize:11,letterSpacing:2,textTransform:"uppercase",margin:"0 0 2px"}}>FFU — Transmissões</p>
              <h1 style={{fontSize:19,fontWeight:700,margin:0,color:"#fff"}}>Brasileirão Série A 2026</h1>
              <p style={{color:"#bbf7d0",fontSize:11,margin:"2px 0 0"}}>{divulgados.length} jogos divulgados · {aDivulgar.length} a divulgar · 38 rodadas</p>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
            <button onClick={()=>setDarkMode(d=>!d)} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"4px 12px",cursor:"pointer",fontSize:12,color:"#fff",fontWeight:600}}>
              {darkMode ? "☀️ Claro" : "🌙 Escuro"}
            </button>
            <div style={{textAlign:"right"}}>
              <p style={{color:"#86efac",fontSize:10,margin:"0 0 1px"}}>Execução geral</p>
              <p style={{fontSize:26,fontWeight:800,color:pctGasto>80?"#fca5a5":"#86efac",margin:0}}>{pctGasto}%</p>
            </div>
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

      <div style={{padding:"24px 16px"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:24}}>
            <KPI label="Total Orçado"      value={fmt(totalOrc)}  sub="Jogos + serviços fixos"                          color="#22c55e" T={T}/>
            <KPI label="Total Provisionado"value={fmt(totalProv)} sub={`${totalOrc?((totalProv/totalOrc)*100).toFixed(1):0}% do orçado`} color="#3b82f6" T={T}/>
            <KPI label="Total Realizado"   value={fmt(totalReal)} sub={`${pctGasto}% executado`}                        color="#f59e0b" T={T}/>
            <KPI label="Saldo Disponível"  value={fmt(totalOrc-totalReal)} sub="Orçado - Realizado"                     color={(totalOrc-totalReal)>=0?"#a3e635":"#ef4444"} T={T}/>
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
                <thead><tr style={{background:T.bg}}>{["Categoria","Tipo","Orçado","Provisionado","Realizado","Saldo","% Exec.","Progresso"].map(h=><th key={h} style={{padding:"10px 16px",textAlign:h==="Categoria"||h==="Tipo"?"left":"right",color:T.textSm,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
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
                        <td style={{padding:"12px 20px"}}><div style={{background:T.border,borderRadius:4,height:8,minWidth:60}}><div style={{background:pct>90?"#ef4444":pct>60?"#f59e0b":"#22c55e",width:`${pct}%`,height:"100%",borderRadius:4}}/></div></td>
                      </tr>
                    );
                  })}
                  <tr style={{borderTop:`2px solid ${T.muted}`,background:T.bg,fontWeight:700}}>
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

        {/* ── JOGOS ── */}
        {tab==="jogos" && (<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {rodadasList.map(r=>(<button key={r} onClick={()=>setFiltroRod(r)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,background:filtroRod===r?"#22c55e":T.card,color:filtroRod===r?"#fff":T.textMd}}>{r==="Todas"?"Todas":`Rd ${r}`}</button>))}
              <div style={{width:1,background:T.border,margin:"0 4px"}}/>
              {["Todas","B1","B2"].map(c=>(<button key={c} onClick={()=>setFiltroCat(c)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,background:filtroCat===c?"#f59e0b":T.card,color:filtroCat===c?"#000":T.textMd}}>{c==="Todas"?"B1+B2":c}</button>))}
              <button onClick={()=>setShowPlaceholder(p=>!p)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,background:showPlaceholder?"#8b5cf6":T.card,color:showPlaceholder?"#fff":T.textMd}}>
                {showPlaceholder ? "Ocultar a divulgar" : "Ver a divulgar"}
              </button>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button onClick={()=>setNovoRapido("b1")}  style={{...btnStyle,background:"#22c55e",fontSize:12}}>+ B1 Sudeste</button>
              <button onClick={()=>setNovoRapido("b2s")} style={{...btnStyle,background:"#3b82f6",fontSize:12}}>+ B2 Sudeste</button>
              <button onClick={()=>setNovoRapido("b2sul")} style={{...btnStyle,background:"#f59e0b",color:"#000",fontSize:12}}>+ B2 Sul</button>
              <button onClick={()=>setNovo(true)} style={{...btnStyle,background:"#475569",fontSize:12}}>+ Personalizado</button>
            </div>
          </div>
          <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,color:T.textSm,fontSize:12}}>{filtrados.length} jogos</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
                <thead><tr style={{background:T.bg}}>{["Jogo","Rd","Cidade","Data","Cat.","Detentor","Orçado","Provisionado","Realizado","Saving",""].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtrados.map(j => {
                    const o=subTotal(j.orcado), p=subTotal(j.provisionado), r=subTotal(j.realizado);
                    const isDef = j.mandante==="A definir";
                    return (
                      <tr key={j.id} style={{borderTop:`1px solid ${T.border}`,opacity:isDef?0.45:1}}>
                        <td style={{padding:"10px 12px",fontWeight:600,fontSize:13,whiteSpace:"nowrap",color:T.text}}>{isDef?<span style={{color:T.textSm,fontStyle:"italic"}}>A divulgar</span>:`${j.mandante} x ${j.visitante}`}</td>
                        <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{j.rodada}</td>
                        <td style={{padding:"10px 12px",color:T.textMd,fontSize:12,whiteSpace:"nowrap"}}>{j.cidade}</td>
                        <td style={{padding:"10px 12px",color:T.textMd,fontSize:12,whiteSpace:"nowrap"}}>{j.data}</td>
                        <td style={{padding:"10px 12px"}}><Pill label={j.categoria} color={j.categoria==="B1"?"#22c55e":"#f59e0b"}/></td>
                        <td style={{padding:"10px 12px",fontSize:11,color:T.textMd,whiteSpace:"nowrap"}}>{j.detentor}</td>
                        <td style={{padding:"10px 12px",fontSize:13,whiteSpace:"nowrap",color:T.text}}>{fmtK(o)}</td>
                        <td style={{padding:"10px 12px",fontSize:13,color:"#3b82f6",whiteSpace:"nowrap"}}>{fmtK(p)}</td>
                        <td style={{padding:"10px 12px",fontSize:13,color:"#f59e0b",whiteSpace:"nowrap"}}>{fmtK(r)}</td>
                        <td style={{padding:"10px 12px",fontWeight:600,color:(o-p)>=0?"#22c55e":"#ef4444",whiteSpace:"nowrap"}}>{fmtK(o-p)}</td>
                        <td style={{padding:"10px 12px"}}><button onClick={()=>{setMicroJogoId(j.id);setTab("micro");}} style={{...btnStyle,background:"#1d4ed8",padding:"4px 10px",fontSize:11}}>🔍</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>)}

        {/* ── MICRO / SERVIÇOS / RELATÓRIO / APRESENTAÇÕES ── */}
        {tab==="micro"       && <VisaoMicro      jogos={jogos} jogoId={microJogoId} onChangeJogo={setMicroJogoId} onSave={saveJogo} T={T}/>}
        {tab==="serviços"    && <TabServicos     servicos={servicos} setServicos={setServicos} T={T}/>}
        {tab==="relatório"   && <TabRelatorio    jogos={jogos} servicos={servicos} T={T}/>}
        {tab==="apresentações"&& <TabApresentacoes T={T}/>}

        {/* ── SAVINGS ── */}
        {tab==="savings" && (<>
          <Filtros/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
            <KPI label="Saving (Orç − Prov)" value={fmt(totOrcJogos-totProvJogos)} sub={`${totOrcJogos?((totOrcJogos-totProvJogos)/totOrcJogos*100).toFixed(1):0}% do budget`} color="#22c55e" T={T}/>
            <KPI label="% Saving" value={totOrcJogos?`${((totOrcJogos-totProvJogos)/totOrcJogos*100).toFixed(1)}%`:"—"} sub="sobre o orçado" color="#3b82f6" T={T}/>
            <KPI label="Custo Médio / Jogo" value={jogosFiltered.length?fmt(totOrcJogos/jogosFiltered.length):"—"} sub="orçado" color="#8b5cf6" T={T}/>
          </div>
          <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`}}><h3 style={{margin:0,fontSize:14,color:T.textMd}}>Saving por Jogo</h3></div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                <thead><tr style={{background:T.bg}}>{["Jogo","Rd","Cat.","Orçado","Provisionado","Saving"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {jogosFiltered.map(j => {
                    const o=subTotal(j.orcado), p=subTotal(j.provisionado), sv=o-p;
                    return (
                      <tr key={j.id} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{padding:"10px 14px",fontWeight:600,fontSize:13,whiteSpace:"nowrap",color:T.text}}>{j.mandante} x {j.visitante}</td>
                        <td style={{padding:"10px 14px",color:T.textMd}}>{j.rodada}</td>
                        <td style={{padding:"10px 14px"}}><Pill label={j.categoria} color={j.categoria==="B1"?"#22c55e":"#f59e0b"}/></td>
                        <td style={{padding:"10px 14px",whiteSpace:"nowrap",color:T.text}}>{fmt(o)}</td>
                        <td style={{padding:"10px 14px",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(p)}</td>
                        <td style={{padding:"10px 14px",fontWeight:700,color:sv>=0?"#22c55e":"#ef4444",whiteSpace:"nowrap"}}>{fmt(sv)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{borderTop:`2px solid ${T.muted}`,background:T.bg,fontWeight:700}}>
                    <td colSpan={3} style={{padding:"12px 14px",color:T.text}}>TOTAL</td>
                    <td style={{padding:"12px 14px",whiteSpace:"nowrap",color:T.text}}>{fmt(totOrcJogos)}</td>
                    <td style={{padding:"12px 14px",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(totProvJogos)}</td>
                    <td style={{padding:"12px 14px",fontWeight:700,color:(totOrcJogos-totProvJogos)>=0?"#22c55e":"#ef4444",whiteSpace:"nowrap"}}>{fmt(totOrcJogos-totProvJogos)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>)}

        {/* ── GRÁFICOS ── */}
        {tab==="gráficos" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:20}}>
            <div style={{background:T.card,borderRadius:12,padding:20}}>
              <h3 style={{margin:"0 0 16px",fontSize:14,color:T.textMd}}>Saving por Rodada</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={savingRodada}><XAxis dataKey="name" tick={{fill:T.textMd,fontSize:11}}/><YAxis tickFormatter={fmtK} tick={{fill:T.textMd,fontSize:11}}/><Tooltip content={<CustomTooltip T={T}/>}/><Bar dataKey="Saving" fill="#22c55e" radius={[4,4,0,0]}/></BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:T.card,borderRadius:12,padding:20}}>
              <h3 style={{margin:"0 0 16px",fontSize:14,color:T.textMd}}>Distribuição do Budget</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={RESUMO_CATS.map(c=>({name:c.nome,value:c.orcado}))} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{RESUMO_CATS.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:T.card,borderRadius:12,padding:20}}>
              <h3 style={{margin:"0 0 16px",fontSize:14,color:T.textMd}}>Orçado por Jogo — B1 vs B2</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={divulgados.map(j=>({name:`R${j.rodada} ${j.mandante.split(" ")[0]}`,valor:subTotal(j.orcado),cat:j.categoria}))}>
                  <XAxis dataKey="name" tick={{fill:T.textMd,fontSize:9}}/><YAxis tickFormatter={fmtK} tick={{fill:T.textMd,fontSize:11}}/><Tooltip content={<CustomTooltip T={T}/>}/>
                  <Bar dataKey="valor" radius={[4,4,0,0]}>{divulgados.map(j=><Cell key={j.id} fill={j.categoria==="B1"?"#22c55e":"#f59e0b"}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {showNovo    && <NovoJogoModal  onSave={addJogo} onClose={()=>setNovo(false)} T={T}/>}
      {novoRapido  && <NovoRapidoModal cenario={novoRapido} jogos={jogos} onSave={addJogo} onClose={()=>setNovoRapido(null)} T={T}/>}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(() => lsGet(LS_DARK, true));
  const [pagina,   setPagina]   = useState("home");
  const T = darkMode ? DARK : LIGHT;

  const toggleDark = v => {
    const next = typeof v === "function" ? v(darkMode) : v;
    setDarkMode(next); lsSet(LS_DARK, next);
  };

  if(pagina==="brasileirao-2026") return <Brasileirao onBack={()=>setPagina("home")} T={T} darkMode={darkMode} setDarkMode={toggleDark}/>;
  return <Home onEnter={setPagina} T={T} darkMode={darkMode} setDarkMode={toggleDark}/>;
}
