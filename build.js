#!/usr/bin/env node
// build.js — ManyBot static site generator (multi-locale)
// Uso: node build.js

import fs from "fs";
import path from "path";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { fileURLToPath } from 'node:url';
import hljs from "highlight.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIST = "dist";

// Locales: "pt" is the default (served at /), "en" is served under /en/.
// Each locale's src dir mirrors the same structure (shell/, pages/, docs/, blog/, data/).
// A locale is skipped gracefully if its src dir or shell files don't exist yet.
const LOCALES = [
  { code: "pt", src: "src",    dist: ROOT_DIST,         lang: "pt-BR" },
  { code: "en", src: "src-en", dist: `${ROOT_DIST}/en`, lang: "en"    },
];

const normalize = text =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const md = new MarkdownIt({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {}
    }

    return hljs.highlightAuto(code).value;
  }
});

md.use(anchor, {
  slugify: s =>
    normalize(s)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full, ext));
    else if (!ext || entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

// Parseia frontmatter YAML simples (chave: valor)
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: match[2] };
}

// ── Shared data / templating (single source pra fatos repetidos nos docs) ─────
//
// Sintaxe suportada dentro de <locale>/docs/**/*.md:
//   {{links.algumaChave}}       → valor de <locale>/data/shared.json
//   {{requirements.algumaChave}}
//   {{categoriesTable}}         → tabela md gerada de shared.json#categories
//   {{categoriesInline}}        → lista inline `valor`, `valor`, ...
//   {{> _partials/arquivo.md}}  → inclui conteúdo de <locale>/docs/_partials/arquivo.md
//
// Propositalmente um whitelist (não um {{qualquerCoisa}} genérico) pra não
// colidir com exemplos de i18n nos próprios docs, tipo {{nome}}/{{name}}.

const SITE = "https://manybot.org";

const LOCALE_SCRIPT = `<script>
(function(){var p=location.pathname;if(p==="/docs/"||p.startsWith("/docs/")||p.startsWith("/en/docs/"))return;var e=p.startsWith("/en/")||p==="/en";var l=localStorage.getItem("manybot_lang");if(!l){var n=(navigator.language||"").split("-")[0];l=n==="en"?"en":"pt";localStorage.setItem("manybot_lang",l)}if(l==="en"&&!e){location.href="/en"+(p==="/"?"/":p)}else if(l==="pt"&&e){location.href=p.replace(/^\\/en/,"")||"/"}}())
<\/script>`;

function addHreflang(html, canonicalPath) {
  const links = [
    `<link rel="alternate" hreflang="pt-BR" href="${SITE}${canonicalPath}">`,
    `<link rel="alternate" hreflang="en" href="${SITE}/en${canonicalPath}">`,
    `<link rel="alternate" hreflang="x-default" href="${SITE}${canonicalPath}">`,
  ];
  return html.replace("</head>", `    ${links.join("\n    ")}\n  </head>`);
}

function addLocaleScript(html) {
  return html.replace("</head>", `${LOCALE_SCRIPT}\n  </head>`);
}

function getPath(obj, key) {
  return key.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

function renderCategoriesTable(categories) {
  let out = "| Valor | Quando usar |\n|---|---|\n";
  for (const c of categories) out += `| \`${c.value}\` | ${c.description} |\n`;
  return out.trim();
}

function renderCategoriesInline(categories) {
  return categories.map(c => `\`${c.value}\``).join(", ");
}

// Remove sintaxe markdown básica pra gerar texto puro pro índice de busca dos docs.
function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function applyTemplate(text, SRC, SHARED) {
  text = text.replace(/\{\{>\s*([^\s}]+?)\s*\}\}/g, (_, rel) => {
    const partialPath = path.join(SRC, "docs", rel);
    if (!fs.existsSync(partialPath)) {
      console.warn(`template: partial não encontrado: ${rel}`);
      return `<!-- partial não encontrado: ${rel} -->`;
    }
    return read(partialPath).trim();
  });

  text = text.replace(/\{\{categoriesTable\}\}/g, () => renderCategoriesTable(SHARED.categories));
  text = text.replace(/\{\{categoriesInline\}\}/g, () => renderCategoriesInline(SHARED.categories));

  text = text.replace(/\{\{(links\.\w+|requirements\.\w+)\}\}/g, (match, key) => {
    const value = getPath(SHARED, key);
    if (value === undefined) {
      console.warn(`template: variável não encontrada: {{${key}}}`);
      return match;
    }
    return value;
  });

  return text;
}

// ── Docs sidebar ────────────────────────────────────────────────────────────

const DOCS_SEARCH_STRINGS = {
  pt: { placeholder: "Buscar na documentação…", empty: "Nenhum resultado encontrado." },
  en: { placeholder: "Search the docs…",        empty: "No results found." },
};

