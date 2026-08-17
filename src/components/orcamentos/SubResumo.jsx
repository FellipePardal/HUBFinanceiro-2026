import { FONT, SECAO_COLORS } from "../../constants";
import { Card, SectionHeader, Stat, Button, Progress } from "../ui";
import { calcTotais, ORC_STATUS } from "../../data/orcamentos";
import { fmt, fmtK } from "../../utils";
import {
  LineChart, Wallet, CalendarDays, Briefcase, Trophy, AlertCircle,
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

// Resumo consolidado: KPIs, quebras por categoria/fase/padrão/faixa, resumo
// dos serviços fixos (edição na aba Serviços Fixos) e o CTA de aprovação.
export default function SubResumo({ orc, readOnly, T, canAprovar, errosAprovacao = [], onAprovar }) {
  const totais = calcTotais(orc);
  const numJogos = (orc.jogos || []).length;
  const st = ORC_STATUS[orc.meta.status] || ORC_STATUS.rascunho;

  const faseLabel = (key) => (orc.meta.fases || []).find(f => f.key === key)?.label || key;
  const porFaseLabels = Object.fromEntries(Object.entries(totais.porFase).map(([k, v]) => [faseLabel(k), v]));
  const porSecaoFixos = Object.fromEntries(
    (orc.servicosFixos || []).map(sec => [sec.secao, sec.itens.reduce((s, it) => s + (Number(it.orcado) || 0), 0)])
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* ── KPIs ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        <Stat T={T} label="Total Geral" value={fmtK(totais.totalGeral)} sub={fmt(totais.totalGeral)} color={T.info||"#2563EB"} icon={Wallet}/>
        <Stat T={T} label="Jogos (variável)" value={fmtK(totais.totalJogos)} sub={`${numJogos} jogos estimados`} color={T.brand||"#65B32E"} icon={CalendarDays}/>
        <Stat T={T} label="Serviços Fixos" value={fmtK(totais.totalFixos)} sub="Editar na aba Serviços Fixos" color="#a855f7" icon={Briefcase}/>
        <Stat T={T} label="Média por Jogo" value={numJogos ? fmtK(totais.totalJogos / numJogos) : "—"} sub="Só a parte variável" color={T.warning||"#D97706"} icon={LineChart}/>
      </div>

      {/* ── Quebras ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18}}>
        <QuebraCard T={T} titulo="Por categoria" dados={Object.fromEntries(totais.porCategoria.map(c => [c.label, c.total]))}/>
        {orc.meta.formato !== "pontos_corridos" && <QuebraCard T={T} titulo="Por fase" dados={porFaseLabels}/>}
        <QuebraCard T={T} titulo="Por padrão" dados={totais.porPadrao}/>
        <QuebraCard T={T} titulo="Por faixa de distância" dados={totais.porFaixa} corFixa="#16A34A"/>
      </div>

      {/* ── Serviços fixos (leitura — edição na aba Serviços Fixos) ── */}
      <Card T={T}>
        <SectionHeader T={T} icon={Briefcase} title="Serviços fixos estimados"
          subtitle="Resumo por seção — a edição fica na aba Serviços Fixos"
          right={<span className="num" style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:FONT.num}}>{fmt(totais.totalFixos)}</span>}/>
        <div style={{padding:"14px 20px 18px",display:"flex",gap:24,flexWrap:"wrap"}}>
          {Object.keys(porSecaoFixos).length === 0 && (
            <p style={{margin:0,fontSize:12,color:T.textSm}}>Nenhum serviço fixo estimado ainda.</p>
          )}
          {Object.entries(porSecaoFixos).map(([secao, valor]) => (
            <div key={secao}>
              <p style={{margin:0,fontSize:10,color:SECAO_COLORS[secao]||T.textSm,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700}}>{secao}</p>
              <p className="num" style={{margin:"4px 0 0",fontSize:16,fontWeight:700,color:T.text,fontFamily:FONT.num}}>{fmt(valor)}</p>
            </div>
          ))}
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
