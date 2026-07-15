import { useState, useMemo, useEffect } from "react";
import { CATS, VAR_CAT_TO_CATKEY, FONT } from "../../constants";
import { fmt } from "../../utils";
import { Pill } from "../shared";
import { Card, PanelTitle, Segmented, Chip, tableStyles } from "../ui";
import { getNFFile } from "../../lib/supabase";
import { getNotaFiscalScales } from "../../lib/notasFiscais";
import { FileText, X, ChevronDown, ChevronRight } from "lucide-react";

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const mesDeData = dataStr => {
  const partes = String(dataStr || "").split("/");
  if (partes.length < 2) return null;
  const idx = parseInt(partes[1], 10) - 1;
  return MESES_ABREV[idx] || null;
};

const SUBKEY_TO_CAT = {};
CATS.forEach(cat => cat.subs.forEach(sub => { SUBKEY_TO_CAT[sub.key] = cat; }));

// Explode a nota (jogo) no mapa subKey → valor, ignorando o prefixo jogoId
const papelDaNotaJogo = nota => {
  if (nota.servicosDetalhe) {
    const acc = {};
    Object.entries(nota.servicosDetalhe).forEach(([k, v]) => {
      const subKey = k.split("_").slice(1).join("_");
      acc[subKey] = (acc[subKey] || 0) + (v || 0);
    });
    return acc;
  }
  if (nota.servicosValores) return { ...nota.servicosValores };
  return {};
};

const AGRUPAMENTOS = [
  { value:"individual", label:"Individual" },
  { value:"rodada",     label:"Por Rodada" },
  { value:"mes",        label:"Por Mês" },
  { value:"categoria",  label:"Por Categoria" },
  { value:"fornecedor", label:"Por Fornecedor" },
];
const TIPOS = [
  { value:"todos",    label:"Todos" },
  { value:"prevista", label:"Prevista" },
  { value:"avulsa",   label:"Avulsa" },
  { value:"mensal",   label:"Mensal" },
  { value:"fixo",     label:"Fixo" },
];

