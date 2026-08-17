import { useState } from "react";
import { iSty, FONT, SECAO_COLORS } from "../../constants";
import { Card, SectionHeader, Stat, Button, Progress, tableStyles } from "../ui";
import { calcTotais, ORC_STATUS } from "../../data/orcamentos";
import { fmt, fmtK } from "../../utils";
import {
  LineChart, Wallet, CalendarDays, Briefcase, Trophy,
  Plus, Trash2, AlertCircle,
} from "lucide-react";

// Fora do componente para não remontar (e reiniciar a animação das barras)
// enquanto o operador digita nos serviços fixos.
const QuebraCard = ({ T, titulo, dados, corFixa }) => {
  const entradas = Object.entries(dados).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entradas.map(([, v]) => v), 1);
  return (
    <Card T={T}>
      <SectionHeader T={T} title={titulo} icon={LineChart}/>
      <div style={{padding:"14px 20px 18px",display:"flex",flexDirection:"column",gap:10}}>
        {entradas.length === 0 && <p style={{margin:0,fontSize:12,color:T.textSm}}>Sem jogos ainda.</p>}
        {entradas.map(([label, valor]) => (
          <div key={label}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:12,color:T.text,fontWeight:500}}>{label}</span>
              <span className="num" style={{fontSize:12,color:T.textMd,fontFamily:FONT.num}}>{fmt(valor)}</span>
            </div>
            <Progress T={T} value={(valor / max) * 100} color={corFixa}/>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Resumo consolidado: KPIs, quebras por categoria/fase/padrão/faixa, serviços
// fixos estimados e o CTA de aprovação (status em_revisao + admin).
export default function SubResumo({ orc, setOrc, readOnly, T, canAprovar, errosAprovacao = [], onAprovar }) {
  const IS = iSty(T);
  const ts = tableStyles(T);
  const [novaSecao, setNovaSecao] = useState("Pessoal");

  const totais = calcTotais(orc);
  const numJogos = (orc.jogos || []).length;
  const st = ORC_STATUS[orc.meta.status] || ORC_STATUS.rascunho;

  // ── Serviços fixos ──
  const addItemFixo = (secao) => {
    setOrc(prev => {
      const secoes = prev.servicosFixos || [];
      const nextId = secoes.flatMap(s => s.itens || []).reduce((m, it) => Math.max(m, Number(it.id) || 0), 0) + 1;
      const item = { id: nextId, nome: "", orcado: 0, obs: "" };
      const novas = secoes.some(s => s.secao === secao)
        ? secoes.map(s => s.secao === secao ? { ...s, itens: [...s.itens, item] } : s)
        : [...secoes, { secao, itens: [item] }];
      return { ...prev, servicosFixos: novas };
    });
  };

  const patchItemFixo = (secao, id, patch) => {
    setOrc(prev => ({
      ...prev,
      servicosFixos: (prev.servicosFixos || []).map(s => s.secao !== secao ? s : {
        ...s, itens: s.itens.map(it => it.id === id ? { ...it, ...patch } : it),
      }),
    }));
  };

  const removeItemFixo = (secao, id) => {
    setOrc(prev => ({
      ...prev,
      servicosFixos: (prev.servicosFixos || [])
        .map(s => s.secao !== secao ? s : { ...s, itens: s.itens.filter(it => it.id !== id) })
        .filter(s => s.itens.length > 0),
    }));
  };

  const faseLabel = (key) => (orc.meta.fases || []).find(f => f.key === key)?.label || key;
  const porFaseLabels = Object.fromEntries(Object.entries(totais.porFase).map(([k, v]) => [faseLabel(k), v]));

  const secoesExistentes = (orc.servicosFixos || []).map(s => s.secao);
  const SECOES_SUGERIDAS = ["Pessoal", "Transmissão", "Serviços Complementares"];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* ── KPIs ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        <Stat T={T} label="Total Geral" value={fmtK(totais.totalGeral)} sub={fmt(totais.totalGeral)} color={T.info||"#2563EB"} icon={Wallet}/>
        <Stat T={T} label="Jogos (variável)" value={fmtK(totais.totalJogos)} sub={`${numJogos} jogos estimados`} color={T.brand||"#65B32E"} icon={CalendarDays}/>
        <Stat T={T} label="Serviços Fixos" value={fmtK(totais.totalFixos)} sub="Estimativa de fixos" color="#a855f7" icon={Briefcase}/>
        <Stat T={T} label="Média por Jogo" value={numJogos ? fmtK(totais.totalJogos / numJogos) : "—"} sub="Só a parte variável" color={T.warning||"#D97706"} icon={LineChart}/>
      </div>

      {/* ── Quebras ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18}}>
        <QuebraCard T={T} titulo="Por categoria" dados={Object.fromEntries(totais.porCategoria.map(c => [c.label, c.total]))}/>
        {orc.meta.formato !== "pontos_corridos" && <QuebraCard T={T} titulo="Por fase" dados={porFaseLabels}/>}
        <QuebraCard T={T} titulo="Por padrão" dados={totais.porPadrao}/>
        <QuebraCard T={T} titulo="Por faixa de distância" dados={totais.porFaixa} corFixa="#16A34A"/>
      </div>

      {/* ── Serviços fixos ── */}
      <Card T={T}>
        <SectionHeader T={T} icon={Briefcase} title="Serviços fixos estimados"
          subtitle="Custos que não variam por jogo (equipe fixa, estatísticas, etc.) — vão para a aba Serviços do campeonato"
          right={!readOnly && (
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <select value={novaSecao} onChange={e=>setNovaSecao(e.target.value)} style={{...IS, maxWidth:200, fontSize:12, padding:"5px 8px"}}>
                {[...new Set([...SECOES_SUGERIDAS, ...secoesExistentes])].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={()=>addItemFixo(novaSecao)}>Adicionar item</Button>
            </div>
          )}/>
        <div style={ts.wrap}>
          <table style={{...ts.table, minWidth:560}}>
            <thead style={ts.thead}>
              <tr>
                <th style={{...ts.th, ...ts.thLeft}}>Seção</th>
                <th style={{...ts.th, ...ts.thLeft}}>Serviço</th>
                <th style={{...ts.th, ...ts.thRight}}>Orçado</th>
                <th style={{...ts.th, ...ts.thLeft}}>Obs</th>
                {!readOnly && <th style={ts.th}/>}
              </tr>
            </thead>
            <tbody>
              {(orc.servicosFixos || []).flatMap(sec => sec.itens.map(it => (
                <tr key={`${sec.secao}-${it.id}`} style={ts.tr}>
                  <td style={{...ts.td, fontSize:12, color: SECAO_COLORS[sec.secao] || T.textMd, fontWeight:600}}>{sec.secao}</td>
                  <td style={{...ts.td, padding:"6px 10px"}}>
                    <input value={it.nome} disabled={readOnly} placeholder="Nome do serviço"
                      onChange={e=>patchItemFixo(sec.secao, it.id, {nome:e.target.value})} style={{...IS, fontSize:12, padding:"5px 8px", opacity:readOnly?0.7:1}}/>
                  </td>
                  <td style={{...ts.tdNum, padding:"6px 10px"}}>
                    <input value={it.orcado ?? ""} disabled={readOnly} inputMode="decimal" placeholder="0"
                      onChange={e=>{
                        const v = String(e.target.value).replace(/[^0-9.,\-]/g, "").replace(",", ".");
                        patchItemFixo(sec.secao, it.id, {orcado: v === "" ? 0 : (parseFloat(v) || 0)});
                      }}
                      style={{...IS, maxWidth:120, textAlign:"right", fontFamily:FONT.num, fontSize:12, padding:"5px 8px", opacity:readOnly?0.7:1}}/>
                  </td>
                  <td style={{...ts.td, padding:"6px 10px"}}>
                    <input value={it.obs || ""} disabled={readOnly} placeholder="—"
                      onChange={e=>patchItemFixo(sec.secao, it.id, {obs:e.target.value})} style={{...IS, fontSize:12, padding:"5px 8px", opacity:readOnly?0.7:1}}/>
                  </td>
                  {!readOnly && (
                    <td style={{...ts.td, padding:"6px 10px"}}>
                      <button title="Remover item" onClick={()=>removeItemFixo(sec.secao, it.id)}
                        style={{border:"none",background:"transparent",cursor:"pointer",color:T.danger||"#DC2626",padding:4,display:"flex"}}>
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  )}
                </tr>
              )))}
              {(orc.servicosFixos || []).length === 0 && (
                <tr><td colSpan={5} style={{...ts.td, color:T.textSm, fontSize:12}}>Nenhum serviço fixo estimado.</td></tr>
              )}
              {(orc.servicosFixos || []).length > 0 && (
                <tr style={ts.totalRow}>
                  <td style={{...ts.td, fontWeight:700}} colSpan={2}>Total fixos</td>
                  <td className="num" style={{...ts.tdNum, fontWeight:700}}>{fmt(totais.totalFixos)}</td>
                  <td colSpan={readOnly ? 1 : 2}/>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Aprovação ── */}
      <Card T={T} accent={st.color}>
        <div style={{padding:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:240}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>
              {orc.meta.status === "aprovado"
                ? "Orçamento aprovado e congelado."
                : orc.meta.status === "em_revisao"
                  ? "Pronto para aprovar?"
                  : "Este orçamento ainda está em rascunho."}
            </p>
            <p style={{margin:"4px 0 0",fontSize:12,color:T.textMd,lineHeight:1.5}}>
              {orc.meta.status === "aprovado"
                ? `Campeonato criado: ${orc.meta.campeonatoCriadoId || "—"}.`
                : orc.meta.status === "em_revisao"
                  ? "Aprovar cria o campeonato com o orçado carimbado em cada jogo e congela este orçamento."
                  : "Envie para revisão na aba Configuração para liberar a aprovação."}
            </p>
            {errosAprovacao.length > 0 && orc.meta.status !== "aprovado" && (
              <div style={{marginTop:10}}>
                {errosAprovacao.map((e, i) => (
                  <p key={i} style={{margin:"3px 0 0",fontSize:11,color:T.danger||"#DC2626",display:"flex",alignItems:"center",gap:6}}>
                    <AlertCircle size={12} style={{flexShrink:0}}/> {e}
                  </p>
                ))}
              </div>
            )}
          </div>
          {canAprovar && (
            <Button T={T} variant="primary" size="lg" icon={Trophy} onClick={onAprovar}>
              Aprovar orçamento
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
