import { useState, useMemo, useEffect } from "react";
import { iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { Card, Button, Badge } from "../../ui";
import {
  recalcularCotacao, novoAdicional, statusCotacaoInfo,
  unidadeLabel,
} from "../../../data/catalogos";
import {
  X, Save, CheckCircle2, Ban, Plus, Trash2, Package, AlertCircle,
  MapPin, Tag, Trophy, Building2, Wallet,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// Editor de cotação por jogo (modal)
// ----------------------------------------------------------------------------
// O valor-base é puxado automaticamente da tabela vigente do fornecedor para
// a cidade × categoria do jogo. O usuário pode marcar/desmarcar itens base e
// adicionar serviços extras pré-jogo (adicionais) com justificativa.
// ════════════════════════════════════════════════════════════════════════════

export default function CotacaoEditor({
  cotacao: cotacaoInicial,
  jogo,
  fornecedor,
  campeonato,
  cidade,
  onSave,
  onClose,
  T,
}) {
  const [cotacao, setCotacao] = useState(cotacaoInicial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setCotacao(cotacaoInicial); setDirty(false); }, [cotacaoInicial?.id]);

  // ── Itens base ───────────────────────────────────────────────────────────
  const toggleItem = (itemId) => {
    setCotacao(c => recalcularCotacao({
      ...c,
      itensBase: c.itensBase.map(i => i.itemId === itemId ? { ...i, incluso: !i.incluso } : i),
    }));
    setDirty(true);
  };

  const updateValorBaseItem = (itemId, raw) => {
    const v = raw === "" ? null : parseFloat(raw);
    setCotacao(c => recalcularCotacao({
      ...c,
      itensBase: c.itensBase.map(i => i.itemId === itemId ? { ...i, valorBase: v } : i),
    }));
    setDirty(true);
  };

  // ── Adicionais ───────────────────────────────────────────────────────────
  const addAdicional = () => {
    setCotacao(c => recalcularCotacao({ ...c, adicionais: [...(c.adicionais||[]), novoAdicional()] }));
    setDirty(true);
  };
  const updateAdicional = (id, patch) => {
    setCotacao(c => {
      const next = (c.adicionais||[]).map(a => {
        if (a.id !== id) return a;
        const merged = { ...a, ...patch };
        merged.valorTotal = Number(merged.quantidade||0) * Number(merged.valorUnitario||0);
        return merged;
      });
      return recalcularCotacao({ ...c, adicionais: next });
    });
    setDirty(true);
  };
  const removeAdicional = (id) => {
    setCotacao(c => recalcularCotacao({ ...c, adicionais: (c.adicionais||[]).filter(a => a.id !== id) }));
    setDirty(true);
  };

  // ── Status / persistência ────────────────────────────────────────────────
  const persistir = (statusNovo) => {
    const next = recalcularCotacao({ ...cotacao, status: statusNovo || cotacao.status });
    onSave(next);
    setDirty(false);
  };

  const status = statusCotacaoInfo(cotacao.status);
  const itensInclusos = (cotacao.itensBase || []).filter(i => i.incluso && i.valorBase != null && i.valorBase > 0).length;
  const itensSemPreco = (cotacao.itensBase || []).filter(i => i.valorBase == null).length;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:130,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={(e)=>{if(e.target===e.currentTarget) onClose();}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,width:"100%",maxWidth:880,maxHeight:"94vh",display:"flex",flexDirection:"column",border:`1px solid ${T.border}`,boxShadow:T.shadow,overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
            <div style={{minWidth:0,flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <Badge T={T} color={status.color} size="md">{status.label}</Badge>
                {dirty && (
                  <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 10px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",color:T.warning||"#f59e0b",borderRadius:RADIUS.pill,fontSize:11,fontWeight:700}}>
                    <AlertCircle size={11}/> Não salvo
                  </span>
                )}
              </div>
              <h2 style={{margin:0,fontSize:18,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>
                {jogo?.mandante} <span style={{color:T.textSm,fontWeight:400}}>×</span> {jogo?.visitante}
              </h2>
              <p style={{margin:"4px 0 0",fontSize:12,color:T.textMd,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Building2 size={11}/>{fornecedor?.apelido}</span>
                <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Trophy size={11}/>{campeonato?.nome}</span>
                <span style={{display:"inline-flex",alignItems:"center",gap:4}}><MapPin size={11}/>{cidade?.nome}/{cidade?.uf}</span>
                <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Tag size={11}/>{jogo?.categoria}</span>
              </p>
            </div>
            <button onClick={onClose} title="Fechar" style={{background:"transparent",border:`1px solid ${T.border}`,color:T.textMd,borderRadius:RADIUS.md,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <X size={16}/>
            </button>
          </div>

          {/* Totalizadores */}
          <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
            <Total T={T} label="Valor Base" value={fmt(cotacao.valorBase)} sub={`${itensInclusos} item${itensInclusos!==1?"s":""}`}/>
            <Total T={T} label="Adicionais" value={fmt(cotacao.valorAdicionais)} sub={`${(cotacao.adicionais||[]).length} extras`} color={T.warning||"#f59e0b"}/>
            <Total T={T} label="Total Cotação" value={fmt(cotacao.valorTotal)} sub="Provisionado" color={T.brand||"#10b981"} bold/>
          </div>
        </div>

        {/* Corpo */}
        <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>

          {/* Itens base */}
          <Card T={T} padding={0} style={{marginBottom:16}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:T.text}}>Itens da tabela vigente</div>
                <div style={{fontSize:11,color:T.textSm,marginTop:2}}>
                  Valores puxados de {cidade?.nome}/{cidade?.uf} × {jogo?.categoria}
                  {cotacao.tabelaIdSnapshot && <> · tabela <code style={{fontSize:10,color:T.textMd}}>{cotacao.tabelaIdSnapshot.slice(-8)}</code></>}
                </div>
              </div>
              {itensSemPreco > 0 && (
                <Badge T={T} color={T.warning||"#f59e0b"} size="sm">{itensSemPreco} sem preço</Badge>
              )}
            </div>

            <div style={{padding:"6px 0 4px"}}>
              {(cotacao.itensBase || []).length === 0 && (
                <div style={{padding:"24px 18px",color:T.textSm,fontSize:12,textAlign:"center"}}>
                  O catálogo do fornecedor está vazio. Cadastre itens em Cadastro → catálogo do fornecedor.
                </div>
              )}
              {cotacao.itensBase.map(it => {
                const semPreco = it.valorBase == null;
                return (
                  <div key={it.itemId} style={{
                    display:"grid",
                    gridTemplateColumns:"24px 1fr 100px 160px",
                    gap:12,
                    alignItems:"center",
                    padding:"10px 18px",
                    borderTop:`1px solid ${T.border}`,
                    opacity: it.incluso ? 1 : 0.55,
                  }}>
                    <input
                      type="checkbox"
                      checked={!!it.incluso}
                      onChange={()=>toggleItem(it.itemId)}
                      disabled={semPreco}
                      style={{width:16,height:16,cursor:semPreco?"not-allowed":"pointer",accentColor:T.brand||"#10b981"}}
                    />
                    <div style={{minWidth:0}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:8}}>
                        <Package size={12} color={T.textSm}/>
                        <span style={{fontSize:13,fontWeight:600,color:T.text}}>{it.nome}</span>
                        <Badge T={T} color={T.info||"#3b82f6"} size="sm">{unidadeLabel(it.unidade)}</Badge>
                      </div>
                      {semPreco && (
                        <div style={{fontSize:11,color:T.warning||"#f59e0b",marginTop:3,display:"inline-flex",alignItems:"center",gap:4}}>
                          <AlertCircle size={11}/> Sem valor na tabela vigente
                        </div>
                      )}
                    </div>
                    <span style={{fontSize:11,color:T.textSm,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase",textAlign:"right"}}>Valor</span>
                    <input
                      type="number"
                      value={it.valorBase ?? ""}
                      onChange={e => updateValorBaseItem(it.itemId, e.target.value)}
                      placeholder="—"
                      style={{
                        ...iSty(T),
                        textAlign:"right",
                        fontWeight:700,
                        fontFamily:"'JetBrains Mono',ui-monospace,monospace",
                        background: it.incluso && !semPreco ? (T.brandSoft||"rgba(16,185,129,0.10)") : T.bg,
                        borderColor: it.incluso && !semPreco ? (T.brandBorder||T.border) : T.border,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Adicionais */}
          <Card T={T} padding={0} style={{marginBottom:16}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:T.text}}>Adicionais pré-jogo</div>
                <div style={{fontSize:11,color:T.textSm,marginTop:2}}>
                  Serviços extras contratados fora da tabela (câmera adicional, viagem extra, etc)
                </div>
              </div>
              <Button T={T} variant="ghost" size="sm" icon={Plus} onClick={addAdicional}>Adicionar</Button>
            </div>

            <div style={{padding:"4px 0"}}>
              {(cotacao.adicionais || []).length === 0 && (
                <div style={{padding:"18px",color:T.textSm,fontSize:12,textAlign:"center"}}>Nenhum adicional.</div>
              )}
              {(cotacao.adicionais || []).map(a => (
                <div key={a.id} style={{
                  display:"grid",
                  gridTemplateColumns:"2fr 70px 110px 110px 32px",
                  gap:8,
                  alignItems:"center",
                  padding:"10px 18px",
                  borderTop:`1px solid ${T.border}`,
                }}>
                  <input
                    value={a.nome}
                    onChange={e => updateAdicional(a.id, { nome: e.target.value })}
                    placeholder="Descrição do adicional"
                    style={iSty(T)}
                  />
                  <input
                    type="number"
                    value={a.quantidade}
                    onChange={e => updateAdicional(a.id, { quantidade: parseFloat(e.target.value)||0 })}
                    placeholder="Qtd"
                    style={{...iSty(T), textAlign:"right"}}
                  />
                  <input
                    type="number"
                    value={a.valorUnitario}
                    onChange={e => updateAdicional(a.id, { valorUnitario: parseFloat(e.target.value)||0 })}
                    placeholder="R$ unit"
                    style={{...iSty(T), textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}
                  />
                  <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:T.brand||"#10b981",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
                    {fmt(a.valorTotal)}
                  </div>
                  <button onClick={()=>removeAdicional(a.id)} title="Remover" style={{background:"transparent",border:`1px solid ${T.border}`,color:T.danger||"#ef4444",borderRadius:RADIUS.sm,width:30,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Observações */}
          <Card T={T} padding={0}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:12,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase"}}>Observações</span>
            </div>
            <div style={{padding:"12px 16px"}}>
              <textarea
                value={cotacao.observacoes || ""}
                onChange={e => { setCotacao(c => ({...c, observacoes: e.target.value})); setDirty(true); }}
                placeholder="Notas internas sobre essa cotação"
                style={{...iSty(T), minHeight:64, fontFamily:"inherit", resize:"vertical"}}
              />
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div style={{padding:"14px 24px",borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{fontSize:11,color:T.textSm}}>
            {cotacao.atualizadoEm && <>Atualizada {new Date(cotacao.atualizadoEm).toLocaleString("pt-BR")}</>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Button T={T} variant="secondary" size="md" icon={Save} onClick={()=>persistir()} disabled={!dirty}>Salvar</Button>
            {cotacao.status !== "aprovada" && (
              <Button T={T} variant="primary" size="md" icon={CheckCircle2} onClick={()=>persistir("aprovada")}>Aprovar</Button>
            )}
            {cotacao.status !== "cancelada" && (
              <Button T={T} variant="danger" size="md" icon={Ban} onClick={()=>persistir("cancelada")}>Cancelar</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Total({ T, label, value, sub, color, bold }) {
  return (
    <div style={{
      padding:"10px 14px",
      background:T.surface||T.card,
      border:`1px solid ${T.border}`,
      borderRadius:RADIUS.md,
    }}>
      <div style={{fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textSm,fontWeight:700,marginBottom:3,display:"flex",alignItems:"center",gap:5}}>
        <Wallet size={10}/>{label}
      </div>
      <div style={{fontSize:bold?20:16,fontWeight:bold?800:700,color:color||T.text,fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>{value}</div>
      {sub && <div style={{fontSize:10,color:T.textSm,marginTop:2}}>{sub}</div>}
    </div>
  );
}
