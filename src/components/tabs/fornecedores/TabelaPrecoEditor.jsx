import { useState, useMemo, useEffect } from "react";
import { iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { Button, Badge } from "../../ui";
import {
  statusNegociacaoInfo, setCelula, getCelula,
  contarCelulasPreenchidas, unidadeLabel,
  gerarTokenTabela, revogarTokenTabela, statusTokenTabela,
  adicionarRodada, getRodadaAtual, deltaCelula, calcularDeltaRodadas,
  setCelulaRodada, CATEGORIAS_ITEM,
} from "../../../data/catalogos";
import {
  Save, Send, CheckCircle2, Archive, RotateCcw, AlertCircle,
  Link2, Copy, Check, Ban, RefreshCw, TrendingDown, TrendingUp,
  ChevronRight, MapPin, Camera, Users, Trash2, Plus, ChevronDown,
} from "lucide-react";

const CAT_META = {
  periferico: { label:"Periféricos", color:"#3b82f6", icon:Camera },
  equipe:     { label:"Equipe Operacional", color:"#f59e0b", icon:Users },
};

const cellSty = (T, preenchido, delta) => {
  let bg = preenchido ? (T.brandSoft||"rgba(16,185,129,0.08)") : "transparent";
  let border = T.border;
  if (delta !== null && delta !== undefined) {
    if (delta > 0) { bg="rgba(16,185,129,0.12)"; border=T.brand||"#10b981"; }
    if (delta < 0) { bg="rgba(239,68,68,0.10)";  border=T.danger||"#ef4444"; }
  }
  return {
    background:bg, border:`1px solid ${border}`, borderRadius:RADIUS.sm,
    color:T.text, padding:"6px 8px", fontSize:12, fontWeight:preenchido?700:400,
    width:"100%", textAlign:"right", boxSizing:"border-box",
    fontFamily:"'JetBrains Mono',ui-monospace,monospace", outline:"none",
    minWidth:72,
  };
};

export default function TabelaPrecoEditor({
  tabela: negInicial, fornecedor, itensMaster=[], cidades, onSave, onRemove, T,
}) {
  const [neg, setNeg]             = useState(negInicial);
  const [dirty, setDirty]         = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [rodadaViz, setRodadaViz] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [novaCatCod, setNovaCatCod] = useState("");

  useEffect(()=>{ setNeg(negInicial); setDirty(false); setRodadaViz(null); },[negInicial?.id]);

  const rodadas      = neg?.rodadas || [];
  const rodadaAtual  = getRodadaAtual(neg);
  const rodadaExibida = rodadaViz !== null
    ? (rodadas.find(r=>r.numero===rodadaViz)||rodadaAtual)
    : rodadaAtual;
  const isUltimaRodada = !rodadaViz || rodadaViz===rodadaAtual?.numero;
  const verComparativo = rodadas.length > 1 && isUltimaRodada;
  const readOnly = !isUltimaRodada || neg.status==="arquivada";

  const categorias  = neg.categorias?.length ? neg.categorias : [{codigo:"B1",nome:"B1"},{codigo:"B2",nome:"B2"},{codigo:"B3",nome:"B3"}];
  const cidadesDaTabela = useMemo(()=>
    (neg.cidadeIds||[]).map(id=>cidades.find(c=>c.id===id)).filter(Boolean),
  [neg.cidadeIds, cidades]);

  const itensPorCat = useMemo(()=>{
    const map = { periferico:[], equipe:[] };
    itensMaster.forEach(it=>{ const k=it.categoria||"equipe"; (map[k]??(map[k]=[])).push(it); });
    return map;
  },[itensMaster]);

  const totalCelulas = itensMaster.length * cidadesDaTabela.length * categorias.length;
  const preenchidas  = contarCelulasPreenchidas({valores: rodadaExibida?.valores||{}});
  const pct = totalCelulas ? Math.round((preenchidas/totalCelulas)*100) : 0;
  const deltaGeral   = calcularDeltaRodadas(neg);
  const status       = statusNegociacaoInfo(neg.status);

  // ── Link público ─────────────────────────────────────────────────────────
  const tokenStatus = statusTokenTabela(neg);
  const linkPublico = neg.token ? `${window.location.origin}${window.location.pathname}#tabela/${neg.token}` : null;
  const gerarLink   = ()=>{ const n=gerarTokenTabela(neg); setNeg(n); onSave(n); setDirty(false); };
  const revogarLink = ()=>{ if(!confirm("Revogar link?"))return; const n=revogarTokenTabela(neg); setNeg(n); onSave(n); };
  const copiarLink  = ()=>{ navigator.clipboard?.writeText(linkPublico||""); setLinkCopiado(true); setTimeout(()=>setLinkCopiado(false),2000); };

  // ── Edição ────────────────────────────────────────────────────────────────
  const updateCelula = (itemId, cidadeId, cat, raw) => {
    if (readOnly) return;
    const v = raw===""?null:parseFloat(raw);
    setNeg(n=>setCelulaRodada(n,itemId,cidadeId,cat,v));
    setDirty(true);
  };

  const salvar = (statusNovo) => {
    const next = {...neg, status:statusNovo||neg.status, atualizadoEm:new Date().toISOString()};
    onSave(next); setDirty(false); setNeg(next);
  };

  const novaRodada = (propostaPor="livemode") => {
    const n=adicionarRodada(neg,propostaPor); setNeg(n); setRodadaViz(null); setDirty(true);
  };

  const updateObs = obs => {
    const rs=[...neg.rodadas]; rs[rs.length-1]={...rs[rs.length-1],observacoes:obs};
    setNeg(n=>({...n,rodadas:rs})); setDirty(true);
  };

  // ── Config helpers ────────────────────────────────────────────────────────
  const toggleCidade = id => {
    const ids = neg.cidadeIds||[];
    setNeg(n=>({...n,cidadeIds:ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]}));
    setDirty(true);
  };
  const addCategoria = () => {
    const cod=novaCatCod.trim().toUpperCase();
    if(!cod||categorias.some(c=>c.codigo===cod))return;
    setNeg(n=>({...n,categorias:[...categorias,{codigo:cod,nome:cod}]}));
    setNovaCatCod(""); setDirty(true);
  };
  const removeCat = i => {
    setNeg(n=>({...n,categorias:categorias.filter((_,idx)=>idx!==i)})); setDirty(true);
  };

  const IS = iSty(T);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <Badge T={T} color={status.color} size="md">{status.label}</Badge>
              {deltaGeral!==null&&(
                <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:RADIUS.pill,fontSize:10,fontWeight:800,
                  background:deltaGeral>0?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.10)",
                  color:deltaGeral>0?(T.brand||"#10b981"):(T.danger||"#ef4444")}}>
                  {deltaGeral>0?<TrendingDown size={10}/>:<TrendingUp size={10}/>}
                  {deltaGeral>0?"-":"+"}{Math.abs(deltaGeral).toFixed(1)}% vs R1
                </span>
              )}
              <span style={{fontSize:10,color:T.textSm,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>
                {rodadas.length} rodada{rodadas.length!==1?"s":""}
              </span>
            </div>
            <h2 style={{margin:"0 0 2px",fontSize:18,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>
              {fornecedor?.apelido||"Fornecedor"}
            </h2>
            <p style={{margin:0,fontSize:12,color:T.textMd}}>
              {cidadesDaTabela.length} cidade{cidadesDaTabela.length!==1?"s":""} · {categorias.length} categoria{categorias.length!==1?"s":""} · {itensMaster.length} serviços ·{" "}
              <span style={{fontWeight:700,color:pct===100?(T.brand||"#10b981"):T.text}}>{preenchidas}/{totalCelulas} ({pct}%)</span>
            </p>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {dirty&&(
              <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",color:T.warning||"#f59e0b",borderRadius:RADIUS.pill,fontSize:10,fontWeight:700}}>
                <AlertCircle size={11}/> Não salvo
              </span>
            )}
          </div>
        </div>

        {/* Round history */}
        {rodadas.length>0&&(
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:6,overflowX:"auto"}}>
            <span style={{fontSize:10,fontWeight:700,color:T.textSm,textTransform:"uppercase",letterSpacing:"0.04em",flexShrink:0}}>Rodadas:</span>
            {rodadas.map((r,idx)=>{
              const isAtual=r.numero===rodadaAtual?.numero;
              const isViz=rodadaViz===r.numero||(!rodadaViz&&isAtual);
              const prevR=idx>0?rodadas[idx-1]:null;
              const deltaR=prevR?(()=>{
                const cells=v=>Object.values(v||{}).flatMap(i=>Object.values(i||{}).flatMap(c=>Object.values(c||{}))).filter(x=>x>0);
                const cp=cells(prevR.valores),cc=cells(r.valores);
                if(!cp.length||!cc.length)return null;
                const med=a=>a.reduce((x,y)=>x+y,0)/a.length;
                const p=med(cp); return p?((p-med(cc))/p)*100:null;
              })():null;
              return (
                <button key={r.numero} onClick={()=>setRodadaViz(isViz?null:r.numero)} style={{
                  display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",
                  borderRadius:RADIUS.pill,border:`1px solid ${isViz?(T.brand||"#10b981"):T.border}`,
                  background:isViz?(T.brandSoft||"rgba(16,185,129,0.12)"):"transparent",
                  color:isViz?(T.brand||"#10b981"):T.textMd,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,
                }}>
                  R{r.numero}
                  <span style={{fontSize:9,color:isViz?(T.brand||"#10b981"):T.textSm}}>
                    {r.propostaPor==="livemode"?"Livemode":"Forn."}
                  </span>
                  {deltaR!==null&&(
                    <span style={{fontSize:9,fontWeight:800,color:deltaR>0?(T.brand||"#10b981"):(T.danger||"#ef4444")}}>
                      {deltaR>0?"-":"+"}{Math.abs(deltaR).toFixed(0)}%
                    </span>
                  )}
                </button>
              );
            })}
            {!isUltimaRodada&&(
              <button onClick={()=>setRodadaViz(null)} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 9px",borderRadius:RADIUS.pill,border:`1px solid ${T.border}`,background:"transparent",color:T.textMd,fontSize:10,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                <ChevronRight size={11}/> Ver atual
              </button>
            )}
          </div>
        )}

        {/* Link público */}
        {tokenStatus==="ativo"&&linkPublico&&(
          <div style={{marginTop:10,padding:"8px 12px",background:T.surface||T.card,border:`1px solid ${T.brandBorder||T.border}`,borderRadius:RADIUS.md,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <Link2 size={12} color={T.brand||"#10b981"}/>
            <input readOnly value={linkPublico} onClick={e=>e.target.select()} style={{flex:1,minWidth:200,background:"transparent",border:"none",outline:"none",color:T.text,fontSize:11,fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}/>
            <Button T={T} variant="secondary" size="sm" icon={linkCopiado?Check:Copy} onClick={copiarLink}>{linkCopiado?"Copiado":"Copiar"}</Button>
            <Button T={T} variant="danger" size="sm" icon={Ban} onClick={revogarLink}>Revogar</Button>
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>

        {!isUltimaRodada&&(
          <div style={{padding:"8px 12px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",border:`1px solid ${T.warning||"#f59e0b"}`,borderRadius:RADIUS.md,marginBottom:14,display:"flex",gap:8,alignItems:"center"}}>
            <AlertCircle size={13} color={T.warning||"#f59e0b"} style={{flexShrink:0}}/>
            <span style={{fontSize:12,color:T.text}}>Visualizando R{rodadaExibida?.numero} (somente leitura). Clique em "Ver atual" para editar.</span>
          </div>
        )}

        {/* Config: cidades + categorias */}
        <div style={{marginBottom:16,border:`1px solid ${T.border}`,borderRadius:RADIUS.md,overflow:"hidden"}}>
          <div onClick={()=>setShowConfig(o=>!o)} style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:T.surfaceAlt||T.bg,userSelect:"none"}}>
            {showConfig?<ChevronDown size={14} color={T.textSm}/>:<ChevronRight size={14} color={T.textSm}/>}
            <span style={{fontSize:12,fontWeight:700,color:T.text}}>Configurar cobertura</span>
            <span style={{fontSize:11,color:T.textSm}}>
              {cidadesDaTabela.length} cidades · {categorias.length} categorias
            </span>
          </div>
          {showConfig&&(
            <div style={{padding:"14px 16px",borderTop:`1px solid ${T.border}`}}>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  <MapPin size={11} color="#3b82f6"/> Cidades cobertas
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {cidades.map(c=>{
                    const on=(neg.cidadeIds||[]).includes(c.id);
                    return (
                      <button key={c.id} onClick={()=>toggleCidade(c.id)} disabled={readOnly} style={{
                        display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",
                        borderRadius:RADIUS.pill,cursor:readOnly?"default":"pointer",
                        border:`1px solid ${on?"#3b82f6":T.border}`,
                        background:on?"rgba(59,130,246,0.12)":"transparent",
                        color:on?"#3b82f6":T.textMd,fontSize:11,fontWeight:600,
                      }}>
                        {on?<Check size={10}/>:<MapPin size={10}/>}{c.nome}/{c.uf}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:8}}>
                  Categorias de jogo
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                  {categorias.map((c,i)=>(
                    <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",border:`1px solid ${T.brandBorder||T.border}`,color:T.brand||"#10b981",fontSize:11,fontWeight:700}}>
                      {c.codigo}
                      {!readOnly&&<button onClick={()=>removeCat(i)} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",padding:0,lineHeight:1,display:"flex"}}>×</button>}
                    </span>
                  ))}
                </div>
                {!readOnly&&(
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input value={novaCatCod} onChange={e=>setNovaCatCod(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCategoria()} placeholder="Ex: B4" style={{...IS,width:90,padding:"5px 8px",fontSize:12}}/>
                    <Button T={T} variant="ghost" size="sm" icon={Plus} onClick={addCategoria}>Adicionar</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Price matrix */}
        {!cidadesDaTabela.length ? (
          <div style={{padding:"24px",textAlign:"center",color:T.textSm,fontSize:12,border:`1px dashed ${T.border}`,borderRadius:RADIUS.md}}>
            Nenhuma cidade selecionada. Expanda "Configurar cobertura" para adicionar cidades.
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"separate",borderSpacing:"3px 2px",width:"max-content",minWidth:"100%"}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left",padding:"6px 10px",fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase",minWidth:160,position:"sticky",left:0,background:T.surface||T.card,zIndex:2}}>
                    Serviço
                  </th>
                  {cidadesDaTabela.map(c=>(
                    <th key={c.id} colSpan={categorias.length} style={{textAlign:"center",padding:"6px 8px",fontSize:11,fontWeight:700,color:T.text,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,borderRadius:RADIUS.sm,whiteSpace:"nowrap"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                        <MapPin size={10} color={T.textSm}/>{c.nome}<span style={{color:T.textSm,fontWeight:400}}>/{c.uf}</span>
                      </span>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th style={{position:"sticky",left:0,background:T.surface||T.card,zIndex:2}}/>
                  {cidadesDaTabela.flatMap(c=>
                    categorias.map(cat=>(
                      <th key={`${c.id}-${cat.codigo}`} style={{textAlign:"center",padding:"4px 6px",fontSize:10,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>
                        {cat.codigo}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(itensPorCat).map(([catKey, items])=>{
                  if (!items.length) return null;
                  const Meta = CAT_META[catKey] || { label:catKey, color:T.textMd, icon:Camera };
                  const Icon = Meta.icon;
                  return [
                    <tr key={`group-${catKey}`}>
                      <td colSpan={1+cidadesDaTabela.length*categorias.length} style={{
                        padding:"10px 10px 6px",
                        fontSize:11,fontWeight:800,color:Meta.color,
                        letterSpacing:"0.04em",textTransform:"uppercase",
                        background:`${Meta.color}10`,
                        position:"sticky",left:0,
                      }}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                          <Icon size={12}/>{Meta.label}
                          <span style={{fontSize:10,fontWeight:400,color:T.textSm}}>({items.length})</span>
                        </span>
                      </td>
                    </tr>,
                    ...items.map(item=>(
                      <tr key={item.id}>
                        <td style={{padding:"4px 10px",fontSize:12,fontWeight:600,color:T.text,whiteSpace:"nowrap",position:"sticky",left:0,background:T.surface||T.card,zIndex:1}}>
                          {item.nome}
                          <span style={{fontSize:9,color:T.textSm,fontWeight:400,marginLeft:4}}>{unidadeLabel(item.unidade)}</span>
                        </td>
                        {cidadesDaTabela.flatMap(cid=>
                          categorias.map(cat=>{
                            const v=getCelula(rodadaExibida,item.id,cid.id,cat.codigo);
                            const d=verComparativo?deltaCelula(neg,item.id,cid.id,cat.codigo):null;
                            return (
                              <td key={`${cid.id}-${cat.codigo}`} style={{padding:"2px 0",position:"relative"}}>
                                <input
                                  type="number"
                                  value={v??""} placeholder="—"
                                  onChange={e=>updateCelula(item.id,cid.id,cat.codigo,e.target.value)}
                                  disabled={readOnly}
                                  style={cellSty(T,v!=null&&v!=="",d)}
                                />
                                {d!==null&&(
                                  <span style={{position:"absolute",top:3,right:5,fontSize:8,fontWeight:800,lineHeight:1,color:d>0?(T.brand||"#10b981"):(T.danger||"#ef4444")}}>
                                    {d>0?"-":"+"}{Math.abs(d).toFixed(0)}%
                                  </span>
                                )}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Observações */}
        {isUltimaRodada&&(
          <div style={{marginTop:16,border:`1px solid ${T.border}`,borderRadius:RADIUS.md,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",background:T.surfaceAlt||T.bg,fontSize:11,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase"}}>
              Observações — R{rodadaAtual?.numero}
            </div>
            <div style={{padding:"10px 14px"}}>
              <textarea
                value={rodadaAtual?.observacoes||""}
                onChange={e=>updateObs(e.target.value)}
                disabled={readOnly}
                placeholder="Condições, prazos, exclusões desta rodada..."
                style={{...IS,minHeight:60,fontFamily:"inherit",resize:"vertical",width:"100%",boxSizing:"border-box"}}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,color:T.textSm}}>
            {neg.atualizadoEm&&<>Atualizada {new Date(neg.atualizadoEm).toLocaleString("pt-BR")}</>}
          </span>
          <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>onRemove(neg.id)}/>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {neg.status!=="arquivada"&&tokenStatus!=="ativo"&&isUltimaRodada&&(
            <Button T={T} variant="secondary" size="sm" icon={Link2} onClick={gerarLink}>
              {tokenStatus==="sem"?"Gerar link":"Novo link"}
            </Button>
          )}
          {isUltimaRodada&&neg.status!=="arquivada"&&(
            <Button T={T} variant="secondary" size="sm" icon={Save} onClick={()=>salvar(neg.status)} disabled={!dirty}>Salvar</Button>
          )}
          {isUltimaRodada&&(neg.status==="em_analise"||neg.status==="aguardando_forn")&&(
            <Button T={T} variant="secondary" size="sm" icon={RefreshCw} onClick={()=>{
              if(!confirm("Criar nova contra-proposta (copia valores atuais)?"))return;
              novaRodada("livemode"); salvar("contraproposta");
            }}>Contra-proposta R{(rodadaAtual?.numero||0)+1}</Button>
          )}
          {isUltimaRodada&&neg.status==="contraproposta"&&(
            <Button T={T} variant="secondary" size="sm" icon={RefreshCw} onClick={()=>{
              if(!confirm("Registrar resposta do fornecedor?"))return;
              novaRodada("fornecedor"); salvar("em_analise");
            }}>Resposta do fornecedor</Button>
          )}
          {isUltimaRodada&&neg.status==="rascunho"&&(
            <Button T={T} variant="primary" size="sm" icon={Send} onClick={()=>salvar("aguardando_forn")}>Aguardando fornecedor</Button>
          )}
          {isUltimaRodada&&neg.status==="aguardando_forn"&&(
            <Button T={T} variant="secondary" size="sm" icon={RotateCcw} onClick={()=>salvar("em_analise")}>Fornecedor respondeu</Button>
          )}
          {isUltimaRodada&&["em_analise","contraproposta","rascunho","aguardando_forn"].includes(neg.status)&&(
            <Button T={T} variant="primary" size="sm" icon={CheckCircle2} onClick={()=>salvar("aprovada")}>Aprovar</Button>
          )}
          {isUltimaRodada&&neg.status==="aprovada"&&(
            <Button T={T} variant="secondary" size="sm" icon={Archive} onClick={()=>salvar("arquivada")}>Arquivar</Button>
          )}
        </div>
      </div>
    </div>
  );
}
