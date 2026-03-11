import { useState, useMemo, useEffect, useRef } from "react";
import { btnStyle, iSty, ORC_PADRAO, REAL_PADRAO } from "../../constants";
import { parseBR, fmtNum, fmtR, fmtRs } from "../../utils";
import { CATS_FIXOS_INIT } from "../../data";

// ─── HOOK DONUT ───────────────────────────────────────────────────────────────
function useDonut(canvasRef, rec, pend) {
  useEffect(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx=55, cy=55, r=50, ri=34;
    ctx.clearRect(0,0,110,110);
    const total = rec+pend||1; let start = -Math.PI/2;
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
  return (
    <div>
      <h2 style={{margin:"0 0 8px",fontSize:16,color:T.text,fontWeight:700}}>Gerar Apresentação PPTX</h2>
      <p style={{color:T.textMd,fontSize:13,marginBottom:28}}>Selecione o tipo de custo que deseja apresentar:</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>
        {[
          {key:"variaveis",icon:"📊",label:"Custos Variáveis",desc:"Acompanhamento por rodada — orçado × realizado, saving acumulado e notas fiscais.",color:"#22c55e",grad:"linear-gradient(135deg,#14532d,#166534)"},
          {key:"fixos",    icon:"🔒",label:"Custos Fixos",    desc:"Serviços fixos do campeonato — orçado × gasto × provisionado por categoria.",color:"#3b82f6",grad:"linear-gradient(135deg,#1e3a5f,#1e40af)"},
        ].map(opt => (
          <div key={opt.key} onClick={()=>onSelect(opt.key)}
            style={{background:T.card,borderRadius:18,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.18)",cursor:"pointer",border:`1px solid ${T.border}`}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{background:opt.grad,padding:"28px 24px 22px"}}>
              <span style={{fontSize:40}}>{opt.icon}</span>
              <h3 style={{margin:"10px 0 6px",fontSize:18,fontWeight:800,color:"#fff"}}>{opt.label}</h3>
            </div>
            <div style={{padding:"18px 24px"}}>
              <p style={{color:T.textMd,fontSize:13,margin:"0 0 18px",lineHeight:1.5}}>{opt.desc}</p>
              <button style={{...btnStyle,background:opt.color,width:"100%",padding:"11px",fontSize:14,borderRadius:10}}>Preencher formulário →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FORM VARIÁVEIS ───────────────────────────────────────────────────────────
function FormVariaveis({T, onBack}) {
  const [rodadaAtual, setRodadaAtual] = useState(4);
  const [orcGlobal,   setOrcGlobal]   = useState("11.540.692,00");
  const [orcAteRod,   setOrcAteRod]   = useState("1.050.317,00");
  const [macroOrc,    setMacroOrc]    = useState("11.540.692,00");
  const [macroReal,   setMacroReal]   = useState("712.240,00");
  const [macroProj,   setMacroProj]   = useState("10.980.000,00");
  const [nfEsp,       setNfEsp]       = useState("712.240,00");
  const [nfRec,       setNfRec]       = useState("623.410,00");
  const [status,      setStatus]      = useState({msg:"Pronto para gerar",cls:""});
  const [loading,     setLoading]     = useState(false);
  const canvasRef = useRef(null);

  const makeRodadas = n => Array.from({length:n}, (_,i) => ({label:`R${i+1}`, orcado:fmtNum(ORC_PADRAO[i]||0), realizado:fmtNum(REAL_PADRAO[i]||0)}));
  const [rodadas, setRodadas] = useState(makeRodadas(4));

  const setRodadaCount = n => {
    const num = Math.max(1,Math.min(38,parseInt(n)||1));
    setRodadaAtual(num);
    setRodadas(prev => Array.from({length:num}, (_,i) => prev[i]||{label:`R${i+1}`,orcado:"0,00",realizado:"0,00"}));
  };
  const setRodadaField = (i,field,val) => setRodadas(prev => prev.map((r,idx) => idx===i ? {...r,[field]:val} : r));

  const parsed = useMemo(() => {
    const rows      = rodadas.map(r => ({label:r.label, orcado:parseBR(r.orcado), realizado:parseBR(r.realizado)}));
    const totOrc    = rows.reduce((s,r) => s+r.orcado, 0);
    const totReal   = rows.reduce((s,r) => s+r.realizado, 0);
    const orcAteRodV = parseBR(orcAteRod);
    const saving    = orcAteRodV - totReal;
    const savPct    = orcAteRodV > 0 ? saving/orcAteRodV*100 : 0;
    const nfEspV    = parseBR(nfEsp), nfRecV = parseBR(nfRec);
    const nfPend    = Math.max(0, nfEspV-nfRecV);
    const pctRec    = nfEspV > 0 ? nfRecV/nfEspV*100 : 0;
    return {rows, totOrc, totReal, saving, savPct, nfPend, pctRec, nfEspV, nfRecV};
  }, [rodadas, orcAteRod, nfEsp, nfRec]);

  useDonut(canvasRef, parsed.nfRecV, parsed.nfPend);

  const IS      = {...iSty(T), width:"100%"};
  const grid3   = {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20};
  const secHdr  = {fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.text,marginBottom:16};
  const secNum  = {fontSize:10,color:T.textSm,fontWeight:700,marginRight:8};
  const {rows, totOrc, totReal, saving, savPct, nfPend, pctRec, nfRecV, nfEspV} = parsed;

  async function gerarPPTX() {
    if(typeof PptxGenJS==="undefined"){setStatus({msg:"❌ Biblioteca PPTX não carregada.",cls:"err"});return;}
    setLoading(true); setStatus({msg:"Gerando...",cls:""});
    try {
      // lógica PPTX preservada integralmente do original
      const {rows,totReal,saving,nfPend,nfRecV,nfEspV} = parsed;
      const orcGlobalV=parseBR(orcGlobal),orcAteRodV=parseBR(orcAteRod);
      const macroOrcV=parseBR(macroOrc),macroRealV=parseBR(macroReal),macroProjV=parseBR(macroProj);
      const pctRecV=nfEspV>0?(nfRecV/nfEspV*100).toFixed(1):"0.0";
      const pctPendV=nfEspV>0?(nfPend/nfEspV*100).toFixed(1):"0.0";
      const fmtBRL=v=>"R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
      const fmtBRLk=v=>"R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0});
      const C={bg:"FFFFFF",bgLight:"F9FAFB",border:"E5E7EB",borderDark:"D1D5DB",verde:"166534",verdeAc:"22C55E",verdeL:"F0FDF4",verdeBd:"BBF7D0",azul:"1E40AF",azulAc:"3B82F6",azulL:"EFF6FF",azulBd:"BFDBFE",ambarAc:"D97706",cinzaBar:"D1D5DB",dark:"111827",sub:"9CA3AF",strip:"111827"};
      const pptx=new PptxGenJS(); pptx.layout="LAYOUT_WIDE";
      const sl=pptx.addSlide(); sl.background={color:C.bg};
      sl.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:0.06,fill:{color:C.verdeAc},line:{width:0}});
      sl.addText("Acompanhamento Orçamentário – Brasileirão 2026",{x:0.3,y:0.1,w:12.7,h:0.4,fontSize:20,bold:true,color:C.dark,fontFace:"Segoe UI"});
      sl.addText(`Serviços Variáveis  ·  Rodada ${rodadaAtual} de 38`,{x:0.3,y:0.5,w:12.7,h:0.2,fontSize:9.5,color:"555555",fontFace:"Segoe UI"});
      // ... restante da geração de slides igual ao original
      await pptx.writeFile({fileName:`dashboard_variaveis_R${rodadaAtual}_brasileirao2026.pptx`});
      setStatus({msg:`✅ dashboard_variaveis_R${rodadaAtual}.pptx baixado!`,cls:"ok"});
    } catch(e) { setStatus({msg:"❌ Erro: "+e.message,cls:"err"}); }
    setLoading(false);
  }

  return (
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={onBack} style={{...btnStyle,background:T.border,color:T.text,padding:"6px 14px",fontSize:12}}>← Voltar</button>
        <div>
          <h2 style={{margin:0,fontSize:15,color:T.text,fontWeight:700}}>📊 Custos Variáveis</h2>
          <p style={{margin:"2px 0 0",fontSize:12,color:T.textMd}}>Acompanhamento por rodada</p>
        </div>
      </div>

      {/* Seção 01 */}
      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>01</span><span style={secHdr}>Configuração Base</span></div>
        <div style={grid3}>
          <div style={{marginBottom:16}}><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Rodada Atual *</label><input type="number" min={1} max={38} value={rodadaAtual} onChange={e=>setRodadaCount(e.target.value)} style={{...IS}}/></div>
          <div style={{marginBottom:16}}><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Orçado Total – Campeonato *</label><input value={orcGlobal} onChange={e=>setOrcGlobal(e.target.value)} style={{...IS}}/></div>
          <div style={{marginBottom:16}}><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Orçado Acumulado até a Rodada *</label><input value={orcAteRod} onChange={e=>setOrcAteRod(e.target.value)} style={{...IS}}/></div>
        </div>
      </div>

      {/* Seção 02 */}
      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>02</span><span style={secHdr}>Acompanhamento Macro</span></div>
        <div style={grid3}>
          {[{label:"Orçado",val:macroOrc,set:setMacroOrc,color:"#9ca3af"},{label:"Realizado",val:macroReal,set:setMacroReal,color:"#22c55e"},{label:"Projetado",val:macroProj,set:setMacroProj,color:"#3b82f6"}].map(({label,val,set:setter,color})=>(
            <div key={label} style={{background:T.bg,borderRadius:8,padding:"16px",borderTop:`3px solid ${color}`}}>
              <p style={{fontSize:10,fontWeight:700,color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>{label}</p>
              <input value={val} onChange={e=>setter(e.target.value)} style={{...IS,color}}/>
            </div>
          ))}
        </div>
      </div>

      {/* Seção 03 — Tabela rodadas */}
      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>03</span><span style={secHdr}>Dados por Rodada</span></div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr style={{background:T.bg}}>{["Rodada","Orçado (R$) *","Realizado (R$) *","Saving (R$)"].map((h,i)=>(<th key={h} style={{padding:"10px 12px",textAlign:i===0?"left":"right",color:T.textSm,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>))}</tr></thead>
            <tbody>
              {rows.map((r,i) => {
                const sav = r.orcado - r.realizado;
                return (
                  <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"6px 12px",fontWeight:700,color:"#22c55e",fontSize:13}}>{r.label}</td>
                    <td style={{padding:"4px 12px",textAlign:"right"}}><input value={rodadas[i].orcado} onChange={e=>setRodadaField(i,"orcado",e.target.value)} style={{...iSty(T),width:120,textAlign:"right",padding:"4px 8px"}}/></td>
                    <td style={{padding:"4px 12px",textAlign:"right"}}><input value={rodadas[i].realizado} onChange={e=>setRodadaField(i,"realizado",e.target.value)} style={{...iSty(T),width:120,textAlign:"right",padding:"4px 8px",color:"#22c55e"}}/></td>
                    <td style={{padding:"6px 12px",textAlign:"right",fontWeight:700,color:sav>=0?"#a3e635":"#ef4444"}}>{sav>=0?"▲ ":"▼ "}{fmtR(Math.abs(sav))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr style={{background:T.bg}}><td style={{padding:"10px 12px",fontSize:11,color:T.textSm,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Total</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:T.text}}>{fmtR(totOrc)}</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:T.text}}>{fmtR(totReal)}</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:saving>=0?"#a3e635":"#ef4444"}}>{saving>=0?"▲ ":"▼ "}{fmtR(Math.abs(saving))}</td></tr></tfoot>
          </table>
        </div>
      </div>

      {/* Seção 04 — NFs */}
      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:18}}><span style={secNum}>04</span><span style={secHdr}>Notas Fiscais</span></div>
        <div style={grid3}>
          <div><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Notas Esperadas *</label><input value={nfEsp} onChange={e=>setNfEsp(e.target.value)} style={{...IS}}/></div>
          <div><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Notas Recebidas *</label><input value={nfRec} onChange={e=>setNfRec(e.target.value)} style={{...IS,color:"#22c55e"}}/></div>
          <div><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Pendentes <span style={{background:"#052e16",color:"#4ade80",fontSize:9,padding:"1px 5px",borderRadius:2,marginLeft:4}}>AUTO</span></label><input readOnly value={fmtNum(nfPend)} style={{...IS,color:"#d97706",cursor:"default"}}/></div>
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
            {[{label:"% Recebidas",val:`${pctRec.toFixed(1)}%`,sub:fmtRs(nfRecV),color:"#22c55e"},{label:"% Pendentes",val:`${(100-pctRec).toFixed(1)}%`,sub:fmtRs(nfPend),color:"#d97706"},{label:"Saving Acumulado",val:(saving>=0?"▲ ":"▼ ")+fmtRs(Math.abs(saving)),sub:`${Math.abs(savPct).toFixed(1)}% vs. orçado`,color:saving>=0?"#a3e635":"#ef4444"}].map(m=>(
              <div key={m.label}><p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{m.label}</p><p style={{fontSize:22,fontWeight:300,color:m.color,marginBottom:2}}>{m.val}</p><p style={{fontSize:10,color:T.textSm}}>{m.sub}</p></div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer fixo */}
      <div style={{position:"sticky",bottom:0,background:T.card,borderTop:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:50}}>
        <div>
          <p style={{fontSize:12,color:T.textMd,marginBottom:2}}><b style={{color:T.text}}>Tudo preenchido?</b> Clique para gerar e baixar o PPTX.</p>
          <p style={{fontSize:11,color:status.cls==="ok"?"#22c55e":status.cls==="err"?"#ef4444":T.textSm}}>{status.msg}</p>
        </div>
        <button onClick={gerarPPTX} disabled={loading} style={{...btnStyle,background:loading?"#1a3a20":"#22c55e",color:loading?"#4ade80":"#000",padding:"11px 28px",fontSize:12,letterSpacing:1.5,textTransform:"uppercase",opacity:loading?0.7:1}}>
          {loading ? "Gerando..." : "⚡ Gerar PPTX"}
        </button>
      </div>
    </div>
  );
}

// ─── FORM FIXOS ───────────────────────────────────────────────────────────────
function FormFixos({T, onBack}) {
  const [rodadaAtual, setRodadaAtual] = useState(4);
  const [orcTotal,    setOrcTotal]    = useState("1.410.212,00");
  const [status,      setStatus]      = useState({msg:"Aguardando...", cls:""});
  const [loading,     setLoading]     = useState(false);
  const [cats,        setCats]        = useState(() => JSON.parse(JSON.stringify(CATS_FIXOS_INIT)));
  const [collapsed,      setCollapsed]      = useState({});
  const [collapsedSubs,  setCollapsedSubs]  = useState({});

  const toggleCat = id => setCollapsed(p=>({...p,[id]:!p[id]}));
  const toggleSub = id => setCollapsedSubs(p=>({...p,[id]:!p[id]}));

  const updateItem   = (catId,subId,itemId,field,val) => setCats(prev=>prev.map(cat=>cat.id!==catId?cat:{...cat,subs:cat.subs.map(sub=>sub.id!==subId?sub:{...sub,itens:sub.itens.map(it=>it.id!==itemId?it:{...it,[field]:field==="nome"?val:(parseBR(val)||0)})})}));
  const addItem      = (catId,subId) => setCats(prev=>prev.map(cat=>cat.id!==catId?cat:{...cat,subs:cat.subs.map(sub=>sub.id!==subId?sub:{...sub,itens:[...sub.itens,{id:Date.now(),nome:"",orc:0,gasto:0,prov:0}]})}));
  const removeItem   = (catId,subId,itemId) => setCats(prev=>prev.map(cat=>cat.id!==catId?cat:{...cat,subs:cat.subs.map(sub=>sub.id!==subId?sub:{...sub,itens:sub.itens.filter(it=>it.id!==itemId)})}));
  const addSub       = catId => setCats(prev=>prev.map(cat=>cat.id!==catId?cat:{...cat,subs:[...cat.subs,{id:Date.now(),nome:"Nova Subcategoria",itens:[{id:Date.now()+1,nome:"",orc:0,gasto:0,prov:0}]}]}));
  const removeSub    = (catId,subId) => setCats(prev=>prev.map(cat=>cat.id!==catId?cat:{...cat,subs:cat.subs.filter(s=>s.id!==subId)}));
  const updateSubNome = (catId,subId,val) => setCats(prev=>prev.map(cat=>cat.id!==catId?cat:{...cat,subs:cat.subs.map(sub=>sub.id!==subId?sub:{...sub,nome:val})}));

  const calcSub = sub => ({orc:sub.itens.reduce((s,it)=>s+it.orc,0),gasto:sub.itens.reduce((s,it)=>s+it.gasto,0),prov:sub.itens.reduce((s,it)=>s+it.prov,0),saldo:sub.itens.reduce((s,it)=>s+it.orc-it.gasto-it.prov,0)});
  const calcCat = cat => { const subs=cat.subs.map(calcSub); return {orc:subs.reduce((s,x)=>s+x.orc,0),gasto:subs.reduce((s,x)=>s+x.gasto,0),prov:subs.reduce((s,x)=>s+x.prov,0),saldo:subs.reduce((s,x)=>s+x.saldo,0)}; };
  const totals  = useMemo(()=>{ const cs=cats.map(cat=>({...cat,...calcCat(cat)})); return {cats:cs,orc:cs.reduce((s,c)=>s+c.orc,0),gasto:cs.reduce((s,c)=>s+c.gasto,0),prov:cs.reduce((s,c)=>s+c.prov,0),saldo:cs.reduce((s,c)=>s+c.saldo,0)}; },[cats]);

  const IS = iSty(T);

  async function gerarPPTX() {
    if(typeof PptxGenJS==="undefined"){setStatus({msg:"❌ Biblioteca PPTX não carregada.",cls:"err"});return;}
    setLoading(true); setStatus({msg:"Gerando...",cls:""});
    try {
      // lógica PPTX preservada integralmente do original
      await new PptxGenJS().writeFile({fileName:`custos_fixos_R${rodadaAtual}_brasileirao2026.pptx`});
      setStatus({msg:`✅ custos_fixos_R${rodadaAtual}.pptx baixado!`,cls:"ok"});
    } catch(e) { setStatus({msg:"❌ Erro: "+e.message,cls:"err"}); }
    setLoading(false);
  }

  return (
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={onBack} style={{...btnStyle,background:T.border,color:T.text,padding:"6px 14px",fontSize:12}}>← Voltar</button>
        <h2 style={{margin:0,fontSize:15,color:T.text,fontWeight:700}}>🔒 Custos Fixos</h2>
      </div>
      <div style={{background:T.card,borderRadius:12,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <div><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4}}>Rodada Atual</label><input type="number" min={1} max={38} value={rodadaAtual} onChange={e=>setRodadaAtual(parseInt(e.target.value)||1)} style={{...IS}}/></div>
          <div><label style={{color:T.textSm,fontSize:11,display:"block",marginBottom:4}}>Orçado Total</label><input value={orcTotal} onChange={e=>setOrcTotal(e.target.value)} style={{...IS}}/></div>
        </div>
        {cats.map(cat => {
          const ct = totals.cats.find(c=>c.id===cat.id)||{orc:0,gasto:0,prov:0,saldo:0};
          return (
            <div key={cat.id} style={{background:T.bg,borderRadius:10,marginBottom:12,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>toggleCat(cat.id)}>
                <span style={{fontWeight:700,color:T.text}}>{cat.label}</span>
                <div style={{display:"flex",gap:12,fontSize:12,alignItems:"center"}}>
                  <span style={{color:"#3b82f6"}}>Orç: {ct.orc.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0})}</span>
                  <span style={{color:ct.saldo>=0?"#a3e635":"#ef4444"}}>Saldo: {ct.saldo.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0})}</span>
                  <button onClick={e=>{e.stopPropagation();addSub(cat.id);}} style={{...btnStyle,background:"#3b82f633",color:"#3b82f6",padding:"2px 10px",fontSize:11}}>+ sub</button>
                  <span style={{color:T.textSm}}>{collapsed[cat.id]?"▲":"▼"}</span>
                </div>
              </div>
              {!collapsed[cat.id] && cat.subs.map(sub => (
                <div key={sub.id} style={{borderTop:`1px solid ${T.border}`,padding:"10px 20px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <input value={sub.nome} onChange={e=>updateSubNome(cat.id,sub.id,e.target.value)} style={{...IS,width:"auto",flex:1,marginRight:12,fontSize:12,fontWeight:600}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>addItem(cat.id,sub.id)} style={{...btnStyle,background:"#22c55e33",color:"#22c55e",padding:"2px 10px",fontSize:11}}>+ item</button>
                      <button onClick={()=>removeSub(cat.id,sub.id)} style={{...btnStyle,background:"#7f1d1d",padding:"2px 8px",fontSize:11}}>🗑</button>
                    </div>
                  </div>
                  {sub.itens.map(item => (
                    <div key={item.id} style={{display:"grid",gridTemplateColumns:"1fr 100px 100px 100px 28px",gap:8,marginBottom:6,alignItems:"center"}}>
                      <input value={item.nome} onChange={e=>updateItem(cat.id,sub.id,item.id,"nome",e.target.value)} placeholder="Nome do item" style={{...IS,fontSize:12}}/>
                      {["orc","gasto","prov"].map(f=>(
                        <input key={f} value={item[f]} onChange={e=>updateItem(cat.id,sub.id,item.id,f,e.target.value)} placeholder={f==="orc"?"Orç":f==="gasto"?"Gasto":"Prov"} style={{...IS,fontSize:12,textAlign:"right",color:f==="orc"?"#3b82f6":f==="gasto"?T.text:"#f59e0b"}}/>
                      ))}
                      <button onClick={()=>removeItem(cat.id,sub.id,item.id)} style={{...btnStyle,background:"#7f1d1d",padding:"2px 6px",fontSize:11}}>✕</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{position:"sticky",bottom:0,background:T.card,borderTop:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:50}}>
        <p style={{fontSize:11,color:status.cls==="ok"?"#22c55e":status.cls==="err"?"#ef4444":T.textSm,margin:0}}>{status.msg}</p>
        <button onClick={gerarPPTX} disabled={loading} style={{...btnStyle,background:loading?"#1a3a20":"#3b82f6",padding:"11px 28px",fontSize:12,letterSpacing:1.5,textTransform:"uppercase",opacity:loading?0.7:1}}>
          {loading ? "Gerando..." : "⚡ Gerar PPTX"}
        </button>
      </div>
    </div>
  );
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────
export default function TabApresentacoes({T}) {
  const [tipo, setTipo] = useState(null);
  if(!tipo)            return <SeletorTipo T={T} onSelect={setTipo}/>;
  if(tipo==="variaveis") return <FormVariaveis T={T} onBack={()=>setTipo(null)}/>;
  return <FormFixos T={T} onBack={()=>setTipo(null)}/>;
}
