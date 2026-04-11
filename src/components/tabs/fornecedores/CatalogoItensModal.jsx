import { useState } from "react";
import { iSty, RADIUS } from "../../../constants";
import { Button, Badge } from "../../ui";
import { UNIDADES_MEDIDA, unidadeLabel } from "../../../data/catalogos";
import { Plus, Trash2, Package } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// Catálogo de itens de UM fornecedor — modal acoplado ao Cadastro
// ----------------------------------------------------------------------------
// Cada item é um serviço/equipamento que o fornecedor oferece (ex: UM, SNG,
// Grua, Coordenador). Vira linha na matriz de tabela de preços, então cada
// item precisa de unidade de medida (por jogo, diária, etc).
// ════════════════════════════════════════════════════════════════════════════

const novoItem = () => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
  nome: "",
  descricao: "",
  unidade: "jogo",
  ativo: true,
});

export default function CatalogoItensModal({ fornecedor, onSave, onClose, T }) {
  const IS = iSty(T);
  const [itens, setItens] = useState(() => fornecedor.catalogo || []);

  const update = (id, patch) => setItens(list => list.map(i => i.id===id ? {...i, ...patch} : i));
  const remove = (id) => setItens(list => list.filter(i => i.id !== id));
  const add    = ()   => setItens(list => [...list, novoItem()]);

  const handleSave = () => {
    const limpos = itens
      .map(i => ({ ...i, nome: i.nome.trim(), descricao: (i.descricao||"").trim() }))
      .filter(i => i.nome);
    onSave({ ...fornecedor, catalogo: limpos });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:120,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:760,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{
              width:36,height:36,borderRadius:10,
              background:T.brandSoft||"rgba(16,185,129,0.12)",
              border:`1px solid ${T.brandBorder||T.border}`,
              color:T.brand||"#10b981",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}><Package size={18} strokeWidth={2.25}/></div>
            <div>
              <h3 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Catálogo de itens</h3>
              <p style={{margin:"2px 0 0",color:T.textMd,fontSize:12}}>{fornecedor.apelido || fornecedor.razaoSocial || "Fornecedor"}</p>
            </div>
          </div>
          <Badge T={T} color={T.brand||"#10b981"} size="md">{itens.filter(i => i.nome.trim()).length} itens</Badge>
        </div>

        <p style={{color:T.textSm,fontSize:12,margin:"14px 0 16px",lineHeight:1.5}}>
          Cadastre cada serviço/equipamento que esse fornecedor oferece. Cada item vira uma linha
          na tabela de preços que será preenchida pelo fornecedor para cada cidade × categoria.
        </p>

        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {itens.map((it, i) => (
            <div key={it.id} style={{
              display:"grid",
              gridTemplateColumns:"1.4fr 2fr 1.2fr 36px",
              gap:10,
              alignItems:"center",
              padding:12,
              background:T.surfaceAlt||T.bg,
              border:`1px solid ${T.border}`,
              borderRadius:RADIUS.md,
            }}>
              <input
                value={it.nome}
                onChange={e => update(it.id, { nome: e.target.value })}
                style={IS}
                placeholder="Nome (ex: UM, SNG, Grua)"
                autoFocus={i === itens.length-1 && !it.nome}
              />
              <input
                value={it.descricao}
                onChange={e => update(it.id, { descricao: e.target.value })}
                style={IS}
                placeholder="Descrição (opcional)"
              />
              <select
                value={it.unidade}
                onChange={e => update(it.id, { unidade: e.target.value })}
                style={IS}
              >
                {UNIDADES_MEDIDA.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
              </select>
              <button
                onClick={() => remove(it.id)}
                title="Remover"
                style={{
                  background:"transparent",
                  border:`1px solid ${T.border}`,
                  color:T.danger||"#ef4444",
                  borderRadius:RADIUS.sm,
                  height:34, width:34,
                  cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}
              >
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
          {!itens.length && (
            <p style={{color:T.textSm,fontSize:13,textAlign:"center",padding:"32px 0",margin:0,border:`1px dashed ${T.border}`,borderRadius:RADIUS.md}}>
              Nenhum item cadastrado. Clique em "Adicionar item".
            </p>
          )}
        </div>

        <Button T={T} variant="ghost" size="sm" icon={Plus} onClick={add} fullWidth>Adicionar item</Button>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20,paddingTop:16,borderTop:`1px solid ${T.border}`}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>Salvar catálogo</Button>
        </div>
      </div>
    </div>
  );
}

export { unidadeLabel };
