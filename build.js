#!/usr/bin/env node

"use strict";

const fs   = require("fs");
const path = require("path");
const { marked } = require("marked");

// ── CONFIG ────────────────────────────────────────────────────────────────

const SRC = __dirname;
const OUT = path.join(SRC, "dist", "index.html");

marked.setOptions({ gfm: true, breaks: true });

// ── UTILITÁRIOS ───────────────────────────────────────────────────────────

function slugify(f) {
  return f.replace(/\s+/g, "-");
}

function readMd(filepath) {
  return marked.parse(fs.readFileSync(filepath, "utf8"));
}

function readDir(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort();
}

// ── BLOG ──────────────────────────────────────────────────────────────────
// Convenção: YYYY-MM-DD-slug.md
// Primeira linha: # Título
// Primeiro parágrafo não-heading vira excerpt

function parseBlogMeta(raw, filename) {
  const lines  = raw.split("\n");
  const title  = (lines.find(l => l.startsWith("# ")) || "").replace(/^#\s*/, "").trim() || filename;
  const excerpt = (lines.find(l => l.trim() && !l.startsWith("#")) || "").replace(/^>\s*/, "").trim();
  const m      = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const date   = m ? `${parseInt(m[3])} ${months[parseInt(m[2])-1]} ${m[1]}` : "";
  return { title, excerpt, date };
}

function buildBlog() {
  const files = readDir(path.join(SRC, "blog"), ".md").reverse(); // mais recente primeiro

  const empty = `
      <section class="page" id="blog">
        <div class="blog-layout">
          <h1 class="page-title">Blog</h1>
          <p style="color:var(--text-3);font-size:14px;">Nenhuma publicação ainda.</p>
        </div>
      </section>`;

  if (!files.length) return empty;

  const posts = files.map(filename => {
    const raw  = fs.readFileSync(path.join(SRC, "blog", filename), "utf8");
    const meta = parseBlogMeta(raw, filename);
    const html = marked.parse(raw);
    const id   = "blog-post-" + slugify(filename);
    return { id, html, ...meta };
  });

  console.log(`   ${posts.length} post(s) encontrado(s)`);

  const listItems = posts.map(p => `
            <a class="blog-item" href="#${p.id}">
              <div class="blog-item-meta">${p.date}</div>
              <div class="blog-item-title">${p.title}</div>
              <div class="blog-item-excerpt">${p.excerpt}</div>
            </a>`).join("\n");

  // lista principal
  const listSection = `
      <section class="page" id="blog">
        <div class="blog-layout">
          <h1 class="page-title">Blog</h1>
          <div class="blog-list">
            ${listItems}
          </div>
        </div>
      </section>`;

  // uma section por post — voltar aponta para #blog
  const postSections = posts.map(p => `
      <section class="page" id="${p.id}">
        <div class="blog-layout">
          <a class="back-btn" href="#blog">← Voltar</a>
          <div class="md">
            ${p.html}
          </div>
        </div>
      </section>`).join("\n");

  return listSection + "\n" + postSections;
}

// ── DOCS / MANYUAL ────────────────────────────────────────────────────────
// _sidebar.json opcional. Sem ele, todos os .md em ordem.
// Cada página = <section id="[dir]-[slug]"> navegável por :target.
// A section id="[dir]" exibe a primeira página (default da seção).

function buildSection(dirName) {
  const sidebarJsonPath = path.join(SRC, dirName, "_sidebar.json");
  let groups = [];

  if (fs.existsSync(sidebarJsonPath)) {
    const parsed = JSON.parse(fs.readFileSync(sidebarJsonPath, "utf8"));
    groups = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    const files = readDir(path.join(SRC, dirName), ".md");
    groups = [{ group: "", items: files.map(f => ({
      file: f,
      label: f.replace(/\.md$/, "").replace(/[-_]/g, " ")
    }))}];
  }

  const allItems = [];
  groups.forEach(g => g.items.forEach(item => allItems.push({ ...item, group: g.group })));

  if (!allItems.length) {
    console.log(`   nenhum arquivo em ${dirName}/`);
    return `
      <section class="page" id="${dirName}">
        <div class="docs-layout">
          <p style="color:var(--text-3)">Nenhum arquivo encontrado em ${dirName}/.</p>
        </div>
      </section>`;
  }

  console.log(`   ${allItems.length} arquivo(s) em ${dirName}/`);

  // sidebar com item ativo destacado
  function makeSidebar(activeId) {
    let html = "";
    let lastGroup = null;
    allItems.forEach(item => {
      const id = `${dirName}-${slugify(item.file)}`;
      if (item.group !== lastGroup) {
        if (lastGroup !== null) html += `</div>`;
        html += `<div class="sidebar-group">`;
        if (item.group) html += `<div class="sidebar-group-title">${item.group}</div>`;
        lastGroup = item.group;
      }
      const active = id === activeId ? " active" : "";
      html += `<a class="sidebar-link${active}" href="#${id}">${item.label}</a>`;
    });
    if (lastGroup !== null) html += `</div>`;
    return html;
  }

  function getContent(file) {
    const fp = path.join(SRC, dirName, file);
    return fs.existsSync(fp)
      ? readMd(fp)
      : `<p style="color:var(--text-3)">Arquivo não encontrado: ${file}</p>`;
  }

  // section "capa" da seção = mesma que a primeira página
  const first   = allItems[0];
  const firstId = `${dirName}-${slugify(first.file)}`;

  const coverSection = `
      <!-- ${dirName}: capa (padrão ao acessar #${dirName}) -->
      <section class="page" id="${dirName}">
        <div class="docs-layout">
          <aside class="docs-sidebar">${makeSidebar(firstId)}</aside>
          <main class="docs-content md">${getContent(first.file)}</main>
        </div>
      </section>`;

  // uma section por arquivo
  const pageSections = allItems.map(item => {
    const id = `${dirName}-${slugify(item.file)}`;
    return `
      <!-- ${dirName}: ${item.file} -->
      <section class="page" id="${id}">
        <div class="docs-layout">
          <aside class="docs-sidebar">${makeSidebar(id)}</aside>
          <main class="docs-content md">${getContent(item.file)}</main>
        </div>
      </section>`;
  }).join("\n");

  return coverSection + "\n" + pageSections;
}

// ── FANARTS ───────────────────────────────────────────────────────────────

function loadArtists() {
  const p = path.join(SRC, "fanarts", "artists.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
}

function authorLink(name, artists) {
  const a = artists[name];
  if (!a || !a.url) return name;
  return `<span class="author-link" data-url="${a.url}" onclick="event.stopPropagation();window.open(this.dataset.url,'_blank')">${name}</span>`;
}

function parseFanartFilename(file) {
  const match = file.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2})-(.+)\.jpg$/i);
  if (!match) return null;

  const [, ts, author] = match;

  // transforma "2026-04-02T14-25" → "2026-04-02T14:25:00"
  const iso = ts.replace("T", "T").replace(/-(\d{2})$/, ":$1") + ":00";

  const date = new Date(iso);

  return {
    file,
    author,
    date: new Date(iso).getTime()
  };
}

