# Logos de campeonatos

Coloque aqui o escudo/logo oficial de cada campeonato como **PNG transparente**
ou **SVG**. O nome do arquivo deve casar com o ID em
`src/config/championships.js`:

```
brasileirao-serie-a.png      → "brasileirao-2026"   (logoSlug: "brasileirao-serie-a")
paulistao-feminino.png        → "paulistao-feminino-2026"
```

**Formato recomendado:**
- Quadrado (1:1) ou próximo
- Fundo transparente
- 256×256 ou maior (vai escalar para 48×48 nos cards e 32×32 na topbar)
- Margem interna de ~8% para o crop não ficar colado nas bordas

**Fallback automático:** se a imagem não existir ou falhar ao carregar, o
componente `ChampionshipLogo` mostra as iniciais do `logoFallback` numa caixa
colorida com a cor oficial do campeonato (`accentColor`).

**Para adicionar um campeonato novo:**
1. Edite `src/config/championships.js` e adicione uma entrada com `logo`,
   `logoFallback` (2 letras) e `accentColor`.
2. Solte o PNG/SVG nesta pasta com o nome batendo no path `logo`.
3. Pronto — o card na Home, a topbar e qualquer lugar que use
   `<ChampionshipLogo championshipId="...">` vai pegar automaticamente.
