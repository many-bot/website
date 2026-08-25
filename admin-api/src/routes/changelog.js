import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugifyVersion } from '../lib/slug.js';
import { buildMarkdown, isValidDate } from '../lib/frontmatter.js';
import { commitAndPush } from '../lib/git.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CHANGELOG_DIR = path.join(REPO_ROOT, 'src', 'content', 'changelog');

const PRODUCTS = ['manybot', 'manyplug', 'website'];

const router = Router();

router.post('/', (req, res) => {
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

export default router;
