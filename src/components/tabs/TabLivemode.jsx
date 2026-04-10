import { useState, useMemo, useRef } from "react";
import { KPI, Pill } from "../shared";
import { RADIUS, iSty, btnStyle } from "../../constants";
import { Card, PanelTitle, Button, Chip, Progress, tableStyles } from "../ui";
import { CheckCircle2, Clock, Edit2, Plus, Trash2, Eye, Upload } from "lucide-react";
import { fileToDataUrl, saveNFFile, getNFFile, deleteNFFile } from "../../lib/supabase";

const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

export const SERVICOS_LM = [
  { key:"grafismo",     label:"Máquinas de Grafismo", valorPadrao:3948 },
  { key:"starlink",     label:"Starlink",             valorPadrao:658  },
  { key:"downlink",     label:"Downlink",             valorPadrao:3000 },
  { key:"distribuicao", label:"Distribuição",         valorPadrao:2000 },
];

const TOTAL_RODADAS = 38;

function gerarDadosIniciais() {
  return Array.from({length:TOTAL_RODADAS}, (_,i) => ({
    rodada: i+1,
    jogos: 2,
    grafismo: 3948,
    starlink: 658,
    downlink: 3000,
    distribuicao: 2000,
  }));
}

// ── Modal para registrar NF Livemode ──
function NFLivemodeModal({ onSave, onClose, fornecedores, T }) {
  const IS = iSty(T);
  const [rodadas, setRodadas] = useState(new Set());
  const [servicos, setServicos] = useState({});
  const [form, setForm] = useState({ numeroNF:"", fornecedor:"", dataEmissao:"", obs:"" });
  const [arquivo, setArquivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const toggleRodada = (r) => setRodadas(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n; });
  const selectRange = (from, to) => {
    const n = new Set(rodadas);
    for (let i = from; i <= to; i++) n.add(i);
    setRodadas(n);
  };

  const toggleServico = (key) => {
    setServicos(prev => {
      const s = {...prev};
      if (s[key] !== undefined) { delete s[key]; } else { s[key] = SERVICOS_LM.find(x=>x.key===key)?.valorPadrao || 0; }
      return s;
    });
  };
  const setServicoValor = (key, val) => setServicos(prev => ({...prev, [key]: parseFloat(val)||0}));

  const valorPorRodada = Object.values(servicos).reduce((s,v) => s+(v||0), 0);
  const totalNF = valorPorRodada * rodadas.size;
  const selCount = Object.keys(servicos).length;
  const servicosLabels = Object.keys(servicos).map(k => SERVICOS_LM.find(x=>x.key===k)?.label||k);
  const rodadasArr = [...rodadas].sort((a,b) => a-b);
  const rodadasLabel = rodadasArr.length === 0 ? "" : rodadasArr.length === 1 ? `Rd ${rodadasArr[0]}` : `Rd ${rodadasArr[0]}-${rodadasArr[rodadasArr.length-1]}${rodadasArr.length !== (rodadasArr[rodadasArr.length-1]-rodadasArr[0]+1) ? ` (${rodadasArr.length})` : ""}`;

  const handleSave = async () => {
    if (selCount === 0 || rodadas.size === 0 || (!form.numeroNF && !form.fornecedor)) return;
    setUploading(true);
    const notaId = Date.now();
    let hasFile = false;
    if (arquivo) {
      try { const dataUrl = await fileToDataUrl(arquivo); await saveNFFile(notaId, dataUrl); hasFile = true; } catch(_){}
    }
    onSave({
      id: notaId,
      rodadas: rodadasArr,
      rodada: rodadasArr[0],
      rodadasLabel,
      servicos: {...servicos},
      servicosLabels,
      numeroNF: form.numeroNF,
      fornecedor: form.fornecedor,
      valor: totalNF,
      valorPorRodada,
      dataEmissao: form.dataEmissao,
      obs: form.obs,
      hasFile,
    });
    setUploading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,color:T.text}}>Registrar NF Livemode</h3>
        <p style={{color:T.textSm,fontSize:12,margin:"0 0 16px"}}>Selecione as rodadas cobertas por esta nota e os serviços</p>

        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <label style={{color:T.textMd,fontSize:12}}>Rodadas <span style={{color:T.textSm,fontSize:11}}>({rodadas.size} selecionada{rodadas.size!==1?"s":""})</span></label>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>selectRange(1,9)} style={{...btnStyle,background:T.border,padding:"3px 8px",fontSize:10,color:T.text}}>1-9</button>
              <button onClick={()=>selectRange(1,19)} style={{...btnStyle,background:T.border,padding:"3px 8px",fontSize:10,color:T.text}}>1-19</button>
              <button onClick={()=>selectRange(1,38)} style={{...btnStyle,background:T.border,padding:"3px 8px",fontSize:10,color:T.text}}>Todas</button>
              <button onClick={()=>setRodadas(new Set())} style={{...btnStyle,background:T.border,padding:"3px 8px",fontSize:10,color:T.text}}>Limpar</button>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {Array.from({length:TOTAL_RODADAS},(_,i)=>i+1).map(r => {
              const sel = rodadas.has(r);
              return (
                <button key={r} onClick={()=>toggleRodada(r)}
                  style={{
                    width:36, height:30, borderRadius:6, border:`1px solid ${sel?"#14b8a6":T.muted}`,
                    background:sel?"#14b8a622":"transparent", color:sel?"#14b8a6":T.textSm,
                    fontSize:11, fontWeight:sel?700:500, cursor:"pointer",
                  }}>{r}</button>
              );
            })}
          </div>
          {rodadas.size > 0 && <p style={{color:"#14b8a6",fontSize:11,margin:"6px 0 0",fontWeight:600}}>{rodadasLabel} · {fmt(valorPorRodada)}/rodada · Total: {fmt(totalNF)}</p>}
        </div>

        <div style={{marginBottom:12}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:6}}>Serviços</label>
          <div style={{background:T.bg,borderRadius:8,padding:8}}>
            {SERVICOS_LM.map(s => {
              const checked = form.servicos[s.key] !== undefined;
              return (
                <div key={s.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,background:checked?"#22c55e18":"transparent"}}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleServico(s.key)} style={{accentColor:"#22c55e"}}/>
                  <span style={{flex:1,fontSize:13,color:T.text}}>{s.label}</span>
                  {checked
                    ? <input type="number" value={form.servicos[s.key]} onChange={e=>setServicoValor(s.key, e.target.value)}
                        style={{...IS,width:100,textAlign:"right",padding:"3px 6px",fontSize:12,color:"#a855f7",fontWeight:600}}/>
                    : <span className="num" style={{fontSize:11,color:T.textSm,width:100,textAlign:"right"}}>{fmt(s.valorPadrao)}</span>
                  }
                </div>
              );
            })}
            {selCount > 0 && (
              <div style={{borderTop:`1px solid ${T.border}`,marginTop:6,paddingTop:6,textAlign:"right"}}>
                <span style={{fontSize:14,fontWeight:700,color:"#a855f7"}}>Total NF: {fmt(totalNF)}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Fornecedor</label>
            <input value={form.fornecedor} onChange={e=>set("fornecedor",e.target.value)} placeholder="Livemode" style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Nº da Nota</label>
            <input value={form.numeroNF} onChange={e=>set("numeroNF",e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data Emissão</label>
            <input value={form.dataEmissao} onChange={e=>set("dataEmissao",e.target.value)} placeholder="dd/mm" style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Observações</label>
            <input value={form.obs} onChange={e=>set("obs",e.target.value)} style={IS}/>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Arquivo da NF (PDF/imagem)</label>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e=>setArquivo(e.target.files[0]||null)} style={{display:"none"}}/>
          <div onClick={()=>fileRef.current?.click()}
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setArquivo(e.dataTransfer.files[0]||null);}}
            style={{border:`2px dashed ${arquivo?"#22c55e":T.muted}`,borderRadius:8,padding:"14px 16px",cursor:"pointer",textAlign:"center",background:arquivo?"#22c55e11":T.bg}}>
            {arquivo
              ? <p style={{margin:0,color:"#22c55e",fontSize:13,fontWeight:600}}>{arquivo.name} ({(arquivo.size/1024).toFixed(0)} KB)</p>
              : <p style={{margin:0,color:T.textSm,fontSize:12}}>Clique ou arraste o arquivo aqui</p>}
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} disabled={selCount===0||uploading} style={{...btnStyle,background:selCount>0?"#22c55e":"#475569",opacity:selCount>0&&!uploading?1:0.5}}>
            {uploading ? "Enviando..." : "Salvar NF"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ──
export default function TabLivemode({ livemode, setLivemode, notasLivemode, setNotasLivemode, jogos, setJogos, fornecedores, T }) {
  const [tab, setTab] = useState("notas");
  const [showModal, setShowModal] = useState(false);
  const [editRodada, setEditRodada] = useState(null);
  const [editForm, setEditForm] = useState({});

  const IS = iSty(T);
  const TS = tableStyles(T);
  const purple = "#a855f7";
  const green = "#22c55e";
  const teal = "#14b8a6";

  const dados = livemode && livemode.length > 0 ? livemode : gerarDadosIniciais();
  if (!livemode || livemode.length === 0) {
    setLivemode(() => gerarDadosIniciais());
  }

  const totalRodada = r => (r.grafismo||0) + (r.starlink||0) + (r.downlink||0) + (r.distribuicao||0);

  // ── NFs ──
  const nfs = notasLivemode || [];
  const totalNFs = nfs.length;
  const totalValorNFs = nfs.reduce((s,n) => s + (n.valor||0), 0);

  const addNota = (nota) => {
    setNotasLivemode(ns => [...ns, nota]);
    setShowModal(false);
  };

  const deleteNota = (id) => {
    if (!window.confirm("Excluir esta NF?")) return;
    deleteNFFile(id);
    setNotasLivemode(ns => ns.filter(n => n.id !== id));
  };

  // ── Realizado por rodada (soma das NFs, distribuída entre as rodadas cobertas) ──
  const realizadoPorRodada = useMemo(() => {
    const map = {};
    nfs.forEach(n => {
      const rods = n.rodadas || [n.rodada];
      const valorPorRd = rods.length > 0 ? (n.valorPorRodada || (n.valor / rods.length)) : 0;
      rods.forEach(r => {
        map[r] = (map[r] || 0) + valorPorRd;
      });
    });
    return map;
  }, [nfs]);

  // ── Controle por rodada ──
  const totalGeral = dados.reduce((s,r) => s + totalRodada(r), 0);
  const rodadasComNF = new Set(nfs.flatMap(n => n.rodadas || [n.rodada]));

  const totaisPorServico = SERVICOS_LM.map(s => ({
    ...s,
    total: dados.reduce((sum,r) => sum + (r[s.key]||0), 0),
    realizado: nfs.reduce((sum,n) => {
      const rods = n.rodadas || [n.rodada];
      return sum + (n.servicos?.[s.key] || 0) * rods.length;
    }, 0),
  }));

  const startEdit = (r) => {
    setEditRodada(r.rodada);
    setEditForm({ grafismo:r.grafismo, starlink:r.starlink, downlink:r.downlink, distribuicao:r.distribuicao, jogos:r.jogos });
  };
  const saveEdit = () => {
    setLivemode(prev => (prev||dados).map(r => r.rodada === editRodada ? {
      ...r, grafismo:parseFloat(editForm.grafismo)||0, starlink:parseFloat(editForm.starlink)||0,
      downlink:parseFloat(editForm.downlink)||0, distribuicao:parseFloat(editForm.distribuicao)||0,
      jogos:parseInt(editForm.jogos)||2,
    } : r));
    setEditRodada(null);
  };

  // ── Sync infra nos jogos ──
  const syncInfra = () => {
    const divulgados = jogos.filter(j => j.mandante !== "A definir");
    setJogos(js => js.map(j => {
      if (j.mandante === "A definir") return j;
      const totalLm = realizadoPorRodada[j.rodada] || 0;
      const jogosNaRodada = divulgados.filter(x => x.rodada === j.rodada).length || 1;
      const infraPorJogo = Math.round(totalLm / jogosNaRodada);
      return {...j, realizado: {...(j.realizado||{}), infra: infraPorJogo}};
    }));
    alert("Infra + Distr. atualizado nos jogos com base nas NFs registradas!");
  };

  // NFs agrupadas por rodada
  const nfsPorRodada = useMemo(() => {
    const map = {};
    nfs.forEach(n => {
      (n.rodadas || [n.rodada]).forEach(r => {
        if (!map[r]) map[r] = [];
        map[r].push(n);
      });
    });
    return map;
  }, [nfs]);

  const TABS_LM = [
    {value:"notas", label:"Notas Fiscais"},
    {value:"controle", label:"Controle por Rodada"},
  ];

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:16}}>
        <KPI label="Orçado Total" value={fmt(totalGeral)} sub={`${TOTAL_RODADAS} rodadas`} color={purple} T={T}/>
        <KPI label="NFs Registradas" value={String(totalNFs)} sub={fmt(totalValorNFs)} color={green} T={T}/>
        <KPI label="Saldo" value={fmt(totalGeral - totalValorNFs)} sub={`${((totalValorNFs/totalGeral)*100||0).toFixed(1)}% executado`} color={totalGeral-totalValorNFs>=0?teal:T.danger} T={T}/>
      </div>

      {/* Resumo por serviço */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:20}}>
        {totaisPorServico.map(s => (
          <Card key={s.key} T={T}>
            <div style={{padding:"14px 18px"}}>
              <p style={{color:T.textSm,fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",margin:"0 0 6px"}}>{s.label}</p>
              <p className="num" style={{color:T.text,fontSize:18,fontWeight:800,margin:"0 0 4px"}}>{fmt(s.total)}</p>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                <span style={{color:green}}>NFs: {fmt(s.realizado)}</span>
                <span style={{color:T.textSm}}>{s.total ? ((s.realizado/s.total)*100).toFixed(0) : 0}%</span>
              </div>
              <div style={{marginTop:6}}><Progress value={s.total ? (s.realizado/s.total)*100 : 0} T={T}/></div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:4}}>
          {TABS_LM.map(t => (
            <button key={t.value} onClick={()=>setTab(t.value)} style={{
              padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
              background:tab===t.value?teal:"transparent",color:tab===t.value?"#fff":T.textMd,
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>setShowModal(true)}>Nova NF</Button>
          <Button T={T} variant="secondary" size="md" icon={CheckCircle2} onClick={syncInfra}>Sincronizar Jogos</Button>
        </div>
      </div>

      {/* ── ABA NOTAS ── */}
      {tab === "notas" && (
        <div>
          {nfs.length === 0 ? (
            <Card T={T}>
              <div style={{padding:50,textAlign:"center"}}>
                <p style={{color:T.text,fontSize:14,margin:"0 0 4px",fontWeight:600}}>Nenhuma NF Livemode registrada</p>
                <p style={{color:T.textSm,fontSize:12,margin:0}}>Clique em "Nova NF" para registrar</p>
              </div>
            </Card>
          ) : (
            <Card T={T}>
              <div style={TS.wrap}>
                <table style={{...TS.table, minWidth:700}}>
                  <thead>
                    <tr style={TS.thead}>
                      {["Rodadas","Nº NF","Fornecedor","Serviços","Valor","Emissão","Obs",""].map(h =>
                        <th key={h} style={{...TS.th, ...(h==="Valor"?TS.thRight:TS.thLeft)}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[...nfs].sort((a,b) => a.rodada - b.rodada).map(n => (
                      <tr key={n.id} style={TS.tr}>
                        <td style={{...TS.td, fontWeight:700, fontSize:12}}>{n.rodadasLabel || `Rd ${n.rodada}`}</td>
                        <td className="num" style={{...TS.td, fontSize:12}}>{n.numeroNF||"—"}</td>
                        <td style={{...TS.td, fontWeight:600, fontSize:12}}>{n.fornecedor}</td>
                        <td style={{...TS.td, fontSize:11}}>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {(n.servicosLabels||[]).map(s => <Pill key={s} label={s} color={teal}/>)}
                          </div>
                        </td>
                        <td className="num" style={{...TS.tdNum, color:purple, fontWeight:700}}>{fmt(n.valor)}</td>
                        <td className="num" style={{...TS.td, color:T.textSm, fontSize:11}}>{n.dataEmissao||"—"}</td>
                        <td style={{...TS.td, color:T.textSm, fontSize:11}}>{n.obs||""}</td>
                        <td style={TS.td}>
                          <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>deleteNota(n.id)}/>
                        </td>
                      </tr>
                    ))}
                    <tr style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg,fontWeight:700}}>
                      <td colSpan={4} style={{...TS.td,fontSize:11,letterSpacing:"0.04em",textTransform:"uppercase"}}>Total ({nfs.length} notas)</td>
                      <td className="num" style={{...TS.tdNum, color:purple, fontWeight:700, fontSize:14}}>{fmt(totalValorNFs)}</td>
                      <td colSpan={3}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── ABA CONTROLE ── */}
      {tab === "controle" && (
        <Card T={T}>
          <div style={TS.wrap}>
            <table style={{...TS.table, minWidth:750}}>
              <thead>
                <tr style={TS.thead}>
                  {["Rodada","Jogos","Grafismo","Starlink","Downlink","Distribuição","Orçado","NFs","Saldo",""].map(h =>
                    <th key={h} style={{...TS.th, ...(["Jogos","Grafismo","Starlink","Downlink","Distribuição","Orçado","NFs","Saldo"].includes(h)?TS.thRight:TS.thLeft)}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {dados.map(r => {
                  const isEdit = editRodada === r.rodada;
                  const orcado = totalRodada(r);
                  const realizado = realizadoPorRodada[r.rodada] || 0;
                  const saldo = orcado - realizado;
                  const temNF = rodadasComNF.has(r.rodada);
                  return (
                    <tr key={r.rodada} style={{...TS.tr, background:temNF ? green+"08" : "transparent"}}>
                      <td style={{...TS.td, fontWeight:700, fontSize:13}}>Rodada {r.rodada}</td>
                      <td className="num" style={TS.tdNum}>
                        {isEdit ? <input type="number" value={editForm.jogos} onChange={e=>setEditForm(f=>({...f,jogos:e.target.value}))} style={{...IS,width:50,textAlign:"right",padding:"2px 6px",fontSize:12}}/> : r.jogos}
                      </td>
                      {SERVICOS_LM.map(s => (
                        <td key={s.key} className="num" style={TS.tdNum}>
                          {isEdit
                            ? <input type="number" value={editForm[s.key]} onChange={e=>setEditForm(f=>({...f,[s.key]:e.target.value}))} style={{...IS,width:80,textAlign:"right",padding:"2px 6px",fontSize:12}}/>
                            : fmt(r[s.key]||0)
                          }
                        </td>
                      ))}
                      <td className="num" style={{...TS.tdNum, fontWeight:700, color:purple}}>{fmt(orcado)}</td>
                      <td className="num" style={{...TS.tdNum, color:realizado>0?green:T.textSm}}>{fmt(realizado)}</td>
                      <td className="num" style={{...TS.tdNum, fontWeight:700, color:saldo<0?T.danger:teal}}>{fmt(saldo)}</td>
                      <td style={TS.td}>
                        {isEdit ? (
                          <div style={{display:"flex",gap:4}}>
                            <Button T={T} variant="primary" size="sm" onClick={saveEdit}>Salvar</Button>
                            <Button T={T} variant="secondary" size="sm" onClick={()=>setEditRodada(null)}>X</Button>
                          </div>
                        ) : (
                          <Button T={T} variant="secondary" size="sm" icon={Edit2} onClick={()=>startEdit(r)}/>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg,fontWeight:700}}>
                  <td style={{...TS.td,fontSize:11,letterSpacing:"0.04em",textTransform:"uppercase"}}>Total</td>
                  <td className="num" style={TS.tdNum}>{dados.reduce((s,r)=>s+(r.jogos||0),0)}</td>
                  {SERVICOS_LM.map(s => (
                    <td key={s.key} className="num" style={{...TS.tdNum, fontWeight:700}}>{fmt(dados.reduce((sum,r)=>sum+(r[s.key]||0),0))}</td>
                  ))}
                  <td className="num" style={{...TS.tdNum, fontWeight:700, color:purple, fontSize:14}}>{fmt(totalGeral)}</td>
                  <td className="num" style={{...TS.tdNum, fontWeight:700, color:green}}>{fmt(totalValorNFs)}</td>
                  <td className="num" style={{...TS.tdNum, fontWeight:700, color:teal}}>{fmt(totalGeral - totalValorNFs)}</td>
                  <td/>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showModal && <NFLivemodeModal onSave={addNota} onClose={()=>setShowModal(false)} fornecedores={fornecedores} T={T}/>}
    </div>
  );
}
