import { useState, useMemo, useRef, Fragment } from "react";
import { KPI, Pill } from "../shared";
import { iSty, btnStyle } from "../../constants";
import { Card, Button, tableStyles } from "../ui";
import { Plus, Trash2, Paperclip, Eye, ChevronDown, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, CartesianGrid,
} from "recharts";
import { fileToDataUrl, saveNFFile, getNFFile, deleteNFFile } from "../../lib/supabase";

const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

export const CATEGORIAS_LOG = [
  { key:"transporte_locado", label:"Transporte Locado", color:"#6366f1" },
  { key:"uber",              label:"Uber",              color:"#f59e0b" },
  { key:"hospedagem",        label:"Hospedagem",        color:"#22c55e" },
  { key:"outros",            label:"Outros",            color:"#a855f7" },
];

export const STATUS_REEMBOLSO = [
  { key:"pendente",    label:"Pendente",    color:"#f59e0b" },
  { key:"solicitado",  label:"Solicitado",  color:"#3b82f6" },
  { key:"reembolsado", label:"Reembolsado", color:"#22c55e" },
];

function abreviar(nome) {
  if (!nome || nome === "A definir") return "TBD";
  const map = {"Fluminense":"FLU","Botafogo":"BOT","Flamengo":"FLA","Vasco":"VAS","Corinthians":"COR","Palmeiras":"PAL","São Paulo":"SAO","Athletico PR":"CAP","Grêmio":"GRE","Internacional":"INT","Cruzeiro":"CRU","Atlético MG":"CAM","Chapecoense":"CHA","Santos":"SAN","Vitória":"VIT","Mirassol":"MIR","Coritiba":"CFC"};
  return map[nome] || nome.slice(0,3).toUpperCase();
}

