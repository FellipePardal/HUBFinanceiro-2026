import { useState } from "react";
import { RADIUS } from "../../constants";
import {
  Users, CalendarDays, FileSpreadsheet, LineChart, Library, Table2,
} from "lucide-react";

import Cadastro      from "./fornecedores/Cadastro";
import Catalogos     from "./fornecedores/Catalogos";
import Tabelas       from "./fornecedores/Tabelas";
import ProximosJogos from "./fornecedores/ProximosJogos";
import Cotacoes      from "./fornecedores/Cotacoes";
import Dashboard     from "./fornecedores/Dashboard";

// Navegação das sub-abas da aba Fornecedores
const SUBTABS = [
  { key:"cadastro",  label:"Cadastro",      icon:Users },
  { key:"catalogos", label:"Catálogos",     icon:Library },
  { key:"tabelas",   label:"Tabelas",       icon:Table2 },
  { key:"jogos",     label:"Próximos Jogos",icon:CalendarDays },
  { key:"cotacoes",  label:"Cotações",      icon:FileSpreadsheet },
  { key:"dashboard", label:"Dashboard",     icon:LineChart },
];

function SubTabNav({ active, onChange, T }) {
  return (
    <div style={{
      display:"flex",
      gap:4,
      marginBottom:20,
      padding:4,
      background:T.surfaceAlt||T.bg,
      border:`1px solid ${T.border}`,
      borderRadius:RADIUS.md,
      flexWrap:"wrap",
    }}>
      {SUBTABS.map(({key, label, icon:Icon}) => {
        const on = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              display:"inline-flex",
              alignItems:"center",
              gap:8,
              padding:"9px 16px",
              borderRadius:RADIUS.sm,
              border:"none",
              cursor:"pointer",
              fontSize:12,
              fontWeight:600,
              letterSpacing:"-0.005em",
              background: on ? (T.brand||"#10b981") : "transparent",
              color: on ? "#fff" : T.textMd,
              boxShadow: on ? `0 2px 8px ${(T.brand||"#10b981")}55` : "none",
              transition:"all .15s",
              whiteSpace:"nowrap",
            }}>
            <Icon size={14} strokeWidth={2.25}/>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function TabFornecedores({
  fornecedores, setFornecedores,
  cotacoes, setCotacoes,
  jogos,
  jogosForn = [], setJogosForn = () => {},
  cidades = [], setCidades = () => {},
  campeonatos = [], setCampeonatos = () => {},
  tabelas = [], setTabelas = () => {},
  filtroCampeonato = "todos",
  T,
}) {
  const [sub, setSub] = useState("cadastro");

  return (
    <>
      <SubTabNav active={sub} onChange={setSub} T={T}/>

      {sub === "cadastro"  && <Cadastro      fornecedores={fornecedores} setFornecedores={setFornecedores} T={T}/>}
      {sub === "catalogos" && <Catalogos     cidades={cidades} setCidades={setCidades} campeonatos={campeonatos} setCampeonatos={setCampeonatos} T={T}/>}
      {sub === "tabelas"   && <Tabelas       fornecedores={fornecedores} cidades={cidades} campeonatos={campeonatos} tabelas={tabelas} setTabelas={setTabelas} filtroCampeonato={filtroCampeonato} T={T}/>}
      {sub === "jogos"     && <ProximosJogos jogosForn={jogosForn} setJogosForn={setJogosForn} cidades={cidades} campeonatos={campeonatos} cotacoes={cotacoes} filtroCampeonato={filtroCampeonato} T={T}/>}
      {sub === "cotacoes"  && <Cotacoes      fornecedores={fornecedores} cotacoes={cotacoes} setCotacoes={setCotacoes} jogosForn={jogosForn} cidades={cidades} campeonatos={campeonatos} tabelas={tabelas} filtroCampeonato={filtroCampeonato} T={T}/>}
      {sub === "dashboard" && <Dashboard     fornecedores={fornecedores} cotacoes={cotacoes} cidades={cidades} campeonatos={campeonatos} tabelas={tabelas} filtroCampeonato={filtroCampeonato} T={T}/>}
    </>
  );
}
