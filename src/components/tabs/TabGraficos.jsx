import { useState, useMemo, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid, ComposedChart, Line, Area, Legend, ReferenceLine, ReferenceArea, LabelList,
} from "recharts";
import { fmt, fmtK, fmtRs, subTotal, catTotal } from "../../utils";
import { CATS } from "../../constants";
import { Card, PanelTitle } from "../ui";
import { TrendingUp, TrendingDown, Target, Trophy, AlertTriangle } from "lucide-react";

// ─── Painel de Análise ────────────────────────────────────────────────────────
// Dashboard interativo para tomada de decisão: filtros de rodada/categoria no
// topo escopam TODOS os gráficos e índices (números sempre concordam entre si).
// Convenções: Provisionado = custo projetado (mesma base da aba Savings);
// Realizado NF = notas fiscais que já chegaram.

const GREEN = "#16A34A";
const RED = "#DC2626";

function useCountUp(value, dur = 700) {
  const [v, setV] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current, to = value;
    if (from === to) return;
    const t0 = performance.now();
    let raf;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cúbico
      setV(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return v;
}

function Sparkline({ data, color, T, width = 96, height = 30 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 3 - ((v - min) / range) * (height - 6)}`).join(" ");
  const last = pts.split(" ").pop().split(",");
  return (
    <svg width={width} height={height} style={{display:"block"}}>
      <polyline points={pts} fill="none" stroke={T.border} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} stroke={T.surface||T.card} strokeWidth="2"/>
    </svg>
  );
}

// Tooltip padrão: valor forte na frente, nome da série atrás, chave de linha colorida
function TipBox({ active, payload, label, T, prefix = "" }) {
  if (!active || !payload?.length) return null;
  const vistos = new Set();
  const linhas = payload.filter(p => {
    if (vistos.has(p.dataKey)) return false; // Area+Line da mesma série = 1 linha
    vistos.add(p.dataKey);
    return p.value !== 0 || payload.length === 1;
  });
  return (
    <div style={{background:T.surface||T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 8px 24px rgba(0,0,0,0.25)"}}>
      <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:T.text}}>{prefix}{label}</p>
      {linhas.map(p => (
        <div key={p.dataKey} style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
          <span style={{width:12,height:3,borderRadius:2,background:p.stroke||p.fill||p.color,flexShrink:0}}/>
          <span className="num" style={{fontSize:12,fontWeight:700,color:T.text}}>{fmt(Math.abs(p.value))}</span>
          <span style={{fontSize:11,color:T.textMd}}>{p.name}{p.value < 0 ? " (estouro)" : ""}</span>
        </div>
      ))}
    </div>
  );
}

function Chip({ ativo, onClick, children, T }) {
  return (
    <button onClick={onClick} style={{
      padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
      border:`1px solid ${ativo ? (T.brand||"#10b981") : T.border}`,
      background: ativo ? (T.brand||"#10b981") : "transparent",
      color: ativo ? "#fff" : T.textMd,
      transition:"all .2s ease",
    }}>{children}</button>
  );
}

function StatTile({ label, value, sub, subColor, color, spark, sparkColor, T }) {
  const animado = useCountUp(value);
  return (
    <Card T={T} hoverable style={{position:"relative",overflow:"hidden"}}>
      <div style={{padding:"16px 18px"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color},transparent 80%)`}}/>
        <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",margin:"0 0 6px"}}>{label}</p>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:8}}>
          <p style={{fontSize:22,fontWeight:700,color:T.text,margin:0,lineHeight:1.1}}>{fmtRs(animado)}</p>
          {spark && <Sparkline data={spark} color={sparkColor||color} T={T}/>}
        </div>
        {sub && <p style={{fontSize:11,color:subColor||T.textSm,fontWeight:600,margin:"6px 0 0"}}>{sub}</p>}
      </div>
    </Card>
  );
}

