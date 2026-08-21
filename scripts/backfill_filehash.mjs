// Backfill do fileHash (sha-256 do dataUrl) nas notas/submissões existentes.
// O hash é a segunda perna da detecção de duplicata (src/lib/dedupeNF.js):
// pega o mesmo PDF reenviado mesmo com nº de NF diferente. Notas novas já
// nascem com fileHash (saveNFFile devolve o hash); este script cobre o acervo.
//
// O hash é computado NO SERVIDOR via pgcrypto digest(value #>> '{}', 'sha256')
// — mesma conta do hashDataUrl do client — então nenhum arquivo é baixado
// (lição do incidente de Disk IO de 08/2026). Snapshot local de cada lista vai
// para ../HUBFinanceiro-backups antes de gravar.
//
// Uso: node scripts/backfill_filehash.mjs [--dry-run]
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry-run');
const BACKUP_DIR = path.resolve(process.cwd(), '..', 'HUBFinanceiro-backups');

const client = new pg.Client({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.buubjnddzsadzcumrvdt',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error('Defina SUPABASE_DB_PASSWORD antes de rodar.');
  process.exit(1);
}
await client.connect();

await client.query(`create extension if not exists pgcrypto with schema extensions`);

// Todas as listas que carregam notas com arquivo: Brasileirão, Paulistão e
// campeonatos custom (<slug>_notas / <slug>_notas_mensais), mais as filas de
// submissões pendentes dos formulários públicos.
const { rows: keyRows } = await client.query(`
  select key from app_state
   where key !~ '::backup'
     and (key in ('notas','notas_mensais','nf_submissions','paulistao_nf_submissions')
          or key ~ '_(notas|notas_mensais|nf_submissions)$')
   order by key
`);

let totalAtualizadas = 0;
for (const { key } of keyRows) {
  const { rows } = await client.query(`select value from app_state where key = $1`, [key]);
  const lista = rows[0]?.value;
  if (!Array.isArray(lista)) { console.log(`${key}: não é lista, pulando`); continue; }

  const pendentes = lista.filter(n => n && n.hasFile && !n.fileHash && n.id != null);
  if (pendentes.length === 0) { console.log(`${key}: nada a fazer (${lista.length} itens)`); continue; }

  const fileKeys = pendentes.map(n => `nf_file_${n.id}`);
  const { rows: hashes } = await client.query(
    `select key, encode(extensions.digest(convert_to(value #>> '{}', 'UTF8'), 'sha256'), 'hex') as h
       from app_state where key = any($1)`,
    [fileKeys]
  );
  const hashPorId = new Map(hashes.map(r => [r.key.replace('nf_file_', ''), r.h]));

  let atualizadas = 0;
  const novaLista = lista.map(n => {
    if (!n || !n.hasFile || n.fileHash || n.id == null) return n;
    const h = hashPorId.get(String(n.id));
    if (!h) return n; // hasFile prometido mas arquivo não existe — não inventa hash
    atualizadas++;
    return { ...n, fileHash: h };
  });

  console.log(`${key}: ${atualizadas}/${pendentes.length} notas ganham fileHash` +
    (pendentes.length - atualizadas ? ` (${pendentes.length - atualizadas} sem arquivo no banco)` : ''));
  if (DRY || atualizadas === 0) continue;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(BACKUP_DIR, `${key.replace(/[^\w-]/g, '_')}_${stamp}.json`), JSON.stringify(lista));

  await client.query(
    `update app_state set value = $2::jsonb, updated_at = now() where key = $1`,
    [key, JSON.stringify(novaLista)]
  );
  totalAtualizadas += atualizadas;
}

console.log(`\n${DRY ? '[dry-run] ' : ''}Total: ${totalAtualizadas} notas atualizadas.`);
await client.end();
