import { useState, useMemo, useEffect, useRef } from "react";
import PptxGenJS from "pptxgenjs";
import { btnStyle, iSty, ORC_PADRAO, REAL_PADRAO, RADIUS } from "../../constants";
import { parseBR, fmtNum, fmtR, fmtRs, subTotal } from "../../utils";
import { Card, Button } from "../ui";
import { BarChart3, Lock, ArrowRight, ArrowLeft, FileDown, LayoutGrid } from "lucide-react";

const fmtBRL = v => "R$ " + Number(v).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});

// ─── HOOK DONUT ───────────────────────────────────────────────────────────────
function useDonut(canvasRef, rec, pend) {
useEffect(() => {
const canvas = canvasRef.current; if (!canvas) return;
const ctx = canvas.getContext("2d");
const cx=55, cy=55, r=50, ri=34;
ctx.clearRect(0,0,110,110);
const total = rec+pend || 1; let start = -Math.PI/2;
[[rec,"#22c55e"],[pend,"#d97706"]].forEach(([val,color]) => {
const a = val/total*Math.PI*2;
ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+a); ctx.closePath();
ctx.fillStyle = color; ctx.fill(); start += a;
});
ctx.beginPath(); ctx.arc(cx,cy,ri,0,Math.PI*2); ctx.fillStyle="#1e293b"; ctx.fill();
}, [rec, pend]);
}

