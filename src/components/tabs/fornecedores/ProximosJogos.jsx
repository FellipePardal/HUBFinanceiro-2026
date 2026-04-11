import { useState, useMemo } from "react";
import { Pill } from "../../shared";
import { Card, PanelTitle, Chip, Badge, tableStyles } from "../../ui";
import { iSty, CAMPEONATOS } from "../../../constants";
import { Calendar, MapPin, AlertTriangle } from "lucide-react";

const STATUS_FILTROS = [
  { key:"todos",    label:"Todos" },
  { key:"futuros",  label:"Futuros" },
  { key:"semana",   label:"Próximos 7 dias" },
  { key:"sem_data", label:"Sem data / A definir" },
];

// Retorna classificação visual por linha
function classify(j, hoje) {
  if (!j.data || j.data === "A definir" || j.mandante === "A definir") return "urgente";
  if (j.data < hoje) return "passado";
  if (j.data === hoje) return "hoje";
  const dt = new Date(j.data);
  const hj = new Date(hoje);
  const diff = (dt - hj) / 86400000;
  if (diff <= 7) return "semana";
  return "futuro";
}

const CLASSES = {
  passado: { label:"Passado", color:"#94a3b8", bg:"rgba(148,163,184,0.06)" },
  hoje:    { label:"Hoje",    color:"#10b981", bg:"rgba(16,185,129,0.14)" },
  semana:  { label:"7 dias",  color:"#f59e0b", bg:"rgba(245,158,11,0.10)" },
  futuro:  { label:"Futuro",  color:"#3b82f6", bg:"rgba(59,130,246,0.06)" },
  urgente: { label:"Urgente", color:"#ef4444", bg:"rgba(239,68,68,0.10)" },
};

export default function ProximosJogos({ jogos, cotacoes, T }) {
  const IS = iSty(T);
  const TS = tableStyles(T);
  const hoje = new Date().toISOString().slice(0,10);

  const [filtroStatus, setFiltroStatus] = useState("futuros");
  const [filtroCamp,   setFiltroCamp]   = useState("todos");
  const [dataIni,      setDataIni]      = useState("");
  const [dataFim,      setDataFim]      = useState("");

  const rows = useMemo(() => {
    const enriched = (jogos||[]).map(j => ({ ...j, _cls: classify(j, hoje) }));
    return enriched.filter(j => {
      if (filtroStatus === "futuros"  && !["hoje","semana","futuro","urgente"].includes(j._cls)) return false;
      if (filtroStatus === "semana"   && !["hoje","semana"].includes(j._cls)) return false;
      if (filtroStatus === "sem_data" && j._cls !== "urgente") return false;
      if (dataIni && j.data && j.data !== "A definir" && j.data < dataIni) return false;
      if (dataFim && j.data && j.data !== "A definir" && j.data > dataFim) return false;
      return true;
    }).sort((a,b) => {
      const da = a.data && a.data !== "A definir" ? a.data : "9999";
      const db = b.data && b.data !== "A definir" ? b.data : "9999";
      return da.localeCompare(db) || (a.rodada||0) - (b.rodada||0);
    });
  }, [jogos, hoje, filtroStatus, dataIni, dataFim]);

  // Contagem de cotações por jogo (para mostrar indicador)
  const cotacoesPorJogo = useMemo(() => {
    const map = {};
    (cotacoes||[]).forEach(c => (c.jogoIds||[]).forEach(jid => { map[jid] = (map[jid]||0) + 1; }));
    return map;
  }, [cotacoes]);

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {STATUS_FILTROS.map(s => (
            <Chip key={s.key} active={filtroStatus===s.key} onClick={() => setFiltroStatus(s.key)} T={T}>{s.label}</Chip>
          ))}
          <div style={{width:1,height:24,background:T.border}}/>
          <select value={filtroCamp} onChange={e => setFiltroCamp(e.target.value)} style={{...IS,width:220}}>
            <option value="todos">Todos os campeonatos</option>
            {CAMPEONATOS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div style={{width:1,height:24,background:T.border}}/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Calendar size={14} color={T.textSm}/>
            <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} style={{...IS,width:150}}/>
            <span style={{color:T.textSm,fontSize:12}}>até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{...IS,width:150}}/>
          </div>
        </div>
      </div>

      <Card T={T}>
        <PanelTitle T={T} title="Próximos Jogos" subtitle={`${rows.length} jogo${rows.length!==1?"s":""} após filtros`}/>
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:880}}>
            <thead>
              <tr style={TS.thead}>
                {["Status","Rodada","Data","Hora","Cidade","Mandante × Visitante","Cat.","Detentor","Cotações"].map(h =>
                  <th key={h} style={{...TS.th, ...(h==="Cotações" ? TS.thRight : TS.thLeft)}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={9} style={{padding:32,textAlign:"center",color:T.textSm,fontSize:12}}>
                  Nenhum jogo encontrado com os filtros atuais.
                </td></tr>
              )}
              {rows.map(j => {
                const cls = CLASSES[j._cls];
                const nCot = cotacoesPorJogo[j.id] || 0;
                return (
                  <tr key={j.id} style={{
                    ...TS.tr,
                    background: cls.bg,
                    borderLeft: `3px solid ${cls.color}`,
                  }}>
                    <td style={TS.td}>
                      <Badge color={cls.color} T={T} size="sm">
                        {j._cls === "urgente" && <AlertTriangle size={11} style={{marginRight:2}}/>}
                        {cls.label}
                      </Badge>
                    </td>
                    <td style={{...TS.td,fontWeight:600,fontSize:12}}>R{j.rodada}</td>
                    <td style={{...TS.td,fontSize:12,color:T.textMd}}>{j.data || "—"}</td>
                    <td style={{...TS.td,fontSize:12,color:T.textMd}}>{j.hora || "—"}</td>
                    <td style={TS.td}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12}}>
                        <MapPin size={11} color={T.textSm}/>{j.cidade || "—"}
                      </div>
                    </td>
                    <td style={{...TS.td,fontWeight:600,fontSize:13}}>
                      {j.mandante} <span style={{color:T.textSm,fontWeight:400}}>×</span> {j.visitante}
                    </td>
                    <td style={TS.td}><Pill label={j.categoria||"—"} color={j.categoria==="B1"?(T.brand||"#10b981"):(T.warning||"#f59e0b")}/></td>
                    <td style={{...TS.td,fontSize:11,color:T.textSm}}>{j.detentor || "—"}</td>
                    <td className="num" style={{...TS.tdNum}}>
                      {nCot > 0
                        ? <Badge color={T.info||"#3b82f6"} T={T} size="sm">{nCot}</Badge>
                        : <span style={{fontSize:11,color:T.textSm}}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