export default function TabRastreabilidade({ notas, notasMensais, servicos, jogos, T, filtroInicial, onClearFiltroInicial, dedupeNotasPorNF = false }) {
  const TS = tableStyles(T);
  const purple = "#a855f7";

  const [agrupamento, setAgrupamento] = useState(filtroInicial ? "individual" : "rodada");
  const [tipoSel, setTipoSel] = useState("todos");
  const [busca, setBusca] = useState("");
  const [grupoAberto, setGrupoAberto] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Ao chegar um novo filtro vindo do clique no dashboard, volta pro modo individual
  useEffect(() => { if (filtroInicial) setAgrupamento("individual"); }, [filtroInicial]);

  const abrirPreview = async (id) => {
    setPreviewId(id);
    setPreviewSrc(null);
    setPreviewLoading(true);
    const data = await getNFFile(id);
    setPreviewSrc(data || null);
    setPreviewLoading(false);
  };

  const servicoInfo = useMemo(() => {
    const map = {};
    (servicos || []).forEach(sec => (sec.itens || []).forEach(it => { map[it.id] = { nome: it.nome, secao: sec.secao }; }));
    return map;
  }, [servicos]);

  const nfScales = useMemo(() => getNotaFiscalScales(notas, "valorNF", { dedupe: dedupeNotasPorNF }), [notas, dedupeNotasPorNF]);

  const linhasJogo = useMemo(() => notas.map(n => {
    const papel = papelDaNotaJogo(n);
    const subKeys = Object.keys(papel);
    const categorias = subKeys.length
      ? [...new Set(subKeys.map(sk => SUBKEY_TO_CAT[sk]?.label || "Sem categoria"))]
      : ["Sem categoria"];
    const jogo = jogos.find(j => j.id === n.jogoId);
    const tipo = n.tipo === "avulsa" ? "avulsa" : "prevista";
    return {
      id: n.id, origem:"jogo", tipo,
      fornecedor: n.fornecedor || "—",
      numeroNF: n.numeroNF || "", codigo: n.codigo || "",
      valorNF: n.valorNF || 0, scale: nfScales[n.id] ?? 1,
      rodada: n.rodada ?? jogo?.rodada ?? null,
      mes: mesDeData(jogo?.data),
      jogoLabel: n.jogoLabel || "",
      descricao: (n.servicosLabels || []).join(", "),
      categorias, dataEmissao: n.dataEmissao || "", hasFile: !!n.hasFile,
      _papel: papel,
    };
  }), [notas, jogos, nfScales]);

  const linhasMensal = useMemo(() => notasMensais.map(n => {
    let categoriaLabel, tipo, catKeyMensal = null, isOutrosMensais = false;
    if (n.servicoId) {
      tipo = "fixo";
      categoriaLabel = servicoInfo[n.servicoId]?.secao || "Fixo";
    } else if (n.categoria === "Seg. Espacial") {
      tipo = "mensal";
      categoriaLabel = "Seg. Espacial (não contabilizado no resumo)";
    } else if (VAR_CAT_TO_CATKEY[n.categoria]) {
      tipo = "mensal";
      catKeyMensal = VAR_CAT_TO_CATKEY[n.categoria];
      categoriaLabel = CATS.find(c => c.key === catKeyMensal)?.label || n.categoria;
    } else {
      tipo = "mensal";
      categoriaLabel = "Outros Mensais";
      isOutrosMensais = true;
    }
    return {
      id: n.id, origem:"mensal", tipo,
      fornecedor: n.fornecedor || "—",
      numeroNF: n.numeroNF || "", codigo: "",
      valorNF: n.valor || 0, scale: 1,
      rodada: null, mes: n.mesLabel ? n.mesLabel.slice(0,3) : null,
      jogoLabel: "",
      descricao: n.categoria || n.descricao || "Mensal",
      categorias: [categoriaLabel], dataEmissao: n.dataEmissao || "", hasFile: !!n.hasFile,
      _papel: {}, _servicoId: n.servicoId || null, _catKeyMensal: catKeyMensal, _isOutrosMensais: isOutrosMensais,
    };
  }), [notasMensais, servicoInfo]);

  const linhas = useMemo(() => [...linhasJogo, ...linhasMensal], [linhasJogo, linhasMensal]);

  const matchFiltroInicial = linha => {
    if (!filtroInicial) return true;
    if (filtroInicial.servicoIds) return linha._servicoId != null && filtroInicial.servicoIds.includes(linha._servicoId);
    if (filtroInicial.outrosMensais) return !!linha._isOutrosMensais;
    if (filtroInicial.subKeys) {
      if (linha.origem === "jogo") return Object.keys(linha._papel).some(sk => filtroInicial.subKeys.includes(sk));
      if (linha.origem === "mensal") return !!filtroInicial.catKey && linha._catKeyMensal === filtroInicial.catKey;
    }
    return true;
  };

  const baseLinhas = useMemo(() => linhas.filter(matchFiltroInicial), [linhas, filtroInicial]);

  const linhasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return baseLinhas.filter(l => {
      if (tipoSel !== "todos" && l.tipo !== tipoSel) return false;
      if (q && !(`${l.fornecedor} ${l.numeroNF} ${l.codigo} ${l.descricao}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [baseLinhas, tipoSel, busca]);

  const valorLinha = l => (l.valorNF || 0) * (l.scale ?? 1);
  const totalGeral = linhasFiltradas.reduce((s, l) => s + valorLinha(l), 0);

  const grupos = useMemo(() => {
    if (agrupamento === "individual") return null;
    const map = new Map();
    const add = (chave, linha, valor) => {
      if (!map.has(chave)) map.set(chave, { chave, valor:0, itens:[] });
      const g = map.get(chave);
      g.valor += valor;
      g.itens.push(linha);
    };
    linhasFiltradas.forEach(l => {
      if (agrupamento === "rodada") {
        add(l.origem === "jogo" && l.rodada != null ? `Rodada ${l.rodada}` : "Mensais (sem rodada)", l, valorLinha(l));
      } else if (agrupamento === "mes") {
        add(l.mes || "Sem data", l, valorLinha(l));
      } else if (agrupamento === "fornecedor") {
        add(l.fornecedor || "—", l, valorLinha(l));
      } else if (agrupamento === "categoria") {
        if (l.origem === "jogo") {
          const contrib = {};
          Object.entries(l._papel).forEach(([sk, v]) => {
            const label = SUBKEY_TO_CAT[sk]?.label || "Sem categoria";
            contrib[label] = (contrib[label] || 0) + v * (l.scale ?? 1);
          });
          if (Object.keys(contrib).length === 0) contrib["Sem categoria"] = valorLinha(l);
          Object.entries(contrib).forEach(([label, valor]) => add(label, l, valor));
        } else {
          add(l.categorias[0], l, valorLinha(l));
        }
      }
    });
    return [...map.values()].sort((a,b) => b.valor - a.valor);
  }, [agrupamento, linhasFiltradas]);

  const TIPO_LABEL = { prevista:"Prevista", avulsa:"Avulsa", mensal:"Mensal", fixo:"Fixo" };
  const TIPO_PILL_COLOR = { prevista:"#2563EB", avulsa:"#D97706", mensal:"#7C3AED", fixo:"#7C3AED" };

  const LinhaRow = ({ l }) => (
    <tr style={TS.tr}>
      <td style={TS.td}>{l.codigo || l.numeroNF || "—"}</td>
      <td style={TS.td}>{l.fornecedor}</td>
      <td style={TS.td}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {l.categorias.map(c => <Pill key={c} label={c} color="#06b6d4"/>)}
        </div>
      </td>
      <td style={TS.td}>{l.origem==="jogo" ? (l.rodada!=null?`Rd ${l.rodada}`:"—") : (l.mes||"—")}</td>
      <td style={TS.td}><Pill label={TIPO_LABEL[l.tipo]||l.tipo} color={TIPO_PILL_COLOR[l.tipo]||"#64748b"}/></td>
      <td style={TS.td}>{l.descricao || "—"}</td>
      <td style={{...TS.tdNum, color:T.success||"#16A34A", fontWeight:600}}>
        {fmt(valorLinha(l))}
        {l.scale != null && l.scale !== 1 && (
          <div style={{fontSize:10,color:T.textSm,fontWeight:400}}>rateado (dup. {Math.round(1/l.scale)}x)</div>
        )}
      </td>
      <td style={TS.td}>
        {l.hasFile ? (
          <button onClick={() => abrirPreview(l.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#0ea5e9",display:"flex",alignItems:"center",gap:4,fontSize:12}}>
            <FileText size={13}/> Ver
          </button>
        ) : <span style={{color:T.textSm,fontSize:12}}>—</span>}
      </td>
    </tr>
  );

  const headerCols = ["Código/NF","Fornecedor","Categoria","Rodada/Mês","Tipo","Descrição","Valor","NF"];

  return (
    <div>
      <PanelTitle T={T} title="Rastreabilidade de Notas Fiscais"
        subtitle="Visão individual e consolidada — onde cada NF está sendo contabilizada no orçamento"
        right={
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar fornecedor, NF, descrição..."
              style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${T.border}`,background:T.surface||T.card,color:T.text,fontSize:12,minWidth:200}}/>
          </div>
        }
      />

      {filtroInicial && (
        <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0"}}>
          <Chip active T={T} color={purple}>Filtrado por: {filtroInicial.nome}</Chip>
          <button onClick={onClearFiltroInicial} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:T.textSm,fontSize:12}}>
            <X size={13}/> Limpar filtro
          </button>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,margin:"16px 0"}}>
        <Segmented options={AGRUPAMENTOS} value={agrupamento} onChange={setAgrupamento} T={T}/>
        <Segmented options={TIPOS} value={tipoSel} onChange={setTipoSel} T={T}/>
      </div>

      <Card T={T} padding={0} style={{marginBottom:16}}>
        <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border}`}}>
          <span style={{color:T.textSm,fontSize:12}}>{linhasFiltradas.length} nota(s)</span>
          <span style={{fontWeight:700,fontSize:16,color:T.success||"#16A34A",fontFamily:FONT.num}}>{fmt(totalGeral)}</span>
        </div>

        {agrupamento === "individual" ? (
          <div style={TS.wrap}>
            <table style={TS.table}>
              <thead><tr>{headerCols.map(h => <th key={h} style={{...TS.th, ...(h==="Valor"?TS.thRight:TS.thLeft)}}>{h}</th>)}</tr></thead>
              <tbody>
                {linhasFiltradas.length === 0 && (
                  <tr><td colSpan={headerCols.length} style={{...TS.td,textAlign:"center",color:T.textSm,padding:30}}>Nenhuma NF encontrada</td></tr>
                )}
                {linhasFiltradas.map(l => <LinhaRow key={`${l.origem}_${l.id}`} l={l}/>)}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {(grupos || []).length === 0 && (
              <p style={{color:T.textSm,fontSize:13,padding:20,textAlign:"center"}}>Nenhuma NF encontrada</p>
            )}
            {(grupos || []).map(g => {
              const aberto = grupoAberto === g.chave;
              return (
                <div key={g.chave} style={{borderBottom:`1px solid ${T.border}`}}>
                  <div onClick={() => setGrupoAberto(aberto ? null : g.chave)}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {aberto ? <ChevronDown size={14} color={T.textSm}/> : <ChevronRight size={14} color={T.textSm}/>}
                      <span style={{fontWeight:600,fontSize:13,color:T.text}}>{g.chave}</span>
                      <span style={{color:T.textSm,fontSize:12}}>({g.itens.length})</span>
                    </div>
                    <span style={{fontWeight:700,fontSize:13,color:T.success||"#16A34A",fontFamily:FONT.num}}>{fmt(g.valor)}</span>
                  </div>
                  {aberto && (
                    <div style={TS.wrap}>
                      <table style={TS.table}>
                        <thead><tr>{headerCols.map(h => <th key={h} style={{...TS.th, ...(h==="Valor"?TS.thRight:TS.thLeft)}}>{h}</th>)}</tr></thead>
                        <tbody>{g.itens.map(l => <LinhaRow key={`${l.origem}_${l.id}_${g.chave}`} l={l}/>)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {previewId != null && (
        <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:200,display:"flex",flexDirection:"column"}}
          onClick={() => { setPreviewId(null); setPreviewSrc(null); }}>
          <div style={{display:"flex",justifyContent:"flex-end",padding:"12px 20px",flexShrink:0}} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setPreviewId(null); setPreviewSrc(null); }} style={{background:"#475569",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Fechar</button>
          </div>
          <div style={{flex:1,padding:"0 20px 20px",minHeight:0}} onClick={e => e.stopPropagation()}>
            {previewLoading ? (
              <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#94a3b8"}}>Carregando...</p></div>
            ) : !previewSrc ? (
              <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#94a3b8"}}>Arquivo não encontrado</p></div>
            ) : previewSrc.startsWith("data:application/pdf") ? (
              <iframe src={previewSrc} style={{width:"100%",height:"100%",border:"none",borderRadius:12,background:"#fff"}}/>
            ) : (
              <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto"}}>
                <img src={previewSrc} alt="NF" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
