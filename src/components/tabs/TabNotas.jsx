import { useState, useMemo } from "react";
import { KPI, Pill } from "../shared";
import { fmt, subTotal } from "../../utils";
import { CATS, btnStyle, iSty } from "../../constants";

const STATUS_NF = ["Pendente","Solicitada","Recebida","Conferida"];
const STATUS_COLOR = {"Pendente":"#f59e0b","Solicitada":"#3b82f6","Recebida":"#8b5cf6","Conferida":"#22c55e"};

// Extrai fornecedores/serviços de um jogo (sub-itens com valor > 0 no provisionado ou orçado)
function extrairServicos(jogo) {
  const servicos = [];
  CATS.forEach(cat => {
    cat.subs.forEach(sub => {
      const valOrc  = jogo.orcado?.[sub.key] || 0;
      const valProv = jogo.provisionado?.[sub.key] || 0;
      const val = valProv || valOrc;
      if (val > 0) {
        servicos.push({
          subKey: sub.key,
          subLabel: sub.label,
          catLabel: cat.label,
          catColor: cat.color,
          valorRef: val,
        });
      }
    });
  });
  return servicos;
}

function NotaFormModal({ item, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState({
    numeroNF:      item.numeroNF || "",
    fornecedor:    item.fornecedor || item.subLabel || "",
    valorNF:       item.valorNF ?? item.valorRef ?? 0,
    dataEmissao:   item.dataEmissao || "",
    dataEnvio:     item.dataEnvio || "",
    obs:           item.obs || "",
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 6px",fontSize:16,color:T.text}}>Registrar Nota Fiscal</h3>
        <p style={{color:T.textSm,fontSize:12,margin:"0 0 20px"}}>{item.jogoLabel} — {item.subLabel}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Fornecedor</label>
            <input value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Nº da Nota</label>
            <input value={form.numeroNF} onChange={e => set("numeroNF", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Valor (R$)</label>
            <input type="number" value={form.valorNF} onChange={e => set("valorNF", parseFloat(e.target.value) || 0)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data Emissão</label>
            <input value={form.dataEmissao} onChange={e => set("dataEmissao", e.target.value)} placeholder="dd/mm" style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data Envio</label>
            <input value={form.dataEnvio} onChange={e => set("dataEnvio", e.target.value)} placeholder="dd/mm" style={IS}/>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Observações</label>
          <input value={form.obs} onChange={e => set("obs", e.target.value)} style={IS}/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={() => onSave({...form, status:"Conferida"})} style={{...btnStyle,background:"#22c55e"}}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function TabNotas({ notas, setNotas, jogos, T }) {
  const [tab, setTab] = useState("rodada");
  const [rodadaSel, setRodadaSel] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [filtroPlanilha, setFiltroPlanilha] = useState("Todas");

  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const rodadas = Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b);
  const rodadaEfetiva = rodadaSel ?? (rodadas.length ? rodadas[rodadas.length - 1] : 1);
  const jogosRodada = divulgados.filter(j => j.rodada === rodadaEfetiva);

  // Gerar itens de cobrança para cada jogo da rodada
  const itensRodada = useMemo(() => {
    return jogosRodada.flatMap(jogo => {
      const servicos = extrairServicos(jogo);
      return servicos.map(s => {
        const key = `${jogo.id}_${s.subKey}`;
        const notaExistente = notas.find(n => n.key === key);
        return {
          key,
          jogoId: jogo.id,
          jogoLabel: `${jogo.mandante} x ${jogo.visitante}`,
          jogoCat: jogo.categoria,
          rodada: jogo.rodada,
          ...s,
          status: notaExistente?.status || "Pendente",
          numeroNF: notaExistente?.numeroNF || "",
          fornecedor: notaExistente?.fornecedor || "",
          valorNF: notaExistente?.valorNF ?? null,
          dataEmissao: notaExistente?.dataEmissao || "",
          dataEnvio: notaExistente?.dataEnvio || "",
          obs: notaExistente?.obs || "",
        };
      });
    });
  }, [jogosRodada, notas]);

  // Stats gerais
  const allItens = useMemo(() => {
    return divulgados.flatMap(jogo => {
      const servicos = extrairServicos(jogo);
      return servicos.map(s => {
        const key = `${jogo.id}_${s.subKey}`;
        const nota = notas.find(n => n.key === key);
        return { key, rodada: jogo.rodada, status: nota?.status || "Pendente", ...nota };
      });
    });
  }, [divulgados, notas]);

  const totalPendente   = allItens.filter(i => i.status === "Pendente").length;
  const totalSolicitada = allItens.filter(i => i.status === "Solicitada").length;
  const totalConferida  = allItens.filter(i => i.status === "Conferida").length;
  const notasConferidas = notas.filter(n => n.status === "Conferida");
  const totalValorConf  = notasConferidas.reduce((s, n) => s + (n.valorNF || 0), 0);

  const updateNota = (key, updates) => {
    setNotas(ns => {
      const idx = ns.findIndex(n => n.key === key);
      if (idx >= 0) return ns.map(n => n.key === key ? {...n, ...updates} : n);
      return [...ns, {key, ...updates}];
    });
  };

  const handleFormSave = (formData) => {
    updateNota(editingItem.key, formData);
    setEditingItem(null);
  };

  // Planilha — notas conferidas
  const planilhaRodadas = ["Todas", ...Array.from(new Set(notasConferidas.map(n => {
    const item = divulgados.find(j => n.key?.startsWith(`${j.id}_`));
    return item ? String(item.rodada) : null;
  }).filter(Boolean))).sort((a, b) => a - b)];

  const planilhaItens = notasConferidas.map(n => {
    const jogo = divulgados.find(j => n.key?.startsWith(`${j.id}_`));
    return {...n, rodada: jogo?.rodada, jogoLabel: jogo ? `${jogo.mandante} x ${jogo.visitante}` : "—"};
  }).filter(n => filtroPlanilha === "Todas" || String(n.rodada) === filtroPlanilha)
    .sort((a, b) => (a.rodada || 0) - (b.rodada || 0));

  const copyPlanilha = () => {
    const header = "Nº NF\tFornecedor\tValor\tEmissão\tEnvio\tJogo\tRodada\tObs";
    const rows = planilhaItens.map(n =>
      `${n.numeroNF}\t${n.fornecedor}\t${n.valorNF || 0}\t${n.dataEmissao}\t${n.dataEnvio}\t${n.jogoLabel}\t${n.rodada || ""}\t${n.obs || ""}`
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    alert("Planilha copiada para a área de transferência!");
  };

  const TABS_NF = ["rodada", "planilha", "resumo"];

  return (
    <>
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {TABS_NF.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{padding:"6px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
            background:tab===t?"#8b5cf6":"transparent",color:tab===t?"#fff":T.textMd,textTransform:"capitalize"}}>
            {t === "rodada" ? "Por Rodada" : t === "planilha" ? "Planilha" : "Resumo"}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        <KPI label="Pendentes" value={String(totalPendente)} sub="Aguardando cobrança" color="#f59e0b" T={T}/>
        <KPI label="Solicitadas" value={String(totalSolicitada)} sub="Aguardando NF" color="#3b82f6" T={T}/>
        <KPI label="Conferidas" value={String(totalConferida)} sub="Prontas p/ envio" color="#22c55e" T={T}/>
        <KPI label="Valor Conferido" value={fmt(totalValorConf)} sub={`${notasConferidas.length} notas`} color="#8b5cf6" T={T}/>
      </div>

      {/* ── POR RODADA ── */}
      {tab === "rodada" && (<>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
          <span style={{color:T.textMd,fontSize:13,fontWeight:600}}>Rodada:</span>
          {rodadas.map(r => (
            <button key={r} onClick={() => setRodadaSel(r)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
              background:rodadaEfetiva===r?"#8b5cf6":T.card,color:rodadaEfetiva===r?"#fff":T.textMd}}>
              {r}
            </button>
          ))}
        </div>

        {jogosRodada.map(jogo => {
          const servicos = extrairServicos(jogo);
          const jogoItens = itensRodada.filter(i => i.jogoId === jogo.id);
          const pendentes = jogoItens.filter(i => i.status === "Pendente").length;
          const conferidas = jogoItens.filter(i => i.status === "Conferida").length;

          return (
            <div key={jogo.id} style={{background:T.card,borderRadius:12,overflow:"hidden",marginBottom:16}}>
              <div style={{padding:"14px 20px",background:T.bg,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <Pill label={jogo.categoria} color={jogo.categoria==="B1"?"#22c55e":"#f59e0b"}/>
                  <span style={{fontWeight:700,fontSize:15,color:T.text}}>{jogo.mandante} x {jogo.visitante}</span>
                  <span style={{color:T.textSm,fontSize:12}}>{jogo.data} · {jogo.cidade}</span>
                </div>
                <div style={{display:"flex",gap:12,fontSize:12}}>
                  <span style={{color:"#f59e0b"}}>{pendentes} pendente{pendentes!==1?"s":""}</span>
                  <span style={{color:"#22c55e"}}>{conferidas}/{jogoItens.length} conferidas</span>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
                  <thead><tr style={{background:T.bg}}>
                    {["Serviço","Categoria","Valor Ref.","Status","Fornecedor","Nº NF","Valor NF",""].map(h =>
                      <th key={h} style={{padding:"8px 14px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {jogoItens.map(item => (
                      <tr key={item.key} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{padding:"8px 14px",fontWeight:600,fontSize:13,color:T.text}}>{item.subLabel}</td>
                        <td style={{padding:"8px 14px"}}><Pill label={item.catLabel} color={item.catColor}/></td>
                        <td style={{padding:"8px 14px",color:T.textMd,fontSize:12,whiteSpace:"nowrap"}}>{fmt(item.valorRef)}</td>
                        <td style={{padding:"8px 14px"}}>
                          <select value={item.status} onChange={e => updateNota(item.key, {status: e.target.value})}
                            style={{background:STATUS_COLOR[item.status]+"22",color:STATUS_COLOR[item.status],border:`1px solid ${STATUS_COLOR[item.status]}44`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                            {STATUS_NF.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{padding:"8px 14px",color:item.fornecedor?T.text:T.textSm,fontSize:12}}>{item.fornecedor || "—"}</td>
                        <td style={{padding:"8px 14px",color:item.numeroNF?T.text:T.textSm,fontSize:12}}>{item.numeroNF || "—"}</td>
                        <td style={{padding:"8px 14px",color:item.valorNF?"#8b5cf6":T.textSm,fontSize:12,fontWeight:item.valorNF?600:400}}>{item.valorNF ? fmt(item.valorNF) : "—"}</td>
                        <td style={{padding:"8px 14px"}}>
                          <button onClick={() => setEditingItem(item)} style={{...btnStyle,background:"#8b5cf6",padding:"4px 12px",fontSize:11}}>
                            {item.status === "Conferida" ? "Editar" : "Registrar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {jogosRodada.length === 0 && (
          <div style={{background:T.card,borderRadius:12,padding:40,textAlign:"center",color:T.textSm}}>
            Nenhum jogo divulgado nesta rodada
          </div>
        )}
      </>)}

      {/* ── PLANILHA ── */}
      {tab === "planilha" && (<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{color:T.textMd,fontSize:12,fontWeight:600}}>Rodada:</span>
            {planilhaRodadas.map(r => (
              <button key={r} onClick={() => setFiltroPlanilha(r)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,
                background:filtroPlanilha===r?"#8b5cf6":T.card,color:filtroPlanilha===r?"#fff":T.textMd}}>
                {r === "Todas" ? "Todas" : `Rd ${r}`}
              </button>
            ))}
          </div>
          <button onClick={copyPlanilha} style={{...btnStyle,background:"#22c55e",fontSize:12}}>
            Copiar Planilha
          </button>
        </div>

        <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",color:T.textSm,fontSize:12}}>
            <span>{planilhaItens.length} notas conferidas</span>
            <span>Total: <b style={{color:"#8b5cf6"}}>{fmt(planilhaItens.reduce((s, n) => s + (n.valorNF || 0), 0))}</b></span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
              <thead><tr style={{background:T.bg}}>
                {["Nº NF","Fornecedor","Valor","Emissão","Envio","Jogo","Rd","Obs"].map(h =>
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {planilhaItens.map(n => (
                  <tr key={n.key} style={{borderTop:`1px solid ${T.border}`}}>
                    <td style={{padding:"10px 14px",fontWeight:600,color:T.text,fontSize:13}}>{n.numeroNF}</td>
                    <td style={{padding:"10px 14px",color:T.text,fontSize:13}}>{n.fornecedor}</td>
                    <td style={{padding:"10px 14px",color:"#8b5cf6",fontWeight:600,whiteSpace:"nowrap"}}>{fmt(n.valorNF || 0)}</td>
                    <td style={{padding:"10px 14px",color:T.textMd,fontSize:12}}>{n.dataEmissao}</td>
                    <td style={{padding:"10px 14px",color:T.textMd,fontSize:12}}>{n.dataEnvio}</td>
                    <td style={{padding:"10px 14px",color:T.text,fontSize:12,whiteSpace:"nowrap"}}>{n.jogoLabel}</td>
                    <td style={{padding:"10px 14px",color:T.textMd,fontSize:12}}>{n.rodada}</td>
                    <td style={{padding:"10px 14px",color:T.textSm,fontSize:12}}>{n.obs}</td>
                  </tr>
                ))}
                {planilhaItens.length === 0 && (
                  <tr><td colSpan={8} style={{padding:40,textAlign:"center",color:T.textSm}}>Nenhuma nota conferida ainda</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {/* ── RESUMO ── */}
      {tab === "resumo" && (
        <div style={{display:"grid",gap:16}}>
          <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`}}>
              <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Status por Rodada</h3>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.bg}}>
                  {["Rodada","Total","Pendente","Solicitada","Recebida","Conferida","% Concluído"].map(h =>
                    <th key={h} style={{padding:"10px 14px",textAlign:h==="Rodada"?"left":"right",color:T.textSm,fontSize:11}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {rodadas.map(rod => {
                    const rodItens = allItens.filter(i => i.rodada === rod);
                    const tot = rodItens.length;
                    const pend = rodItens.filter(i => i.status === "Pendente").length;
                    const solic = rodItens.filter(i => i.status === "Solicitada").length;
                    const receb = rodItens.filter(i => i.status === "Recebida").length;
                    const conf = rodItens.filter(i => i.status === "Conferida").length;
                    const pct = tot ? (conf / tot * 100).toFixed(0) : 0;
                    return (
                      <tr key={rod} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{padding:"10px 14px",fontWeight:600,color:T.text}}>Rodada {rod}</td>
                        <td style={{padding:"10px 14px",textAlign:"right",color:T.text}}>{tot}</td>
                        <td style={{padding:"10px 14px",textAlign:"right",color:pend>0?"#f59e0b":T.textSm}}>{pend}</td>
                        <td style={{padding:"10px 14px",textAlign:"right",color:solic>0?"#3b82f6":T.textSm}}>{solic}</td>
                        <td style={{padding:"10px 14px",textAlign:"right",color:receb>0?"#8b5cf6":T.textSm}}>{receb}</td>
                        <td style={{padding:"10px 14px",textAlign:"right",color:conf>0?"#22c55e":T.textSm}}>{conf}</td>
                        <td style={{padding:"10px 14px",textAlign:"right"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
                            <span style={{color:T.textMd,fontSize:12}}>{pct}%</span>
                            <div style={{width:60,background:T.border,borderRadius:4,height:6}}>
                              <div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:"#22c55e"}}/>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingItem && <NotaFormModal item={editingItem} onSave={handleFormSave} onClose={() => setEditingItem(null)} T={T}/>}
    </>
  );
}
