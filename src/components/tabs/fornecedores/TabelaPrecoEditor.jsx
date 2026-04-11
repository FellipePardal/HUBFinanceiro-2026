import { useState, useMemo, useEffect } from "react";
import { iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { Card, PanelTitle, Button, Badge } from "../../ui";
import {
  STATUS_TABELA,
  statusTabelaInfo,
  setCelula,
  getCelula,
  contarCelulasPreenchidas,
  unidadeLabel,
} from "../../../data/catalogos";
import {
  X, Save, Send, CheckCircle2, Archive, RotateCcw, Package,
  AlertCircle, MapPin, Tag,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// Editor da matriz de preços (cidade × categoria × item) — modal full-screen
// ----------------------------------------------------------------------------
// Para cada item do catálogo do fornecedor, exibe uma sub-matriz com:
//   linhas  = cidades-sede do campeonato
//   colunas = categorias de jogo do campeonato (B1, B2, ...)
// Cada célula é um input numérico. Edição local até o usuário salvar.
// ════════════════════════════════════════════════════════════════════════════

const inputCelulaSty = (T, preenchido) => ({
  background: preenchido ? (T.brandSoft || "rgba(16,185,129,0.10)") : T.bg,
  border: `1px solid ${preenchido ? (T.brandBorder || T.border) : T.border}`,
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
});

export default function TabelaPrecoEditor({
  tabela: tabelaInicial,
  fornecedor,
  campeonato,
  cidades,
  onSave,
  onClose,
  T,
}) {
  const [tabela, setTabela] = useState(tabelaInicial);
  const [dirty, setDirty]   = useState(false);

  // Sincroniza quando o pai trocar a tabela (raro, mas seguro)
  useEffect(() => { setTabela(tabelaInicial); setDirty(false); }, [tabelaInicial?.id]);

  const itens = (fornecedor?.catalogo || []).filter(i => i.ativo !== false);
  const cidadesDoCamp = useMemo(
    () => (campeonato?.cidadeIds || []).map(id => cidades.find(c => c.id === id)).filter(Boolean),
    [campeonato, cidades]
  );
  const categorias = campeonato?.categorias || [];
  const totalCelulas = itens.length * cidadesDoCamp.length * categorias.length;
  const preenchidas = contarCelulasPreenchidas(tabela);
  const pct = totalCelulas ? Math.round((preenchidas / totalCelulas) * 100) : 0;

  const status = statusTabelaInfo(tabela.status);
  const readOnly = ["arquivada"].includes(tabela.status);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const updateCelula = (itemId, cidadeId, categoria, raw) => {
    if (readOnly) return;
    const valor = raw === "" ? null : parseFloat(raw);
    setTabela(t => setCelula(t, itemId, cidadeId, categoria, valor));
    setDirty(true);
  };

  const salvar = (statusNovo) => {
    const next = {
      ...tabela,
      status: statusNovo || tabela.status,
      atualizadoEm: new Date().toISOString(),
      ...(statusNovo === "enviada"  && !tabela.enviadaEm ? { enviadaEm:  new Date().toISOString() } : {}),
      ...(statusNovo === "vigente"  && !tabela.aprovadaEm ? { aprovadaEm: new Date().toISOString() } : {}),
    };
    onSave(next);
    setDirty(false);
  };

  // ── Estado vazio / inválido ──────────────────────────────────────────────
  if (!itens.length) return (
    <Wrapper T={T} onClose={onClose}>
      <Empty T={T} icon={Package} title="Catálogo vazio"
        msg="Esse fornecedor ainda não tem itens cadastrados. Volte ao Cadastro, clique no botão de catálogo do fornecedor e adicione ao menos um serviço."/>
    </Wrapper>
  );
  if (!cidadesDoCamp.length || !categorias.length) return (
    <Wrapper T={T} onClose={onClose}>
      <Empty T={T} icon={MapPin} title="Campeonato incompleto"
        msg="O campeonato precisa ter pelo menos uma cidade-sede e uma categoria definida. Configure em Catálogos → Campeonatos."/>
    </Wrapper>
  );

  return (
    <Wrapper T={T} onClose={onClose}>

      {/* Header */}
      <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Badge T={T} color={status.color} size="md">{status.label}</Badge>
              <span style={{fontSize:11,color:T.textSm,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>v{tabela.versao}</span>
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
            <button onClick={onClose} title="Fechar" style={{
              background:"transparent",border:`1px solid ${T.border}`,
              color:T.textMd,borderRadius:RADIUS.md,
              width:40,height:40,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}><X size={18}/></button>
          </div>
        </div>

        {dirty && (
          <div style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",color:T.warning||"#f59e0b",borderRadius:RADIUS.pill,fontSize:11,fontWeight:700,letterSpacing:"0.02em"}}>
            <AlertCircle size={12}/> Alterações não salvas
          </div>
        )}
      </div>

      {/* Corpo: uma matriz por item */}
      <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
        {itens.map(item => (
          <Card key={item.id} T={T} padding={0} style={{marginBottom:16}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                <div style={{
                  width:32,height:32,borderRadius:8,
                  background:T.brandSoft||"rgba(16,185,129,0.12)",
                  border:`1px solid ${T.brandBorder||T.border}`,
                  color:T.brand||"#10b981",
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}><Package size={15} strokeWidth={2.25}/></div>
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
                        <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                          <Tag size={10}/>{cat.codigo}
                        </span>
                      </th>
                    ))}
                    <th style={{textAlign:"right",padding:"8px 10px",fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase",width:120}}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cidadesDoCamp.map(cid => {
                    const subtotal = categorias.reduce((s, cat) => s + (getCelula(tabela, item.id, cid.id, cat.codigo) || 0), 0);
                    return (
                      <tr key={cid.id}>
                        <td style={{padding:"6px 10px",fontSize:13,color:T.text,fontWeight:600}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                            <MapPin size={11} color={T.textSm}/>
                            {cid.nome}
                            <span style={{color:T.textSm,fontWeight:500,fontSize:11}}>/{cid.uf}</span>
                          </span>
                        </td>
                        {categorias.map(cat => {
                          const v = getCelula(tabela, item.id, cid.id, cat.codigo);
                          return (
                            <td key={cat.codigo} style={{padding:"3px 0",minWidth:120}}>
                              <input
                                type="number"
                                value={v ?? ""}
                                onChange={e => updateCelula(item.id, cid.id, cat.codigo, e.target.value)}
                                disabled={readOnly}
                                placeholder="—"
                                style={inputCelulaSty(T, v != null && v !== "")}
                              />
                            </td>
                          );
                        })}
                        <td style={{padding:"6px 10px",fontSize:13,fontWeight:700,color:subtotal>0?(T.brand||"#10b981"):T.textSm,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
                          {subtotal > 0 ? fmt(subtotal) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {/* Observações */}
        <Card T={T} padding={0}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:12,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase"}}>Observações</span>
          </div>
          <div style={{padding:"12px 16px"}}>
            <textarea
              value={tabela.observacoes || ""}
              onChange={e => { setTabela(t => ({...t, observacoes:e.target.value})); setDirty(true); }}
              disabled={readOnly}
              placeholder="Observações gerais sobre essa tabela (condições, prazos de pagamento, exclusões...)"
              style={{...iSty(T), minHeight:70, fontFamily:"inherit", resize:"vertical"}}
            />
          </div>
        </Card>
      </div>

      {/* Footer com ações de transição */}
      <div style={{padding:"14px 24px",borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:11,color:T.textSm}}>
          {tabela.atualizadoEm && <>Atualizada {new Date(tabela.atualizadoEm).toLocaleString("pt-BR")}</>}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {tabela.status !== "arquivada" && (
            <Button T={T} variant="secondary" size="md" icon={Save} onClick={() => salvar(tabela.status)} disabled={!dirty}>
              Salvar rascunho
            </Button>
          )}
          {tabela.status === "rascunho" && (
            <Button T={T} variant="primary" size="md" icon={Send} onClick={() => salvar("enviada")}>
              Marcar como enviada
            </Button>
          )}
          {(tabela.status === "enviada" || tabela.status === "devolvida") && (
            <Button T={T} variant="secondary" size="md" icon={RotateCcw} onClick={() => salvar("devolvida")}>
              Devolver
            </Button>
          )}
          {(tabela.status === "enviada" || tabela.status === "devolvida" || tabela.status === "rascunho") && (
            <Button T={T} variant="primary" size="md" icon={CheckCircle2} onClick={() => salvar("vigente")}>
              Aprovar (vigente)
            </Button>
          )}
          {tabela.status === "vigente" && (
            <Button T={T} variant="secondary" size="md" icon={Archive} onClick={() => salvar("arquivada")}>
              Arquivar
            </Button>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

// ── Wrapper full-screen ─────────────────────────────────────────────────────
function Wrapper({ T, onClose, children }) {
  return (
    <div style={{
      position:"fixed",inset:0,
      background:"rgba(0,0,0,0.65)",
      backdropFilter:"blur(4px)",
      zIndex:120,
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:16,
    }} onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        background:T.surface||T.card,
        borderRadius:RADIUS.xl,
        width:"100%",maxWidth:1200,
        height:"94vh",
        display:"flex",flexDirection:"column",
        border:`1px solid ${T.border}`,
        boxShadow:T.shadow,
        overflow:"hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

function Empty({ T, icon:Icon, title, msg }) {
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,gap:14,textAlign:"center"}}>
      <div style={{
        width:64,height:64,borderRadius:16,
        background:T.surfaceAlt||T.bg,
        border:`1px solid ${T.border}`,
        color:T.textSm,
        display:"flex",alignItems:"center",justifyContent:"center",
      }}><Icon size={28} strokeWidth={2}/></div>
      <h3 style={{margin:0,fontSize:18,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>{title}</h3>
      <p style={{margin:0,fontSize:13,color:T.textMd,maxWidth:380,lineHeight:1.5}}>{msg}</p>
    </div>
  );
}
