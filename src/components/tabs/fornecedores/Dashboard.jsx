import { useMemo, useState } from "react";
import { RADIUS } from "../../../constants";
import { fmt, fmtK } from "../../../utils";
import { KPI } from "../../shared";
import { Card, PanelTitle, Badge, Chip, tableStyles } from "../../ui";
import { getValorTabela, contarCelulasPreenchidas } from "../../../data/catalogos";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Wallet, Building2, Trophy, Tag, MapPin, Package, Activity,
} from "lucide-react";

const PIE_COLORS = ["#10b981","#3b82f6","#f59e0b","#a855f7","#ef4444","#06b6d4","#ec4899","#84cc16"];

export default function Dashboard({
  fornecedores=[], cotacoes=[], cidades=[], campeonatos=[], tabelas=[],
  filtroCampeonato="todos",
  T,
}) {
  const [aba, setAba] = useState("comparativo");

  const fornById  = useMemo(()=>Object.fromEntries(fornecedores.map(f=>[String(f.id),f])),[fornecedores]);
  const cidadeById = useMemo(()=>Object.fromEntries(cidades.map(c=>[c.id,c])),[cidades]);
  const campById  = useMemo(()=>Object.fromEntries(campeonatos.map(c=>[c.id,c])),[campeonatos]);

  const tabelasEscopo = useMemo(()=>
    (tabelas||[]).filter(t=>filtroCampeonato==="todos"||t.campeonatoId===filtroCampeonato)
  ,[tabelas,filtroCampeonato]);

  const cotacoesEscopo = useMemo(()=>
    cotacoes.filter(c=>filtroCampeonato==="todos"||c.campeonatoId===filtroCampeonato)
  ,[cotacoes,filtroCampeonato]);

  // ── KPIs gerais ─────────────────────────────────────────────────────────
  const kpis = useMemo(()=>{
    const preenchidas = tabelasEscopo.filter(t=>contarCelulasPreenchidas(t)>0);
    const cotAprovadas = cotacoesEscopo.filter(c=>c.status==="aprovada");
    const totalAprovado = cotAprovadas.reduce((s,c)=>s+Number(c.valorTotal||0),0);
    return {
      tabelas: preenchidas.length,
      fornComTabela: new Set(preenchidas.map(t=>String(t.fornecedorId))).size,
      campCobertos: new Set(preenchidas.map(t=>t.campeonatoId)).size,
      cotacoesAprovadas: cotAprovadas.length,
      totalAprovado,
    };
  },[tabelasEscopo,cotacoesEscopo]);

  // ── Linhas de preço para comparativo (item × cidade por fornecedor) ─────
  const linhasPreco = useMemo(()=>{
    const out = [];
    tabelasEscopo.forEach(tab=>{
      const f = fornById[String(tab.fornecedorId)];
      const camp = campById[tab.campeonatoId];
      if (!f||!camp) return;
      const feitos = new Set(tab.itemIds||[]);
      const itens = (camp.itens||[]).filter(i=>i.ativo!==false&&feitos.has(i.id));
      (camp.cidadeIds||[]).forEach(cidId=>{
        itens.forEach(it=>{
          const v = getValorTabela(tab, it.id, cidId);
          if (v!=null&&v>0) out.push({
            fornecedorId:String(tab.fornecedorId), fornecedorNome:f.apelido,
            campeonatoId:tab.campeonatoId, campeonatoNome:camp.nome,
            itemId:it.id, itemNome:it.nome,
            cidadeId:cidId, cidadeNome:cidadeById[cidId]?.nome||cidId,
            valor:Number(v),
          });
        });
      });
    });
    return out;
  },[tabelasEscopo,fornById,campById,cidadeById]);

  const comparativos = useMemo(()=>{
    const grupos = {};
    linhasPreco.forEach(l=>{
      const k = `${l.itemNome}||${l.cidadeNome}`;
      (grupos[k]=grupos[k]||[]).push(l);
    });
    return Object.entries(grupos)
      .map(([k,linhas])=>{
        const sorted = [...linhas].sort((a,b)=>a.valor-b.valor);
        const min=sorted[0]; const max=sorted[sorted.length-1];
        const avg=sorted.reduce((s,x)=>s+x.valor,0)/sorted.length;
        const spread=max.valor-min.valor;
        const spreadPct=min.valor>0?(spread/min.valor)*100:0;
        return {chave:k,itemNome:min.itemNome,cidadeNome:min.cidadeNome,fornCount:sorted.length,min,max,avg,spread,spreadPct,linhas:sorted};
      })
      .filter(g=>g.fornCount>1)
      .sort((a,b)=>b.spreadPct-a.spreadPct);
  },[linhasPreco]);

  const gastoPorFornecedor = useMemo(()=>{
    const map = {};
    cotacoesEscopo.filter(c=>c.status==="aprovada").forEach(c=>{
      const k = String(c.fornecedorId);
      map[k]=(map[k]||0)+Number(c.valorTotal||0);
    });
    return Object.entries(map).map(([id,valor])=>({name:fornById[id]?.apelido||id,value:valor})).sort((a,b)=>b.value-a.value).slice(0,8);
  },[cotacoesEscopo,fornById]);

  const gastoPorCategoria = useMemo(()=>{
    const map = {};
    cotacoesEscopo.filter(c=>c.status==="aprovada").forEach(c=>{
      const k=c.categoria||"—"; map[k]=(map[k]||0)+Number(c.valorTotal||0);
    });
    return Object.entries(map).map(([categoria,valor])=>({categoria,valor})).sort((a,b)=>a.categoria.localeCompare(b.categoria));
  },[cotacoesEscopo]);

  const TS = tableStyles(T);

  const TABS = [
    { key:"comparativo", label:"Comparativo",  icon:Activity },
    { key:"cotacoes",    label:"Gasto",        icon:Wallet },
  ];

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Tabelas preenchidas" value={String(kpis.tabelas)} sub={filtroCampeonato==="todos"?"Todos os campeonatos":campById[filtroCampeonato]?.nome||""} color={T.brand||"#10b981"} T={T}/>
        <KPI label="Fornecedores com tabela" value={String(kpis.fornComTabela)} sub={`de ${fornecedores.length} cadastrados`} color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Cotações aprovadas" value={String(kpis.cotacoesAprovadas)} sub={`Total ${fmtK(kpis.totalAprovado)}`} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Campeonatos cobertos" value={String(kpis.campCobertos)} sub={`de ${campeonatos.length} no catálogo`} color="#a855f7" T={T}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {TABS.map(({key,label,icon:Icon})=>(
          <Chip key={key} active={aba===key} onClick={()=>setAba(key)} T={T}>
            <Icon size={11} style={{marginRight:4,verticalAlign:"-1px"}}/>{label}
          </Chip>
        ))}
      </div>

      {/* ── ABA: Comparativo ─────────────────────────────────────── */}
      {aba==="comparativo"&&(
        <Card T={T} padding={0}>
          <PanelTitle T={T} title="Spread por item · cidade" subtitle="Ordenado pelo maior spread relativo entre fornecedores com tabela preenchida" color={T.info||"#3b82f6"}/>
          {comparativos.length===0?(
            <Empty T={T} icon={Activity} title="Sem comparativo" msg="Para comparar, precisa de pelo menos 2 fornecedores com valor preenchido para o mesmo item × cidade (sub-aba Tabelas de Preço)."/>
          ):(
            <div style={TS.wrap}>
              <table style={{...TS.table,minWidth:920}}>
                <thead>
                  <tr style={TS.thead}>
                    {["Item","Cidade","Forn.","Mais barato","Média","Mais caro","Spread"].map(h=>(
                      <th key={h} style={{...TS.th,...TS.thLeft,...(["Mais barato","Média","Mais caro","Spread"].includes(h)?{textAlign:"right"}:{})}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparativos.map(g=>(
                    <tr key={g.chave} style={TS.tr}>
                      <td style={{...TS.td,fontWeight:600}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><Package size={11} color={T.textSm}/>{g.itemNome}</span></td>
                      <td style={{...TS.td,fontSize:12}}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><MapPin size={11} color={T.textSm}/>{g.cidadeNome}</span></td>
                      <td style={{...TS.td,fontSize:12,color:T.textMd}}>{g.fornCount}</td>
                      <td style={{...TS.td,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontSize:12}}>
                        <div style={{fontWeight:700,color:T.brand||"#10b981"}}>{fmt(g.min.valor)}</div>
                        <div style={{fontSize:10,color:T.textSm,marginTop:2}}>{g.min.fornecedorNome}</div>
                      </td>
                      <td style={{...TS.td,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontSize:12,color:T.textMd}}>{fmt(g.avg)}</td>
                      <td style={{...TS.td,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontSize:12}}>
                        <div style={{fontWeight:700,color:T.danger||"#ef4444"}}>{fmt(g.max.valor)}</div>
                        <div style={{fontSize:10,color:T.textSm,marginTop:2}}>{g.max.fornecedorNome}</div>
                      </td>
                      <td style={{...TS.td,textAlign:"right"}}>
                        <Badge T={T} color={g.spreadPct>50?(T.danger||"#ef4444"):g.spreadPct>20?(T.warning||"#f59e0b"):T.brand||"#10b981"} size="sm">
                          +{g.spreadPct.toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── ABA: Gasto ────────────────────────────────────────── */}
      {aba==="cotacoes"&&(
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16}}>
          <Card T={T} padding={0}>
            <PanelTitle T={T} title="Top fornecedores por valor aprovado" subtitle="Cotações com status aprovada" color={T.brand||"#10b981"}/>
            {gastoPorFornecedor.length===0?(
              <Empty T={T} icon={Building2} title="Sem cotações aprovadas" msg="Aprove cotações para alimentar este gráfico."/>
            ):(
              <div style={{padding:"16px 20px"}}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gastoPorFornecedor} layout="vertical" margin={{left:10}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis type="number" stroke={T.textSm} style={{fontSize:11}} tickFormatter={fmtK}/>
                    <YAxis dataKey="name" type="category" stroke={T.textSm} style={{fontSize:11}} width={120}/>
                    <Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}} formatter={v=>fmt(v)}/>
                    <Bar dataKey="value" fill={T.brand||"#10b981"} radius={[0,6,6,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card T={T} padding={0}>
            <PanelTitle T={T} title="Por categoria" subtitle="Distribuição entre B1/B2..." color={T.info||"#3b82f6"}/>
            {gastoPorCategoria.length===0?(
              <Empty T={T} icon={Tag} title="Sem dados" msg=""/>
            ):(
              <div style={{padding:"16px 20px"}}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={gastoPorCategoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={100}
                      label={({categoria,percent})=>`${categoria} ${(percent*100).toFixed(0)}%`}>
                      {gastoPorCategoria.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}} formatter={v=>fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function Empty({ T, icon:Icon, title, msg }) {
  return (
    <div style={{padding:"40px 20px",textAlign:"center"}}>
      <div style={{width:56,height:56,borderRadius:14,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,color:T.textSm,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
        <Icon size={24} strokeWidth={2}/>
      </div>
      <h3 style={{margin:"0 0 4px",fontSize:14,fontWeight:700,color:T.text}}>{title}</h3>
      {msg&&<p style={{margin:0,fontSize:12,color:T.textMd,maxWidth:380,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>{msg}</p>}
    </div>
  );
}
