import { iSty, FONT } from "../../constants";
import { Card, SectionHeader, Badge, Button, Chip } from "../ui";
import { FASES_PRESETS } from "../../data/customCampeonato";
import { ORC_STATUS } from "../../data/orcamentos";
import { Settings, History, Send, Undo2, Trophy, Lock } from "lucide-react";

const COR_PRESETS = ["#ec4899","#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#22c55e"];

// Fora do componente para não remontar (e perder o foco) a cada re-render.
const Field = ({ T, label, children, flex=1 }) => (
  <div style={{ flex, minWidth:140 }}>
    <label style={{ color:T.textMd, fontSize:12, display:"block", marginBottom:4, fontWeight:600 }}>{label}</label>
    {children}
  </div>
);

// Configuração do orçamento: metadados + fases + controle de status + eventos.
// Nome/edição definem o id do campeonato que será criado na aprovação — por
// isso ficam travados aqui (o id do orçamento já foi gerado na criação).
export default function SubConfiguracao({ orc, setOrc, readOnly, T, eventos = [], onMudarStatus, onAbrirCampeonato }) {
  const IS = iSty(T);
  const m = orc.meta;
  const st = ORC_STATUS[m.status] || ORC_STATUS.rascunho;

  const setMeta = (patch) => setOrc(prev => ({ ...prev, meta: { ...prev.meta, ...patch } }));

  const toggleFase = (preset) => {
    if (readOnly) return;
    setOrc(prev => {
      const tem = (prev.meta.fases || []).some(f => f.key === preset.key);
      const fases = tem
        ? prev.meta.fases.filter(f => f.key !== preset.key)
        : [...prev.meta.fases, { key:preset.key, label:preset.label, short:preset.label, color:preset.color, ordem:0 }];
      const ordenadas = FASES_PRESETS
        .filter(p => fases.some(f => f.key === p.key))
        .map((p, i) => ({ key:p.key, label:p.label, short:p.label, color:p.color, ordem:i+1 }));
      return { ...prev, meta: { ...prev.meta, fases: ordenadas } };
    });
  };

  const evOrdenados = [...eventos].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));

  return (
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(280px,1fr)",gap:18,alignItems:"start"}}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {/* ── Dados básicos ── */}
        <Card T={T}>
          <SectionHeader T={T} icon={Settings} title="Dados do campeonato"
            subtitle={`ID do orçamento: ${orc.id}`}
            right={<Badge T={T} color={st.color}>{st.label}</Badge>}/>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              <Field T={T} label="Nome" flex={2}>
                <input value={m.nome} disabled style={{...IS, opacity:0.7}}/>
              </Field>
              <Field T={T} label="Edição">
                <input value={m.edicao} disabled style={{...IS, opacity:0.7}}/>
              </Field>
              <Field T={T} label="Ícone">
                <input value={m.icon} maxLength={3} disabled={readOnly} onChange={e=>setMeta({icon:e.target.value})} style={IS}/>
              </Field>
            </div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              <Field T={T} label="Descrição" flex={3}>
                <input value={m.descricao} disabled={readOnly} onChange={e=>setMeta({descricao:e.target.value})} style={IS} placeholder={`${m.nome} · ${m.edicao}`}/>
              </Field>
              <Field T={T} label="Cor do tema" flex={2}>
                <div style={{display:"flex",gap:6,alignItems:"center",height:32}}>
                  {COR_PRESETS.map(c => (
                    <button key={c} type="button" disabled={readOnly} onClick={()=>setMeta({cor:c})}
                      style={{
                        width:22, height:22, borderRadius:6, cursor:readOnly?"default":"pointer",
                        background:c,
                        border: m.cor===c ? `2px solid ${T.text}` : `1px solid ${T.border}`,
                        opacity: readOnly && m.cor!==c ? 0.4 : 1,
                      }}/>
                  ))}
                </div>
              </Field>
            </div>

            {m.formato === "pontos_corridos" ? (
              <Field T={T} label="Número de rodadas">
                <input value={m.numRodadas ?? ""} disabled={readOnly}
                  onChange={e=>setMeta({numRodadas: parseInt(e.target.value.replace(/[^0-9]/g,"")) || 0})}
                  style={{...IS, maxWidth:120}}/>
              </Field>
            ) : (
              <div>
                <label style={{ color:T.textMd, fontSize:12, display:"block", marginBottom:8, fontWeight:600 }}>
                  Fases do campeonato {!readOnly && <span style={{color:T.textSm,fontWeight:500}}>(clique para adicionar/remover)</span>}
                </label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {FASES_PRESETS.map(f => (
                    <Chip key={f.key} active={(m.fases||[]).some(x=>x.key===f.key)} onClick={()=>toggleFase(f)} T={T} color={f.color}>
                      {f.label}
                    </Chip>
                  ))}
                </div>
                <p style={{margin:"8px 0 0",fontSize:11,color:T.textSm}}>
                  Ordem: {(m.fases||[]).length===0 ? "—" : m.fases.map(f=>f.label).join(" → ")}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Status ── */}
        <Card T={T}>
          <SectionHeader T={T} icon={Send} title="Status do orçamento"
            subtitle="Rascunho → Em revisão → Aprovado (a aprovação acontece na aba Resumo)"/>
          <div style={{padding:20,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            {m.status === "rascunho" && (
              <>
                <Badge T={T} color={ORC_STATUS.rascunho.color}>Rascunho</Badge>
                <Button T={T} variant="primary" size="sm" icon={Send} onClick={()=>onMudarStatus("em_revisao")} disabled={readOnly}>
                  Enviar para revisão
                </Button>
              </>
            )}
            {m.status === "em_revisao" && (
              <>
                <Badge T={T} color={ORC_STATUS.em_revisao.color}>Em revisão</Badge>
                <Button T={T} variant="secondary" size="sm" icon={Undo2} onClick={()=>onMudarStatus("rascunho")} disabled={readOnly}>
                  Voltar para rascunho
                </Button>
                <p style={{margin:0,fontSize:11,color:T.textSm}}>A aprovação fica na aba <b>Resumo</b>.</p>
              </>
            )}
            {m.status === "aprovado" && (
              <>
                <Badge T={T} color={ORC_STATUS.aprovado.color}><Lock size={11}/> Aprovado</Badge>
                <p style={{margin:0,fontSize:12,color:T.textMd}}>
                  Aprovado em {m.aprovadoEm ? new Date(m.aprovadoEm).toLocaleString("pt-BR") : "—"}
                  {m.aprovadoPor ? ` por ${m.aprovadoPor}` : ""} — orçamento congelado.
                </p>
                {m.campeonatoCriadoId && (
                  <Button T={T} variant="primary" size="sm" icon={Trophy} onClick={()=>onAbrirCampeonato(m.campeonatoCriadoId)}>
                    Abrir campeonato
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Timeline de eventos ── */}
      <Card T={T}>
        <SectionHeader T={T} icon={History} title="Eventos" subtitle="Histórico do orçamento"/>
        <div style={{padding:"12px 20px 20px",maxHeight:480,overflowY:"auto"}}>
          {evOrdenados.length === 0 && <p style={{fontSize:12,color:T.textSm,margin:"8px 0 0"}}>Nenhum evento registrado.</p>}
          {evOrdenados.map(ev => (
            <div key={ev.id} style={{
              padding:"10px 0",
              borderBottom:`1px solid ${T.border}`,
              display:"flex",
              gap:10,
              alignItems:"flex-start",
            }}>
              <div style={{
                width:8, height:8, borderRadius:"50%", marginTop:5, flexShrink:0,
                background: ev.tipo === "aprovado" ? "#22c55e" : ev.tipo === "status" ? "#3b82f6" : (T.textSm||"#9CA3AF"),
              }}/>
              <div style={{minWidth:0}}>
                <p style={{margin:0,fontSize:12,color:T.text,fontWeight:600}}>
                  {ev.tipo === "criado" ? "Criado" : ev.tipo === "aprovado" ? "Aprovado" : "Mudança de status"}
                </p>
                {ev.detalhe && <p style={{margin:"2px 0 0",fontSize:11,color:T.textMd}}>{ev.detalhe}</p>}
                <p className="num" style={{margin:"2px 0 0",fontSize:10,color:T.textSm,fontFamily:FONT.num}}>
                  {ev.at ? new Date(ev.at).toLocaleString("pt-BR") : ""}{ev.user ? ` · ${ev.user}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