function buildSidebar(sidebar, currentSlug, base, code) {
  const t = DOCS_SEARCH_STRINGS[code] || DOCS_SEARCH_STRINGS.pt;
  let html = '<aside class="docs-sidebar">';
  html += `<div class="docs-search">
    <input type="search" id="docs-search-input" class="docs-search-input" placeholder="${t.placeholder}" autocomplete="off" spellcheck="false" data-base="${base}" data-empty="${t.empty}">
    <div id="docs-search-results" class="docs-search-results" hidden></div>
  </div>`;
  for (const group of sidebar) {
    html += `<div class="sidebar-group">`;
    html += `<div class="sidebar-group-label">${group.label}</div>`;
    for (const item of group.items) {
      const active = item.slug === currentSlug ? " active" : "";
      const href = item.slug === 'index' ? `${base}/docs/` : `${base}/docs/${item.slug}/`;
      html += `<a class="sidebar-link${active}" href="${href}">${item.label}</a>`;
    }
    html += `</div>`;
  }
  html += "</aside>";
  return html;
}

// ── Per-locale build ──────────────────────────────────────────────────────────

function buildLocale(locale) {
  const { code, src: SRC, dist: DIST } = locale;

  if (!fs.existsSync(SRC)) {
    console.log(`[${code}] src não encontrado (${SRC}), pulando locale`);
    return;
  }

  const navPath        = path.join(SRC, "shell", "nav.html");
  const footerPath     = path.join(SRC, "shell", "footer.html");
  const footerMiniPath = path.join(SRC, "shell", "footer-mini.html");
  if (!fs.existsSync(navPath) || !fs.existsSync(footerPath)) {
    console.log(`[${code}] shell/nav.html ou shell/footer.html ausente, pulando locale`);
    return;
  }

  const base       = code === "pt" ? "" : `/${code}`;
  const nav        = read(navPath);
  const footer     = read(footerPath);
  // footer-mini: versão reduzida usada em todas as páginas exceto a home.
  // Se não existir, cai de volta pro footer completo (não quebra o build).
  const footerMini = fs.existsSync(footerMiniPath) ? read(footerMiniPath) : footer;

  function injectShell(html, canonicalPath, footerHtml) {
    let result = html
      .replace("<!-- NAV -->", nav)
      .replace("<!-- FOOTER -->", footerHtml ?? footerMini);
    if (canonicalPath) {
      result = addHreflang(result, canonicalPath);
    }
    result = addLocaleScript(result);
    return result;
  }

  const sharedPath = path.join(SRC, "data", "shared.json");
  const SHARED = fs.existsSync(sharedPath)
    ? JSON.parse(read(sharedPath))
    : { links: {}, requirements: {}, categories: [] };

  function buildPages() {
    const pages = walk(path.join(SRC, "pages"), ".html");
    for (const src of pages) {
      const rel  = path.relative(path.join(SRC, "pages"), src);
      const dest = path.join(DIST, rel);
      const dir = path.dirname(rel);
      const canonicalPath = dir === "." ? "/" : `/${dir}/`;
      const isHome = dir === ".";
      write(dest, injectShell(read(src), canonicalPath, isHome ? footer : footerMini));
    }
    console.log(`[${code}] pages: ${pages.length} arquivos`);
  }

  function buildDocsSingleFile(sidebar, files) {
    const bySlug = new Map(files.map(f => [path.basename(f, ".md"), f]));
    let combined = "";
    for (const group of sidebar) {
      combined += `\n\n# ${group.label}\n`;
      for (const item of group.items) {
        const src = bySlug.get(item.slug);
        if (!src) continue;
        combined += `\n\n## ${item.label}\n\n`;
        combined += applyTemplate(read(src), SRC, SHARED);
      }
    }
    write(path.join(DIST, "docs", "all.md"), combined.trim() + "\n");
  }

  function buildDocs() {
    const sidebarJson = path.join(SRC, "docs", "sidebar.json");
    if (!fs.existsSync(sidebarJson)) {
      console.log(`[${code}] docs: sidebar.json não encontrado, pulando`);
      return;
    }
    const docsShellPath = path.join(SRC, "shell", "docs.html");
    if (!fs.existsSync(docsShellPath)) {
      console.log(`[${code}] docs: shell/docs.html não encontrado, pulando`);
      return;
    }

    const sidebar  = JSON.parse(read(sidebarJson));
    const template = read(docsShellPath);
    const docsDir  = path.join(SRC, "docs");
    const files    = walk(docsDir, ".md")
      .filter(f => !path.relative(docsDir, f).startsWith(`_partials${path.sep}`));

    const labelBySlug = new Map(
      sidebar.flatMap(g => g.items.map(i => [i.slug, i.label]))
    );

    const searchIndex = [];

    for (const src of files) {
      const slug = path.basename(src, ".md");
      const bodyMd = applyTemplate(read(src), SRC, SHARED);
      const body = md.render(bodyMd);
      const sidebarHtml = buildSidebar(sidebar, slug, base, code);
      const label = labelBySlug.get(slug) || slug;
      const title = label + " - ManyBot Docs";

      const html = template
        .replace("<!-- TITLE -->",   title)
        .replace("<!-- NAV -->",     nav)
        .replace("<!-- FOOTER -->",  footerMini)
        .replace("<!-- SIDEBAR -->", sidebarHtml)
        .replace("<!-- CONTENT -->", `<div class="md">${body}</div>`);

      const canonicalPath = slug === "index" ? "/docs/" : `/docs/${slug}/`;

      const dest = slug === "index"
        ? path.join(DIST, "docs", "index.html")
        : path.join(DIST, "docs", slug, "index.html");
      write(dest, addLocaleScript(addHreflang(html, canonicalPath)));

      searchIndex.push({
        slug,
        title: label,
        href: canonicalPath,
        text: stripMarkdown(bodyMd).slice(0, 6000),
      });
    }
    buildDocsSingleFile(sidebar, files);
    write(path.join(DIST, "docs", "search-index.json"), JSON.stringify(searchIndex));
    console.log(`[${code}] docs: ${files.length} arquivos (+ search-index.json)`);
  }

  function buildBlog() {
    const templatePath = path.join(SRC, "shell", "post.html");
    const files = walk(path.join(SRC, "blog"), ".md");
    if (!files.length) {
      console.log(`[${code}] blog: nenhum post, pulando`);
      return;
    }
    if (!fs.existsSync(templatePath)) {
      console.log(`[${code}] blog: shell/post.html não encontrado, pulando`);
      return;
    }

    const template = read(templatePath);
    const posts = [];

    for (const src of files) {
      const slug           = path.basename(src, ".md");
      const { meta, body } = parseFrontmatter(read(src));
      const content        = md.render(body);

      if (!meta.date) {
        const today = new Date().toISOString().slice(0, 10);
        const raw = read(src);
        write(src, raw.replace(/^---/, `---\ndate: ${today}`));
        meta.date = today;
        console.log(`[${code}] rss: injetou date em ${slug}`);
      }

      const html = template
        .replace("<!-- NAV -->",     nav)
        .replace("<!-- FOOTER -->",  footerMini)
        .replace("<!-- TITLE -->",   meta.title || slug)
        .replace("<!-- DATE -->",    meta.date  || "")
        .replace("<!-- CONTENT -->", `<div class="md">${content}</div>`);

      const canonicalPath = `/blog/${slug}/`;

      write(path.join(DIST, "blog", slug, "index.html"), addLocaleScript(addHreflang(html, canonicalPath)));
      posts.push({ slug, ...meta });
    }

    posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const listItems = posts.map(p => `
    <li>
      <a class="blog-item" href="${base}/blog/${p.slug}/">
        <div class="blog-item-date">${p.date || ""}</div>
        <div class="blog-item-title">${p.title || p.slug}</div>
        ${p.excerpt ? `<div class="blog-item-excerpt">${p.excerpt}</div>` : ""}
      </a>
    </li>`).join("\n");

    const indexPath = path.join(DIST, "blog", "index.html");
    if (fs.existsSync(indexPath)) {
      const updated = read(indexPath).replace(
        '<li><div class="empty-notice">nenhum post ainda.</div></li>',
        listItems || '<li><div class="empty-notice">nenhum post ainda.</div></li>'
      );
      write(indexPath, updated);
    }

    console.log(`[${code}] blog: ${files.length} posts`);
  }

  function buildFanarts() {
    const dir = path.join("fanarts");
    if (!fs.existsSync(dir)) { console.log(`[${code}] fanarts: pasta não encontrada, pulando`); return; }

    const templatePath = path.join(SRC, "pages", "fanarts", "index.html");
    if (!fs.existsSync(templatePath)) { console.log(`[${code}] fanarts: pages/fanarts/index.html não encontrado, pulando`); return; }

    const artistsPath = path.join(dir, "artists.json");
    const artists = fs.existsSync(artistsPath) ? JSON.parse(read(artistsPath)) : {};

    const exts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const images = fs.readdirSync(dir)
      .filter(f => exts.includes(path.extname(f).toLowerCase()))
      .sort()
      .reverse();

    function extractArtist(filename) {
      const base = path.basename(filename, path.extname(filename));
      const match = base.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-(.+)$/);
      return match ? match[1] : base;
    }

    fs.mkdirSync(path.join(DIST, "fanarts"), { recursive: true });
    for (const img of images) {
      fs.copyFileSync(path.join(dir, img), path.join(DIST, "fanarts", img));
    }

    const altPrefix = code === "pt" ? "Fanart por" : "Fanart by";
    const emptyNotice = code === "pt" ? "nenhuma fanart ainda." : "no fanarts yet.";

    const grid = images.map(img => {
      const artistKey = extractArtist(img);
      const artist    = artists[artistKey];
      const label     = artistKey.replace(/@.*/, "");
      const overlay   = artist?.url
        ? `<a class="fanart-overlay" href="${artist.url}" target="_blank" rel="noopener">${label} · ${artist.platform}</a>`
        : `<div class="fanart-overlay">${label}</div>`;

      return `<div class="fanart-item">
  <a href="/fanarts/${img}" target="_blank" rel="noopener">
    <img src="/fanarts/${img}" alt="${altPrefix} ${label}" loading="lazy">
  </a>
  ${overlay}
</div>`;
    }).join("\n");

    const html = injectShell(read(templatePath), "/fanarts/")
      .replace("<!-- FANARTS_GRID -->", grid || `<div class="empty-notice">${emptyNotice}</div>`);

    write(path.join(DIST, "fanarts", "index.html"), html);
    console.log(`[${code}] fanarts: ${images.length} imagens`);
  }

  buildPages();
  buildDocs();
  buildBlog();
  buildFanarts();
}

