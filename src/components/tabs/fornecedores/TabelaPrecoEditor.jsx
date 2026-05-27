import { useState, useMemo, useEffect } from "react";
import { iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { Card, PanelTitle, Button, Badge } from "../../ui";
import {
  statusNegociacaoInfo,
  setCelula, getCelula,
  contarCelulasPreenchidas,
  unidadeLabel,
  gerarTokenTabela,
  revogarTokenTabela,
  statusTokenTabela,
  adicionarRodada,
  getRodadaAtual,
  deltaCelula,
  calcularDeltaRodadas,
  setCelulaRodada,
} from "../../../data/catalogos";
import {
  X, Save, Send, CheckCircle2, Archive, RotateCcw, Package,
  AlertCircle, MapPin, Tag, Link2, Copy, Check, Ban,
  RefreshCw, ChevronLeft, ChevronRight, TrendingDown, TrendingUp,
} from "lucide-react";

const cellSty = (T, preenchido, delta) => {
  let bg = preenchido ? (T.brandSoft||"rgba(16,185,129,0.10)") : T.bg;
  let border = T.border;
  if (delta !== null && delta !== undefined) {
    if (delta > 0)  { bg = "rgba(16,185,129,0.12)";  border = T.brand||"#10b981"; }
    if (delta < 0)  { bg = "rgba(239,68,68,0.10)";   border = T.danger||"#ef4444"; }
  }
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: RADIUS.sm,
    color: T.text,
    padding: "8px 10px",
    fontSize: 13,
    fontWeight: preenchido ? 700 : 500,
    width: "100%",
    textAlign: "right",
    boxSizing: "border-box",
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    outline: "none",
  };
};

