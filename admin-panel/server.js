import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify, slugifyVersion } from './lib/slug.js';
import { buildMarkdown, isValidDate } from './lib/frontmatter.js';
import { commitAndPush } from './lib/git.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(REPO_ROOT, 'src', 'content', 'blog');
const CHANGELOG_DIR = path.join(REPO_ROOT, 'src', 'content', 'changelog');
const PRODUCTS = ['manybot', 'many', 'manyplug', 'website'];

const PORT = process.env.PORT || 5173;

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/blog', (req, res) => {
  const { locale, slug: rawSlug, title, date, excerpt, image, content } = req.body ?? {};

  if (!['pt', 'en'].includes(locale)) return res.status(400).json({ error: 'locale must be pt or en' });
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
  if (!isValidDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

  const slug = slugify(rawSlug || title);
  if (!slug) return res.status(400).json({ error: 'could not derive a valid slug' });

  const dir = path.join(BLOG_DIR, locale);
  const filePath = path.join(dir, `${slug}.md`);

  if (fs.existsSync(filePath)) return res.status(409).json({ error: `post already exists: ${locale}/${slug}` });

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buildMarkdown({ title, date, excerpt, image }, content));

  const git = commitAndPush(REPO_ROOT, filePath, `blog(${locale}): ${title}`);

  res.status(201).json({ slug, locale, path: path.relative(REPO_ROOT, filePath), git });
});

app.post('/api/changelog', (req, res) => {
  const { product, version, date, excerpt, breaking, content } = req.body ?? {};

  if (!PRODUCTS.includes(product)) return res.status(400).json({ error: `product must be one of ${PRODUCTS.join(', ')}` });
  if (!version?.trim()) return res.status(400).json({ error: 'version is required' });
  if (!isValidDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

  const fileSlug = slugifyVersion(version);
  const dir = path.join(CHANGELOG_DIR, product);
  const filePath = path.join(dir, `${fileSlug}.md`);

  if (fs.existsSync(filePath)) return res.status(409).json({ error: `release already exists: ${product}/${version}` });

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    filePath,
    buildMarkdown({ product, version, date, excerpt, breaking: breaking ? true : undefined }, content),
  );

  const git = commitAndPush(REPO_ROOT, filePath, `changelog(${product}): ${version}`);

  res.status(201).json({ product, version, path: path.relative(REPO_ROOT, filePath), git });
});

app.listen(PORT, '127.0.0.1', () => console.log(`admin-panel at http://127.0.0.1:${PORT}`));