// ── Static ────────────────────────────────────────────────────────────────

function buildStatic() {
  console.log("static: nada para copiar (servido via express.static)");
}

// ── Plugins — pt-only (dirigido pelo registry, sem tradução por ora) ─────────

function buildPlugins() {
  const registryPath  = path.join(__dirname, "mpindex.json");
  const templatePath  = path.join("src", "shell", "plugin-page.html");
  const navPath       = path.join("src", "shell", "nav.html");
  const footerPath    = path.join("src", "shell", "footer.html");
  const footerMiniPath = path.join("src", "shell", "footer-mini.html");

  if (!fs.existsSync(registryPath)) { console.log("plugins: mpindex.json não encontrado, pulando"); return; }
  if (!fs.existsSync(templatePath)) { console.log("plugins: plugin-page.html não encontrado, pulando"); return; }

  const registry = JSON.parse(read(registryPath));
  const template = read(templatePath);
  const nav      = read(navPath);
  const footer   = fs.existsSync(footerMiniPath) ? read(footerMiniPath) : read(footerPath);

  function injectShell(html) {
    return html.replace("<!-- NAV -->", nav).replace("<!-- FOOTER -->", footer);
  }

  for (const slug of Object.keys(registry.plugins)) {
    const html = injectShell(template).replace(/PLUGIN_SLUG/g, slug);
    write(path.join(ROOT_DIST, "plugins", ...slug.split("/"), "index.html"), html);
  }

  console.log(`plugins: ${Object.keys(registry.plugins).length} páginas geradas`);
}

