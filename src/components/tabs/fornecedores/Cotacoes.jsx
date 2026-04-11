import { useState, useMemo } from "react";
import { Pill } from "../../shared";
import { Card, PanelTitle, Button, Badge, tableStyles } from "../../ui";
import { fmt } from "../../../utils";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Trophy } from "lucide-react";
import { statusInfo, CAMPEONATOS_COTACAO } from "../../../data/negociacoes";
import { RADIUS } from "../../../constants";
import CotacaoModal from "./CotacaoModal";

export default function Cotacoes({ fornecedores, cotacoes, setCotacoes, jogos, T }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalCampId, setModalCampId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set(CAMPEONATOS_COTACAO.map(c => c.id)));
  const TS = tableStyles(T);

  const fornecedorNome = id => fornecedores.find(f => f.id === id)?.apelido || "—";

  const grouped = useMemo(() => {
    const map = {};
    CAMPEONATOS_COTACAO.forEach(c => { map[c.id] = []; });
    (cotacoes||[]).forEach(c => {
      if (!map[c.campeonatoId]) map[c.campeonatoId] = [];
      map[c.campeonatoId].push(c);
    });
    Object.keys(map).forEach(k => map[k].sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||"")));
    return map;
  }, [cotacoes]);

  const toggle = id => setExpanded(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const openNew = campId => { setEditing(null); setModalCampId(campId); setShowModal(true); };
  const openEdit = c => { setEditing(c); setModalCampId(c.campeonatoId); setShowModal(true); };

  const saveCotacao = c => {
    setCotacoes(cs => {
      const i = cs.findIndex(x => x.id === c.id);
      if (i >= 0) { const next = [...cs]; next[i] = c; return next; }
      return [...cs, c];
    });
    setShowModal(false); setEditing(null); setModalCampId(null);
  };
  const deleteCotacao = id => {
    if (window.confirm("Excluir esta cotação?")) setCotacoes(cs => cs.filter(c => c.id !== id));
  };

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>Cotações por Campeonato</h2>
          <p style={{margin:"4px 0 0",fontSize:12,color:T.textSm}}>Clique em um campeonato para abrir a lista de cotações</p>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {CAMPEONATOS_COTACAO.map(camp => {
          const items = grouped[camp.id] || [];
          const isOpen = expanded.has(camp.id);
          const totalProposto = items.reduce((s,c) => s + (c.valorProposto||0), 0);
          const totalContra   = items.reduce((s,c) => s + (c.valorContraproposta||0), 0);

          return (
            <Card T={T} key={camp.id}>
              <div
                onClick={() => toggle(camp.id)}
                style={{
                  padding:"14px 20px",
                  background:T.surfaceAlt||T.bg,
                  borderBottom: isOpen ? `1px solid ${T.border}` : "none",
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center",
                  flexWrap:"wrap",
                  gap:12,
                  cursor:"pointer",
                }}>
                <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                  <span style={{width:4,height:22,background:camp.cor,borderRadius:2,boxShadow:`0 0 12px ${camp.cor}88`}}/>
                  {isOpen ? <ChevronDown size={15} color={T.textMd}/> : <ChevronRight size={15} color={T.textMd}/>}
                  <Trophy size={15} color={camp.cor}/>
                  <div>
                    <h4 style={{margin:0,fontSize:13,fontWeight:700,color:T.text,letterSpacing:"-0.005em"}}>{camp.nome}</h4>
                    <p style={{margin:"2px 0 0",fontSize:11,color:T.textSm}}>
                      {items.length} cotação{items.length!==1?"es":""}
                      {totalProposto > 0 && ` · Proposto ${fmt(totalProposto)}`}
                      {totalContra   > 0 && ` · Contrap. ${fmt(totalContra)}`}
                    </p>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}} onClick={e => e.stopPropagation()}>
                  <Badge color={camp.cor} T={T} size="sm">{items.length}</Badge>
                  <Button T={T} variant="primary" size="sm" icon={Plus} onClick={() => openNew(camp.id)}>Nova Cotação</Button>
                </div>
              </div>

              {isOpen && (
                items.length === 0 ? (
                  <div style={{padding:"24px 20px",textAlign:"center",color:T.textSm,fontSize:12}}>
                    Nenhuma cotação neste campeonato. Clique em "Nova Cotação" para criar.
                  </div>
                ) : (
                  <div style={TS.wrap}>
                    <table style={{...TS.table, minWidth:760}}>
                      <thead>
                        <tr style={TS.thead}>
                          {["Fornecedor","Status","Valor Prop.","Contrap.","Prazo","Jogos","Obs",""].map(h =>
                            <th key={h} style={{...TS.th, ...(["Valor Prop.","Contrap.","Jogos"].includes(h) ? TS.thRight : TS.thLeft)}}>{h}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(c => {
                          const st = statusInfo(c.status);
                          return (
                            <tr key={c.id} style={{...TS.tr,cursor:"pointer"}} onClick={() => openEdit(c)}>
                              <td style={{...TS.td,fontWeight:600}}>{fornecedorNome(c.fornecedorId)}</td>
                              <td style={TS.td}><Badge color={st.color} T={T} size="sm">{st.label}</Badge></td>
                              <td className="num" style={{...TS.tdNum,fontWeight:600,color:T.info||"#3b82f6"}}>{c.valorProposto ? fmt(c.valorProposto) : "—"}</td>
                              <td className="num" style={{...TS.tdNum,fontWeight:600,color:T.brand||"#10b981"}}>{c.valorContraproposta ? fmt(c.valorContraproposta) : "—"}</td>
                              <td style={{...TS.td,fontSize:12,color:T.textMd}}>{c.prazo || "—"}</td>
                              <td className="num" style={{...TS.tdNum,fontSize:12,color:T.textMd}}>{(c.jogoIds||[]).length}</td>
                              <td style={{...TS.td,fontSize:11,color:T.textSm,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.observacoes || "—"}</td>
                              <td style={TS.td} onClick={e => e.stopPropagation()}>
                                <div style={{display:"flex",gap:4}}>
                                  <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(c)}/>
                                  <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={() => deleteCotacao(c.id)}/>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </Card>
          );
        })}
      </div>

      {showModal && (
        <CotacaoModal
          cotacao={editing}
          fornecedores={fornecedores}
          jogos={jogos}
          defaultCampeonatoId={modalCampId}
          onSave={saveCotacao}
          onClose={() => { setShowModal(false); setEditing(null); setModalCampId(null); }}
          T={T}
        />
      )}
    </>
  );
}