export default function TabelaPrecoEditor({
  tabela: negInicial,
  fornecedor,
  campeonato,
  cidades,
  onSave,
  onClose,
  T,
}) {
  const [neg, setNeg]           = useState(negInicial);
  const [dirty, setDirty]       = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [rodadaViz, setRodadaViz] = useState(null); // null = última

  useEffect(() => { setNeg(negInicial); setDirty(false); setRodadaViz(null); }, [negInicial?.id]);

  const rodadas    = neg?.rodadas || [];
  const rodadaAtual = getRodadaAtual(neg);
  const rodadaExibida = rodadaViz !== null
    ? (rodadas.find(r => r.numero === rodadaViz) || rodadaAtual)
    : rodadaAtual;
  const isUltimaRodada = !rodadaViz || rodadaViz === rodadaAtual?.numero;
  const verComparativo = rodadas.length > 1 && isUltimaRodada;

  // Itens: campeonato.itens tem prioridade; fallback para fornecedor.catalogo
  const itens = useMemo(() => {
    const src = (campeonato?.itens?.length)
      ? campeonato.itens
      : (fornecedor?.catalogo || []);
    return src.filter(i => i.ativo !== false);
  }, [campeonato, fornecedor]);

  const cidadesDoCamp = useMemo(
    () => (campeonato?.cidadeIds||[]).map(id=>cidades.find(c=>c.id===id)).filter(Boolean),
    [campeonato, cidades]
  );
  const categorias = campeonato?.categorias || [];

  const totalCelulas = itens.length * cidadesDoCamp.length * categorias.length;
  const preenchidas  = contarCelulasPreenchidas({ valores: rodadaExibida?.valores || {} });
  const pct = totalCelulas ? Math.round((preenchidas / totalCelulas) * 100) : 0;

  const deltaGeral = calcularDeltaRodadas(neg);
  const status = statusNegociacaoInfo(neg.status);
  const readOnly = !isUltimaRodada || ["arquivada"].includes(neg.status);

  // ── Link público ──────────────────────────────────────────────────────────
  const tokenStatus  = statusTokenTabela(neg);
  const linkPublico  = neg.token ? `${window.location.origin}${window.location.pathname}#tabela/${neg.token}` : null;

  const gerarLink = () => { const n = gerarTokenTabela(neg); setNeg(n); onSave(n); setDirty(false); };
  const revogarLink = () => {
    if (!confirm("Revogar este link?")) return;
    const n = revogarTokenTabela(neg); setNeg(n); onSave(n);
  };
  const copiarLink = () => {
    if (!linkPublico) return;
    navigator.clipboard?.writeText(linkPublico);
    setLinkCopiado(true);
    setTimeout(()=>setLinkCopiado(false), 2000);
  };

  // ── Edição de células ─────────────────────────────────────────────────────
  const updateCelula = (itemId, cidadeId, categoria, raw) => {
    if (readOnly) return;
    const valor = raw === "" ? null : parseFloat(raw);
    setNeg(n => setCelulaRodada(n, itemId, cidadeId, categoria, valor));
    setDirty(true);
  };

  // ── Salvar ────────────────────────────────────────────────────────────────
  const salvar = (statusNovo) => {
    const next = {
      ...neg,
      status: statusNovo || neg.status,
      atualizadoEm: new Date().toISOString(),
    };
    onSave(next);
    setDirty(false);
  };

  // ── Nova rodada (contra-proposta) ─────────────────────────────────────────
  const novaRodada = (propostaPor = "livemode") => {
    const n = adicionarRodada(neg, propostaPor);
    setNeg(n);
    setRodadaViz(null);
    setDirty(true);
  };

  // ── Atualizar obs da rodada atual ─────────────────────────────────────────
  const updateObs = obs => {
    if (!neg.rodadas?.length) return;
    const rodadas = [...neg.rodadas];
    rodadas[rodadas.length-1] = { ...rodadas[rodadas.length-1], observacoes: obs };
    setNeg(n => ({...n, rodadas, atualizadoEm: new Date().toISOString()}));
    setDirty(true);
  };

  if (!itens.length) return (
    <Wrapper T={T} onClose={onClose}>
      <Empty T={T} icon={Package} title="Sem itens de serviço"
        msg="Este campeonato ainda não tem itens cadastrados. Vá em Catálogos → edite o campeonato e adicione os itens que serão orçados (UM, drone, equipe...)."/>
    </Wrapper>
  );
  if (!cidadesDoCamp.length || !categorias.length) return (
    <Wrapper T={T} onClose={onClose}>
      <Empty T={T} icon={MapPin} title="Campeonato incompleto"
        msg="O campeonato precisa ter pelo menos uma cidade-sede e uma categoria."/>
    </Wrapper>
  );

  return (
    <Wrapper T={T} onClose={onClose}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Badge T={T} color={status.color} size="md">{status.label}</Badge>
              {deltaGeral !== null && (
                <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:RADIUS.pill,fontSize:11,fontWeight:700,
                  background:deltaGeral>0?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.10)",
                  color:deltaGeral>0?(T.brand||"#10b981"):(T.danger||"#ef4444")}}>
                  {deltaGeral>0?<TrendingDown size={11}/>:<TrendingUp size={11}/>}
                  {deltaGeral>0?"-":"+"}{Math.abs(deltaGeral).toFixed(1)}% vs R1
                </span>
              )}
              <span style={{fontSize:11,color:T.textSm,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>
                {rodadas.length} rodada{rodadas.length!==1?"s":""}
              </span>
            </div>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>
              {fornecedor?.apelido || "Fornecedor"}
            </h2>
            <p style={{margin:"4px 0 0",fontSize:13,color:T.textMd}}>
              {campeonato?.nome} · {cidadesDoCamp.length} cidades × {categorias.length} categorias × {itens.length} itens
            </p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{textAlign:"right",marginRight:8}}>
              <div style={{fontSize:11,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:700}}>Preenchimento</div>
              <div style={{fontSize:18,color:T.text,fontWeight:800,fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
                {preenchidas}/{totalCelulas}
                <span style={{fontSize:11,color:T.textMd,marginLeft:6}}>({pct}%)</span>
              </div>
            </div>
            <button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.textMd,borderRadius:RADIUS.md,width:40,height:40,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Indicadores de estado */}
        <div style={{marginTop:12,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {dirty && (
            <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 11px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",color:T.warning||"#f59e0b",borderRadius:RADIUS.pill,fontSize:11,fontWeight:700}}>
              <AlertCircle size={12}/> Alterações não salvas
            </span>
          )}
          {tokenStatus==="ativo" && (
            <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 11px",background:T.brandSoft||"rgba(16,185,129,0.12)",color:T.brand||"#10b981",borderRadius:RADIUS.pill,fontSize:11,fontWeight:700}}>
              <Link2 size={12}/> Link público ativo
            </span>
          )}
        </div>

        {/* Link público ativo */}
        {tokenStatus==="ativo" && linkPublico && (
          <div style={{marginTop:12,padding:"10px 14px",background:T.surface||T.card,border:`1px solid ${T.brandBorder||T.border}`,borderRadius:RADIUS.md,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <Link2 size={14} color={T.brand||"#10b981"}/>
            <input readOnly value={linkPublico} onClick={e=>e.target.select()} style={{flex:1,minWidth:240,background:"transparent",border:"none",outline:"none",color:T.text,fontSize:12,fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}/>
            <Button T={T} variant="secondary" size="sm" icon={linkCopiado?Check:Copy} onClick={copiarLink}>{linkCopiado?"Copiado":"Copiar"}</Button>
            <Button T={T} variant="danger" size="sm" icon={Ban} onClick={revogarLink}>Revogar</Button>
          </div>
        )}
      </div>

      {/* ── Histórico de rodadas ───────────────────────────────────────────── */}
      {rodadas.length > 0 && (
        <div style={{padding:"12px 24px",borderBottom:`1px solid ${T.border}`,background:T.bg,display:"flex",alignItems:"center",gap:8,overflowX:"auto"}}>
          <span style={{fontSize:11,fontWeight:700,color:T.textSm,textTransform:"uppercase",letterSpacing:"0.04em",flexShrink:0}}>Rodadas:</span>
          {rodadas.map((r, idx) => {
            const isAtual = r.numero === rodadaAtual?.numero;
            const isViz   = rodadaViz === r.numero || (!rodadaViz && isAtual);
            const prevR   = idx > 0 ? rodadas[idx-1] : null;
            const deltaR  = prevR ? (() => {
              const cells = v => Object.values(v||{}).flatMap(i=>Object.values(i||{}).flatMap(c=>Object.values(c||{}))).filter(x=>x>0);
              const cp = cells(prevR.valores); const cc = cells(r.valores);
              if (!cp.length || !cc.length) return null;
              const med = a => a.reduce((x,y)=>x+y,0)/a.length;
              const prim = med(cp); if (!prim) return null;
              return ((prim-med(cc))/prim)*100;
            })() : null;
            return (
              <button key={r.numero} onClick={()=>setRodadaViz(isViz?null:r.numero)} style={{
                display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",
                borderRadius:RADIUS.pill,border:`1px solid ${isViz?(T.brand||"#10b981"):T.border}`,
                background:isViz?(T.brandSoft||"rgba(16,185,129,0.12)"):"transparent",
                color:isViz?(T.brand||"#10b981"):T.textMd,
                fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,
              }}>
                R{r.numero}
                <span style={{fontSize:10,color:isViz?(T.brand||"#10b981"):T.textSm}}>
                  {r.propostaPor==="livemode"?"Livemode":"Fornecedor"}
                </span>
                {deltaR !== null && (
                  <span style={{fontSize:10,fontWeight:800,color:deltaR>0?(T.brand||"#10b981"):(T.danger||"#ef4444")}}>
                    {deltaR>0?"-":"+"}{Math.abs(deltaR).toFixed(0)}%
                  </span>
                )}
                {isAtual && !isViz && <span style={{fontSize:9,color:T.textSm}}>atual</span>}
              </button>
            );
          })}
          {!isUltimaRodada && (
            <button onClick={()=>setRodadaViz(null)} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:RADIUS.pill,border:`1px solid ${T.border}`,background:"transparent",color:T.textMd,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>
              <ChevronRight size={12}/> Ver atual
            </button>
          )}
        </div>
      )}

      {/* ── Corpo: matriz por item ─────────────────────────────────────────── */}
      <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
        {!isUltimaRodada && (
          <div style={{padding:"10px 14px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",border:`1px solid ${T.warning||"#f59e0b"}`,borderRadius:RADIUS.md,marginBottom:16,display:"flex",gap:8,alignItems:"center"}}>
            <AlertCircle size={14} color={T.warning||"#f59e0b"} style={{flexShrink:0}}/>
            <span style={{fontSize:12,color:T.text}}>Visualizando R{rodadaExibida?.numero} (somente leitura). Clique em "Ver atual" para editar.</span>
          </div>
        )}

        {itens.map(item => (
          <Card key={item.id} T={T} padding={0} style={{marginBottom:16}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                <div style={{width:32,height:32,borderRadius:8,background:T.brandSoft||"rgba(16,185,129,0.12)",border:`1px solid ${T.brandBorder||T.border}`,color:T.brand||"#10b981",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Package size={15} strokeWidth={2.25}/>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.text}}>{item.nome}</div>
                  {item.descricao && <div style={{fontSize:11,color:T.textSm,marginTop:2}}>{item.descricao}</div>}
                </div>
              </div>
              <Badge T={T} color={T.info||"#3b82f6"} size="sm">{unidadeLabel(item.unidade)}</Badge>
            </div>

            <div style={{padding:"4px 8px 12px",overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"6px 4px"}}>
                <thead>
                  <tr>
                    <th style={{textAlign:"left",padding:"8px 10px",fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase",minWidth:160}}>Cidade</th>
                    {categorias.map(cat => (
                      <th key={cat.codigo} style={{textAlign:"center",padding:"8px 10px",fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase"}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Tag size={10}/>{cat.codigo}</span>
                      </th>
                    ))}
                    <th style={{textAlign:"right",padding:"8px 10px",fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase",width:120}}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cidadesDoCamp.map(cid => {
                    const subtotal = categorias.reduce((s, cat) => s + (getCelula(rodadaExibida, item.id, cid.id, cat.codigo)||0), 0);
                    return (
                      <tr key={cid.id}>
                        <td style={{padding:"6px 10px",fontSize:13,color:T.text,fontWeight:600}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                            <MapPin size={11} color={T.textSm}/>{cid.nome}
                            <span style={{color:T.textSm,fontWeight:500,fontSize:11}}>/{cid.uf}</span>
                          </span>
                        </td>
                        {categorias.map(cat => {
                          const v = getCelula(rodadaExibida, item.id, cid.id, cat.codigo);
                          const d = verComparativo ? deltaCelula(neg, item.id, cid.id, cat.codigo) : null;
                          return (
                            <td key={cat.codigo} style={{padding:"3px 0",minWidth:120,position:"relative"}}>
                              <input
                                type="number"
                                value={v ?? ""}
                                onChange={e => updateCelula(item.id, cid.id, cat.codigo, e.target.value)}
                                disabled={readOnly}
                                placeholder="—"
                                style={cellSty(T, v != null && v !== "", d)}
                              />
                              {d !== null && (
                                <span style={{
                                  position:"absolute",top:4,right:6,
                                  fontSize:9,fontWeight:800,lineHeight:1,
                                  color:d>0?(T.brand||"#10b981"):(T.danger||"#ef4444"),
                                }}>
                                  {d>0?"-":"+"}{Math.abs(d).toFixed(0)}%
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{padding:"6px 10px",fontSize:13,fontWeight:700,color:subtotal>0?(T.brand||"#10b981"):T.textSm,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
                          {subtotal>0?fmt(subtotal):"—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {/* Observações da rodada atual */}
        {isUltimaRodada && (
          <Card T={T} padding={0}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:12,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase"}}>Observações — R{rodadaAtual?.numero}</span>
            </div>
            <div style={{padding:"12px 16px"}}>
              <textarea
                value={rodadaAtual?.observacoes || ""}
                onChange={e => updateObs(e.target.value)}
                disabled={readOnly}
                placeholder="Observações sobre esta rodada (condições, prazos, exclusões...)"
                style={{...iSty(T),minHeight:70,fontFamily:"inherit",resize:"vertical"}}
              />
            </div>
          </Card>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div style={{padding:"14px 24px",borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:11,color:T.textSm}}>
          {neg.atualizadoEm && <>Atualizada {new Date(neg.atualizadoEm).toLocaleString("pt-BR")}</>}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {neg.status !== "arquivada" && tokenStatus !== "ativo" && isUltimaRodada && (
            <Button T={T} variant="secondary" size="md" icon={Link2} onClick={gerarLink}>
              {tokenStatus==="sem"?"Gerar link público":"Gerar novo link"}
            </Button>
          )}

          {isUltimaRodada && neg.status !== "arquivada" && (
            <Button T={T} variant="secondary" size="md" icon={Save} onClick={()=>salvar(neg.status)} disabled={!dirty}>
              Salvar
            </Button>
          )}

          {/* Contra-proposta: cria nova rodada */}
          {isUltimaRodada && (neg.status==="em_analise" || neg.status==="aguardando_forn") && (
            <Button T={T} variant="secondary" size="md" icon={RefreshCw} onClick={()=>{
              if (!confirm("Criar nova rodada (contra-proposta) copiando os valores atuais?")) return;
              novaRodada("livemode");
              salvar("contraproposta");
            }}>
              Nova contra-proposta (R{(rodadaAtual?.numero||0)+1})
            </Button>
          )}

          {/* Registrar resposta do fornecedor: nova rodada como fornecedor */}
          {isUltimaRodada && neg.status==="contraproposta" && (
            <Button T={T} variant="secondary" size="md" icon={RefreshCw} onClick={()=>{
              if (!confirm("Registrar resposta do fornecedor? Cria nova rodada para você inserir os valores respondidos.")) return;
              novaRodada("fornecedor");
              salvar("em_analise");
            }}>
              Registrar resposta do fornecedor
            </Button>
          )}

          {isUltimaRodada && neg.status==="rascunho" && (
            <Button T={T} variant="primary" size="md" icon={Send} onClick={()=>salvar("aguardando_forn")}>
              Aguardando fornecedor
            </Button>
          )}
          {isUltimaRodada && neg.status==="aguardando_forn" && (
            <Button T={T} variant="secondary" size="md" icon={RotateCcw} onClick={()=>salvar("em_analise")}>
              Fornecedor respondeu
            </Button>
          )}
          {isUltimaRodada && (neg.status==="em_analise"||neg.status==="contraproposta"||neg.status==="rascunho"||neg.status==="aguardando_forn") && (
            <Button T={T} variant="primary" size="md" icon={CheckCircle2} onClick={()=>salvar("aprovada")}>
              Aprovar negociação
            </Button>
          )}
          {isUltimaRodada && neg.status==="aprovada" && (
            <Button T={T} variant="secondary" size="md" icon={Archive} onClick={()=>salvar("arquivada")}>
              Arquivar
            </Button>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

function Wrapper({ T, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:120,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,width:"100%",maxWidth:1200,height:"94vh",display:"flex",flexDirection:"column",border:`1px solid ${T.border}`,boxShadow:T.shadow,overflow:"hidden"}}>
        {children}
      </div>
    </div>
  );
}

function Empty({ T, icon:Icon, title, msg }) {
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,gap:14,textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:16,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,color:T.textSm,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon size={28} strokeWidth={2}/>
      </div>
      <h3 style={{margin:0,fontSize:18,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>{title}</h3>
      <p style={{margin:0,fontSize:13,color:T.textMd,maxWidth:380,lineHeight:1.5}}>{msg}</p>
    </div>
  );
}
