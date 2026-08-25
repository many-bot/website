import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireApiKey } from './auth.js';
import blogRouter from './routes/blog.js';
import changelogRouter from './routes/changelog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3010;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use('/api/blog', requireApiKey, blogRouter);
app.use('/api/changelog', requireApiKey, changelogRouter);

app.listen(PORT, () => console.log(`manybot admin-api listening on ${PORT}`));
