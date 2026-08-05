// ─── CATÁLOGOS DO HUB DE FORNECEDORES ────────────────────────────────────────
// Entidades de fundação do novo modelo de negociação:
//   • cidades (id, nome, uf)
//   • campeonatos do hub (id, nome, ano, ativo, cidadeIds[], categorias[])
//   • catálogo de itens por fornecedor (vive em fornecedor.catalogo)
//
// Persistidos via Supabase em app_state nas keys:
//   forn_cidades · forn_campeonatos
// O catálogo de itens vive aninhado dentro de cada fornecedor (key fornecedores).

// ── Cidades ────────────────────────────────────────────────────────────────
// Lista inicial com as praças mais comuns. Pode ser editada na sub-aba
// Catálogos. O ID é estável (slug) pra não quebrar referências históricas.
export const CIDADES_INIT = [
  { id:"rj-rj",  nome:"Rio de Janeiro", uf:"RJ" },
  { id:"sp-sp",  nome:"São Paulo",      uf:"SP" },
  { id:"bh-mg",  nome:"Belo Horizonte", uf:"MG" },
  { id:"poa-rs", nome:"Porto Alegre",   uf:"RS" },
  { id:"cwb-pr", nome:"Curitiba",       uf:"PR" },
  { id:"rec-pe", nome:"Recife",         uf:"PE" },
  { id:"ssa-ba", nome:"Salvador",       uf:"BA" },
  { id:"for-ce", nome:"Fortaleza",      uf:"CE" },
  { id:"goi-go", nome:"Goiânia",        uf:"GO" },
  { id:"chp-sc", nome:"Chapecó",        uf:"SC" },
  { id:"mir-sp", nome:"Mirassol",       uf:"SP" },
];

// ── Categorias de jogo ─────────────────────────────────────────────────────
// Por enquanto o Brasileirão usa B1 e B2. As categorias são configuráveis
// por campeonato pra acomodar futuras competições com classificação distinta.
export const CATEGORIAS_DEFAULT = [
  { codigo:"B1", nome:"B1" },
  { codigo:"B2", nome:"B2" },
];

// ── Campeonatos do hub ─────────────────────────────────────────────────────
// Diferente de constants.CAMPEONATOS (usado pra navegação no portal),
// aqui guardamos os dados operacionais usados pelo módulo de negociação:
// cidades-sede e categorias ativas. Apenas campeonatos `ativo:true` aparecem
// nos seletores de cotação e tabela de preços.
export const CAMPEONATOS_FORN_INIT = [
  {
    id:"brasileirao-2026",
    nome:"Brasileirão Série A 2026",
    ano:2026,
    ativo:true,
    cidadeIds:["rj-rj","sp-sp","bh-mg","poa-rs","cwb-pr","rec-pe","ssa-ba","for-ce","chp-sc","mir-sp"],
    categorias:[
      { codigo:"B1", nome:"B1" },
      { codigo:"B2", nome:"B2" },
    ],
  },
];

// ── Unidades de medida do catálogo de itens ────────────────────────────────
// Equipamentos/periféricos/UM são contratados por jogo. Prestadores
// (coordenadores, operadores) são contratados por diária ou por diária +
// alimentação. Hora e unidade existem como escape pra casos pontuais.
export const UNIDADES_MEDIDA = [
  { key:"jogo",               label:"Por jogo" },
  { key:"diaria",             label:"Diária" },
  { key:"diaria_alimentacao", label:"Diária + Alimentação" },
  { key:"hora",               label:"Hora" },
  { key:"unidade",            label:"Unidade" },
];

export const unidadeLabel = key =>
  UNIDADES_MEDIDA.find(u => u.key === key)?.label || key || "—";

