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

// Decompõe o realizado de cada rodada em: NFs diretas (etiquetadas nos jogos da
// rodada), fatias de rateio (Seg. Espacial mensal, Infra Livemode, liveU) e
// resíduo manual (valores armazenados no jogo sem NF, ex: seg_extra). A soma das
// três partes é, por construção, igual ao realizado que o dashboard exibe — as
// fatias vêm do mesmo motor (buildRealizadoPorJogo / buildInfraRealizadoPorJogo
// / rateio mensal), só que rastreadas NF a NF em vez de fundidas no total.
export function buildFechamentoPorRodada({ jogos = [], notas = [], notasMensais = [], notasLivemode = [], notasLiveU = [], dedupeNotasPorNF = true } = {}) {
  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const rodadas = [...new Set(divulgados.map(j => j.rodada))].filter(r => r != null).sort((a, b) => a - b);
  const jogoRodada = {};
  divulgados.forEach(j => { jogoRodada[j.id] = j.rodada; });

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
  const diretasPorRodada = {}; // rodada -> Map(notaId -> linha)
  const addDireta = (rodada, nota, jogoId, subKey, valor) => {
    const porRodada = (diretasPorRodada[rodada] = diretasPorRodada[rodada] || new Map());
    if (!porRodada.has(nota.id)) {
      porRodada.set(nota.id, {
        id: nota.id, fornecedor: nota.fornecedor || "—",
        numeroNF: nota.numeroNF || "", codigo: nota.codigo || "",
        valorNF: nota.valorNF || 0, scale: nfScales[nota.id] ?? 1,
        hasFile: !!nota.hasFile, tipo: nota.tipo || "prevista",
        subs: new Set(), valor: 0, porJogo: {},
      });
    }
    const l = porRodada.get(nota.id);
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
      const rodada = jogoRodada[jogoId];
      if (rodada == null) return;
      addDireta(rodada, n, jogoId, finalKey, (valor || 0) * scale);
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
  const rateiosPorRodada = {}; // rodada -> [linha]
  const addRateio = (rodada, linha) => (rateiosPorRodada[rodada] = rateiosPorRodada[rodada] || []).push(linha);
  seNotas.forEach(n => {
    const ids = jogosPorMes[n.mes] || [];
    if (ids.length === 0) return;
    const share = (n.valor || 0) / ids.length;
    const porRodadaIds = {};
    ids.forEach(id => {
      const r = jogoRodada[id];
      if (r == null) return;
      (porRodadaIds[r] = porRodadaIds[r] || []).push(id);
    });
    Object.entries(porRodadaIds).forEach(([rodada, jogosIds]) => {
      addRateio(parseInt(rodada), {
        origem: "Seg. Espacial", id: `se_${n.id}`, notaId: n.id,
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
    const porRodadaIds = {};
    ids.forEach(id => {
      const r = jogoRodada[id];
      if (r == null) return;
      (porRodadaIds[r] = porRodadaIds[r] || []).push(id);
    });
    Object.entries(porRodadaIds).forEach(([rodada, jogosIds]) => {
      addRateio(parseInt(rodada), {
        origem, id: `${origem === "liveU" ? "lu" : "lm"}_${n.id}`, notaId: n.id,
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

  // ── montagem por rodada, fechando contra o realizado final do dashboard ────
  const resultado = rodadas.map(rodada => {
    const jogosR = divulgados.filter(j => j.rodada === rodada).sort((a, b) => a.id - b.id);
    const diretas = [...(diretasPorRodada[rodada]?.values() || [])]
      .map(l => ({ ...l, subs: [...l.subs] }))
      .sort((a, b) => b.valor - a.valor);
    const rateios = (rateiosPorRodada[rodada] || []).sort((a, b) => b.valor - a.valor);

    const linhasJogos = jogosR.map(j => {
      const base = realizadoBase[j.id] || {};
      const se = seMap[j.id];
      const final = { ...base, ...(se ? { seg_espacial: se } : {}), infra: infraMap[j.id] || 0 };
      const total = Object.values(final).reduce((s, v) => s + (v || 0), 0);
      // direto = o que as NFs etiquetadas nos jogos desta rodada contribuíram —
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

    // pendências: rateios que a rodada ainda não recebeu
    const pendencias = [];
    const mesesRodada = [...new Set(jogosR.map(j => parseMes(j.data)).filter(m => m != null))];
    mesesRodada.forEach(mes => {
      if (!seNotas.some(n => n.mes === mes)) pendencias.push({ tipo: "Seg. Espacial", detalhe: `NF mensal de ${MESES[mes]} ainda não recebida` });
    });
    const semInfra = jogosR.filter(j => !(notasLivemode || []).some(n => (n.jogosIds || []).includes(j.id)));
    if (semInfra.length) pendencias.push({ tipo: "Infra Livemode", detalhe: `${semInfra.length} jogo(s) sem NF de infra: ${semInfra.map(j => j.label || `${j.mandante} x ${j.visitante}`).join(", ")}` });
    const semLiveU = jogosR.filter(j => !(notasLiveU || []).some(n => (n.jogosIds || []).includes(j.id)));
    if (semLiveU.length) pendencias.push({ tipo: "liveU", detalhe: `${semLiveU.length} jogo(s) sem fatia liveU: ${semLiveU.map(j => `${j.mandante} x ${j.visitante}`).join(", ")}` });

    return { rodada, jogos: linhasJogos, diretas, rateios, direto, rateado, manual, total, pendencias, fechada: pendencias.length === 0 };
  });

  const totais = resultado.reduce((acc, r) => ({
    direto: acc.direto + r.direto,
    rateado: acc.rateado + r.rateado,
    manual: acc.manual + r.manual,
    total: acc.total + r.total,
  }), { direto: 0, rateado: 0, manual: 0, total: 0 });

  return { rodadas: resultado, totais, naoAlocado };
}
