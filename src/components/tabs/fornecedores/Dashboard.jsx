import { Card, PanelTitle } from "../../ui";

export default function Dashboard({ fornecedores, cotacoes, jogos, T }) {
  return (
    <Card T={T}>
      <PanelTitle T={T} title="Dashboard de Eficiência" subtitle="Performance das negociações por fornecedor"/>
      <div style={{padding:40,textAlign:"center",color:T.textSm,fontSize:12}}>
        Fase 5 em construção — análise preditiva com Recharts.
      </div>
    </Card>
  );
}
