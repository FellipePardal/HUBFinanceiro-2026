// Lembrete no Slack das NFs dos fixos/mensais que ainda não chegaram.
//
// Roda pela GitHub Action .github/workflows/lembrete_nf_fixos.yml todo dia
// 1 a 5 do mês; só POSTA no primeiro dia útil (fim de semana e feriado
// nacional contam como não útil). Fora disso, encerra em silêncio.
//
// Uso local:
//   SUPABASE_URL=... SUPABASE_KEY=<service_role> SLACK_WEBHOOK_URL=... node scripts/lembrete_nf_fixos.mjs
//   --forcar    posta mesmo que hoje não seja o 1º dia útil (teste)
//   --dry-run   monta a mensagem e imprime, sem postar
//
// Lê as mesmas chaves que a tela "Cobranças de fixos" (aba Mensal) e usa o
// MESMO motor (src/lib/cobrancaFixos.js) — o que aparece aqui é o que aparece lá.
// Precisa de SUPABASE_KEY service_role: o RLS esconde notas_mensais e
// fixos_contratos do anon.

import { calcularCobrancas, ehPrimeiroDiaUtil, normalizarFixos, fmtBRL } from '../src/lib/cobrancaFixos.js';

const U = process.env.SUPABASE_URL || 'https://buubjnddzsadzcumrvdt.supabase.co';
const K = process.env.SUPABASE_KEY;
const WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const HUB_URL = process.env.HUB_URL || 'https://hub-financeiro-2026.vercel.app';
const FORCAR = process.argv.includes('--forcar');
const DRY = process.argv.includes('--dry-run');

// Horário de Brasília independente do fuso do runner.
const agoraBRT = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

if (!K) { console.error('SUPABASE_KEY (service_role) ausente — o RLS não deixa o anon ler notas_mensais.'); process.exit(1); }

const hoje = agoraBRT();
if (!FORCAR && !ehPrimeiroDiaUtil(hoje)) {
  console.log(`Hoje (${hoje.toLocaleDateString('pt-BR')}) não é o primeiro dia útil do mês — nada a fazer.`);
  process.exit(0);
}

async function getKeys(keys) {
  const url = `${U}/rest/v1/app_state?select=key,value&key=in.(${keys.map(encodeURIComponent).join(',')})`;
  const r = await fetch(url, { headers: { apikey: K, Authorization: `Bearer ${K}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const map = {};
  for (const row of await r.json()) map[row.key] = row.value;
  return map;
}

// Campeonatos: Brasileirão (sem prefixo), Paulistão F e customs do registro.
const registro = (await getKeys(['campeonatos_custom']))['campeonatos_custom'] || [];
const campeonatos = [
  { nome: 'Brasileirão 2026', prefixo: '', mesInicio: 0 },
  { nome: 'Paulistão Feminino 2026', prefixo: 'paulistao_', mesInicio: 4 },
  ...registro.filter(c => c && c.id).map(c => ({ nome: `${c.nome || 'Campeonato'} ${c.edicao || ''}`.trim(), prefixo: `${c.id}_`, mesInicio: 0 })),
];

const chaves = campeonatos.flatMap(c => [`${c.prefixo}fixos_contratos`, `${c.prefixo}notas_mensais`]);
const dados = await getKeys(chaves);

const blocos = [];
let totalPend = 0, totalCobradas = 0;
for (const c of campeonatos) {
  const fixos = normalizarFixos(dados[`${c.prefixo}fixos_contratos`]);
  if (!fixos.contratos.length) continue;
  const r = calcularCobrancas({ fixos, notasMensais: dados[`${c.prefixo}notas_mensais`] || [], hoje, mesInicioCamp: c.mesInicio, mesFimCamp: 11 });
  if (!r.resumo.lista.length) { blocos.push(`*${c.nome}* — tudo em dia ✅`); continue; }
  totalPend += r.resumo.pendentes; totalCobradas += r.resumo.cobradas;
  const linhas = r.resumo.lista.map(p => {
    const atraso = p.status === 'cobrada' ? `cobrada em ${p.cobradaEm.split('-').reverse().join('/')}, sem NF` : p.diasAtraso > 0 ? `${p.diasAtraso}d sem NF` : 'vence hoje';
    return `• *${p.fornecedor}* — ${p.mesLabel}${p.valor ? ` · ${fmtBRL(p.valor)}` : ''}${p.servico ? ` · ${p.servico}` : ''} _(${atraso})_`;
  });
  const valor = r.resumo.valorPendente ? ` · ~${fmtBRL(r.resumo.valorPendente)}` : '';
  blocos.push(`*${c.nome}* — ${r.resumo.lista.length} NF${r.resumo.lista.length > 1 ? 's' : ''} a cobrar${valor}\n${linhas.join('\n')}`);
}

if (!blocos.length) { console.log('Nenhum campeonato com contratos fixos cadastrados.'); process.exit(0); }

const mesLabel = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const titulo = totalPend + totalCobradas > 0
  ? `:bell: *Cobrança de NFs dos fixos — ${mesLabel}*\nLembrete do 1º dia útil: pedir as notas do mês trabalhado (${hoje.toLocaleDateString('pt-BR', { month: 'long' })}) e cobrar as atrasadas.`
  : `:white_check_mark: *NFs dos fixos — ${mesLabel}*\nNenhuma pendência. Lembre de pedir as notas de ${hoje.toLocaleDateString('pt-BR', { month: 'long' })} mesmo assim.`;
const rodape = `<${HUB_URL}|Abrir o Hub> → aba Mensal → Cobranças de fixos (marcar cobrada / dispensar).`;
const text = [titulo, ...blocos, rodape].join('\n\n');

console.log(text);
if (DRY) process.exit(0);
if (!WEBHOOK) { console.error('\nSLACK_WEBHOOK_URL ausente — mensagem montada mas não enviada.'); process.exit(1); }

const resp = await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
if (!resp.ok) { console.error(`Slack ${resp.status}: ${await resp.text()}`); process.exit(1); }
console.log('\nEnviado ao Slack.');
