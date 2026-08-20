import {
  ALIAS_SUBKEY,
  SUBS_IGNORAR_REALIZADO_NF,
  buildRealizadoPorJogo,
  buildInfraRealizadoPorJogo,
  getNotaFiscalScales,
} from "./notasFiscais";

// Mesma regra do rateio inline de App.jsx (rateioSegEspacialPorJogo): NF mensal
// "Seg. Espacial" dividida igualmente entre os jogos divulgados do mês da NF.
// Mantida idêntica para que o fechamento bata com o dashboard por construção.
const parseMes = dataStr => {
  if (!dataStr || /^[aà] definir$/i.test(dataStr.trim())) return null;
  let m = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return parseInt(m[2]) - 1;
  m = dataStr.match(/^(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/);
  if (m) return parseInt(m[2]) - 1;
  return null;
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// Agrupador padrão: uma "rodada" por número (Brasileirão, pontos corridos).
// Campeonatos com fases (Paulistão, customs mata-mata) passam um grupoDoJogo
// próprio — senão "Rodada 1" da fase de grupos colide com "Rodada 1" da semi.
const grupoPorRodada = j => (j.rodada != null
  ? { key: `r${j.rodada}`, label: `Rodada ${j.rodada}`, ordem: j.rodada }
  : null);
const GRUPO_SEM_RODADA = { key: "__sem__", label: "Sem rodada definida", ordem: Number.MAX_SAFE_INTEGER };

// Decompõe o realizado de cada rodada (ou fase+rodada) em: NFs diretas
// (etiquetadas nos jogos do grupo), fatias de rateio (Seg. Espacial mensal,
// Infra Livemode, liveU) e resíduo manual (valores armazenados no jogo sem NF,
// ex: seg_extra). A soma das três partes é, por construção, igual ao realizado
// que o dashboard exibe — as fatias vêm do mesmo motor (buildRealizadoPorJogo /
// buildInfraRealizadoPorJogo / rateio mensal), só que rastreadas NF a NF.
// Pendências só são cobradas para tipos de rateio que o campeonato usa
// (inferido pela existência de ao menos uma NF do tipo; sobreponível via opts).
export function buildFechamentoPorRodada({
  jogos = [], notas = [], notasMensais = [], notasLivemode = [], notasLiveU = [],
  dedupeNotasPorNF = true, grupoDoJogo = null,
  esperaSegEspacial = null, esperaInfra = null, esperaLiveU = null,
} = {}) {
  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const gFn = grupoDoJogo || grupoPorRodada;
  const grupoInfo = new Map(); // key -> {key,label,ordem}
  const jogoGrupo = {};        // jogoId -> key
  divulgados.forEach(j => {
    const g = gFn(j) || GRUPO_SEM_RODADA;
    if (!grupoInfo.has(g.key)) grupoInfo.set(g.key, g);
    jogoGrupo[j.id] = g.key;
  });
  const gruposOrdenados = [...grupoInfo.values()].sort((a, b) => a.ordem - b.ordem || String(a.key).localeCompare(String(b.key)));

  // ── motor idêntico ao do dashboard ──────────────────────────────────────────
  const realizadoBase = buildRealizadoPorJogo(divulgados, notas, { dedupeNotasPorNF });
  const infraMap = buildInfraRealizadoPorJogo(notasLivemode, notasLiveU);
  const nfScales = getNotaFiscalScales(notas, "valorNF", { dedupe: dedupeNotasPorNF });

  const jogosPorMes = {};
  divulgados.forEach(j => {
    const mes = parseMes(j.data);
    if (mes == null) return;
    (jogosPorMes[mes] = jogosPorMes[mes] || []).push(j.id);
  });
  const seMap = {};
  const naoAlocado = []; // valores de NFs rateáveis que não chegaram a nenhum jogo/rodada
  const seNotas = (notasMensais || []).filter(n => n.categoria === "Seg. Espacial");
  seNotas.forEach(n => {
    const ids = jogosPorMes[n.mes] || [];
    if (ids.length === 0) {
      naoAlocado.push({
        origem: "Seg. Espacial", id: `se_orfa_${n.id}`, notaId: n.id,
        fornecedor: n.fornecedor || "—", numeroNF: n.numeroNF || "", hasFile: !!n.hasFile,
        valor: n.valor || 0, motivo: `${n.mesLabel || MESES[n.mes] || "mês"} sem jogos — órfã, somada direto em Operações`,
      });
      return;
    }
    const share = (n.valor || 0) / ids.length;
    ids.forEach(id => { seMap[id] = (seMap[id] || 0) + share; });
  });

  // ── contribuições diretas NF a NF (só subKeys que sobrevivem ao override de
  //    jogosCalc: seg_espacial e infra são substituídos pelo rateio/bloco) ─────
  const diretasPorGrupo = {}; // grupoKey -> Map(notaId -> linha)
  const addDireta = (grupoKey, nota, jogoId, subKey, valor) => {
    const porGrupo = (diretasPorGrupo[grupoKey] = diretasPorGrupo[grupoKey] || new Map());
    if (!porGrupo.has(nota.id)) {
      porGrupo.set(nota.id, {
        id: nota.id, fornecedor: nota.fornecedor || "—",
        numeroNF: nota.numeroNF || "", codigo: nota.codigo || "",
        valorNF: nota.valorNF || 0, scale: nfScales[nota.id] ?? 1,
        hasFile: !!nota.hasFile, tipo: nota.tipo || "prevista",
        subs: new Set(), valor: 0, porJogo: {},
      });
    }
    const l = porGrupo.get(nota.id);
    l.valor += valor;
    l.subs.add(subKey);
    l.porJogo[jogoId] = (l.porJogo[jogoId] || 0) + valor;
  };
  notas.forEach(n => {
    const scale = nfScales[n.id] ?? 1;
    const registrar = (jogoId, subKey, valor) => {
      if (SUBS_IGNORAR_REALIZADO_NF.has(subKey)) return;
      const finalKey = ALIAS_SUBKEY[subKey] || subKey;
      if (finalKey === "infra" || finalKey === "seg_espacial") return; // sobrescritos pelo motor
      const grupoKey = jogoGrupo[jogoId];
      if (grupoKey == null) return;
      addDireta(grupoKey, n, jogoId, finalKey, (valor || 0) * scale);
    };
    if (n.servicosDetalhe) {
      Object.entries(n.servicosDetalhe).forEach(([k, valor]) => {
        const [jId, ...rest] = k.split("_");
        registrar(parseInt(jId), rest.join("_"), valor);
      });
    } else if (n.servicosValores) {
      Object.entries(n.servicosValores).forEach(([subKey, valor]) => registrar(n.jogoId, subKey, valor));
    }
  });

  // ── fatias de rateio NF a NF ────────────────────────────────────────────────
  const rateiosPorGrupo = {}; // grupoKey -> [linha]
  const addRateio = (grupoKey, linha) => (rateiosPorGrupo[grupoKey] = rateiosPorGrupo[grupoKey] || []).push(linha);
  const distribuiPorGrupo = ids => {
    const porGrupo = {};
    ids.forEach(id => {
      const g = jogoGrupo[id];
      if (g == null) return;
      (porGrupo[g] = porGrupo[g] || []).push(id);
    });
    return porGrupo;
  };
  seNotas.forEach(n => {
    const ids = jogosPorMes[n.mes] || [];
    if (ids.length === 0) return;
    const share = (n.valor || 0) / ids.length;
    Object.entries(distribuiPorGrupo(ids)).forEach(([grupoKey, jogosIds]) => {
      addRateio(grupoKey, {
        origem: "Seg. Espacial", id: `se_${n.id}_${grupoKey}`, notaId: n.id,
        fornecedor: n.fornecedor || "—", numeroNF: n.numeroNF || "",
        referencia: n.mesLabel || MESES[n.mes] || "", hasFile: !!n.hasFile,
        valorNF: n.valor || 0, cobre: ids.length, cobreLabel: `${ids.length} jogo(s) do mês`,
        fatiaPorJogo: share, jogosIds, valor: share * jogosIds.length,
      });
    });
  });
  const addBloco = (n, origem) => {
    const ids = n.jogosIds || [];
    if (ids.length === 0) {
      naoAlocado.push({
        origem, id: `${origem === "liveU" ? "lu" : "lm"}_na_${n.id}`, notaId: n.id,
        fornecedor: n.fornecedor || (origem === "liveU" ? "liveU" : "Livemode"),
        numeroNF: n.numeroNF || "", hasFile: !!n.hasFile,
        valor: n.valor || 0, motivo: "NF sem jogos vinculados — não entra em nenhuma rodada",
      });
      return;
    }
    const vpj = n.valorPorJogo || ((n.valor || 0) / ids.length);
    const resto = (n.valor || 0) - vpj * ids.length;
    if (Math.abs(resto) > 0.005) {
      naoAlocado.push({
        origem, id: `${origem === "liveU" ? "lu" : "lm"}_resto_${n.id}`, notaId: n.id,
        fornecedor: n.fornecedor || (origem === "liveU" ? "liveU" : "Livemode"),
        numeroNF: n.numeroNF || "", hasFile: !!n.hasFile,
        valor: resto, motivo: `diferença entre o valor da NF e ${ids.length} × valor/jogo — não alocada a rodadas`,
      });
    }
    Object.entries(distribuiPorGrupo(ids)).forEach(([grupoKey, jogosIds]) => {
      addRateio(grupoKey, {
        origem, id: `${origem === "liveU" ? "lu" : "lm"}_${n.id}_${grupoKey}`, notaId: n.id,
        fornecedor: n.fornecedor || (origem === "liveU" ? "liveU" : "Livemode"),
        numeroNF: n.numeroNF || "", referencia: n.rodadasLabel || n.jogosResumoLabel || "",
        hasFile: !!n.hasFile,
        valorNF: n.valor || 0, cobre: ids.length, cobreLabel: `${ids.length} jogo(s) cobertos`,
        fatiaPorJogo: vpj, jogosIds, valor: vpj * jogosIds.length,
      });
    });
  };
  (notasLivemode || []).forEach(n => addBloco(n, "Infra Livemode"));
  (notasLiveU || []).forEach(n => addBloco(n, "liveU"));

  // pendências só para tipos de rateio que o campeonato usa
  const espera = {
    segEspacial: esperaSegEspacial ?? seNotas.length > 0,
    infra: esperaInfra ?? (notasLivemode || []).length > 0,
    liveU: esperaLiveU ?? (notasLiveU || []).length > 0,
  };

  // ── montagem por grupo, fechando contra o realizado final do dashboard ─────
  const resultado = gruposOrdenados.map(g => {
    const jogosR = divulgados.filter(j => jogoGrupo[j.id] === g.key).sort((a, b) => a.id - b.id);
    const diretas = [...(diretasPorGrupo[g.key]?.values() || [])]
      .map(l => ({ ...l, subs: [...l.subs] }))
      .sort((a, b) => b.valor - a.valor);
    const rateios = (rateiosPorGrupo[g.key] || []).sort((a, b) => b.valor - a.valor);

    const linhasJogos = jogosR.map(j => {
      const base = realizadoBase[j.id] || {};
      const se = seMap[j.id];
      const final = { ...base, ...(se ? { seg_espacial: se } : {}), infra: infraMap[j.id] || 0 };
      const total = Object.values(final).reduce((s, v) => s + (v || 0), 0);
      // direto = o que as NFs etiquetadas nos jogos deste grupo contribuíram —
      // assim a coluna "direto" concilia 1:1 com a tabela de NFs diretas abaixo
      const direto = diretas.reduce((s, l) => s + (l.porJogo[j.id] || 0), 0);
      const segEspacial = final.seg_espacial || 0;
      const infra = final.infra || 0;
      // resíduo sem NF: seg_extra manual + qualquer chave legada armazenada no jogo
      const manual = total - direto - segEspacial - infra;
      return {
        id: j.id, label: `${j.mandante} x ${j.visitante}`, data: j.data || "",
        categoria: j.categoria || "", direto, rateado: segEspacial + infra,
        manual: Math.abs(manual) < 0.005 ? 0 : manual, total,
        segExtra: final.seg_extra || 0,
      };
    });

    const direto = linhasJogos.reduce((s, j) => s + j.direto, 0);
    const rateado = linhasJogos.reduce((s, j) => s + j.rateado, 0);
    const manual = linhasJogos.reduce((s, j) => s + j.manual, 0);
    const total = linhasJogos.reduce((s, j) => s + j.total, 0);

    // pendências: rateios que este grupo ainda não recebeu
    const pendencias = [];
    if (espera.segEspacial) {
      const mesesGrupo = [...new Set(jogosR.map(j => parseMes(j.data)).filter(m => m != null))];
      mesesGrupo.forEach(mes => {
        if (!seNotas.some(n => n.mes === mes)) pendencias.push({ tipo: "Seg. Espacial", detalhe: `NF mensal de ${MESES[mes]} ainda não recebida` });
      });
    }
    if (espera.infra) {
      const semInfra = jogosR.filter(j => !(notasLivemode || []).some(n => (n.jogosIds || []).includes(j.id)));
      if (semInfra.length) pendencias.push({ tipo: "Infra Livemode", detalhe: `${semInfra.length} jogo(s) sem NF de infra: ${semInfra.map(j => `${j.mandante} x ${j.visitante}`).join(", ")}` });
    }
    if (espera.liveU) {
      const semLiveU = jogosR.filter(j => !(notasLiveU || []).some(n => (n.jogosIds || []).includes(j.id)));
      if (semLiveU.length) pendencias.push({ tipo: "liveU", detalhe: `${semLiveU.length} jogo(s) sem fatia liveU: ${semLiveU.map(j => `${j.mandante} x ${j.visitante}`).join(", ")}` });
    }

    return { key: g.key, label: g.label, jogos: linhasJogos, diretas, rateios, direto, rateado, manual, total, pendencias, fechada: pendencias.length === 0 };
  });

  const totais = resultado.reduce((acc, r) => ({
    direto: acc.direto + r.direto,
    rateado: acc.rateado + r.rateado,
    manual: acc.manual + r.manual,
    total: acc.total + r.total,
  }), { direto: 0, rateado: 0, manual: 0, total: 0 });

  return { rodadas: resultado, totais, naoAlocado };
}
