import { useState, useRef, useEffect } from "react";
import { Pill } from "./shared";
import { CATS, iSty } from "../constants";
import { getState, setState, fileToDataUrl, saveNFFile } from "../lib/supabase";

const SUBS_MENSAL = new Set(["transporte","uber","hospedagem","seg_espacial"]);
const DARK = { bg:"#0f172a", card:"#1e293b", border:"#334155", muted:"#475569", text:"#f1f5f9", textMd:"#94a3b8", textSm:"#64748b" };
const btnS = { color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:600, fontSize:13 };

function extrairServicos(jogo) {
  const servicos = [];
  CATS.forEach(cat => {
    cat.subs.forEach(sub => {
      if (SUBS_MENSAL.has(sub.key)) return;
      const val = (jogo.provisionado?.[sub.key] || jogo.orcado?.[sub.key] || 0);
      if (val > 0) servicos.push({ subKey: sub.key, subLabel: sub.label, catLabel: cat.label, catColor: cat.color });
    });
  });
  return servicos;
}

const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const STEPS = ["Rodada","Jogos","Serviços","Valores","Nota Fiscal"];

export default function FormularioPublico() {
  const T = DARK;
  const IS = iSty(T);
  const [jogos, setJogos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [rodadaSel, setRodadaSel] = useState(null);
  const [qtdJogos, setQtdJogos] = useState(1);
  const [jogosSel, setJogosSel] = useState([]);
  const [servicosSel, setServicosSel] = useState({});
  const [valores, setValores] = useState({});
  const [nfData, setNfData] = useState({ fornecedor:"", numeroNF:"", dataEmissao:"", dataEnvio:"", obs:"" });
  const [arquivo, setArquivo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getState('jogos').then(j => { if (j) setJogos(j); setLoading(false); });
  }, []);

  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const rodadas = Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b);
  const jogosRodada = divulgados.filter(j => j.rodada === rodadaSel);

  const canNext = () => {
    if (step === 0) return rodadaSel != null;
    if (step === 1) return jogosSel.length === qtdJogos;
    if (step === 2) return Object.values(servicosSel).some(arr => arr.length > 0);
    if (step === 3) return Object.values(valores).some(v => v > 0);
    if (step === 4) return nfData.fornecedor.length > 0;
    return false;
  };

  const toggleJogo = (id) => {
    setJogosSel(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= qtdJogos) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const toggleServico = (jogoId, subKey) => {
    setServicosSel(prev => {
      const arr = prev[jogoId] || [];
      return {...prev, [jogoId]: arr.includes(subKey) ? arr.filter(k => k !== subKey) : [...arr, subKey]};
    });
  };

  const setValor = (key, val) => setValores(prev => ({...prev, [key]: parseFloat(val) || 0}));
  const totalGeral = Object.values(valores).reduce((s, v) => s + (v || 0), 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    const submissions = [];
    for (const jogoId of jogosSel) {
      const jogo = divulgados.find(j => j.id === jogoId);
      if (!jogo) continue;
      const subs = servicosSel[jogoId] || [];
      if (subs.length === 0) continue;
      const servicosValores = {};
      let valorNF = 0;
      subs.forEach(sk => { const v = valores[`${jogoId}_${sk}`] || 0; servicosValores[sk] = v; valorNF += v; });
      const allServicos = extrairServicos(jogo);
      const submissionId = Date.now() + jogoId;
      let hasFile = false;
      if (arquivo) {
        try { const dataUrl = await fileToDataUrl(arquivo); await saveNFFile(submissionId, dataUrl); hasFile = true; } catch(_){}
      }
      submissions.push({
        id: submissionId,
        ...nfData,
        valorNF,
        rodada: jogo.rodada,
        jogoId: jogo.id,
        jogoLabel: `${jogo.mandante} x ${jogo.visitante}`,
        mandante: jogo.mandante,
        visitante: jogo.visitante,
        servicosKeys: subs.map(sk => `${jogo.id}_${sk}`),
        servicosLabels: allServicos.filter(s => subs.includes(s.subKey)).map(s => s.subLabel),
        servicosValores,
        status: "pendente",
        hasFile,
        enviadoEm: new Date().toISOString(),
      });
    }
    // Salvar nas submissões pendentes
    const current = (await getState('nf_submissions')) || [];
    await setState('nf_submissions', [...current, ...submissions]);
    setSubmitting(false);
    setDone(true);
  };

  const reset = () => {
    setStep(0); setRodadaSel(null); setQtdJogos(1); setJogosSel([]);
    setServicosSel({}); setValores({}); setNfData({ fornecedor:"", numeroNF:"", dataEmissao:"", dataEnvio:"", obs:"" });
    setArquivo(null); setDone(false);
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:T.textMd,fontSize:16}}>Carregando...</p>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Inter',sans-serif"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#166534,#15803d,#166534)",padding:"24px 20px"}}>
        <p style={{color:"#86efac",fontSize:11,letterSpacing:2,textTransform:"uppercase",margin:"0 0 4px"}}>FFU — Transmissões</p>
        <h1 style={{fontSize:20,fontWeight:700,margin:0,color:"#fff"}}>Envio de Nota Fiscal</h1>
        <p style={{color:"#bbf7d0",fontSize:12,margin:"4px 0 0"}}>Brasileirão Série A 2026</p>
      </div>

      <div style={{padding:"24px 16px",maxWidth:640,margin:"0 auto"}}>

        {done ? (
          <div style={{background:T.card,borderRadius:16,padding:40,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>✅</div>
            <h3 style={{color:T.text,margin:"0 0 8px",fontSize:18}}>Nota fiscal enviada com sucesso!</h3>
            <p style={{color:T.textMd,fontSize:13,margin:"0 0 8px"}}>Sua NF será analisada pela equipe.</p>
            <p style={{color:T.textSm,fontSize:12,margin:"0 0 24px"}}>Obrigado!</p>
            <button onClick={reset} style={{...btnS,background:"#8b5cf6",padding:"10px 28px",fontSize:14}}>Enviar outra NF</button>
          </div>
        ) : (<>

          {/* Progress */}
          <div style={{display:"flex",gap:4,marginBottom:24}}>
            {STEPS.map((s, i) => (
              <div key={s} style={{flex:1,textAlign:"center"}}>
                <div style={{height:4,borderRadius:2,background:i<=step?"#22c55e":T.border,marginBottom:6}}/>
                <span style={{fontSize:11,color:i<=step?"#22c55e":T.textSm,fontWeight:i===step?700:400}}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{background:T.card,borderRadius:16,padding:28,minHeight:300}}>

            {/* STEP 0: Rodada */}
            {step === 0 && (
              <div>
                <h3 style={{color:T.text,margin:"0 0 4px",fontSize:16}}>Selecione a Rodada</h3>
                <p style={{color:T.textSm,fontSize:12,margin:"0 0 20px"}}>Qual rodada essa nota fiscal se refere?</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {rodadas.map(r => (
                    <button key={r} onClick={() => setRodadaSel(r)} style={{padding:"12px 20px",borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,
                      background:rodadaSel===r?"#22c55e":T.bg,color:rodadaSel===r?"#fff":T.textMd,
                      boxShadow:rodadaSel===r?"0 4px 12px rgba(34,197,94,0.3)":"none"}}>
                      Rodada {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1: Jogos */}
            {step === 1 && (
              <div>
                <h3 style={{color:T.text,margin:"0 0 4px",fontSize:16}}>Selecione os Jogos</h3>
                <p style={{color:T.textSm,fontSize:12,margin:"0 0 16px"}}>Quantos jogos essa NF cobre na rodada {rodadaSel}?</p>
                <div style={{display:"flex",gap:8,marginBottom:20}}>
                  {[1,2].map(n => (
                    <button key={n} onClick={() => { setQtdJogos(n); setJogosSel([]); }} style={{padding:"10px 24px",borderRadius:10,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,
                      background:qtdJogos===n?"#22c55e":T.bg,color:qtdJogos===n?"#fff":T.textMd}}>
                      {n} jogo{n>1?"s":""}
                    </button>
                  ))}
                </div>
                <p style={{color:T.textMd,fontSize:12,margin:"0 0 12px",fontWeight:600}}>Selecione {qtdJogos} jogo{qtdJogos>1?"s":""}:</p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {jogosRodada.map(j => {
                    const sel = jogosSel.includes(j.id);
                    return (
                      <button key={j.id} onClick={() => toggleJogo(j.id)}
                        style={{padding:"14px 20px",borderRadius:12,border:`2px solid ${sel?"#22c55e":T.border}`,cursor:"pointer",
                          background:sel?"#22c55e22":T.bg,textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <span style={{fontWeight:700,fontSize:14,color:T.text}}>{j.mandante} x {j.visitante}</span>
                          <span style={{color:T.textSm,fontSize:12,marginLeft:12}}>{j.data} · {j.cidade}</span>
                        </div>
                        <Pill label={j.categoria} color={j.categoria==="B1"?"#22c55e":"#f59e0b"}/>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Serviços */}
            {step === 2 && (
              <div>
                <h3 style={{color:T.text,margin:"0 0 4px",fontSize:16}}>Serviços Prestados</h3>
                <p style={{color:T.textSm,fontSize:12,margin:"0 0 20px"}}>Selecione os serviços que você prestou</p>
                {jogosSel.map(jogoId => {
                  const jogo = divulgados.find(j => j.id === jogoId);
                  if (!jogo) return null;
                  const servicos = extrairServicos(jogo);
                  const selected = servicosSel[jogoId] || [];
                  const byCat = {};
                  servicos.forEach(s => { if (!byCat[s.catLabel]) byCat[s.catLabel] = { color: s.catColor, items: [] }; byCat[s.catLabel].items.push(s); });
                  return (
                    <div key={jogoId} style={{marginBottom:20}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                        <Pill label={jogo.categoria} color={jogo.categoria==="B1"?"#22c55e":"#f59e0b"}/>
                        <span style={{fontWeight:700,fontSize:14,color:T.text}}>{jogo.mandante} x {jogo.visitante}</span>
                      </div>
                      {Object.entries(byCat).map(([catName, { color, items }]) => (
                        <div key={catName} style={{marginBottom:12}}>
                          <p style={{color,fontSize:12,fontWeight:700,margin:"0 0 6px"}}>{catName}</p>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {items.map(s => {
                              const sel = selected.includes(s.subKey);
                              return (
                                <button key={s.subKey} onClick={() => toggleServico(jogoId, s.subKey)}
                                  style={{padding:"8px 14px",borderRadius:8,border:`2px solid ${sel?color:T.border}`,cursor:"pointer",fontSize:12,fontWeight:sel?700:400,
                                    background:sel?color+"22":"transparent",color:sel?color:T.textMd}}>
                                  {s.subLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* STEP 3: Valores */}
            {step === 3 && (
              <div>
                <h3 style={{color:T.text,margin:"0 0 4px",fontSize:16}}>Valores por Serviço</h3>
                <p style={{color:T.textSm,fontSize:12,margin:"0 0 20px"}}>Informe o valor de cada serviço na nota</p>
                {jogosSel.map(jogoId => {
                  const jogo = divulgados.find(j => j.id === jogoId);
                  if (!jogo) return null;
                  const subs = servicosSel[jogoId] || [];
                  const allServicos = extrairServicos(jogo);
                  return (
                    <div key={jogoId} style={{marginBottom:20}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                        <Pill label={jogo.categoria} color={jogo.categoria==="B1"?"#22c55e":"#f59e0b"}/>
                        <span style={{fontWeight:700,fontSize:14,color:T.text}}>{jogo.mandante} x {jogo.visitante}</span>
                      </div>
                      {subs.map(sk => {
                        const s = allServicos.find(x => x.subKey === sk);
                        if (!s) return null;
                        const key = `${jogoId}_${sk}`;
                        return (
                          <div key={sk} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:T.bg,borderRadius:8,marginBottom:6}}>
                            <span style={{flex:1,fontSize:13,color:T.text,fontWeight:600}}>{s.subLabel}</span>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <span style={{fontSize:12,color:T.textMd}}>R$</span>
                              <input type="number" value={valores[key] || ""} onChange={e => setValor(key, e.target.value)}
                                style={{...IS,width:120,textAlign:"right",padding:"8px 12px",fontWeight:600,color:"#22c55e",fontSize:14}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div style={{borderTop:`2px solid ${T.border}`,marginTop:12,paddingTop:12,display:"flex",justifyContent:"flex-end"}}>
                  <span style={{fontSize:16,fontWeight:700,color:"#22c55e"}}>Total: {fmt(totalGeral)}</span>
                </div>
              </div>
            )}

            {/* STEP 4: Dados NF */}
            {step === 4 && (
              <div>
                <h3 style={{color:T.text,margin:"0 0 4px",fontSize:16}}>Dados da Nota Fiscal</h3>
                <p style={{color:T.textSm,fontSize:12,margin:"0 0 20px"}}>Preencha as informações da sua NF</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  <div style={{marginBottom:14}}>
                    <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Fornecedor / Razão Social</label>
                    <input value={nfData.fornecedor} onChange={e => setNfData(d => ({...d, fornecedor: e.target.value}))} style={IS}/>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Nº da Nota</label>
                    <input value={nfData.numeroNF} onChange={e => setNfData(d => ({...d, numeroNF: e.target.value}))} style={IS}/>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data de Emissão</label>
                    <input value={nfData.dataEmissao} onChange={e => setNfData(d => ({...d, dataEmissao: e.target.value}))} placeholder="dd/mm/aaaa" style={IS}/>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data de Envio</label>
                    <input value={nfData.dataEnvio} onChange={e => setNfData(d => ({...d, dataEnvio: e.target.value}))} placeholder="dd/mm/aaaa" style={IS}/>
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Observações</label>
                  <input value={nfData.obs} onChange={e => setNfData(d => ({...d, obs: e.target.value}))} style={IS}/>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Arquivo da NF (PDF ou imagem)</label>
                  <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => setArquivo(e.target.files[0] || null)} style={{display:"none"}}/>
                  <div onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {e.preventDefault(); setArquivo(e.dataTransfer.files[0] || null);}}
                    style={{border:`2px dashed ${arquivo?"#22c55e":T.muted}`,borderRadius:8,padding:"16px",cursor:"pointer",textAlign:"center",background:arquivo?"#22c55e11":T.bg}}>
                    {arquivo
                      ? <p style={{margin:0,color:"#22c55e",fontSize:13,fontWeight:600}}>{arquivo.name} ({(arquivo.size/1024).toFixed(0)} KB)</p>
                      : <p style={{margin:0,color:T.textSm,fontSize:12}}>Clique ou arraste o arquivo aqui</p>}
                  </div>
                </div>
                {/* Resumo */}
                <div style={{background:T.bg,borderRadius:10,padding:"14px 18px",marginTop:8}}>
                  <p style={{color:T.textMd,fontSize:11,fontWeight:600,margin:"0 0 8px"}}>Resumo do envio</p>
                  {jogosSel.map(jogoId => {
                    const jogo = divulgados.find(j => j.id === jogoId);
                    if (!jogo) return null;
                    const subs = servicosSel[jogoId] || [];
                    const allServicos = extrairServicos(jogo);
                    const total = subs.reduce((s, sk) => s + (valores[`${jogoId}_${sk}`] || 0), 0);
                    return (
                      <div key={jogoId} style={{marginBottom:6}}>
                        <span style={{fontSize:12,color:T.text,fontWeight:600}}>{jogo.mandante} x {jogo.visitante}</span>
                        <span style={{fontSize:11,color:T.textSm,marginLeft:8}}>{subs.map(sk => allServicos.find(x => x.subKey === sk)?.subLabel).filter(Boolean).join(", ")}</span>
                        <span style={{fontSize:12,color:"#22c55e",fontWeight:700,marginLeft:8}}>{fmt(total)}</span>
                      </div>
                    );
                  })}
                  <div style={{borderTop:`1px solid ${T.border}`,marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,fontWeight:700,color:T.text}}>Total</span>
                    <span style={{fontSize:15,fontWeight:700,color:"#22c55e"}}>{fmt(totalGeral)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:16}}>
            <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0}
              style={{...btnS,background:step===0?T.border:"#475569",padding:"10px 24px",opacity:step===0?0.4:1}}>
              Voltar
            </button>
            {step < 4 ? (
              <button onClick={() => setStep(s => s+1)} disabled={!canNext()}
                style={{...btnS,background:canNext()?"#22c55e":"#475569",padding:"10px 24px",opacity:canNext()?1:0.4}}>
                Próximo
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canNext()||submitting}
                style={{...btnS,background:canNext()&&!submitting?"#22c55e":"#475569",padding:"10px 28px",fontSize:14,opacity:canNext()&&!submitting?1:0.5}}>
                {submitting ? "Enviando..." : "Enviar Nota Fiscal"}
              </button>
            )}
          </div>
        </>)}
      </div>

      <div style={{textAlign:"center",padding:"24px",color:T.textSm,fontSize:11}}>
        FFU — Transmissões · Brasileirão 2026
      </div>
    </div>
  );
}
