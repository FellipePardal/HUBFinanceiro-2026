import { useState, useMemo, Fragment, Component } from "react";
import { btnStyle, iSty } from "../../constants";
import { parseBR, fmtNum, fmtR, fmtRs } from "../../utils";
import { Card, Button } from "../ui";
import { KPI } from "../shared";
import { BarChart3, Lock, LayoutGrid, ChevronDown, ChevronRight, Settings2, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { calcVariaveis, calcFixos, calcVisaoGeral, fmtBRL, MESES_FIX, MESES_SHORT } from "../../lib/apresentacoesCalc";

// Error Boundary para capturar erros de render e exibir mensagem em vez de tela branca
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:32,color:"#ef4444",background:"#1e1e2e",borderRadius:12,margin:24,fontFamily:"monospace"}}>
          <p style={{fontWeight:700,marginBottom:8}}>Erro ao carregar — copie e envie para suporte:</p>
          <pre style={{whiteSpace:"pre-wrap",fontSize:12}}>{this.state.error?.stack || String(this.state.error)}</pre>
          <button onClick={()=>this.setState({error:null})} style={{marginTop:16,padding:"6px 16px",background:"#ef4444",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>Tentar novamente</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── PEÇAS COMPARTILHADAS DAS VIEWS ──────────────────────────────────────────
function DonutNF({ rec, pend, pct, T }) {
  const vazio = rec + pend <= 0;
  const data = vazio ? [{ name: "—", value: 1 }] : [{ name: "Recebidas", value: rec }, { name: "Pendentes", value: pend }];
  return (
    <div style={{position:"relative",width:110,height:110}}>
      <PieChart width={110} height={110}>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={34} outerRadius={52}
          startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
          {vazio ? <Cell fill={T.border}/> : [<Cell key="rec" fill="#22c55e"/>, <Cell key="pend" fill="#d97706"/>]}
        </Pie>
      </PieChart>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:15,fontWeight:700,color:T.text}}>{Math.round(pct)}%</div>
    </div>
  );
}

function LegendaNF({ nfRecV, nfPend, T }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:T.textMd}}><span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/> Recebidas · <b style={{color:T.text}}>{fmtRs(nfRecV)}</b></span>
      <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:T.textMd}}><span style={{width:8,height:8,borderRadius:"50%",background:"#d97706",flexShrink:0}}/> Pendentes · <b style={{color:T.text}}>{fmtRs(nfPend)}</b></span>
    </div>
  );
}

