import { CATS } from "../constants";

const norm = value => String(value || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const num = value => Number(value) || 0;

// Aliases: subKeys virtuais (usados só na entrada/UI da NF) → subKey financeira real de CATS.
// SNG Host alimenta o bucket "SNG"; SNG Premiere alimenta "SNG Extra".
export const ALIAS_SUBKEY = { sng_host: 'sng', sng_premiere: 'sng_extra' };

// reembolso_log (NF "Reembolso Log. Livemode") NÃO deve contar em nenhum bucket do
// orçamento: o valor lançado nessa NF é o consolidado de custos que já foram lançados
// (e já contam) na aba Logística ao longo do período -- é só o pedido/comprovante
// formal de reembolso, não um custo adicional. Somar contaria o mesmo dinheiro 2x.
export const SUBS_IGNORAR_REALIZADO_NF = new Set(["reembolso_log"]);

// subKeys que NÃO são recalculados a partir das Notas Fiscais aqui -- têm fonte própria:
// transporte/uber/hospedagem (lançamentos da aba Logística), seg_espacial (rateio mensal
// por jogo), infra (sincronização manual de Serviços Livemode), seg_extra (edição manual).
export const SUBS_EXCLUIR_REALIZADO = new Set(["transporte", "uber", "hospedagem", "seg_espacial", "infra", "seg_extra"]);

// Recalcula o realizado de cada jogo a partir das Notas Fiscais -- puro, sem persistir.
// Antes isso só rodava (e só era salvo) quando a aba "Notas Fiscais" estava montada, então
// o dashboard podia ficar com valores desatualizados até alguém abrir aquela aba. Chamando
// isso direto no jogosCalc de cada campeonato, o valor fica sempre em dia, em qualquer aba.
export function buildRealizadoPorJogo(jogos, notas, { dedupeNotasPorNF = false } = {}) {
  const nfScales = getNotaFiscalScales(notas, "valorNF", { dedupe: dedupeNotasPorNF });
  const map = {};
  jogos.forEach(j => {
    const realizado = { ...(j.realizado || {}) };
    CATS.forEach(cat => cat.subs.forEach(sub => {
      if (!SUBS_EXCLUIR_REALIZADO.has(sub.key)) realizado[sub.key] = 0;
    }));
    // Remove subKeys virtuais que não fazem parte do CATS (vinham de runs antigos
    // antes do alias sng_host->sng / sng_premiere->sng_extra, ou de quando reembolso_log
    // ainda era gravado direto, antes de virar um subKey ignorado)
    delete realizado.sng_host;
    delete realizado.sng_premiere;
    delete realizado.reembolso_log;
    map[j.id] = realizado;
  });
  notas.forEach(n => {
    const scale = nfScales[n.id] ?? 1;
    if (n.servicosDetalhe) {
      Object.entries(n.servicosDetalhe).forEach(([k, valor]) => {
        const [jId, ...rest] = k.split("_");
        const realizado = map[parseInt(jId)];
        if (realizado) {
          const subKey = rest.join("_");
          if (SUBS_IGNORAR_REALIZADO_NF.has(subKey)) return;
          const finalKey = ALIAS_SUBKEY[subKey] || subKey;
          realizado[finalKey] = (realizado[finalKey] || 0) + (valor * scale);
        }
      });
    } else if (n.servicosValores) {
      const realizado = map[n.jogoId];
      if (realizado) {
        Object.entries(n.servicosValores).forEach(([subKey, valor]) => {
          if (SUBS_IGNORAR_REALIZADO_NF.has(subKey)) return;
          const finalKey = ALIAS_SUBKEY[subKey] || subKey;
          realizado[finalKey] = (realizado[finalKey] || 0) + (valor * scale);
        });
      }
    }
  });
  return map;
}

// Realizado de "Infra + Distr." por jogo, calculado ao vivo a partir das NFs
// Livemode/liveU -- antes só era gravado em jogo.realizado.infra quando alguém
// clicava em "Sincronizar Jogos" na aba Serviços Livemode, então o dashboard
// ficava desatualizado sempre que uma NF Livemode/liveU era criada, editada ou
// apagada sem re-sincronizar manualmente.
export function buildInfraRealizadoPorJogo(notasLivemode = [], notasLiveU = []) {
  const map = {};
  const add = n => {
    const ids = n.jogosIds || [];
    if (ids.length === 0) return;
    const valorPorJ = n.valorPorJogo || (n.valor / ids.length);
    ids.forEach(id => { map[id] = (map[id] || 0) + valorPorJ; });
  };
  (notasLivemode || []).forEach(add);
  (notasLiveU || []).forEach(add);
  return map;
}

export function notaFiscalKey(nota) {
  const numero = norm(nota?.numeroNF);
  if (numero) {
    return [norm(nota?.fornecedor), numero, norm(nota?.dataEmissao)].join("|");
  }
  // Sem número de NF: agrupa por fornecedor+rodada+jogo para detectar duplicatas reais
  const rodada = String(nota?.rodada || "");
  const jogoId = String(nota?.jogoId || "");
  if (rodada && jogoId) {
    return `${norm(nota?.fornecedor)}|rd:${rodada}|jogo:${jogoId}`;
  }
  return `id:${nota?.id ?? Math.random()}`;
}

export function groupNotasFiscais(notas = [], { dedupe = false } = {}) {
  if (!dedupe) return notas.map(nota => [notaFiscalKey({ id: nota?.id }), [nota]]);
  const groups = new Map();
  notas.forEach(nota => {
    const key = notaFiscalKey(nota);
    const safeKey = key.startsWith("|") || key.includes("||") ? `id:${nota?.id}` : key;
    if (!groups.has(safeKey)) groups.set(safeKey, []);
    groups.get(safeKey).push(nota);
  });
  return [...groups.entries()];
}

export function countNotasFiscais(notas = [], { dedupe = false } = {}) {
  return groupNotasFiscais(notas, { dedupe }).length;
}

export function sumNotasFiscais(notas = [], field = "valorNF", { dedupe = false } = {}) {
  if (!dedupe) return notas.reduce((sum, nota) => sum + num(nota?.[field]), 0);

  return groupNotasFiscais(notas, { dedupe }).reduce((sum, [, group]) => {
    const values = group.map(nota => num(nota?.valorFiscalTotal ?? nota?.[field]));
    if (values.length <= 1) return sum + (values[0] || 0);

    const first = values[0] || 0;
    const sameValue = values.every(value => Math.abs(value - first) < 0.01);
    return sum + (sameValue ? first : values.reduce((s, value) => s + value, 0));
  }, 0);
}

export function getNotaFiscalScales(notas = [], field = "valorNF", { dedupe = false } = {}) {
  const scales = {};
  groupNotasFiscais(notas, { dedupe }).forEach(([, group]) => {
    const values = group.map(nota => num(nota?.valorFiscalTotal ?? nota?.[field]));
    const first = values[0] || 0;
    const sameValue = group.length > 1 && values.every(value => Math.abs(value - first) < 0.01);
    const scale = sameValue ? 1 / group.length : 1;
    group.forEach(nota => { scales[nota.id] = scale; });
  });
  return scales;
}

export function getEnvioMetricas(envio, { dedupeNotasPorNF = false } = {}) {
  const notasResumo = envio?.notasResumo || [];
  const mensaisResumo = envio?.mensaisResumo || [];
  const livemodeResumo = envio?.livemodeResumo || [];

  const totalJogos = sumNotasFiscais(notasResumo, "valorNF", { dedupe: dedupeNotasPorNF });
  const totalMensais = mensaisResumo.reduce((sum, nota) => sum + num(nota?.valor), 0);
  const totalLivemode = livemodeResumo.reduce((sum, nota) => sum + num(nota?.valor), 0);
  const qtdNotas = countNotasFiscais(notasResumo, { dedupe: dedupeNotasPorNF }) + mensaisResumo.length + livemodeResumo.length;

  return {
    totalJogos,
    totalMensais,
    totalLivemode,
    totalGeral: totalJogos + totalMensais + totalLivemode,
    qtdNotas,
  };
}

export function normalizeEnvioMetricas(envio, options) {
  return { ...envio, ...getEnvioMetricas(envio, options) };
}
