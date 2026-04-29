# Logos de entidades / detentores

Coloque aqui os logos das **entidades organizadoras** (CBF, FPF, etc.) e dos
**detentores de direito** (CazeTV, Record, Premiere, Amazon, ...).

O nome do arquivo precisa casar com o `id` em `src/config/entities.js`:

```
cbf.png               → entidade organizadora (Brasileirão)
fpf.png               → entidade organizadora (Paulistão Feminino)
cazetv.png            → detentor
record.png            → detentor
premiere.png          → detentor
amazon.png            → detentor
livemode.svg          → produtora (também usado na topbar)
```

**Formato recomendado:**
- PNG transparente ou SVG
- Quadrado para escudos, retangular tudo bem para wordmarks
- 128×128 ou maior

**Fallback automático:** se a imagem não existir, o `<EntityLogo>` mostra as
iniciais do `logoFallback` numa caixa cinza pequena (`28×28px` por padrão).

**Para adicionar uma entidade nova:**
1. Edite `src/config/entities.js` e adicione `{ id, name, logo, logoFallback }`.
2. Solte o arquivo nesta pasta.
3. Use `<EntityLogo entityId="cazetv" size={24}/>` em qualquer lugar.
