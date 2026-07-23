// Verifica, usando a CHAVE ANON, se o RLS de app_state está se comportando.
//
// Uso:
//   node scripts/verificar_rls.mjs           -> só leitura (100% seguro, não escreve nada)
//   node scripts/verificar_rls.mjs --write   -> inclui teste de escrita/DELETE negados
//                                               (cria e limpa uma chave de teste "__rls_probe__")
//
// Rode ANTES de aplicar a migration (baseline: tudo liberado) e DEPOIS (protegido).
// Credenciais: SUPABASE_URL / SUPABASE_KEY do ambiente, senão a anon pública.

const U = process.env.SUPABASE_URL || 'https://buubjnddzsadzcumrvdt.supabase.co';
const K = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dWJqbmRkenNhZHpjdW1ydmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQ3OTUsImV4cCI6MjA5MDIwMDc5NX0.mMEoVzmgdT1nHj1TLUWfhXzd4tcnzFad-HtF6TKPMw4';
const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };

const WRITE = process.argv.includes('--write');

// key -> tem linha visível pro anon?
async function podeLer(key) {
  const r = await fetch(`${U}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=key`, { headers: H });
  if (!r.ok) return { ok: false, nota: `HTTP ${r.status}` };
  const rows = await r.json();
  return { ok: true, visivel: rows.length > 0 };
}

// Deve continuar LEGÍVEL pelo anon (fluxos públicos):
const DEVE_LER = ['jogos', 'fornecedores', 'envios', 'nf_submissions', 'forn_tabelas_preco', 'paulistao_jogos'];
// Deve ficar INVISÍVEL pro anon depois do RLS (dados financeiros):
const NAO_DEVE_LER = ['notas', 'notas_mensais', 'servicos', 'cotacoes', 'logistica', 'livemode', 'paulistao_notas', 'notas_mensais::backup'];

let falhas = 0;
const linha = (nome, esperado, resultado, ok) => {
  if (!ok) falhas++;
  console.log(`  ${ok ? 'OK  ' : 'XXX '} ${nome.padEnd(26)} esperado: ${esperado.padEnd(22)} | ${resultado}`);
};

async function main() {
  console.log(`Alvo: ${U}`);
  console.log(`Chave: role="${JSON.parse(Buffer.from(K.split('.')[1], 'base64').toString()).role}"\n`);

  console.log('LEITURA — chaves públicas (devem continuar visíveis):');
  for (const key of DEVE_LER) {
    const r = await podeLer(key);
    linha(key, 'visível', r.ok ? (r.visivel ? 'visível' : 'INVISÍVEL/vazia') : r.nota, r.ok && r.visivel);
  }

  console.log('\nLEITURA — chaves financeiras (devem ficar INVISÍVEIS após o RLS):');
  for (const key of NAO_DEVE_LER) {
    const r = await podeLer(key);
    const bloqueada = r.ok && !r.visivel;
    linha(key, 'invisível', r.ok ? (r.visivel ? 'VISÍVEL (RLS off?)' : 'invisível') : r.nota, bloqueada);
  }

  if (WRITE) {
    console.log('\nESCRITA/DELETE — o anon NÃO pode gravar nem apagar chave protegida:');
    const probe = '__rls_probe_delete_me__'; // não casa com nenhum padrão público
    // tentativa de INSERT (deve ser NEGADA após RLS)
    const ins = await fetch(`${U}/rest/v1/app_state`, {
      method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: probe, value: { rls_test: true }, updated_at: new Date().toISOString() }),
    });
    const insNegado = ins.status === 401 || ins.status === 403;
    linha('INSERT chave protegida', 'negado', `HTTP ${ins.status}${insNegado ? '' : ' (PASSOU!)'}`, insNegado);

    // tentativa de DELETE numa chave financeira REAL (notas): pede o que foi
    // apagado de volta. Com RLS, o anon não enxerga a linha => 0 apagadas.
    const del = await fetch(`${U}/rest/v1/app_state?key=eq.notas`, {
      method: 'DELETE', headers: { ...H, Prefer: 'return=representation' },
    });
    let apagadas = 0;
    try { apagadas = (await del.json()).length; } catch (_) {}
    const deleteSeguro = del.status === 401 || del.status === 403 || (del.status === 200 && apagadas === 0);
    linha('DELETE em "notas" (real)', '0 linhas apagadas', `HTTP ${del.status}, ${apagadas} apagada(s)`, deleteSeguro);

    // limpeza: se o INSERT passou (RLS ainda off), remove o lixo com service key se houver
    if (!insNegado) {
      const SK = process.env.SUPABASE_SERVICE_KEY;
      if (SK) {
        await fetch(`${U}/rest/v1/app_state?key=eq.${probe}`, { method: 'DELETE', headers: { apikey: SK, Authorization: `Bearer ${SK}` } });
        console.log(`  (limpeza: chave "${probe}" removida via service key)`);
      } else {
        console.log(`  ATENÇÃO: "${probe}" foi criada (RLS ainda desligado). Apague manualmente ou rode com SUPABASE_SERVICE_KEY.`);
      }
    }
  }

  console.log(`\n${falhas === 0 ? '✅ Tudo conforme o esperado.' : `⚠️  ${falhas} verificação(ões) fora do esperado (normal ANTES de aplicar a migration).`}`);
}

main().catch(e => { console.error('Falha:', e.message); process.exit(1); });
