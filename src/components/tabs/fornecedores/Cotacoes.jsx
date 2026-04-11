import { Card, PanelTitle } from "../../ui";

export default function Cotacoes({ fornecedores, cotacoes, setCotacoes, jogos, T }) {
  return (
    <Card T={T}>
      <PanelTitle T={T} title="Cotações por Campeonato" subtitle="Clique em um campeonato para abrir o formulário de cotação"/>
      <div style={{padding:40,textAlign:"center",color:T.textSm,fontSize:12}}>
        Fase 2 em construção — listagem agrupada por campeonato e formulário.
      </div>
    </Card>
  );
}
