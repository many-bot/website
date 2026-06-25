import "dotenv/config";
import express from "express";
import { syncRegistry } from "./sync.js";
import pluginsRouter  from "./routes/plugins.js";
import commentsRouter from "./routes/comments.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app  = express();
const PORT = process.env.PORT || 3002;
const SYNC_INTERVAL_MS = (parseInt(process.env.SYNC_INTERVAL_HOURS) || 6) * 60 * 60 * 1000;

app.set("trust proxy", 1);
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/plugins",                         pluginsRouter);
app.use("/plugins/:author/:name",           pluginsRouter);
app.use("/plugins/:author/:name/comments",  commentsRouter);
app.use("/comments",                        commentsRouter);
app.get("/health",                          (_, res) => res.json({ ok: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const chromeWin = path.join(__dirname, "chrome-win64.tar.gz");
const chromeLinux = path.join(__dirname, "chrome-linux64.tar.gz");

app.get("/download-chrome-linux", (req, res) => {
  res.download(chromeLinux);
});

app.get("/download-chrome-win", (req, res) => {
  res.download(chromeWin);
});

await syncRegistry();
setInterval(syncRegistry, SYNC_INTERVAL_MS);

app.listen(PORT, () => console.log(`ManyPlug API listening ${PORT}`));
