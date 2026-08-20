# manybot.org — protótipo Astro + Starlight

Protótipo funcional (buildado e testado) mostrando como resolver os 3 problemas
levantados sobre o site atual:

1. HTML duplicado por idioma (`src/` vs `src-en/`)
2. Build de docs manual, tradução manual sem tracking
3. Busca da documentação sem motor confiável por baixo

## Rodando

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera em dist/, HTML estático puro (mesmo output leve de hoje)
npm run preview  # serve o dist/ localmente
```

Pra integrar com o `server.js` atual, é só apontar o `express.static` pra
`dist/` no lugar do `dist/` gerado pelo `build.js` antigo — nada mais muda lá.

## O que está migrado (prova de conceito)

- **Home** (`src/pages/index.astro` + `src/pages/en/index.astro`): mesmo
  componente `HomeContent.astro`, texto vem de `src/i18n/{pt,en}.ts`. Editar a
  home = editar 1 arquivo de conteúdo + (no máximo) 1 chave de tradução, não 2
  HTMLs inteiros.
- **Nav / Footer**: 1 componente cada (`src/components/Nav.astro`,
  `Footer.astro`), dirigidos pelo dicionário. Isso mata a maior fonte de
  divergência de hoje (nav.html duplicado, cada link com `/en/` na mão).
- **Docs** (`src/content/docs/docs/*`): 3 páginas em pt, 2 traduzidas em en.
  A 3ª (`getting-started`) foi **deixada sem tradução de propósito** — acesse
  `/en/docs/getting-started/` e repare que o Starlight serve o conteúdo em pt
  automaticamente com o aviso "This content is not available in your language
  yet." Zero código escrito por nós pra isso acontecer.
- **API docs com dado compartilhado**: `src/data/ctx-methods.ts` é a fonte
  única de verdade pra assinaturas de métodos do `ctx`. O componente
  `<CtxMethod id="send.to" />` é usado em dois docs diferentes
  (`api/ctx-messaging.mdx` e `api/common-patterns.mdx`), nos dois idiomas —
  muda a assinatura em um lugar, atualiza nos 2 docs × 2 idiomas de uma vez.
- **Busca dos docs**: Pagefind já roda automaticamente no `astro build`
  (ver log: "Building search index with Pagefind... Found N HTML files").
  Zero configuração escrita por nós.
- **Blog**: mesma lógica de fallback dos docs, só que implementada na mão em
  `src/pages/en/blog/[slug].astro` (o Starlight só gerencia fallback dentro de
  `content/docs/`, não em outras collections) — só existe 1 post, sem tradução
  en, pra provar que o fallback + aviso funcionam igual.

## O que falta pra ficar 100% equivalente ao site atual

- Migrar as páginas restantes (`colabore`, `donates`, `legal`, `manyplug`,
  `plugins`, `fanarts`) pro mesmo padrão de `HomeContent.astro` (componente +
  chaves de i18n).
- Migrar os outros 20 docs de `src/docs/*.md` — é copy/paste de conteúdo pro
  novo caminho, sem mudança de formato (o Markdown em si não muda).
- CSS: hoje aponta pro `main.css` atual sem alteração (funciona, mas as
  classes do Starlight — sidebar, busca, TOC — têm o próprio visual; dá pra
  reconciliar via `src/styles/starlight-overrides.css`, que já está plugado
  no `astro.config.mjs`).
- RSS do blog e `sitemap.xml` (dá pra usar `@astrojs/rss` e
  `@astrojs/sitemap`, este último já está gerando `sitemap-index.xml`
  automaticamente porque é dependência do Starlight).
- Fanarts (galeria de imagens) — hoje é gerado a partir de
  `fanarts/artists.json`; vira um `getStaticPaths` lendo o mesmo JSON.

## Limitação descoberta durante o protótipo

Astro não permite usar a config `i18n` nativa (top-level) ao mesmo tempo que
`starlight({ locales })` — são dois sistemas que colidem. Resolvido deixando
o Starlight cuidar 100% do i18n de `/docs/*`, e as páginas fora dos docs
usam roteamento por pasta simples (`src/pages/` = pt, `src/pages/en/` = en)
sem fallback automático — só nos docs, que é onde isso realmente importa.