function buildFanarts() {
  const artists = loadArtists();

  const empty = `
      <section class="page" id="fanarts">
        <div class="fanarts-layout">
          <a class="back-btn" href="#community">← Comunidade</a>
          <h1 class="page-title">Fanarts</h1>
          <p class="fanart-empty">Nenhuma fanart ainda.</p>
        </div>
      </section>`;

  const dir = path.join(SRC, "fanarts");
  
  if (!fs.existsSync(dir)) {
    console.warn("fanarts/ não existe");
    return empty;
  }
  
  let fanarts = fs.readdirSync(dir)
    .filter(f => {
      if (/\.(png|webp|jpeg)$/i.test(f)) {
        console.warn(`   ⚠️  ignorado (não é .jpg): ${f}`);
        return false;
      }
      return true;
    })
    .map(parseFanartFilename)
    .filter(Boolean)
    .sort((a, b) => b.date - a.date);
  
  if (!fanarts.length) return empty;

  console.log(`   ${fanarts.length} fanart(s) encontrada(s)`);

  // grid: cada item é link para lightbox estático (fallback) E tem data-index para JS
  const gridItems = fanarts.map((art, i) => `
              <a class="fanart-item" href="#fanart-${i}" data-index="${i}">
                <img
                  src="fanarts/${art.file}"
                  alt="Fanart por ${art.author || "anônimo"}"
                  loading="lazy"
                >
                <div class="fanart-overlay">
                  ${art.author ? `<span class="fanart-author">${authorLink(art.author, artists)}</span>` : ""}
                </div>
              </a>`).join("\n");

  // lightboxes estáticos — um por fanart, visíveis via :target
  // ocultos via CSS quando html.js (JS disponível)
  const staticLightboxes = fanarts.map((art, i) => {
    const prev = (i - 1 + fanarts.length) % fanarts.length;
    const next = (i + 1) % fanarts.length;
    return `
      <div class="lightbox-static" id="fanart-${i}">
        <a class="lightbox-close" href="#fanarts" aria-label="Fechar">×</a>
        <a class="lightbox-nav lightbox-prev" href="#fanart-${prev}" aria-label="Anterior">‹</a>
        <figure>
          <img src="fanarts/${art.file}" alt="Fanart por ${art.author || "anônimo"}">
          ${art.author ? `<figcaption>por ${authorLink(art.author, artists)}</figcaption>` : ""}
        </figure>
        <a class="lightbox-nav lightbox-next" href="#fanart-${next}" aria-label="Próxima">›</a>
      </div>`;
  }).join("\n");

  const dataJson = JSON.stringify(
    fanarts.map(f => ({
      file: f.file,
      author: f.author,
      authorUrl: (artists[f.author] && artists[f.author].url) || null,
      date: new Date(f.date).toISOString()
    }))
  );

  return `
      <!-- FANARTS: galeria -->
      <section class="page" id="fanarts">
        <div class="fanarts-layout">
          <a class="back-btn" href="#community">← Comunidade</a>
          <h1 class="page-title">Fanarts</h1>
          <div class="fanarts-grid">
            ${gridItems}
          </div>
        </div>
      </section>

      ${staticLightboxes}

      <!-- LIGHTBOX DINÂMICO: só usado quando JS disponível (html.js) -->
      <div class="lightbox-dynamic" id="lightbox-dynamic">
        <button class="lightbox-close" id="lb-close" aria-label="Fechar">×</button>
        <button class="lightbox-nav lightbox-prev" id="lb-prev" aria-label="Anterior">‹</button>
        <figure>
          <img id="lb-img" src="" alt="">
          <figcaption id="lb-caption"></figcaption>
        </figure>
        <button class="lightbox-nav lightbox-next" id="lb-next" aria-label="Próxima">›</button>
      </div>

      <script>window.__FANARTS__=${dataJson};</script>`;
}

