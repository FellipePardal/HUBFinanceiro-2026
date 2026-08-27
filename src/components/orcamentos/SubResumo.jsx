import { useMemo, useState } from "react";
import { FONT, CATS, TIPO_COLOR } from "../../constants";
import { Card, SectionHeader, Stat, Button, Progress } from "../ui";
import { Pill } from "../shared";
import { calcTotais, calcOrcadoJogo, ORC_STATUS, GRUPOS_PREMISSA } from "../../data/orcamentos";
import { fmt, fmtK } from "../../utils";
import {
  LineChart, Wallet, CalendarDays, Briefcase, Trophy, AlertCircle,
  LayoutDashboard, ChevronRight,
} from "lucide-react";

// Fora do componente para não remontar (e reiniciar a animação das barras)
// a cada re-render.
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

const thStyle = (T, left) => ({
  padding:"11px 16px",
  textAlign:left ? "left" : "right",
  color:T.textSm,
  fontSize:10,
  fontWeight:700,
  letterSpacing:"0.06em",
  textTransform:"uppercase",
  whiteSpace:"nowrap",
  borderBottom:`1px solid ${T.border}`,
});

// Resumo consolidado no estilo do dashboard: KPIs + tabela categoria → serviço
// (linhas expansíveis, como a planilha de orçamento), quebras por fase/padrão/
// faixa e o CTA de aprovação. Módulo é gerador de orçamento: só existe orçado.
export default function SubResumo({ orc, readOnly, T, canAprovar, errosAprovacao = [], onAprovar }) {
  const totais = calcTotais(orc);
  const numJogos = (orc.jogos || []).length;
  const st = ORC_STATUS[orc.meta.status] || ORC_STATUS.rascunho;
  const [abertas, setAbertas] = useState(() => new Set());

  const faseLabel = (key) => (orc.meta.fases || []).find(f => f.key === key)?.label || key;
  const porFaseLabels = Object.fromEntries(Object.entries(totais.porFase).map(([k, v]) => [faseLabel(k), v]));

  // Total por subKey somando todos os jogos (mesmo motor da aprovação).
  const linhas = useMemo(() => {
    const porSub = {};
    (orc.jogos || []).forEach(j => {
      const orcado = calcOrcadoJogo(orc, j);
      for (const [k, v] of Object.entries(orcado)) porSub[k] = (porSub[k] || 0) + (v || 0);
    });
    const grupos = [
      { key:"logistica", label:CATS[0].label, color:CATS[0].color, subs:CATS[0].subs },
      ...GRUPOS_PREMISSA,
    ].map(g => ({
      key: g.key,
      label: g.label,
      color: g.color,
      tipo: "variavel",
      itens: g.subs
        .map(sub => ({ key: sub.key, label: sub.label, valor: porSub[sub.key] || 0 }))
        .filter(it => it.valor > 0)
        .sort((a, b) => b.valor - a.valor),
    }));
    // Serviços fixos: itens agrupados por seção (cabeçalho com subtotal).
    const fixosItens = (orc.servicosFixos || []).flatMap(sec => {
      const itens = (sec.itens || []).filter(it => (Number(it.orcado) || 0) > 0);
      if (itens.length === 0) return [];
      return [
        { key:`sec_${sec.secao}`, label:sec.secao, valor:itens.reduce((s, it) => s + (Number(it.orcado) || 0), 0), secao:true },
        ...itens.map(it => ({ key:`it_${it.id}`, label:it.nome, valor:Number(it.orcado) || 0 })),
      ];
    });
    grupos.push({ key:"fixos", label:"Serviços Fixos", color:"#a855f7", tipo:"fixo", itens:fixosItens });
    return grupos.map(g => ({
      ...g,
      total: g.key === "fixos" ? totais.totalFixos
        : g.itens.reduce((s, it) => s + it.valor, 0),
    }));
  }, [orc, totais.totalFixos]);

  const toggle = key => setAbertas(prev => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  const totalGeral = totais.totalGeral || 0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* ── KPIs ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        <Stat T={T} label="Total Geral" value={fmtK(totais.totalGeral)} sub={fmt(totais.totalGeral)} color={T.info||"#2563EB"} icon={Wallet}/>
        <Stat T={T} label="Jogos (variável)" value={fmtK(totais.totalJogos)} sub={`${numJogos} jogos estimados`} color={T.brand||"#65B32E"} icon={CalendarDays}/>
        <Stat T={T} label="Serviços Fixos" value={fmtK(totais.totalFixos)} sub="Editar na aba Serviços Fixos" color="#a855f7" icon={Briefcase}/>
        <Stat T={T} label="Média por Jogo" value={numJogos ? fmtK(totais.totalJogos / numJogos) : "—"} sub="Só a parte variável" color={T.warning||"#D97706"} icon={LineChart}/>
      </div>

      {/* ── Resumo por categoria (estilo dashboard, linhas expansíveis) ── */}
      <Card T={T}>
        <SectionHeader
          T={T}
          title="Resumo por Categoria"
          subtitle="Orçamento consolidado por natureza de despesa — clique na linha para abrir o detalhamento por serviço"
          icon={LayoutDashboard}
        />
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
            <thead>
              <tr style={{background:T.surfaceAlt||T.bg}}>
                <th style={thStyle(T, true)}>Categoria</th>
                <th style={thStyle(T, true)}>Tipo</th>
                <th style={thStyle(T)}>Orçado</th>
                <th style={thStyle(T)}>% do Total</th>
                <th style={{...thStyle(T), textAlign:"left", paddingLeft:20}}>Peso</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(g => {
                const pct = totalGeral ? (g.total / totalGeral) * 100 : 0;
                const aberta = abertas.has(g.key);
                const temItens = g.itens.length > 0;
                return [
                  <tr key={g.key} onClick={() => temItens && toggle(g.key)}
                    title={temItens ? (aberta ? "Fechar detalhamento" : "Ver detalhamento por serviço") : undefined}
                    style={{borderTop:`1px solid ${T.border}`,cursor:temItens?"pointer":"default"}}
                    onMouseEnter={e => { if (temItens) e.currentTarget.style.background = T.surfaceAlt||T.bg; }}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{padding:"13px 16px",fontWeight:600,whiteSpace:"nowrap",color:T.text,fontSize:13}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                        <ChevronRight size={14} strokeWidth={2.5} style={{
                          color:temItens ? T.textMd : "transparent",
                          transform:aberta ? "rotate(90deg)" : "none",
                          transition:"transform .15s",
                          flexShrink:0,
                        }}/>
                        <span style={{width:8,height:8,borderRadius:2,background:g.color,flexShrink:0}}/>
                        {g.label}
                      </span>
                    </td>
                    <td style={{padding:"13px 16px"}}><Pill label={g.tipo === "fixo" ? "fixo" : "variável"} color={TIPO_COLOR[g.tipo === "fixo" ? "fixo" : "variavel"]}/></td>
                    <td className="num" style={{padding:"13px 16px",textAlign:"right",whiteSpace:"nowrap",color:T.text,fontSize:13,fontWeight:600}}>{fmt(g.total)}</td>
                    <td className="num" style={{padding:"13px 16px",textAlign:"right",color:T.textMd,fontSize:13}}>{pct.toFixed(1)}%</td>
                    <td style={{padding:"13px 20px",minWidth:120}}>
                      <Progress value={pct} T={T} color={g.color}/>
                    </td>
                  </tr>,
                  ...(aberta ? g.itens.map(it => {
                    const pctIt = totalGeral ? (it.valor / totalGeral) * 100 : 0;
                    return (
                      <tr key={`${g.key}_${it.key}`} style={{borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg}}>
                        <td style={{padding:`${it.secao?"10px":"8px"} 16px ${it.secao?"6px":"8px"} 52px`,whiteSpace:"nowrap",
                          color:it.secao ? T.textSm : T.textMd,
                          fontSize:it.secao ? 10 : 12,
                          fontWeight:it.secao ? 700 : 500,
                          letterSpacing:it.secao ? "0.06em" : 0,
                          textTransform:it.secao ? "uppercase" : "none"}}>
                          {it.label}
                        </td>
                        <td/>
                        <td className="num" style={{padding:"8px 16px",textAlign:"right",whiteSpace:"nowrap",
                          color:it.secao ? T.textSm : T.textMd,fontSize:12,fontWeight:it.secao?600:400,fontFamily:FONT.num}}>{fmt(it.valor)}</td>
                        <td className="num" style={{padding:"8px 16px",textAlign:"right",color:T.textSm,fontSize:11}}>{it.secao ? "" : `${pctIt.toFixed(1)}%`}</td>
                        <td style={{padding:"8px 20px",minWidth:120}}>
                          {!it.secao && <Progress value={g.total ? (it.valor / g.total) * 100 : 0} T={T} color={`${g.color}88`} height={3}/>}
                        </td>
                      </tr>
                    );
                  }) : []),
                ];
              })}
              <tr style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg,fontWeight:700}}>
                <td colSpan={2} style={{padding:"14px 16px",color:T.text,fontSize:12,letterSpacing:"0.04em",textTransform:"uppercase"}}>Total Geral</td>
                <td className="num" style={{padding:"14px 16px",textAlign:"right",color:T.info||"#2563EB",whiteSpace:"nowrap",fontSize:14,fontWeight:600}}>{fmt(totalGeral)}</td>
                <td className="num" style={{padding:"14px 16px",textAlign:"right",color:T.text,fontSize:14}}>100%</td>
                <td/>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Quebras ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18}}>
        {orc.meta.formato !== "pontos_corridos" && <QuebraCard T={T} titulo="Por fase" dados={porFaseLabels}/>}
        <QuebraCard T={T} titulo="Por padrão" dados={totais.porPadrao}/>
        <QuebraCard T={T} titulo="Por faixa de distância" dados={totais.porFaixa} corFixa="#16A34A"/>
      </div>

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
