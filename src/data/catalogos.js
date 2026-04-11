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
