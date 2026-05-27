import { useMemo, useState } from "react";
import { RADIUS } from "../../../constants";
import { fmt, fmtK } from "../../../utils";
import { KPI } from "../../shared";
import { Card, PanelTitle, Badge, Chip, tableStyles } from "../../ui";
import { getCelula, getValoresVigentes, statusNegociacaoInfo, migrarTabelaLegada, calcularDeltaRodadas, getRodadaAtual } from "../../../data/catalogos";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Building2,
  Trophy, Tag, MapPin, Package, Activity,
  RefreshCw, CheckCircle2, Clock,
} from "lucide-react";

const PIE_COLORS = ["#10b981","#3b82f6","#f59e0b","#a855f7","#ef4444","#06b6d4","#ec4899","#84cc16"];

export default function Dashboard({
  fornecedores=[], cotacoes=[], cidades=[], campeonatos=[], tabelas=[],
  filtroCampeonato="todos",
  T,
}) {
  const [aba, setAba] = useState("negociacoes");

  const fornById  = useMemo(()=>Object.fromEntries(fornecedores.map(f=>[String(f.id),f])),[fornecedores]);
  const cidadeById = useMemo(()=>Object.fromEntries(cidades.map(c=>[c.id,c])),[cidades]);
  const campById  = useMemo(()=>Object.fromEntries(campeonatos.map(c=>[c.id,c])),[campeonatos]);

  const tabelasMigradas = useMemo(()=>tabelas.map(migrarTabelaLegada),[tabelas]);

  const tabelasEscopo = useMemo(()=>
    tabelasMigradas.filter(t=>filtroCampeonato==="todos"||t.campeonatoId===filtroCampeonato)
  ,[tabelasMigradas,filtroCampeonato]);

  const cotacoesEscopo = useMemo(()=>
    cotacoes.filter(c=>filtroCampeonato==="todos"||c.campeonatoId===filtroCampeonato)
  ,[cotacoes,filtroCampeonato]);

  // ── KPIs gerais ─────────────────────────────────────────────────────────
  const kpis = useMemo(()=>{
    const aprovadas = tabelasEscopo.filter(t=>t.status==="aprovada");
    const cotAprovadas = cotacoesEscopo.filter(c=>c.status==="aprovada");
    const totalAprovado = cotAprovadas.reduce((s,c)=>s+Number(c.valorTotal||0),0);
    const emAndamento = tabelasEscopo.filter(t=>["aguardando_forn","em_analise","contraproposta"].includes(t.status));
    return {
      aprovadas: aprovadas.length,
      emAndamento: emAndamento.length,
      cotacoesAprovadas: cotAprovadas.length,
      totalAprovado,
      fornAtivos: new Set(aprovadas.map(t=>String(t.fornecedorId))).size,
    };
  },[tabelasEscopo,cotacoesEscopo]);

  // ── Dados por negociação ─────────────────────────────────────────────────
  const negsOrdenadas = useMemo(()=>
    [...tabelasEscopo]
      .filter(t=>t.status!=="arquivada")
      .map(t=>({
        ...t,
        _forn: fornById[String(t.fornecedorId)],
        _camp: campById[t.campeonatoId],
        _delta: calcularDeltaRodadas(t),
        _rodadas: t.rodadas?.length||1,
        _rodadaAtual: getRodadaAtual(t),
      }))
      .sort((a,b)=>(b.atualizadoEm||"").localeCompare(a.atualizadoEm||""))
  ,[tabelasEscopo,fornById,campById]);

  // ── Linhas vigentes para comparativo ────────────────────────────────────
  const linhasVigentes = useMemo(()=>{
    const out = [];
    tabelasEscopo.filter(t=>t.status==="aprovada").forEach(tab=>{
      const f = fornById[String(tab.fornecedorId)];
      const camp = campById[tab.campeonatoId];
      if (!f||!camp) return;
      const itens = camp.itens?.length ? camp.itens.filter(i=>i.ativo!==false) : (f.catalogo||[]).filter(i=>i.ativo!==false);
      const vals = getValoresVigentes(tab);
      const fakeTab = { valores: vals };
      (camp.cidadeIds||[]).forEach(cidId=>{
        (camp.categorias||[]).forEach(cat=>{
          itens.forEach(it=>{
            const v = getCelula(fakeTab, it.id, cidId, cat.codigo);
            if (v!=null&&v>0) out.push({
              fornecedorId:String(tab.fornecedorId), fornecedorNome:f.apelido,
              campeonatoId:tab.campeonatoId, campeonatoNome:camp.nome, ano:camp.ano,
              itemId:it.id, itemNome:it.nome,
              cidadeId:cidId, cidadeNome:cidadeById[cidId]?.nome||cidId,
              categoria:cat.codigo, valor:Number(v),
            });
          });
        });
      });
    });
    return out;
  },[tabelasEscopo,fornById,campById,cidadeById]);

  const comparativos = useMemo(()=>{
    const grupos = {};
    linhasVigentes.forEach(l=>{
      const k = `${l.itemNome}||${l.cidadeNome}||${l.categoria}`;
      (grupos[k]=grupos[k]||[]).push(l);
    });
    return Object.entries(grupos)
      .map(([k,linhas])=>{
        const sorted = [...linhas].sort((a,b)=>a.valor-b.valor);
        const min=sorted[0]; const max=sorted[sorted.length-1];
        const avg=sorted.reduce((s,x)=>s+x.valor,0)/sorted.length;
        const spread=max.valor-min.valor;
        const spreadPct=min.valor>0?(spread/min.valor)*100:0;
        return {chave:k,itemNome:min.itemNome,cidadeNome:min.cidadeNome,categoria:min.categoria,fornCount:sorted.length,min,max,avg,spread,spreadPct,linhas:sorted};
      })
      .filter(g=>g.fornCount>1)
      .sort((a,b)=>b.spreadPct-a.spreadPct);
  },[linhasVigentes]);

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

  const evolucaoRodadas = useMemo(()=>{
    return negsOrdenadas
      .filter(n=>n._rodadas>1&&n._delta!==null)
      .sort((a,b)=>Math.abs(b._delta)-Math.abs(a._delta))
      .slice(0,10);
  },[negsOrdenadas]);

  const TS = tableStyles(T);

  const TABS = [
    { key:"negociacoes", label:"Negociações",  icon:RefreshCw },
    { key:"comparativo", label:"Comparativo",  icon:Activity },
    { key:"evolucao",    label:"Evolução",     icon:TrendingUp },
    { key:"cotacoes",    label:"Gasto",        icon:Wallet },
  ];

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Negociações aprovadas" value={String(kpis.aprovadas)} sub={filtroCampeonato==="todos"?"Todos os campeonatos":campById[filtroCampeonato]?.nome||""} color={T.brand||"#10b981"} T={T}/>
        <KPI label="Em andamento" value={String(kpis.emAndamento)} sub="Aguardando / análise / contra-proposta" color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Cotações aprovadas" value={String(kpis.cotacoesAprovadas)} sub={`Total ${fmtK(kpis.totalAprovado)}`} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Fornecedores ativos" value={String(kpis.fornAtivos)} sub="Com negociação aprovada" color="#a855f7" T={T}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {TABS.map(({key,label,icon:Icon})=>(
          <Chip key={key} active={aba===key} onClick={()=>setAba(key)} T={T}>
            <Icon size={11} style={{marginRight:4,verticalAlign:"-1px"}}/>{label}
          </Chip>
        ))}
      </div>

      {/* ── ABA: Negociações ───────────────────────────────────── */}
      {aba==="negociacoes"&&(
        <Card T={T} padding={0}>
          <PanelTitle T={T}
            title="Status das Negociações"
            subtitle="Todas as negociações ativas — histórico de rodadas e variação de preço"
            color={T.brand||"#10b981"}
          />
          {negsOrdenadas.length===0?(
            <Empty T={T} icon={RefreshCw} title="Sem negociações" msg="Crie negociações na sub-aba Negociações."/>
          ):(
            <div style={TS.wrap}>
              <table style={{...TS.table,minWidth:900}}>
                <thead>
                  <tr style={TS.thead}>
                    {["Fornecedor","Campeonato","Status","Rodadas","Última atividade","Variação total","Obs. atual"].map(h=>(
                      <th key={h} style={{...TS.th,...TS.thLeft,...(["Variação total"].includes(h)?{textAlign:"right"}:{})}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {negsOrdenadas.map(n=>{
                    const st = statusNegociacaoInfo(n.status);
                    return (
                      <tr key={n.id} style={TS.tr}>
                        <td style={{...TS.td,fontWeight:600}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:7}}><Building2 size={13} color={T.textSm}/>{n._forn?.apelido||"(removido)"}</span>
                        </td>
                        <td style={{...TS.td,fontSize:12,color:T.textMd}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Trophy size={12} color={T.textSm}/>{n._camp?.nome||"(removido)"}</span>
                        </td>
                        <td style={TS.td}><Badge T={T} color={st.color} size="sm">{st.label}</Badge></td>
                        <td style={{...TS.td,fontSize:12}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,color:T.textMd}}>
                            <RefreshCw size={11}/> {n._rodadas} rodada{n._rodadas!==1?"s":""}
                            {n._rodadaAtual?.propostaPor&&(
                              <span style={{fontSize:10,color:T.textSm}}>· {n._rodadaAtual.propostaPor==="livemode"?"Livemode":"Fornecedor"}</span>
                            )}
                          </span>
                        </td>
                        <td style={{...TS.td,fontSize:11,color:T.textSm}}>
                          <Clock size={11} style={{display:"inline",verticalAlign:"-1px",marginRight:4}}/>
                          {n.atualizadoEm?new Date(n.atualizadoEm).toLocaleDateString("pt-BR"):"—"}
                        </td>
                        <td style={{...TS.td,textAlign:"right"}}>
                          {n._delta!==null?(
                            <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,color:n._delta>0?(T.brand||"#10b981"):(T.danger||"#ef4444")}}>
                              {n._delta>0?<TrendingDown size={12}/>:<TrendingUp size={12}/>}
                              {n._delta>0?"-":"+"}{Math.abs(n._delta).toFixed(1)}%
                            </span>
                          ):<span style={{color:T.textSm,fontSize:11}}>1ª rodada</span>}
                        </td>
                        <td style={{...TS.td,fontSize:11,color:T.textSm,maxWidth:200}}>
                          <span style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {n._rodadaAtual?.observacoes||"—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── ABA: Evolução por rodadas ───────────────────────────── */}
      {aba==="evolucao"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card T={T} padding={0}>
            <PanelTitle T={T} title="Variação por negociação" subtitle="Diferença entre 1ª e última rodada — apenas negociações com mais de 1 rodada" color={T.brand||"#10b981"}/>
            {evolucaoRodadas.length===0?(
              <Empty T={T} icon={RefreshCw} title="Sem histórico" msg="Quando uma negociação tiver mais de uma rodada, o comparativo aparece aqui."/>
            ):(
              <div style={{padding:"4px 16px 16px"}}>
                {evolucaoRodadas.map(n=>(
                  <div key={n.id} style={{padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.text}}>{n._forn?.apelido}</div>
                        <div style={{fontSize:11,color:T.textSm,marginTop:2}}>{n._camp?.nome}</div>
                        <div style={{fontSize:11,color:T.textMd,marginTop:4}}>
                          {n._rodadas} rodadas · Última: {n._rodadaAtual?.propostaPor==="livemode"?"Livemode":"Fornecedor"}
                        </div>
                      </div>
                      <Badge T={T} color={n._delta>0?(T.brand||"#10b981"):(T.danger||"#ef4444")} size="md">
                        {n._delta>0?<TrendingDown size={11} style={{marginRight:3,verticalAlign:"-1px"}}/>:<TrendingUp size={11} style={{marginRight:3,verticalAlign:"-1px"}}/>}
                        {n._delta>0?"-":"+"}{Math.abs(n._delta).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card T={T} padding={0}>
            <PanelTitle T={T} title="Comparativo entre fornecedores" subtitle="Mesmo item/cidade/categoria — min vs. max entre aprovados" color={T.info||"#3b82f6"}/>
            {comparativos.length===0?(
              <Empty T={T} icon={Activity} title="Sem dados comparativos" msg="Precisa de pelo menos 2 fornecedores com negociação aprovada cobrindo o mesmo item × cidade × categoria."/>
            ):(
              <div style={{padding:"4px 16px 16px",maxHeight:380,overflowY:"auto"}}>
                {comparativos.slice(0,8).map(g=>(
                  <div key={g.chave} style={{padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:6}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:T.text,display:"flex",alignItems:"center",gap:6}}>
                          <Package size={11} color={T.textSm}/>{g.itemNome}
                          <span style={{color:T.textMd,fontWeight:400,fontSize:11}}>· {g.cidadeNome}</span>
                          <span style={{padding:"1px 6px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",color:T.brand||"#10b981",fontSize:10,fontWeight:700}}>{g.categoria}</span>
                        </div>
                        <div style={{fontSize:11,color:T.textSm,marginTop:3}}>{g.fornCount} fornecedores</div>
                      </div>
                      <Badge T={T} color={g.spreadPct>50?(T.danger||"#ef4444"):g.spreadPct>20?(T.warning||"#f59e0b"):T.brand||"#10b981"} size="sm">
                        spread +{g.spreadPct.toFixed(0)}%
                      </Badge>
                    </div>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,color:T.brand||"#10b981",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>{fmt(g.min.valor)}</span>
                      <span style={{fontSize:10,color:T.textSm}}>{g.min.fornecedorNome}</span>
                      <span style={{flex:1,height:3,background:`linear-gradient(to right, ${T.brand||"#10b981"}, ${T.danger||"#ef4444"})`,borderRadius:4,margin:"0 8px"}}/>
                      <span style={{fontSize:11,fontWeight:700,color:T.danger||"#ef4444",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>{fmt(g.max.valor)}</span>
                      <span style={{fontSize:10,color:T.textSm}}>{g.max.fornecedorNome}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── ABA: Comparativo detalhado ─────────────────────────── */}
      {aba==="comparativo"&&(
        <Card T={T} padding={0}>
          <PanelTitle T={T} title="Spread por item · cidade · categoria" subtitle="Ordenado pelo maior spread relativo entre fornecedores aprovados" color={T.info||"#3b82f6"}/>
          {comparativos.length===0?(
            <Empty T={T} icon={Activity} title="Sem comparativo" msg="Para comparar, precisa de pelo menos 2 fornecedores com negociação aprovada cobrindo o mesmo item × cidade × categoria."/>
          ):(
            <div style={TS.wrap}>
              <table style={{...TS.table,minWidth:920}}>
                <thead>
                  <tr style={TS.thead}>
                    {["Item","Cidade","Cat.","Forn.","Mais barato","Média","Mais caro","Spread"].map(h=>(
                      <th key={h} style={{...TS.th,...TS.thLeft,...(["Mais barato","Média","Mais caro","Spread"].includes(h)?{textAlign:"right"}:{})}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparativos.map(g=>(
                    <tr key={g.chave} style={TS.tr}>
                      <td style={{...TS.td,fontWeight:600}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><Package size={11} color={T.textSm}/>{g.itemNome}</span></td>
                      <td style={{...TS.td,fontSize:12}}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><MapPin size={11} color={T.textSm}/>{g.cidadeNome}</span></td>
                      <td style={TS.td}><span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",color:T.brand||"#10b981",fontSize:11,fontWeight:700}}><Tag size={10}/>{g.categoria}</span></td>
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