// ─── SELETOR DE TIPO ──────────────────────────────────────────────────────────
function SeletorTipo({T, onSelect}) {
const opts = [
{key:"variaveis",  icon:BarChart3,  label:"Custos Variáveis",        desc:"Acompanhamento por rodada — orçado × realizado, saving acumulado e notas fiscais.", color:T.brand,   grad:"linear-gradient(135deg,#047857 0%,#10b981 100%)"},
{key:"fixos",      icon:Lock,       label:"Custos Fixos",            desc:"Serviços fixos do campeonato — orçado × gasto × provisionado por categoria.",        color:T.info,    grad:"linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)"},
{key:"visaogeral", icon:LayoutGrid, label:"Visão Geral Orçamentária", desc:"Slide único consolidado — KPIs globais, síntese dos pilares (variáveis + fixos) e tabela de blocos.",  color:"#7c3aed", grad:"linear-gradient(135deg,#5b21b6 0%,#7c3aed 100%)"},
];
return (
<div>
<p style={{color:T.brand,fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",margin:"0 0 8px"}}>Apresentações</p>
<h2 style={{margin:"0 0 6px",fontSize:24,color:T.text,fontWeight:800,letterSpacing:"-0.025em"}}>Gerar Apresentação PPTX</h2>
<p style={{color:T.textMd,fontSize:14,marginBottom:32}}>Selecione o tipo de custo que deseja apresentar.</p>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:20}}>
{opts.map(opt => {
const Icon = opt.icon;
return (
<Card key={opt.key} T={T} hoverable onClick={()=>onSelect(opt.key)} style={{cursor:"pointer"}}>
<div onClick={()=>onSelect(opt.key)}>
<div style={{background:opt.grad,padding:"28px 26px 24px",position:"relative",overflow:"hidden"}}>
<div style={{position:"absolute",top:-30,right:-30,width:140,height:140,borderRadius:"50%",background:"radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)",pointerEvents:"none"}}/>
<div style={{width:50,height:50,borderRadius:14,background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
<Icon size={24} color="#fff" strokeWidth={2.25}/>
</div>
<h3 style={{margin:"14px 0 4px",fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",position:"relative"}}>{opt.label}</h3>
</div>
<div style={{padding:"18px 24px 22px"}}>
<p style={{color:T.textMd,fontSize:13,margin:"0 0 18px",lineHeight:1.55}}>{opt.desc}</p>
<Button T={T} variant="primary" size="md" fullWidth icon={ArrowRight}>Preencher formulário</Button>
</div>
</div>
</Card>
);
})}
</div>
</div>
);
}

// ─── FORM VARIÁVEIS ───────────────────────────────────────────────────────────
const ORC_GLOBAL_FIXO = 10078880; // Orçado total variáveis do campeonato (travado)

function FormVariaveis({T, onBack, jogos = []}) {
const [status,      setStatus]      = useState({msg:"Pronto para gerar",cls:""});
const [loading,     setLoading]     = useState(false);
const canvasRef = useRef(null);

// Rodadas disponíveis (jogos já divulgados)
const rodadasDisp = useMemo(() =>
Array.from(new Set(jogos.map(j => j.rodada))).sort((a,b) => a-b),
[jogos]);

const [rodadaAtual, setRodadaAtual] = useState(() => rodadasDisp[rodadasDisp.length-1] || 1);
useEffect(() => {
if (rodadasDisp.length && !rodadasDisp.includes(rodadaAtual)) {
setRodadaAtual(rodadasDisp[rodadasDisp.length-1]);
}
}, [rodadasDisp]); // eslint-disable-line react-hooks/exhaustive-deps

// Dados computados de jogos (auto)
const computed = useMemo(() => {
const jogosAteRod = jogos.filter(j => j.rodada <= rodadaAtual);
const orcAteRod  = jogosAteRod.reduce((s, j) => s + subTotal(j.orcado || {}), 0);
const realAteRod = jogosAteRod.reduce((s, j) => s + subTotal(j.realizado || {}), 0);
const provAteRod = jogosAteRod.reduce((s, j) => s + subTotal(j.provisionado || {}), 0);
const rodadasAteAtual = rodadasDisp.filter(r => r <= rodadaAtual);
const rodadasAuto = rodadasAteAtual.map(r => {
const jr = jogos.filter(j => j.rodada === r);
return {
rodada: r,
label: `R${r}`,
orcadoAuto:    jr.reduce((s, j) => s + subTotal(j.orcado || {}), 0),
// Na tabela "Realizado" = provisionado (mesma fonte da aba Savings)
realizadoAuto: jr.reduce((s, j) => s + subTotal(j.provisionado || {}), 0),
};
});
return { orcAteRod, realAteRod, provAteRod, rodadasAuto };
}, [jogos, rodadaAtual, rodadasDisp]);

// Overrides por linha (rodada → {orcado?, realizado?})
const [overrides, setOverrides] = useState({});
const setRodadaField = (rodada, field, val) =>
setOverrides(prev => ({...prev, [rodada]: {...prev[rodada], [field]: val}}));

// Overrides do bloco "Notas Fiscais" — vazio = usar valor automático da tabela
const [nfEspOverride, setNfEspOverride] = useState("");
const [nfRecOverride, setNfRecOverride] = useState("");
const resetOverrides = () => { setOverrides({}); setNfEspOverride(""); setNfRecOverride(""); };

// View da tabela aplicando overrides
const rodadasView = computed.rodadasAuto.map(r => ({
...r,
orcado:    overrides[r.rodada]?.orcado    ?? fmtNum(r.orcadoAuto),
realizado: overrides[r.rodada]?.realizado ?? fmtNum(r.realizadoAuto),
}));

const parsed = useMemo(() => {
const rows    = rodadasView.map(r => ({label:r.label, orcado:parseBR(r.orcado), realizado:parseBR(r.realizado)}));
const totOrc  = rows.reduce((s,r) => s+r.orcado, 0);
const totReal = rows.reduce((s,r) => s+r.realizado, 0);
const saving  = totOrc - totReal;
const savPct  = totOrc > 0 ? saving/totOrc*100 : 0;
// Auto: nfEsp segue o total da coluna "Realizado" da tabela; nfRec segue o realizado real das NFs
const autoNfEspV = totReal;
const autoNfRecV = computed.realAteRod;
const nfEspV = nfEspOverride !== "" ? parseBR(nfEspOverride) : autoNfEspV;
const nfRecV = nfRecOverride !== "" ? parseBR(nfRecOverride) : autoNfRecV;
const nfPend = Math.max(0, nfEspV - nfRecV);
const pctRec = nfEspV > 0 ? nfRecV/nfEspV*100 : 0;
return {rows, totOrc, totReal, saving, savPct, nfPend, pctRec, nfEspV, nfRecV, autoNfEspV, autoNfRecV};
}, [rodadasView, computed, nfEspOverride, nfRecOverride]);

useDonut(canvasRef, parsed.nfRecV, parsed.nfPend);

const IS     = {...iSty(T), width:"100%"};
const IS_RO  = {...IS, background:T.bg, cursor:"default"};
const grid3  = {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20};
const secHdr = {fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.text,marginBottom:16};
const secNum = {fontSize:10,color:T.textSm,fontWeight:700,marginRight:8};
const {rows, totOrc, totReal, saving, savPct, nfPend, pctRec, nfRecV, nfEspV, autoNfEspV, autoNfRecV} = parsed;
const orcGlobalFmt = fmtNum(ORC_GLOBAL_FIXO);
// Orçado acumulado = total da coluna Orçado da tabela (com overrides)
const orcAteRodFmt = fmtNum(totOrc);

async function gerarPPTX() {
setLoading(true); setStatus({msg:"Gerando...", cls:""});
try {
const orcGlobalV = ORC_GLOBAL_FIXO;
const orcAteRodV = totOrc; // total da coluna Orçado da tabela (com overrides)
const macroProjV = totReal + (orcGlobalV - orcAteRodV);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const sl = pptx.addSlide();
  sl.background = {color:"FFFFFF"};

  // barra topo
  sl.addShape(pptx.ShapeType.rect, {x:0,y:0,w:13.33,h:0.05,fill:{color:"22C55E"},line:{width:0}});

  // título
  sl.addText("Acompanhamento Orçamentário – Brasileirão 2026", {
    x:0.3,y:0.08,w:12.7,h:0.38,fontSize:20,bold:true,color:"111827",fontFace:"Segoe UI"
  });
  sl.addText(`Serviços Variáveis  ·  Rodada ${rodadaAtual} de 38`, {
    x:0.3,y:0.46,w:12.7,h:0.2,fontSize:10,color:"9CA3AF",fontFace:"Segoe UI"
  });
  sl.addShape(pptx.ShapeType.line, {x:0.3,y:0.72,w:12.73,h:0,line:{color:"E5E7EB",width:1}});

  // 4 KPIs
  const kpiDefs = [
    {label:"ORÇADO TOTAL",                  val:fmtBRL(orcGlobalV), border:"D1D5DB", valColor:"111827"},
    {label:`ORÇADO ATÉ R${rodadaAtual}`,    val:fmtBRL(orcAteRodV), border:"D1D5DB", valColor:"111827"},
    {label:`REALIZADO ATÉ R${rodadaAtual}`, val:fmtBRL(totReal),    border:"D1D5DB", valColor:"111827"},
    {label:"SAVING ACUMULADO",              val:fmtBRL(Math.abs(saving)), border:"22C55E", valColor:saving>=0?"22C55E":"EF4444"},
  ];
  const kW=3.18, kH=0.92, kY=0.82;
  kpiDefs.forEach(({label,val,border,valColor}, i) => {
    const x = 0.3 + i*(kW+0.04);
    sl.addShape(pptx.ShapeType.rect, {x,y:kY,w:kW,h:kH,fill:{color:"FFFFFF"},line:{color:border,width:1.5}});
    sl.addShape(pptx.ShapeType.rect, {x,y:kY,w:kW,h:0.05,fill:{color:border},line:{width:0}});
    sl.addText(label, {x:x+0.1,y:kY+0.1,w:kW-0.2,h:0.2,fontSize:7.5,bold:true,color:"6B7280",charSpacing:1.5,fontFace:"Segoe UI"});
    sl.addText(val,   {x:x+0.1,y:kY+0.34,w:kW-0.2,h:0.46,fontSize:18,color:valColor,fontFace:"Segoe UI"});
  });

  // gráfico barras (esquerda)
  sl.addChart(pptx.ChartType.bar, [
    {name:"Orçado",    labels:rows.map(r=>r.label), values:rows.map(r=>r.orcado)},
    {name:"Realizado", labels:rows.map(r=>r.label), values:rows.map(r=>r.realizado)},
  ], {
    x:0.3, y:1.88, w:8.8, h:2.72,
    barDir:"col", barGrouping:"clustered",
    chartColors:["D1D5DB","22C55E"],
    showValue:false,
    showLegend:true, legendPos:"t", legendFontSize:9,
    title:"Comparativo Orçado × Realizado", showTitle:true, titleFontSize:11, titleBold:true,
    valGridLine:{style:"none"},
  });

  // donut NFs (direita)
  sl.addChart(pptx.ChartType.doughnut, [
    {name:"NFs", labels:["Recebidas","Pendentes"], values:[nfRecV, nfPend]},
  ], {
    x:9.3, y:1.88, w:3.73, h:2.72,
    chartColors:["22C55E","D97706"],
    holeSize:60,
    showLabel:false, showPercent:true, dataLabelFontSize:9,
    showLegend:true, legendPos:"b", legendFontSize:8,
    title:"Notas Fiscais", showTitle:true, titleFontSize:11, titleBold:true,
  });

  // tabela por rodada
  const th = (txt, align="left") => ({text:txt, options:{bold:true,fontSize:8.5,color:"FFFFFF",fill:{color:"1F2937"},align}});
  const tblHead = [th("RODADA"), th("ORÇADO","right"), th("REALIZADO","right"), th("SAVING","right"), th("SAVING %","right")];

  const tblBody = rows.map((r, i) => {
    const sav = r.orcado - r.realizado;
    const savPctRow = r.orcado > 0 ? sav/r.orcado*100 : 0;
    const fill = {color: i%2===0?"FFFFFF":"F9FAFB"};
    const sc = sav>=0?"16A34A":"DC2626";
    return [
      {text:r.label,                                                        options:{fontSize:8.5,bold:true,color:"111827",fill}},
      {text:fmtBRL(r.orcado),                                               options:{fontSize:8.5,color:"111827",fill,align:"right"}},
      {text:fmtBRL(r.realizado),                                            options:{fontSize:8.5,color:"111827",fill,align:"right"}},
      {text:(sav>=0?"▲ ":"▼ ")+fmtBRL(Math.abs(sav)),                      options:{fontSize:8.5,bold:true,color:sc,fill,align:"right"}},
      {text:(savPctRow>=0?"▲ ":"▼ ")+Math.abs(savPctRow).toFixed(1)+"%",   options:{fontSize:8.5,bold:true,color:sc,fill,align:"right"}},
    ];
  });

  // ✅ FIX 2: savPctTot usa totOrc (era orcAteRodV)
  const savPctTot = totOrc>0 ? saving/totOrc*100 : 0;
  const stc = saving>=0?"A3E635":"FF6B6B";
  const tblTot = [
    {text:"TOTAL",                                                          options:{fontSize:8.5,bold:true,color:"FFFFFF",fill:{color:"111827"}}},
    {text:fmtBRL(totOrc),                                                   options:{fontSize:8.5,bold:true,color:"FFFFFF",fill:{color:"111827"},align:"right"}},
    {text:fmtBRL(totReal),                                                  options:{fontSize:8.5,bold:true,color:"FFFFFF",fill:{color:"111827"},align:"right"}},
    {text:(saving>=0?"▲ ":"▼ ")+fmtBRL(Math.abs(saving)),                  options:{fontSize:8.5,bold:true,color:stc,fill:{color:"111827"},align:"right"}},
    {text:(savPctTot>=0?"▲ ":"▼ ")+Math.abs(savPctTot).toFixed(1)+"%",     options:{fontSize:8.5,bold:true,color:stc,fill:{color:"111827"},align:"right"}},
  ];

  // tabela ocupa todo o espaço entre os gráficos e a borda inferior do slide
  const rowH = Math.max(0.18, 2.6 / (rows.length + 1));
  sl.addTable([tblHead, ...tblBody, tblTot], {
    x:0.3, y:4.72, w:12.73, colW:[1.5,2.8,2.8,2.8,2.83],
    border:{type:"solid",color:"E5E7EB",pt:0.5}, rowH,
  });

  await pptx.writeFile({fileName:`dashboard_variaveis_R${rodadaAtual}_brasileirao2026.pptx`});
  setStatus({msg:`✅ dashboard_variaveis_R${rodadaAtual}.pptx baixado!`, cls:"ok"});
} catch(e) {
  setStatus({msg:"❌ Erro: "+e.message, cls:"err"});
  console.error(e);
}
setLoading(false);

}

return (
<div style={{paddingBottom:80}}>
<div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
<Button T={T} variant="secondary" size="md" icon={ArrowLeft} onClick={onBack}>Voltar</Button>
<div style={{display:"flex",alignItems:"center",gap:12}}>
<div style={{width:40,height:40,borderRadius:12,background:T.brandSoft||"rgba(16,185,129,0.12)",border:`1px solid ${T.brandBorder||"rgba(16,185,129,0.28)"}`,color:T.brand||"#10b981",display:"flex",alignItems:"center",justifyContent:"center"}}>
<BarChart3 size={18} strokeWidth={2.25}/>
</div>
<div>
<h2 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Custos Variáveis</h2>
<p style={{margin:"2px 0 0",fontSize:12,color:T.textMd}}>Acompanhamento por rodada</p>
</div>
</div>
</div>

  <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>01</span><span style={secHdr}>Configuração Base</span></div>
    <div style={grid3}>
      <div style={{marginBottom:16}}>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Rodada Atual *</label>
        <select value={rodadaAtual} onChange={e=>setRodadaAtual(parseInt(e.target.value))} style={{...IS}}>
          {rodadasDisp.length === 0
            ? <option value={1}>—</option>
            : rodadasDisp.map(r => <option key={r} value={r}>Rodada {r}</option>)}
        </select>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Orçado Total – Campeonato <span style={{background:"#1e3a5f",color:"#93c5fd",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>FIXO</span></label>
        <input readOnly value={orcGlobalFmt} style={{...IS_RO}}/>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Orçado Acumulado até a Rodada <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO</span></label>
        <input readOnly value={orcAteRodFmt} style={{...IS_RO,color:"#22c55e"}}/>
      </div>
    </div>
  </div>

  <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:18}}>
      <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={secNum}>02</span><span style={secHdr}>Dados por Rodada</span></div>
      <button onClick={resetOverrides} style={{...btnStyle,background:T.border,color:T.text,padding:"5px 12px",fontSize:11}}>🔄 Re-sincronizar com portal</button>
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
        <thead><tr style={{background:T.bg}}>{["Rodada","Orçado (R$)","Realizado (R$)","Saving (R$)"].map((h,i)=>(<th key={h} style={{padding:"10px 12px",textAlign:i===0?"left":"right",color:T.textSm,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>))}</tr></thead>
        <tbody>
          {rodadasView.map((r,i) => {
            const orcVal  = parseBR(r.orcado);
            const realVal = parseBR(r.realizado);
            const sav     = orcVal - realVal;
            return (
              <tr key={r.rodada} style={{borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:"6px 12px",fontWeight:700,color:"#22c55e",fontSize:13}}>{r.label}</td>
                <td style={{padding:"4px 12px",textAlign:"right"}}><input value={r.orcado} onChange={e=>setRodadaField(r.rodada,"orcado",e.target.value)} style={{...iSty(T),width:120,textAlign:"right",padding:"4px 8px"}}/></td>
                <td style={{padding:"4px 12px",textAlign:"right"}}><input value={r.realizado} onChange={e=>setRodadaField(r.rodada,"realizado",e.target.value)} style={{...iSty(T),width:120,textAlign:"right",padding:"4px 8px",color:"#22c55e"}}/></td>
                <td style={{padding:"6px 12px",textAlign:"right",fontWeight:700,color:sav>=0?"#a3e635":"#ef4444"}}>{sav>=0?"▲ ":"▼ "}{fmtR(Math.abs(sav))}</td>
              </tr>
            );
          })}
          {rodadasView.length === 0 && (
            <tr><td colSpan={4} style={{padding:24,textAlign:"center",color:T.textSm,fontSize:12}}>Nenhuma rodada disponível</td></tr>
          )}
        </tbody>
        <tfoot><tr style={{background:T.bg}}>
          <td style={{padding:"10px 12px",fontSize:11,color:T.textSm,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Total</td>
          <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:T.text}}>{fmtR(totOrc)}</td>
          <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:T.text}}>{fmtR(totReal)}</td>
          <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:saving>=0?"#a3e635":"#ef4444"}}>{saving>=0?"▲ ":"▼ "}{fmtR(Math.abs(saving))}</td>
        </tr></tfoot>
      </table>
    </div>
  </div>

  <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>03</span><span style={secHdr}>Notas Fiscais</span></div>
    <div style={grid3}>
      <div><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Notas Esperadas <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO · editável</span></label><input value={nfEspOverride !== "" ? nfEspOverride : fmtNum(autoNfEspV)} onChange={e=>setNfEspOverride(e.target.value)} style={{...IS}}/></div>
      <div><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Notas Recebidas <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO · editável</span></label><input value={nfRecOverride !== "" ? nfRecOverride : fmtNum(autoNfRecV)} onChange={e=>setNfRecOverride(e.target.value)} style={{...IS,color:"#22c55e"}}/></div>
      <div><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Pendentes <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO</span></label><input readOnly value={fmtNum(nfPend)} style={{...IS_RO,color:"#d97706"}}/></div>
    </div>
    <div style={{display:"flex",gap:32,alignItems:"flex-start",marginTop:20,flexWrap:"wrap"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        <div style={{position:"relative",width:110,height:110}}>
          <canvas ref={canvasRef} width={110} height={110}/>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:15,fontWeight:700,color:T.text}}>{Math.round(pctRec)}%</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:T.textMd}}><span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/> Recebidas · <b style={{color:T.text}}>{fmtRs(nfRecV)}</b></span>
          <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:T.textMd}}><span style={{width:8,height:8,borderRadius:"50%",background:"#d97706",flexShrink:0}}/> Pendentes · <b style={{color:T.text}}>{fmtRs(nfPend)}</b></span>
        </div>
      </div>
      <div style={{display:"flex",gap:28,flexWrap:"wrap",flex:1}}>
        {[
          {label:"% Recebidas",     val:`${pctRec.toFixed(1)}%`,                           sub:fmtRs(nfRecV),                             color:"#22c55e"},
          {label:"% Pendentes",     val:`${(100-pctRec).toFixed(1)}%`,                     sub:fmtRs(nfPend),                             color:"#d97706"},
          {label:"Saving Acumulado",val:(saving>=0?"▲ ":"▼ ")+fmtRs(Math.abs(saving)),    sub:`${Math.abs(savPct).toFixed(1)}% vs. orçado`,color:saving>=0?"#a3e635":"#ef4444"},
        ].map(m=>(
          <div key={m.label}>
            <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{m.label}</p>
            <p style={{fontSize:22,fontWeight:300,color:m.color,marginBottom:2}}>{m.val}</p>
            <p style={{fontSize:10,color:T.textSm}}>{m.sub}</p>
          </div>
        ))}
      </div>
    </div>
  </div>

  <div style={{position:"sticky",bottom:0,background:T.surface||T.card,borderTop:`1px solid ${T.border}`,padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:50,boxShadow:"0 -8px 24px -8px rgba(0,0,0,0.3)"}}>
    <div>
      <p style={{fontSize:12,color:T.textMd,marginBottom:2}}><b style={{color:T.text,fontWeight:700}}>Tudo preenchido?</b> Clique para gerar e baixar o PPTX.</p>
      <p style={{fontSize:11,color:status.cls==="ok"?T.brand:status.cls==="err"?T.danger:T.textSm,fontWeight:600}}>{status.msg}</p>
    </div>
    <Button T={T} variant="primary" size="lg" icon={FileDown} onClick={gerarPPTX} disabled={loading}>
      {loading ? "Gerando..." : "Gerar PPTX"}
    </Button>
  </div>