// ── RSS — pt-only por ora ──────────────────────────────────────────────────────

function buildRSS() {
  const files = walk(path.join("src", "blog"), ".md");
  const posts = [];

  for (const src of files) {
    const slug           = path.basename(src, ".md");
    const { meta, body } = parseFrontmatter(read(src));
    posts.push({ slug, ...meta, body });
  }

  posts.sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0));

  const SITE = "https://manybot.org";

  const items = posts.map(p => {
    const url   = `${SITE}/blog/${p.slug}/`;
    const date = new Date(p.date ?? Date.now()).toUTCString();
    const image = p.image ?? "";
    const desc  = p.excerpt || "";
    return `    <item>
      <title>${escXml(p.title || p.slug)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${date}</pubDate>
      ${desc ? `<description>${escXml(desc)}</description>` : ""}
      <media:content
        url="${image}"
        medium="image" />
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>ManyBot Blog</title>
    <link>${SITE}/blog/</link>
    <description>Novidades e atualizações do ManyBot.</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  write(path.join(ROOT_DIST, "rss.xml"), xml);
  console.log(`rss: ${posts.length} posts`);
}

function escXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSitemap() {
  const SITE = "https://manybot.org";

  const pages = walk(ROOT_DIST, ".html");

  const urls = pages.map(file => {
    let url = path.relative(ROOT_DIST, file)
      .replace(/index\.html$/, "")
      .replace(/\\/g, "/");

    if (!url.startsWith("/")) url = "/" + url;

    return `  <url>
    <loc>${SITE}${url}</loc>
  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  write(path.join(__dirname, "sitemap.xml"), xml);

  console.log(`sitemap: ${pages.length} páginas`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

fs.rmSync(ROOT_DIST, { recursive: true, force: true });
fs.mkdirSync(ROOT_DIST);

buildStatic();
for (const locale of LOCALES) buildLocale(locale);
buildPlugins();
buildRSS();
buildSitemap();

console.log("done → dist/");

