import { useState, useMemo } from "react";
import Home from "./components/Home";
import TabJogos from "./components/tabs/TabJogos";
import TabServicos from "./components/tabs/TabServicos";
import TabSavings from "./components/tabs/TabSavings";
import TabGraficos from "./components/tabs/TabGraficos";
import TabRelatorio from "./components/tabs/TabRelatorio";
import TabApresentacoes from "./components/tabs/TabApresentacoes";
import VisaoMicro from "./components/tabs/VisaoMicro";
import { NovoJogoModal, NovoRapidoModal } from "./components/modals/NovoJogoModal";
import { JOGOS_REAIS, JOGOS_PLACEHOLDER, SERVICOS_INIT, allSubKeys, getDefaults } from "./data";
import { CENARIO_INFO } from "./constants";
import { subTotal } from "./utils";

// ─── TEMA ─────────────────────────────────────────────────────────────────────
const DARK  = { bg:"#0f172a", card:"#1e293b", border:"#334155", text:"#f1f5f9", textMd:"#94a3b8", textSm:"#64748b" };
const LIGHT = { bg:"#f1f5f9", card:"#ffffff", border:"#e2e8f0", text:"#0f172a", textMd:"#475569", textSm:"#94a3b8" };

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const T = darkMode ? DARK : LIGHT;

  const [campeonato, setCampeonato] = useState(null);
  const [tab, setTab]               = useState("jogos");
  const [jogos, setJogos]           = useState([...JOGOS_REAIS]);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [servicos, setServicos]     = useState(SERVICOS_INIT);
  const [filtroRod, setFiltroRod]   = useState("Todas");
  const [filtroCat, setFiltroCat]   = useState("Todas");
  const [microJogoId, setMicroJogoId] = useState(null);

  // modais
  const [novo, setNovo]             = useState(false);
  const [novoRapido, setNovoRapido] = useState(null); // "b1" | "b2s" | "b2sul"

  // ─── listas derivadas ───────────────────────────────────────────────────────
  const todosJogos = useMemo(() =>
    showPlaceholder ? [...jogos, ...JOGOS_PLACEHOLDER] : jogos,
  [jogos, showPlaceholder]);

  const rodadasList = useMemo(() => {
    const rds = [...new Set(todosJogos.map(j => j.rodada))].sort((a,b)=>a-b);
    return ["Todas", "B1+B2", ...rds];
  }, [todosJogos]);

  const filtrados = useMemo(() => {
    let r = todosJogos;
    if (filtroRod === "B1+B2") return r;
    if (filtroRod !== "Todas") r = r.filter(j => j.rodada === filtroRod);
    if (filtroCat !== "Todas") r = r.filter(j => j.categoria === filtroCat);
    return r;
  }, [todosJogos, filtroRod, filtroCat]);

  const divulgados = useMemo(() => jogos.filter(j => j.mandante !== "A definir"), [jogos]);

  const savingRodada = useMemo(() =>
    [...new Set(divulgados.map(j=>j.rodada))].sort((a,b)=>a-b).map(rd => {
      const js = divulgados.filter(j=>j.rodada===rd);
      const o = js.reduce((s,j)=>s+subTotal(j.orcado),0);
      const p = js.reduce((s,j)=>s+subTotal(j.provisionado),0);
      return { rodada:`Rd ${rd}`, orcado:o, provisionado:p, saving:o-p };
    }),
  [divulgados]);

  const jogosFiltered = filtrados.filter(j => j.mandante !== "A definir");
  const totOrcJogos   = jogosFiltered.reduce((s,j)=>s+subTotal(j.orcado),0);
  const totProvJogos  = jogosFiltered.reduce((s,j)=>s+subTotal(j.provisionado),0);

  // ─── handlers ──────────────────────────────────────────────────────────────
  const handleSaveJogo = (novoJogo) => {
    setJogos(prev => [...prev, novoJogo]);
    setNovo(false);
  };

  const handleSaveRapido = (novoJogo) => {
    setJogos(prev => [...prev, novoJogo]);
    setNovoRapido(null);
  };

  const handleSaveMicro = (jogoAtualizado) => {
    setJogos(prev => prev.map(j => j.id === jogoAtualizado.id ? jogoAtualizado : j));
  };

  // ─── tela inicial ──────────────────────────────────────────────────────────
  if (!campeonato) {
    return <Home onEnter={setCampeonato} T={T} darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  // ─── ABAS ──────────────────────────────────────────────────────────────────
  const TABS = ["dashboard","serviços","jogos","micro","savings","gráficos","relatório","apresentações"];

  const renderTab = () => {
    if (tab === "micro")         return <VisaoMicro jogos={jogos} jogoId={microJogoId} onChangeJogo={setMicroJogoId} onSave={handleSaveMicro} T={T}/>;
    if (tab === "jogos")         return <TabJogos jogos={jogos} filtrados={filtrados} filtroRod={filtroRod} setFiltroRod={setFiltroRod} filtroCat={filtroCat} setFiltroCat={setFiltroCat} showPlaceholder={showPlaceholder} setShowPlaceholder={setShowPlaceholder} rodadasList={rodadasList} setMicroJogoId={setMicroJogoId} setTab={setTab} setNovo={setNovo} setNovoRapido={setNovoRapido} T={T}/>;
    if (tab === "serviços")      return <TabServicos servicos={servicos} setServicos={setServicos} T={T}/>;
    if (tab === "savings")       return <TabSavings jogosFiltered={jogosFiltered} totOrcJogos={totOrcJogos} totProvJogos={totProvJogos} T={T}/>;
    if (tab === "gráficos")      return <TabGraficos divulgados={divulgados} savingRodada={savingRodada} T={T}/>;
    if (tab === "relatório")     return <TabRelatorio jogos={jogos} servicos={servicos} T={T}/>;
    if (tab === "apresentações") return <TabApresentacoes T={T}/>;
    return <div style={{color:T.textMd,padding:40}}>Em breve: {tab}</div>;
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg}}>
      {/* Header */}
      <div style={{background:"#0f172a",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setCampeonato(null)} style={{background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontSize:18}}>←</button>
          <span style={{color:"#22c55e",fontWeight:800,fontSize:15}}>Brasileirão 2026</span>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:tab===t?"#22c55e":T.card,color:tab===t?"#000":T.textMd,textTransform:"capitalize"}}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={()=>setDarkMode(d=>!d)} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,padding:"5px 14px",cursor:"pointer",fontSize:12,color:"#94a3b8"}}>
          {darkMode?"☀️ Claro":"🌙 Escuro"}
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{padding:"24px",maxWidth:1400,margin:"0 auto"}}>
        {renderTab()}
      </div>

      {/* Modais */}
      {novo && <NovoJogoModal onSave={handleSaveJogo} onClose={()=>setNovo(false)} T={T}/>}
      {novoRapido && <NovoRapidoModal cenario={novoRapido} jogos={jogos} onSave={handleSaveRapido} onClose={()=>setNovoRapido(null)} T={T}/>}
    </div>
  );
}