</div>

);
}

// ─── FORM FIXOS ───────────────────────────────────────────────────────────────
const MESES_FIX = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function FormFixos({T, onBack, servicos = [], notasMensais = []}) {
const [status,  setStatus]  = useState({msg:"Pronto para gerar", cls:""});
const [loading, setLoading] = useState(false);
const [mesAtual, setMesAtual] = useState(() => new Date().getMonth());

// Categorias variáveis (excluídas dos "Outros Mensais" fixos)
const VAR_CATS_FIX = new Set(["Transporte","Uber","Hospedagem","Seg. Espacial"]);

// Auto: orçado anual ÷ 12 × meses decorridos (acumulado até o mês selecionado)
//       gasto = NFs mensais até o mês selecionado
const mesesDecorridos = mesAtual + 1; // jan=1, fev=2, ...
const computed = useMemo(() => {
const sections = servicos.map(sec => {
const idsItens = sec.itens.map(it => it.id);
const orcAnual  = sec.itens.reduce((s, it) => s + (it.orcado || 0), 0);
const provAnual = sec.itens.reduce((s, it) => s + (it.provisionado || 0), 0);
const orcAuto   = (orcAnual / 12) * mesesDecorridos;
const provAuto  = (provAnual / 12) * mesesDecorridos;
const provTotalAnual = provAnual;
const gastoAuto = notasMensais
.filter(n => n.servicoId && idsItens.includes(n.servicoId) && n.mes <= mesAtual)
.reduce((s, n) => s + (n.valor || 0), 0);
return { secao: sec.secao, orcAnual, orcAuto, provAuto, provTotalAnual, gastoAuto };
});

// "Outros Mensais": NFs sem servicoId e sem categoria variável mapeada
const outrosGasto = notasMensais
  .filter(n => !n.servicoId && !VAR_CATS_FIX.has(n.categoria) && n.mes <= mesAtual)
  .reduce((s, n) => s + (n.valor || 0), 0);
if (outrosGasto > 0) {
  sections.push({ secao: "Outros Mensais", orcAnual: 0, orcAuto: 0, provAuto: 0, provTotalAnual: 0, gastoAuto: outrosGasto });
}

const orcAnualTotal     = sections.reduce((s, x) => s + x.orcAnual, 0);
const provTotalAnualAll = sections.reduce((s, x) => s + x.provTotalAnual, 0);
const orcTotalAuto      = sections.reduce((s, x) => s + x.orcAuto, 0);
return { sections, orcTotalAuto, orcAnualTotal, provTotalAnualAll };

}, [servicos, notasMensais, mesAtual, mesesDecorridos]);

// Overrides por seção (secao → {orc?, gasto?})
const [overrides, setOverrides] = useState({});
const setSecField = (secao, field, val) =>
setOverrides(prev => ({...prev, [secao]: {...prev[secao], [field]: val}}));
const resetOverrides = () => setOverrides({});

// View aplicando overrides
const sectionsView = computed.sections.map(s => ({
...s,
orc:   overrides[s.secao]?.orc   ?? fmtNum(s.orcAuto),
prov:  overrides[s.secao]?.prov  ?? fmtNum(s.provAuto),
gasto: overrides[s.secao]?.gasto ?? fmtNum(s.gastoAuto),
}));

const parsed = useMemo(() => {
const rows = sectionsView.map(s => {
const orc   = parseBR(s.orc);
const prov  = parseBR(s.prov);
const gasto = parseBR(s.gasto);
return { secao: s.secao, orc, prov, gasto, saldo: orc - prov };
});
const orcTotal   = rows.reduce((s, r) => s + r.orc, 0);
const provTotal  = rows.reduce((s, r) => s + r.prov, 0);
const gastoTotal = rows.reduce((s, r) => s + r.gasto, 0);
const saldoTotal = orcTotal - provTotal;
return { rows, orcTotal, provTotal, gastoTotal, saldoTotal };
}, [sectionsView]);

const { rows, orcTotal, provTotal, gastoTotal, saldoTotal } = parsed;
const provTotalAnual = computed.provTotalAnualAll;
const nfRecV = gastoTotal;
const nfPend = Math.max(0, provTotalAnual - gastoTotal);
const pctRec = provTotalAnual > 0 ? nfRecV / provTotalAnual * 100 : 0;
const canvasRef = useRef(null);
useDonut(canvasRef, nfRecV, nfPend);

const orcTotalFmt = fmtNum(orcTotal);
const IS    = {...iSty(T), width:"100%"};
const IS_RO = {...IS, background:T.bg, cursor:"default"};
const grid3  = {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20};
const secHdr = {fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.text,marginBottom:16};
const secNum = {fontSize:10,color:T.textSm,fontWeight:700,marginRight:8};

async function gerarPPTX() {
setLoading(true); setStatus({msg:"Gerando...", cls:""});
try {
const orcTotalV    = orcTotal;
const provTotalV   = provTotal;
const gastoTotalV  = gastoTotal;
const saldoTotalV  = saldoTotal;
const mesLabel     = MESES_FIX[mesAtual];

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const sl = pptx.addSlide();
  sl.background = {color:"FFFFFF"};

  // barra topo
  sl.addShape(pptx.ShapeType.rect, {x:0,y:0,w:13.33,h:0.05,fill:{color:"3B82F6"},line:{width:0}});

  // título
  sl.addText("Custos Fixos – Brasileirão 2026", {
    x:0.3,y:0.08,w:12.7,h:0.38,fontSize:20,bold:true,color:"111827",fontFace:"Segoe UI"
  });
  sl.addText(`Serviços Fixos  ·  Orçado ÷ 12 · Acumulado até ${mesLabel}`, {
    x:0.3,y:0.46,w:8,h:0.2,fontSize:10,color:"9CA3AF",fontFace:"Segoe UI"
  });

  // caixa orçado total campeonato (canto superior direito)
  const orcAnualV = computed.orcAnualTotal;
  const bxW=3.5, bxH=0.56, bxX=13.33-0.3-bxW, bxY=0.1;
  sl.addShape(pptx.ShapeType.rect, {x:bxX,y:bxY,w:bxW,h:bxH,fill:{color:"EFF6FF"},line:{color:"3B82F6",width:1.5}});
  sl.addText([
    {text:"ORÇADO TOTAL CAMPEONATO\n", options:{fontSize:7,bold:true,color:"6B7280",charSpacing:1.5,fontFace:"Segoe UI"}},
    {text:fmtBRL(orcAnualV), options:{fontSize:15,bold:true,color:"1E40AF",fontFace:"Segoe UI"}},
  ], {x:bxX+0.12,y:bxY+0.04,w:bxW-0.24,h:bxH-0.08,align:"right",valign:"middle"});

  sl.addShape(pptx.ShapeType.line, {x:0.3,y:0.72,w:12.73,h:0,line:{color:"E5E7EB",width:1}});

  // KPIs
  const saldoProvRealizadoV = provTotalV - gastoTotalV;
  const kpis = [
    {label:`ORÇADO ACUM. ATÉ ${mesLabel.toUpperCase()}`, val:fmtBRL(orcTotalV),              border:"D1D5DB", valColor:"111827"},
    {label:"GASTO ACUMULADO",                             val:fmtBRL(gastoTotalV),             border:"D1D5DB", valColor:"111827"},
    {label:"PROVISIONADO ACUM.",                          val:fmtBRL(provTotalV),              border:"D1D5DB", valColor:"3B82F6"},
    {label:`SALDO ATÉ ${mesLabel.toUpperCase()} (PROV − REAL)`, val:(saldoProvRealizadoV>=0?"▲ ":"▼ ")+fmtBRL(Math.abs(saldoProvRealizadoV)), border:"22C55E", valColor:saldoProvRealizadoV>=0?"16A34A":"EF4444"},
  ];
  const kW=3.18, kH=0.92, kY=0.82;
  kpis.forEach(({label,val,border,valColor}, i) => {
    const x = 0.3 + i*(kW+0.04);
    sl.addShape(pptx.ShapeType.rect, {x,y:kY,w:kW,h:kH,fill:{color:"FFFFFF"},line:{color:border,width:1.5}});
    sl.addShape(pptx.ShapeType.rect, {x,y:kY,w:kW,h:0.05,fill:{color:border},line:{width:0}});
    sl.addText(label, {x:x+0.1,y:kY+0.1,w:kW-0.2,h:0.2,fontSize:7.5,bold:true,color:"6B7280",charSpacing:1.5,fontFace:"Segoe UI"});
    sl.addText(val,   {x:x+0.1,y:kY+0.34,w:kW-0.2,h:0.46,fontSize:18,color:valColor,fontFace:"Segoe UI"});
  });

  // gráfico barras por seção (esquerda)
  const secLabels = rows.map(r => r.secao.length>18 ? r.secao.substring(0,18)+"..." : r.secao);
  sl.addChart(pptx.ChartType.bar, [
    {name:"Orçado Acum.",  labels:secLabels, values:rows.map(r=>r.orc)},
    {name:"Gasto",         labels:secLabels, values:rows.map(r=>r.gasto)},
    {name:"Provisionado",  labels:secLabels, values:rows.map(r=>r.prov)},
  ], {
    x:0.3, y:1.88, w:8.8, h:2.72,
    barDir:"col", barGrouping:"clustered",
    chartColors:["D1D5DB","22C55E","3B82F6"],
    showValue:false,
    showLegend:true, legendPos:"t", legendFontSize:9,
    title:"Comparativo Orçado × Gasto × Provisionado", showTitle:true, titleFontSize:11, titleBold:true,
    valGridLine:{style:"none"},
  });

  // donut NFs (direita)
  const provTotalAnualPptx = computed.provTotalAnualAll;
  const nfRecPptx = gastoTotalV;
  const nfPendPptx = Math.max(0, provTotalAnualPptx - gastoTotalV);
  sl.addChart(pptx.ChartType.doughnut, [
    {name:"NFs", labels:["Recebidas","Pendentes"], values:[nfRecPptx, nfPendPptx]},
  ], {
    x:9.3, y:1.88, w:3.73, h:2.72,
    chartColors:["22C55E","D97706"],
    holeSize:60,
    showLabel:false, showPercent:true, dataLabelFontSize:9,
    showLegend:true, legendPos:"b", legendFontSize:8,
    title:"NFs vs Provisionado Total", showTitle:true, titleFontSize:11, titleBold:true,
  });

  // tabela por seção
  const th = (txt, align="left") => ({text:txt, options:{bold:true,fontSize:8.5,color:"FFFFFF",fill:{color:"1F2937"},align}});
  const tblHead = [th("SEÇÃO"), th("ORÇADO ACUM.","right"), th("GASTO","right"), th("PROVISIONADO","right"), th("SALDO","right")];

  const tblBody = rows.map((r, i) => {
    const fill = {color: i%2===0?"FFFFFF":"F9FAFB"};
    const sc = r.saldo>=0?"16A34A":"DC2626";
    return [
      {text:r.secao,         options:{fontSize:8.5,bold:true,color:"111827",fill}},
      {text:fmtBRL(r.orc),   options:{fontSize:8.5,color:"111827",fill,align:"right"}},
      {text:fmtBRL(r.gasto), options:{fontSize:8.5,color:"111827",fill,align:"right"}},
      {text:fmtBRL(r.prov),  options:{fontSize:8.5,color:"3B82F6",fill,align:"right"}},
      {text:fmtBRL(r.saldo), options:{fontSize:8.5,bold:true,color:sc,fill,align:"right"}},
    ];
  });

  const stc = saldoTotalV>=0?"A3E635":"FF6B6B";
  const tblTot = [
    {text:"TOTAL",              options:{fontSize:8.5,bold:true,color:"FFFFFF",fill:{color:"111827"}}},
    {text:fmtBRL(orcTotalV),    options:{fontSize:8.5,bold:true,color:"FFFFFF",fill:{color:"111827"},align:"right"}},
    {text:fmtBRL(gastoTotalV),  options:{fontSize:8.5,bold:true,color:"FFFFFF",fill:{color:"111827"},align:"right"}},
    {text:fmtBRL(provTotalV),   options:{fontSize:8.5,bold:true,color:"93C5FD",fill:{color:"111827"},align:"right"}},
    {text:fmtBRL(saldoTotalV),  options:{fontSize:8.5,bold:true,color:stc,fill:{color:"111827"},align:"right"}},
  ];

  const rowH = Math.max(0.18, 2.6 / (rows.length + 1));
  sl.addTable([tblHead, ...tblBody, tblTot], {
    x:0.3, y:4.72, w:12.73, colW:[4.0,2.2,2.2,2.2,2.13],
    border:{type:"solid",color:"E5E7EB",pt:0.5}, rowH,
  });

  const fileMes = mesLabel.toLowerCase();
  await pptx.writeFile({fileName:`custos_fixos_${fileMes}_brasileirao2026.pptx`});
  setStatus({msg:`✅ custos_fixos_${fileMes}.pptx baixado!`, cls:"ok"});
} catch(e) {
  setStatus({msg:"❌ Erro: "+e.message, cls:"err"});
  console.error(e);
}
setLoading(false);

}

return (
<div style={{paddingBottom:80}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
<div style={{display:"flex",alignItems:"center",gap:14}}>
<Button T={T} variant="secondary" size="md" icon={ArrowLeft} onClick={onBack}>Voltar</Button>
<div style={{display:"flex",alignItems:"center",gap:12}}>
<div style={{width:40,height:40,borderRadius:12,background:T.info+"1f",border:`1px solid ${T.info}3a`,color:T.info,display:"flex",alignItems:"center",justifyContent:"center"}}>
<Lock size={18} strokeWidth={2.25}/>
</div>
<div>
<h2 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Custos Fixos</h2>
<p style={{margin:"2px 0 0",fontSize:12,color:T.textMd}}>Orçado anual ÷ 12 · Acompanhamento acumulado mensal</p>
</div>
</div>
</div>
<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 18px",textAlign:"right"}}>
<p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"0 0 2px"}}>Orçado Total Campeonato</p>
<p style={{fontSize:18,fontWeight:700,color:T.text,margin:0}}>{fmtR(computed.orcAnualTotal)}</p>
</div>
</div>

  <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>01</span><span style={secHdr}>Configuração Base</span></div>
    <div style={grid3}>
      <div style={{marginBottom:16}}>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Mês de Referência *</label>
        <select value={mesAtual} onChange={e=>setMesAtual(parseInt(e.target.value))} style={{...IS}}>
          {MESES_FIX.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Orçado Acumulado até {MESES_FIX[mesAtual]} <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO</span></label>
        <input readOnly value={orcTotalFmt} style={{...IS_RO}} title={`Anual: ${fmtR(computed.orcAnualTotal)} ÷ 12 × ${mesesDecorridos}`}/>
        <p style={{fontSize:10,color:T.textSm,margin:"4px 0 0"}}>Anual: {fmtR(computed.orcAnualTotal)} ÷ 12 × {mesesDecorridos} {mesesDecorridos===1?"mês":"meses"}</p>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Provisionado Acumulado até {MESES_FIX[mesAtual]} <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO</span></label>
        <input readOnly value={fmtNum(provTotal)} style={{...IS_RO,color:"#3b82f6"}} title={`Anual: ${fmtR(computed.provTotalAnualAll)} ÷ 12 × ${mesesDecorridos}`}/>
        <p style={{fontSize:10,color:T.textSm,margin:"4px 0 0"}}>Anual: {fmtR(computed.provTotalAnualAll)} ÷ 12 × {mesesDecorridos} {mesesDecorridos===1?"mês":"meses"}</p>
      </div>
    </div>
    <div style={grid3}>
      <div style={{marginBottom:0}}>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Gasto Acumulado até {MESES_FIX[mesAtual]} <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO</span></label>
        <input readOnly value={fmtNum(gastoTotal)} style={{...IS_RO,color:"#22c55e"}}/>
      </div>
      <div style={{marginBottom:0}}>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Saldo até {MESES_FIX[mesAtual]} (Provisionado − Realizado) <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO</span></label>
        <input readOnly value={fmtNum(provTotal - gastoTotal)} style={{...IS_RO, color: (provTotal - gastoTotal) >= 0 ? "#a3e635" : "#ef4444"}}/>
        <p style={{fontSize:10,color:T.textSm,margin:"4px 0 0"}}>{fmtR(provTotal)} (prov.) − {fmtR(gastoTotal)} (real.) = {(provTotal - gastoTotal) >= 0 ? "▲" : "▼"} {fmtR(Math.abs(provTotal - gastoTotal))}</p>
      </div>
    </div>
  </div>

  <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:18}}>
      <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={secNum}>02</span><span style={secHdr}>Dados por Seção</span></div>
      <button onClick={resetOverrides} style={{...btnStyle,background:T.border,color:T.text,padding:"5px 12px",fontSize:11}}>🔄 Re-sincronizar com portal</button>
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
        <thead><tr style={{background:T.bg}}>
          {["Seção","Orçado Acum. (R$)","Gasto (R$)","Provisionado (R$)","Saldo (R$)"].map((h,i) => (
            <th key={h} style={{padding:"10px 12px",textAlign:i===0?"left":"right",color:T.textSm,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {sectionsView.map((s, i) => {
            const orcVal   = parseBR(s.orc);
            const provVal  = parseBR(s.prov);
            const sav      = orcVal - provVal;
            return (
              <tr key={s.secao} style={{borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:"6px 12px",fontWeight:700,color:"#3b82f6",fontSize:13}}>{s.secao}</td>
                <td style={{padding:"4px 12px",textAlign:"right"}}>
                  <input value={s.orc} onChange={e=>setSecField(s.secao,"orc",e.target.value)}
                    style={{...iSty(T),width:130,textAlign:"right",padding:"4px 8px"}}/>
                </td>
                <td style={{padding:"4px 12px",textAlign:"right"}}>
                  <input value={s.gasto} onChange={e=>setSecField(s.secao,"gasto",e.target.value)}
                    style={{...iSty(T),width:130,textAlign:"right",padding:"4px 8px",color:"#22c55e"}}/>
                </td>
                <td style={{padding:"4px 12px",textAlign:"right"}}>
                  <input value={s.prov} onChange={e=>setSecField(s.secao,"prov",e.target.value)}
                    style={{...iSty(T),width:130,textAlign:"right",padding:"4px 8px",color:"#3b82f6"}}/>
                </td>
                <td style={{padding:"6px 12px",textAlign:"right",fontWeight:700,color:sav>=0?"#a3e635":"#ef4444"}}>{sav>=0?"▲ ":"▼ "}{fmtR(Math.abs(sav))}</td>
              </tr>
            );
          })}
          {sectionsView.length === 0 && (
            <tr><td colSpan={5} style={{padding:24,textAlign:"center",color:T.textSm,fontSize:12}}>Nenhuma seção no portal</td></tr>
          )}
        </tbody>
        <tfoot><tr style={{background:T.bg}}>
          <td style={{padding:"10px 12px",fontSize:11,color:T.textSm,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Total</td>
          <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:T.text}}>{fmtR(orcTotal)}</td>
          <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:T.text}}>{fmtR(gastoTotal)}</td>
          <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#3b82f6"}}>{fmtR(provTotal)}</td>
          <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:saldoTotal>=0?"#a3e635":"#ef4444"}}>{saldoTotal>=0?"▲ ":"▼ "}{fmtR(Math.abs(saldoTotal))}</td>
        </tr></tfoot>
      </table>
    </div>
  </div>

  <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}><span style={secNum}>03</span><span style={secHdr}>Notas Fiscais vs Provisionado Total</span></div>
    <p style={{fontSize:12,color:T.textMd,marginBottom:18}}>Provisionado total: <b style={{color:"#3b82f6"}}>{fmtRs(provTotalAnual)}</b> · NFs recebidas: <b style={{color:"#22c55e"}}>{fmtRs(nfRecV)}</b> · Pendente: <b style={{color:"#d97706"}}>{fmtRs(nfPend)}</b></p>
    <div style={{display:"flex",gap:32,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        <div style={{position:"relative",width:110,height:110}}>
          <canvas ref={canvasRef} width={110} height={110}/>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:15,fontWeight:700,color:T.text}}>{Math.round(pctRec)}%</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:T.textMd}}><span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/> Recebidas · <b style={{color:T.text}}>{fmtRs(nfRecV)}</b></span>
          <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:T.textMd}}><span style={{width:8,height:8,borderRadius:"50%",background:"#d97706",flexShrink:0}}/> Pendentes · <b style={{color:T.text}}>{fmtRs(nfPend)}</b></span>
        </div>
      </div>
      <div style={{display:"flex",gap:28,flexWrap:"wrap",flex:1}}>
        {[
          {label:"% Recebidas",     val:`${pctRec.toFixed(1)}%`,                               sub:fmtRs(nfRecV),                               color:"#22c55e"},
          {label:"% Pendentes",     val:`${(100-pctRec).toFixed(1)}%`,                         sub:fmtRs(nfPend),                               color:"#d97706"},
        ].map(m=>(
          <div key={m.label}>
            <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{m.label}</p>
            <p style={{fontSize:22,fontWeight:300,color:m.color,marginBottom:2}}>{m.val}</p>
            <p style={{fontSize:10,color:T.textSm}}>{m.sub}</p>
          </div>
        ))}
      </div>
    </div>
  </div>

  <div style={{position:"sticky",bottom:0,background:T.surface||T.card,borderTop:`1px solid ${T.border}`,padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:50,boxShadow:"0 -8px 24px -8px rgba(0,0,0,0.3)"}}>
    <div>
      <p style={{fontSize:12,color:T.textMd,marginBottom:2}}><b style={{color:T.text,fontWeight:700}}>Tudo certo?</b> Clique para gerar o PPTX.</p>
      <p style={{fontSize:11,color:status.cls==="ok"?T.brand:status.cls==="err"?T.danger:T.textSm,fontWeight:600}}>{status.msg}</p>
    </div>
    <Button T={T} variant="primary" size="lg" icon={FileDown} onClick={gerarPPTX} disabled={loading}>
      {loading ? "Gerando..." : "Gerar PPTX"}
    </Button>
  </div>