function TituloView({ icone: Icone, cor, corFundo, titulo, subtitulo, T }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <div style={{width:40,height:40,borderRadius:12,background:corFundo,border:`1px solid ${cor}45`,color:cor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icone size={18} strokeWidth={2.25}/>
      </div>
      <div>
        <h2 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{titulo}</h2>
        <p style={{margin:"2px 0 0",fontSize:12,color:T.textMd}}>{subtitulo}</p>
      </div>
    </div>
  );
}

const thSty = (T, right) => ({padding:"10px 12px",textAlign:right?"right":"left",color:T.textSm,fontSize:11,borderBottom:`1px solid ${T.border}`,textTransform:"uppercase",letterSpacing:1});
const tdSty = right => ({padding:"8px 12px",textAlign:right?"right":"left",fontSize:12});

// ─── VIEW CUSTOS VARIÁVEIS ───────────────────────────────────────────────────
function SlideVariaveis({ d, T }) {
  const rodadaComEstouro = d.rows.find(r => r.orcado - r.realizado < 0)?.label ?? null;
  const subtitulo = d.savPct >= 0
    ? `Operação jogo a jogo gera saving de ${Math.abs(d.savPct).toFixed(1)}%, dentro do orçado até a Rodada ${d.rodadaAtual}.`
    : `Operação jogo a jogo com estouro de ${Math.abs(d.savPct).toFixed(1)}%${rodadaComEstouro ? ", alerta isolado na " + rodadaComEstouro : ""}.`;
  const chartData = d.rows.map(r => ({ name: r.label, "Orçado": r.orcado, "Realizado": r.realizado }));
  return (
    <div>
      <TituloView icone={BarChart3} cor="#10b981" corFundo="rgba(16,185,129,0.12)" titulo="Custos Variáveis" subtitulo={subtitulo} T={T}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:20}}>
        <KPI label="Orçado Total" value={fmtR(d.orcGlobal)} sub="Campeonato (fixo)" color={T.textSm} T={T}/>
        <KPI label={`Orçado até R${d.rodadaAtual}`} value={fmtR(d.totOrc)} sub={`${d.rows.length} rodadas`} color="#94a3b8" T={T}/>
        <KPI label={`Realizado até R${d.rodadaAtual}`} value={fmtR(d.totReal)} sub="Base: provisionado (Savings)" color="#22c55e" T={T}/>
        <KPI label="Saving Acumulado" value={(d.saving>=0?"▲ ":"▼ ")+fmtR(Math.abs(d.saving))} sub={`${Math.abs(d.savPct).toFixed(1)}% vs. orçado`} color={d.saving>=0?"#22c55e":"#ef4444"} T={T}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(340px,3fr) minmax(320px,2fr)",gap:16,marginBottom:20}}>
        <Card T={T}>
          <div style={{padding:"16px 20px"}}>
            <h4 style={{margin:"0 0 12px",color:T.text,fontSize:13,fontWeight:700}}>Orçado vs Realizado por Rodada</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="name" tick={{fill:T.textMd,fontSize:11}}/>
                <YAxis tick={{fill:T.textMd,fontSize:11}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmtBRL(v)} contentStyle={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8}} labelStyle={{color:T.text}}/>
                <Legend wrapperStyle={{fontSize:12}}/>
                <Bar dataKey="Orçado" fill="#94a3b8" radius={[3,3,0,0]}/>
                <Bar dataKey="Realizado" fill="#22c55e" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card T={T}>
          <div style={{padding:"16px 20px"}}>
            <h4 style={{margin:"0 0 12px",color:T.text,fontSize:13,fontWeight:700}}>Status NFs</h4>
            <div style={{display:"flex",gap:24,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
              <DonutNF rec={d.nfRecV} pend={d.nfPend} pct={d.pctRec} T={T}/>
              <LegendaNF nfRecV={d.nfRecV} nfPend={d.nfPend} T={T}/>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.bg}}>
                  {["Rodada","Orçado","Realizado","Saving"].map((h,i)=><th key={h} style={thSty(T,i>0)}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {d.rows.map(r => {
                    const sav = r.orcado - r.realizado;
                    return (
                      <tr key={r.label} style={{borderBottom:`1px solid ${T.border}`}}>
                        <td style={{...tdSty(false),fontWeight:700,color:"#22c55e"}}>{r.label}</td>
                        <td style={{...tdSty(true),color:T.textMd}} className="num">{fmtR(r.orcado)}</td>
                        <td style={{...tdSty(true),color:T.text}} className="num">{fmtR(r.realizado)}</td>
                        <td style={{...tdSty(true),fontWeight:700,color:sav>=0?"#a3e635":"#ef4444"}} className="num">{sav>=0?"▲ ":"▼ "}{fmtR(Math.abs(sav))}</td>
                      </tr>
                    );
                  })}
                  {d.rows.length === 0 && <tr><td colSpan={4} style={{padding:24,textAlign:"center",color:T.textSm,fontSize:12}}>Nenhuma rodada disponível</td></tr>}
                </tbody>
                <tfoot><tr style={{background:T.bg}}>
                  <td style={{...tdSty(false),fontWeight:700,color:T.textSm,textTransform:"uppercase",fontSize:11,letterSpacing:1}}>Total</td>
                  <td style={{...tdSty(true),fontWeight:700,color:T.text}} className="num">{fmtR(d.totOrc)}</td>
                  <td style={{...tdSty(true),fontWeight:700,color:T.text}} className="num">{fmtR(d.totReal)}</td>
                  <td style={{...tdSty(true),fontWeight:700,color:d.saving>=0?"#a3e635":"#ef4444"}} className="num">{d.saving>=0?"▲ ":"▼ "}{fmtR(Math.abs(d.saving))}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── VIEW CUSTOS FIXOS ───────────────────────────────────────────────────────
function SlideFixos({ d, T, saldoUsaGasto }) {
  const [expandedSecs, setExpandedSecs] = useState({});
  const toggleSec = secao => setExpandedSecs(prev => ({...prev, [secao]: !prev[secao]}));
  const pctReal = Math.min(1, d.realizadoEff / (d.orcTotEff || 1));
  const realizadoTot = d.rows.reduce((s, r) => s + (r.secao === "Outros Mensais" ? r.gasto : r.prov), 0);
  return (
    <div>
      <TituloView icone={Lock} cor={T.info} corFundo={T.info+"1f"} titulo="Custos Fixos" subtitulo={`Capital estrutural estritamente sob controle até o mês de ${d.mesLabel}.`} T={T}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:20}}>
        <KPI label="Orçamento Total" value={fmtR(d.orcAnualTotal)} sub="Campeonato (anual)" color={T.textSm} T={T}/>
        <KPI label={`Orçado Acum. até ${d.mesLabel}`} value={fmtR(d.orcTotEff)} sub={`${d.mesesDecorridos} meses decorridos`} color="#94a3b8" T={T}/>
        <KPI label={`Realizado até ${d.mesLabel}`} value={fmtR(d.realizadoEff)} sub={saldoUsaGasto?"Base: gasto (NFs)":"Base: provisionado mensal"} color={T.info} T={T}/>
        <KPI label="Saldo Acumulado" value={(d.saldoTotEff>=0?"▲ ":"▼ ")+fmtR(Math.abs(d.saldoTotEff))} sub={`${fmtR(d.orcTotEff)} − ${fmtR(d.realizadoEff)}`} color={d.saldoTotEff>=0?"#22c55e":"#ef4444"} T={T}/>
      </div>
      <Card T={T} style={{marginBottom:16}}>
        <div style={{padding:"16px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Comparativo Orçado vs Realizado</span>
            <span style={{fontSize:11,color:T.textMd}}>Realizado: <b style={{color:T.text}}>{fmtRs(d.realizadoEff)}</b> · Saldo: <b style={{color:d.saldoTotEff>=0?"#22c55e":"#ef4444"}}>{fmtRs(d.saldoTotEff)}</b></span>
          </div>
          <div style={{height:20,borderRadius:10,background:T.bg,border:`1px solid ${T.border}`,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(pctReal*100).toFixed(1)}%`,background:"linear-gradient(90deg,#14532d,#22c55e)",transition:"width .3s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10,marginBottom:6}}>
            <span style={{fontSize:11,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Status NFs</span>
            <span style={{fontSize:11,color:T.textMd}}><b style={{color:"#22c55e"}}>{Math.round(d.pctRec)}%</b> recebidas ({fmtRs(d.nfRecV)}) · <b style={{color:"#d97706"}}>{Math.round(100-d.pctRec)}%</b> pendentes ({fmtRs(d.nfPend)})</span>
          </div>
          <div style={{height:12,borderRadius:6,background:T.bg,border:`1px solid ${T.border}`,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(100,d.pctRec).toFixed(1)}%`,background:"#16a34a",transition:"width .3s"}}/>
          </div>
        </div>
      </Card>
      <Card T={T} style={{marginBottom:20}}>
        <div style={{padding:"16px 20px"}}>
          <h4 style={{margin:"0 0 12px",color:T.text,fontSize:13,fontWeight:700}}>Seções — Orçado Acumulado × Realizado × Saldo</h4>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
              <thead><tr style={{background:T.bg}}>
                {["Seção","Orçado Acum.","Realizado","Saldo"].map((h,i)=><th key={h} style={thSty(T,i>0)}>{h}</th>)}
              </tr></thead>
              <tbody>
                {d.rows.map(r => {
                  const realizadoVal = r.secao === "Outros Mensais" ? r.gasto : r.prov;
                  const debug = d.sections.find(x => x.secao === r.secao)?.itensDebug || [];
                  const expanded = !!expandedSecs[r.secao];
                  return (
                    <Fragment key={r.secao}>
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{...tdSty(false),fontWeight:700,color:T.info}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {debug.length > 0 && (
                            <button onClick={()=>toggleSec(r.secao)} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:T.textSm,display:"flex",alignItems:"center"}}>
                              {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                            </button>
                          )}
                          {r.secao}
                        </div>
                      </td>
                      <td style={{...tdSty(true),color:T.textMd}} className="num">{fmtR(r.orc)}</td>
                      <td style={{...tdSty(true),color:T.text}} className="num">{fmtR(realizadoVal)}</td>
                      <td style={{...tdSty(true),fontWeight:700,color:r.saldo>=0?"#a3e635":"#ef4444"}} className="num">{r.saldo>=0?"▲ ":"▼ "}{fmtR(Math.abs(r.saldo))}</td>
                    </tr>
                    {debug.length > 0 && expanded && (
                      <tr style={{background:T.bg}}>
                        <td colSpan={4} style={{padding:"6px 12px 10px 24px"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                            <thead><tr>
                              {["Item","Tipo","Prov. Anual","Meses Aloc.","Ratio/Fator","Contribui"].map((h,i)=>(
                                <th key={h} style={{padding:"3px 8px",textAlign:i===0?"left":"right",color:T.textSm,borderBottom:`1px solid ${T.border}`}}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {debug.map(it => (
                                <tr key={it.nome}>
                                  <td style={{padding:"3px 8px",color:T.textMd}}>{it.nome}</td>
                                  <td style={{padding:"3px 8px",textAlign:"right",color:it.tipo==="pontual"?"#d97706":it.tipo==="linear"?T.textSm:"#7c3aed"}}>{it.tipo}</td>
                                  <td style={{padding:"3px 8px",textAlign:"right",color:T.text}} className="num">{fmtBRL(it.prov)}</td>
                                  <td style={{padding:"3px 8px",textAlign:"right",color:T.textSm}}>{it.mesesAlocacao?.length ? it.mesesAlocacao.map(m => MESES_SHORT[m] ?? m).join(", ") : "—"}</td>
                                  <td style={{padding:"3px 8px",textAlign:"right",color:T.textSm}}>{it.ratio !== null ? `${(it.ratio*100).toFixed(0)}%` : `÷12×${d.mesesDecorridos}`}</td>
                                  <td style={{padding:"3px 8px",textAlign:"right",fontWeight:700,color:T.info}} className="num">{fmtBRL(it.contribui)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
                {d.rows.length === 0 && <tr><td colSpan={4} style={{padding:24,textAlign:"center",color:T.textSm,fontSize:12}}>Nenhuma seção no portal</td></tr>}
              </tbody>
              <tfoot><tr style={{background:T.bg}}>
                <td style={{...tdSty(false),fontWeight:700,color:T.textSm,textTransform:"uppercase",fontSize:11,letterSpacing:1}}>Total</td>
                <td style={{...tdSty(true),fontWeight:700,color:T.text}} className="num">{fmtR(d.orcTotal)}</td>
                <td style={{...tdSty(true),fontWeight:700,color:T.text}} className="num">{fmtR(realizadoTot)}</td>
                <td style={{...tdSty(true),fontWeight:700,color:d.saldoTotal>=0?"#a3e635":"#ef4444"}} className="num">{d.saldoTotal>=0?"▲ ":"▼ "}{fmtR(Math.abs(d.saldoTotal))}</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── VIEW VISÃO GERAL ────────────────────────────────────────────────────────
function SlideVisaoGeral({ vg, T }) {
  const pilar = (titulo, orcLabel, orc, real, realLabel, saldo, saldoLabel) => (
    <Card T={T}>
      <div style={{padding:"18px 22px",textAlign:"center"}}>
        <p style={{fontSize:12,fontWeight:800,color:T.text,margin:"0 0 10px"}}>{titulo}</p>
        <p style={{fontSize:12,color:T.textMd,margin:"0 0 4px"}}>{orcLabel}: <b style={{color:T.text}}>{fmtR(orc)}</b></p>
        <p style={{fontSize:12,color:T.textMd,margin:"0 0 8px"}}>{realLabel}: <b style={{color:T.text}}>{fmtR(real)}</b></p>
        <p style={{fontSize:15,fontWeight:800,color:saldo>=0?"#16a34a":"#dc2626",margin:0}}>{saldoLabel}: {saldo>=0?"▲ ":"▼ "}{fmtR(Math.abs(saldo))}</p>
      </div>
    </Card>
  );
  const mkRow = (label, orc, real, sav, pct) => (
    <tr key={label} style={{borderBottom:`1px solid ${T.border}`}}>
      <td style={{...tdSty(false),color:T.text,fontWeight:600}}>{label}</td>
      <td style={{...tdSty(true),color:T.textMd}} className="num">{fmtR(orc)}</td>
      <td style={{...tdSty(true),color:T.text}} className="num">{fmtR(real)}</td>
      <td style={{...tdSty(true),fontWeight:700,color:sav>=0?"#a3e635":"#ef4444"}} className="num">{sav>=0?"▲ ":"▼ "}{fmtR(Math.abs(sav))}</td>
      <td style={{...tdSty(true),fontWeight:700,color:sav>=0?"#a3e635":"#ef4444"}} className="num">{sav>=0?"▲ ":"▼ "}{Math.abs(pct).toFixed(1)}%</td>
    </tr>
  );
  return (
    <div>
      <TituloView icone={LayoutGrid} cor="#7c3aed" corFundo="rgba(124,58,237,0.12)" titulo="Visão Geral Orçamentária" subtitulo="Consolidado dos pilares: Variáveis + Fixos" T={T}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16,marginBottom:20}}>
        <KPI label="Orçamento Total do Campeonato" value={fmtR(vg.orcTotalCampeonato)} sub="Variáveis + Fixos (anual)" color={T.textSm} T={T}/>
        <KPI label="Realizado (Atual)" value={fmtR(vg.realTotalGlobal)} sub={`Variáveis até R${vg.rodadaAtual} + Fixos até ${vg.mesLabel}`} color={T.text} T={T}/>
        <KPI label="Saving / Saldo Global" value={(vg.savingGlobal>=0?"▲ ":"▼ ")+fmtR(Math.abs(vg.savingGlobal))} sub={`${Math.abs(vg.savingGlobalPct).toFixed(1)}% vs. orçado do período`} color={vg.savingGlobal>=0?"#22c55e":"#ef4444"} T={T}/>
      </div>
      <p style={{textAlign:"center",fontSize:11,color:T.textSm,fontWeight:700,letterSpacing:2,textTransform:"uppercase",margin:"0 0 12px"}}>Síntese dos Pilares</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16,marginBottom:20}}>
        {pilar("Dinâmica Operacional (Custos Variáveis)", "Orçamento do Período", vg.varOrc, vg.varReal, "Realizado", vg.varSaving, "Saldo")}
        {pilar("Estrutura Acumulada (Custos Fixos)", `Orçado até ${vg.mesLabel}`, vg.fixOrcAcum, vg.fixReal, `Realizado até ${vg.mesLabel}`, vg.fixSaldo, `Saldo até ${vg.mesLabel}`)}
      </div>
      <Card T={T} style={{marginBottom:20}}>
        <div style={{padding:"16px 20px"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
              <thead><tr style={{background:T.bg}}>
                {["Bloco","Orçado (Período)","Realizado","Saving / Saldo","%"].map((h,i)=><th key={h} style={thSty(T,i>0)}>{h}</th>)}
              </tr></thead>
              <tbody>
                {mkRow(`1  Serviços Variáveis (R1–R${vg.rodadaAtual})`, vg.varOrc, vg.varReal, vg.varSaving, vg.savVarPct)}
                {mkRow(`2  Custos Fixos (até ${vg.mesLabel})`, vg.fixOrcAcum, vg.fixReal, vg.fixSaldo, vg.savFixPct)}
              </tbody>
              <tfoot><tr style={{background:T.bg}}>
                <td style={{...tdSty(false),fontWeight:700,color:T.textSm,textTransform:"uppercase",fontSize:11,letterSpacing:1}}>Total</td>
                <td style={{...tdSty(true),fontWeight:700,color:T.text}} className="num">{fmtR(vg.orcTotalPeriodo)}</td>
                <td style={{...tdSty(true),fontWeight:700,color:T.text}} className="num">{fmtR(vg.realTotalGlobal)}</td>
                <td style={{...tdSty(true),fontWeight:700,color:vg.savingGlobal>=0?"#a3e635":"#ef4444"}} className="num">{vg.savingGlobal>=0?"▲ ":"▼ "}{fmtR(Math.abs(vg.savingGlobal))}</td>
                <td style={{...tdSty(true),fontWeight:700,color:vg.savingGlobal>=0?"#a3e635":"#ef4444"}} className="num">{vg.savingGlobal>=0?"▲ ":"▼ "}{Math.abs(vg.savingGlobalPct).toFixed(1)}%</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── PAINÉIS DE AJUSTE (modo edição) ─────────────────────────────────────────
function AjustesVariaveis({ d, T, nfEspOvr, nfRecOvr, setField, setVarField, resetVar, orcGlobal }) {
  const IS = {...iSty(T), width:"100%"};
  const IS_RO = {...IS, background:T.bg, cursor:"default"};
  const grid3 = {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20};
  const secHdr = {fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.text,marginBottom:16};
  const secNum = {fontSize:10,color:T.textSm,fontWeight:700,marginRight:8};
  const lbl = {color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1};
  const badge = (bg,fg,txt) => <span style={{background:bg,color:fg,fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>{txt}</span>;
  return (
    <div>
      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>01</span><span style={secHdr}>Configuração Base</span></div>
        <div style={grid3}>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Rodada Atual *</label>
            <select value={d.rodadaAtual} onChange={e=>setField("varRodada",parseInt(e.target.value))} style={{...IS}}>
              {d.rodadasDisp.length === 0
                ? <option value={1}>—</option>
                : d.rodadasDisp.map(r => <option key={r} value={r}>Rodada {r}</option>)}
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Orçado Total – Campeonato {badge("#1e3a5f","#93c5fd","FIXO")}</label>
            <input readOnly value={fmtNum(orcGlobal)} style={{...IS_RO}}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Orçado Acumulado até a Rodada {badge("#052e16","#4ade80","AUTO")}</label>
            <input readOnly value={fmtNum(d.totOrc)} style={{...IS_RO,color:"#22c55e"}}/>
          </div>
        </div>
      </div>

      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:18}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={secNum}>02</span><span style={secHdr}>Dados por Rodada</span></div>
          <button onClick={resetVar} style={{...btnStyle,background:T.border,color:T.text,padding:"5px 12px",fontSize:11}}>🔄 Re-sincronizar com portal</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr style={{background:T.bg}}>{["Rodada","Orçado (R$)","Realizado (R$)","Saving (R$)"].map((h,i)=>(<th key={h} style={{padding:"10px 12px",textAlign:i===0?"left":"right",color:T.textSm,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>))}</tr></thead>
            <tbody>
              {d.rodadasView.map(r => {
                const sav = parseBR(r.orcado) - parseBR(r.realizado);
                return (
                  <tr key={r.rodada} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"6px 12px",fontWeight:700,color:"#22c55e",fontSize:13}}>{r.label}</td>
                    <td style={{padding:"4px 12px",textAlign:"right"}}><input value={r.orcado} onChange={e=>setVarField(r.rodada,"orcado",e.target.value)} style={{...iSty(T),width:120,textAlign:"right",padding:"4px 8px"}}/></td>
                    <td style={{padding:"4px 12px",textAlign:"right"}}><input value={r.realizado} onChange={e=>setVarField(r.rodada,"realizado",e.target.value)} style={{...iSty(T),width:120,textAlign:"right",padding:"4px 8px",color:"#22c55e"}}/></td>
                    <td style={{padding:"6px 12px",textAlign:"right",fontWeight:700,color:sav>=0?"#a3e635":"#ef4444"}}>{sav>=0?"▲ ":"▼ "}{fmtR(Math.abs(sav))}</td>
                  </tr>
                );
              })}
              {d.rodadasView.length === 0 && (
                <tr><td colSpan={4} style={{padding:24,textAlign:"center",color:T.textSm,fontSize:12}}>Nenhuma rodada disponível</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>03</span><span style={secHdr}>Notas Fiscais</span></div>
        <div style={grid3}>
          <div><label style={lbl}>Notas Esperadas {badge("#052e16","#4ade80","AUTO · editável")}</label><input value={nfEspOvr !== "" ? nfEspOvr : fmtNum(d.autoNfEspV)} onChange={e=>setField("nfEsp",e.target.value)} style={{...IS}}/></div>
          <div><label style={lbl}>Notas Recebidas {badge("#052e16","#4ade80","AUTO · editável")}</label><input value={nfRecOvr !== "" ? nfRecOvr : fmtNum(d.autoNfRecV)} onChange={e=>setField("nfRec",e.target.value)} style={{...IS,color:"#22c55e"}}/></div>
          <div><label style={lbl}>Pendentes {badge("#052e16","#4ade80","AUTO")}</label><input readOnly value={fmtNum(d.nfPend)} style={{...IS_RO,color:"#d97706"}}/></div>
        </div>
      </div>
    </div>
  );
}

function AjustesFixos({ d, T, orcTotOvr, provTotOvr, gastoTotOvr, setField, setFixField, resetFix, saldoUsaGasto }) {
  const IS = {...iSty(T), width:"100%"};
  const IS_RO = {...IS, background:T.bg, cursor:"default"};
  const grid3 = {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20};
  const secHdr = {fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.text,marginBottom:16};
  const secNum = {fontSize:10,color:T.textSm,fontWeight:700,marginRight:8};
  const lbl = {color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1};
  const badge = (bg,fg,txt) => <span style={{background:bg,color:fg,fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>{txt}</span>;
  return (
    <div>
      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>01</span><span style={secHdr}>Configuração Base</span></div>
        <div style={grid3}>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Mês de Referência *</label>
            <select value={d.mesAtual} onChange={e=>setField("fixMes",parseInt(e.target.value))} style={{...IS}}>
              {MESES_FIX.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          {d.rodadasDisp.length > 0 && <div style={{marginBottom:16}}>
            <label style={lbl}>Rodada de Referência {badge("#1e40af","#93c5fd","POR RODADA")}</label>
            <select value={d.rodadaAtual} onChange={e=>setField("fixRodada",parseInt(e.target.value))} style={{...IS}}>
              {d.rodadasDisp.map(r => <option key={r} value={r}>Rodada {r}</option>)}
            </select>
            <p style={{fontSize:10,color:T.textSm,margin:"4px 0 0"}}>Itens "por rodada" acumulam {Math.round(Math.min(d.rodadaAtual, 13)/13*100)}% / {Math.round(Math.min(d.rodadaAtual, 7)/7*100)}% do orçado</p>
          </div>}
          <div style={{marginBottom:16}}>
            <label style={lbl}>Orçado Acumulado até {d.mesLabel} {orcTotOvr===""&&badge("#052e16","#4ade80","AUTO")}</label>
            <input value={orcTotOvr===""?fmtNum(d.orcTotal):orcTotOvr} onChange={e=>setField("orcTot",e.target.value)} onFocus={()=>{if(orcTotOvr==="")setField("orcTot",fmtNum(d.orcTotal));}} style={{...IS}} title={`Auto: ${fmtR(d.orcTotal)}`}/>
            <p style={{fontSize:10,color:T.textSm,margin:"4px 0 0"}}>Anual: {fmtR(d.orcAnualTotal)} · auto: {fmtR(d.orcTotal)}{orcTotOvr!==""&&<span style={{color:"#f59e0b"}}> · override ativo</span>}</p>
          </div>
        </div>
        <div style={grid3}>
          <div style={{marginBottom:0}}>
            <label style={lbl}>Realizado Acumulado até {d.mesLabel} {provTotOvr===""&&badge("#052e16","#4ade80","AUTO")}</label>
            <input value={provTotOvr===""?fmtNum(d.provTotal):provTotOvr} onChange={e=>setField("provTot",e.target.value)} onFocus={()=>{if(provTotOvr==="")setField("provTot",fmtNum(d.provTotal));}} style={{...IS,color:"#3b82f6"}} title={`Auto: ${fmtR(d.provTotal)}`}/>
            <p style={{fontSize:10,color:T.textSm,margin:"4px 0 0"}}>Anual: {fmtR(d.provTotalAnualAll)} · auto: {fmtR(d.provTotal)}{provTotOvr!==""&&<span style={{color:"#f59e0b"}}> · override ativo</span>}</p>
          </div>
          <div style={{marginBottom:0}}>
            <label style={lbl}>Gasto Acumulado até {d.mesLabel} {gastoTotOvr===""&&badge("#052e16","#4ade80","AUTO")}</label>
            <input value={gastoTotOvr===""?fmtNum(d.gastoTotal):gastoTotOvr} onChange={e=>setField("gastoTot",e.target.value)} onFocus={()=>{if(gastoTotOvr==="")setField("gastoTot",fmtNum(d.gastoTotal));}} style={{...IS,color:"#22c55e"}} title={`Auto: ${fmtR(d.gastoTotal)}`}/>
            {gastoTotOvr!==""&&<p style={{fontSize:10,color:"#f59e0b",margin:"4px 0 0"}}>override ativo · auto: {fmtR(d.gastoTotal)}</p>}
          </div>
          <div style={{marginBottom:0}}>
            <label style={lbl}>Saldo até {d.mesLabel} (Orçado − {saldoUsaGasto?"Gasto":"Realizado"}) {badge("#052e16","#4ade80","AUTO")}</label>
            <input readOnly value={fmtNum(d.saldoTotEff)} style={{...IS_RO, color: d.saldoTotEff >= 0 ? "#a3e635" : "#ef4444"}}/>
            <p style={{fontSize:10,color:T.textSm,margin:"4px 0 0"}}>{fmtR(d.orcTotEff)} (orç.) − {fmtR(d.realizadoEff)} (real.) = {d.saldoTotEff >= 0 ? "▲" : "▼"} {fmtR(Math.abs(d.saldoTotEff))}</p>
          </div>
        </div>
      </div>

      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:18}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={secNum}>02</span><span style={secHdr}>Dados por Seção</span></div>
          <button onClick={resetFix} style={{...btnStyle,background:T.border,color:T.text,padding:"5px 12px",fontSize:11}}>🔄 Re-sincronizar com portal</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr style={{background:T.bg}}>
              {["Seção","Orçado Acum. (R$)","Gasto (R$)","Realizado (R$)","Saldo (R$)"].map((h,i) => (
                <th key={h} style={{padding:"10px 12px",textAlign:i===0?"left":"right",color:T.textSm,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {d.sectionsView.map(s => {
                const sav = saldoUsaGasto ? parseBR(s.orc) - parseBR(s.gasto) : parseBR(s.orc) - parseBR(s.prov);
                return (
                  <tr key={s.secao} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"6px 12px",fontWeight:700,color:"#3b82f6",fontSize:13}}>{s.secao}</td>
                    <td style={{padding:"4px 12px",textAlign:"right"}}><input value={s.orc} onChange={e=>setFixField(s.secao,"orc",e.target.value)} style={{...iSty(T),width:130,textAlign:"right",padding:"4px 8px"}}/></td>
                    <td style={{padding:"4px 12px",textAlign:"right"}}><input value={s.gasto} onChange={e=>setFixField(s.secao,"gasto",e.target.value)} style={{...iSty(T),width:130,textAlign:"right",padding:"4px 8px",color:"#22c55e"}}/></td>
                    <td style={{padding:"4px 12px",textAlign:"right"}}><input value={s.prov} onChange={e=>setFixField(s.secao,"prov",e.target.value)} style={{...iSty(T),width:130,textAlign:"right",padding:"4px 8px",color:"#3b82f6"}}/></td>
                    <td style={{padding:"6px 12px",textAlign:"right",fontWeight:700,color:sav>=0?"#a3e635":"#ef4444"}}>{sav>=0?"▲ ":"▼ "}{fmtR(Math.abs(sav))}</td>
                  </tr>
                );
              })}
              {d.sectionsView.length === 0 && (
                <tr><td colSpan={5} style={{padding:24,textAlign:"center",color:T.textSm,fontSize:12}}>Nenhuma seção no portal</td></tr>
              )}
            </tbody>
            <tfoot><tr style={{background:T.bg}}>
              <td style={{padding:"10px 12px",fontSize:11,color:T.textSm,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Total</td>
              <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:T.text}}>{fmtR(d.orcTotal)}</td>
              <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:T.text}}>{fmtR(d.gastoTotal)}</td>
              <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#3b82f6"}}>{fmtR(d.provTotal)}</td>
              <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:d.saldoTotal>=0?"#a3e635":"#ef4444"}}>{d.saldoTotal>=0?"▲ ":"▼ "}{fmtR(Math.abs(d.saldoTotal))}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────
// A aba renderiza o acompanhamento orçamentário direto no Hub (antes gerava
// PPTX). Estado compartilhado: `apres` vive no app_state (uma chave por
// campeonato, wire nos componentes-pai) — overrides valem para todos os
// usuários, não mais por navegador.
export default function TabApresentacoes({ T, jogos = [], servicos = [], notasMensais = [], apres, setApres, orcGlobal = 0, mesInicio = 0, saldoUsaGasto = false, nomeCampeonato = "" }) {
  const a = apres || {};
  const upd = updater => setApres(prev => updater(prev || {}));
  const setField = (field, v) => upd(p => ({ ...p, [field]: v }));
  const setVarField = (rodada, field, v) => upd(p => ({ ...p, varOverrides: { ...(p.varOverrides || {}), [rodada]: { ...((p.varOverrides || {})[rodada] || {}), [field]: v } } }));
  const setFixField = (secao, field, v) => upd(p => ({ ...p, fixOverrides: { ...(p.fixOverrides || {}), [secao]: { ...((p.fixOverrides || {})[secao] || {}), [field]: v } } }));
  const resetVar = () => upd(p => ({ ...p, varOverrides: {}, nfEsp: "", nfRec: "" }));
  const resetFix = () => upd(p => ({ ...p, fixOverrides: {}, orcTot: "", provTot: "", gastoTot: "" }));

  const nfEspOvr = a.nfEsp ?? "";
  const nfRecOvr = a.nfRec ?? "";
  const orcTotOvr = a.orcTot ?? "";
  const provTotOvr = a.provTot ?? "";
  const gastoTotOvr = a.gastoTot ?? "";

  const dadosVar = useMemo(() => calcVariaveis({
    jogos, rodadaSel: a.varRodada ?? null, overrides: a.varOverrides || {},
    nfEspOvr, nfRecOvr, orcGlobal,
  }), [jogos, a.varRodada, a.varOverrides, nfEspOvr, nfRecOvr, orcGlobal]);

  const dadosFix = useMemo(() => calcFixos({
    servicos, notasMensais, jogos,
    mesSel: a.fixMes ?? null, rodadaSel: a.fixRodada ?? null, mesInicio,
    overrides: a.fixOverrides || {}, orcTotOvr, provTotOvr, gastoTotOvr,
    saldoUsaGasto,
  }), [servicos, notasMensais, jogos, a.fixMes, a.fixRodada, mesInicio, a.fixOverrides, orcTotOvr, provTotOvr, gastoTotOvr, saldoUsaGasto]);

  const vg = useMemo(() => calcVisaoGeral({ dadosVar, dadosFix, orcGlobalVar: orcGlobal }), [dadosVar, dadosFix, orcGlobal]);

  const [view, setView] = useState("visaogeral");
  const [editMode, setEditMode] = useState(false);

  const TABS = [
    {value:"visaogeral", label:"Visão Geral",      icon:LayoutGrid},
    {value:"variaveis",  label:"Custos Variáveis", icon:BarChart3},
    {value:"fixos",      label:"Custos Fixos",     icon:Lock},
  ];
  const temAjustes = view !== "visaogeral";
  const teal = "#14b8a6";

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:4}}>
          {TABS.map(t => (
            <button key={t.value} onClick={()=>{setView(t.value); setEditMode(false);}} style={{
              padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
              display:"flex",alignItems:"center",gap:6,
              background:view===t.value?teal:"transparent",color:view===t.value?"#fff":T.textMd,
            }}><t.icon size={14}/>{t.label}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {view === "variaveis" && (
            <select value={dadosVar.rodadaAtual} onChange={e=>setField("varRodada",parseInt(e.target.value))} style={{...iSty(T),padding:"6px 10px"}}>
              {dadosVar.rodadasDisp.length === 0
                ? <option value={1}>—</option>
                : dadosVar.rodadasDisp.map(r => <option key={r} value={r}>Rodada {r}</option>)}
            </select>
          )}
          {view === "fixos" && (
            <>
              <select value={dadosFix.mesAtual} onChange={e=>setField("fixMes",parseInt(e.target.value))} style={{...iSty(T),padding:"6px 10px"}}>
                {MESES_FIX.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
              {dadosFix.rodadasDisp.length > 0 && (
                <select value={dadosFix.rodadaAtual} onChange={e=>setField("fixRodada",parseInt(e.target.value))} style={{...iSty(T),padding:"6px 10px"}}>
                  {dadosFix.rodadasDisp.map(r => <option key={r} value={r}>Rodada {r}</option>)}
                </select>
              )}
            </>
          )}
          {temAjustes && (
            <Button T={T} variant={editMode?"primary":"secondary"} size="md" icon={editMode?X:Settings2} onClick={()=>setEditMode(m=>!m)}>
              {editMode ? "Fechar ajustes" : "Ajustar dados"}
            </Button>
          )}
        </div>
      </div>

      {view === "visaogeral" && <SlideVisaoGeral vg={vg} T={T}/>}
      {view === "variaveis" && (
        <>
          <SlideVariaveis d={dadosVar} T={T}/>
          {editMode && <AjustesVariaveis d={dadosVar} T={T} nfEspOvr={nfEspOvr} nfRecOvr={nfRecOvr} setField={setField} setVarField={setVarField} resetVar={resetVar} orcGlobal={orcGlobal}/>}
        </>
      )}
      {view === "fixos" && (
        <ErrorBoundary>
          <SlideFixos d={dadosFix} T={T} saldoUsaGasto={saldoUsaGasto}/>
          {editMode && <AjustesFixos d={dadosFix} T={T} orcTotOvr={orcTotOvr} provTotOvr={provTotOvr} gastoTotOvr={gastoTotOvr} setField={setField} setFixField={setFixField} resetFix={resetFix} saldoUsaGasto={saldoUsaGasto}/>}
        </ErrorBoundary>
      )}

      <p style={{textAlign:"center",fontSize:11,color:T.textSm,margin:"8px 0 0"}}>Acompanhamento Orçamentário – {nomeCampeonato}</p>
    </div>
  );
}
