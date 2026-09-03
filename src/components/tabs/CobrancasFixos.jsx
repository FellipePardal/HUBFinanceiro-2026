import { useMemo, useState } from "react";
import { KPI } from "../shared";
import { fmt, parseValorBR } from "../../utils";
import { iSty, RADIUS, btnStyle } from "../../constants";
import { Card, PanelTitle, Button, Chip, Badge, tableStyles } from "../ui";
import FornecedorInput from "../FornecedorInput";
import { grafiaCanonica } from "../../lib/dedupeNF";
import { calcularCobrancas, normalizarFixos, mensagemCobranca, MESES, MESES_ABREV } from "../../lib/cobrancaFixos";
import { Plus, Edit2, Trash2, Copy, Check, X, AlertTriangle, BellRing } from "lucide-react";

// ─── COBRANÇAS DE NF DOS FIXOS ───────────────────────────────────────────────
// Matriz contrato × mês. Cada célula é uma competência (ver lib/cobrancaFixos.js
// para os estados). Admin cadastra os contratos, marca a parada do campeonato
// (meses sem serviço) e registra cobrança/dispensa por competência.

const COR = {
  recebida:   "#22c55e",
  pendente:   "#DC2626",
  cobrada:    "#D97706",
  dispensada: "#8b5cf6",
  pausa:      "#6B7280",
  futura:     null,
  fora:       null,
};
const LEGENDA = [
  ["recebida", "NF recebida"], ["pendente", "Pendente"], ["cobrada", "Cobrada, aguardando"],
  ["dispensada", "Sem NF (dispensada)"], ["pausa", "Parada do campeonato"],
];

const hojeISO = () => new Date().toISOString().slice(0, 10);
const fmtData = iso => iso ? iso.split("-").reverse().join("/") : "";