</div>

);
}


// ─── FORM VISÃO GERAL ─────────────────────────────────────────────────────────
const ORC_TOTAL_CAMPEONATO_VAR = 10078880; // Orçado total variáveis campeonato
const MESES_FIX_VG = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function FormVisaoGeral({T, onBack, jogos = [], servicos = [], notasMensais = []}) {
const [status,   setStatus]  = useState({msg:"Pronto para gerar", cls:""});
const [loading,  setLoading] = useState(false);
const [mesAtual, setMesAtual] = useState(() => new Date().getMonth());

const VAR_CATS_FIX_VG = new Set(["Transporte","Uber","Hospedagem","Seg. Espacial"]);
const mesesDecorridos = mesAtual + 1;

// ── Dados Variáveis ──────────────────────────────────────────────────────────
const rodadasDisp = useMemo(() =>
  Array.from(new Set(jogos.map(j => j.rodada))).sort((a,b) => a-b),
[jogos]);
const [rodadaAtual, setRodadaAtual] = useState(() => rodadasDisp[rodadasDisp.length-1] || 1);
useEffect(() => {
  if (rodadasDisp.length && !rodadasDisp.includes(rodadaAtual))
    setRodadaAtual(rodadasDisp[rodadasDisp.length-1]);
}, [rodadasDisp]); // eslint-disable-line

const computedVar = useMemo(() => {
  const jogosAte = jogos.filter(j => j.rodada <= rodadaAtual);
  const orcAte   = jogosAte.reduce((s, j) => s + subTotal(j.orcado || {}), 0);
  const realAte  = jogosAte.reduce((s, j) => s + subTotal(j.realizado || {}), 0);
  const rodadasAte = rodadasDisp.filter(r => r <= rodadaAtual);
  const porRodada = rodadasAte.map(r => {
    const jr = jogos.filter(j => j.rodada === r);
    return {
      label: `R${r}`,
      orcado:    jr.reduce((s, j) => s + subTotal(j.orcado || {}), 0),
      realizado: jr.reduce((s, j) => s + subTotal(j.provisionado || {}), 0),
    };
  });
  const totOrc  = porRodada.reduce((s, r) => s + r.orcado, 0);
  const totReal = porRodada.reduce((s, r) => s + r.realizado, 0);
  const saving  = totOrc - totReal;
  const savPct  = totOrc > 0 ? saving / totOrc * 100 : 0;
  const nfEspV  = totReal;
  const nfRecV  = realAte;
  const nfPend  = Math.max(0, nfEspV - nfRecV);
  const pctRec  = nfEspV > 0 ? nfRecV / nfEspV * 100 : 0;
  return { porRodada, totOrc, totReal, saving, savPct, nfEspV, nfRecV, nfPend, pctRec, orcAte, realAte };
}, [jogos, rodadaAtual, rodadasDisp]);

// ── Dados Fixos ──────────────────────────────────────────────────────────────
const computedFix = useMemo(() => {
  const sections = servicos.map(sec => {
    const idsItens   = sec.itens.map(it => it.id);
    const orcAnual   = sec.itens.reduce((s, it) => s + (it.orcado || 0), 0);
    const provAnual  = sec.itens.reduce((s, it) => s + (it.provisionado || 0), 0);
    const orcAuto    = (orcAnual / 12) * mesesDecorridos;
    const provAuto   = (provAnual / 12) * mesesDecorridos;
    const gastoAuto  = notasMensais
      .filter(n => n.servicoId && idsItens.includes(n.servicoId) && n.mes <= mesAtual)
      .reduce((s, n) => s + (n.valor || 0), 0);
    return { secao: sec.secao, orcAnual, orcAuto, provAuto, gastoAuto, provAnual };
  });
  const outrosGasto = notasMensais
    .filter(n => !n.servicoId && !VAR_CATS_FIX_VG.has(n.categoria) && n.mes <= mesAtual)
    .reduce((s, n) => s + (n.valor || 0), 0);
  if (outrosGasto > 0)
    sections.push({ secao: "Outros Mensais", orcAnual: 0, orcAuto: 0, provAuto: 0, gastoAuto: outrosGasto, provAnual: 0 });
  const orcTotalFix    = sections.reduce((s, x) => s + x.orcAuto, 0);
  const gastoTotalFix  = sections.reduce((s, x) => s + x.gastoAuto, 0);
  const provTotalFix   = sections.reduce((s, x) => s + x.provAuto, 0);
  const saldoFix       = orcTotalFix - provTotalFix;
  const orcAnualTotal  = sections.reduce((s, x) => s + x.orcAnual, 0);
  const provAnualTotal = sections.reduce((s, x) => s + x.provAnual, 0);
  const nfRecFix       = gastoTotalFix;
  const nfPendFix      = Math.max(0, provAnualTotal - gastoTotalFix);
  const pctRecFix      = provAnualTotal > 0 ? nfRecFix / provAnualTotal * 100 : 0;
  return { sections, orcTotalFix, gastoTotalFix, provTotalFix, saldoFix, orcAnualTotal, provAnualTotal, nfRecFix, nfPendFix, pctRecFix };
}, [servicos, notasMensais, mesAtual, mesesDecorridos]);

// ── Preview resumido ─────────────────────────────────────────────────────────
const { totOrc: varOrc, totReal: varReal, saving: varSaving, savPct: varSavPct, porRodada } = computedVar;
const { orcTotalFix, gastoTotalFix, saldoFix, orcAnualTotal } = computedFix;
const orcTotalGlobal  = varOrc + orcTotalFix;
const realTotalGlobal = varReal + gastoTotalFix;
const savingGlobal    = orcTotalGlobal - realTotalGlobal;
const savingGlobalPct = orcTotalGlobal > 0 ? savingGlobal / orcTotalGlobal * 100 : 0;
const mesLabel        = MESES_FIX_VG[mesAtual];

const IS    = {...iSty(T), width:"100%"};
const secHdr = {fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.text,marginBottom:12};
const secNum  = {fontSize:10,color:T.textSm,fontWeight:700,marginRight:8};

async function gerarPPTX() {
  setLoading(true); setStatus({msg:"Gerando...", cls:""});
  try {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";

    // ════════════════════════════════════════════════════════════════
    // SLIDE 1 — VISÃO GERAL ORÇAMENTÁRIA
    // ════════════════════════════════════════════════════════════════
    const sl1 = pptx.addSlide();
    sl1.background = {color:"FFFFFF"};

    // Elemento 1 — Barra verde no topo
    sl1.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.06,
      fill: { color: "166534" },
      line: { width: 0 }
    });

    // Elemento 2 — Título principal
    sl1.addText("Visão Geral Orçamentária", {
      x: 0.35, y: 0.12, w: 12.6, h: 0.5,
      fontSize: 28, bold: true,
      color: "111827",
      fontFace: "Segoe UI"
    });

    // Elemento 3 — Linha divisória horizontal
    sl1.addShape(pptx.ShapeType.line, {
      x: 0.35, y: 0.72, w: 12.63, h: 0,
      line: { color: "E5E7EB", width: 1 }
    });

    // Elemento 4 — 3 KPI Cards em linha
    const orcCampeonato = ORC_TOTAL_CAMPEONATO_VAR + computedFix.orcAnualTotal;
    const kpiCards = [
      {
        label: "ORÇAMENTO TOTAL DO CAMPEONATO",
        val: fmtBRL(orcCampeonato),
        valColor: "9CA3AF",
        bold: false
      },
      {
        label: "REALIZADO (ATUAL)",
        val: fmtBRL(realTotalGlobal),
        valColor: "111827",
        bold: false
      },
      {
        label: "SAVING / SALDO GLOBAL",
        val: (savingGlobal >= 0 ? "▲ " : "▼ ") + fmtBRL(Math.abs(savingGlobal)),
        valColor: savingGlobal >= 0 ? "16A34A" : "DC2626",
        bold: true,
        accentBorder: true
      },
    ];

    const kW = 4.14, kH = 1.1, kY = 0.85, kGap = 0.105;
    kpiCards.forEach(({ label, val, valColor, bold, accentBorder }, i) => {
      const x = 0.35 + i * (kW + kGap);
      sl1.addShape(pptx.ShapeType.rect, {
        x, y: kY, w: kW, h: kH,
        fill: { color: "F3F4F6" },
        line: { color: "E5E7EB", width: 0.75 }
      });
      if (accentBorder) {
        sl1.addShape(pptx.ShapeType.rect, {
          x, y: kY, w: 0.06, h: kH,
          fill: { color: "16A34A" },
          line: { width: 0 }
        });
      }
      sl1.addText(label, {
        x: x + 0.18, y: kY + 0.12, w: kW - 0.28, h: 0.2,
        fontSize: 7.5, bold: true, color: "6B7280",
        charSpacing: 1.5, fontFace: "Segoe UI"
      });
      sl1.addText(val, {
        x: x + 0.18, y: kY + 0.38, w: kW - 0.28, h: 0.58,
        fontSize: bold ? 26 : 22,
        bold,
        color: valColor,
        fontFace: "Segoe UI"
      });
    });

    // Elemento 5 — Título "Síntese dos Pilares"
    sl1.addText("Síntese dos Pilares", {
      x: 0.35, y: 2.1, w: 12.63, h: 0.26,
      fontSize: 12, color: "374151",
      align: "center", fontFace: "Segoe UI"
    });

    // Elemento 6 — Dois Pilares lado a lado
    const pY = 2.44, pH = 1.32;

    // Pilar Esquerdo — Dinâmica Operacional (Custos Variáveis)
    sl1.addShape(pptx.ShapeType.rect, {
      x: 0.35, y: pY, w: 5.9, h: pH,
      fill: { color: "FFFFFF" }, line: { color: "E5E7EB", width: 0.75 }
    });
    sl1.addText("Dinâmica Operacional (Custos Variáveis)", {
      x: 0.55, y: pY + 0.1, w: 5.5, h: 0.24,
      fontSize: 11, bold: true, color: "111827",
      align: "center", fontFace: "Segoe UI"
    });
    sl1.addText("Orçamento do Período: " + fmtBRL(varOrc), {
      x: 0.55, y: pY + 0.38, w: 5.5, h: 0.2,
      fontSize: 10, color: "6B7280", align: "center", fontFace: "Segoe UI"
    });
    sl1.addText("Realizado: " + fmtBRL(varReal), {
      x: 0.55, y: pY + 0.6, w: 5.5, h: 0.2,
      fontSize: 10, color: "6B7280", align: "center", fontFace: "Segoe UI"
    });
    sl1.addText("Saldo: " + fmtBRL(varSaving), {
      x: 0.55, y: pY + 0.84, w: 5.5, h: 0.26,
      fontSize: 12, bold: true,
      color: varSaving >= 0 ? "16A34A" : "DC2626",
      align: "center", fontFace: "Segoe UI"
    });

    // Linha divisória vertical central
    sl1.addShape(pptx.ShapeType.line, {
      x: 6.665, y: pY + 0.08, w: 0, h: pH - 0.16,
      line: { color: "E5E7EB", width: 1 }
    });

    // Pilar Direito — Estrutura Acumulada (Custos Fixos)
    sl1.addShape(pptx.ShapeType.rect, {
      x: 6.78, y: pY, w: 5.9, h: pH,
      fill: { color: "FFFFFF" }, line: { color: "E5E7EB", width: 0.75 }
    });
    sl1.addText("Estrutura Acumulada (Custos Fixos)", {
      x: 6.98, y: pY + 0.1, w: 5.5, h: 0.24,
      fontSize: 11, bold: true, color: "111827",
      align: "center", fontFace: "Segoe UI"
    });
    sl1.addText("Orçado até " + mesLabel + ": " + fmtBRL(orcTotalFix), {
      x: 6.98, y: pY + 0.38, w: 5.5, h: 0.2,
      fontSize: 10, color: "6B7280", align: "center", fontFace: "Segoe UI"
    });
    sl1.addText("Realizado até " + mesLabel + ": " + fmtBRL(gastoTotalFix), {
      x: 6.98, y: pY + 0.6, w: 5.5, h: 0.2,
      fontSize: 10, color: "6B7280", align: "center", fontFace: "Segoe UI"
    });
    sl1.addText("Saldo até " + mesLabel + ": " + fmtBRL(saldoFix), {
      x: 6.98, y: pY + 0.84, w: 5.5, h: 0.26,
      fontSize: 12, bold: true,
      color: saldoFix >= 0 ? "16A34A" : "DC2626",
      align: "center", fontFace: "Segoe UI"
    });

    // Elemento 7 — Tabela de Blocos
    const thS = (txt, align = "left") => ({
      text: txt,
      options: { bold: true, fontSize: 9, color: "FFFFFF", fill: { color: "111827" }, align }
    });

    const mkBlocoRow = (label, orc, real, sav, pct, rowIdx) => {
      const fill = { color: rowIdx % 2 === 0 ? "FFFFFF" : "F9FAFB" };
      const sc = sav >= 0 ? "16A34A" : "DC2626";
      const icon = sav >= 0 ? "▲ " : "▼ ";
      return [
        { text: label,                                   options: { fontSize: 9, color: "374151", fill } },
        { text: fmtBRL(orc),                             options: { fontSize: 9, color: "374151", fill, align: "right" } },
        { text: fmtBRL(real),                            options: { fontSize: 9, color: "374151", fill, align: "right" } },
        { text: icon + fmtBRL(Math.abs(sav)),            options: { fontSize: 9, bold: true, color: sc, fill, align: "right" } },
        { text: icon + Math.abs(pct).toFixed(1) + "%",   options: { fontSize: 9, bold: true, color: sc, fill, align: "right" } },
      ];
    };

    const savVarPct    = varOrc > 0 ? varSaving / varOrc * 100 : 0;
    const savFixPct    = orcTotalFix > 0 ? saldoFix / orcTotalFix * 100 : 0;
    const orcGlobal    = varOrc + orcTotalFix;
    const realGlobal   = varReal + gastoTotalFix;
    const savGlobal    = orcGlobal - realGlobal;
    const savGlobalPct = orcGlobal > 0 ? savGlobal / orcGlobal * 100 : 0;

    const fillTot = { color: "F3F4F6" };
    const scTot = savGlobal >= 0 ? "16A34A" : "DC2626";
    const iconTot = savGlobal >= 0 ? "▲ " : "▼ ";
    const tblTot1 = [
      { text: "TOTAL",                                            options: { fontSize: 9, bold: true, color: "111827", fill: fillTot } },
      { text: fmtBRL(orcGlobal),                                  options: { fontSize: 9, bold: true, color: "111827", fill: fillTot, align: "right" } },
      { text: fmtBRL(realGlobal),                                 options: { fontSize: 9, bold: true, color: "111827", fill: fillTot, align: "right" } },
      { text: iconTot + fmtBRL(Math.abs(savGlobal)),              options: { fontSize: 9, bold: true, color: scTot, fill: fillTot, align: "right" } },
      { text: iconTot + Math.abs(savGlobalPct).toFixed(1) + "%",  options: { fontSize: 9, bold: true, color: scTot, fill: fillTot, align: "right" } },
    ];

    sl1.addTable([
      [thS("BLOCO"), thS("ORÇADO (Período)", "right"), thS("REALIZADO", "right"), thS("SAVING / SALDO (R$)", "right"), thS("%", "right")],
      mkBlocoRow("1  Serviços Variáveis (R1–R" + rodadaAtual + ")", varOrc, varReal, varSaving, savVarPct, 0),
      mkBlocoRow("2  Custos Fixos (até " + mesLabel + ")",           orcTotalFix, gastoTotalFix, saldoFix, savFixPct, 1),
      tblTot1,
    ], {
      x: 0.35, y: 3.9, w: 12.63,
      colW: [4.6, 2.4, 2.4, 2.4, 0.83],
      border: { type: "solid", color: "E5E7EB", pt: 0.5 },
      rowH: 0.42,
    });

    // Elemento 8 — Rodapé
    sl1.addText("Acompanhamento Orçamentário – Brasileirão 2026", {
      x: 0.35, y: 7.28, w: 12.63, h: 0.16,
      fontSize: 7.5, color: "9CA3AF",
      align: "center", fontFace: "Segoe UI"
    });

    // ─── Gerar arquivo ───────────────────────────────────────────────────────
    await pptx.writeFile({fileName:`visao_geral_R${rodadaAtual}_${mesLabel.toLowerCase()}_brasileirao2026.pptx`});
    setStatus({msg:`✅ visao_geral_R${rodadaAtual}_${mesLabel.toLowerCase()}.pptx baixado!`, cls:"ok"});
  } catch(e) {
    setStatus({msg:"❌ Erro: "+e.message, cls:"err"});
    console.error(e);
  }
  setLoading(false);
}

