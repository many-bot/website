import { readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://manybot.org';
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const EXCLUDED_PAGES = new Set(['403.html', '404.html', '500.html', '503.html']);

const toUrl = (file) => {
  const route = file.split(path.sep).join('/').replace(/index\.html$/, '');
  return `${SITE}/${route}`;
};

const buildSitemap = (urls) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join('\n')}
</urlset>
`;

const files = await readdir(DIST, { recursive: true });

const urls = files
  .filter((file) => file.endsWith('.html') && !EXCLUDED_PAGES.has(file))
  .map(toUrl)
  .sort();

await writeFile(path.join(DIST, 'sitemap.xml'), buildSitemap(urls));

// starlight injects @astrojs/sitemap on its own when none is configured
const generated = files.filter((file) => /^sitemap-.*\.xml$/.test(file));
await Promise.all(generated.map((file) => rm(path.join(DIST, file))));

console.log(`sitemap: ${urls.length} pages`);