// ── COMMUNITY ─────────────────────────────────────────────────────────────

function buildCommunity() {
  return `
      <!-- COMMUNITY -->
      <section class="page" id="community">
        <div class="community-layout">
          <h1 class="page-title">Comunidade</h1>

          <div class="community-section">
            <h2>Principal</h2>
            <a class="link-card" href="https://mlplovers.neocities.org" target="_blank" rel="noopener">
              <div class="link-card-icon">💬</div>
              <div class="link-card-body">
                <div class="link-card-title">Comunidade My Little Pony Lovers</div>
                <div class="link-card-desc">A Many surgiu numa comunidade de MLP, e é lá onde você pode conversar diretamente com os principais desenvolvedores.</div>
              </div>
              <span class="link-card-arrow">↗</span>
            </a>
          </div>

          <div class="community-section">
            <h2>Fanarts</h2>
            <a class="link-card" href="#fanarts">
              <div class="link-card-icon">🎨</div>
              <div class="link-card-body">
                <div class="link-card-title">Fanarts ManyBot</div>
                <div class="link-card-desc">Temos uma comunidade bem criativa!</div>
              </div>
              <span class="link-card-arrow">↗</span>
            </a>
          </div>

          <div class="community-section">
            <h2>Repositórios</h2>
            <a class="link-card" href="https://git.stxerr.dev/manybot.git" target="_blank" rel="noopener">
              <div class="link-card-icon">📦</div>
              <div class="link-card-body">
                <div class="link-card-title">ManyBot</div>
                <div class="link-card-desc">Repositório principal do ManyBot</div>
              </div>
              <span class="link-card-arrow">↗</span>
            </a>
            <a class="link-card" href="https://git.stxerr.dev/manyplug.git" target="_blank" rel="noopener">
              <div class="link-card-icon">🔌</div>
              <div class="link-card-body">
                <div class="link-card-title">ManyPlug</div>
                <div class="link-card-desc">Gerenciador de plugins para o ManyBot</div>
              </div>
              <span class="link-card-arrow">↗</span>
            </a>
          </div>
        </div>
      </section>`;
}

// ── TEMPLATE ──────────────────────────────────────────────────────────────

function buildHTML(sections) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<!--
  Gerado por build.js — não edite manualmente.
  Para atualizar o conteúdo: node build.js
-->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ManyBot</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" href="assets/favicon.png">
</head>
<body>

<nav>
  <a href="#blog" class="nav-brand">
    <img class="nav-logo" src="assets/manybot-logo.png" alt="ManyBot">
  </a>
  <ul class="nav-links">
    <li><a href="#blog">Blog</a></li>
    <li><a href="#docs">Docs</a></li>
    <li><a href="#manyual">Manyual</a></li>
    <li><a href="#community">Comunidade</a></li>
  </ul>
</nav>

${sections.join("\n")}

<script src="script.js"></script>
</body>
</html>`;
}

// ── MAIN ──────────────────────────────────────────────────────────────────

function main() {
  console.log("🔨 ManyBot build iniciado...\n");

  const distDir = path.join(SRC, "dist");
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  console.log("📝 Blog...");
  const blogHTML = buildBlog();

  console.log("📚 Docs...");
  const docsHTML = buildSection("docs");

  console.log("📖 Manyual...");
  const manyualHTML = buildSection("manyual");

  console.log("🤝 Community...");
  const communityHTML = buildCommunity();

  console.log("🎨 Fanarts...");
  const fanartsHTML = buildFanarts();

  console.log("\n🏗️  Montando index.html...");
  const html = buildHTML([blogHTML, docsHTML, manyualHTML, communityHTML, fanartsHTML]);

  fs.writeFileSync(OUT, html, "utf8");

  const kb = (html.length / 1024).toFixed(1);
  console.log(`✅ Build completo → dist/index.html (${kb} KB)\n`);
}

main();
