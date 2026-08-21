import { supabase } from "./supabase";

// ─── DETECÇÃO DE NF DUPLICADA ────────────────────────────────────────────────
// Nasceu do incidente da NF 16 do João Marcos (08/2026): a mesma NF entrou duas
// vezes com grafias diferentes do fornecedor ("joão marcos" × "João Marcos"),
// cada cópia foi parar num envio (19 e 20) e o pagamento saiu em dobro. A chave
// de comparação aqui normaliza acento/caixa/pontuação de propósito — duplicata
// se detecta pelo conteúdo, nunca pela grafia. Complementa a chave o hash do
// arquivo (fileHash, sha-256 do dataUrl): pega até duplicata com o nº digitado
// errado, porque o PDF anexado é o mesmo byte a byte.

export const normTexto = v => String(v || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

// Chave fornecedor+número. null quando não há número — NF sem número não entra
// na detecção por chave (só por arquivo), senão todo "SN" colidiria entre si.
export const chaveDuplicataNF = (fornecedor, numeroNF) => {
  const num = normTexto(numeroNF);
  if (!num) return null;
  return `${normTexto(fornecedor)}||${num}`;
};

// Procura duplicatas de {fornecedor, numeroNF, fileHash} nas listas dadas.
// `listas` = [{origem: "notas mensais", notas: [...]}, ...]. `ignorarIds` tira
// a própria nota (edição) e irmãs da mesma submissão multi-jogo.
export function acharDuplicatasNF({ fornecedor, numeroNF, fileHash, ignorarIds = [] }, listas) {
  const chave = chaveDuplicataNF(fornecedor, numeroNF);
  const ignorar = new Set(ignorarIds.map(String));
  const matches = [];
  for (const { origem, notas } of listas) {
    for (const n of notas || []) {
      if (ignorar.has(String(n.id))) continue;
      const motivos = [];
      if (chave && chaveDuplicataNF(n.fornecedor, n.numeroNF) === chave) motivos.push("mesmo nº de NF");
      if (fileHash && n.fileHash && n.fileHash === fileHash) motivos.push("mesmo arquivo");
      if (motivos.length) matches.push({ nota: n, origem, motivo: motivos.join(" e ") });
    }
  }
  return matches;
}

// true = pode prosseguir (sem duplicata, ou o operador confirmou de propósito).
export function confirmarDuplicatas(matches, oQue = "salvar esta NF") {
  if (!matches.length) return true;
  const linhas = matches.slice(0, 5).map(({ nota, origem, motivo }) =>
    `• NF ${nota.numeroNF || "s/nº"} · ${nota.fornecedor || "?"} · ${origem} (${motivo})`);
  return window.confirm(
    `⚠️ POSSÍVEL NF DUPLICADA\n\nJá existe registro parecido:\n${linhas.join("\n")}\n\n` +
    `Tem certeza que quer ${oQue} mesmo assim?`
  );
}

// Mapa chave→rótulo do envio para toda NF que já está dentro de algum envio.
// Usa os resumos gravados no próprio envio (têm fornecedor+numeroNF), então
// funciona mesmo quando a nota original já não existe mais.
export function chavesEmEnvios(envios) {
  const map = new Map();
  for (const e of envios || []) {
    const label = e.nome || `Envio ${e.numero}`;
    for (const n of [...(e.notasResumo || []), ...(e.mensaisResumo || []), ...(e.livemodeResumo || [])]) {
      const chave = chaveDuplicataNF(n.fornecedor, n.numeroNF);
      if (chave && !map.has(chave)) map.set(chave, label);
    }
  }
  return map;
}

// Checagem no SERVIDOR para os formulários públicos: o RLS esconde notas/
// notas_mensais do anon, então a comparação roda num RPC security definer
// (migration 20260821000000_nf_duplicada_check) que devolve só {dup, motivo}.
// null = checagem indisponível (RPC ausente/erro) — quem chama NÃO bloqueia.
export async function nfDuplicadaServidor(escopo, { fornecedor, numeroNF, fileHash }) {
  try {
    const { data, error } = await supabase.rpc("nf_duplicada", {
      p_escopo: escopo,
      p_fornecedor: fornecedor || "",
      p_numero: numeroNF || "",
      p_file_hash: fileHash || null,
    });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
