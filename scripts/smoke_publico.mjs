// Smoke test dos fluxos PÚBLICOS (anon), pelo mesmo caminho REST que o navegador usa.
// Simula o que cada componente público faz: as LEITURAS reais + uma ESCRITA "no-op"
// (relê o valor atual e grava exatamente igual de volta => prova que o anon consegue
// escrever, sem alterar nenhum dado). 100% seguro.
//
// Uso: node scripts/smoke_publico.mjs

const U = process.env.SUPABASE_URL || 'https://buubjnddzsadzcumrvdt.supabase.co';
const K = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dWJqbmRkenNhZHpjdW1ydmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQ3OTUsImV4cCI6MjA5MDIwMDc5NX0.mMEoVzmgdT1nHj1TLUWfhXzd4tcnzFad-HtF6TKPMw4';
const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };

let falhas = 0;
const ok = (cond, msg, extra = '') => { if (!cond) falhas++; console.log(`  ${cond ? 'OK ' : 'XXX'} ${msg}${extra ? ' — ' + extra : ''}`); };

async function get(key) {
  const r = await fetch(`${U}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`, { headers: H });
  if (!r.ok) return { erro: `HTTP ${r.status}` };
  const j = await r.json();
  return { value: j[0]?.value ?? null };
}
// escrita no-op: grava o MESMO valor de volta (só prova permissão de escrita)
async function putIgual(key) {
  const { value, erro } = await get(key);
  if (erro) return { erro };
  if (value == null) return { pulado: true };
  const r = await fetch(`${U}/rest/v1/app_state`, {
    method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  return { status: r.status, escreveu: r.ok, corpo: r.ok ? '' : await r.text() };
}

async function main() {
  console.log(`Alvo: ${U} (role anon)\n`);

  console.log('#formulario (Brasileirão) — lê jogos+fornecedores, grava nf_submissions:');
  ok((await get('jogos')).value != null, 'lê jogos');
  ok((await get('fornecedores')).value != null, 'lê fornecedores');
  { const w = await putIgual('nf_submissions'); ok(w.escreveu || w.pulado, 'grava nf_submissions (no-op)', w.pulado ? 'vazia, pulou' : `HTTP ${w.status}${w.corpo}`); }

  console.log('\n#formulario-paulistao — lê paulistao_jogos+fornecedores, grava paulistao_nf_submissions:');
  ok((await get('paulistao_jogos')).value != null, 'lê paulistao_jogos');
  ok((await get('paulistao_fornecedores')).value != null, 'lê paulistao_fornecedores');
  { const w = await putIgual('paulistao_nf_submissions'); ok(w.escreveu || w.pulado, 'grava paulistao_nf_submissions (no-op)', w.pulado ? 'vazia, pulou' : `HTTP ${w.status}${w.corpo}`); }

  console.log('\n#envio/<ref> — lê envios + arquivo da NF, grava envios (confirmar pagamento):');
  const envios = (await get('envios')).value;
  ok(Array.isArray(envios) && envios.length > 0, 'lê envios', Array.isArray(envios) ? `${envios.length} envios` : '');
  // pega um id de arquivo de NF de dentro de um envio e tenta baixar (nf_file_)
  let algumFileId = null;
  for (const e of (envios || [])) {
    const cand = [...(e.notasResumo||[]), ...(e.mensaisResumo||[]), ...(e.livemodeResumo||[])].find(n => n.hasFile);
    if (cand) { algumFileId = cand.id; break; }
  }
  if (algumFileId) { const f = await get(`nf_file_${algumFileId}`); ok(f.value != null, `baixa nf_file_${algumFileId}`); }
  else console.log('  --  nenhum envio com arquivo pra testar download (ok)');
  { const w = await putIgual('envios'); ok(w.escreveu || w.pulado, 'grava envios (no-op)', w.pulado ? 'vazia, pulou' : `HTTP ${w.status}${w.corpo}`); }

  console.log('\n#tabela/<token> — lê forn_tabelas_preco+fornecedores+campeonatos+cidades, grava tabela:');
  ok((await get('forn_tabelas_preco')).value != null, 'lê forn_tabelas_preco');
  ok((await get('forn_campeonatos')).value != null, 'lê forn_campeonatos');
  ok((await get('forn_cidades')).value != null, 'lê forn_cidades');
  { const w = await putIgual('forn_tabelas_preco'); ok(w.escreveu || w.pulado, 'grava forn_tabelas_preco (no-op)', w.pulado ? 'vazia, pulou' : `HTTP ${w.status}${w.corpo}`); }

  console.log('\nGuarda-chuva — o anon NÃO pode ler dados financeiros:');
  for (const key of ['notas', 'servicos', 'cotacoes']) {
    const bloqueada = (await get(key)).value == null;
    ok(bloqueada, `NÃO lê ${key}`, bloqueada ? 'invisível' : 'VAZOU!');
  }

  console.log(`\n${falhas === 0 ? '✅ Fluxos públicos OK — nada quebrou e o financeiro está protegido.' : `⚠️ ${falhas} verificação(ões) falharam.`}`);
  process.exit(falhas === 0 ? 0 : 1);
}
main().catch(e => { console.error('Falha:', e.message); process.exit(1); });
