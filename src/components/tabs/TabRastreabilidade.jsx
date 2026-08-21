import { useState, useMemo, useEffect } from "react";
import { CATS, VAR_CAT_TO_CATKEY, FONT } from "../../constants";
import { fmt, fmtR } from "../../utils";
import { Pill } from "../shared";
import { Card, PanelTitle, Segmented, Chip, tableStyles } from "../ui";
import { getNFFile } from "../../lib/supabase";
import { ALIAS_SUBKEY, SUBS_IGNORAR_REALIZADO_NF, getNotaFiscalScales } from "../../lib/notasFiscais";
import { normTexto } from "../../lib/dedupeNF";
import { buildFechamentoPorRodada } from "../../lib/fechamentoRodada";
import { FileText, X, ChevronDown, ChevronRight, CheckCircle2, Clock } from "lucide-react";

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const mesDeData = dataStr => {
  const partes = String(dataStr || "").split("/");
  if (partes.length < 2) return null;
  const idx = parseInt(partes[1], 10) - 1;
  return MESES_ABREV[idx] || null;
};

const SUBKEY_TO_CAT = {};
const SUBKEY_LABEL = {};
CATS.forEach(cat => cat.subs.forEach(sub => { SUBKEY_TO_CAT[sub.key] = cat; SUBKEY_LABEL[sub.key] = sub.label; }));
const ORIGEM_COLOR = { "Seg. Espacial": "#D97706", "Infra Livemode": "#a855f7", "liveU": "#0ea5e9", "Reembolso Logística": "#16A34A" };


// Explode a nota (jogo) no mapa subKey → valor, ignorando o prefixo jogoId.
// Aplica o mesmo ALIAS_SUBKEY do motor de cálculo (TabNotas.jsx) para que subKeys
// virtuais (sng_host, etc.) caiam na categoria onde o valor realmente é contabilizado
// no orçamento. reembolso_log é ignorado: é o pedido/comprovante formal de um valor
// que já está contado nos lançamentos de Logística -- não deve compor nenhuma categoria.
const papelDaNotaJogo = nota => {
  if (nota.servicosDetalhe) {
    const acc = {};
    Object.entries(nota.servicosDetalhe).forEach(([k, v]) => {
      const subKey = k.split("_").slice(1).join("_");
      if (SUBS_IGNORAR_REALIZADO_NF.has(subKey)) return;
      const finalKey = ALIAS_SUBKEY[subKey] || subKey;
      acc[finalKey] = (acc[finalKey] || 0) + (v || 0);
    });
    return acc;
  }
  if (nota.servicosValores) {
    const acc = {};
    Object.entries(nota.servicosValores).forEach(([subKey, v]) => {
      if (SUBS_IGNORAR_REALIZADO_NF.has(subKey)) return;
      const finalKey = ALIAS_SUBKEY[subKey] || subKey;
      acc[finalKey] = (acc[finalKey] || 0) + (v || 0);
    });
    return acc;
  }
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
  { value:"todos",      label:"Todos" },
  { value:"prevista",   label:"Prevista" },
  { value:"avulsa",     label:"Avulsa" },
  { value:"mensal",     label:"Mensal" },
  { value:"fixo",       label:"Fixo" },
  { value:"livemode",   label:"Livemode" },
  { value:"reembolso",  label:"Reembolso Livemode" },
];

