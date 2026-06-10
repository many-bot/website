#!/usr/bin/env node
// build.js — ManyBot static site generator
// Uso: node build.js

import fs from "fs";
import path from "path";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC = "src";
const DIST = "dist";

const normalize = text =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const md = new MarkdownIt();
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

// ── Shell ─────────────────────────────────────────────────────────────────────

const nav    = read(path.join(SRC, "shell", "nav.html"));
const footer = read(path.join(SRC, "shell", "footer.html"));

function injectShell(html) {
  return html
    .replace("<!-- NAV -->", nav)
    .replace("<!-- FOOTER -->", footer);
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function buildPages() {
  const pages = walk(path.join(SRC, "pages"), ".html");
  for (const src of pages) {
    const rel  = path.relative(path.join(SRC, "pages"), src);
    const dest = path.join(DIST, rel);
    write(dest, injectShell(read(src)));
  }
  console.log(`pages: ${pages.length} arquivos`);
}

// ── Docs ──────────────────────────────────────────────────────────────────────

function buildSidebar(sidebar, currentSlug) {
  let html = '<aside class="docs-sidebar">';
  for (const group of sidebar) {
    html += `<div class="sidebar-group">`;
    html += `<div class="sidebar-group-label">${group.label}</div>`;
    for (const item of group.items) {
      const active = item.slug === currentSlug ? " active" : "";
      html += `<a class="sidebar-link${active}" href="${item.slug === 'index' ? '/docs/' : '/docs/' + item.slug + '/'}">${item.label}</a>`;
    }
    html += `</div>`;
  }
  html += "</aside>";
  return html;
}

function buildDocs() {
  const sidebarJson = path.join(SRC, "docs", "sidebar.json");
  if (!fs.existsSync(sidebarJson)) {
    console.log("docs: sidebar.json não encontrado, pulando");
    return;
  }

  const sidebar  = JSON.parse(read(sidebarJson));
  const template = read(path.join(SRC, "shell", "docs.html"));
  const files    = walk(path.join(SRC, "docs"), ".md");

  const assets = path.join(SRC, "docs", "assets");
  const distAssets = path.join(DIST, "docs", path.basename(assets));

  fs.cp(assets, distAssets, { recursive: true }, (err) => {
    if (err) throw err;
  });

  for (const src of files) {
    const slug = path.basename(src, ".md");
    const body = md.render(read(src));
    const sidebarHtml = buildSidebar(sidebar, slug);

    const html = template
      .replace("<!-- NAV -->",     nav)
      .replace("<!-- FOOTER -->",  footer)
      .replace("<!-- SIDEBAR -->", sidebarHtml)
      .replace("<!-- CONTENT -->", `<div class="md">${body}</div>`);

    const dest = slug === "index"
      ? path.join(DIST, "docs", "index.html")
      : path.join(DIST, "docs", slug, "index.html");
    write(dest, html);
  }
  console.log(`docs: ${files.length} arquivos`);
}

// ── Blog ──────────────────────────────────────────────────────────────────────

function buildBlog() {
  const template = read(path.join(SRC, "shell", "post.html"));
  const files    = walk(path.join(SRC, "blog"), ".md");
  const posts    = [];

  for (const src of files) {
    const slug           = path.basename(src, ".md");
    const { meta, body } = parseFrontmatter(read(src));
    const content        = md.render(body);

    const html = template
      .replace("<!-- NAV -->",     nav)
      .replace("<!-- FOOTER -->",  footer)
      .replace("<!-- TITLE -->",   meta.title || slug)
      .replace("<!-- DATE -->",    meta.date  || "")
      .replace("<!-- CONTENT -->", `<div class="md">${content}</div>`);

    write(path.join(DIST, "blog", slug, "index.html"), html);
    posts.push({ slug, ...meta });
  }

  // Ordena por data decrescente e atualiza blog/index.html com a lista
  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const listItems = posts.map(p => `
    <li>
      <a class="blog-item" href="/blog/${p.slug}/">
        <div class="blog-item-date">${p.date || ""}</div>
        <div class="blog-item-title">${p.title || p.slug}</div>
        ${p.excerpt ? `<div class="blog-item-excerpt">${p.excerpt}</div>` : ""}
      </a>
    </li>`).join("\n");

  // Injeta a lista na blog/index.html gerada pelo buildPages
  const indexPath = path.join(DIST, "blog", "index.html");
  if (fs.existsSync(indexPath)) {
    const updated = read(indexPath).replace(
      '<li><div class="empty-notice">nenhum post ainda.</div></li>',
      listItems || '<li><div class="empty-notice">nenhum post ainda.</div></li>'
    );
    write(indexPath, updated);
  }

  console.log(`blog: ${files.length} posts`);
}

// ── Fanarts ───────────────────────────────────────────────────────────────────

function buildFanarts() {
  const dir = path.join("fanarts");
  if (!fs.existsSync(dir)) { console.log("fanarts: pasta não encontrada, pulando"); return; }
 
  const templatePath = path.join(SRC, "pages", "fanarts", "index.html");
  if (!fs.existsSync(templatePath)) { console.log("fanarts: src/pages/fanarts/index.html não encontrado, pulando"); return; }
 
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
 
  const grid = images.map(img => {
    const artistKey = extractArtist(img);
    const artist    = artists[artistKey];
    const label     = artistKey.replace(/@.*/, "");
    const overlay   = artist?.url
      ? `<a class="fanart-overlay" href="${artist.url}" target="_blank" rel="noopener">${label} · ${artist.platform}</a>`
      : `<div class="fanart-overlay">${label}</div>`;
 
    return `<div class="fanart-item">
  <a href="/fanarts/${img}" target="_blank" rel="noopener">
    <img src="/fanarts/${img}" alt="Fanart por ${label}" loading="lazy">
  </a>
  ${overlay}
</div>`;
  }).join("\n");
 
  const html = injectShell(read(templatePath))
    .replace("<!-- FANARTS_GRID -->", grid || '<div class="empty-notice">nenhuma fanart ainda.</div>');
 
  write(path.join(DIST, "fanarts", "index.html"), html);
  console.log(`fanarts: ${images.length} imagens`);
}

// ── Plugins ───────────────────────────────────────────────────────────────────

function buildPlugins() {
  const registryPath = path.join(SRC, "plugins", "registry.json");
  const templatePath = path.join(SRC, "shell", "plugin-page.html");

  if (!fs.existsSync(registryPath)) { console.log("plugins: registry.json não encontrado, pulando"); return; }
  if (!fs.existsSync(templatePath)) { console.log("plugins: plugin-page.html não encontrado, pulando"); return; }

  const registry = JSON.parse(read(registryPath));
  const template = read(templatePath);

  for (const slug of Object.keys(registry.plugins)) {
    const html = injectShell(template).replace(/PLUGIN_SLUG/g, slug);
    write(path.join(DIST, "plugins", slug, "index.html"), html);
  }

  console.log(`plugins: ${Object.keys(registry.plugins).length} páginas geradas`);
}

// ── RSS ───────────────────────────────────────────────────────────────────────

function buildRSS() {
  const files = walk(path.join(SRC, "blog"), ".md");
  const posts = [];

  for (const src of files) {
    const slug           = path.basename(src, ".md");
    const { meta, body } = parseFrontmatter(read(src));
    if (!meta.date) continue;
    posts.push({ slug, ...meta, body });
  }

  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const SITE = "https://manybot.stxerr.dev";

  const items = posts.map(p => {
    const url   = `${SITE}/blog/${p.slug}/`;
    const date = new Date(p.date ?? Date.now()).toUTCString();
    const desc  = p.excerpt || "";
    return `    <item>
      <title>${escXml(p.title || p.slug)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${date}</pubDate>
      ${desc ? `<description>${escXml(desc)}</description>` : ""}
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ManyBot Blog</title>
    <link>${SITE}/blog/</link>
    <description>Novidades e atualizações do ManyBot.</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  write(path.join(DIST, "rss.xml"), xml);
  console.log(`rss: ${posts.length} posts`);
}

function escXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Main ──────────────────────────────────────────────────────────────────────

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);

buildPages();
buildDocs();
buildBlog();
buildFanarts();
buildPlugins();
buildRSS()

console.log("done → dist/");
