// Reconstroi a chave `notas` (Brasileirao) a partir do `notasResumo` que
// sobreviveu dentro de cada `envios[*]`. Heuristicas:
//   - codigo "RD<rd>_<MAND>x<VIS>_<valor>_NFxxx" identifica o jogo principal
//   - servicosLabels -> subKeys via CATS (label -> key)
//   - se houver 1 servico, valorNF inteiro vai pra ele; se >1, divide igual
//   - dedupe por nota.id (notas em multiplos envios contam uma vez)
// Modo dry-run por padrao; passe --apply para gravar no Supabase.

const SUPABASE_URL = 'https://buubjnddzsadzcumrvdt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dWJqbmRkenNhZHpjdW1ydmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQ3OTUsImV4cCI6MjA5MDIwMDc5NX0.mMEoVzmgdT1nHj1TLUWfhXzd4tcnzFad-HtF6TKPMw4';

const apply = process.argv.includes('--apply');

const ABBREV = {"Fluminense":"FLU","Botafogo":"BOT","Flamengo":"FLA","Vasco":"VAS","Corinthians":"COR","Palmeiras":"PAL","São Paulo":"SAO","Athletico PR":"CAP","Grêmio":"GRE","Internacional":"INT","Cruzeiro":"CRU","Atlético MG":"CAM","Chapecoense":"CHA","Santos":"SAN","Vitória":"VIT","Mirassol":"MIR","Coritiba":"CFC"};
const ABBREV_TO_TEAM = Object.fromEntries(Object.entries(ABBREV).map(([k,v]) => [v,k]));

const CATS_SUBS = [
  ["outros_log","Outros Logística"],["transporte","Transporte"],["uber","Uber"],["hospedagem","Hospedagem"],["diaria","Diária de Alimentação"],
  ["coord_um","Coord UM"],["prod_um","Prod UM"],["prod_campo","Prod Campo"],["monitoracao","Monitoração"],["supervisor1","Supervisor 1"],["supervisor2","Supervisor 2"],["dtv","DTV"],["vmix","Vmix"],["audio","Áudio"],
  ["um_b1","UM B1"],["um_b2","UM B2"],["um_b3","UM B3"],["geradores","Geradores"],["sng","SNG"],["sng_extra","SNG Extra"],["seg_espacial","Seg. Espacial"],["seg_extra","Seg. Extra"],["drone","Drone"],["grua","Grua/Policam"],["dslr","DSLR + Microlink"],["dslrs_transmissor","DSLR + Transmissor"],["refcam","Refcam"],["carrinho","Carrinho"],["especial","Especial"],["goalcam","Goalcam"],["minidrone","Minidrone"],["infra","Infra + Distr."],["downlink","Downlink"],["distribuicao","Distribuição"],["liveu","LiveU"],["internet","Internet"],["maquinas","Máquinas"],["montagem_vespera","Montagem Véspera"],["extra","Extra"],
];
const LABEL_TO_SUBKEY = Object.fromEntries(CATS_SUBS.map(([k,l]) => [l, k]));

