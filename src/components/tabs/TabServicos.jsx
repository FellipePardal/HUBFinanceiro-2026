import { useState } from "react";
import { SECAO_COLORS, iSty, RADIUS } from "../../constants";
import { fmt } from "../../utils";
import { KPI } from "../shared";
import { Card, PanelTitle, Button, Progress, tableStyles } from "../ui";
import { Plus, Pencil, Trash2, Check, X, Wallet, TrendingUp, PiggyBank, Activity } from "lucide-react";

export default function TabServicos({servicos, setServicos, T}) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);

  const allItens = servicos.flatMap(s => s.itens);
  const totOrc  = allItens.reduce((s,x) => s+x.orcado, 0);
  const totProv = allItens.reduce((s,x) => s+x.provisionado, 0);
  const totReal = allItens.reduce((s,x) => s+x.realizado, 0);

  const startEdit  = i => { setEditing(i.id); setDraft({...i}); };
  const cancelEdit = () => { setEditing(null); setDraft(null); };
  const saveEdit   = () => {
    setServicos(ss => ss.map(s => ({...s, itens: s.itens.map(it => it.id===draft.id ? draft : it)})));
    setEditing(null); setDraft(null);
  };
  const addItem    = secao => {
    const n = {id:Date.now(), nome:"Novo serviço", orcado:0, provisionado:0, realizado:0, obs:"", tipo:"linear", parcelaLinear:0, parcelaPontual:0};
    setServicos(ss => ss.map(s => s.secao===secao ? {...s, itens:[...s.itens, n]} : s));
  };
  const deleteItem = (secao, id) =>
    setServicos(ss => ss.map(s => s.secao===secao ? {...s, itens:s.itens.filter(it=>it.id!==id)} : s));

  const IS   = iSty(T);
  const TS   = tableStyles(T);
  const COLS = ["Serviço","Tipo","Orçado","Provisionado","Realizado","Saving","% Exec.","Progresso","Obs",""];

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label="Total Orçado"   value={fmt(totOrc)}  sub="Serviços fixos" color={T.brand} T={T}/>
        <KPI label="Provisionado"   value={fmt(totProv)} sub="Estimativa"     color={T.info} T={T}/>
        <KPI label="Realizado"      value={fmt(totReal)} sub={`${totOrc?((totReal/totOrc)*100).toFixed(1):0}% executado`} color={T.warning} T={T}/>
        <KPI label="Saving"         value={fmt(totOrc-totReal)} sub="Orçado − Realizado" color={(totOrc-totReal)>=0?T.brand:T.danger} T={T}/>
      </div>

      {servicos.map(({secao, itens}) => {
        const sOrc  = itens.reduce((s,x) => s+x.orcado, 0);
        const sProv = itens.reduce((s,x) => s+x.provisionado, 0);
        const sReal = itens.reduce((s,x) => s+x.realizado, 0);
        const cor   = SECAO_COLORS[secao] || "#8b5cf6";

        return (
          <Card key={secao} T={T} style={{marginBottom:20}} accent={cor}>
            <PanelTitle T={T} title={secao} subtitle={`${itens.length} serviços`} color={cor}
              right={
                <>
                  <div style={{display:"flex",gap:14,fontSize:12}}>
                    <span style={{color:T.textMd}}>Orçado: <b className="num" style={{color:T.text}}>{fmt(sOrc)}</b></span>
                    <span style={{color:T.textMd}}>Saving: <b className="num" style={{color:(sOrc-sReal)>=0?T.brand:T.danger}}>{fmt(sOrc-sReal)}</b></span>
                  </div>
                  <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={()=>addItem(secao)}>Item</Button>
                </>
              }
            />
            <div style={TS.wrap}>
              <table style={{...TS.table, minWidth:780}}>
                <thead>
                  <tr style={TS.thead}>
                    {COLS.map(h => <th key={h} style={{...TS.th, ...(h==="Serviço"||h==="Obs"||h===""?TS.thLeft:TS.thRight)}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {itens.map(item => {
                    const isEd = editing===item.id;
                    const row  = isEd ? draft : item;
                    const sv   = row.orcado - row.realizado;
                    const pct  = row.orcado ? Math.min(100,(row.realizado/row.orcado)*100) : 0;
                    const tipo = row.tipo || "linear";

                    return (
                      <tr key={item.id} style={TS.tr}>
                        <td style={{...TS.td, fontWeight:600}}>
                          {isEd ? <input value={draft.nome} onChange={e=>setDraft(d=>({...d,nome:e.target.value}))} style={{...IS,width:220}}/> : row.nome}
                        </td>
                        <td style={TS.td}>
                          {isEd ? (
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              <select value={tipo} onChange={e=>setDraft(d=>({...d,tipo:e.target.value}))} style={{...IS,width:110}}>
                                <option value="linear">Linear</option>
                                <option value="pontual">Pontual</option>
                                <option value="misto">Misto</option>
                              </select>
                              {tipo==="misto" && (
                                <div style={{display:"flex",flexDirection:"column",gap:3,fontSize:10,color:T.textSm}}>
                                  <label>Linear: <input value={draft.parcelaLinear ?? 0} onChange={e=>setDraft(d=>({...d,parcelaLinear:parseFloat(e.target.value)||0}))} style={{...IS,width:90,textAlign:"right",marginLeft:4}}/></label>
                                  <label>Pontual: <input value={draft.parcelaPontual ?? 0} onChange={e=>setDraft(d=>({...d,parcelaPontual:parseFloat(e.target.value)||0}))} style={{...IS,width:90,textAlign:"right",marginLeft:4}}/></label>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:tipo==="linear"?T.textMd:tipo==="pontual"?T.warning:T.info}}>{tipo}</span>
                          )}
                        </td>
                        {["orcado","provisionado","realizado"].map(k => {
                          const col = k==="orcado"?T.brand:k==="provisionado"?T.info:T.warning;
                          const isReadOnly = k === "realizado";
                          return (
                            <td key={k} style={TS.tdNum} className="num">
                              {isEd && !isReadOnly
                                ? <input value={draft[k]} onChange={e=>setDraft(d=>({...d,[k]:parseFloat(e.target.value)||0}))} style={{...IS,width:110,textAlign:"right",color:col}}/>
                                : <span style={{color:row[k]===0?T.textSm:col}}>{fmt(row[k])}</span>
                              }
                            </td>
                          );
                        })}
                        <td className="num" style={{...TS.tdNum, fontWeight:700, color:sv>=0?T.brand:T.danger}}>{fmt(sv)}</td>
                        <td className="num" style={{...TS.tdNum, color:T.textMd}}>{pct.toFixed(1)}%</td>
                        <td style={{padding:"13px 16px",minWidth:100}}><Progress value={pct} T={T}/></td>
                        <td style={{...TS.td, color:T.textSm, fontSize:12}}>
                          {isEd ? <input value={draft.obs} onChange={e=>setDraft(d=>({...d,obs:e.target.value}))} style={{...IS,width:160}}/> : row.obs}
                        </td>
                        <td style={TS.td}>
                          {isEd
                            ? <div style={{display:"flex",gap:6}}>
                                <Button T={T} variant="secondary" size="sm" icon={X} onClick={cancelEdit}/>
                                <Button T={T} variant="primary"   size="sm" icon={Check} onClick={saveEdit}/>
                              </div>
                            : <div style={{display:"flex",gap:6}}>
                                <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>startEdit(item)}/>
                                <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={()=>deleteItem(secao,item.id)}/>
                              </div>
                          }
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={TS.totalRow}>
                    <td style={{...TS.td, color:cor, textTransform:"uppercase", letterSpacing:"0.04em", fontSize:11}}>Total {secao}</td>
                    <td/>
                    <td className="num" style={{...TS.tdNum, color:T.brand}}>{fmt(sOrc)}</td>
                    <td className="num" style={{...TS.tdNum, color:T.info}}>{fmt(sProv)}</td>
                    <td className="num" style={{...TS.tdNum, color:T.warning}}>{fmt(sReal)}</td>
                    <td className="num" style={{...TS.tdNum, color:(sOrc-sReal)>=0?T.brand:T.danger}}>{fmt(sOrc-sReal)}</td>
                    <td colSpan={4}/>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
