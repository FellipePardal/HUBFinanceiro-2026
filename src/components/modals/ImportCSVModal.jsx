import { useState } from "react";
import { btnStyle } from "../../constants";

// Mapeamento coluna CSV → subkey do portal
const CSV_MAP = {
  "OUTROS LOGISTICA": "outros_log",
  "TRANSPORTE":       "transporte",
  "UBER":             "uber",
  "HOSPEDAGEM":       "hospedagem",
  "DIÁRIA":           "diaria",
  "coord UM":         "coord_um",
  "prod UM":          "prod_um",
  "prod campo":       "prod_campo",
  "monitoração":      "monitoracao",
  "supervisor 1":     "supervisor1",
  "supervisor 2":     "supervisor2",
  "DTV":              "dtv",
  "vmix":             "vmix",
  "audio":            "audio",
  "UM B1":            "um_b1",
  "UM B2":            "um_b2",
  "GERADORES":        "geradores",
  "SNG ":             "sng",
  "SNG EXTRA":        "sng_extra",
  "SEG. ESPACIAL":    "seg_espacial",
  "SEG. EXTRA":       "seg_extra",
  "DRONE":            "drone",
  "GRUA/POLICAM":     "grua",
  "DSLR + Microlink": "dslr",
  "CARRINHO":         "carrinho",
  "Especial":         "especial",
  "MICROS":           "goalcam",
  "MINIDRONE":        "minidrone",
  "INFRA + DISTR":    "infra",
  "EXTRA":            "extra",
};

const makeKey = (rodada, mandante, visitante) =>
  `R${rodada}_${mandante.toUpperCase().trim()}x${visitante.toUpperCase().trim()}`;

const parseBRVal = v => {
  if (!v || v.trim() === "") return 0;
  return parseFloat(v.replace(/R\$\s*/g,"").replace(/\./g,"").replace(",",".")) || 0;
};

const parseCSV = text => {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const headerIdx = lines.findIndex(l => l.includes("ID JOGO"));
  if (headerIdx === -1) return { error: "Cabeçalho 'ID JOGO' não encontrado." };

  const headers = lines[headerIdx].split(",").map(h => h.replace(/^"|"$/g,"").trim());
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const vals = lines[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || lines[i].split(",");
    const clean = vals.map(v => v.replace(/^"|"$/g,"").trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = clean[idx] || ""; });
    if (row["ID JOGO"] && row["ID JOGO"].startsWith("R")) rows.push(row);
  }

  return { headers, rows };
};

export default function ImportCSVModal({ jogos, onImport, onClose, T }) {
  const [tipo,    setTipo]    = useState("provisionado");
  const [preview, setPreview] = useState(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError(""); setPreview(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers, rows, error: err } = parseCSV(ev.target.result);
      if (err) { setError(err); setLoading(false); return; }

      const resultados = rows.map(row => {
        const idCSV = row["ID JOGO"].trim();
        const match = idCSV.match(/^R(\d+)_(.+)x(.+)$/i);
        if (!match) return { idCSV, status: "ID inválido", jogo: null, valores: {} };

        const [, rodada, mandCSV, visCSV] = match;
        const keyCSV = makeKey(rodada, mandCSV, visCSV);

        const jogoPortal = jogos.find(j => {
          const keyPortal = makeKey(j.rodada, j.mandante, j.visitante);
          return keyPortal === keyCSV;
        });

        const valores = {};
        Object.entries(CSV_MAP).forEach(([csvCol, subkey]) => {
          if (headers.includes(csvCol)) {
            const v = parseBRVal(row[csvCol]);
            if (v !== 0) valores[subkey] = v;
          }
        });

        return {
          idCSV,
          status: jogoPortal ? "✅ Encontrado" : "⚠️ Não encontrado",
          jogo:   jogoPortal,
          valores,
        };
      });

      setPreview(resultados);
      setLoading(false);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = () => {
    const atualizados = preview.filter(r => r.jogo && Object.keys(r.valores).length > 0);
    const novosJogos = jogos.map(j => {
      const match = atualizados.find(r => r.jogo.id === j.id);
      if (!match) return j;
      return { ...j, [tipo]: { ...(j[tipo] || {}), ...match.valores } };
    });
    onImport(novosJogos);
    onClose();
  };

  const encontrados    = preview?.filter(r => r.jogo)?.length || 0;
  const naoEncontrados = preview?.filter(r => !r.jogo)?.length || 0;

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,color:T.text}}>Importar CSV do Sheets</h3>
        <p style={{margin:"0 0 20px",fontSize:12,color:T.textSm}}>Importe provisionado ou realizado diretamente da planilha exportada.</p>

        {/* Tipo */}
        <div style={{marginBottom:16}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:6}}>Qual campo atualizar?</label>
          <div style={{display:"flex",gap:8}}>
            {["provisionado","realizado"].map(t => (
              <button key={t} onClick={()=>setTipo(t)} style={{...btnStyle,background:tipo===t?"#3b82f6":T.bg,color:tipo===t?"#fff":T.textMd,fontSize:12,padding:"6px 16px",textTransform:"capitalize"}}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div style={{marginBottom:16}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:6}}>Selecione o arquivo CSV</label>
          <input type="file" accept=".csv" onChange={handleFile} style={{color:T.text,fontSize:13}}/>
        </div>

        {loading && <p style={{color:T.textSm,fontSize:13}}>Processando...</p>}
        {error   && <p style={{color:"#ef4444",fontSize:13}}>{error}</p>}

        {/* Preview */}
        {preview && (
          <>
            <div style={{display:"flex",gap:16,marginBottom:12,fontSize:13}}>
              <span style={{color:"#22c55e"}}>✅ {encontrados} jogos encontrados</span>
              {naoEncontrados > 0 && <span style={{color:"#f59e0b"}}>⚠️ {naoEncontrados} não encontrados</span>}
            </div>
            <div style={{background:T.bg,borderRadius:8,padding:12,maxHeight:220,overflowY:"auto",marginBottom:16}}>
              {preview.map((r,i) => (
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:`1px solid ${T.border}`,color:r.jogo?T.text:T.textSm}}>
                  <span>{r.idCSV}</span>
                  <span>{r.status} · {Object.keys(r.valores).length} campos</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          {preview && encontrados > 0 && (
            <button onClick={handleImport} style={{...btnStyle,background:"#22c55e"}}>
              ⬆️ Importar {encontrados} jogos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