// ── Tabelas de preço por fornecedor × campeonato ───────────────────────────
// Cada tabela = os valores negociados de UM fornecedor para o catálogo de UM
// campeonato. Preenchimento direto pela equipe (a negociação acontece uma vez
// ao ano; os preços ficam travados pela vigência, ex.: "2026–2027").
// Persistida em app_state.forn_tabelas_preco como array.
//
//   itemIds:  quais itens do catálogo do campeonato o fornecedor faz
//   cidadeIds: cidades onde o fornecedor atende (null = todas as do campeonato)
//   valores[itemId][cidadeId] = number  (o padrão B1/B2 já vem no nome do item)
export function criarTabelaFornecedor({ fornecedorId, campeonatoId }) {
  const now = new Date().toISOString();
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    fornecedorId,
    campeonatoId,
    itemIds: [],
    cidadeIds: null,
    valores: {},
    vigencia: "",
    observacoes: "",
    criadoEm: now,
    atualizadoEm: now,
  };
}

// Tabela de um par (fornecedor, campeonato) — no máximo uma por par
export function getTabelaFornecedor(tabelas, fornecedorId, campeonatoId) {
  return (tabelas || []).find(t =>
    String(t.fornecedorId) === String(fornecedorId) &&
    t.campeonatoId === campeonatoId
  ) || null;
}

// Lê um valor de célula com segurança
export const getValorTabela = (tabela, itemId, cidadeId) =>
  tabela?.valores?.[itemId]?.[cidadeId] ?? null;

// Atualiza imutavelmente um valor de célula e devolve nova tabela
export function setValorTabela(tabela, itemId, cidadeId, valor) {
  const valores = { ...(tabela.valores || {}) };
  const porItem = { ...(valores[itemId] || {}) };
  if (valor === null || valor === "" || Number.isNaN(valor)) {
    delete porItem[cidadeId];
  } else {
    porItem[cidadeId] = Number(valor);
  }
  // Limpeza ascendente: se o item ficou sem cidades, remove do objeto
  if (Object.keys(porItem).length === 0) delete valores[itemId];
  else valores[itemId] = porItem;
  return { ...tabela, valores, atualizadoEm: new Date().toISOString() };
}

export function contarCelulasPreenchidas(tabela) {
  let n = 0;
  Object.values(tabela?.valores || {}).forEach(porItem => {
    Object.values(porItem).forEach(v => { if (v != null && v !== "") n++; });
  });
  return n;
}

// ── Cotações ──────────────────────────────────────────────────────────────
// O ciclo simplificado: rascunho (provisionado) -> aprovada (confirmado pra
// realizar) -> cancelada (descartado). A "negociação" em si é a tabela de
// preços; aqui só aplicamos o valor-base ao jogo + ajustes pré-jogo.
export const STATUS_COTACAO_NOVO = [
  { key:"rascunho",  label:"Rascunho",  color:"#64748b" },
  { key:"aprovada",  label:"Aprovada",  color:"#10b981" },
  { key:"cancelada", label:"Cancelada", color:"#94a3b8" },
];

export const statusCotacaoInfo = key =>
  STATUS_COTACAO_NOVO.find(s => s.key === key) || STATUS_COTACAO_NOVO[0];

export function calcularItensBase({ tabela, jogo, campeonato }) {
  if (!tabela || !jogo) return [];
  // Só os itens do catálogo do campeonato que o fornecedor faz (itemIds)
  const feitos = new Set(tabela.itemIds || []);
  const itens = (campeonato?.itens || []).filter(i => i.ativo !== false && feitos.has(i.id));
  return itens.map(it => {
    const valor = getValorTabela(tabela, it.id, jogo.cidadeId);
    return {
      itemId:    it.id,
      nome:      it.nome,
      unidade:   it.unidade,
      valorBase: valor != null ? Number(valor) : null,
      incluso:   valor != null && valor > 0,
    };
  });
}

// Recalcula totais de uma cotação (chamar sempre que itens/adicionais mudarem)
export function recalcularCotacao(cotacao) {
  const valorBase = (cotacao.itensBase || [])
    .filter(i => i.incluso && i.valorBase != null)
    .reduce((s, i) => s + Number(i.valorBase || 0), 0);
  const valorAdicionais = (cotacao.adicionais || [])
    .reduce((s, a) => s + Number(a.valorTotal || 0), 0);
  return {
    ...cotacao,
    valorBase,
    valorAdicionais,
    valorTotal: valorBase + valorAdicionais,
    atualizadoEm: new Date().toISOString(),
  };
}