export default function TabRastreabilidade({ notas, notasMensais, servicos, jogos, notasLivemode = [], notasLiveU = [], T, filtroInicial, onClearFiltroInicial, dedupeNotasPorNF = false, grupoDoJogo = null }) {
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
    const isReembolso = n.tipo === "reembolso_livemode";
    const categorias = subKeys.length
      ? [...new Set(subKeys.map(sk => SUBKEY_TO_CAT[sk]?.label || "Sem categoria"))]
      : [isReembolso ? "Reembolso Livemode (já contado na Logística)" : "Sem categoria"];
    const jogo = jogos.find(j => j.id === n.jogoId);
    const tipo = n.tipo === "avulsa" ? "avulsa" : isReembolso ? "reembolso" : "prevista";
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
    if (n.servicoId && servicoInfo[n.servicoId]) {
      tipo = "fixo";
      categoriaLabel = servicoInfo[n.servicoId].secao || "Fixo";
    } else if (n.servicoId) {
      // servicoId aponta pra um item de serviço fixo que já foi excluído —
      // órfã: cai em "Outros Mensais" (mesma regra do outrosMensaisCalc do dashboard),
      // senão o valor dela desapareceria do resumo mas continuaria aparecendo aqui.
      tipo = "mensal";
      categoriaLabel = "Outros Mensais (serviço removido)";
      isOutrosMensais = true;
    } else if (n.categoria === "Seg. Espacial") {
      // Rateada entre os jogos do mês (rateioSegEspacialPorJogo) e somada dentro de
      // jogo.realizado.seg_espacial — conta em "Operações", não num bucket mensal direto.
      tipo = "mensal";
      catKeyMensal = "operacoes";
      categoriaLabel = "Operações (Seg. Espacial, rateada por jogo)";
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
      _segEspacial: n.categoria === "Seg. Espacial",
    };
  }), [notasMensais, servicoInfo]);

  // NFs Livemode/liveU: alimentam jogo.realizado.infra em bloco (TabLivemode.syncInfra),
  // sem quebra por jogo/subserviço — mostradas aqui pra fechar a ponta de rastreabilidade,
  // já que antes elas não apareciam em lugar nenhum fora da própria aba Livemode.
  const linhasLivemode = useMemo(() => {
    const mapNota = (n, label) => ({
      id: `livemode_${n.id}`, origem:"livemode", tipo:"livemode",
      fornecedor: n.fornecedor || "Livemode",
      numeroNF: n.numeroNF || "", codigo: "",
      valorNF: n.valor || 0, scale: 1,
      rodada: null, mes: n.rodadasLabel || n.jogosResumoLabel || null,
      jogoLabel: n.jogosResumoLabel || "",
      descricao: (n.servicosLabels || []).join(", ") || label,
      categorias: [SUBKEY_TO_CAT["infra"]?.label || "Operações"],
      dataEmissao: n.dataEmissao || "", hasFile: !!n.hasFile,
      _papel: {}, _subKeyFinal: "infra",
    });
    return [
      ...(notasLivemode || []).map(n => mapNota(n, "NF Livemode")),
      ...(notasLiveU || []).map(n => mapNota(n, "liveU")),
    ];
  }, [notasLivemode, notasLiveU]);

  // Rastreabilidade é 100% Notas Fiscais — lançamentos de Logística (rascunho pra
  // consolidar e pedir o reembolso à Livemode) não entram aqui, só a NF em si
  // (já coberta por linhasJogo via tipo "reembolso_livemode"). Contá-los junto
  // inflaria o total com dinheiro ainda não faturado, ou duplicaria quando a
  // NF de reembolso sair.
  const linhas = useMemo(() => [...linhasJogo, ...linhasMensal, ...linhasLivemode], [linhasJogo, linhasMensal, linhasLivemode]);

  const matchFiltroInicial = linha => {
    if (!filtroInicial) return true;
    if (filtroInicial.servicoIds) return linha._servicoId != null && filtroInicial.servicoIds.includes(linha._servicoId);
    if (filtroInicial.outrosMensais) return !!linha._isOutrosMensais;
    if (filtroInicial.subKeys) {
      if (linha.origem === "jogo") return Object.keys(linha._papel).some(sk => filtroInicial.subKeys.includes(sk));
      if (linha.origem === "livemode") return filtroInicial.subKeys.includes(linha._subKeyFinal);
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

  // Quando um filtro de categoria está ativo, uma NF que também cobre OUTRAS
  // categorias (ex: uma nota "Pessoal" que também tem Operações) só deve contar,
  // aqui, pela fatia que pertence à categoria filtrada — não pelo valor total da NF.
  const valorAtribuido = l => {
    if (filtroInicial?.subKeys && l.origem === "jogo") {
      return Object.entries(l._papel)
        .filter(([sk]) => filtroInicial.subKeys.includes(sk))
        .reduce((s, [, v]) => s + v, 0) * (l.scale ?? 1);
    }
    return valorLinha(l);
  };
  const ehValorParcial = l => filtroInicial?.subKeys && l.origem === "jogo" && valorAtribuido(l) !== valorLinha(l);

  const totalGeral = linhasFiltradas.reduce((s, l) => s + valorAtribuido(l), 0);

  // "Por Fornecedor": grafias diferentes do mesmo nome ("João Marcos" ×
  // "joão marcos") viravam linhas separadas — mesma raiz do pagamento em dobro
  // da NF 16 (08/2026). Agrupa pela grafia normalizada e exibe a mais comum.
  const grafiaFornecedor = useMemo(() => {
    const contagem = new Map(); // norm -> Map(grafia -> ocorrências)
    linhasFiltradas.forEach(l => {
      const raw = String(l.fornecedor || "").trim();
      if (!raw) return;
      const k = normTexto(raw);
      if (!contagem.has(k)) contagem.set(k, new Map());
      const c = contagem.get(k);
      c.set(raw, (c.get(raw) || 0) + 1);
    });
    const map = new Map();
    contagem.forEach((c, k) => map.set(k, [...c.entries()].sort((a, b) => b[1] - a[1])[0][0]));
    return map;
  }, [linhasFiltradas]);

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
        add(l.rodada != null ? `Rodada ${l.rodada}` : "Mensais (sem rodada)", l, valorAtribuido(l));
      } else if (agrupamento === "mes") {
        add(l.mes || "Sem data", l, valorAtribuido(l));
      } else if (agrupamento === "fornecedor") {
        add(grafiaFornecedor.get(normTexto(l.fornecedor)) || "—", l, valorAtribuido(l));
      } else if (agrupamento === "categoria") {
        if (l.origem === "jogo") {
          // Se já há um filtro de categoria ativo, restringe o rateio às subKeys
          // filtradas — senão uma NF multi-categoria "vaza" valor pra categorias
          // que não são a filtrada.
          const entradas = filtroInicial?.subKeys
            ? Object.entries(l._papel).filter(([sk]) => filtroInicial.subKeys.includes(sk))
            : Object.entries(l._papel);
          const contrib = {};
          entradas.forEach(([sk, v]) => {
            const label = SUBKEY_TO_CAT[sk]?.label || "Sem categoria";
            contrib[label] = (contrib[label] || 0) + v * (l.scale ?? 1);
          });
          if (Object.keys(contrib).length === 0) contrib["Sem categoria"] = valorAtribuido(l);
          Object.entries(contrib).forEach(([label, valor]) => add(label, l, valor));
        } else {
          add(l.categorias[0], l, valorAtribuido(l));
        }
      }
    });
    return [...map.values()].sort((a,b) => b.valor - a.valor);
  }, [agrupamento, linhasFiltradas, filtroInicial, grafiaFornecedor]);

  // ── Por Rodada: usa o motor do fechamento (lib/fechamentoRodada) ────────────
  // Cada rodada lista TODAS as notas que compõem o realizado dela: as NFs diretas
  // (pelo valor que contribuem à rodada, não pelo valor cheio) e as fatias de
  // rateio (Seg. Espacial mensal, Infra Livemode, liveU) com memória de cálculo.
  // O total do grupo bate por construção com o realizado da rodada no dashboard.
  const fechamento = useMemo(
    () => buildFechamentoPorRodada({ jogos, notas, notasMensais, notasLivemode, notasLiveU, dedupeNotasPorNF, grupoDoJogo }),
    [jogos, notas, notasMensais, notasLivemode, notasLiveU, dedupeNotasPorNF, grupoDoJogo]
  );

  const gruposRodada = useMemo(() => {
    if (agrupamento !== "rodada") return null;
    const q = busca.trim().toLowerCase();
    const passa = l => {
      if (tipoSel !== "todos" && l.tipo !== tipoSel) return false;
      if (q && !(`${l.fornecedor} ${l.numeroNF} ${l.codigo || ""} ${l.descricao || ""}`.toLowerCase().includes(q))) return false;
      return true;
    };
    const tipoDireta = t => t === "avulsa" ? "avulsa" : t === "reembolso_livemode" ? "reembolso" : "prevista";

    const gs = fechamento.rodadas.map(r => {
      const diretas = r.diretas.map(l => ({
        key: `d_${l.id}`, previewId: l.id, tipo: tipoDireta(l.tipo),
        fornecedor: l.fornecedor, numeroNF: l.numeroNF, codigo: l.codigo,
        categorias: [...new Set(l.subs.map(sk => SUBKEY_TO_CAT[sk]?.label || "Sem categoria"))],
        descricao: l.subs.map(sk => SUBKEY_LABEL[sk] || sk).join(", "),
        valor: l.valor, hasFile: l.hasFile,
        nota: l.scale !== 1 ? `NF compartilhada — valor cheio ${fmtR(l.valorNF)}` : null,
        _fatia: false,
      }));
      const rateios = r.rateios.map(l => ({
        key: `f_${l.id}`,
        previewId: l.fonte === "livemode" ? `livemode_${l.notaId}` : l.notaId,
        tipo: l.fonte === "mensal" ? "mensal" : l.fonte === "nota" ? "reembolso" : "livemode",
        fornecedor: l.fornecedor, numeroNF: l.numeroNF, codigo: "",
        categorias: [l.origem], origem: l.origem,
        descricao: l.fatiaPorJogo != null
          ? `${fmtR(l.valorNF)} ÷ ${l.cobreLabel} = ${fmtR(l.fatiaPorJogo)}/jogo × ${l.jogosIds.length} jogo${l.jogosIds.length > 1 ? "s" : ""} desta rodada`
          : `NF consolidada de ${fmtR(l.valorNF)} cobrindo ${l.cobre} jogos — parcela desta rodada conforme quebra da NF`,
        valor: l.valor, hasFile: l.hasFile,
        nota: l.referencia || null,
        _fatia: true,
      }));
      const manuais = Math.abs(r.manual) >= 0.01 ? [{
        key: `m_${r.key}`, previewId: null, tipo: "manual",
        fornecedor: "—", numeroNF: "", codigo: "",
        categorias: ["Manual / sem NF"], descricao: "Valores lançados direto no jogo (ex: Seg. Extra)",
        valor: r.manual, hasFile: false, _fatia: true,
      }] : [];
      const itens = [...diretas, ...rateios, ...manuais].filter(passa);
      return {
        chave: r.label, itens,
        valor: itens.reduce((s, l) => s + l.valor, 0),
        meta: {
          direto: itens.filter(l => !l._fatia).reduce((s, l) => s + l.valor, 0),
          rateado: itens.filter(l => l._fatia).reduce((s, l) => s + l.valor, 0),
          totalRodada: r.total, pendencias: r.pendencias, fechada: r.fechada,
        },
      };
    });

    // Mensais que não são rateadas por jogo continuam num grupo próprio
    const mensaisResto = linhasMensal.filter(l => !l._segEspacial).filter(l => passa({ ...l, valor: l.valorNF })).map(l => ({
      key: `mensal_${l.id}`, previewId: l.id, tipo: l.tipo,
      fornecedor: l.fornecedor, numeroNF: l.numeroNF, codigo: l.codigo,
      categorias: l.categorias, descricao: l.descricao,
      valor: l.valorNF, hasFile: l.hasFile, _fatia: false,
    }));
    if (mensaisResto.length) gs.push({ chave: "Mensais (sem rodada)", itens: mensaisResto, valor: mensaisResto.reduce((s, l) => s + l.valor, 0), meta: null });

    // Fatias que não chegaram a nenhuma rodada (órfãs / NF sem jogos vinculados)
    const naoAloc = fechamento.naoAlocado.filter(l => passa({ ...l, descricao: l.motivo })).map(l => ({
      key: `na_${l.id}`, previewId: l.origem === "Seg. Espacial" ? l.notaId : `livemode_${l.notaId}`,
      tipo: l.origem === "Seg. Espacial" ? "mensal" : "livemode",
      fornecedor: l.fornecedor, numeroNF: l.numeroNF, codigo: "",
      categorias: [l.origem], origem: l.origem, descricao: l.motivo,
      valor: l.valor, hasFile: l.hasFile, _fatia: true,
    }));
    if (naoAloc.length) gs.push({ chave: "Não alocado a rodadas", itens: naoAloc, valor: naoAloc.reduce((s, l) => s + l.valor, 0), meta: null });

    return gs;
  }, [agrupamento, fechamento, linhasMensal, tipoSel, busca]);

  const TIPO_LABEL = { prevista:"Prevista", avulsa:"Avulsa", mensal:"Mensal", fixo:"Fixo", livemode:"Livemode", reembolso:"Reembolso Livemode", manual:"Manual" };
  const TIPO_PILL_COLOR = { prevista:"#2563EB", avulsa:"#D97706", mensal:"#7C3AED", fixo:"#7C3AED", livemode:"#a855f7", reembolso:"#64748b", manual:"#64748b" };
  const green = T.success || "#16A34A";
  const amber = "#D97706";

  const LinhaRow = ({ l }) => (
    <tr style={TS.tr}>
      <td style={TS.td}>{l.codigo || l.numeroNF || "—"}</td>
      <td style={TS.td}>{l.fornecedor}</td>
      <td style={TS.td}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {l.categorias.map(c => <Pill key={c} label={c} color="#06b6d4"/>)}
        </div>
      </td>
      <td style={TS.td}>{l.rodada!=null ? `Rd ${l.rodada}` : (l.mes||"—")}</td>
      <td style={TS.td}><Pill label={TIPO_LABEL[l.tipo]||l.tipo} color={TIPO_PILL_COLOR[l.tipo]||"#64748b"}/></td>
      <td style={TS.td}>{l.descricao || "—"}</td>
      <td style={{...TS.tdNum, color:T.success||"#16A34A", fontWeight:600}}>
        {fmt(valorAtribuido(l))}
        {l.scale != null && l.scale !== 1 && (
          <div style={{fontSize:10,color:T.textSm,fontWeight:400}}>rateado (dup. {Math.round(1/l.scale)}x)</div>
        )}
        {ehValorParcial(l) && (
          <div style={{fontSize:10,color:T.textSm,fontWeight:400}}>de {fmt(valorLinha(l))} no total da NF</div>
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

  // Linha de nota dentro de um grupo de rodada (dados vindos do motor de fechamento)
  const rodadaCols = ["Fornecedor","NF","Categoria","Tipo","Memória / Descrição","Valor","Arq."];
  const RodadaItemRow = ({ l }) => (
    <tr style={TS.tr}>
      <td style={TS.td}>{l.fornecedor}</td>
      <td style={TS.td}>{l.numeroNF || l.codigo || "—"}</td>
      <td style={TS.td}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {l.categorias.map(c => <Pill key={c} label={c} color={l._fatia ? (ORIGEM_COLOR[l.origem] || "#64748b") : "#06b6d4"}/>)}
        </div>
      </td>
      <td style={TS.td}><Pill label={TIPO_LABEL[l.tipo]||l.tipo} color={TIPO_PILL_COLOR[l.tipo]||"#64748b"}/></td>
      <td style={{...TS.td, fontSize:12, color:l._fatia ? (T.textMd||T.textSm) : T.text}}>
        {l.descricao || "—"}
        {l.nota && <div style={{fontSize:10,color:T.textSm}}>{l.nota}</div>}
      </td>
      <td style={{...TS.tdNum, color: l._fatia ? amber : green, fontWeight:600}}>{fmtR(l.valor)}</td>
      <td style={TS.td}>
        {l.hasFile && l.previewId != null ? (
          <button onClick={() => abrirPreview(l.previewId)} style={{background:"none",border:"none",cursor:"pointer",color:"#0ea5e9",display:"flex",alignItems:"center",gap:4,fontSize:12}}>
            <FileText size={13}/> Ver
          </button>
        ) : <span style={{color:T.textSm,fontSize:12}}>—</span>}
      </td>
    </tr>
  );

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
        <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border}`,gap:12,flexWrap:"wrap"}}>
          <span style={{color:T.textSm,fontSize:12}}>
            {agrupamento === "rodada"
              ? `${(gruposRodada||[]).reduce((s,g)=>s+g.itens.length,0)} linha(s) — NFs diretas + fatias de rateio por rodada`
              : `${linhasFiltradas.length} nota(s)`}
          </span>
          <span style={{fontWeight:700,fontSize:16,color:T.success||"#16A34A",fontFamily:FONT.num}}>
            {agrupamento === "rodada" ? fmtR((gruposRodada||[]).reduce((s,g)=>s+g.valor,0)) : fmt(totalGeral)}
          </span>
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
        ) : agrupamento === "rodada" ? (
          <div>
            {(gruposRodada || []).length === 0 && (
              <p style={{color:T.textSm,fontSize:13,padding:20,textAlign:"center"}}>Nenhuma NF encontrada</p>
            )}
            {(gruposRodada || []).map(g => {
              const aberto = grupoAberto === g.chave;
              return (
                <div key={g.chave} style={{borderBottom:`1px solid ${T.border}`}}>
                  <div onClick={() => setGrupoAberto(aberto ? null : g.chave)}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",cursor:"pointer",gap:12,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                      {aberto ? <ChevronDown size={14} color={T.textSm}/> : <ChevronRight size={14} color={T.textSm}/>}
                      <span style={{fontWeight:600,fontSize:13,color:T.text}}>{g.chave}</span>
                      <span style={{color:T.textSm,fontSize:12}}>({g.itens.length})</span>
                      {g.meta && (g.meta.fechada
                        ? <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:green}}><CheckCircle2 size={13}/> Fechada</span>
                        : <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:amber}}><Clock size={13}/> {g.meta.pendencias.length} pendência{g.meta.pendencias.length>1?"s":""}</span>)}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      {g.meta && (
                        <span style={{fontSize:11,color:T.textSm,fontFamily:FONT.num}}>
                          <span style={{color:green}}>{fmtR(g.meta.direto)}</span> diretas + <span style={{color:amber}}>{fmtR(g.meta.rateado)}</span> rateios
                        </span>
                      )}
                      <span style={{fontWeight:700,fontSize:13,color:T.success||"#16A34A",fontFamily:FONT.num}}>{fmtR(g.valor)}</span>
                    </div>
                  </div>
                  {aberto && (
                    <div style={{padding:"0 0 14px"}}>
                      <div style={TS.wrap}>
                        <table style={{...TS.table, minWidth:720}}>
                          <thead><tr>{rodadaCols.map(h => <th key={h} style={{...TS.th, ...(h==="Valor"?TS.thRight:TS.thLeft)}}>{h}</th>)}</tr></thead>
                          <tbody>
                            {g.itens.map(l => <RodadaItemRow key={l.key} l={l}/>)}
                            {g.meta && (
                              <tr style={{...TS.tr, background:T.surfaceAlt||T.bg}}>
                                <td style={{...TS.td, fontWeight:700}} colSpan={5}>
                                  {g.chave} — Total
                                  <span style={{fontWeight:400,fontSize:11,color:T.textSm,marginLeft:8}}>
                                    ({fmtR(g.meta.direto)} diretas + {fmtR(g.meta.rateado)} rateios)
                                  </span>
                                </td>
                                <td style={{...TS.tdNum, fontWeight:700}}>{fmtR(g.valor)}</td>
                                <td style={TS.td}/>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {g.meta && g.meta.pendencias.length > 0 && (
                        <div style={{margin:"12px 20px 0",padding:"10px 14px",borderRadius:10,border:`1px solid ${amber}40`,background:`${amber}0d`}}>
                          <div style={{fontSize:12,fontWeight:600,color:amber,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                            <Clock size={13}/> Rateios ainda não recebidos — o total desta rodada ainda vai crescer
                          </div>
                          {g.meta.pendencias.map((p,i) => (
                            <div key={i} style={{fontSize:12,color:T.textMd||T.text,padding:"1px 0"}}>
                              <strong style={{color:ORIGEM_COLOR[p.tipo]||T.text}}>{p.tipo}:</strong> {p.detalhe}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
