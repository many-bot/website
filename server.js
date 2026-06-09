import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(morgan('combined'));

app.use(express.static(path.join(__dirname, 'dist')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/fanarts', express.static(path.join(__dirname, 'fanarts')));
app.get('/rss.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'rss.xml'));
});

const errorPage = (code) =>
  path.join(process.cwd(),`${code}.html`);

app.use((req, res) => {
  res.status(404).sendFile(errorPage(404));
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).sendFile(errorPage(500));
});

app.listen(3003, () => {
    console.log('http://localhost:3003');
});
