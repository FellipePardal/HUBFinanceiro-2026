import { Card, PanelTitle } from "../../ui";

export default function Chat({ fornecedores, cotacoes, T }) {
  return (
    <Card T={T}>
      <PanelTitle T={T} title="Chat por Fornecedor" subtitle="Canal de negociação com IA intermediadora"/>
      <div style={{padding:40,textAlign:"center",color:T.textSm,fontSize:12}}>
        Fase 4 em construção — chat, upload de propostas, link público.
      </div>
    </Card>
  );
}