function Modal({ children, onClose, T, maxWidth = 520 }) {
  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:120,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{background:T.card,borderRadius:16,padding:26,width:"100%",maxWidth,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`}}>
        {children}
      </div>
    </div>
  );
}

const Label = ({ T, children }) => <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{children}</label>;

function ContratoModal({ inicial, fornecedores, servicos, onSave, onClose, T }) {
  const IS = iSty(T);
  const [f, setF] = useState(() => ({
    fornecedor: "", apelidos: "", servicoId: "", categoria: "Outro", valor: "",
    mesInicio: 0, mesFim: "", ativo: true, trabalhaNaParada: false, obs: "",
    ...(inicial || {}),
    apelidos: (inicial?.apelidos || []).join(", "),
    servicoId: inicial?.servicoId ?? "",
    valor: inicial?.valor != null ? String(inicial.valor).replace(".", ",") : "",
    mesFim: inicial?.mesFim ?? "",
  }));
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const itens = (servicos || []).flatMap(sec => sec.itens.map(it => ({ ...it, secao: sec.secao })));

  const salvar = () => {
    if (!f.fornecedor.trim()) return;
    const servicoId = f.servicoId === "" ? null : Number(f.servicoId);
    const item = servicoId != null ? itens.find(i => i.id === servicoId) : null;
    onSave({
      id: inicial?.id || Date.now(),
      fornecedor: grafiaCanonica(f.fornecedor.trim(), fornecedores),
      apelidos: f.apelidos.split(",").map(s => s.trim()).filter(Boolean),
      servicoId,
      categoria: item ? item.nome : (f.categoria || "Outro"),
      valor: f.valor === "" ? null : parseValorBR(f.valor),
      mesInicio: Number(f.mesInicio),
      mesFim: f.mesFim === "" ? null : Number(f.mesFim),
      ativo: !!f.ativo,
      trabalhaNaParada: !!f.trabalhaNaParada,
      obs: f.obs || "",
      competencias: inicial?.competencias || {},
    });
  };

  return (
    <Modal onClose={onClose} T={T}>
      <h3 style={{margin:"0 0 18px",fontSize:16,color:T.text}}>{inicial?.id ? "Editar contrato fixo" : "Novo contrato fixo"}</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <div style={{marginBottom:12,gridColumn:"1 / -1"}}>
          <Label T={T}>Fornecedor (freela)</Label>
          <FornecedorInput value={f.fornecedor} onChange={v => set("fornecedor", v)} fornecedores={fornecedores} T={T}/>
        </div>
        <div style={{marginBottom:12,gridColumn:"1 / -1"}}>
          <Label T={T}>Outras grafias aceitas na NF (separadas por vírgula)</Label>
          <input value={f.apelidos} onChange={e => set("apelidos", e.target.value)} placeholder="Ex: RAPHAEL BARBOSA FONTAN MARQUES" style={IS}/>
        </div>
        <div style={{marginBottom:12}}>
          <Label T={T}>Linha do orçamento (opcional)</Label>
          <select value={f.servicoId} onChange={e => set("servicoId", e.target.value)} style={IS}>
            <option value="">— sem linha fixa —</option>
            {(servicos || []).map(sec => (
              <optgroup key={sec.secao} label={sec.secao}>
                {sec.itens.map(it => <option key={it.id} value={it.id}>{it.nome}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div style={{marginBottom:12}}>
          <Label T={T}>Categoria (quando sem linha)</Label>
          <input value={f.categoria} onChange={e => set("categoria", e.target.value)} disabled={f.servicoId !== ""} placeholder="Outro, Seg. Espacial…" style={{...IS, opacity: f.servicoId !== "" ? 0.5 : 1}}/>
        </div>
        <div style={{marginBottom:12}}>
          <Label T={T}>Valor esperado por mês (vazio = variável)</Label>
          <input type="text" inputMode="decimal" value={f.valor} onChange={e => set("valor", e.target.value)} placeholder="0,00" style={IS}/>
        </div>
        <div style={{marginBottom:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div>
            <Label T={T}>Início</Label>
            <select value={f.mesInicio} onChange={e => set("mesInicio", e.target.value)} style={IS}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label T={T}>Fim</Label>
            <select value={f.mesFim} onChange={e => set("mesFim", e.target.value)} style={IS}>
              <option value="">Até o fim</option>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:12,gridColumn:"1 / -1"}}>
          <Label T={T}>Observações</Label>
          <input value={f.obs} onChange={e => set("obs", e.target.value)} style={IS}/>
        </div>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:T.textMd,marginBottom:8}}>
          <input type="checkbox" checked={!!f.ativo} onChange={e => set("ativo", e.target.checked)}/> Contrato ativo
        </label>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:T.textMd,marginBottom:8}}>
          <input type="checkbox" checked={!!f.trabalhaNaParada} onChange={e => set("trabalhaNaParada", e.target.checked)}/> Trabalha na parada (cobrar mesmo nos meses sem serviço)
        </label>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
        <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
        <button onClick={salvar} style={{...btnStyle,background:T.brand}}>Salvar</button>
      </div>
    </Modal>
  );
}

function CompetenciaModal({ linha, comp, onDecidir, onClose, T, nomeCampeonato, linkFormulario, canEdit }) {
  const IS = iSty(T);
  const c = linha.contrato;
  const [motivo, setMotivo] = useState(comp.decisao.motivo || "");
  const [copiado, setCopiado] = useState(false);
  const ano = new Date().getFullYear();
  const texto = mensagemCobranca({ fornecedor: c.fornecedor, mesLabel: comp.label, valor: c.valor, ano, nomeCampeonato, linkFormulario });
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch (_) {}
  };
  const cor = COR[comp.status] || T.textSm;
  const decidir = patch => { onDecidir(c.id, comp.mes, patch); onClose(); };

  return (
    <Modal onClose={onClose} T={T} maxWidth={560}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <h3 style={{margin:0,fontSize:16,color:T.text}}>{c.fornecedor}</h3>
          <div style={{fontSize:12,color:T.textSm,marginTop:2}}>{c.categoria || "—"} · competência <b style={{color:T.text}}>{comp.label}</b>{c.valor ? ` · ${fmt(c.valor)}` : ""}</div>
        </div>
        <Badge T={T} color={cor}>{comp.status}{comp.diasAtraso != null ? ` · ${comp.diasAtraso}d` : ""}</Badge>
      </div>

      {comp.status === "recebida" && (
        <div style={{fontSize:12,color:T.textMd,marginBottom:14}}>
          {comp.notas.map(n => <div key={n.id}>NF {n.numeroNF || "s/nº"} · {fmt(n.valor)} · emissão {n.dataEmissao || "—"}</div>)}
        </div>
      )}
      {comp.decisao.cobradaEm && <div style={{fontSize:12,color:COR.cobrada,marginBottom:10}}>Cobrada em {fmtData(comp.decisao.cobradaEm)}</div>}
      {comp.decisao.dispensada && <div style={{fontSize:12,color:COR.dispensada,marginBottom:10}}>Dispensada{comp.decisao.motivo ? `: ${comp.decisao.motivo}` : ""}</div>}

      {(comp.status === "pendente" || comp.status === "cobrada") && (
        <div style={{marginBottom:14}}>
          <Label T={T}>Mensagem de cobrança</Label>
          <textarea readOnly value={texto} rows={6} style={{...IS, resize:"vertical", fontSize:12, lineHeight:1.5}}/>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
            <Button T={T} variant="secondary" size="sm" icon={copiado ? Check : Copy} onClick={copiar}>{copiado ? "Copiado" : "Copiar mensagem"}</Button>
          </div>
        </div>
      )}

      {canEdit && comp.status !== "recebida" && comp.status !== "fora" && (
        <>
          <Label T={T}>Motivo (para dispensar)</Label>
          <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: férias, não prestou serviço neste mês" style={{...IS, marginBottom:12}}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            {comp.status === "pendente" && <button onClick={() => decidir({ cobradaEm: hojeISO(), dispensada: false })} style={{...btnStyle,background:COR.cobrada}}>Marcar cobrada hoje</button>}
            {comp.status === "cobrada"  && <button onClick={() => decidir({ cobradaEm: null })} style={{...btnStyle,background:"#475569"}}>Desfazer cobrança</button>}
            {comp.status !== "dispensada" && comp.status !== "pausa" && <button onClick={() => decidir({ dispensada: true, motivo })} style={{...btnStyle,background:COR.dispensada}}>Sem NF neste mês</button>}
            {comp.status === "dispensada" && <button onClick={() => decidir({ dispensada: false, motivo: "" })} style={{...btnStyle,background:"#475569"}}>Reativar competência</button>}
          </div>
        </>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
        <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Fechar</button>
      </div>
    </Modal>
  );
}

export default function CobrancasFixos({
  fixos, setFixos, notasMensais = [], fornecedores = [], servicos = [], T, role = "admin",
  mesInicioCamp = 0, mesFimCamp = 11, nomeCampeonato = "", linkFormulario = "",
}) {
  const canEdit = role === "admin";
  const [modalContrato, setModalContrato] = useState(null); // null | {} | contrato
  const [modalComp, setModalComp] = useState(null);         // {linha, comp}
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);
  const TS = tableStyles(T);

  const dados = useMemo(() => normalizarFixos(fixos), [fixos]);
  const calc = useMemo(() => calcularCobrancas({ fixos: dados, notasMensais, mesInicioCamp, mesFimCamp }), [dados, notasMensais, mesInicioCamp, mesFimCamp]);

  const linhas = calc.linhas.filter(l => mostrarEncerrados || l.contrato.ativo !== false);
  const encerrados = calc.linhas.length - calc.linhas.filter(l => l.contrato.ativo !== false).length;

  const salvarContrato = contrato => {
    setFixos(prev => {
      const d = normalizarFixos(prev);
      const existe = d.contratos.some(c => c.id === contrato.id);
      return { ...d, contratos: existe ? d.contratos.map(c => c.id === contrato.id ? contrato : c) : [...d.contratos, contrato] };
    });
    setModalContrato(null);
  };
  const excluirContrato = id => {
    const c = dados.contratos.find(x => x.id === id);
    if (!window.confirm(`Excluir o contrato de ${c?.fornecedor}? As NFs não são afetadas.`)) return;
    setFixos(prev => { const d = normalizarFixos(prev); return { ...d, contratos: d.contratos.filter(x => x.id !== id) }; });
  };
  const decidirCompetencia = (contratoId, mes, patch) => {
    setFixos(prev => {
      const d = normalizarFixos(prev);
      return { ...d, contratos: d.contratos.map(c => {
        if (c.id !== contratoId) return c;
        const atual = (c.competencias || {})[String(mes)] || {};
        return { ...c, competencias: { ...(c.competencias || {}), [String(mes)]: { ...atual, ...patch } } };
      }) };
    });
  };
  const toggleParada = mes => {
    setFixos(prev => {
      const d = normalizarFixos(prev);
      const tem = d.mesesSemServico.includes(mes);
      return { ...d, mesesSemServico: tem ? d.mesesSemServico.filter(m => m !== mes) : [...d.mesesSemServico, mes].sort((a, b) => a - b) };
    });
  };

  // NFs mensais de fornecedores sem contrato, agrupadas — candidatos a contrato.
  const semContrato = useMemo(() => {
    const g = new Map();
    for (const n of calc.naoCasadas) {
      const k = n.fornecedor;
      if (!g.has(k)) g.set(k, { fornecedor: k, meses: new Set(), servicoId: n.servicoId ?? null, categoria: n.categoria });
      g.get(k).meses.add(Number(n.mes));
    }
    return Array.from(g.values()).filter(x => x.meses.size >= 3).sort((a, b) => b.meses.size - a.meses.size);
  }, [calc.naoCasadas]);

  const r = calc.resumo;

  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:20}}>
        <KPI label="NFs pendentes" value={String(r.pendentes)} sub={r.pendentes ? `${fmt(r.valorPendente)} estimado` : "tudo em dia"} color={r.pendentes ? COR.pendente : COR.recebida} T={T}/>
        <KPI label="Cobradas, aguardando" value={String(r.cobradas)} sub="já pedimos, NF ainda não chegou" color={COR.cobrada} T={T}/>
        <KPI label="Contratos ativos" value={String(r.contratosAtivos)} sub={encerrados ? `${encerrados} encerrado${encerrados > 1 ? "s" : ""}` : "—"} color={T.brand} T={T}/>
        <KPI label="Parada do campeonato" value={calc.mesesSemServico.length ? calc.mesesSemServico.map(m => MESES_ABREV[m]).join(", ") : "—"} sub="meses sem prestação de serviço" color={COR.pausa} T={T}/>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{color:T.textSm,fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginRight:4}}>Meses sem serviço</span>
          {calc.meses.map(m => (
            <Chip key={m} active={calc.mesesSemServico.includes(m)} onClick={canEdit ? () => toggleParada(m) : undefined} T={T} color={COR.pausa}>{MESES_ABREV[m]}</Chip>
          ))}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {encerrados > 0 && <Chip active={mostrarEncerrados} onClick={() => setMostrarEncerrados(v => !v)} T={T} color={T.textSm}>Encerrados</Chip>}
          {canEdit && <Button T={T} variant="primary" size="md" icon={Plus} onClick={() => setModalContrato({})}>Novo contrato</Button>}
        </div>
      </div>

      {r.lista.length > 0 && (
        <Card T={T} style={{marginBottom:18}} accent={COR.pendente}>
          <PanelTitle T={T} title="Ação: NFs a cobrar" subtitle="Competências vencidas sem NF, mais atrasadas primeiro" color={COR.pendente}/>
          <div style={{padding:"6px 20px 16px",display:"flex",flexDirection:"column",gap:6}}>
            {r.lista.map(p => {
              const linha = calc.linhas.find(l => l.contrato.id === p.contratoId);
              const comp = linha?.competencias.find(c => c.mes === p.mes);
              return (
                <div key={`${p.contratoId}_${p.mes}`} onClick={() => linha && comp && setModalComp({ linha, comp })}
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"8px 12px",borderRadius:RADIUS.md,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                    <BellRing size={14} color={COR[p.status]}/>
                    <span style={{fontSize:13,fontWeight:600,color:T.text,whiteSpace:"nowrap"}}>{p.fornecedor}</span>
                    <span style={{fontSize:12,color:T.textSm,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.servico || "—"}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                    <span style={{fontSize:12,color:T.textMd}}>{p.mesLabel}</span>
                    {p.valor && <span className="num" style={{fontSize:12,color:T.textMd}}>{fmt(p.valor)}</span>}
                    <Badge T={T} color={COR[p.status]} size="sm">{p.status === "cobrada" ? `cobrada ${fmtData(p.cobradaEm)}` : `${p.diasAtraso}d sem NF`}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card T={T}>
        <PanelTitle T={T} title="Contratos fixos × competências" subtitle="Clique numa célula para cobrar, dispensar ou copiar a mensagem"
          right={<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{LEGENDA.map(([k, l]) => <span key={k} style={{fontSize:11,color:T.textSm,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:COR[k]}}/>{l}</span>)}</div>}
        />
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth: 560 + calc.meses.length * 46}}>
            <thead>
              <tr style={TS.thead}>
                <th style={{...TS.th, ...TS.thLeft}}>Fornecedor</th>
                <th style={{...TS.th, ...TS.thLeft}}>Linha / categoria</th>
                <th style={{...TS.th, ...TS.thRight}}>Valor/mês</th>
                {calc.meses.map(m => <th key={m} style={{...TS.th, textAlign:"center", padding:"8px 4px"}}>{MESES_ABREV[m]}</th>)}
                <th style={TS.th}/>
              </tr>
            </thead>
            <tbody>
              {linhas.map(l => {
                const c = l.contrato;
                const inativo = c.ativo === false;
                return (
                  <tr key={c.id} style={{...TS.tr, opacity: inativo ? 0.55 : 1}}>
                    <td style={{...TS.td, fontWeight:600, whiteSpace:"nowrap"}}>
                      {c.fornecedor}
                      {inativo && <span style={{fontSize:10,color:T.textSm,marginLeft:6}}>encerrado</span>}
                      {l.notasSemVigencia.length > 0 && <span title={`${l.notasSemVigencia.length} NF fora da vigência`} style={{marginLeft:6,verticalAlign:"middle"}}><AlertTriangle size={12} color={COR.cobrada}/></span>}
                    </td>
                    <td style={{...TS.td, color:T.textMd, fontSize:12, whiteSpace:"nowrap"}}>{c.categoria || "—"}</td>
                    <td className="num" style={{...TS.tdNum, color:T.textMd}}>{c.valor ? fmt(c.valor) : <span style={{color:T.textSm}}>variável</span>}</td>
                    {l.competencias.map(comp => {
                      const cor = COR[comp.status];
                      const clicavel = comp.status !== "fora";
                      const titulo = comp.status === "recebida" ? `${comp.label}: ${fmt(comp.valorRecebido)}`
                        : comp.status === "pendente" ? `${comp.label}: ${comp.diasAtraso} dias sem NF`
                        : comp.status === "cobrada" ? `${comp.label}: cobrada em ${fmtData(comp.decisao.cobradaEm)}`
                        : comp.status === "dispensada" ? `${comp.label}: ${comp.decisao.motivo || "dispensada"}`
                        : comp.status === "pausa" ? `${comp.label}: parada` : comp.label;
                      return (
                        <td key={comp.mes} title={titulo} onClick={clicavel ? () => setModalComp({ linha: l, comp }) : undefined}
                          style={{...TS.td, textAlign:"center", padding:"6px 4px", cursor: clicavel ? "pointer" : "default"}}>
                          {comp.status === "fora" ? <span style={{color:T.border}}>·</span>
                            : comp.status === "futura" ? <span style={{display:"inline-block",width:22,height:22,borderRadius:6,border:`1px dashed ${T.border}`}}/>
                            : <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:6,background:cor,color:"#fff",fontSize:11,fontWeight:700}}>
                                {comp.status === "recebida" ? "✓" : comp.status === "pendente" ? "!" : comp.status === "cobrada" ? "…" : comp.status === "dispensada" ? "–" : "∥"}
                              </span>}
                        </td>
                      );
                    })}
                    <td style={TS.td}>
                      {canEdit && (
                        <div style={{display:"flex",gap:4}}>
                          <Button T={T} variant="secondary" size="sm" icon={Edit2} onClick={() => setModalContrato(c)}/>
                          <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={() => excluirContrato(c.id)}/>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {linhas.length === 0 && (
                <tr><td colSpan={4 + calc.meses.length} style={{padding:40,textAlign:"center",color:T.textSm}}>
                  Nenhum contrato fixo cadastrado. {canEdit ? "Use “Novo contrato” para registrar quem deve NF todo mês." : ""}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {semContrato.length > 0 && (
        <Card T={T} style={{marginTop:18}}>
          <PanelTitle T={T} title="Fornecedores recorrentes sem contrato" subtitle="Emitem NF mensal em 3+ meses, mas não estão na lista acima"/>
          <div style={{padding:"6px 20px 16px",display:"flex",gap:8,flexWrap:"wrap"}}>
            {semContrato.map(s => (
              <div key={s.fornecedor} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:RADIUS.md,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>{s.fornecedor}</div>
                  <div style={{fontSize:11,color:T.textSm}}>{s.categoria || "—"} · {Array.from(s.meses).sort((a, b) => a - b).map(m => MESES_ABREV[m]).join(", ")}</div>
                </div>
                {canEdit && <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={() => setModalContrato({ fornecedor: s.fornecedor, servicoId: s.servicoId, categoria: s.categoria, mesInicio: Math.min(...s.meses) })}>Contrato</Button>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {modalContrato && <ContratoModal inicial={(modalContrato.id || modalContrato.fornecedor) ? modalContrato : null} fornecedores={fornecedores} servicos={servicos} onSave={salvarContrato} onClose={() => setModalContrato(null)} T={T}/>}
      {modalComp && <CompetenciaModal linha={modalComp.linha} comp={modalComp.comp} onDecidir={decidirCompetencia} onClose={() => setModalComp(null)} T={T} nomeCampeonato={nomeCampeonato} linkFormulario={linkFormulario} canEdit={canEdit}/>}
    </>
  );
}
