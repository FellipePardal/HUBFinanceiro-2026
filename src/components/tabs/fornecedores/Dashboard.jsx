import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line, PieChart, Pie, Legend,
} from "recharts";
import { KPI, CustomTooltip } from "../../shared";
import { Card, PanelTitle, Badge, tableStyles, Progress } from "../../ui";
import { fmt, fmtK } from "../../../utils";
import { PIE_COLORS, RADIUS } from "../../../constants";
import { STATUS_COTACAO, statusInfo } from "../../../data/negociacoes";
import { TrendingUp, Target, Clock, Percent } from "lucide-react";

// Calcula saving (R$ proposto - R$ contraproposta aprovada)
const calcSaving = c => {
  if (c.status !== "aprovada") return 0;
  const prop = Number(c.valorProposto || 0);
  const cont = Number(c.valorContraproposta || 0);
  if (!prop || !cont) return 0;
  return Math.max(0, prop - cont);
};

// Dias entre createdAt e updatedAt (tempo de negociação)
const diasNegociacao = c => {
  if (!c.createdAt || !c.updatedAt) return 0;
  const d = (new Date(c.updatedAt) - new Date(c.createdAt)) / 86400000;
  return Math.max(0, Math.round(d));
};

// Score de eficiência por fornecedor: combina taxa de aprovação (0-60) + saving% (0-30) + velocidade (0-10)
function scoreFornecedor(stats) {
  const aprovRate = stats.total > 0 ? (stats.aprovadas / stats.total) : 0;
  const savingRate = stats.valorPropostoTotal > 0 ? (stats.savingTotal / stats.valorPropostoTotal) : 0;
  const tempoMedio = stats.aprovadas > 0 ? (stats.tempoTotal / stats.aprovadas) : 30;
  const velocidadeNorm = Math.max(0, 1 - (tempoMedio / 30)); // 30 dias = 0, 0 dias = 1
  return Math.round(aprovRate * 60 + savingRate * 30 + velocidadeNorm * 10);
}