// ─── Componente Principal ──────────────────────────────────────────────────
// Modelo de dado: { id, jogoId, prestador, valores:{transporte_locado,uber,hospedagem,outros}, status, obs, hasFile }
export default function TabLogistica({ logistica, setLogistica, jogos, T }) {
  const [tab, setTab] = useState("grade");
  const [jogoSel, setJogoSel] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const fileRefs = useRef({});
  const painelRef = useRef(null);

  const TS = tableStyles(T);
  const teal = "#14b8a6";
  const purple = "#a855f7";
  const danger = T.danger || "#ef4444";

  const lancamentos = (Array.isArray(logistica) ? logistica : []).filter(l => l && l.jogoId);
  const divulgados = jogos.filter(j => j.mandante !== "A definir").sort((a,b) => a.rodada - b.rodada || a.id - b.id);


  // Helpers
  const valorTotal = l => CATEGORIAS_LOG.reduce((s,c) => s + (parseFloat(l.valores?.[c.key])||0), 0);
  const lancsPorJogo = jogoId => lancamentos.filter(l => l.jogoId === jogoId);
  const statusInfo = k => STATUS_REEMBOLSO.find(s => s.key === k) || STATUS_REEMBOLSO[0];

  // Totais gerais
  const totalGasto = lancamentos.reduce((s,l) => s + valorTotal(l), 0);
  const totalPendente   = lancamentos.filter(l => l.status==="pendente").reduce((s,l) => s+valorTotal(l), 0);
  const totalReembolsado= lancamentos.filter(l => l.status==="reembolsado").reduce((s,l) => s+valorTotal(l), 0);

  const gastoPorPrestador = useMemo(() => {
    const map = {};
    lancamentos.forEach(l => { const p = l.prestador || "—"; map[p] = (map[p]||0) + valorTotal(l); });
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  }, [lancamentos]);
  const topPrestador = gastoPorPrestador[0];

  const jogoMaisCaro = useMemo(() => {
    let max = null;
    divulgados.forEach(j => {
      const t = lancsPorJogo(j.id).reduce((s,l) => s+valorTotal(l), 0);
      if (!max || t > max.total) max = { jogo:j, total:t };
    });
    return max && max.total > 0 ? max : null;
  }, [lancamentos, divulgados]);

  // Rodadas (agrupadas)
  const rodadasGrade = useMemo(() => {
    const map = {};
    divulgados.forEach(j => { if (!map[j.rodada]) map[j.rodada] = []; map[j.rodada].push(j); });
    return Object.entries(map).sort(([a],[b]) => a-b);
  }, [divulgados]);

  // ─── CRUD inline ─────────────────────────────────────────────────────────
  const addLinha = jogoId => {
    const novo = {
      id: Date.now() + Math.random(),
      jogoId,
      prestador: "",
      valores: { transporte_locado:0, uber:0, hospedagem:0, outros:0 },
      status: "pendente",
      obs: "",
      hasFile: false,
    };
    setLogistica(ls => [...(Array.isArray(ls)?ls:[]), novo]);
    setJogoSel(jogoId);
  };

  const updateLinha = (id, patch) => {
    setLogistica(ls => (ls||[]).map(l => l.id === id ? { ...l, ...patch } : l));
  };
  const updateValor = (id, catKey, v) => {
    setLogistica(ls => (ls||[]).map(l => l.id === id
      ? { ...l, valores: { ...(l.valores||{}), [catKey]: parseFloat(v)||0 } }
      : l));
  };
  const delLinha = id => {
    if (!window.confirm("Excluir esta linha?")) return;
    deleteNFFile(id);
    setLogistica(ls => (ls||[]).filter(l => l.id !== id));
  };
  const attachFile = async (id, file) => {
    if (!file) return;
    setUploadingId(id);
    try {
      const dataUrl = await fileToDataUrl(file);
      await saveNFFile(id, dataUrl);
      updateLinha(id, { hasFile: true });
    } catch(_){}
    setUploadingId(null);
  };
  const verComprovante = async id => {
    const url = await getNFFile(id);
    if (!url) { alert("Sem comprovante anexado"); return; }
    const w = window.open(); w.document.write(`<iframe src="${url}" style="border:none;width:100%;height:100vh"></iframe>`);
  };

  // ─── Gráficos ────────────────────────────────────────────────────────────
  const porCategoria = CATEGORIAS_LOG.map(c => ({
    name: c.label,
    valor: lancamentos.reduce((s,l) => s + (parseFloat(l.valores?.[c.key])||0), 0),
    color: c.color,
  }));
  const porPrestador = gastoPorPrestador.map(([name, valor]) => ({ name, valor }));

  const TABS = [
    {value:"grade",    label:"Grade Jogo × Prestador"},
    {value:"graficos", label:"Gráficos"},
  ];

  // Célula editável numérica
  const CellNum = ({ value, onChange }) => (
    <input type="number" value={value||""} onChange={e=>onChange(e.target.value)}
      placeholder="—"
      style={{
        width:"100%", background:"transparent", border:`1px solid transparent`,
        color:T.text, fontSize:11, fontWeight:600, textAlign:"right", padding:"4px 6px",
        borderRadius:4, outline:"none",
      }}
      onFocus={e => e.target.style.border = `1px solid ${teal}`}
      onBlur={e => e.target.style.border = "1px solid transparent"}/>
  );
  const CellText = ({ value, onChange, placeholder }) => (
    <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{
        width:"100%", background:"transparent", border:`1px solid transparent`,
        color:T.text, fontSize:11, fontWeight:600, padding:"4px 6px",
        borderRadius:4, outline:"none",
      }}
      onFocus={e => e.target.style.border = `1px solid ${teal}`}
      onBlur={e => e.target.style.border = "1px solid transparent"}/>
  );

  return (
    <div>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:20}}>
        <KPI label="Total Gasto"    value={fmt(totalGasto)}       sub={`${lancamentos.length} lançamentos`} color={purple} T={T}/>
        <KPI label="Top Prestador"  value={topPrestador?topPrestador[0]:"—"} sub={topPrestador?fmt(topPrestador[1]):"sem dados"} color={teal} T={T}/>
        <KPI label="Jogo Mais Caro" value={jogoMaisCaro?`${abreviar(jogoMaisCaro.jogo.mandante)}×${abreviar(jogoMaisCaro.jogo.visitante)}`:"—"}
             sub={jogoMaisCaro?`Rd${jogoMaisCaro.jogo.rodada} · ${fmt(jogoMaisCaro.total)}`:"sem dados"} color="#f43f5e" T={T}/>
        <KPI label="Pendente"       value={fmt(totalPendente)}    sub="A solicitar" color="#f59e0b" T={T}/>
        <KPI label="Reembolsado"    value={fmt(totalReembolsado)} sub={`${totalGasto?((totalReembolsado/totalGasto)*100).toFixed(0):0}% do total`} color="#22c55e" T={T}/>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {TABS.map(t => (
          <button key={t.value} onClick={()=>setTab(t.value)} style={{
            padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
            background:tab===t.value?teal:"transparent",color:tab===t.value?"#fff":T.textMd,
          }}>{t.label}</button>
        ))}
      </div>

      {/* GRADE — Cards por jogo */}
      {tab === "grade" && (
        <>
          {rodadasGrade.map(([rod, jgs]) => {
            const jogoSelNestaRodada = jgs.find(j => j.id === jogoSel);
            return (
            <div key={`rd-${rod}`} style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingLeft:4}}>
                <span style={{color:teal,fontSize:11,fontWeight:800,letterSpacing:"0.08em",textTransform:"uppercase"}}>Rodada {rod}</span>
                <span style={{height:1,flex:1,background:T.border}}/>
                <span style={{color:T.textSm,fontSize:11}}>{fmt(jgs.reduce((s,j) => s + lancsPorJogo(j.id).reduce((ss,l) => ss+valorTotal(l),0), 0))}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
                {jgs.map(j => {
                  const lancs = lancsPorJogo(j.id);
                  const totalJogo = lancs.reduce((s,l) => s+valorTotal(l), 0);
                  const selecionado = jogoSel === j.id;
                  return (
                    <div key={j.id} onClick={()=>{
                        setJogoSel(selecionado?null:j.id);
                        if (!selecionado) setTimeout(()=>painelRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);
                      }}
                      style={{
                        background: selecionado ? teal+"15" : T.card,
                        border: `1px solid ${selecionado ? teal : T.border}`,
                        borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                        transition: "all 0.15s",
                      }}>
                      <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:6}}>
                        {j.mandante} × {j.visitante}
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                        <span style={{fontSize:10,color:T.textSm}}>{lancs.length} prestador{lancs.length!==1?"es":""}</span>
                        <span style={{fontSize:13,fontWeight:800,color:totalJogo>0?purple:T.textSm}}>{totalJogo>0?fmt(totalJogo):"—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Painel de detalhe — renderizado logo abaixo da rodada que contém o jogo selecionado */}
              {jogoSelNestaRodada && (() => {
                const j = jogoSelNestaRodada;
                const lancs = lancsPorJogo(j.id);
                const totalJogo = lancs.reduce((s,l) => s+valorTotal(l), 0);
                return (
                  <div ref={painelRef}>
                  <Card T={T} style={{marginTop:12,borderTop:`2px solid ${teal}`}}>
                <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border}`}}>
                  <div>
                    <div style={{fontSize:10,color:teal,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Rodada {j.rodada}</div>
                    <div style={{fontSize:15,fontWeight:700,color:T.text}}>{j.mandante} × {j.visitante}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:T.textSm}}>Total</div>
                      <div style={{fontSize:16,fontWeight:800,color:purple}}>{fmt(totalJogo)}</div>
                    </div>
                    <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>addLinha(j.id)}>Prestador</Button>
                  </div>
                </div>
                {lancs.length === 0 ? (
                  <div style={{padding:40,textAlign:"center",color:T.textSm,fontSize:12}}>Nenhum prestador ainda. Clique em "Prestador" para adicionar.</div>
                ) : (
                  <div style={TS.wrap}>
                    <table style={{...TS.table,minWidth:900}}>
                      <thead>
                        <tr style={TS.thead}>
                          <th style={{...TS.th,...TS.thLeft,minWidth:200}}>Prestador</th>
                          {CATEGORIAS_LOG.map(c => (
                            <th key={c.key} style={{...TS.th,...TS.thRight,minWidth:120,color:c.color}}>{c.label}</th>
                          ))}
                          <th style={{...TS.th,...TS.thRight,color:purple,minWidth:100}}>Total</th>
                          <th style={{...TS.th,...TS.thLeft,minWidth:120}}>Status</th>
                          <th style={{...TS.th,minWidth:130}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lancs.map(l => {
                          const st = statusInfo(l.status);
                          const tot = valorTotal(l);
                          return (
                            <tr key={l.id} style={TS.tr}>
                              <td style={TS.td}>
                                <CellText value={l.prestador} onChange={v=>updateLinha(l.id,{prestador:v})} placeholder="Nome do prestador"/>
                              </td>
                              {CATEGORIAS_LOG.map(c => (
                                <td key={c.key} style={TS.td}>
                                  <CellNum value={l.valores?.[c.key]} onChange={v=>updateValor(l.id, c.key, v)}/>
                                </td>
                              ))}
                              <td className="num" style={{...TS.tdNum,color:purple,fontWeight:700}}>{tot>0?fmt(tot):"—"}</td>
                              <td style={TS.td}>
                                <select value={l.status||"pendente"} onChange={e=>updateLinha(l.id,{status:e.target.value})}
                                  style={{background:st.color+"22",color:st.color,border:`1px solid ${st.color}55`,borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                                  {STATUS_REEMBOLSO.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                              </td>
                              <td style={TS.td}>
                                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                                  <input ref={el => fileRefs.current[l.id] = el} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    onChange={e=>attachFile(l.id, e.target.files[0])} style={{display:"none"}}/>
                                  {l.hasFile && <Button T={T} variant="secondary" size="sm" icon={Eye} onClick={()=>verComprovante(l.id)}/>}
                                  <Button T={T} variant="secondary" size="sm" icon={Paperclip}
                                    onClick={()=>fileRefs.current[l.id]?.click()} disabled={uploadingId===l.id}/>
                                  <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>delLinha(l.id)}/>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{background:T.surfaceAlt||T.bg,borderTop:`2px solid ${T.borderStrong||T.border}`}}>
                          <td style={{...TS.td,fontSize:10,fontWeight:700,color:T.textSm,textTransform:"uppercase",letterSpacing:"0.04em"}}>Total</td>
                          {CATEGORIAS_LOG.map(c => {
                            const v = lancs.reduce((s,l) => s + (parseFloat(l.valores?.[c.key])||0), 0);
                            return <td key={c.key} className="num" style={{...TS.tdNum,color:v>0?c.color:T.textSm,fontWeight:800}}>{v>0?fmt(v):"—"}</td>;
                          })}
                          <td className="num" style={{...TS.tdNum,color:purple,fontWeight:800,fontSize:13}}>{fmt(totalJogo)}</td>
                          <td colSpan={2}/>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              </div>
                );
              })()}
            </div>
            );
          })}
        </>
      )}

      {/* GRÁFICOS */}
      {tab === "graficos" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:16}}>
          <Card T={T}>
            <div style={{padding:"16px 20px"}}>
              <h4 style={{margin:"0 0 12px",color:T.text,fontSize:13,fontWeight:700}}>Gasto por Categoria</h4>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={porCategoria.filter(x=>x.valor>0)} dataKey="valor" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,valor})=>`${name}: ${fmt(valor)}`}>
                    {porCategoria.map((c,i) => <Cell key={i} fill={c.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card T={T}>
            <div style={{padding:"16px 20px"}}>
              <h4 style={{margin:"0 0 12px",color:T.text,fontSize:13,fontWeight:700}}>Gasto por Prestador</h4>
              {porPrestador.length === 0
                ? <p style={{color:T.textSm,fontSize:12,margin:0,padding:"20px 0",textAlign:"center"}}>Sem lançamentos</p>
                : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={porPrestador}>
                    <CartesianGrid stroke={T.border} strokeDasharray="3 3"/>
                    <XAxis dataKey="name" tick={{fill:T.textMd,fontSize:10}} angle={-25} textAnchor="end" height={60}/>
                    <YAxis tick={{fill:T.textMd,fontSize:11}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                    <Tooltip formatter={v=>fmt(v)}/>
                    <Bar dataKey="valor" fill={teal}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
