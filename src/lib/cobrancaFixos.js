// ─── COBRANÇA DE NF DOS FIXOS/MENSAIS ────────────────────────────────────────
// Nasceu em 09/2026: as NFs dos freelas fixos (editores, grafismo, estatísticas,
// credenciamento…) eram esquecidas porque o Hub só conhecia o lado "recebido"
// (notas_mensais). Este módulo modela o lado "ESPERADO" — os contratos fixos —
// e cruza com as NFs recebidas para dizer, por competência, o que está faltando.
//
// Padrão de competência (definido em 03/09/2026): o `mes` da NF é o MÊS
// TRABALHADO, não o da emissão. A NF é pedida no 1º dia útil do próprio mês
// (pedida em 01/09 → competência Setembro). Logo uma competência entra em
// "pendente" a partir do dia 1 do mês e o atraso conta a partir daí.
//
// Módulo PURO (sem React, sem Supabase): é usado pela aba de Cobranças no Hub
// e pelo script de lembrete no Slack (scripts/lembrete_nf_fixos.mjs).
//
// Forma da chave `fixos_contratos` (por campeonato: `paulistao_fixos_contratos`,
// `${campId}_fixos_contratos`):
//   {
//     mesesSemServico: [5],            // meses (0-11) sem prestação — ex.: parada da Copa
//     contratos: [{
//       id, fornecedor,                // apelido canônico da base única
//       apelidos: [],                  // outras grafias aceitas na NF
//       servicoId: 4 | null,           // linha fixa do orçamento (opcional)
//       categoria: "Outro" | null,     // quando não há linha (ex.: credenciamento)
//       valor: 5000 | null,            // esperado por competência; null = variável
//       mesInicio: 1, mesFim: null,    // vigência (0-11); null = até o fim do campeonato
//       ativo: true, obs: "",
//       trabalhaNaParada: false,       // ignora mesesSemServico para este contrato
//       competencias: {                // decisões do operador por mês
//         "7": { cobradaEm: "2026-08-04", dispensada: false, motivo: "" }
//       }
//     }]
//   }

export const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// Cópia local de dedupeNF.normTexto — aquele módulo importa o client do
// Supabase e este precisa rodar em Node puro (script do Slack).
export const normTexto = v => String(v || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export const FIXOS_VAZIO = { mesesSemServico: [], contratos: [] };

export function normalizarFixos(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...FIXOS_VAZIO };
  return {
    mesesSemServico: Array.isArray(raw.mesesSemServico) ? raw.mesesSemServico.map(Number).filter(m => m >= 0 && m <= 11) : [],
    contratos: Array.isArray(raw.contratos) ? raw.contratos : [],
  };
}

// Nomes (normalizados) pelos quais uma NF é atribuída a este contrato.
export function chavesDoContrato(c) {
  return new Set([c.fornecedor, ...(c.apelidos || [])].map(normTexto).filter(Boolean));
}

// Casa cada NF mensal com no máximo UM contrato, pelo nome do fornecedor.
// Serviço não entra no casamento de propósito: a mesma linha fixa (ex.: "Editor
// de Imagens 1") é ocupada por pessoas diferentes ao longo do ano.
export function casarNotasComContratos(contratos, notasMensais) {
  const porContrato = new Map(contratos.map(c => [c.id, []]));
  const chaves = contratos.map(c => ({ id: c.id, chaves: chavesDoContrato(c) }));
  for (const n of notasMensais || []) {
    const nk = normTexto(n.fornecedor);
    if (!nk) continue;
    const alvo = chaves.find(c => c.chaves.has(nk));
    if (alvo) porContrato.get(alvo.id).push(n);
  }
  return porContrato;
}

const diasEntre = (a, b) => Math.floor((b - a) / 86400000);

// Estados possíveis de uma competência (mês) de um contrato:
//   recebida   — há NF mensal do fornecedor com aquele mês
//   pendente   — venceu (mês corrente ou passado) e não há NF
//   cobrada    — pendente, mas o operador já registrou a cobrança
//   dispensada — operador marcou "sem NF neste mês" (com motivo)
//   pausa      — mês em mesesSemServico do campeonato
//   futura     — ainda não chegou o dia 1 do mês
//   fora       — fora da vigência do contrato
export function statusCompetencia({ contrato, mes, notasDoContrato, mesesSemServico, hoje, ano }) {
  const notas = (notasDoContrato || []).filter(n => Number(n.mes) === mes);
  const decisao = (contrato.competencias || {})[String(mes)] || {};
  const ini = contrato.mesInicio ?? 0;
  const fim = contrato.mesFim ?? 11;
  const base = { mes, label: MESES[mes], notas, valorRecebido: notas.reduce((s, n) => s + (Number(n.valor) || 0), 0), decisao };

  if (mes < ini || mes > fim) return { ...base, status: "fora" };
  if (notas.length) return { ...base, status: "recebida" };
  if (!contrato.trabalhaNaParada && (mesesSemServico || []).includes(mes)) return { ...base, status: "pausa" };
  if (decisao.dispensada) return { ...base, status: "dispensada" };

  const venceEm = new Date(ano, mes, 1);
  if (hoje < venceEm) return { ...base, status: "futura" };
  const diasAtraso = diasEntre(venceEm, hoje);
  if (decisao.cobradaEm) return { ...base, status: "cobrada", diasAtraso };
  return { ...base, status: "pendente", diasAtraso };
}