async function getState(key) {
  const url = `${SUPABASE_URL}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const arr = await r.json();
  return arr[0]?.value ?? null;
}

async function setStateSb(key, value) {
  const url = `${SUPABASE_URL}/rest/v1/app_state?on_conflict=key`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`PUT ${key} -> ${r.status}: ${await r.text()}`);
}

function parseCodigo(codigo) {
  // RD01_FLUxGRE_22000_NF100  |  pode ter NFSN, NF<vazio>, valores zerados
  const m = /^RD(\d+)_([A-Z]{3})x([A-Z]{3})_(\d+)_NF(.*)$/.exec(codigo || "");
  if (!m) return null;
  return { rodada: parseInt(m[1]), mandAbrv: m[2], visAbrv: m[3], valor: parseInt(m[4]), numeroNF: m[5] };
}

function parseJogoLabel(label) {
  // "Fluminense x Corinthians" ou "Fluminense x Grêmio + Botafogo x Cruzeiro"
  if (!label) return null;
  const primeiro = label.split('+')[0].trim();
  const partes = primeiro.split(/\s*x\s*/);
  if (partes.length < 2) return null;
  return { mand: partes[0].trim(), vis: partes[1].trim() };
}

function acharJogo(jogos, info, jogoLabel, rodadaResumo) {
  // 1) Match por codigo (FLUxGRE + rodada)
  if (info) {
    const mand = ABBREV_TO_TEAM[info.mandAbrv];
    const vis  = ABBREV_TO_TEAM[info.visAbrv];
    let j = jogos.find(j => j.rodada === info.rodada && j.mandante === mand && j.visitante === vis);
    if (j) return j;
    j = jogos.find(j => j.rodada === info.rodada && j.mandante === vis && j.visitante === mand);
    if (j) return j;
    j = jogos.find(j => j.mandante === mand && j.visitante === vis);
    if (j) return j;
  }
  // 2) Fallback por jogoLabel (codigos antigos com nome truncado tipo "Internacio")
  const lbl = parseJogoLabel(jogoLabel);
  if (lbl) {
    const rd = info?.rodada ?? rodadaResumo;
    let j = jogos.find(j => (rd == null || j.rodada === rd) && j.mandante === lbl.mand && j.visitante === lbl.vis);
    if (j) return j;
    j = jogos.find(j => (rd == null || j.rodada === rd) && j.mandante === lbl.vis && j.visitante === lbl.mand);
    if (j) return j;
    j = jogos.find(j => j.mandante === lbl.mand && j.visitante === lbl.vis);
    if (j) return j;
  }
  return null;
}

function mapLabelToSubKey(label) {
  if (!label) return null;
  if (LABEL_TO_SUBKEY[label]) return LABEL_TO_SUBKEY[label];
  // Heuristicas para labels antigos/customizados
  const l = label.toLowerCase();
  if (/produ[cç][aã]o de campo/.test(l))    return "prod_campo";
  if (/produ[cç][aã]o.*um/.test(l))         return "prod_um";
  if (/coord/.test(l))                      return "coord_um";
  if (/supervisor.*1/.test(l))              return "supervisor1";
  if (/supervisor.*2/.test(l))              return "supervisor2";
  if (/supervisor/.test(l))                 return "supervisor1";
  if (/^dtv\b|directv|d.tv/.test(l))        return "dtv";
  if (/vmix/.test(l))                       return "vmix";
  if (/audio|áudio|microfone|boom/.test(l)) return "audio";
  if (/uber/.test(l))                       return "uber";
  if (/transporte|passagem|locado/.test(l)) return "transporte";
  if (/hospedagem|hotel/.test(l))           return "hospedagem";
  if (/di[áa]ria|alimenta[cç][aã]o/.test(l))return "diaria";
  if (/drone/.test(l))                      return "drone";
  if (/grua|policam/.test(l))               return "grua";
  if (/dslr/.test(l))                       return "dslr";
  if (/refcam/.test(l))                     return "refcam";
  if (/goalcam/.test(l))                    return "goalcam";
  if (/minidrone/.test(l))                  return "minidrone";
  if (/sng.*extra/.test(l))                 return "sng_extra";
  if (/sng/.test(l))                        return "sng";
  if (/gerador/.test(l))                    return "geradores";
  if (/seg.*espac/.test(l))                 return "seg_espacial";
  if (/seg.*extra/.test(l))                 return "seg_extra";
  if (/um\s*b1|m[óo]vel.*b1/.test(l))       return "um_b1";
  if (/um\s*b2/.test(l))                    return "um_b2";
  if (/um\s*b3/.test(l))                    return "um_b3";
  if (/downlink/.test(l))                   return "downlink";
  if (/distribu/.test(l))                   return "distribuicao";
  if (/liveu/.test(l))                      return "liveu";
  if (/internet/.test(l))                   return "internet";
  if (/m[áa]quinas?/.test(l))               return "maquinas";
  if (/v[ée]spera|montagem/.test(l))        return "montagem_vespera";
  if (/infra/.test(l))                      return "infra";
  // Tudo o que nao bate vai para "extra" (servicos avulsos / custom)
  return "extra";
}

function construirNota(resumo, jogos) {
  const info = parseCodigo(resumo.codigo);
  const jogo = acharJogo(jogos, info, resumo.jogoLabel, resumo.rodada);
  if (!jogo) {
    return { ok:false, motivo:`jogo nao encontrado para ${resumo.codigo} / ${resumo.jogoLabel}` };
  }
  const labels = resumo.servicosLabels || [];
  const subKeysRaw = labels.map(l => mapLabelToSubKey(l));
  const subKeys = subKeysRaw.filter(Boolean);
  if (subKeys.length === 0) {
    return { ok:false, motivo:`nenhum subKey mapeado para servicosLabels=${JSON.stringify(labels)} (id=${resumo.id})` };
  }
  // Reparte valorNF entre os servicos. Se 1, vai inteiro. Se >1, divide igual.
  const valor = resumo.valorNF || 0;
  const cota = subKeys.length > 0 ? Math.round((valor / subKeys.length) * 100) / 100 : 0;
  const servicosValores = Object.fromEntries(subKeys.map(k => [k, cota]));
  // Ajuste de centavos no ultimo (se houver sobra/falta)
  if (subKeys.length > 1) {
    const somado = Object.values(servicosValores).reduce((s,v)=>s+v,0);
    const diff = valor - somado;
    if (Math.abs(diff) > 0.001) servicosValores[subKeys[subKeys.length-1]] += diff;
  }
  const servicosKeys = subKeys.map(k => `${jogo.id}_${k}`);

  return {
    ok: true,
    nota: {
      id: resumo.id,
      jogoId: jogo.id,
      rodada: resumo.rodada ?? jogo.rodada,
      mandante: jogo.mandante,
      visitante: jogo.visitante,
      jogoLabel: resumo.jogoLabel || `${jogo.mandante} x ${jogo.visitante}`,
      codigo: resumo.codigo,
      fornecedor: resumo.fornecedor || "",
      numeroNF: resumo.numeroNF || "",
      valorNF: valor,
      dataEmissao: resumo.dataEmissao || "",
      dataEnvio: resumo.dataPagamento || "",
      hasFile: !!resumo.hasFile,
      tipo: "prevista",
      status: "Conferida",
      obs: "[recuperada do envios em " + new Date().toISOString().slice(0,10) + "]",
      servicosKeys,
      servicosLabels: labels,
      servicosValores,
    },
  };
}

(async () => {
  const [envios, jogos, notasAtuais] = await Promise.all([
    getState('envios'),
    getState('jogos'),
    getState('notas'),
  ]);
  if (!Array.isArray(envios)) throw new Error('envios nao e array');
  if (!Array.isArray(jogos))  throw new Error('jogos nao e array');

  const todas = [];
  const ignoradas = [];
  const seen = new Set();
  for (const env of envios) {
    for (const r of (env.notasResumo || [])) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const out = construirNota(r, jogos);
      if (out.ok) todas.push(out.nota);
      else ignoradas.push({ id: r.id, codigo: r.codigo, motivo: out.motivo });
    }
  }

  console.log(`Envios processados: ${envios.length}`);
  console.log(`Notas reconstruidas: ${todas.length}`);
  console.log(`Ignoradas: ${ignoradas.length}`);
  if (ignoradas.length) {
    for (const i of ignoradas) console.log("  -", i);
  }
  console.log(`Notas atuais no Supabase: ${(notasAtuais||[]).length}`);

  if (apply) {
    // Mantem notas ja existentes (aprovadas via formulario, se houver) e adiciona reconstruidas que nao colidam por id.
    const idsAtuais = new Set((notasAtuais||[]).map(n => n.id));
    const mesclar = [...(notasAtuais||[]), ...todas.filter(n => !idsAtuais.has(n.id))];
    console.log(`Apos merge: ${mesclar.length} notas serao gravadas`);
    await setStateSb('notas', mesclar);
    console.log("OK gravado em supabase.app_state['notas']");
  } else {
    console.log("\n(dry-run) rode com --apply para gravar.");
  }
})();