// Cria uma cotação nova já com valor-base calculado
export function criarCotacao({ jogo, fornecedor, tabela, campeonato }) {
  const now = new Date().toISOString();
  const itensBase = calcularItensBase({ tabela, jogo, campeonato });
  const cot = {
    id: `cot-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    jogoId:           jogo.id,
    fornecedorId:     fornecedor.id,
    campeonatoId:     jogo.campeonatoId,
    cidadeId:         jogo.cidadeId,
    categoria:        jogo.categoria,
    tabelaIdSnapshot: tabela?.id || null,
    itensBase,
    adicionais:       [],
    valorBase:        0,
    valorAdicionais:  0,
    valorTotal:       0,
    status:           "rascunho",
    observacoes:      "",
    criadoEm:         now,
    atualizadoEm:     now,
  };
  return recalcularCotacao(cot);
}

export const novoAdicional = () => ({
  id: `add-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
  nome: "",
  quantidade: 1,
  valorUnitario: 0,
  valorTotal: 0,
  justificativa: "",
});

// ── Catálogo master de itens de serviço ───────────────────────────────────
// Lista global de serviços que podem ser precificados nas negociações.
// Gerenciada em Catálogos e persistida em app_state['forn_itens_master'].
// Campeonatos selecionam um subconjunto dessa lista.
export const CATEGORIAS_ITEM = [
  { key:"periferico", label:"Periférico",          color:"#3b82f6" },
  { key:"equipe",     label:"Equipe Operacional",  color:"#f59e0b" },
];

export const categoriaItemLabel = key =>
  CATEGORIAS_ITEM.find(c=>c.key===key)?.label ?? key;

export const ITENS_MASTER_INIT = [
  // Periféricos — equipamentos contratados por jogo
  { id:"um-b1",      nome:"UM B1",                  unidade:"jogo",   categoria:"periferico" },
  { id:"um-b2",      nome:"UM B2",                  unidade:"jogo",   categoria:"periferico" },
  { id:"um-b3",      nome:"UM B3",                  unidade:"jogo",   categoria:"periferico" },
  { id:"drone",      nome:"Drone",                  unidade:"jogo",   categoria:"periferico" },
  { id:"minidrone",  nome:"Minidrone",              unidade:"jogo",   categoria:"periferico" },
  { id:"grua",       nome:"Grua",                   unidade:"jogo",   categoria:"periferico" },
  { id:"goalcam",    nome:"Goal Cam",               unidade:"jogo",   categoria:"periferico" },
  { id:"carrinho",   nome:"Carrinho",               unidade:"jogo",   categoria:"periferico" },
  // Equipe Operacional — profissionais do pessoal dos jogos
  { id:"coord-um",   nome:"Coordenador de UM",      unidade:"diaria", categoria:"equipe" },
  { id:"prod-um",    nome:"Produtor de UM",         unidade:"diaria", categoria:"equipe" },
  { id:"prod-campo", nome:"Produtor de Campo",      unidade:"diaria", categoria:"equipe" },
  { id:"supervisor",  nome:"Supervisor de Operações",  unidade:"diaria", categoria:"equipe" },
  { id:"supervisor2", nome:"Supervisor de Operações 2",unidade:"diaria", categoria:"equipe" },
  { id:"dtv",        nome:"DTV",                    unidade:"diaria", categoria:"equipe" },
  { id:"vmix",       nome:"Operador de Vmix",       unidade:"diaria", categoria:"equipe" },
];

export const novoItemMaster = (nome = "", unidade = "jogo", categoria = "periferico") => ({
  id: `it-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
  nome: nome.trim(),
  unidade,
  categoria,
});

// Kept for backward compat
export const novoItemCampeonato = novoItemMaster;