// Resultado completo para a UI e para o Slack.
// `mesInicioCamp`/`mesFimCamp` delimitam as colunas exibidas (0-11).
export function calcularCobrancas({ fixos, notasMensais, hoje = new Date(), mesInicioCamp = 0, mesFimCamp = 11 }) {
  const { contratos, mesesSemServico } = normalizarFixos(fixos);
  const ano = hoje.getFullYear();
  const casadas = casarNotasComContratos(contratos, notasMensais);
  const meses = [];
  for (let m = mesInicioCamp; m <= mesFimCamp; m++) meses.push(m);

  const linhas = contratos.map(c => {
    const notasDoContrato = casadas.get(c.id) || [];
    const comps = meses.map(mes => statusCompetencia({ contrato: c, mes, notasDoContrato, mesesSemServico, hoje, ano }));
    const pendentes = comps.filter(x => x.status === "pendente" || x.status === "cobrada");
    return {
      contrato: c,
      competencias: comps,
      pendentes,
      recebidas: comps.filter(x => x.status === "recebida").length,
      valorPendente: pendentes.length * (Number(c.valor) || 0),
      notasSemVigencia: notasDoContrato.filter(n => Number(n.mes) < (c.mesInicio ?? 0) || Number(n.mes) > (c.mesFim ?? 11)),
    };
  });

  const ativas = linhas.filter(l => l.contrato.ativo !== false);
  const todasPendentes = ativas.flatMap(l => l.pendentes.map(p => ({
    contratoId: l.contrato.id,
    fornecedor: l.contrato.fornecedor,
    servico: l.contrato.categoria || null,
    mes: p.mes, mesLabel: p.label,
    valor: Number(l.contrato.valor) || null,
    status: p.status, diasAtraso: p.diasAtraso, cobradaEm: p.decisao.cobradaEm || null,
  })));

  return {
    meses,
    mesesSemServico,
    linhas,
    resumo: {
      contratosAtivos: ativas.length,
      pendentes: todasPendentes.filter(p => p.status === "pendente").length,
      cobradas: todasPendentes.filter(p => p.status === "cobrada").length,
      valorPendente: todasPendentes.reduce((s, p) => s + (p.valor || 0), 0),
      lista: todasPendentes.sort((a, b) => (b.diasAtraso || 0) - (a.diasAtraso || 0)),
    },
    // NFs mensais que não casaram com contrato nenhum — útil para descobrir
    // freela fixo ainda sem contrato cadastrado.
    naoCasadas: (notasMensais || []).filter(n => {
      const nk = normTexto(n.fornecedor);
      return nk && !contratos.some(c => chavesDoContrato(c).has(nk));
    }),
  };
}

// Texto de cobrança pronto para copiar/colar (WhatsApp/e-mail).
export function mensagemCobranca({ fornecedor, mesLabel, valor, ano, nomeCampeonato, linkFormulario }) {
  const partes = [
    `Olá, ${fornecedor}! Tudo bem?`,
    `Poderia nos enviar a nota fiscal referente a ${mesLabel}/${ano} (${nomeCampeonato})${valor ? `, no valor de ${fmtBRL(valor)}` : ""}?`,
    `Lembrando: a NF é referente ao mês trabalhado (${mesLabel}), e a data de emissão pode ser a de hoje.`,
  ];
  if (linkFormulario) partes.push(`Envio pelo formulário: ${linkFormulario}`);
  partes.push("Obrigado!");
  return partes.join("\n");
}

export const fmtBRL = v => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Feriados nacionais fixos + móveis (Carnaval, Sexta-feira Santa, Corpus Christi)
// para o cálculo de "primeiro dia útil" usado pelo lembrete.
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1, dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes, dia);
}
const somaDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function feriadosNacionais(ano) {
  const p = pascoa(ano);
  const fixos = ["01-01","04-21","05-01","09-07","10-12","11-02","11-15","11-20","12-25"].map(s => `${ano}-${s}`);
  const moveis = [somaDias(p, -48), somaDias(p, -47), somaDias(p, -2), somaDias(p, 60)].map(ymd);
  return new Set([...fixos, ...moveis]);
}

export function ehDiaUtil(d) {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  return !feriadosNacionais(d.getFullYear()).has(ymd(d));
}

export function primeiroDiaUtilDoMes(ano, mes) {
  let d = new Date(ano, mes, 1);
  while (!ehDiaUtil(d)) d = somaDias(d, 1);
  return d;
}

export function ehPrimeiroDiaUtil(hoje = new Date()) {
  const p = primeiroDiaUtilDoMes(hoje.getFullYear(), hoje.getMonth());
  return ymd(p) === ymd(hoje);
}
