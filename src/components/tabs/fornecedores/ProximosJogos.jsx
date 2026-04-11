import { Card, PanelTitle } from "../../ui";

export default function ProximosJogos({ jogos, cotacoes, T }) {
  return (
    <Card T={T}>
      <PanelTitle T={T} title="Próximos Jogos" subtitle="Controle de jogos futuros"/>
      <div style={{padding:40,textAlign:"center",color:T.textSm,fontSize:12}}>
        Fase 3 em construção — tabela de jogos futuros com filtros e highlights.
      </div>
    </Card>
  );
}
