import { useMemo, useState } from "react";
import { RADIUS } from "../../../constants";
import { fmt, fmtK } from "../../../utils";
import { KPI } from "../../shared";
import { Card, PanelTitle, Badge, Chip, tableStyles } from "../../ui";
import { getCelula } from "../../../data/catalogos";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Building2, FileSpreadsheet,
  Trophy, Layers, Tag, MapPin, Package, Activity,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD — eficiência das negociações + evolução de preços
// ----------------------------------------------------------------------------
// Métricas focadas em duas perguntas:
//   1. Quanto estou pagando por (item, cidade, categoria) e quem cobra mais?
//   2. Como o preço de cada serviço evoluiu entre versões/campeonatos/anos?
//
// Quando houver mais de uma versão (vigente + arquivadas) para o mesmo
// fornecedor + campeonato, o saving aparece como diferença % entre versões.
// Quando houver mais de um ano por fornecedor, o gráfico de evolução cresce.
// ════════════════════════════════════════════════════════════════════════════

const PIE_COLORS = ["#10b981","#3b82f6","#f59e0b","#a855f7","#ef4444","#06b6d4","#ec4899","#84cc16"];

export default function Dashboard({
  fornecedores = [],
  cotacoes = [],
  cidades = [],
  campeonatos = [],
  tabelas = [],
  filtroCampeonato = "todos",
  T,
}) {
  const [aba, setAba] = useState("comparativo"); // comparativo | evolucao | cotacoes

  const fornById = useMemo(() => Object.fromEntries(fornecedores.map(f => [String(f.id), f])), [fornecedores]);
  const cidadeById = useMemo(() => Object.fromEntries(cidades.map(c => [c.id, c])), [cidades]);
  const campById = useMemo(() => Object.fromEntries(campeonatos.map(c => [c.id, c])), [campeonatos]);

  // Escopo: campeonato selecionado ou todos
  const tabelasEscopo = useMemo(() =>
    tabelas.filter(t => filtroCampeonato === "todos" || t.campeonatoId === filtroCampeonato),
    [tabelas, filtroCampeonato]
  );
  const cotacoesEscopo = useMemo(() =>
    cotacoes.filter(c => filtroCampeonato === "todos" || c.campeonatoId === filtroCampeonato),
    [cotacoes, filtroCampeonato]
  );

  // ── KPIs gerais ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const vigentes = tabelasEscopo.filter(t => t.status === "vigente");
    const aprovadas = cotacoesEscopo.filter(c => c.status === "aprovada");
    const totalAprovado = aprovadas.reduce((s,c) => s + Number(c.valorTotal||0), 0);
    const ticketMedio = aprovadas.length ? totalAprovado / aprovadas.length : 0;
    const fornAtivos = new Set(vigentes.map(t => String(t.fornecedorId))).size;
    return {
      vigentes: vigentes.length,
      cotacoesAprovadas: aprovadas.length,
      totalAprovado,
      ticketMedio,
      fornAtivos,
    };
  }, [tabelasEscopo, cotacoesEscopo]);

  // ── Linha base: registros achatados (item × cidade × categoria) ──────────
  // Para cada tabela vigente, gera linhas {fornecedorId, item, cidade, cat, valor}
  const linhasVigentes = useMemo(() => {
    const out = [];
    tabelasEscopo.filter(t => t.status === "vigente").forEach(tab => {
      const f = fornById[String(tab.fornecedorId)];
      const camp = campById[tab.campeonatoId];
      if (!f || !camp) return;
      const itens = (f.catalogo || []).filter(i => i.ativo !== false);
      const cidadesIds = camp.cidadeIds || [];
      const cats = (camp.categorias || []).map(c => c.codigo);
      itens.forEach(it => {
        cidadesIds.forEach(cidId => {
          cats.forEach(cat => {
            const v = getCelula(tab, it.id, cidId, cat);
            if (v != null && v > 0) {
              out.push({
                fornecedorId: String(tab.fornecedorId),
                fornecedorNome: f.apelido,
                campeonatoId: tab.campeonatoId,
                campeonatoNome: camp.nome,
                ano: camp.ano,
                itemId: it.id,
                itemNome: it.nome,
                cidadeId: cidId,
                cidadeNome: cidadeById[cidId]?.nome || cidId,
                categoria: cat,
                valor: Number(v),
              });
            }
          });
        });
      });
    });
    return out;
  }, [tabelasEscopo, fornById, campById, cidadeById]);

  // ── Comparativo: para cada (item, cidade, categoria), quem é mais barato/caro ──
  const comparativos = useMemo(() => {
    const grupos = {};
    linhasVigentes.forEach(l => {
      // chave por item + cidade + categoria (cross-fornecedor)
      const k = `${l.itemNome}||${l.cidadeNome}||${l.categoria}`;
      (grupos[k] = grupos[k] || []).push(l);
    });
    return Object.entries(grupos)
      .map(([k, linhas]) => {
        const sorted = [...linhas].sort((a,b) => a.valor - b.valor);
        const min = sorted[0];
        const max = sorted[sorted.length-1];
        const avg = sorted.reduce((s,x) => s + x.valor, 0) / sorted.length;
        const spread = max.valor - min.valor;
        const spreadPct = min.valor > 0 ? (spread / min.valor) * 100 : 0;
        return {
          chave: k,
          itemNome: min.itemNome,
          cidadeNome: min.cidadeNome,
          categoria: min.categoria,
          fornCount: sorted.length,
          min, max, avg, spread, spreadPct,
          linhas: sorted,
        };
      })
      .filter(g => g.fornCount > 1) // só interessa onde tem comparação
      .sort((a,b) => b.spreadPct - a.spreadPct);
  }, [linhasVigentes]);

  // ── Distribuição de gasto por fornecedor (cotações aprovadas) ────────────
  const gastoPorFornecedor = useMemo(() => {
    const map = {};
    cotacoesEscopo.filter(c => c.status === "aprovada").forEach(c => {
      const k = String(c.fornecedorId);
      map[k] = (map[k] || 0) + Number(c.valorTotal||0);
    });
    return Object.entries(map)
      .map(([id, valor]) => ({ name: fornById[id]?.apelido || id, value: valor }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 8);
  }, [cotacoesEscopo, fornById]);

  // ── Gasto por categoria ──────────────────────────────────────────────────
  const gastoPorCategoria = useMemo(() => {
    const map = {};
    cotacoesEscopo.filter(c => c.status === "aprovada").forEach(c => {
      const k = c.categoria || "—";
      map[k] = (map[k] || 0) + Number(c.valorTotal||0);
    });
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor })).sort((a,b) => a.categoria.localeCompare(b.categoria));
  }, [cotacoesEscopo]);

  // ── Evolução por (fornecedor, item) entre versões da tabela ──────────────
  // Quando há vigente + arquivadas (versões anteriores), compara o preço médio
  // do item entre elas. Saving = (anterior - atual) / anterior * 100.
  const evolucaoVersoes = useMemo(() => {
    // agrupa por fornecedor + campeonato
    const grupos = {};
    tabelas.forEach(t => {
      const k = `${t.fornecedorId}||${t.campeonatoId}`;
      (grupos[k] = grupos[k] || []).push(t);
    });
    const out = [];
    Object.entries(grupos).forEach(([k, tabs]) => {
      const ordenadas = [...tabs].sort((a,b) => (a.versao||1) - (b.versao||1));
      if (ordenadas.length < 2) return; // só faz sentido com >1 versão
      const f = fornById[String(ordenadas[0].fornecedorId)];
      const camp = campById[ordenadas[0].campeonatoId];
      if (!f || !camp) return;
      // valor médio total por versão (média de todas as células preenchidas)
      const medias = ordenadas.map(tab => {
        const valores = [];
        Object.values(tab.valores || {}).forEach(porItem => {
          Object.values(porItem).forEach(porCidade => {
            Object.values(porCidade).forEach(v => { if (v != null && v > 0) valores.push(Number(v)); });
          });
        });
        const media = valores.length ? valores.reduce((s,x)=>s+x,0)/valores.length : 0;
        return { versao: tab.versao || 1, status: tab.status, media };
      });
      const primeira = medias[0].media;
      const ultima = medias[medias.length-1].media;
      const delta = primeira > 0 ? ((primeira - ultima) / primeira) * 100 : 0;
      out.push({
        fornecedorNome: f.apelido,
        campeonatoNome: camp.nome,
        ano: camp.ano,
        versoes: medias,
        primeira, ultima,
        savingPct: delta,
      });
    });
    return out.sort((a,b) => b.savingPct - a.savingPct);
  }, [tabelas, fornById, campById]);

  // ── Comparativo cross-ano: mesmo fornecedor, mesmo item, anos diferentes ──
  const evolucaoAnos = useMemo(() => {
    // Para cada fornecedor + item, agrupa por ano e calcula média
    const map = {}; // key = fornId||itemNome → { [ano]: media }
    linhasVigentes.forEach(l => {
      const k = `${l.fornecedorId}||${l.itemNome}`;
      map[k] = map[k] || { fornNome: l.fornecedorNome, itemNome: l.itemNome, anos: {} };
      const a = l.ano || 0;
      map[k].anos[a] = map[k].anos[a] || { soma:0, n:0 };
      map[k].anos[a].soma += l.valor;
      map[k].anos[a].n += 1;
    });
    const out = [];
    Object.values(map).forEach(g => {
      const anos = Object.keys(g.anos).map(Number).sort();
      if (anos.length < 2) return;
      const series = anos.map(ano => ({ ano, media: g.anos[ano].soma / g.anos[ano].n }));
      out.push({ fornNome: g.fornNome, itemNome: g.itemNome, series });
    });
    return out;
  }, [linhasVigentes]);

  const TS = tableStyles(T);

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Tabelas Vigentes" value={String(kpis.vigentes)} sub={filtroCampeonato==="todos"?"Todos os campeonatos":campById[filtroCampeonato]?.nome||""} color={T.brand||"#10b981"} T={T}/>
        <KPI label="Cotações Aprovadas" value={String(kpis.cotacoesAprovadas)} sub={`Ticket médio ${fmtK(kpis.ticketMedio)}`} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Valor Aprovado" value={fmtK(kpis.totalAprovado)} sub="Compromissos firmados" color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Fornecedores Ativos" value={String(kpis.fornAtivos)} sub="Com tabela vigente" color="#a855f7" T={T}/>
      </div>

      {/* Tabs internas */}
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        <Chip active={aba==="comparativo"} onClick={()=>setAba("comparativo")} T={T}>
          <Activity size={11} style={{marginRight:4,verticalAlign:"-1px"}}/>Comparativo entre fornecedores
        </Chip>
        <Chip active={aba==="evolucao"} onClick={()=>setAba("evolucao")} T={T}>
          <TrendingUp size={11} style={{marginRight:4,verticalAlign:"-1px"}}/>Evolução de preços
        </Chip>
        <Chip active={aba==="cotacoes"} onClick={()=>setAba("cotacoes")} T={T}>
          <Wallet size={11} style={{marginRight:4,verticalAlign:"-1px"}}/>Distribuição de gasto
        </Chip>
      </div>

      {/* ── ABA: Comparativo ──────────────────────────────────────── */}
      {aba === "comparativo" && (
        <Card T={T} padding={0}>
          <PanelTitle T={T}
            title="Spread de preço por (item · cidade · categoria)"
            subtitle="Onde há mais de um fornecedor cobrando pelo mesmo serviço — ordenado pelo maior spread relativo"
            color={T.info||"#3b82f6"}
          />
          {comparativos.length === 0 ? (
            <Empty T={T} icon={Layers} title="Sem comparativo disponível" msg="Para comparar preços, é preciso ter pelo menos dois fornecedores com tabela vigente cobrindo o mesmo item, cidade e categoria."/>
          ) : (
            <div style={TS.wrap}>
              <table style={{...TS.table, minWidth:920}}>
                <thead>
                  <tr style={TS.thead}>
                    {["Item","Cidade","Cat.","Forn.","Mais barato","Média","Mais caro","Spread"].map(h =>
                      <th key={h} style={{...TS.th, ...TS.thLeft, ...(["Mais barato","Média","Mais caro","Spread"].includes(h)?{textAlign:"right"}:{})}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {comparativos.map(g => (
                    <tr key={g.chave} style={TS.tr}>
                      <td style={{...TS.td, fontWeight:600}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Package size={11} color={T.textSm}/>{g.itemNome}</span>
                      </td>
                      <td style={{...TS.td, fontSize:12}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5}}><MapPin size={11} color={T.textSm}/>{g.cidadeNome}</span>
                      </td>
                      <td style={TS.td}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",color:T.brand||"#10b981",fontSize:11,fontWeight:700}}><Tag size={10}/>{g.categoria}</span>
                      </td>
                      <td style={{...TS.td, fontSize:12, color:T.textMd}}>{g.fornCount}</td>
                      <td style={{...TS.td, textAlign:"right", fontFamily:"'JetBrains Mono',ui-monospace,monospace", fontSize:12}}>
                        <div style={{fontWeight:700,color:T.brand||"#10b981"}}>{fmt(g.min.valor)}</div>
                        <div style={{fontSize:10,color:T.textSm,marginTop:2}}>{g.min.fornecedorNome}</div>
                      </td>
                      <td style={{...TS.td, textAlign:"right", fontFamily:"'JetBrains Mono',ui-monospace,monospace", fontSize:12, color:T.textMd}}>{fmt(g.avg)}</td>
                      <td style={{...TS.td, textAlign:"right", fontFamily:"'JetBrains Mono',ui-monospace,monospace", fontSize:12}}>
                        <div style={{fontWeight:700,color:T.danger||"#ef4444"}}>{fmt(g.max.valor)}</div>
                        <div style={{fontSize:10,color:T.textSm,marginTop:2}}>{g.max.fornecedorNome}</div>
                      </td>
                      <td style={{...TS.td, textAlign:"right"}}>
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

      {/* ── ABA: Evolução ─────────────────────────────────────────── */}
      {aba === "evolucao" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

          {/* Saving entre versões */}
          <Card T={T} padding={0}>
            <PanelTitle T={T}
              title="Saving entre versões"
              subtitle="Diferença entre primeira e última versão (mesmo fornecedor + campeonato)"
              color={T.brand||"#10b981"}
            />
            {evolucaoVersoes.length === 0 ? (
              <Empty T={T} icon={Layers} title="Sem versões para comparar" msg="Quando uma tabela passar por revisões antes de virar vigente, o histórico aparece aqui."/>
            ) : (
              <div style={{padding:"4px 16px 16px"}}>
                {evolucaoVersoes.map(e => (
                  <div key={`${e.fornecedorNome}-${e.campeonatoNome}`} style={{padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.text}}>{e.fornecedorNome}</div>
                        <div style={{fontSize:11,color:T.textSm,marginTop:2}}>{e.campeonatoNome}</div>
                        <div style={{fontSize:11,color:T.textMd,marginTop:6,fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
                          {fmt(e.primeira)} → {fmt(e.ultima)} <span style={{color:T.textSm}}>(média/célula)</span>
                        </div>
                      </div>
                      <Badge T={T} color={e.savingPct>0?(T.brand||"#10b981"):(T.danger||"#ef4444")} size="md">
                        {e.savingPct>0?<TrendingDown size={11} style={{marginRight:3,verticalAlign:"-1px"}}/>:<TrendingUp size={11} style={{marginRight:3,verticalAlign:"-1px"}}/>}
                        {e.savingPct>0?"-":"+"}{Math.abs(e.savingPct).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Evolução cross-ano */}
          <Card T={T} padding={0}>
            <PanelTitle T={T}
              title="Evolução cross-ano"
              subtitle="Mesmo item, mesmo fornecedor, anos diferentes"
              color="#a855f7"
            />
            {evolucaoAnos.length === 0 ? (
              <Empty T={T} icon={TrendingUp} title="Sem histórico anual" msg="Quando houver tabelas vigentes em campeonatos de anos diferentes, a evolução aparece aqui."/>
            ) : (
              <div style={{padding:"16px 20px"}}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mergeLineData(evolucaoAnos.slice(0,5))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="ano" stroke={T.textSm} style={{fontSize:11}}/>
                    <YAxis stroke={T.textSm} style={{fontSize:11}} tickFormatter={fmtK}/>
                    <Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}} formatter={(v)=>fmt(v)}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    {evolucaoAnos.slice(0,5).map((e, i) => (
                      <Line
                        key={`${e.fornNome}-${e.itemNome}`}
                        type="monotone"
                        dataKey={`${e.fornNome} · ${e.itemNome}`}
                        stroke={PIE_COLORS[i % PIE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r:4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── ABA: Distribuição de gasto ────────────────────────────── */}
      {aba === "cotacoes" && (
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16}}>

          <Card T={T} padding={0}>
            <PanelTitle T={T} title="Top fornecedores por valor aprovado" subtitle="Cotações com status aprovada" color={T.brand||"#10b981"}/>
            {gastoPorFornecedor.length === 0 ? (
              <Empty T={T} icon={Building2} title="Sem cotações aprovadas" msg="Aprove cotações na sub-aba Cotações para alimentar este gráfico."/>
            ) : (
              <div style={{padding:"16px 20px"}}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gastoPorFornecedor} layout="vertical" margin={{left:10}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis type="number" stroke={T.textSm} style={{fontSize:11}} tickFormatter={fmtK}/>
                    <YAxis dataKey="name" type="category" stroke={T.textSm} style={{fontSize:11}} width={120}/>
                    <Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}} formatter={(v)=>fmt(v)}/>
                    <Bar dataKey="value" fill={T.brand||"#10b981"} radius={[0,6,6,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card T={T} padding={0}>
            <PanelTitle T={T} title="Por categoria" subtitle="Distribuição de valor entre B1/B2..." color={T.info||"#3b82f6"}/>
            {gastoPorCategoria.length === 0 ? (
              <Empty T={T} icon={Tag} title="Sem dados" msg=""/>
            ) : (
              <div style={{padding:"16px 20px"}}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={gastoPorCategoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={100} label={({categoria,percent})=>`${categoria} ${(percent*100).toFixed(0)}%`}>
                      {gastoPorCategoria.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}} formatter={(v)=>fmt(v)}/>
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

// Combina séries de evolução cross-ano em um único array para o LineChart.
// Cada ponto vira { ano, "fornNome · itemNome": media }.
function mergeLineData(series) {
  const todosAnos = new Set();
  series.forEach(s => s.series.forEach(p => todosAnos.add(p.ano)));
  return [...todosAnos].sort().map(ano => {
    const row = { ano };
    series.forEach(s => {
      const ponto = s.series.find(p => p.ano === ano);
      if (ponto) row[`${s.fornNome} · ${s.itemNome}`] = ponto.media;
    });
    return row;
  });
}

function Empty({ T, icon:Icon, title, msg }) {
  return (
    <div style={{padding:"40px 20px",textAlign:"center"}}>
      <div style={{
        width:56,height:56,borderRadius:14,
        background:T.surfaceAlt||T.bg,
        border:`1px solid ${T.border}`,
        color:T.textSm,
        display:"inline-flex",alignItems:"center",justifyContent:"center",
        marginBottom:12,
      }}><Icon size={24} strokeWidth={2}/></div>
      <h3 style={{margin:"0 0 4px",fontSize:14,fontWeight:700,color:T.text}}>{title}</h3>
      {msg && <p style={{margin:0,fontSize:12,color:T.textMd,maxWidth:380,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>{msg}</p>}
    </div>
  );
}
