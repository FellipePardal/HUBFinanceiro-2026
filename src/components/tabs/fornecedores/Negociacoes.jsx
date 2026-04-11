import { KPI } from "../../shared";
import { Card, PanelTitle, Button } from "../../ui";
import { Plus, FileText, Users, CalendarDays } from "lucide-react";

// Fase 2 implementará: KPIs dinâmicos, botão Nova Cotação, lista de cotações recentes.
// Placeholder mínimo só para a sub-aba existir e o wrapper renderizar algo.
export default function Negociacoes({ fornecedores, cotacoes, setCotacoes, jogos, T }) {
  const cotacoesAtivas = (cotacoes || []).filter(c => ["aberta","em_analise","negociando"].includes(c.status)).length;
  const fornecedoresAtivos = new Set((cotacoes || []).map(c => c.fornecedorId).filter(Boolean)).size;
  const hoje = new Date().toISOString().slice(0,10);
  const jogosProgramados = (jogos || []).filter(j => j.data && j.data !== "A definir" && j.data >= hoje).length;

  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label="Cotações Ativas"     value={String(cotacoesAtivas)}     sub="Em negociação"        color={T.info||"#3b82f6"}    T={T}/>
        <KPI label="Fornecedores Ativos" value={String(fornecedoresAtivos)} sub="Com cotação em aberto" color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Jogos Programados"   value={String(jogosProgramados)}   sub="Futuros"              color={T.brand||"#10b981"}   T={T}/>
      </div>

      <Card T={T}>
        <PanelTitle
          T={T}
          title="Cotações Recentes"
          subtitle="Últimas negociações abertas ou atualizadas"
          right={<Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>{}}>Nova Cotação</Button>}
        />
        <div style={{padding:40,textAlign:"center",color:T.textSm,fontSize:12}}>
          Fase 2 em construção — listagem de cotações recentes.
        </div>
      </Card>
    </>
  );
}