export default function TabGraficos({ divulgados = [], T }) {
  const [periodo, setPeriodo] = useState("todas");   // todas | u5 | u10
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [maturidade, setMaturidade] = useState(5);   // rodadas recentes ignoradas na calibração (NFs ainda chegando)

  const categorias = useMemo(() =>
    Array.from(new Set(divulgados.map(j => j.categoria).filter(Boolean))).sort(),
  [divulgados]);

  const rodadasTodas = useMemo(() =>
    Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b),
  [divulgados]);

  // Slice único: TODOS os gráficos e índices abaixo leem daqui
  const jogos = useMemo(() => {
    let rodadasSel = rodadasTodas;
    if (periodo === "u5") rodadasSel = rodadasTodas.slice(-5);
    if (periodo === "u10") rodadasSel = rodadasTodas.slice(-10);
    const set = new Set(rodadasSel);
    return divulgados.filter(j => set.has(j.rodada) && (filtroCat === "Todas" || j.categoria === filtroCat));
  }, [divulgados, rodadasTodas, periodo, filtroCat]);

  const porRodada = useMemo(() => {
    const map = {};
    jogos.forEach(j => {
      const r = j.rodada;
      if (!map[r]) map[r] = { rodada: r, name: `R${r}`, orc: 0, prov: 0, real: 0, jogos: 0 };
      map[r].orc += subTotal(j.orcado);
      map[r].prov += subTotal(j.provisionado);
      map[r].real += subTotal(j.realizado);
      map[r].jogos++;
    });
    const rows = Object.values(map).sort((a, b) => a.rodada - b.rodada);
    let accO = 0, accP = 0, accR = 0;
    rows.forEach(r => {
      r.saving = r.orc - r.prov;
      r.savingPos = Math.max(0, r.saving);
      r.savingNeg = Math.min(0, r.saving);
      accO += r.orc; accP += r.prov; accR += r.real;
      r.orcAcum = accO; r.provAcum = accP; r.realAcum = accR;
    });
    // média móvel de 3 rodadas do saving — tendência sem o ruído jogo-a-jogo
    rows.forEach((r, i) => {
      const w = rows.slice(Math.max(0, i - 2), i + 1);
      r.mm3 = w.reduce((s, x) => s + x.saving, 0) / w.length;
    });
    return rows;
  }, [jogos]);

  const tot = useMemo(() => {
    const orc = porRodada.reduce((s, r) => s + r.orc, 0);
    const prov = porRodada.reduce((s, r) => s + r.prov, 0);
    const real = porRodada.reduce((s, r) => s + r.real, 0);
    const saving = orc - prov;
    return {
      orc, prov, real, saving,
      savPct: orc > 0 ? saving / orc * 100 : 0,
      execPct: orc > 0 ? prov / orc * 100 : 0,
      nfPct: prov > 0 ? real / prov * 100 : 0,
      custoMedio: jogos.length ? prov / jogos.length : 0,
      orcMedio: jogos.length ? orc / jogos.length : 0,
    };
  }, [porRodada, jogos]);

  // ── Convergência Provisionado → Realizado ──────────────────────────────────
  // O acompanhamento às entidades usa o provisionado porque as NFs demoram a
  // chegar. Aqui medimos, nas rodadas MADURAS (todas menos as N mais recentes,
  // onde as NFs já tiveram tempo de entrar), quanto do provisionado de fato
  // virou nota — e usamos esse fator para projetar o realizado das rodadas
  // recentes. O fator é calibrado no campeonato inteiro (respeitando só o
  // filtro de categoria); o período filtrado é onde ele é aplicado.
  const convergencia = useMemo(() => {
    const base = divulgados.filter(j => filtroCat === "Todas" || j.categoria === filtroCat);
    const rodadas = Array.from(new Set(base.map(j => j.rodada))).sort((a, b) => a - b);
    const maduras = new Set(rodadas.slice(0, Math.max(0, rodadas.length - maturidade)));
    let provM = 0, realM = 0;
    base.forEach(j => {
      if (!maduras.has(j.rodada)) return;
      provM += subTotal(j.provisionado);
      realM += subTotal(j.realizado);
    });
    if (provM <= 0) return { pronto: false, nMaduras: maduras.size };
    const fator = realM / provM;
    return { pronto: true, fator, provM, realM, nMaduras: maduras.size, primeiraImatura: rodadas.slice(-maturidade)[0] };
  }, [divulgados, filtroCat, maturidade]);

  const convergenciaRodada = useMemo(() => porRodada.map(r => ({
    ...r,
    projReal: convergencia.pronto ? r.prov * convergencia.fator : null,
    cobertura: r.prov > 0 ? r.real / r.prov * 100 : 0,
  })), [porRodada, convergencia]);

  const ajustado = useMemo(() => {
    if (!convergencia.pronto) return null;
    const realProjetado = tot.prov * convergencia.fator;
    const savingAjustado = tot.orc - realProjetado;
    return {
      realProjetado, savingAjustado,
      desvio: (convergencia.fator - 1) * 100,          // <0: NFs chegam abaixo do provisionado
      diferenca: savingAjustado - tot.saving,           // quanto o saving reportado muda com a calibração
    };
  }, [convergencia, tot]);

  const indices = useMemo(() => {
    if (!porRodada.length) return null;
    const melhor = porRodada.reduce((a, b) => (b.saving > a.saving ? b : a));
    const pior = porRodada.reduce((a, b) => (b.saving < a.saving ? b : a));
    const dentro = porRodada.filter(r => r.saving >= 0).length;
    const mm3Atual = porRodada[porRodada.length - 1].mm3;
    const savingMedio = tot.saving / porRodada.length;
    return {
      melhor, pior,
      dentroPct: dentro / porRodada.length * 100,
      tendencia: mm3Atual - savingMedio, // >0: últimas rodadas poupando acima da média
      mm3Atual,
    };
  }, [porRodada, tot]);

  // Composição por categoria (Logística/Pessoal/Operações) — mesmo slice dos filtros
  const composicao = useMemo(() => CATS.map(cat => ({
    key: cat.key, nome: cat.label, color: cat.color,
    orc: jogos.reduce((s, j) => s + catTotal(j.orcado, cat), 0),
    prov: jogos.reduce((s, j) => s + catTotal(j.provisionado, cat), 0),
  })), [jogos]);

  const compData = useMemo(() => [
    { name: "Orçado",       ...Object.fromEntries(composicao.map(c => [c.key, c.orc])) },
    { name: "Provisionado", ...Object.fromEntries(composicao.map(c => [c.key, c.prov])) },
  ], [composicao]);

  const topJogos = useMemo(() =>
    [...jogos]
      .map(j => ({
        id: j.id,
        name: `R${j.rodada} ${j.mandante} x ${j.visitante}`,
        Provisionado: subTotal(j.provisionado),
        orc: subTotal(j.orcado),
      }))
      .sort((a, b) => b.Provisionado - a.Provisionado)
      .slice(0, 10),
  [jogos]);

  const brand = T.brand || "#10b981";
  const gridProps = { stroke: T.border, vertical: false };
  const axisTick = { fill: T.textMd, fontSize: 11 };
  const axisLine = { stroke: T.border };

  if (!divulgados.length) return (
    <Card T={T}><div style={{padding:48,textAlign:"center",color:T.textSm,fontSize:13}}>Nenhum jogo divulgado ainda — o painel acende junto com a tabela.</div></Card>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* ── Filtros: uma linha, escopam tudo abaixo ── */}
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginRight:4}}>Período</span>
        <Chip T={T} ativo={periodo==="todas"} onClick={()=>setPeriodo("todas")}>Todas as rodadas</Chip>
        <Chip T={T} ativo={periodo==="u10"} onClick={()=>setPeriodo("u10")}>Últimas 10</Chip>
        <Chip T={T} ativo={periodo==="u5"} onClick={()=>setPeriodo("u5")}>Últimas 5</Chip>
        {categorias.length > 1 && <>
          <span style={{fontSize:11,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"0 4px 0 12px"}}>Categoria</span>
          <Chip T={T} ativo={filtroCat==="Todas"} onClick={()=>setFiltroCat("Todas")}>Todas</Chip>
          {categorias.map(c => <Chip key={c} T={T} ativo={filtroCat===c} onClick={()=>setFiltroCat(c)}>{c}</Chip>)}
        </>}
      </div>

      {/* ── KPI row ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
        <StatTile T={T} label="Orçado no período" value={tot.orc} color="#94a3b8"
          sub={`${jogos.length} jogos · ${porRodada.length} rodadas`}/>
        <StatTile T={T} label="Provisionado" value={tot.prov} color={brand}
          sub={`${tot.execPct.toFixed(1)}% do orçado`} subColor={T.textMd}/>
        <StatTile T={T} label="Saving acumulado" value={Math.abs(tot.saving)} color={tot.saving>=0?GREEN:RED}
          sub={`${tot.saving>=0?"▲":"▼"} ${Math.abs(tot.savPct).toFixed(1)}% vs. orçado`} subColor={tot.saving>=0?GREEN:RED}
          spark={porRodada.map(r=>r.saving)} sparkColor={tot.saving>=0?GREEN:RED}/>
        <StatTile T={T} label="Custo médio por jogo" value={tot.custoMedio} color="#2563EB"
          sub={`orçado médio ${fmtRs(tot.orcMedio)}`}/>
        <StatTile T={T} label="NFs recebidas" value={tot.real} color="#D97706"
          sub={`${Math.min(999,tot.nfPct).toFixed(0)}% do provisionado`} subColor={T.textMd}
          spark={porRodada.map(r=>r.realAcum)} sparkColor="#D97706"/>
      </div>

      {/* ── Linha 2: curva acumulada + termômetro de decisão ── */}
      <div style={{display:"grid",gridTemplateColumns:"minmax(380px,2fr) minmax(280px,1fr)",gap:16}}>
        <Card T={T}>
          <PanelTitle T={T} title="Curva Acumulada" subtitle="Orçado × Provisionado × NFs recebidas — rodada a rodada"/>
          <div style={{padding:"8px 16px 16px"}}>
            <ResponsiveContainer width="100%" height={290}>
              <ComposedChart data={porRodada}>
                <CartesianGrid {...gridProps}/>
                <XAxis dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={false}/>
                <YAxis tickFormatter={fmtK} tick={axisTick} axisLine={axisLine} tickLine={false} width={54}/>
                <Tooltip content={<TipBox T={T}/>}/>
                <Legend wrapperStyle={{fontSize:12}} iconType="plainline"/>
                <Area type="monotone" dataKey="provAcum" name="Provisionado" stroke="none" fill={brand} fillOpacity={0.1} legendType="none" tooltipType="none"/>
                <Line type="monotone" dataKey="orcAcum" name="Orçado" stroke="#94a3b8" strokeWidth={2}
                  dot={false} activeDot={{r:4,stroke:T.surface||T.card,strokeWidth:2}}/>
                <Line type="monotone" dataKey="provAcum" name="Provisionado" stroke={brand} strokeWidth={2}
                  dot={false} activeDot={{r:4,stroke:T.surface||T.card,strokeWidth:2}}/>
                <Line type="monotone" dataKey="realAcum" name="NFs recebidas" stroke="#2563EB" strokeWidth={2}
                  dot={false} activeDot={{r:4,stroke:T.surface||T.card,strokeWidth:2}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card T={T}>
          <PanelTitle T={T} title="Termômetro de Decisão" subtitle="Índices do período filtrado"/>
          {indices && (
            <div style={{padding:"4px 18px 18px",display:"flex",flexDirection:"column",gap:14}}>
              {[
                { icon:Trophy, cor:GREEN, label:"Melhor rodada", valor:`${indices.melhor.name} · ${fmtRs(indices.melhor.saving)}`, sub:"maior saving" },
                { icon:AlertTriangle, cor:indices.pior.saving<0?RED:"#D97706", label:"Rodada mais apertada", valor:`${indices.pior.name} · ${fmtRs(indices.pior.saving)}`, sub:indices.pior.saving<0?"estourou o orçado":"menor saving" },
                { icon:Target, cor:brand, label:"Rodadas dentro do orçado", valor:`${indices.dentroPct.toFixed(0)}%`, sub:`${porRodada.filter(r=>r.saving>=0).length} de ${porRodada.length} rodadas` },
                { icon:indices.tendencia>=0?TrendingUp:TrendingDown, cor:indices.tendencia>=0?GREEN:RED, label:"Tendência (média móvel 3 rod.)", valor:fmtRs(indices.mm3Atual), sub:indices.tendencia>=0?"últimas rodadas acima da média":"últimas rodadas abaixo da média" },
              ].map(ix => (
                <div key={ix.label} style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:ix.cor+"1a",border:`1px solid ${ix.cor}35`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <ix.icon size={16} color={ix.cor}/>
                  </div>
                  <div style={{minWidth:0}}>
                    <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:0}}>{ix.label}</p>
                    <p className="num" style={{fontSize:14,fontWeight:700,color:T.text,margin:"2px 0 0"}}>{ix.valor}</p>
                    <p style={{fontSize:10,color:T.textSm,margin:0}}>{ix.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Linha 3: saving por rodada + composição/execução ── */}
      <div style={{display:"grid",gridTemplateColumns:"minmax(380px,2fr) minmax(280px,1fr)",gap:16}}>
        <Card T={T}>
          <PanelTitle T={T} title="Saving por Rodada" subtitle="Orçado − Provisionado · linha = média móvel de 3 rodadas"/>
          <div style={{padding:"8px 16px 16px"}}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={porRodada} stackOffset="sign">
                <CartesianGrid {...gridProps}/>
                <XAxis dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={false}/>
                <YAxis tickFormatter={fmtK} tick={axisTick} axisLine={axisLine} tickLine={false} width={54}/>
                <Tooltip content={<TipBox T={T}/>}/>
                <ReferenceLine y={0} stroke={T.textSm} strokeWidth={1}/>
                <Bar dataKey="savingPos" name="Saving" stackId="s" fill={GREEN} barSize={18} radius={[4,4,0,0]}/>
                <Bar dataKey="savingNeg" name="Estouro" stackId="s" fill={RED} barSize={18} radius={[0,0,4,4]}/>
                <Line type="monotone" dataKey="mm3" name="Média móvel (3)" stroke={T.textMd} strokeWidth={2}
                  dot={false} activeDot={{r:4,stroke:T.surface||T.card,strokeWidth:2}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card T={T}>
          <PanelTitle T={T} title="Composição por Categoria" subtitle="Onde o dinheiro está alocado"/>
          <div style={{padding:"8px 16px 4px"}}>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={compData} layout="vertical">
                <XAxis type="number" tickFormatter={fmtK} tick={axisTick} axisLine={axisLine} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{...axisTick,fontSize:12}} axisLine={axisLine} tickLine={false} width={92}/>
                <Tooltip content={<TipBox T={T}/>}/>
                {composicao.map(c => (
                  <Bar key={c.key} dataKey={c.key} name={c.nome} stackId="c" fill={c.color} barSize={20}
                    stroke={T.surface||T.card} strokeWidth={2}/>
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",padding:"2px 8px 10px"}}>
              {composicao.map(c => (
                <span key={c.key} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.textMd}}>
                  <span style={{width:10,height:10,borderRadius:3,background:c.color}}/>{c.nome}
                </span>
              ))}
            </div>
          </div>
          <div style={{padding:"0 18px 18px"}}>
            <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"6px 0 10px"}}>Execução por categoria</p>
            {composicao.map(c => {
              const pct = c.orc > 0 ? c.prov / c.orc * 100 : 0;
              return (
                <div key={c.key} style={{marginBottom:10}} title={`${c.nome}: ${fmt(c.prov)} de ${fmt(c.orc)} orçados`}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:11,color:T.textMd,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:c.color}}/>{c.nome}
                    </span>
                    <span className="num" style={{fontSize:11,fontWeight:700,color:T.text}}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{height:8,borderRadius:4,background:c.color+"22",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:c.color,borderRadius:4,transition:"width .5s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Linha 4: convergência Provisionado → Realizado ── */}
      <Card T={T}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <PanelTitle T={T} title="Convergência Provisionado → Realizado"
            subtitle="Quanto do provisionado vira NF de fato — fator medido nas rodadas maduras e aplicado ao período"/>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"16px 20px 0"}}>
            <span style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Janela de NFs</span>
            {[3,5,8].map(n => (
              <Chip key={n} T={T} ativo={maturidade===n} onClick={()=>setMaturidade(n)}>{n} rodadas</Chip>
            ))}
          </div>
        </div>
        {!convergencia.pronto ? (
          <div style={{padding:"12px 20px 24px",color:T.textSm,fontSize:12}}>
            Ainda não há rodadas maduras suficientes (com a janela de {maturidade} rodadas) para calibrar a convergência — diminua a janela ou aguarde mais NFs.
          </div>
        ) : (
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,padding:"12px 20px 4px"}}>
              {[
                { label:"Fator de convergência", valor:`${(convergencia.fator*100).toFixed(1)}%`,
                  sub:`calibrado em ${convergencia.nMaduras} rodadas maduras`, cor:T.text },
                { label:"Desvio da provisão", valor:`${ajustado.desvio>=0?"+":""}${ajustado.desvio.toFixed(1)}%`,
                  sub: ajustado.desvio < 0 ? "NFs chegam abaixo do provisionado" : "NFs chegam acima do provisionado",
                  cor: Math.abs(ajustado.desvio) <= 3 ? GREEN : "#D97706" },
                { label:"Realizado projetado", valor:fmtRs(ajustado.realProjetado),
                  sub:"provisionado do período × fator", cor:"#D97706" },
                { label:"Saving ajustado", valor:`${ajustado.savingAjustado>=0?"▲":"▼"} ${fmtRs(Math.abs(ajustado.savingAjustado))}`,
                  sub:`${ajustado.diferenca>=0?"+":""}${fmtRs(ajustado.diferenca)} vs. saving reportado (${fmtRs(tot.saving)})`,
                  cor: ajustado.savingAjustado>=0 ? GREEN : RED },
              ].map(k => (
                <div key={k.label} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px"}}>
                  <p style={{fontSize:10,color:T.textSm,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"0 0 4px"}}>{k.label}</p>
                  <p className="num" style={{fontSize:17,fontWeight:700,color:k.cor,margin:0}}>{k.valor}</p>
                  <p style={{fontSize:10,color:T.textSm,margin:"3px 0 0"}}>{k.sub}</p>
                </div>
              ))}
            </div>
            <div style={{padding:"8px 16px 16px"}}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={convergenciaRodada}>
                  <CartesianGrid {...gridProps}/>
                  <XAxis dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={false}/>
                  <YAxis tickFormatter={fmtK} tick={axisTick} axisLine={axisLine} tickLine={false} width={54}/>
                  <Tooltip content={({active,payload,label}) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div style={{background:T.surface||T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 8px 24px rgba(0,0,0,0.25)"}}>
                        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:T.text}}>{label}</p>
                        <p className="num" style={{margin:0,fontSize:12,color:T.textMd}}>Provisionado: <b style={{color:T.text}}>{fmt(row.prov)}</b></p>
                        <p className="num" style={{margin:0,fontSize:12,color:T.textMd}}>Realizado NF: <b style={{color:T.text}}>{fmt(row.real)}</b> ({row.cobertura.toFixed(0)}%)</p>
                        {row.projReal != null && <p className="num" style={{margin:0,fontSize:12,color:T.textMd}}>Projetado (calibrado): <b style={{color:T.text}}>{fmt(row.projReal)}</b></p>}
                      </div>
                    );
                  }}/>
                  <Legend wrapperStyle={{fontSize:12}}/>
                  {convergencia.primeiraImatura != null && convergenciaRodada.some(r => r.rodada === convergencia.primeiraImatura) && (
                    <ReferenceArea x1={`R${convergencia.primeiraImatura}`} x2={convergenciaRodada[convergenciaRodada.length-1].name}
                      fill={T.textSm} fillOpacity={0.07}
                      label={{value:"NFs ainda chegando",position:"insideTopRight",fill:T.textSm,fontSize:10}}/>
                  )}
                  <Bar dataKey="prov" name="Provisionado" fill={brand} barSize={12} radius={[4,4,0,0]}/>
                  <Bar dataKey="real" name="Realizado NF" fill="#2563EB" barSize={12} radius={[4,4,0,0]}/>
                  <Line type="monotone" dataKey="projReal" name="Projetado (calibrado)" stroke="#D97706" strokeWidth={2}
                    dot={{r:3,fill:"#D97706",stroke:T.surface||T.card,strokeWidth:2}}
                    activeDot={{r:4,stroke:T.surface||T.card,strokeWidth:2}}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      {/* ── Linha 5: top jogos ── */}
      <Card T={T}>
        <PanelTitle T={T} title="Top 10 Jogos Mais Caros" subtitle="Provisionado no período filtrado — passe o mouse para comparar com o orçado"/>
        <div style={{padding:"8px 16px 16px"}}>
          <ResponsiveContainer width="100%" height={Math.max(200, topJogos.length * 34 + 40)}>
            <BarChart data={topJogos} layout="vertical">
              <CartesianGrid stroke={T.border} horizontal={false}/>
              <XAxis type="number" tickFormatter={fmtK} tick={axisTick} axisLine={axisLine} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{...axisTick,fontSize:11}} axisLine={axisLine} tickLine={false} width={210}/>
              <Tooltip content={({active,payload,label}) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload;
                const sav = row.orc - row.Provisionado;
                return (
                  <div style={{background:T.surface||T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 8px 24px rgba(0,0,0,0.25)"}}>
                    <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:T.text}}>{label}</p>
                    <p className="num" style={{margin:0,fontSize:12,color:T.textMd}}>Provisionado: <b style={{color:T.text}}>{fmt(row.Provisionado)}</b></p>
                    <p className="num" style={{margin:0,fontSize:12,color:T.textMd}}>Orçado: <b style={{color:T.text}}>{fmt(row.orc)}</b></p>
                    <p className="num" style={{margin:0,fontSize:12,fontWeight:700,color:sav>=0?GREEN:RED}}>{sav>=0?"▲ Saving":"▼ Estouro"}: {fmt(Math.abs(sav))}</p>
                  </div>
                );
              }}/>
              <Bar dataKey="Provisionado" barSize={18} radius={[0,4,4,0]}>
                {topJogos.map(j => <Cell key={j.id} fill={j.Provisionado > j.orc ? RED : brand}/>)}
                <LabelList dataKey="Provisionado" position="right" formatter={fmtK} style={{fill:T.textMd,fontSize:11}}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
