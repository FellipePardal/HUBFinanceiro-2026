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
  { key:"passagem",          label:"Passagem",          color:"#06b6d4" },
  { key:"clara",             label:"Clara",             color:"#ec4899" },
  { key:"espresso",          label:"Espresso",          color:"#eab308" },
  { key:"outros",            label:"Outros",            color:"#a855f7" },
];

export const CATS_COM_AJUSTE = ["passagem", "hospedagem"];

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
export default function TabLogistica({ logistica, setLogistica, jogos, fornecedores, eventosLog, setEventosLog, T }) {
  const fornecedoresList = Array.isArray(fornecedores) ? fornecedores : [];
  const eventos = Array.isArray(eventosLog) ? eventosLog : [];
  const [tab, setTab] = useState("grade");
  const [jogoSel, setJogoSel] = useState(null);   // pode ser { tipo:"jogo", id } ou { tipo:"evento", id }
  const [uploadingId, setUploadingId] = useState(null);
  const [ajusteAberto, setAjusteAberto] = useState(new Set()); // chaves "id|catKey" abertas
  const fileRefs = useRef({});
  const painelRef = useRef(null);
  const ajusteKey = (id, catKey) => `${id}|${catKey}`;
  const toggleAjuste = (id, catKey) => setAjusteAberto(p => { const k = ajusteKey(id,catKey); const n = new Set(p); n.has(k)?n.delete(k):n.add(k); return n; });

  const TS = tableStyles(T);
  const teal = "#14b8a6";
  const purple = "#a855f7";
  const danger = T.danger || "#ef4444";

  const lancamentos = (Array.isArray(logistica) ? logistica : []).filter(l => l && (l.jogoId || l.eventoId));
  const divulgados = jogos.filter(j => j.mandante !== "A definir").sort((a,b) => a.rodada - b.rodada || a.id - b.id);


  // Helpers
  const valorAjusteCat = (l, catKey) => parseFloat(l.ajustes?.[catKey]?.valor)||0;
  const valorAjustesTotal = l => CATS_COM_AJUSTE.reduce((s,k) => s + valorAjusteCat(l,k), 0);
  const valorTotal = l => CATEGORIAS_LOG.reduce((s,c) => s + (parseFloat(l.valores?.[c.key])||0), 0) + valorAjustesTotal(l);
  const lancsPorJogo = jogoId => lancamentos.filter(l => l.jogoId === jogoId);
  const lancsPorEvento = evId => lancamentos.filter(l => l.eventoId === evId);
  const statusInfo = k => STATUS_REEMBOLSO.find(s => s.key === k) || STATUS_REEMBOLSO[0];

  // Totais gerais
  const totalGasto = lancamentos.reduce((s,l) => s + valorTotal(l), 0);
  const totalPendente   = lancamentos.filter(l => l.status==="pendente").reduce((s,l) => s+valorTotal(l), 0);
  const totalReembolsado= lancamentos.filter(l => l.status==="reembolsado").reduce((s,l) => s+valorTotal(l), 0);
  const totalRemarcacoes= lancamentos.reduce((s,l) => s + valorAjustesTotal(l), 0);

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
  const addLinhaJogo = jogoId => {
    const novo = {
      id: Date.now() + Math.random(),
      jogoId,
      prestador: "",
      valores: Object.fromEntries(CATEGORIAS_LOG.map(c => [c.key, 0])),
      arquivos: {},
      ajustes: Object.fromEntries(CATS_COM_AJUSTE.map(k => [k, {valor:0, motivo:""}])),
      status: "pendente",
      obs: "",
    };
    setLogistica(ls => [...(Array.isArray(ls)?ls:[]), novo]);
    setJogoSel({tipo:"jogo", id:jogoId});
  };
  const addLinhaEvento = eventoId => {
    const novo = {
      id: Date.now() + Math.random(),
      eventoId,
      prestador: "",
      valores: Object.fromEntries(CATEGORIAS_LOG.map(c => [c.key, 0])),
      arquivos: {},
      ajustes: Object.fromEntries(CATS_COM_AJUSTE.map(k => [k, {valor:0, motivo:""}])),
      status: "pendente",
      obs: "",
    };
    setLogistica(ls => [...(Array.isArray(ls)?ls:[]), novo]);
    setJogoSel({tipo:"evento", id:eventoId});
  };

  // Eventos
  const addEvento = () => {
    const nome = window.prompt("Nome do evento (ex: Media Day, Pré-temporada):");
    if (!nome) return;
    const novo = { id: Date.now() + Math.random(), nome, data:"" };
    setEventosLog(evs => [...(Array.isArray(evs)?evs:[]), novo]);
    setJogoSel({tipo:"evento", id:novo.id});
  };
  const renameEvento = (id, nome) => {
    setEventosLog(evs => (evs||[]).map(e => e.id===id ? {...e, nome} : e));
  };
  const delEvento = id => {
    const lancs = lancsPorEvento(id);
    if (lancs.length > 0 && !window.confirm(`Excluir evento e ${lancs.length} lançamento(s) vinculado(s)?`)) return;
    if (lancs.length === 0 && !window.confirm("Excluir evento?")) return;
    lancs.forEach(l => CATEGORIAS_LOG.forEach(c => deleteNFFile(`${l.id}_${c.key}`)));
    setLogistica(ls => (ls||[]).filter(l => l.eventoId !== id));
    setEventosLog(evs => (evs||[]).filter(e => e.id !== id));
    setJogoSel(null);
  };
  const updateAjuste = (id, catKey, patch) => {
    setLogistica(ls => (ls||[]).map(l => l.id === id
      ? { ...l, ajustes: { ...(l.ajustes||{}), [catKey]: { ...((l.ajustes||{})[catKey]||{valor:0,motivo:""}), ...patch } } }
      : l));
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
    CATEGORIAS_LOG.forEach(c => deleteNFFile(`${id}_${c.key}`));
    setLogistica(ls => (ls||[]).filter(l => l.id !== id));
  };
  const fileKey = (id, catKey) => `${id}_${catKey}`;
  const attachFile = async (id, catKey, file) => {
    if (!file) return;
    const uid = fileKey(id, catKey);
    setUploadingId(uid);
    try {
      const dataUrl = await fileToDataUrl(file);
      await saveNFFile(uid, dataUrl);
      setLogistica(ls => (ls||[]).map(l => l.id === id
        ? { ...l, arquivos: { ...(l.arquivos||{}), [catKey]: true } }
        : l));
    } catch(_){}
    setUploadingId(null);
  };
  const verComprovante = async (id, catKey) => {
    const url = await getNFFile(fileKey(id, catKey));
    if (!url) { alert("Sem comprovante anexado"); return; }
    const w = window.open(); w.document.write(`<iframe src="${url}" style="border:none;width:100%;height:100vh"></iframe>`);
  };
  const removerComprovante = (id, catKey) => {
    deleteNFFile(fileKey(id, catKey));
    setLogistica(ls => (ls||[]).map(l => l.id === id
      ? { ...l, arquivos: { ...(l.arquivos||{}), [catKey]: false } }
      : l));
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

  // Estilos reutilizados
  const inputInlineStyle = {
    width:"100%", background:"transparent", border:`1px solid transparent`,
    color:T.text, fontSize:11, fontWeight:600, padding:"4px 6px",
    borderRadius:4, outline:"none",
  };

  return (
    <div>
      <datalist id="fornecedores-logistica">
        {fornecedoresList.map(f => <option key={f.id} value={f.apelido}/>)}
      </datalist>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:20}}>
        <KPI label="Total Gasto"    value={fmt(totalGasto)}       sub={`${lancamentos.length} lançamentos`} color={purple} T={T}/>
        <KPI label="Top Prestador"  value={topPrestador?topPrestador[0]:"—"} sub={topPrestador?fmt(topPrestador[1]):"sem dados"} color={teal} T={T}/>
        <KPI label="Jogo Mais Caro" value={jogoMaisCaro?`${abreviar(jogoMaisCaro.jogo.mandante)}×${abreviar(jogoMaisCaro.jogo.visitante)}`:"—"}
             sub={jogoMaisCaro?`Rd${jogoMaisCaro.jogo.rodada} · ${fmt(jogoMaisCaro.total)}`:"sem dados"} color="#f43f5e" T={T}/>
        <KPI label="Pendente"       value={fmt(totalPendente)}    sub="A solicitar" color="#f59e0b" T={T}/>
        <KPI label="Reembolsado"    value={fmt(totalReembolsado)} sub={`${totalGasto?((totalReembolsado/totalGasto)*100).toFixed(0):0}% do total`} color="#22c55e" T={T}/>
        <KPI label="Custo Remarcações" value={fmt(totalRemarcacoes)} sub="Passagens canceladas/reemitidas" color="#ef4444" T={T}/>
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

      {/* GRADE — Cards por jogo/evento */}
      {tab === "grade" && (() => {
        // Helper: renderiza painel de detalhe (funciona para jogo ou evento)
        const renderPainelDetalhe = ({ titulo, subtitulo, lancs, onAddLinha, extraHeader }) => {
          const totalPainel = lancs.reduce((s,l) => s+valorTotal(l), 0);
          return (
            <div ref={painelRef}>
              <Card T={T} style={{marginTop:12,borderTop:`2px solid ${teal}`}}>
                <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border}`}}>
                  <div>
                    {subtitulo && <div style={{fontSize:10,color:teal,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{subtitulo}</div>}
                    <div style={{fontSize:15,fontWeight:700,color:T.text}}>{titulo}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    {extraHeader}
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:T.textSm}}>Total</div>
                      <div style={{fontSize:16,fontWeight:800,color:purple}}>{fmt(totalPainel)}</div>
                    </div>
                    <Button T={T} variant="primary" size="md" icon={Plus} onClick={onAddLinha}>Prestador</Button>
                  </div>
                </div>
                {lancs.length === 0 ? (
                  <div style={{padding:40,textAlign:"center",color:T.textSm,fontSize:12}}>Nenhum prestador ainda. Clique em "Prestador" para adicionar.</div>
                ) : (
                  <div style={TS.wrap}>
                    <table style={{...TS.table,minWidth:1300}}>
                      <thead>
                        <tr style={TS.thead}>
                          <th style={{...TS.th,...TS.thLeft,minWidth:180}}>Prestador</th>
                          {CATEGORIAS_LOG.map(c => (
                            <th key={c.key} style={{...TS.th,...TS.thRight,minWidth:140,color:c.color}}>{c.label}</th>
                          ))}
                          <th style={{...TS.th,...TS.thRight,color:purple,minWidth:100}}>Total</th>
                          <th style={{...TS.th,...TS.thLeft,minWidth:120}}>Status</th>
                          <th style={{...TS.th,minWidth:60}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lancs.map(l => {
                          const st = statusInfo(l.status);
                          const tot = valorTotal(l);
                          const ajustesVisiveis = CATS_COM_AJUSTE.filter(k => valorAjusteCat(l,k) > 0 || ajusteAberto.has(ajusteKey(l.id,k)));
                          return (
                            <Fragment key={l.id}>
                              <tr style={TS.tr}>
                                <td style={TS.td}>
                                  <input list="fornecedores-logistica" value={l.prestador||""}
                                    onChange={e=>updateLinha(l.id,{prestador:e.target.value})}
                                    placeholder="Selecione ou digite"
                                    style={inputInlineStyle}
                                    onFocus={e=>e.target.style.border=`1px solid ${teal}`}
                                    onBlur={e=>e.target.style.border="1px solid transparent"}/>
                                </td>
                                {CATEGORIAS_LOG.map(c => {
                                  const uid = fileKey(l.id, c.key);
                                  const temFile = !!l.arquivos?.[c.key];
                                  const temAjusteCat = CATS_COM_AJUSTE.includes(c.key);
                                  const ajV = valorAjusteCat(l, c.key);
                                  return (
                                    <td key={c.key} style={TS.td}>
                                      <div style={{display:"flex",alignItems:"center",gap:2}}>
                                        <input type="number" value={l.valores?.[c.key]||""}
                                          onChange={e=>updateValor(l.id, c.key, e.target.value)} placeholder="—"
                                          style={{...inputInlineStyle, textAlign:"right", flex:1, minWidth:0}}
                                          onFocus={e=>e.target.style.border=`1px solid ${teal}`}
                                          onBlur={e=>e.target.style.border="1px solid transparent"}/>
                                        <input ref={el=>fileRefs.current[uid]=el} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
                                          onChange={e=>attachFile(l.id, c.key, e.target.files[0])} style={{display:"none"}}/>
                                        {temFile ? (
                                          <>
                                            <button onClick={()=>verComprovante(l.id, c.key)} title="Ver"
                                              style={{background:"#22c55e22",color:"#22c55e",border:"none",borderRadius:4,padding:"3px 4px",cursor:"pointer",display:"flex"}}>
                                              <Eye size={11}/>
                                            </button>
                                            <button onClick={()=>removerComprovante(l.id, c.key)} title="Remover"
                                              style={{background:"transparent",color:T.textSm,border:"none",padding:"3px 2px",cursor:"pointer",fontSize:10}}>×</button>
                                          </>
                                        ) : (
                                          <button onClick={()=>fileRefs.current[uid]?.click()} disabled={uploadingId===uid} title="Anexar"
                                            style={{background:"transparent",color:T.textSm,border:`1px dashed ${T.muted}`,borderRadius:4,padding:"3px 4px",cursor:"pointer",display:"flex"}}>
                                            <Paperclip size={11}/>
                                          </button>
                                        )}
                                        {temAjusteCat && (
                                          <button onClick={()=>toggleAjuste(l.id, c.key)} title={ajV>0?`Ajuste: ${fmt(ajV)}`:"Cancelamento/reemissão"}
                                            style={{background:ajV>0?"#ef444422":"transparent",color:ajV>0?"#ef4444":T.textSm,border:`1px dashed ${ajV>0?"#ef4444":T.muted}`,borderRadius:4,padding:"2px 4px",cursor:"pointer",fontSize:10,fontWeight:700}}>⚠</button>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="num" style={{...TS.tdNum,color:purple,fontWeight:700}}>{tot>0?fmt(tot):"—"}</td>
                                <td style={TS.td}>
                                  <select value={l.status||"pendente"} onChange={e=>updateLinha(l.id,{status:e.target.value})}
                                    style={{background:st.color+"22",color:st.color,border:`1px solid ${st.color}55`,borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                                    {STATUS_REEMBOLSO.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                  </select>
                                </td>
                                <td style={TS.td}>
                                  <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>delLinha(l.id)}/>
                                </td>
                              </tr>
                              {ajustesVisiveis.map(catKey => {
                                const catLabel = CATEGORIAS_LOG.find(c => c.key === catKey)?.label || catKey;
                                const aj = l.ajustes?.[catKey] || {valor:0, motivo:""};
                                return (
                                  <tr key={`aj-${l.id}-${catKey}`} style={{background:"#ef444408"}}>
                                    <td colSpan={CATEGORIAS_LOG.length+4} style={{padding:"8px 16px"}}>
                                      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                                        <span style={{fontSize:10,fontWeight:800,color:"#ef4444",textTransform:"uppercase",letterSpacing:"0.04em"}}>⚠ Ajuste {catLabel}</span>
                                        <label style={{fontSize:11,color:T.textSm}}>Valor:&nbsp;
                                          <input type="number" value={aj.valor||""}
                                            onChange={e=>updateAjuste(l.id, catKey, {valor:parseFloat(e.target.value)||0})}
                                            placeholder="0" style={{...inputInlineStyle,width:110,textAlign:"right",border:`1px solid ${T.muted}`}}/>
                                        </label>
                                        <label style={{fontSize:11,color:T.textSm,flex:1,minWidth:200}}>Motivo:&nbsp;
                                          <input value={aj.motivo||""}
                                            onChange={e=>updateAjuste(l.id, catKey, {motivo:e.target.value})}
                                            placeholder={catKey==="passagem"?"Ex: jogo remarcado Rd5→Rd7":"Ex: cancelamento por mudança de data"}
                                            style={{...inputInlineStyle,border:`1px solid ${T.muted}`,width:"100%"}}/>
                                        </label>
                                        <button onClick={()=>{updateAjuste(l.id, catKey, {valor:0,motivo:""}); toggleAjuste(l.id, catKey);}}
                                          style={{background:"transparent",color:T.textSm,border:"none",fontSize:11,cursor:"pointer"}}>limpar</button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                        <tr style={{background:T.surfaceAlt||T.bg,borderTop:`2px solid ${T.borderStrong||T.border}`}}>
                          <td style={{...TS.td,fontSize:10,fontWeight:700,color:T.textSm,textTransform:"uppercase",letterSpacing:"0.04em"}}>Total</td>
                          {CATEGORIAS_LOG.map(c => {
                            const v = lancs.reduce((s,l) => s + (parseFloat(l.valores?.[c.key])||0), 0);
                            return <td key={c.key} className="num" style={{...TS.tdNum,color:v>0?c.color:T.textSm,fontWeight:800}}>{v>0?fmt(v):"—"}</td>;
                          })}
                          <td className="num" style={{...TS.tdNum,color:purple,fontWeight:800,fontSize:13}}>{fmt(totalPainel)}</td>
                          <td colSpan={2}/>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          );
        };

        const isJogoSel = (id) => jogoSel?.tipo === "jogo" && jogoSel.id === id;
        const isEventoSel = (id) => jogoSel?.tipo === "evento" && jogoSel.id === id;

        return (
          <>
            {/* EVENTOS DO CAMPEONATO */}
            <div style={{marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingLeft:4}}>
                <span style={{color:"#f43f5e",fontSize:11,fontWeight:800,letterSpacing:"0.08em",textTransform:"uppercase"}}>Eventos do Campeonato</span>
                <span style={{height:1,flex:1,background:T.border}}/>
                <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={addEvento}>Novo Evento</Button>
              </div>
              {eventos.length === 0 ? (
                <div style={{padding:"16px 18px",background:T.card,borderRadius:10,border:`1px dashed ${T.muted}`,color:T.textSm,fontSize:12,textAlign:"center"}}>
                  Nenhum evento cadastrado. Use "Novo Evento" para Media Day, Pré-temporada, etc.
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
                  {eventos.map(ev => {
                    const lancs = lancsPorEvento(ev.id);
                    const totalEv = lancs.reduce((s,l) => s+valorTotal(l), 0);
                    const selecionado = isEventoSel(ev.id);
                    return (
                      <div key={ev.id} onClick={()=>{
                          setJogoSel(selecionado?null:{tipo:"evento", id:ev.id});
                          if (!selecionado) setTimeout(()=>painelRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);
                        }}
                        style={{
                          background: selecionado ? "#f43f5e15" : T.card,
                          border: `1px solid ${selecionado ? "#f43f5e" : T.border}`,
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                        }}>
                        <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:6}}>{ev.nome}</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                          <span style={{fontSize:10,color:T.textSm}}>{lancs.length} prestador{lancs.length!==1?"es":""}</span>
                          <span style={{fontSize:13,fontWeight:800,color:totalEv>0?purple:T.textSm}}>{totalEv>0?fmt(totalEv):"—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Painel do evento selecionado */}
              {jogoSel?.tipo === "evento" && (() => {
                const ev = eventos.find(e => e.id === jogoSel.id);
                if (!ev) return null;
                return renderPainelDetalhe({
                  titulo: ev.nome,
                  subtitulo: "Evento",
                  lancs: lancsPorEvento(ev.id),
                  onAddLinha: () => addLinhaEvento(ev.id),
                  extraHeader: (
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input value={ev.nome} onChange={e=>renameEvento(ev.id, e.target.value)}
                        style={{...inputInlineStyle,border:`1px solid ${T.muted}`,width:180,fontSize:12}}/>
                      <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>delEvento(ev.id)}/>
                    </div>
                  ),
                });
              })()}
            </div>

            {/* JOGOS POR RODADA */}
            {rodadasGrade.map(([rod, jgs]) => {
              const jogoSelNestaRodada = jogoSel?.tipo === "jogo" ? jgs.find(j => j.id === jogoSel.id) : null;
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
                      const selecionado = isJogoSel(j.id);
                      return (
                        <div key={j.id} onClick={()=>{
                            setJogoSel(selecionado?null:{tipo:"jogo", id:j.id});
                            if (!selecionado) setTimeout(()=>painelRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);
                          }}
                          style={{
                            background: selecionado ? teal+"15" : T.card,
                            border: `1px solid ${selecionado ? teal : T.border}`,
                            borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          }}>
                          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:6}}>{j.mandante} × {j.visitante}</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                            <span style={{fontSize:10,color:T.textSm}}>{lancs.length} prestador{lancs.length!==1?"es":""}</span>
                            <span style={{fontSize:13,fontWeight:800,color:totalJogo>0?purple:T.textSm}}>{totalJogo>0?fmt(totalJogo):"—"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {jogoSelNestaRodada && renderPainelDetalhe({
                    titulo: `${jogoSelNestaRodada.mandante} × ${jogoSelNestaRodada.visitante}`,
                    subtitulo: `Rodada ${jogoSelNestaRodada.rodada}`,
                    lancs: lancsPorJogo(jogoSelNestaRodada.id),
                    onAddLinha: () => addLinhaJogo(jogoSelNestaRodada.id),
                  })}
                </div>
              );
            })}
          </>
        );
      })()}

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
