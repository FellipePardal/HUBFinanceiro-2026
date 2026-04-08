import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, CartesianGrid } from "recharts";
import { CustomTooltip } from "../shared";
import { fmt, fmtK, subTotal } from "../../utils";
import { PIE_COLORS } from "../../constants";
import { Card, PanelTitle } from "../ui";
import { TrendingUp, PieChart as PieIcon, BarChart3 } from "lucide-react";

export default function TabGraficos({ divulgados, savingRodada, RESUMO_CATS, T }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr",gap:20}}>

      <Card T={T}>
        <PanelTitle T={T} title="Saving por Rodada" subtitle="Diferença Orçado − Provisionado por rodada"/>
        <div style={{padding:20}}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={savingRodada}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="name" tick={{fill:T.textMd,fontSize:11}} axisLine={{stroke:T.border}} tickLine={{stroke:T.border}}/>
              <YAxis tickFormatter={fmtK} tick={{fill:T.textMd,fontSize:11}} axisLine={{stroke:T.border}} tickLine={{stroke:T.border}}/>
              <Tooltip content={<CustomTooltip T={T}/>} cursor={{fill: T.brandSoft || "rgba(16,185,129,0.08)"}}/>
              <Bar dataKey="Saving" fill={T.brand || "#10b981"} radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card T={T}>
        <PanelTitle T={T} title="Distribuição do Budget" subtitle="Participação de cada categoria no orçado total"/>
        <div style={{padding:20}}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={RESUMO_CATS.map(c=>({name:c.nome,value:c.orcado}))}
                cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value"
                label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                labelLine={false}
                stroke={T.surface || T.card}
                strokeWidth={2}
              >
                {RESUMO_CATS.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{background:T.surface||T.card,border:`1px solid ${T.border}`,borderRadius:8}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card T={T}>
        <PanelTitle T={T} title="Orçado por Jogo — B1 vs B2" subtitle="Comparativo de orçamento entre categorias"/>
        <div style={{padding:20}}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={divulgados.map(j=>({name:`R${j.rodada} ${j.mandante.split(" ")[0]}`,valor:subTotal(j.orcado),cat:j.categoria}))}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="name" tick={{fill:T.textMd,fontSize:9}} axisLine={{stroke:T.border}} tickLine={{stroke:T.border}}/>
              <YAxis tickFormatter={fmtK} tick={{fill:T.textMd,fontSize:11}} axisLine={{stroke:T.border}} tickLine={{stroke:T.border}}/>
              <Tooltip content={<CustomTooltip T={T}/>} cursor={{fill: T.brandSoft || "rgba(16,185,129,0.08)"}}/>
              <Bar dataKey="valor" radius={[6,6,0,0]}>
                {divulgados.map(j => <Cell key={j.id} fill={j.categoria==="B1"?(T.brand||"#10b981"):(T.warning||"#f59e0b")}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

    </div>
  );
}
