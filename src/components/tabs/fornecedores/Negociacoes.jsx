import { useState, useMemo } from "react";
import { KPI, Pill } from "../../shared";
import { Card, PanelTitle, Button, Badge, tableStyles } from "../../ui";
import { fmt } from "../../../utils";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { statusInfo, CAMPEONATOS_COTACAO } from "../../../data/negociacoes";
import CotacaoModal from "./CotacaoModal";

export default function Negociacoes({ fornecedores, cotacoes, setCotacoes, jogos, T }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const TS = tableStyles(T);

  // KPIs
  const cotacoesAtivas = (cotacoes||[]).filter(c => ["aberta","em_analise","negociando"].includes(c.status)).length;
  const fornecedoresAtivos = new Set((cotacoes||[]).filter(c => ["aberta","em_analise","negociando"].includes(c.status)).map(c => c.fornecedorId)).size;
  const hoje = new Date().toISOString().slice(0,10);
  const jogosProgramados = (jogos||[]).filter(j => j.data && j.data !== "A definir" && j.data >= hoje).length;

  // Cotações recentes (10 mais recentes por updatedAt/createdAt)
  const recentes = useMemo(() => {
    return [...(cotacoes||[])]
      .sort((a,b) => (b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||""))
      .slice(0, 10);
  }, [cotacoes]);

  const fornecedorNome = id => fornecedores.find(f => f.id === id)?.apelido || "—";
  const campeonatoNome = id => CAMPEONATOS_COTACAO.find(c => c.id === id)?.nome || id || "—";
  const campeonatoCor  = id => CAMPEONATOS_COTACAO.find(c => c.id === id)?.cor || T.textSm;

  const saveCotacao = c => {
    setCotacoes(cs => {
      const i = cs.findIndex(x => x.id === c.id);
      if (i >= 0) { const next = [...cs]; next[i] = c; return next; }
      return [...cs, c];
    });
    setShowModal(false); setEditing(null);
  };
  const deleteCotacao = id => {
    if (window.confirm("Excluir esta cotação?")) setCotacoes(cs => cs.filter(c => c.id !== id));
  };

  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label="Cotações Ativas"     value={String(cotacoesAtivas)}     sub="Em negociação"          color={T.info||"#3b82f6"}    T={T}/>
        <KPI label="Fornecedores Ativos" value={String(fornecedoresAtivos)} sub="Com cotação aberta"     color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Jogos Programados"   value={String(jogosProgramados)}   sub="Com data futura"        color={T.brand||"#10b981"}   T={T}/>
      </div>

      <Card T={T}>
        <PanelTitle
          T={T}
          title="Cotações Recentes"
          subtitle={`${recentes.length} de ${(cotacoes||[]).length} cotação${(cotacoes||[]).length!==1?"es":""}`}
          right={<Button T={T} variant="primary" size="md" icon={Plus} onClick={() => { setEditing(null); setShowModal(true); }}>Nova Cotação</Button>}
        />
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:820}}>
            <thead>
              <tr style={TS.thead}>
                {["Fornecedor","Campeonato","Status","Valor Prop.","Contrap.","Prazo","Atualizado",""].map(h =>
                  <th key={h} style={{...TS.th, ...(["Valor Prop.","Contrap."].includes(h) ? TS.thRight : TS.thLeft)}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {recentes.length === 0 && (
                <tr><td colSpan={8} style={{padding:32,textAlign:"center",color:T.textSm,fontSize:12}}>
                  Nenhuma cotação registrada. Clique em "Nova Cotação" para começar.
                </td></tr>
              )}
              {recentes.map(c => {
                const st = statusInfo(c.status);
                return (
                  <tr key={c.id} style={TS.tr}>
                    <td style={{...TS.td,fontWeight:600}}>{fornecedorNome(c.fornecedorId)}</td>
                    <td style={TS.td}><Pill label={campeonatoNome(c.campeonatoId)} color={campeonatoCor(c.campeonatoId)}/></td>
                    <td style={TS.td}><Badge color={st.color} T={T} size="sm">{st.label}</Badge></td>
                    <td className="num" style={{...TS.tdNum,fontWeight:600,color:T.info||"#3b82f6"}}>{c.valorProposto ? fmt(c.valorProposto) : "—"}</td>
                    <td className="num" style={{...TS.tdNum,fontWeight:600,color:T.brand||"#10b981"}}>{c.valorContraproposta ? fmt(c.valorContraproposta) : "—"}</td>
                    <td style={{...TS.td,fontSize:12,color:T.textMd}}>{c.prazo || "—"}</td>
                    <td style={{...TS.td,fontSize:11,color:T.textSm}}>{(c.updatedAt||c.createdAt||"").slice(0,10) || "—"}</td>
                    <td style={TS.td}>
                      <div style={{display:"flex",gap:4}}>
                        <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={() => { setEditing(c); setShowModal(true); }}/>
                        <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={() => deleteCotacao(c.id)}/>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <CotacaoModal
          cotacao={editing}
          fornecedores={fornecedores}
          jogos={jogos}
          onSave={saveCotacao}
          onClose={() => { setShowModal(false); setEditing(null); }}
          T={T}
        />
      )}
    </>
  );
}
