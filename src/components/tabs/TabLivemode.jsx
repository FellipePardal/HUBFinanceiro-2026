import { useState, useMemo } from "react";
import { KPI, Pill } from "../shared";
import { RADIUS, iSty } from "../../constants";
import { Card, PanelTitle, Button, Chip, Progress, tableStyles } from "../ui";
import { CheckCircle2, Clock, Edit2 } from "lucide-react";

const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

const SERVICOS_LM = [
  { key:"grafismo",     label:"Máquinas de Grafismo", valorPadrao:3948 },
  { key:"starlink",     label:"Starlink",             valorPadrao:658  },
  { key:"downlink",     label:"Downlink",             valorPadrao:3000 },
  { key:"distribuicao", label:"Distribuição",         valorPadrao:2000 },
];

const TOTAL_RODADAS = 38;

function gerarDadosIniciais() {
  return Array.from({length:TOTAL_RODADAS}, (_,i) => ({
    rodada: i+1,
    jogos: 2,
    grafismo: 3948,
    starlink: 658,
    downlink: 3000,
    distribuicao: 2000,
    emitido: false,
  }));
}

export default function TabLivemode({ livemode, setLivemode, jogos, setJogos, T }) {
  const [editRodada, setEditRodada] = useState(null);
  const [editForm, setEditForm] = useState({});

  const IS = iSty(T);
  const TS = tableStyles(T);
  const purple = "#a855f7";
  const green = "#22c55e";

  const dados = livemode && livemode.length > 0 ? livemode : gerarDadosIniciais();

  // Inicializar dados no Supabase se vazio
  if (!livemode || livemode.length === 0) {
    setLivemode(() => gerarDadosIniciais());
  }

  const totalRodada = r => (r.grafismo||0) + (r.starlink||0) + (r.downlink||0) + (r.distribuicao||0);

  const totalGeral = dados.reduce((s,r) => s + totalRodada(r), 0);
  const totalEmitido = dados.filter(r => r.emitido).reduce((s,r) => s + totalRodada(r), 0);
  const totalPendente = totalGeral - totalEmitido;
  const rodadasEmitidas = dados.filter(r => r.emitido).length;

  // Totais por serviço
  const totaisPorServico = SERVICOS_LM.map(s => ({
    ...s,
    total: dados.reduce((sum,r) => sum + (r[s.key]||0), 0),
    emitido: dados.filter(r => r.emitido).reduce((sum,r) => sum + (r[s.key]||0), 0),
  }));

  const toggleEmitido = (rodada) => {
    setLivemode(prev => (prev||dados).map(r => r.rodada === rodada ? {...r, emitido: !r.emitido} : r));
  };

  const startEdit = (r) => {
    setEditRodada(r.rodada);
    setEditForm({ grafismo: r.grafismo, starlink: r.starlink, downlink: r.downlink, distribuicao: r.distribuicao, jogos: r.jogos });
  };

  const saveEdit = () => {
    setLivemode(prev => (prev||dados).map(r => r.rodada === editRodada ? {
      ...r,
      grafismo: parseFloat(editForm.grafismo)||0,
      starlink: parseFloat(editForm.starlink)||0,
      downlink: parseFloat(editForm.downlink)||0,
      distribuicao: parseFloat(editForm.distribuicao)||0,
      jogos: parseInt(editForm.jogos)||2,
    } : r));
    setEditRodada(null);
  };

  // ── Sync com realizado.infra dos jogos ──
  // Calcula o total livemode emitido por rodada e distribui entre os jogos
  const syncInfra = () => {
    const divulgados = jogos.filter(j => j.mandante !== "A definir");
    const rodadaMap = {};
    dados.filter(r => r.emitido).forEach(r => {
      rodadaMap[r.rodada] = totalRodada(r);
    });

    setJogos(js => js.map(j => {
      if (j.mandante === "A definir") return j;
      const totalLmRodada = rodadaMap[j.rodada] || 0;
      const jogosNaRodada = divulgados.filter(x => x.rodada === j.rodada).length || 1;
      const infraPorJogo = Math.round(totalLmRodada / jogosNaRodada);
      return {...j, realizado: {...(j.realizado||{}), infra: infraPorJogo}};
    }));
    alert("Infra + Distr. atualizado nos jogos com base nas rodadas emitidas!");
  };

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:16}}>
        <KPI label="Total Geral" value={fmt(totalGeral)} sub={`${TOTAL_RODADAS} rodadas`} color={purple} T={T}/>
        <KPI label="Emitido" value={fmt(totalEmitido)} sub={`${rodadasEmitidas} rodada${rodadasEmitidas!==1?"s":""}`} color={green} T={T}/>
        <KPI label="Pendente" value={fmt(totalPendente)} sub={`${TOTAL_RODADAS - rodadasEmitidas} rodada${TOTAL_RODADAS-rodadasEmitidas!==1?"s":""}`} color={T.warning} T={T}/>
      </div>

      {/* Resumo por serviço */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
        {totaisPorServico.map(s => (
          <Card key={s.key} T={T}>
            <div style={{padding:"14px 18px"}}>
              <p style={{color:T.textSm,fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",margin:"0 0 6px"}}>{s.label}</p>
              <p className="num" style={{color:T.text,fontSize:18,fontWeight:800,margin:"0 0 4px"}}>{fmt(s.total)}</p>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                <span style={{color:green}}>Emitido: {fmt(s.emitido)}</span>
                <span style={{color:T.textSm}}>{s.total ? ((s.emitido/s.total)*100).toFixed(0) : 0}%</span>
              </div>
              <div style={{marginTop:6}}><Progress value={s.total ? (s.emitido/s.total)*100 : 0} T={T}/></div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <PanelTitle T={T} title="Controle por Rodada" subtitle="Serviços Livemode — Infra + Distribuição"/>
        <Button T={T} variant="primary" size="md" icon={CheckCircle2} onClick={syncInfra}>
          Sincronizar com Jogos
        </Button>
      </div>

      <Card T={T}>
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:700}}>
            <thead>
              <tr style={TS.thead}>
                {["Rodada","Jogos","Grafismo","Starlink","Downlink","Distribuição","Total","Status",""].map(h =>
                  <th key={h} style={{...TS.th, ...(["Jogos","Grafismo","Starlink","Downlink","Distribuição","Total"].includes(h)?TS.thRight:TS.thLeft)}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dados.map(r => {
                const isEdit = editRodada === r.rodada;
                const total = totalRodada(r);
                return (
                  <tr key={r.rodada} style={{...TS.tr, background: r.emitido ? (green+"08") : "transparent"}}>
                    <td style={{...TS.td, fontWeight:700, fontSize:13}}>Rodada {r.rodada}</td>
                    <td className="num" style={TS.tdNum}>
                      {isEdit ? <input type="number" value={editForm.jogos} onChange={e=>setEditForm(f=>({...f,jogos:e.target.value}))} style={{...IS,width:50,textAlign:"right",padding:"2px 6px",fontSize:12}}/> : r.jogos}
                    </td>
                    {SERVICOS_LM.map(s => (
                      <td key={s.key} className="num" style={TS.tdNum}>
                        {isEdit
                          ? <input type="number" value={editForm[s.key]} onChange={e=>setEditForm(f=>({...f,[s.key]:e.target.value}))} style={{...IS,width:80,textAlign:"right",padding:"2px 6px",fontSize:12}}/>
                          : fmt(r[s.key]||0)
                        }
                      </td>
                    ))}
                    <td className="num" style={{...TS.tdNum, fontWeight:700, color:purple}}>{fmt(total)}</td>
                    <td style={TS.td}>
                      <button onClick={()=>toggleEmitido(r.rodada)}
                        style={{
                          background: r.emitido ? green+"22" : T.warning+"22",
                          color: r.emitido ? green : T.warning,
                          border: `1px solid ${r.emitido ? green : T.warning}55`,
                          borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:700,
                          cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4,
                        }}>
                        {r.emitido ? <CheckCircle2 size={11} strokeWidth={2.5}/> : <Clock size={11} strokeWidth={2.5}/>}
                        {r.emitido ? "Emitido" : "Pendente"}
                      </button>
                    </td>
                    <td style={TS.td}>
                      {isEdit ? (
                        <div style={{display:"flex",gap:4}}>
                          <Button T={T} variant="primary" size="sm" onClick={saveEdit}>Salvar</Button>
                          <Button T={T} variant="secondary" size="sm" onClick={()=>setEditRodada(null)}>X</Button>
                        </div>
                      ) : (
                        <Button T={T} variant="secondary" size="sm" icon={Edit2} onClick={()=>startEdit(r)}/>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg,fontWeight:700}}>
                <td style={{...TS.td,fontSize:11,letterSpacing:"0.04em",textTransform:"uppercase"}}>Total</td>
                <td className="num" style={TS.tdNum}>{dados.reduce((s,r) => s + (r.jogos||0), 0)}</td>
                {SERVICOS_LM.map(s => (
                  <td key={s.key} className="num" style={{...TS.tdNum, fontWeight:700}}>{fmt(dados.reduce((sum,r) => sum + (r[s.key]||0), 0))}</td>
                ))}
                <td className="num" style={{...TS.tdNum, fontWeight:700, color:purple, fontSize:14}}>{fmt(totalGeral)}</td>
                <td colSpan={2}/>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