export default function Dashboard({ fornecedores, cotacoes, jogos, T }) {
  const TS = tableStyles(T);

  const metricas = useMemo(() => {
    const all = cotacoes || [];
    const total = all.length;
    const aprovadas = all.filter(c => c.status === "aprovada");
    const recusadas = all.filter(c => c.status === "recusada");
    const ativas    = all.filter(c => ["aberta","em_analise","negociando"].includes(c.status));

    const taxa = total > 0 ? (aprovadas.length / total) * 100 : 0;
    const savingTotal = aprovadas.reduce((s,c) => s + calcSaving(c), 0);
    const valorPropostoTotal = aprovadas.reduce((s,c) => s + (Number(c.valorProposto)||0), 0);
    const savingPct = valorPropostoTotal > 0 ? (savingTotal / valorPropostoTotal) * 100 : 0;
    const tempoMedio = aprovadas.length > 0
      ? Math.round(aprovadas.reduce((s,c) => s + diasNegociacao(c), 0) / aprovadas.length)
      : 0;

    // Por fornecedor
    const porForn = {};
    (fornecedores||[]).forEach(f => {
      porForn[f.id] = {
        id: f.id,
        nome: f.apelido,
        total: 0, aprovadas: 0, recusadas: 0, ativas: 0,
        savingTotal: 0, valorPropostoTotal: 0, valorContraTotal: 0, tempoTotal: 0,
      };
    });
    all.forEach(c => {
      const s = porForn[c.fornecedorId];
      if (!s) return;
      s.total++;
      if (c.status === "aprovada") { s.aprovadas++; s.savingTotal += calcSaving(c); s.tempoTotal += diasNegociacao(c); s.valorPropostoTotal += Number(c.valorProposto)||0; s.valorContraTotal += Number(c.valorContraproposta)||0; }
      if (c.status === "recusada") s.recusadas++;
      if (["aberta","em_analise","negociando"].includes(c.status)) s.ativas++;
    });
    const ranking = Object.values(porForn)
      .filter(s => s.total > 0)
      .map(s => ({ ...s, score: scoreFornecedor(s) }))
      .sort((a,b) => b.score - a.score);

    // Distribuição por status
    const porStatus = STATUS_COTACAO.map(st => ({
      name: st.label,
      value: all.filter(c => c.status === st.key).length,
      color: st.color,
    })).filter(x => x.value > 0);

    // Volume por mês (últimos 6 meses) — base para tendência
    const meses = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const count = all.filter(c => (c.createdAt||"").slice(0,7) === key).length;
      const saving = all.filter(c => (c.updatedAt||"").slice(0,7) === key && c.status === "aprovada").reduce((s,c) => s + calcSaving(c), 0);
      meses.push({ name: label, Volume: count, Saving: saving, key });
    }
    // Tendência linear simples (previsão próximo mês)
    if (meses.length >= 2) {
      const xs = meses.map((_,i) => i);
      const ys = meses.map(m => m.Volume);
      const n = xs.length;
      const sumX = xs.reduce((a,b)=>a+b,0);
      const sumY = ys.reduce((a,b)=>a+b,0);
      const sumXY = xs.reduce((a,_,i)=>a+xs[i]*ys[i],0);
      const sumXX = xs.reduce((a,x)=>a+x*x,0);
      const m = (n*sumXY - sumX*sumY) / ((n*sumXX - sumX*sumX) || 1);
      const b = (sumY - m*sumX) / n;
      const prev = Math.max(0, Math.round(m*n + b));
      const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      meses.push({
        name: proxMes.toLocaleDateString("pt-BR", { month:"short", year:"2-digit" }) + " (prev.)",
        Volume: null,
        Previsao: prev,
      });
      meses.forEach((m,i) => { if (i < meses.length-1) m.Previsao = Math.max(0, Math.round((meses.length-2 === i ? prev : null))); });
    }

    return { total, aprovadas: aprovadas.length, recusadas: recusadas.length, ativas: ativas.length, taxa, savingTotal, savingPct, tempoMedio, ranking, porStatus, meses };
  }, [cotacoes, fornecedores]);

  // Top 10 fornecedores para o gráfico
  const topFornecedoresChart = metricas.ranking.slice(0, 10).map(r => ({
    name: r.nome.length > 14 ? r.nome.slice(0,14)+"…" : r.nome,
    Score: r.score,
    Saving: r.savingTotal,
  }));

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label="Taxa de Aprovação" value={`${metricas.taxa.toFixed(0)}%`} sub={`${metricas.aprovadas} de ${metricas.total} cotações`} color={T.brand||"#10b981"} T={T}/>
        <KPI label="Saving Total"       value={fmtK(metricas.savingTotal)}    sub={`${metricas.savingPct.toFixed(1)}% do proposto`} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Tempo Médio"        value={`${metricas.tempoMedio}d`}     sub="Por negociação aprovada" color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Cotações Ativas"    value={String(metricas.ativas)}       sub="Em andamento" color="#a855f7" T={T}/>
      </div>

      {/* Gráficos: ranking + volume/previsão */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(420px,1fr))",gap:16,marginBottom:16}}>
        <Card T={T}>
          <PanelTitle T={T} title="Ranking de Eficiência" subtitle="Score por fornecedor (aprovação + saving + velocidade)"/>
          <div style={{padding:"16px 12px 12px"}}>
            {topFornecedoresChart.length === 0 ? (
              <div style={{padding:32,textAlign:"center",color:T.textSm,fontSize:12}}>Sem dados suficientes. Registre cotações aprovadas para ver o ranking.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topFornecedoresChart} layout="vertical" margin={{left:20,right:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis type="number" tick={{fill:T.textMd,fontSize:10}} axisLine={{stroke:T.border}} tickLine={{stroke:T.border}}/>
                  <YAxis type="category" dataKey="name" tick={{fill:T.textMd,fontSize:10}} axisLine={{stroke:T.border}} tickLine={{stroke:T.border}} width={100}/>
                  <Tooltip cursor={{fill:T.brandSoft||"rgba(16,185,129,0.08)"}} contentStyle={{background:T.surface||T.card,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}/>
                  <Bar dataKey="Score" radius={[0,6,6,0]}>
                    {topFornecedoresChart.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card T={T}>
          <PanelTitle T={T} title="Volume de Cotações" subtitle="Últimos 6 meses + previsão linear"/>
          <div style={{padding:"16px 12px 12px"}}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={metricas.meses}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="name" tick={{fill:T.textMd,fontSize:10}} axisLine={{stroke:T.border}} tickLine={{stroke:T.border}}/>
                <YAxis tick={{fill:T.textMd,fontSize:10}} axisLine={{stroke:T.border}} tickLine={{stroke:T.border}}/>
                <Tooltip contentStyle={{background:T.surface||T.card,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}/>
                <Legend wrapperStyle={{fontSize:11,color:T.textMd}}/>
                <Line type="monotone" dataKey="Volume"   stroke={T.brand||"#10b981"} strokeWidth={2.5} dot={{r:4}} activeDot={{r:6}}/>
                <Line type="monotone" dataKey="Previsao" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={{r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Pie de status + tabela de ranking */}
      <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:16}}>
        <Card T={T}>
          <PanelTitle T={T} title="Distribuição por Status"/>
          <div style={{padding:"16px 12px"}}>
            {metricas.porStatus.length === 0 ? (
              <div style={{padding:32,textAlign:"center",color:T.textSm,fontSize:12}}>Sem cotações.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={metricas.porStatus}
                    cx="50%" cy="50%"
                    outerRadius={90} innerRadius={50}
                    dataKey="value"
                    stroke={T.surface||T.card}
                    strokeWidth={2}
                    label={({name, percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {metricas.porStatus.map((s,i) => <Cell key={i} fill={s.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:T.surface||T.card,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card T={T}>
          <PanelTitle T={T} title="Performance Detalhada" subtitle={`${metricas.ranking.length} fornecedor${metricas.ranking.length!==1?"es":""} com cotações`}/>
          <div style={TS.wrap}>
            <table style={{...TS.table, minWidth:620}}>
              <thead>
                <tr style={TS.thead}>
                  {["#","Fornecedor","Total","Aprov.","Saving","Score",""].map(h =>
                    <th key={h} style={{...TS.th, ...(["Total","Aprov.","Saving","Score"].includes(h) ? TS.thRight : TS.thLeft)}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {metricas.ranking.length === 0 && (
                  <tr><td colSpan={7} style={{padding:32,textAlign:"center",color:T.textSm,fontSize:12}}>
                    Nenhum fornecedor com cotações registradas.
                  </td></tr>
                )}
                {metricas.ranking.slice(0, 15).map((r, i) => (
                  <tr key={r.id} style={TS.tr}>
                    <td style={{...TS.td,width:30,fontWeight:700,color:i<3?(T.brand||"#10b981"):T.textSm}}>{i+1}</td>
                    <td style={{...TS.td,fontWeight:600}}>{r.nome}</td>
                    <td className="num" style={TS.tdNum}>{r.total}</td>
                    <td className="num" style={{...TS.tdNum,fontWeight:600,color:T.brand||"#10b981"}}>{r.aprovadas}</td>
                    <td className="num" style={{...TS.tdNum,fontWeight:600,color:T.info||"#3b82f6"}}>{r.savingTotal > 0 ? fmt(r.savingTotal) : "—"}</td>
                    <td className="num" style={{...TS.tdNum,fontWeight:700}}>{r.score}</td>
                    <td style={{...TS.td,minWidth:120}}><Progress value={r.score} T={T}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