return (
<div style={{paddingBottom:80}}>
  {/* ── Cabeçalho ─────────────────────────────────────────────────────────── */}
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <Button T={T} variant="secondary" size="md" icon={ArrowLeft} onClick={onBack}>Voltar</Button>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:40,height:40,borderRadius:12,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.28)",color:"#7c3aed",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <LayoutGrid size={18} strokeWidth={2.25}/>
        </div>
        <div>
          <h2 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Visão Geral Orçamentária</h2>
          <p style={{margin:"2px 0 0",fontSize:12,color:T.textMd}}>Slide único consolidado — variáveis + fixos</p>
        </div>
      </div>
    </div>
  </div>

  {/* ── Configuração ──────────────────────────────────────────────────────── */}
  <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}>
      <span style={secNum}>01</span><span style={secHdr}>Configuração Base</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <div>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Rodada Atual (Custos Variáveis) *</label>
        <select value={rodadaAtual} onChange={e=>setRodadaAtual(parseInt(e.target.value))} style={{...IS}}>
          {rodadasDisp.length === 0
            ? <option value={1}>—</option>
            : rodadasDisp.map(r => <option key={r} value={r}>Rodada {r}</option>)}
        </select>
      </div>
      <div>
        <label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Mês de Referência (Custos Fixos) *</label>
        <select value={mesAtual} onChange={e=>setMesAtual(parseInt(e.target.value))} style={{...IS}}>
          {MESES_FIX_VG.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>
    </div>
  </div>

  {/* ── Preview do slide consolidado ──────────────────────────────────────── */}
  <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}>
      <span style={secNum}>02</span><span style={secHdr}>Preview dos Dados</span>
    </div>

    <p style={{fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>KPIs Globais</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
      {[
        {label:"Orçamento Total do Campeonato", val:fmtR(ORC_TOTAL_CAMPEONATO_VAR+orcAnualTotal), color:T.textMd},
        {label:"Realizado (Atual)",             val:fmtR(realTotalGlobal),                        color:T.text},
        {label:"Saving / Saldo Global",         val:(savingGlobal>=0?"▲ ":"▼ ")+fmtR(Math.abs(savingGlobal)), color:savingGlobal>=0?"#16a34a":"#dc2626"},
      ].map(m=>(
        <div key={m.label} style={{background:T.bg,borderRadius:8,padding:"12px 16px",border:`1px solid ${T.border}`}}>
          <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{m.label}</p>
          <p style={{fontSize:18,fontWeight:700,color:m.color,margin:0}}>{m.val}</p>
        </div>
      ))}
    </div>

    <p style={{fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Dinâmica Operacional (Variáveis até R{rodadaAtual})</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
      {[
        {label:"Orçamento do Período", val:fmtR(varOrc),   color:T.text},
        {label:"Realizado",            val:fmtR(varReal),  color:T.text},
        {label:"Saldo",                val:(varSaving>=0?"▲ ":"▼ ")+fmtR(Math.abs(varSaving)), color:varSaving>=0?"#16a34a":"#dc2626"},
      ].map(m=>(
        <div key={m.label} style={{background:T.bg,borderRadius:8,padding:"10px 14px",border:`1px solid ${T.border}`}}>
          <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{m.label}</p>
          <p style={{fontSize:15,fontWeight:700,color:m.color,margin:0}}>{m.val}</p>
        </div>
      ))}
    </div>

    <p style={{fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Estrutura Acumulada (Fixos até {mesLabel})</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      {[
        {label:`Orçado até ${mesLabel}`,    val:fmtR(orcTotalFix),   color:T.text},
        {label:`Realizado até ${mesLabel}`, val:fmtR(gastoTotalFix), color:T.text},
        {label:`Saldo até ${mesLabel}`,     val:(saldoFix>=0?"▲ ":"▼ ")+fmtR(Math.abs(saldoFix)), color:saldoFix>=0?"#16a34a":"#dc2626"},
      ].map(m=>(
        <div key={m.label} style={{background:T.bg,borderRadius:8,padding:"10px 14px",border:`1px solid ${T.border}`}}>
          <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{m.label}</p>
          <p style={{fontSize:15,fontWeight:700,color:m.color,margin:0}}>{m.val}</p>
        </div>
      ))}
    </div>
  </div>

  {/* ── Rodapé fixo ───────────────────────────────────────────────────────── */}
  <div style={{position:"sticky",bottom:0,background:T.surface||T.card,borderTop:`1px solid ${T.border}`,padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:50,boxShadow:"0 -8px 24px -8px rgba(0,0,0,0.3)"}}>
    <div>
      <p style={{fontSize:12,color:T.textMd,marginBottom:2}}><b style={{color:T.text,fontWeight:700}}>Gerar slide consolidado?</b> Exporta um PPTX com a Visão Geral.</p>
      <p style={{fontSize:11,color:status.cls==="ok"?"#16a34a":status.cls==="err"?"#dc2626":T.textSm,fontWeight:600}}>{status.msg}</p>
    </div>
    <Button T={T} variant="primary" size="lg" icon={FileDown} onClick={gerarPPTX} disabled={loading}>
      {loading ? "Gerando..." : "Gerar PPTX"}
    </Button>
  </div>
</div>
);
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────
export default function TabApresentacoes({T, jogos = [], servicos = [], notasMensais = []}) {
const [tipo, setTipo] = useState(null);
if (!tipo)               return <SeletorTipo T={T} onSelect={setTipo}/>;
if (tipo==="variaveis")  return <FormVariaveis T={T} onBack={()=>setTipo(null)} jogos={jogos}/>;
if (tipo==="visaogeral") return <FormVisaoGeral T={T} onBack={()=>setTipo(null)} jogos={jogos} servicos={servicos} notasMensais={notasMensais}/>;
}
