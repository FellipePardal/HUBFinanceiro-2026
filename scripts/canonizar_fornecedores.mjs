// Padroniza a grafia do campo `fornecedor` em todas as listas do Hub.
// Sequela do incidente da NF 16 (08/2026): o mesmo fornecedor aparecia com
// grafias diferentes ("João Marcos" × "joão marcos"), quebrando qualquer
// agrupamento por fornecedor (Rastreabilidade, etc.). Regra de canônico:
//   1. apelido do cadastro (base única de fornecedores), quando a grafia
//      normalizada bate com um cadastro;
//   2. senão, a grafia mais frequente entre as existentes.
// Snapshot local de cada lista vai para ../HUBFinanceiro-backups antes de gravar.
//
// Uso: node scripts/canonizar_fornecedores.mjs [--dry-run]
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry-run');
const BACKUP_DIR = path.resolve(process.cwd(), '..', 'HUBFinanceiro-backups');

const norm = v => String(v || '').trim().toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error('Defina SUPABASE_DB_PASSWORD antes de rodar.');
  process.exit(1);
}
const client = new pg.Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432,
  user: 'postgres.buubjnddzsadzcumrvdt', password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres', ssl: { rejectUnauthorized: false },
});
await client.connect();

const getList = async key =>
  (await client.query(`select value from app_state where key = $1`, [key])).rows[0]?.value;

// ── 1. Canônico por grafia normalizada ───────────────────────────────────────
const canonico = new Map(); // norm -> grafia canônica
const { rows: fkeys } = await client.query(
  `select key from app_state where key ~ 'fornecedores$' and key !~ '::backup'`);
for (const { key } of fkeys) {
  for (const f of (await getList(key)) || []) {
    if (f?.apelido) canonico.set(norm(f.apelido), f.apelido.trim());
  }
}

// Listas onde `fornecedor` aparece: notas (jogo/mensal/livemode), submissões,
// histórico e os RESUMOS dentro dos envios.
const { rows: keyRows } = await client.query(`
  select key from app_state
   where key !~ '::backup'
     and (key in ('notas','notas_mensais','notas_livemode','nf_submissions','nf_historico',
                  'envios','paulistao_nf_submissions','paulistao_nf_historico')
          or key ~ '_(notas|notas_mensais|notas_livemode|envios)$')
   order by key
`);
const listas = new Map();
for (const { key } of keyRows) {
  const v = await getList(key);
  if (Array.isArray(v)) listas.set(key, v);
}

// Grafia mais frequente para quem não tem cadastro (conta em TODAS as listas,
// resumos de envio inclusos, pra decisão global e estável).
const contagem = new Map(); // norm -> Map(grafia -> n)
const contar = f => {
  const raw = String(f || '').trim();
  if (!raw) return;
  const k = norm(raw);
  if (!contagem.has(k)) contagem.set(k, new Map());
  const c = contagem.get(k);
  c.set(raw, (c.get(raw) || 0) + 1);
};
for (const [key, lista] of listas) {
  for (const item of lista) {
    if (key.endsWith('envios')) {
      for (const campo of ['notasResumo', 'mensaisResumo', 'livemodeResumo'])
        for (const n of item?.[campo] || []) contar(n?.fornecedor);
    } else {
      contar(item?.fornecedor);
    }
  }
}
for (const [k, grafias] of contagem) {
  if (!canonico.has(k)) {
    canonico.set(k, [...grafias.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
}

// ── 2. Aplica ────────────────────────────────────────────────────────────────
const corrigir = f => {
  const raw = String(f || '').trim();
  if (!raw) return null;
  const canon = canonico.get(norm(raw));
  return canon && canon !== raw ? canon : null;
};

let totalCampos = 0;
for (const [key, lista] of listas) {
  let mudancas = 0;
  const novaLista = lista.map(item => {
    if (!item) return item;
    if (key.endsWith('envios')) {
      let mudou = false;
      const novo = { ...item };
      for (const campo of ['notasResumo', 'mensaisResumo', 'livemodeResumo']) {
        if (!Array.isArray(item[campo])) continue;
        novo[campo] = item[campo].map(n => {
          const canon = corrigir(n?.fornecedor);
          if (!canon) return n;
          mudou = true; mudancas++;
          return { ...n, fornecedor: canon };
        });
      }
      return mudou ? novo : item;
    }
    const canon = corrigir(item.fornecedor);
    if (!canon) return item;
    mudancas++;
    return { ...item, fornecedor: canon };
  });

  if (mudancas === 0) { console.log(`${key}: ok`); continue; }
  console.log(`${key}: ${mudancas} campo(s) de fornecedor padronizado(s)`);
  totalCampos += mudancas;
  if (DRY) continue;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(BACKUP_DIR, `${key.replace(/[^\w-]/g, '_')}_${stamp}.json`), JSON.stringify(lista));
  await client.query(
    `update app_state set value = $2::jsonb, updated_at = now() where key = $1`,
    [key, JSON.stringify(novaLista)]
  );
}

console.log(`\n${DRY ? '[dry-run] ' : ''}Total: ${totalCampos} campos corrigidos.`);
await client.end();
