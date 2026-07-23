// Backup da tabela public.app_state (todo o estado do HUB).
//
// Uso:
//   node scripts/backup.mjs            -> backup só dos DADOS (rápido, ~poucos MB):
//                                         exclui os arquivos de NF (nf_file_*) e as
//                                         pilhas ::backup. É o que interessa pra não
//                                         perder informação financeira.
//   node scripts/backup.mjs --full     -> backup COMPLETO, incluindo os arquivos de
//                                         NF embutidos (pesado, ~180MB+).
//
// Saída: arquivo JSON em ./backups/ com timestamp no nome.
//
// Credenciais: usa SUPABASE_URL / SUPABASE_KEY do ambiente. Se não houver, cai na
// chave anon pública (a mesma que o app usa). Quando o RLS entrar, basta setar
// SUPABASE_KEY com uma service_role key (secret no GitHub) que o script continua igual.

import { writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

const U = process.env.SUPABASE_URL || 'https://buubjnddzsadzcumrvdt.supabase.co';
const K = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dWJqbmRkenNhZHpjdW1ydmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQ3OTUsImV4cCI6MjA5MDIwMDc5NX0.mMEoVzmgdT1nHj1TLUWfhXzd4tcnzFad-HtF6TKPMw4';
const H = { apikey: K, Authorization: `Bearer ${K}` };

const FULL = process.argv.includes('--full');
const KEEP = parseInt(process.env.BACKUP_KEEP || '', 10) || (FULL ? 8 : 60); // versões a manter
const DIR = join(process.cwd(), 'backups');
// Páginas menores no modo full: cada linha nf_file_ pode ter MBs de PDF/imagem,
// e páginas grandes estouram o statement_timeout do Postgres.
const STEP = FULL ? 40 : 200;

// PostgREST: no modo dados, filtra as linhas pesadas JÁ no servidor (não transfere
// os arquivos nem as pilhas ::backup) — sem isso a query estoura o timeout.
const FILTRO = FULL ? '' : '&key=not.like.nf_file_*&key=not.like.*::backup';

async function getPage(off) {
  const url = `${U}/rest/v1/app_state?select=key,value,updated_at&order=key.asc&offset=${off}&limit=${STEP}${FILTRO}`;
  let ultimoErro;
  for (let tent = 1; tent <= 4; tent++) {
    try {
      const r = await fetch(url, { headers: H });
      if (r.ok) return await r.json();
      ultimoErro = new Error(`Supabase ${r.status}: ${await r.text()}`);
    } catch (e) { ultimoErro = e; }
    await new Promise(res => setTimeout(res, 1000 * tent)); // backoff antes de tentar de novo
  }
  throw ultimoErro;
}

async function fetchAll() {
  const all = [];
  for (let off = 0; ; off += STEP) {
    const rows = await getPage(off);
    all.push(...rows);
    if (rows.length < STEP) break;
  }
  return all;
}

function rotate(prefix) {
  // mantém só as KEEP versões mais recentes com esse prefixo
  const files = readdirSync(DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .map(f => ({ f, t: statSync(join(DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(KEEP)) {
    unlinkSync(join(DIR, f));
    console.log('  removido (rotação):', f);
  }
}

async function main() {
  mkdirSync(DIR, { recursive: true });
  const rows = await fetchAll(); // no modo dados o filtro já veio do servidor

  const isFile = k => k.startsWith('nf_file_');
  const isBackup = k => k.endsWith('::backup');

  const stamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const prefix = FULL ? 'app_state_full_' : 'app_state_data_';
  const file = join(DIR, `${prefix}${stamp}.json`);
  const dump = {
    exportadoEm: new Date().toISOString(),
    modo: FULL ? 'full' : 'data',
    origem: U,
    linhasNoArquivo: rows.length,
    rows,
  };
  writeFileSync(file, JSON.stringify(dump));

  const nDados = rows.filter(r => !isFile(r.key) && !isBackup(r.key)).length;
  const nFiles = rows.filter(r => isFile(r.key)).length;
  const mb = (statSync(file).size / 1024 / 1024).toFixed(2);
  console.log(`Backup ${dump.modo.toUpperCase()} gravado: ${file} (${mb} MB, ${rows.length} linhas)`);
  if (FULL) console.log(`Inclui ${nDados} dados + ${nFiles} arquivos de NF.`);
  else console.log(`${nDados} chaves de dados (arquivos de NF e ::backup excluídos deste modo).`);

  rotate(prefix);
}

main().catch(err => { console.error('FALHA no backup:', err.message); process.exit(1); });
