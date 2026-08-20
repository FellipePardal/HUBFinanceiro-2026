import { useState, useMemo } from "react";
import { CATS, FONT } from "../../constants";
import { fmtR } from "../../utils";
import { Pill } from "../shared";
import { Card, PanelTitle, tableStyles } from "../ui";
import { ChevronDown, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { buildFechamentoPorRodada } from "../../lib/fechamentoRodada";

const SUBKEY_LABEL = {};
CATS.forEach(cat => cat.subs.forEach(sub => { SUBKEY_LABEL[sub.key] = sub.label; }));

const ORIGEM_COLOR = { "Seg. Espacial": "#D97706", "Infra Livemode": "#a855f7", "liveU": "#0ea5e9" };

// Fechamento por Rodada: decompõe o realizado de cada rodada em NFs diretas
// (conciliáveis 1:1 no extrato) e fatias de rateio (Seg. Espacial mensal, Infra
// Livemode, liveU), com a memória de cálculo de cada fatia. Os totais saem do
// mesmo motor do dashboard — batem por construção.
export default function TabFechamentoRodada({ jogos, notas, notasMensais, notasLivemode = [], notasLiveU = [], T, dedupeNotasPorNF = true }) {
  const TS = tableStyles(T);
  const [aberta, setAberta] = useState(null);

  const { rodadas, totais } = useMemo(
    () => buildFechamentoPorRodada({ jogos, notas, notasMensais, notasLivemode, notasLiveU, dedupeNotasPorNF }),
    [jogos, notas, notasMensais, notasLivemode, notasLiveU, dedupeNotasPorNF]
  );

  const green = T.success || "#16A34A";
  const amber = "#D97706";

  const Kpi = ({ label, valor, cor, sub }) => (
    <div style={{ flex: "1 1 160px", minWidth: 160 }}>
      <div style={{ fontSize: 11, color: T.textSm, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: cor || T.text, fontFamily: FONT.num }}>{fmtR(valor)}</div>
      {sub && <div style={{ fontSize: 10, color: T.textSm, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <PanelTitle T={T} title="Fechamento por Rodada"
        subtitle="Realizado decomposto em NFs diretas (conciliáveis no extrato) e fatias de rateio — mesma soma do dashboard, NF a NF"/>

      <Card T={T} padding={0} style={{ margin: "16px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: "16px 20px" }}>
          <Kpi label="NFs diretas (concilia no extrato)" valor={totais.direto} cor={green}/>
          <Kpi label="Rateios alocados (Seg. Espacial + Infra + liveU)" valor={totais.rateado} cor={amber}/>
          {Math.abs(totais.manual) >= 0.01 && <Kpi label="Manual / sem NF" valor={totais.manual} cor="#64748b"/>}
          <Kpi label="Total das rodadas" valor={totais.total} sub="= soma dos realizados dos jogos no dashboard"/>
        </div>
      </Card>

      <Card T={T} padding={0}>
        <div style={{ display: "flex", padding: "10px 20px", borderBottom: `1px solid ${T.border}`, gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.textSm, flex: 1 }}>{rodadas.length} rodada(s) com jogos divulgados</span>
          <span style={{ fontSize: 11, color: T.textSm, width: 110, textAlign: "right" }}>Diretas</span>
          <span style={{ fontSize: 11, color: T.textSm, width: 110, textAlign: "right" }}>Rateios</span>
          <span style={{ fontSize: 11, color: T.textSm, width: 120, textAlign: "right" }}>Total</span>
          <span style={{ width: 110 }}/>
        </div>

        {rodadas.map(r => {
          const open = aberta === r.rodada;
          return (
            <div key={r.rodada} style={{ borderBottom: `1px solid ${T.border}` }}>
              <div onClick={() => setAberta(open ? null : r.rodada)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  {open ? <ChevronDown size={14} color={T.textSm}/> : <ChevronRight size={14} color={T.textSm}/>}
                  <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>Rodada {r.rodada}</span>
                  <span style={{ color: T.textSm, fontSize: 12 }}>({r.jogos.length} jogo{r.jogos.length > 1 ? "s" : ""})</span>
                </div>
                <span style={{ width: 110, textAlign: "right", fontFamily: FONT.num, fontSize: 12.5, color: green, fontWeight: 600 }}>{fmtR(r.direto)}</span>
                <span style={{ width: 110, textAlign: "right", fontFamily: FONT.num, fontSize: 12.5, color: amber, fontWeight: 600 }}>{fmtR(r.rateado + r.manual)}</span>
                <span style={{ width: 120, textAlign: "right", fontFamily: FONT.num, fontSize: 13, color: T.text, fontWeight: 700 }}>{fmtR(r.total)}</span>
                <span style={{ width: 110, display: "flex", justifyContent: "flex-end" }}>
                  {r.fechada
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: green }}><CheckCircle2 size={13}/> Fechada</span>
                    : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: amber }}><Clock size={13}/> {r.pendencias.length} pendência{r.pendencias.length > 1 ? "s" : ""}</span>}
                </span>
              </div>

              {open && (
                <div style={{ padding: "0 20px 18px" }}>
                  {/* por jogo */}
                  <div style={TS.wrap}>
                    <table style={{ ...TS.table, minWidth: 640 }}>
                      <thead><tr>
                        <th style={{ ...TS.th, ...TS.thLeft }}>Jogo</th>
                        <th style={{ ...TS.th, ...TS.thLeft }}>Data</th>
                        <th style={{ ...TS.th, ...TS.thRight }}>NFs diretas</th>
                        <th style={{ ...TS.th, ...TS.thRight }}>Rateios</th>
                        {Math.abs(r.manual) >= 0.01 && <th style={{ ...TS.th, ...TS.thRight }}>Manual</th>}
                        <th style={{ ...TS.th, ...TS.thRight }}>Total</th>
                      </tr></thead>
                      <tbody>
                        {r.jogos.map(j => (
                          <tr key={j.id} style={TS.tr}>
                            <td style={TS.td}>{j.label}</td>
                            <td style={TS.td}>{j.data || "—"}</td>
                            <td style={{ ...TS.tdNum, color: green }}>{fmtR(j.direto)}</td>
                            <td style={{ ...TS.tdNum, color: amber }}>{fmtR(j.rateado)}</td>
                            {Math.abs(r.manual) >= 0.01 && <td style={{ ...TS.tdNum, color: "#64748b" }}>{fmtR(j.manual)}</td>}
                            <td style={{ ...TS.tdNum, fontWeight: 700 }}>{fmtR(j.total)}</td>
                          </tr>
                        ))}
                        <tr style={{ ...TS.tr, background: T.surfaceAlt || T.bg }}>
                          <td style={{ ...TS.td, fontWeight: 700 }} colSpan={2}>Rodada {r.rodada} — Total</td>
                          <td style={{ ...TS.tdNum, color: green, fontWeight: 700 }}>{fmtR(r.direto)}</td>
                          <td style={{ ...TS.tdNum, color: amber, fontWeight: 700 }}>{fmtR(r.rateado)}</td>
                          {Math.abs(r.manual) >= 0.01 && <td style={{ ...TS.tdNum, color: "#64748b", fontWeight: 700 }}>{fmtR(r.manual)}</td>}
                          <td style={{ ...TS.tdNum, fontWeight: 700 }}>{fmtR(r.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* NFs diretas */}
                  <h5 style={{ margin: "18px 0 8px", fontSize: 12, color: T.text, fontFamily: FONT.ui }}>
                    NFs diretas da rodada <span style={{ color: T.textSm, fontWeight: 400 }}>— é o que aparece no extrato como Rodada {r.rodada}</span>
                  </h5>
                  <div style={TS.wrap}>
                    <table style={{ ...TS.table, minWidth: 640 }}>
                      <thead><tr>
                        <th style={{ ...TS.th, ...TS.thLeft }}>Fornecedor</th>
                        <th style={{ ...TS.th, ...TS.thLeft }}>NF</th>
                        <th style={{ ...TS.th, ...TS.thLeft }}>Serviços</th>
                        <th style={{ ...TS.th, ...TS.thRight }}>Valor na rodada</th>
                      </tr></thead>
                      <tbody>
                        {r.diretas.length === 0 && (
                          <tr><td colSpan={4} style={{ ...TS.td, textAlign: "center", color: T.textSm }}>Nenhuma NF direta recebida</td></tr>
                        )}
                        {r.diretas.map(l => (
                          <tr key={l.id} style={TS.tr}>
                            <td style={TS.td}>{l.fornecedor}</td>
                            <td style={TS.td}>{l.numeroNF || l.codigo || "—"}</td>
                            <td style={TS.td}>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {l.subs.map(sk => <Pill key={sk} label={SUBKEY_LABEL[sk] || sk} color="#06b6d4"/>)}
                              </div>
                            </td>
                            <td style={{ ...TS.tdNum, color: green, fontWeight: 600 }}>
                              {fmtR(l.valor)}
                              {l.scale !== 1 && <div style={{ fontSize: 10, color: T.textSm, fontWeight: 400 }}>NF compartilhada — valor cheio {fmtR(l.valorNF)}</div>}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ ...TS.tr, background: T.surfaceAlt || T.bg }}>
                          <td style={{ ...TS.td, fontWeight: 700 }} colSpan={3}>Subtotal diretas ({r.diretas.length} NF{r.diretas.length !== 1 ? "s" : ""})</td>
                          <td style={{ ...TS.tdNum, color: green, fontWeight: 700 }}>{fmtR(r.direto)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* rateios com memória de cálculo */}
                  <h5 style={{ margin: "18px 0 8px", fontSize: 12, color: T.text, fontFamily: FONT.ui }}>
                    Rateios recebidos <span style={{ color: T.textSm, fontWeight: 400 }}>— fatias de NFs mensais/em bloco que pertencem a esta rodada</span>
                  </h5>
                  <div style={TS.wrap}>
                    <table style={{ ...TS.table, minWidth: 640 }}>
                      <thead><tr>
                        <th style={{ ...TS.th, ...TS.thLeft }}>Origem</th>
                        <th style={{ ...TS.th, ...TS.thLeft }}>Fornecedor / NF</th>
                        <th style={{ ...TS.th, ...TS.thLeft }}>Memória de cálculo</th>
                        <th style={{ ...TS.th, ...TS.thRight }}>Fatia na rodada</th>
                      </tr></thead>
                      <tbody>
                        {r.rateios.length === 0 && (
                          <tr><td colSpan={4} style={{ ...TS.td, textAlign: "center", color: T.textSm }}>Nenhuma fatia de rateio recebida ainda</td></tr>
                        )}
                        {r.rateios.map(l => (
                          <tr key={l.id} style={TS.tr}>
                            <td style={TS.td}><Pill label={l.origem} color={ORIGEM_COLOR[l.origem] || "#64748b"}/></td>
                            <td style={TS.td}>{l.fornecedor}{l.numeroNF ? ` · NF ${l.numeroNF}` : ""}{l.referencia ? ` · ${l.referencia}` : ""}</td>
                            <td style={{ ...TS.td, fontSize: 12, color: T.textMd || T.textSm }}>
                              {fmtR(l.valorNF)} ÷ {l.cobreLabel} = {fmtR(l.fatiaPorJogo)}/jogo × {l.jogosIds.length} jogo{l.jogosIds.length > 1 ? "s" : ""} desta rodada
                            </td>
                            <td style={{ ...TS.tdNum, color: amber, fontWeight: 600 }}>{fmtR(l.valor)}</td>
                          </tr>
                        ))}
                        {r.rateios.length > 0 && (
                          <tr style={{ ...TS.tr, background: T.surfaceAlt || T.bg }}>
                            <td style={{ ...TS.td, fontWeight: 700 }} colSpan={3}>Subtotal rateios</td>
                            <td style={{ ...TS.tdNum, color: amber, fontWeight: 700 }}>{fmtR(r.rateado)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* pendências */}
                  {r.pendencias.length > 0 && (
                    <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, border: `1px solid ${amber}40`, background: `${amber}0d` }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: amber, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={13}/> Rateios ainda não recebidos — o total desta rodada ainda vai crescer
                      </div>
                      {r.pendencias.map((p, i) => (
                        <div key={i} style={{ fontSize: 12, color: T.textMd || T.text, padding: "2px 0" }}>
                          <strong style={{ color: ORIGEM_COLOR[p.tipo] || T.text }}>{p.tipo}:</strong> {p.detalhe}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
